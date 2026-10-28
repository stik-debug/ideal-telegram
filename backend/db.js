const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');

function open(file) {
  if (file !== ':memory:') {
    const dir = path.dirname(path.resolve(file));
    try {
      fs.mkdirSync(dir, { recursive: true });
      // Prove we can write (catches read-only mounts early)
      const probe = path.join(dir, '.skillora-write-test');
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
    } catch (e) {
      const msg =
        '[skillora] Cannot create or write database folder: ' + dir + '\n' +
        '  Error: ' + (e && e.message) + '\n' +
        '  On Render:\n' +
        '  - Without a disk, use DB_FILE=./data/skillora.db (data can reset on redeploy)\n' +
        '  - With a persistent disk, mount it (e.g. /var/data) THEN set DB_FILE=/var/data/skillora.db\n' +
        '  - Free Render web services often cannot use persistent disks — upgrade or use ./data for testing';
      console.error(msg);
      throw new Error(msg);
    }
    if (process.env.NODE_ENV === 'production' && !process.env.DB_FILE) {
      console.warn('[skillora] WARNING: DB_FILE is not set. Data may be lost on redeploy.');
    }
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON');
  if (file !== ':memory:') {
    try { db.exec('PRAGMA journal_mode=WAL'); } catch (_) {}
    try { db.exec('PRAGMA synchronous=NORMAL'); } catch (_) {}
    try { db.exec('PRAGMA busy_timeout=5000'); } catch (_) {}
    try { db.exec('PRAGMA temp_store=MEMORY'); } catch (_) {}
  }
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
  migrate(db);
  seed(db);
  return db;
}

/** Additive migrations so existing learner data is never wiped on upgrade. */
function migrate(db) {
  const cols = (table) => {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch { return []; }
  };
  const userCols = cols('users');
  if (userCols.length && !userCols.includes('deleted_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN deleted_at TEXT`);
    db.exec(`ALTER TABLE users ADD COLUMN deletion_reason TEXT DEFAULT ''`);
  }
  if (userCols.length && !userCols.includes('updated_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
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
  db.exec(`CREATE TABLE IF NOT EXISTS payment_mpesa(
    ref TEXT PRIMARY KEY REFERENCES payments(ref),
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    phone_last4 TEXT
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS payment_paystack(
    ref TEXT PRIMARY KEY REFERENCES payments(ref),
    access_code TEXT,
    authorization_url TEXT,
    paystack_ref TEXT
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS db_meta(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  try {
    db.prepare("INSERT INTO db_meta(key,value) VALUES('schema_version','2') ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=CURRENT_TIMESTAMP").run();
  } catch (_) {}
}

function seed(db) {
  const content = require('./content');
  const courseInsert = db.prepare('INSERT INTO courses(slug,title,summary,price_kes,published,content_status) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,published=excluded.published,content_status=excluded.content_status');
  const findCourse = db.prepare('SELECT id FROM courses WHERE slug=?');
  const findLesson = db.prepare('SELECT id FROM lessons WHERE course_id=? AND pos=?');
  const insertLesson = db.prepare('INSERT INTO lessons(course_id,pos,title,body,is_free) VALUES(?,?,?,?,?)');
  const updateLesson = db.prepare('UPDATE lessons SET title=?,body=?,is_free=? WHERE id=?');
  const insertQuiz = db.prepare('INSERT INTO quizzes(lesson_id,question,options,answer,explain) VALUES(?,?,?,?,?)');
  const clearQuizzes = db.prepare('DELETE FROM quizzes WHERE lesson_id=?');
  for (const co of content) {
    courseInsert.run(co.slug, co.title, co.summary, co.price, 1, 'complete');
    const id = findCourse.get(co.slug).id;
    co.lessons.forEach((le, i) => {
      const pos = i + 1, old = findLesson.get(id, pos);
      let lid;
      if (old) { lid = old.id; updateLesson.run(le.title, le.body, i === 0 ? 1 : 0, lid); }
      else { lid = Number(insertLesson.run(id, pos, le.title, le.body, i === 0 ? 1 : 0).lastInsertRowid); }
      clearQuizzes.run(lid); (le.quiz || []).forEach(x => insertQuiz.run(lid, x.q, JSON.stringify(x.o), x.a, x.e));
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
  const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('skillora-') && f.endsWith('.db')).sort().reverse();
  for (const f of files.slice(14)) {
    try { fs.unlinkSync(path.join(backupsDir, f)); } catch (_) {}
  }
  return dest;
}

module.exports = { open, backup, migrate };
