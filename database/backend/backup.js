const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const source = process.env.DB_FILE || './data/skillforge.db';
if (!fs.existsSync(source)) { console.error(`Database not found at ${source}; no backup created.`); process.exit(1); }
const dir = process.env.BACKUP_DIR || './backups';
fs.mkdirSync(dir, { recursive: true });
const target = path.resolve(dir, `skillforge-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
const db = new DatabaseSync(source);
try {
  // VACUUM INTO produces a consistent SQLite snapshot while the app may be running.
  db.exec(`VACUUM INTO '${target.replace(/'/g,"''")}'`);
  const check = new DatabaseSync(target, { readOnly: true });
  const result = check.prepare('PRAGMA integrity_check').get();
  check.close();
  if (result.integrity_check !== 'ok') throw new Error(`Backup integrity check failed: ${result.integrity_check}`);
  console.log(`Verified backup created: ${target}`);
} finally { db.close(); }
