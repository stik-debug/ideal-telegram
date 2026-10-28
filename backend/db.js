'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

function log(...a) { console.log('[skillora:db]', ...a); }
function logErr(...a) { console.error('[skillora:db]', ...a); }

function stripSqlComments(sql) {
  return String(sql || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

function execOne(db, stmt, label) {
  const sql = String(stmt || '').trim();
  if (!sql) return;
  try {
    db.exec(sql);
  } catch (e) {
    const preview = sql.replace(/\s+/g, ' ').slice(0, 220);
    const err = new Error(`${label}: ${e.message}\n  SQL: ${preview}`);
    err.code = e.code;
    err.errcode = e.errcode;
    err.errstr = e.errstr || e.message;
    throw err;
  }
}

function execScript(db, sql, label) {
  const parts = stripSqlComments(sql).split(';').map((s) => s.trim()).filter(Boolean);
  log(label + ': running', parts.length, 'statements');
  for (let i = 0; i < parts.length; i++) {
    execOne(db, parts[i], `${label} #${i + 1}/${parts.length}`);
  }
}

/** Minimal core schema — enough to boot even if schema.sql is missing/corrupt */
const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN('student','admin')),
  created TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  deletion_reason TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  exp INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  price_kes INTEGER NOT NULL DEFAULT 0 CHECK(price_kes>=0),
  published INTEGER NOT NULL DEFAULT 0,
  content_status TEXT NOT NULL DEFAULT 'not_written'
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL,
  pos INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  explanation TEXT
);
CREATE TABLE IF NOT EXISTS enrollments (
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  created TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  amount_kes INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  received TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  done_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  issued TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS db_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payment_mpesa (
  ref TEXT PRIMARY KEY,
  checkout_request_id TEXT,
  merchant_request_id TEXT,
  phone_last4 TEXT
);
CREATE TABLE IF NOT EXISTS payment_paystack (
  ref TEXT PRIMARY KEY,
  access_code TEXT,
  authorization_url TEXT,
  paystack_ref TEXT
);
`;

function ensureWritableDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, '.skillora-write-test');
  fs.writeFileSync(probe, 'ok');
  fs.unlinkSync(probe);
}

function openDatabaseFile(file) {
  if (file === ':memory:') return new DatabaseSync(file);
  const abs = path.resolve(file);
  ensureWritableDir(path.dirname(abs));
  return new DatabaseSync(abs);
}

function initSchema(db) {
  // Prefer DELETE journal on constrained hosts (Render free disk)
  try { db.exec('PRAGMA foreign_keys=ON'); } catch (_) {}
  try { db.exec('PRAGMA busy_timeout=5000'); } catch (_) {}
  try { db.exec('PRAGMA journal_mode=DELETE'); } catch (_) {}
  try { db.exec('PRAGMA synchronous=NORMAL'); } catch (_) {}

  // 1) Core always
  execScript(db, CORE_SCHEMA, 'core-schema');

  // 2) Full schema.sql if present (additive CREATE IF NOT EXISTS)
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const full = fs.readFileSync(schemaPath, 'utf8');
      execScript(db, full, 'schema.sql');
    } catch (e) {
      logErr('schema.sql had an error (core tables still available):', e.message);
      // Do not rethrow — core is enough to boot; missing feature tables degrade gracefully
    }
  } else {
    log('schema.sql not found — running with core tables only');
  }

  migrate(db);
}

function tableCols(db, table) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  } catch {
    return [];
  }
}

function migrate(db) {
  const userCols = tableCols(db, 'users');
  const addCol = (table, col, defSql) => {
    const cols = tableCols(db, table);
    if (cols.length && !cols.includes(col)) {
      try {
        execOne(db, `ALTER TABLE ${table} ADD COLUMN ${defSql}`, `migrate ${table}.${col}`);
      } catch (e) {
        logErr(e.message);
      }
    }
  };
  addCol('users', 'deleted_at', 'deleted_at TEXT');
  addCol('users', 'deletion_reason', "deletion_reason TEXT DEFAULT ''");
  addCol('users', 'updated_at', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');

  const quizCols = tableCols(db, 'quizzes');
  if (quizCols.includes('explain') && !quizCols.includes('explanation')) {
    try {
      execOne(db, 'ALTER TABLE quizzes RENAME COLUMN explain TO explanation', 'rename explain');
    } catch (_) {
      addCol('quizzes', 'explanation', 'explanation TEXT');
      try { db.exec('UPDATE quizzes SET explanation = explain WHERE explanation IS NULL'); } catch (_) {}
    }
  } else if (quizCols.length && !quizCols.includes('explanation')) {
    addCol('quizzes', 'explanation', 'explanation TEXT');
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(exp)',
    'CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)',
  ];
  for (const sql of indexes) {
    try { db.exec(sql); } catch (_) {}
  }

  try {
    db.prepare(
      "INSERT INTO db_meta(key,value) VALUES('schema_version','4') ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=CURRENT_TIMESTAMP"
    ).run();
  } catch (_) {}
}

function seed(db) {
  let content;
  try {
    content = require('./content');
  } catch (e) {
    logErr('content.js not loaded, skip seed:', e.message);
    return;
  }
  if (!Array.isArray(content) || !content.length) return;

  const courseInsert = db.prepare(
    'INSERT INTO courses(slug,title,summary,price_kes,published,content_status) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,published=excluded.published,content_status=excluded.content_status'
  );
  const findCourse = db.prepare('SELECT id FROM courses WHERE slug=?');
  const findLesson = db.prepare('SELECT id FROM lessons WHERE course_id=? AND pos=?');
  const insertLesson = db.prepare('INSERT INTO lessons(course_id,pos,title,body,is_free) VALUES(?,?,?,?,?)');
  const updateLesson = db.prepare('UPDATE lessons SET title=?,body=?,is_free=? WHERE id=?');
  const quizCols = tableCols(db, 'quizzes');
  const expCol = quizCols.includes('explanation') ? 'explanation' : (quizCols.includes('explain') ? 'explain' : 'explanation');
  const insertQuiz = db.prepare(`INSERT INTO quizzes(lesson_id,question,options,answer,${expCol}) VALUES(?,?,?,?,?)`);
  const clearQuizzes = db.prepare('DELETE FROM quizzes WHERE lesson_id=?');

  for (const co of content) {
    courseInsert.run(co.slug, co.title, co.summary, co.price, 1, 'complete');
    const id = findCourse.get(co.slug).id;
    (co.lessons || []).forEach((le, i) => {
      const pos = i + 1;
      const old = findLesson.get(id, pos);
      let lid;
      if (old) {
        lid = old.id;
        updateLesson.run(le.title, le.body, i === 0 ? 1 : 0, lid);
      } else {
        lid = Number(insertLesson.run(id, pos, le.title, le.body, i === 0 ? 1 : 0).lastInsertRowid);
      }
      clearQuizzes.run(lid);
      (le.quiz || []).forEach((x) => insertQuiz.run(lid, x.q, JSON.stringify(x.o), x.a, x.e));
    });
  }
  log('seed complete: courses=', db.prepare('SELECT COUNT(*) n FROM courses').get().n);
}

function open(file) {
  log('Node', process.version, 'DB_FILE=', file);
  // Render: relative paths live on ephemeral disk and are wiped on redeploy
  const onRender = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID || /onrender\.com/i.test(process.env.PUBLIC_URL || ''));
  const abs = file && file !== ':memory:' ? require('path').resolve(file) : file;
  const looksEphemeral = !file || file === ':memory:' || String(file).startsWith('./') || String(file).startsWith('data/') || String(abs).includes('/opt/render/project');
  if (onRender && looksEphemeral) {
    logErr('WARNING: Database is on ephemeral storage. Accounts will disappear after redeploy.');
    logErr('Fix: Add a Render Disk (mount /var/data) and set DB_FILE=/var/data/skillora.db');
    logErr('Note: A Render PostgreSQL database is NOT used until the app is migrated to Postgres. This app uses SQLite.');
  }

  const tryOnce = (label) => {
    log('open attempt:', label);
    const db = openDatabaseFile(file);
    initSchema(db);
    try {
      const ic = db.prepare('PRAGMA integrity_check').get();
      const ok = ic && (ic.integrity_check === 'ok' || ic['integrity_check'] === 'ok');
      if (!ok) throw new Error('integrity_check failed: ' + JSON.stringify(ic));
    } catch (e) {
      if (String(e.message).includes('integrity_check failed')) throw e;
      // ignore pragma shape differences
    }
    seed(db);
    return db;
  };

  try {
    return tryOnce('primary');
  } catch (e) {
    logErr('primary open failed:', e.message);
    if (file && file !== ':memory:') {
      const abs = path.resolve(file);
      const bak = abs + '.broken-' + Date.now();
      try {
        if (fs.existsSync(abs)) {
          fs.renameSync(abs, bak);
          log('moved broken DB to', bak);
        }
        // also clear WAL/SHM if any
        for (const s of ['-wal', '-shm']) {
          try { if (fs.existsSync(abs + s)) fs.unlinkSync(abs + s); } catch (_) {}
        }
      } catch (re) {
        logErr('could not quarantine broken DB:', re.message);
      }
      try {
        return tryOnce('after-reset');
      } catch (e2) {
        logErr('retry after reset failed:', e2.message);
        throw e2;
      }
    }
    throw e;
  }
}

function backup(db, dbFile, backupsDir) {
  if (!dbFile || dbFile === ':memory:') throw new Error('Cannot backup in-memory database');
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupsDir, `skillora-${stamp}.db`);
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) {}
  fs.copyFileSync(dbFile, dest);
  const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith('skillora-') && f.endsWith('.db')).sort().reverse();
  for (const f of files.slice(14)) {
    try { fs.unlinkSync(path.join(backupsDir, f)); } catch (_) {}
  }
  return dest;
}

module.exports = { open, backup, migrate };
