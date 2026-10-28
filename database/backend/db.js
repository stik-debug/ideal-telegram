const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');

/** Remove SQL line and block comments so semicolons inside comments cannot break runners. */
function stripSqlComments(sql) {
  // block comments
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // line comments
  sql = sql.replace(/--[^\n]*/g, '');
  return sql;
}

function execScript(db, sql, label) {
  const cleaned = stripSqlComments(sql);
  // Split on semicolons that end statements; ignore empty chunks
  const parts = cleaned.split(';').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const stmt = parts[i];
    try {
      db.exec(stmt);
    } catch (e) {
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 180);
      const err = new Error(
        `[skillora] SQL failed during ${label} (statement ${i + 1}/${parts.length}): ${e.message}\n  SQL: ${preview}`
      );
      err.cause = e;
      throw err;
    }
  }
}

function open(file) {
  if (file !== ':memory:') {
    const dir = path.dirname(path.resolve(file));
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, '.skillora-write-test');
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
    } catch (e) {
      const msg =
        '[skillora] Cannot create or write database folder: ' + dir + '\n' +
        '  Error: ' + (e && e.message) + '\n' +
        '  On Render without a disk, set DB_FILE=./data/skillora.db';
      console.error(msg);
      throw new Error(msg);
    }
  }

  let db;
  try {
    db = new DatabaseSync(file);
  } catch (e) {
    throw new Error('[skillora] Could not open SQLite file ' + file + ': ' + e.message);
  }

  try {
    db.exec('PRAGMA foreign_keys=ON');
    if (file !== ':memory:') {
      try { db.exec('PRAGMA journal_mode=WAL'); } catch (_) {}
      try { db.exec('PRAGMA synchronous=NORMAL'); } catch (_) {}
      try { db.exec('PRAGMA busy_timeout=5000'); } catch (_) {}
      try { db.exec('PRAGMA temp_store=MEMORY'); } catch (_) {}
    }

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    execScript(db, schema, 'schema.sql');
    migrate(db);
    seed(db);
  } catch (e) {
    console.error('[skillora] Database init failed:', e.message);
    throw e;
  }
  return db;
}

function tableCols(db, table) {
  try { return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name); }
  catch { return []; }
}

function migrate(db) {
  const userCols = tableCols(db, 'users');
  if (userCols.length && !userCols.includes('deleted_at')) {
    db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT');
  }
  if (userCols.length && !userCols.includes('deletion_reason')) {
    db.exec("ALTER TABLE users ADD COLUMN deletion_reason TEXT DEFAULT ''");
  }
  if (userCols.length && !userCols.includes('updated_at')) {
    db.exec('ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
  }

  // Rename legacy quizzes.explain -> explanation when needed
  const quizCols = tableCols(db, 'quizzes');
  if (quizCols.includes('explain') && !quizCols.includes('explanation')) {
    try {
      db.exec('ALTER TABLE quizzes RENAME COLUMN explain TO explanation');
    } catch (e) {
      // Older SQLite without RENAME COLUMN: add + copy
      try {
        db.exec('ALTER TABLE quizzes ADD COLUMN explanation TEXT');
        db.exec('UPDATE quizzes SET explanation = explain WHERE explanation IS NULL');
      } catch (e2) {
        console.warn('[skillora] could not migrate quizzes.explain:', e2.message);
      }
    }
  } else if (quizCols.length && !quizCols.includes('explanation') && !quizCols.includes('explain')) {
    try { db.exec('ALTER TABLE quizzes ADD COLUMN explanation TEXT'); } catch (_) {}
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(exp)',
    'CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(ref)',
    'CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at)',
  ];
  for (const sql of indexes) {
    try { db.exec(sql); } catch (_) {}
  }

  execScript(db, `
    CREATE TABLE IF NOT EXISTS payment_mpesa(
      ref TEXT PRIMARY KEY,
      checkout_request_id TEXT,
      merchant_request_id TEXT,
      phone_last4 TEXT
    );
    CREATE TABLE IF NOT EXISTS payment_paystack(
      ref TEXT PRIMARY KEY,
      access_code TEXT,
      authorization_url TEXT,
      paystack_ref TEXT
    );
    CREATE TABLE IF NOT EXISTS db_meta(
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `, 'payment meta tables');

  try {
    db.prepare("INSERT INTO db_meta(key,value) VALUES('schema_version','3') ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=CURRENT_TIMESTAMP").run();
  } catch (_) {}
}

function seed(db) {
  const content = require('./content');
  const courseInsert = db.prepare('INSERT INTO courses(slug,title,summary,price_kes,published,content_status) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,published=excluded.published,content_status=excluded.content_status');
  const findCourse = db.prepare('SELECT id FROM courses WHERE slug=?');
  const findLesson = db.prepare('SELECT id FROM lessons WHERE course_id=? AND pos=?');
  const insertLesson = db.prepare('INSERT INTO lessons(course_id,pos,title,body,is_free) VALUES(?,?,?,?,?)');
  const updateLesson = db.prepare('UPDATE lessons SET title=?,body=?,is_free=? WHERE id=?');
  // Support both explanation (new) and explain (legacy) column names
  const quizCols = tableCols(db, 'quizzes');
  const expCol = quizCols.includes('explanation') ? 'explanation' : 'explain';
  const insertQuiz = db.prepare(`INSERT INTO quizzes(lesson_id,question,options,answer,${expCol}) VALUES(?,?,?,?,?)`);
  const clearQuizzes = db.prepare('DELETE FROM quizzes WHERE lesson_id=?');
  for (const co of content) {
    courseInsert.run(co.slug, co.title, co.summary, co.price, 1, 'complete');
    const id = findCourse.get(co.slug).id;
    co.lessons.forEach((le, i) => {
      const pos = i + 1, old = findLesson.get(id, pos);
      let lid;
      if (old) { lid = old.id; updateLesson.run(le.title, le.body, i === 0 ? 1 : 0, lid); }
      else { lid = Number(insertLesson.run(id, pos, le.title, le.body, i === 0 ? 1 : 0).lastInsertRowid); }
      clearQuizzes.run(lid);
      (le.quiz || []).forEach((x) => insertQuiz.run(lid, x.q, JSON.stringify(x.o), x.a, x.e));
    });
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
