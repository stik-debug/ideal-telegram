const test = require('node:test'), assert = require('node:assert'), crypto = require('crypto');
const { createApp } = require('../backend/server'); const { hash } = require('../backend/auth');
const SECRET = 'test-secret';
let base, app;
test.before(async () => { app = createApp({ DB_FILE: ':memory:', PAYMENT_WEBHOOK_SECRET: SECRET }); await new Promise(r => app.server.listen(0, r)); base = 'http://127.0.0.1:' + app.server.address().port; });
test.after(() => app.server.close());
async function call(path, method = 'GET', body, cookie) { const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})), c: (r.headers.get('set-cookie') || '').split(';')[0] }; }
const reg = async (email) => (await call('/api/register', 'POST', { email, name: 'T', password: 'longpassword1' })).c;
const hook = (payload, sig) => { const raw = JSON.stringify(payload); return fetch(base + '/api/webhooks/payment', { method: 'POST', headers: { 'x-signature': sig ?? crypto.createHmac('sha256', SECRET).update(raw).digest('hex') }, body: raw }); };

test('health and course catalogue', async () => { assert.equal((await call('/health')).j.status, 'ok'); const c = await call('/api/courses'); assert.equal(c.j.length, 9); assert.ok(c.j.every(x => x.lessons >= 6)); assert.ok(c.j.some(x => x.slug === 'python-programming')); assert.ok(c.j.some(x => x.slug === 'excel-business-dashboards')); assert.ok(c.j.some(x => x.slug === 'short-video-editing')); assert.ok(c.j.some(x => x.slug === 'digital-marketing-sales')); });
test('registration validation and login', async () => {
  assert.equal((await call('/api/register', 'POST', { email: 'bad', name: 'x', password: 'short' })).s, 400);
  await reg('a@x.com'); assert.equal((await call('/api/register', 'POST', { email: 'a@x.com', name: 'T', password: 'longpassword1' })).s, 409);
  assert.equal((await call('/api/login', 'POST', { email: 'a@x.com', password: 'wrongwrong1' })).s, 401);
  assert.equal((await call('/api/login', 'POST', { email: 'a@x.com', password: 'longpassword1' })).s, 200);
});
test('student cannot use admin routes; admin can', async () => {
  const s = await reg('s@x.com'); assert.equal((await call('/api/admin/payments', 'GET', null, s)).s, 403); assert.equal((await call('/api/admin/payments')).s, 401);
  assert.equal((await call('/api/admin/courses/2', 'PUT', { price_kes: 1, published: 1 }, s)).s, 403);
  app.db.prepare("INSERT INTO users(email,name,pass_hash,role) VALUES('adm@x.com','A',?,'admin')").run(hash('adminpassword1'));
  const a = (await call('/api/login', 'POST', { email: 'adm@x.com', password: 'adminpassword1' })).c;
  assert.equal((await call('/api/admin/payments', 'GET', null, a)).s, 200);
  assert.equal((await call('/api/admin/courses/2', 'PUT', { price_kes: 1234, published: 1 }, a)).s, 200);
  assert.equal(app.db.prepare('SELECT price_kes p FROM courses WHERE id=2').get().p, 1234);
});
test('paid lessons locked, quiz scoring, progress persists across sessions', async () => {
  await reg('p@x.com'); const ck = (await call('/api/login', 'POST', { email: 'p@x.com', password: 'longpassword1' })).c;
  const co = (await call('/api/courses/python-programming', 'GET', null, ck)).j;
  assert.equal(co.lessons[1].body, null); assert.equal((await call(`/api/lessons/${co.lessons[1].id}/complete`, 'POST', {}, ck)).s, 403);
  const q = co.lessons[0].quiz; const right = { [q[0].id]: 1 };
  assert.equal((await call(`/api/lessons/${co.lessons[0].id}/quiz`, 'POST', { answers: right }, ck)).j.score, 1);
  assert.equal((await call(`/api/lessons/${co.lessons[0].id}/quiz`, 'POST', { answers: { [q[0].id]: 0 } }, ck)).j.score, 0);
  await call(`/api/lessons/${co.lessons[0].id}/complete`, 'POST', {}, ck);
  const ck2 = (await call('/api/login', 'POST', { email: 'p@x.com', password: 'longpassword1' })).c;
  assert.equal((await call('/api/courses/python-programming', 'GET', null, ck2)).j.lessons[0].done, true);
});
test('payments: no access without verified webhook; bad signature rejected; duplicates idempotent; amount checked', async () => {
  const ck = await reg('buyer@x.com'); const co = (await call('/api/courses/python-programming')).j;
  const ch = await call('/api/checkout', 'POST', { courseId: co.id }, ck); assert.equal(ch.s, 503); assert.equal(ch.j.live_payments_enabled, false);
  const uid = app.db.prepare("SELECT id FROM users WHERE email='buyer@x.com'").get().id, enrolled = () => app.db.prepare('SELECT COUNT(*) n FROM enrollments WHERE user_id=?').get(uid).n;
  assert.equal(enrolled(), 0);
  assert.equal((await hook({ event_id: 'e0', ref: ch.j.ref, status: 'successful', amount_kes: co.price_kes }, 'deadbeef')).status, 401); assert.equal(enrolled(), 0);
  assert.equal((await hook({ event_id: 'e1', ref: ch.j.ref, status: 'successful', amount_kes: 1 })).status, 409); assert.equal(enrolled(), 0);
  const ok = { event_id: 'e2', ref: ch.j.ref, status: 'successful', amount_kes: co.price_kes };
  assert.equal((await hook(ok)).status, 200); assert.equal((await (await hook(ok)).json()).duplicate, true); assert.equal(enrolled(), 1);
  const ch2 = await call('/api/checkout', 'POST', { courseId: co.id }, ck); await hook({ event_id: 'e3', ref: ch2.j.ref, status: 'failed' });
  assert.equal(app.db.prepare('SELECT status s FROM payments WHERE ref=?').get(ch2.j.ref).s, 'failed'); assert.equal(enrolled(), 1);
});
test('certificate requires all lessons; verify page works', async () => {
  const ck = await reg('cert@x.com'); const co = (await call('/api/courses/python-programming')).j;
  const uid = app.db.prepare("SELECT id FROM users WHERE email='cert@x.com'").get().id;
  assert.equal((await call('/api/courses/python-programming/certificate', 'POST', {}, ck)).s, 403);
  app.db.prepare('INSERT INTO enrollments(user_id,course_id) VALUES(?,?)').run(uid, co.id);
  assert.equal((await call('/api/courses/python-programming/certificate', 'POST', {}, ck)).s, 409);
  for (const l of app.db.prepare('SELECT id FROM lessons WHERE course_id=?').all(co.id)) await call(`/api/lessons/${l.id}/complete`, 'POST', {}, ck);
  const r = await call('/api/courses/python-programming/certificate', 'POST', {}, ck); assert.equal(r.s, 200);
  assert.equal((await call('/api/verify/' + r.j.code)).j.valid, true); assert.equal((await call('/api/verify/SF-NOPE')).s, 404);
  const pdf = await fetch(base + '/api/certificates/' + r.j.code + '.pdf', { headers: { cookie: ck } });
  assert.equal(pdf.status, 200); assert.match(pdf.headers.get('content-type'), /application\/pdf/); assert.match(Buffer.from(await pdf.arrayBuffer()).toString('latin1'), /^%PDF-1\.4/);
  const other = await reg('othercert@x.com'); const denied = await fetch(base + '/api/certificates/' + r.j.code + '.pdf', { headers: { cookie: other } }); assert.equal(denied.status, 403);
});
test('admin overview, lesson management, support privacy and replies', async () => {
  const student = await reg('helpstudent@x.com');
  assert.equal((await call('/api/admin/overview','GET',null,student)).s,403);
  const sid=app.db.prepare("SELECT id FROM users WHERE email='helpstudent@x.com'").get().id;
  const co=(await call('/api/courses/python-programming')).j;
  app.db.prepare('INSERT INTO enrollments(user_id,course_id) VALUES(?,?)').run(sid,co.id);
  const ticket=await call('/api/support/tickets','POST',{subject:'Course help',message:'I need help with lesson two'},student);assert.equal(ticket.s,201);
  assert.equal((await call(`/api/support/tickets/${ticket.j.id}/replies`,'GET',null,await reg('intruder@x.com'))).s,403);
  app.db.prepare("INSERT INTO users(email,name,pass_hash,role) VALUES('adminqa@x.com','Admin QA',?,'admin')").run(hash('adminpassword1'));
  const admin=(await call('/api/login','POST',{email:'adminqa@x.com',password:'adminpassword1'})).c;
  assert.equal((await call('/api/admin/overview','GET',null,admin)).s,200);
  assert.equal((await call(`/api/support/tickets/${ticket.j.id}/replies`,'GET',null,admin)).j.length,1);
  assert.equal((await call(`/api/support/tickets/${ticket.j.id}/replies`,'POST',{message:'Please try the worked example.' ,status:'resolved'},admin)).s,201);
  assert.equal((await call('/api/support/tickets','GET',null,student)).j[0].status,'resolved');
  const lesson=(await call(`/api/admin/courses/${co.id}/lessons`,'GET',null,admin)).j[0];
  assert.equal((await call(`/api/admin/lessons/${lesson.id}`,'PUT',{pos:lesson.pos,title:'Updated lesson title',body:lesson.body,is_free:true},admin)).s,200);
});
test('assignment upload, feedback, and private file access', async () => {
  app.db.prepare("INSERT INTO users(email,name,pass_hash) VALUES('assignment@x.com','Assignment Student',?)").run(hash('longpassword1'));const uid=app.db.prepare("SELECT id FROM users WHERE email='assignment@x.com'").get().id;const student=(await call('/api/login','POST',{email:'assignment@x.com',password:'longpassword1'})).c;const co=(await call('/api/courses')).j[0];app.db.prepare('INSERT INTO enrollments(user_id,course_id) VALUES(?,?)').run(uid,co.id);
  const submit=await call('/api/assignments','POST',{course_id:co.id,title:'My PDF task',filename:'task.txt',mime_type:'text/plain',data:Buffer.from('hello').toString('base64')},student);assert.equal(submit.s,201);
  assert.equal((await call('/api/assignments','GET',null,student)).j.length,1);
  assert.equal((await call(`/api/assignments/${submit.j.id}/file`,'GET',null,(await (async()=>{app.db.prepare("INSERT INTO users(email,name,pass_hash) VALUES('notowner@x.com','Not Owner',?)").run(hash('longpassword1'));return (await call('/api/login','POST',{email:'notowner@x.com',password:'longpassword1'})).c})()))).s,403);
  app.db.prepare("INSERT INTO users(email,name,pass_hash,role) VALUES('assignmentadmin@x.com','Admin',?,'admin')").run(hash('adminpassword1'));const admin=(await call('/api/login','POST',{email:'assignmentadmin@x.com',password:'adminpassword1'})).c;
  assert.equal((await call(`/api/admin/assignments/${submit.j.id}/review`,'PUT',{status:'reviewed',feedback:'Good work'},admin)).s,200);
  assert.equal((await call('/api/assignments','GET',null,student)).j[0].instructor_feedback,'Good work');
});
