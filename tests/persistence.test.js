'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Render refuses a relative database path instead of silently creating a fresh database', () => {
  const dbModule = path.resolve(__dirname, '../backend/db.js');
  const script = `const {open}=require(${JSON.stringify(dbModule)}); try { open('./data/skillforge.db'); process.exit(2); } catch (e) { if (!/persistent disk|DB_FILE/.test(e.message)) { console.error(e.message); process.exit(3); } console.log('blocked unsafe database path'); }`;
  const r = spawnSync(process.execPath, ['--experimental-sqlite', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, RENDER: 'true', RENDER_SERVICE_ID: 'srv-test', DB_FILE: './data/skillforge.db', NODE_ENV: 'production' },
  });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /blocked unsafe database path/);
});
