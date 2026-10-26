const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');

test('course search exposes accessible filters, clear, and saved-course controls', () => {
  for (const id of ['course-search','course-search-clear','course-category','course-sort','saved-courses-only','course-count','course-list']) assert.match(html, new RegExp(`id=["']${id}["']`), `missing ${id}`);
  assert.match(js, /tokens\.every\(token=>haystack\.includes\(token\)\)/, 'search should support multiple terms');
  assert.match(js, /data-save-course/, 'course cards should support save/unsave');
  assert.match(js, /reset-course-filters/, 'empty results should provide a reset action');
  assert.match(js, /skillora\.savedCourses/, 'saved courses should persist on this device');
});

test('career and freelance listings have live search and result counts', () => {
  assert.match(js, /id="opportunity-search"/);
  assert.match(js, /wireListSearch\('opportunity-search','\[data-opportunity-search\]','opportunity-count'\)/);
  assert.match(js, /id="gig-search"/);
  assert.match(js, /wireListSearch\('gig-search','\[data-gig-search\]','gig-count'\)/);
});

test('navigation fallback, request timeout, and keyboard search shortcut exist', () => {
  assert.match(js, /document\.querySelectorAll\('a\[href\^="\#"\]'\)/);
  assert.match(js, /AbortController/);
  assert.match(js, /e\.key\.toLowerCase\(\)==='k'/);
  assert.match(css, /@media\(max-width:700px\)/);
});

test('auth back-to-courses restores the original catalogue after SPA view replacement', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /function homeScroll\(\)[\s\S]*location\.reload\(\)/);
  assert.match(source, /header\(\);if\(me\)await dash\(\);else homeScroll\(\)/);
});
