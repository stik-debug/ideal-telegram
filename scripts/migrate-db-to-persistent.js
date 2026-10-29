'use strict';
// One-time, non-destructive SQLite migration. Run while the app is stopped or in maintenance mode.
// Example: SOURCE_DB_FILE=./data/skillforge.db TARGET_DB_FILE=/var/data/skillora.db node scripts/migrate-db-to-persistent.js
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const source = path.resolve(process.env.SOURCE_DB_FILE || process.env.DB_FILE || './data/skillforge.db');
const target = path.resolve(process.env.TARGET_DB_FILE || '/var/data/skillora.db');
function fail(msg) { console.error('[db-migrate] ERROR:', msg); process.exit(1); }
if (source === target) fail('Source and target are the same path.');
if (!fs.existsSync(source)) fail(`Source database not found: ${source}. No files changed.`);
if (fs.existsSync(target)) fail(`Target already exists: ${target}. Refusing to overwrite it.`);
let sourceDb;
try {
  sourceDb = new DatabaseSync(source, { readOnly: true });
  const integrity = sourceDb.prepare('PRAGMA integrity_check').get();
  if (!integrity || integrity.integrity_check !== 'ok') fail(`Source integrity check failed: ${JSON.stringify(integrity)}`);
  const counts = {};
  for (const table of ['users','courses','enrollments','payments','progress','certificates']) {
    try { counts[table] = sourceDb.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n; }
    catch { counts[table] = null; }
  }
  sourceDb.close(); sourceDb = null;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.migration-temp-${process.pid}`;
  fs.copyFileSync(source, temp, fs.constants.COPYFILE_EXCL);
  const targetDb = new DatabaseSync(temp);
  const targetIntegrity = targetDb.prepare('PRAGMA integrity_check').get();
  if (!targetIntegrity || targetIntegrity.integrity_check !== 'ok') {
    targetDb.close(); fs.unlinkSync(temp); fail('Copied database failed integrity check; source was not changed.');
  }
  for (const [table, expected] of Object.entries(counts)) {
    if (expected === null) continue;
    const actual = targetDb.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    if (actual !== expected) { targetDb.close(); fs.unlinkSync(temp); fail(`Count mismatch for ${table}; source was not changed.`); }
  }
  targetDb.close();
  fs.renameSync(temp, target);
  console.log('[db-migrate] SUCCESS: copied and verified database.');
  console.log('[db-migrate] Source preserved:', source);
  console.log('[db-migrate] Target:', target);
  console.log('[db-migrate] Verified row counts:', JSON.stringify(counts));
  console.log('[db-migrate] Next: set DB_FILE to the target path, restart, then test login and student progress.');
} catch (e) {
  try { if (sourceDb) sourceDb.close(); } catch {}
  fail(e.message);
}
