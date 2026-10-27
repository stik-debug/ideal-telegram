const test = require('node:test'), assert = require('node:assert'), crypto = require('crypto');
const { createApp } = require('../backend/server'); const { hash } = require('../backend/auth');
const qr = require('../backend/qr'); const exercises = require('../backend/exercises');

// Each test boots its own app so per-IP rate limits never interfere between tests.
async function boot(env = {}) {
  const app = createApp({ DB_FILE: ':memory:', DISABLE_SCHEDULER: '1', ...env }); await new Promise(r => app.server.listen(0, r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const call = async (path, method = 'GET', body, cookie, headers = {}) => { const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; } return { s: r.status, j, h: r.headers, c: (r.headers.get('set-cookie') || '').split(';')[0] }; };
  const mk = (email, role = 'student') => { const r = app.db.prepare('INSERT INTO users(email,name,pass_hash,role) VALUES(?,?,?,?)').run(email, email.split('@')[0], hash('longpassword1'), role); return Number(r.lastInsertRowid); };
  const login = async (email) => (await call('/api/login', 'POST', { email, password: 'longpassword1' })).c;
  return { app, base, call, mk, login, close: () => app.server.close() };
}
const day = (n = 0) => new Date(Date.now() + 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);

test('QR encoder produces valid square matrices and the reference exercise solutions pass their own tests', () => {
  for (const t of ['A', 'https://skillora.example/verify/ABC123', 'x'.repeat(120)]) { const m = qr.encode(t); assert.equal(m.length, m[0].length); assert.ok((m.length - 17) % 4 === 0); }
  assert.throws(() => qr.encode('z'.repeat(400)));
  for (const e of exercises.filter(x => x.type === 'js')) { const f = new Function(e.solution + '\nreturn ' + e.fn)(); for (const t of e.tests) assert.equal(JSON.stringify(f(...JSON.parse(JSON.stringify(t.args)))), JSON.stringify(t.expect), e.key); }
  assert.equal(new Set(exercises.map(e => e.key)).size, exercises.length);
});

test('certificate PDF carries a QR code when PUBLIC_URL is https, and the public verify page works', async () => {
  const withUrl = await boot({ PUBLIC_URL: 'https://academy.example' }), plain = await boot();
  try {
    const grab = async (h) => { const uid = h.mk('c@x.com'); h.app.db.prepare("INSERT INTO certificates(code,user_id,course_id) VALUES('SF-QR-1',?,1)").run(uid); const ck = await h.login('c@x.com'); const r = await fetch(h.base + '/api/certificates/SF-QR-1.pdf', { headers: { cookie: ck } }); assert.equal(r.status, 200); return (await r.arrayBuffer()).byteLength; };
    assert.ok((await grab(withUrl)) > (await grab(plain)) + 500, 'QR modules add drawing operators');
    const ok = await withUrl.call('/verify/SF-QR-1'); assert.equal(ok.s, 200); assert.match(ok.j, /Certificate verified/); assert.match(ok.h.get('content-security-policy'), /default-src 'none'/);
    withUrl.app.db.prepare("UPDATE users SET name='<script>alert(1)</script>' WHERE email='c@x.com'").run(); assert.ok(!(await withUrl.call('/verify/SF-QR-1')).j.includes('<script>alert'));
    withUrl.app.db.prepare("INSERT INTO certificate_status(code,status) VALUES('SF-QR-1','revoked')").run(); assert.match((await withUrl.call('/verify/SF-QR-1')).j, /revoked/);
    assert.equal((await withUrl.call('/verify/NOPE')).s, 404);
  } finally { withUrl.close(); plain.close(); }
});

test('M-Pesa STK push: checkout, callback security, amount check, idempotency and reconciliation', async () => {
  const calls = []; let queryResult = { ResultCode: '0', ResultDesc: 'ok' };
  const fakeFetch = async (url, opt = {}) => {
    calls.push(url); const json = (o, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => o });
    if (url.includes('/oauth/')) return json({ access_token: 'tok', expires_in: '3599' });
    if (url.includes('stkpushquery')) return json(queryResult);
    if (url.includes('processrequest')) { const b = JSON.parse(opt.body); assert.ok(Number.isInteger(b.Amount) && b.Amount > 0); assert.match(b.PhoneNumber, /^254[17]\d{8}$/); assert.ok(b.CallBackURL.endsWith('/api/webhooks/mpesa/cb-secret-123')); assert.ok(b.AccountReference.length <= 12); return json({ ResponseCode: '0', CheckoutRequestID: 'ws_CO_' + calls.length, MerchantRequestID: 'm1', CustomerMessage: 'Enter PIN' }); }
    throw new Error('unexpected ' + url);
  };
  const h = await boot({ fetch: fakeFetch, MPESA_CONSUMER_KEY: 'k', MPESA_CONSUMER_SECRET: 's', MPESA_SHORTCODE: '174379', MPESA_PASSKEY: 'pk', MPESA_CALLBACK_SECRET: 'cb-secret-123', PUBLIC_URL: 'https://academy.example' });
  try {
    const uid = h.mk('p@x.com'), ck = await h.login('p@x.com');
    assert.equal((await h.call('/api/checkout', 'POST', { courseId: 1, provider: 'mpesa', phone: '12345' }, ck)).s, 400);
    const co = await h.call('/api/checkout', 'POST', { courseId: 1, provider: 'mpesa', phone: '0712 345 678' }, ck); assert.equal(co.s, 202); assert.equal(co.j.live_payments_enabled, true);
    assert.equal((await h.call('/api/checkout', 'POST', { courseId: 1, provider: 'mpesa', phone: '0712345678' }, ck)).s, 409, 'only one pending request at a time');
    const ref = co.j.ref, crid = h.app.db.prepare('SELECT checkout_request_id c FROM payment_mpesa WHERE ref=?').get(ref).c;
    const cb = (amount, code = 0, receipt = 'RCP1') => ({ Body: { stkCallback: { MerchantRequestID: 'm1', CheckoutRequestID: crid, ResultCode: code, ResultDesc: 'x', ...(code === 0 ? { CallbackMetadata: { Item: [{ Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: receipt }] } } : {}) } } });
    assert.equal((await h.call('/api/webhooks/mpesa/wrong-secret', 'POST', cb(1000))).s, 401);
    assert.equal((await h.call('/api/webhooks/mpesa/cb-secret-123', 'POST', cb(1))).s, 200); // wrong amount: acknowledged, but nothing granted
    assert.equal(h.app.db.prepare('SELECT status s FROM payments WHERE ref=?').get(ref).s, 'pending'); assert.equal(h.app.db.prepare('SELECT COUNT(*) n FROM enrollments WHERE user_id=?').get(uid).n, 0);
    assert.equal(h.app.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='payment.amount_mismatch'").get().n, 1);
    assert.equal((await h.call('/api/webhooks/mpesa/cb-secret-123', 'POST', cb(1000))).s, 200);
    assert.equal(h.app.db.prepare('SELECT status s FROM payments WHERE ref=?').get(ref).s, 'successful'); assert.equal(h.app.db.prepare('SELECT COUNT(*) n FROM enrollments WHERE user_id=?').get(uid).n, 1);
    assert.equal((await h.call('/api/webhooks/mpesa/cb-secret-123', 'POST', cb(1000))).s, 200); // duplicate is harmless
    assert.equal((await h.call('/api/checkout', 'POST', { courseId: 1, provider: 'mpesa', phone: '0712345678' }, ck)).s, 409, 'already enrolled');
    assert.equal((await h.call('/api/payments/' + ref + '/status', 'GET', null, ck)).j.status, 'successful');
    // another learner cannot read someone else's payment
    h.mk('o@x.com'); assert.equal((await h.call('/api/payments/' + ref + '/status', 'GET', null, await h.login('o@x.com'))).s, 404);
    // lost callback: status polling reconciles with Safaricom after 20s
    h.mk('q@x.com'); const qk = await h.login('q@x.com'); const co2 = await h.call('/api/checkout', 'POST', { courseId: 2, provider: 'mpesa', phone: '0722345678' }, qk); assert.equal(co2.s, 202);
    assert.equal((await h.call('/api/payments/' + co2.j.ref + '/status', 'GET', null, qk)).j.status, 'pending', 'too early to reconcile');
    h.app.db.prepare("UPDATE payments SET created=datetime('now','-1 minute') WHERE ref=?").run(co2.j.ref);
    assert.equal((await h.call('/api/payments/' + co2.j.ref + '/status', 'GET', null, qk)).j.status, 'successful');
  } finally { h.close(); }
});

test('without M-Pesa credentials checkout still refuses to grant access', async () => {
  const h = await boot(); try { h.mk('n@x.com'); const ck = await h.login('n@x.com'); const r = await h.call('/api/checkout', 'POST', { courseId: 1, provider: 'mpesa', phone: '0712345678' }, ck); assert.equal(r.j.live_payments_enabled, false); assert.equal(h.app.db.prepare('SELECT COUNT(*) n FROM enrollments').get().n, 0); } finally { h.close(); }
});

test('server-side streaks count consecutive days and break on gaps', async () => {
  const h = await boot(); try {
    const uid = h.mk('s@x.com'), ck = await h.login('s@x.com'); assert.equal((await h.call('/api/streak', 'GET', null, ck)).j.current, 0);
    const ins = h.app.db.prepare('INSERT INTO daily_checkins(user_id,day) VALUES(?,?)'); [-3, -2, -1].forEach(n => ins.run(uid, day(n)));
    let s = (await h.call('/api/streak', 'GET', null, ck)).j; assert.equal(s.current, 3); assert.equal(s.active_today, false, 'streak is not broken until the day ends');
    s = (await h.call('/api/checkin', 'POST', { focus: 'practice' }, ck)).j; assert.equal(s.current, 4); assert.equal(s.active_today, true);
    assert.equal((await h.call('/api/checkin', 'POST', {}, ck)).j.current, 4, 'checking in twice is harmless');
    ins.run(uid, day(-10)); ins.run(uid, day(-9)); ins.run(uid, day(-8)); ins.run(uid, day(-7)); ins.run(uid, day(-6)); assert.equal((await h.call('/api/streak', 'GET', null, ck)).j.longest, 5, 'gap on day -5 splits runs');
    assert.equal((await h.call('/api/checkin', 'POST', {})).s, 401);
  } finally { h.close(); }
});

test('spaced-repetition reviews: only completed lessons, Leitner boxes, wrong answers return tomorrow', async () => {
  const h = await boot(); try {
    const uid = h.mk('r@x.com'), ck = await h.login('r@x.com'), qz = h.app.db.prepare('SELECT q.id,q.lesson_id,q.answer,q.options FROM quizzes q JOIN lessons l ON l.id=q.lesson_id WHERE l.is_free=1 LIMIT 1').get();
    assert.equal((await h.call('/api/review/queue', 'GET', null, ck)).j.cards.length, 0);
    assert.equal((await h.call('/api/review/answer', 'POST', { quiz_id: qz.id, choice: qz.answer }, ck)).s, 403, 'cannot review a lesson you have not completed');
    h.app.db.prepare('INSERT INTO progress(user_id,lesson_id) VALUES(?,?)').run(uid, qz.lesson_id);
    const queue = (await h.call('/api/review/queue', 'GET', null, ck)).j; assert.ok(queue.cards.length >= 1); assert.ok(!JSON.stringify(queue).includes('"answer"'), 'answers are never sent before answering');
    const wrong = (qz.answer + 1) % JSON.parse(qz.options).length;
    let r = (await h.call('/api/review/answer', 'POST', { quiz_id: qz.id, choice: wrong }, ck)).j; assert.equal(r.correct, false); assert.equal(r.box, 1); assert.equal(r.next_due, day(1));
    r = (await h.call('/api/review/answer', 'POST', { quiz_id: qz.id, choice: qz.answer }, ck)).j; assert.equal(r.correct, true); assert.equal(r.box, 2); assert.equal(r.next_due, day(3));
    r = (await h.call('/api/review/answer', 'POST', { quiz_id: qz.id, choice: qz.answer }, ck)).j; assert.equal(r.box, 3); assert.equal(r.next_due, day(7));
    assert.equal((await h.call('/api/review/answer', 'POST', { quiz_id: qz.id, choice: 99 }, ck)).s, 400);
    assert.equal((await h.call('/api/streak', 'GET', null, ck)).j.active_today, true, 'reviewing counts as activity');
  } finally { h.close(); }
});

test('practice lab: exercises hide solutions and record completion; sandbox page is isolated', async () => {
  const h = await boot(); try {
    h.mk('e@x.com'); const ck = await h.login('e@x.com'), list = (await h.call('/api/exercises', 'GET', null, ck)).j;
    assert.ok(list.length >= 10); assert.ok(!JSON.stringify(list).includes('solution')); assert.equal((await h.call('/api/exercises/vat-inclusive/complete', 'POST', {}, ck)).s, 200);
    assert.equal((await h.call('/api/exercises', 'GET', null, ck)).j.find(e => e.key === 'vat-inclusive').completed, true);
    assert.equal((await h.call('/api/exercises/nope/complete', 'POST', {}, ck)).s, 404); assert.equal((await h.call('/api/exercises/vat-inclusive/complete', 'POST', {})).s, 401);
    const sb = await h.call('/sandbox.html'); assert.equal(sb.s, 200); assert.match(sb.h.get('content-security-policy'), /default-src 'none'/); assert.ok(!/connect-src|default-src 'self'/.test(sb.h.get('content-security-policy'))); assert.equal(sb.h.get('x-frame-options'), 'SAMEORIGIN');
    assert.match((await h.call('/')).h.get('content-security-policy'), /frame-ancestors 'none'/);
  } finally { h.close(); }
});

test('cohorts: admin-only creation, validation, capacity and leaving', async () => {
  const h = await boot(); try {
    h.mk('a@x.com', 'admin'); const ak = await h.login('a@x.com'); [1, 2, 3].forEach(i => h.mk(`u${i}@x.com`)); const u1 = await h.login('u1@x.com');
    const body = { title: 'Weekend Web Cohort', starts_on: day(2), ends_on: day(30), capacity: 2, course_id: 1, description: 'Hi' };
    assert.equal((await h.call('/api/admin/cohorts', 'POST', body, u1)).s, 403);
    assert.equal((await h.call('/api/admin/cohorts', 'POST', { ...body, ends_on: day(-1) }, ak)).s, 400); assert.equal((await h.call('/api/admin/cohorts', 'POST', { ...body, capacity: 1 }, ak)).s, 400);
    const id = (await h.call('/api/admin/cohorts', 'POST', body, ak)).j.id; assert.ok(id);
    assert.equal((await h.call(`/api/cohorts/${id}/join`, 'POST', {}, u1)).s, 200); assert.equal((await h.call(`/api/cohorts/${id}/join`, 'POST', {}, await h.login('u2@x.com'))).s, 200);
    const u3 = await h.login('u3@x.com'); assert.equal((await h.call(`/api/cohorts/${id}/join`, 'POST', {}, u3)).s, 409, 'full');
    const listed = (await h.call('/api/cohorts', 'GET', null, u1)).j[0]; assert.equal(listed.members, 2); assert.equal(listed.joined, true);
    await h.call(`/api/cohorts/${id}/leave`, 'POST', {}, u1); assert.equal((await h.call(`/api/cohorts/${id}/join`, 'POST', {}, u3)).s, 200);
    await h.call(`/api/admin/cohorts/${id}`, 'PUT', { status: 'closed' }, ak); assert.equal((await h.call(`/api/cohorts/${id}/join`, 'POST', {}, u1)).s, 404);
  } finally { h.close(); }
});

test('outcomes: only admin-verified reports count in public results; completion rate hidden for small samples', async () => {
  const h = await boot(); try {
    h.mk('a@x.com', 'admin'); h.mk('l@x.com'); const ak = await h.login('a@x.com'), lk = await h.login('l@x.com');
    assert.equal((await h.call('/api/outcomes', 'POST', { kind: 'bogus' }, lk)).s, 400); assert.equal((await h.call('/api/outcomes', 'POST', { kind: 'new_job', evidence_url: 'http://insecure' }, lk)).s, 400);
    assert.equal((await h.call('/api/outcomes', 'POST', { kind: 'first_client', note: 'Landed a client' }, lk)).s, 201);
    let res = (await h.call('/api/results')).j; assert.equal(res.verified_outcomes_total, 0); assert.equal(res.completion_rate_percent, null); assert.ok(!JSON.stringify(res).includes('l@x.com'));
    const oid = (await h.call('/api/admin/outcomes', 'GET', null, ak)).j[0].id; assert.equal((await h.call(`/api/admin/outcomes/${oid}`, 'PUT', { status: 'verified' }, lk)).s, 403);
    assert.equal((await h.call(`/api/admin/outcomes/${oid}`, 'PUT', { status: 'verified' }, ak)).s, 200);
    res = (await h.call('/api/results')).j; assert.equal(res.verified_outcomes_total, 1); assert.equal(res.verified_outcomes.first_client.count, 1);
  } finally { h.close(); }
});

test('SMS reminders: number must be verified by code; reminder sent once, only to inactive enrolled learners', async () => {
  const sent = [];
  const fakeFetch = async (url, opt) => { const p = new URLSearchParams(opt.body); sent.push({ to: p.get('to'), message: p.get('message') }); assert.equal(opt.headers.apiKey, 'at-key'); return { ok: true, json: async () => ({ SMSMessageData: { Recipients: [{ status: 'Success' }] } }) }; };
  const h = await boot({ fetch: fakeFetch, AT_USERNAME: 'sandbox', AT_API_KEY: 'at-key' });
  try {
    const uid = h.mk('m@x.com'), ck = await h.login('m@x.com'); h.app.db.prepare('INSERT INTO enrollments(user_id,course_id) VALUES(?,1)').run(uid);
    assert.equal((await h.call('/api/reminders/phone', 'POST', { phone: 'abc' }, ck)).s, 400);
    assert.equal((await h.call('/api/reminders/phone', 'POST', { phone: '0712345678' }, ck)).s, 200); const code = /code: (\d{6})/.exec(sent[0].message)[1]; assert.equal(sent[0].to, '+254712345678');
    assert.equal((await h.call('/api/reminders/verify', 'POST', { code: '000000' }, ck)).s, 400);
    const now = new Date(); const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 30)); // 18:30 Kenya time
    assert.equal(await h.app.runReminders(at), 0, 'not verified yet -> nothing sent');
    assert.equal((await h.call('/api/reminders/verify', 'POST', { code }, ck)).s, 200); sent.length = 0;
    assert.equal(await h.app.runReminders(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0))), 0, 'outside the 6pm window');
    const day0 = at; assert.equal(await h.app.runReminders(day0), 1); assert.equal(sent.length, 1); assert.match(sent[0].message, /Skillora/);
    assert.equal(await h.app.runReminders(day0), 0, 'only once per day');
    assert.equal((await h.call('/api/reminders', 'GET', null, ck)).j.phone.includes('***'), true);
    await h.call('/api/reminders/stop', 'POST', {}, ck); h.app.db.prepare('DELETE FROM reminder_log').run(); assert.equal(await h.app.runReminders(day0), 0, 'opted out');
  } finally { h.close(); }
  const off = await boot(); try { off.mk('z@x.com'); assert.equal((await off.call('/api/reminders/phone', 'POST', { phone: '0712345678' }, await off.login('z@x.com'))).s, 503); } finally { off.close(); }
});

test('AI tutor daily caps apply only when the paid provider is used', async () => {
  let upstream = 0; const h = await boot({ OPENAI_API_KEY: 'sk-test', AI_DAILY_PER_USER: '2', AI_DAILY_TOTAL: '3', fetch: async () => { upstream++; return { ok: true, json: async () => ({ output_text: 'Here is a hint.' }) }; } });
  try {
    const mkc = async (e) => { h.mk(e); return h.login(e); }, a = await mkc('a@x.com'), b = await mkc('b@x.com'), ask = (ck) => h.call('/api/ai-tutor', 'POST', { question: 'What is a variable?' }, ck);
    assert.equal((await ask(a)).s, 200); assert.equal((await ask(a)).s, 200); assert.equal((await ask(a)).s, 429, 'per-user cap'); assert.equal((await ask(b)).s, 200); assert.equal((await ask(b)).s, 503, 'global cap'); assert.equal(upstream, 3);
  } finally { h.close(); }
});
