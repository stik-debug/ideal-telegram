'use strict';
// Learner-success features: server-side streaks, spaced-repetition reviews, practice completion, cohorts,
// learner outcomes + public results, SMS reminders (with phone verification) and the public certificate verification page.
const crypto = require('crypto');
const exercises = require('./exercises');
const { normalizePhone } = require('./mpesa');

const eatDay = (d = new Date()) => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10); // Kenya time (UTC+3)
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }; // days until next review for each Leitner box
const OUTCOME_KINDS = { first_client: 'Got my first paying client', job_interview: 'Got a job interview', job_offer: 'Received a job offer', new_job: 'Started a new job', business_started: 'Started or grew a business', income_increase: 'Increased my income' };

module.exports = function registerFeatures({ R, db, send, err, mustUser, admin, audit, env, limited, dbFile }) {
  const fetchImpl = env.fetch || globalThis.fetch;
  const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

  // ---------- Streaks ----------
  const activeDays = (uid) => {
    const s = new Set();
    for (const q of [
      "SELECT day d FROM daily_checkins WHERE user_id=?",
      "SELECT DISTINCT substr(datetime(done_at,'+3 hours'),1,10) d FROM progress WHERE user_id=?",
      "SELECT DISTINCT last_reviewed d FROM review_cards WHERE user_id=? AND last_reviewed IS NOT NULL",
      "SELECT DISTINCT substr(datetime(completed,'+3 hours'),1,10) d FROM exercise_completions WHERE user_id=?"
    ]) db.prepare(q).all(uid).forEach(r => r.d && s.add(r.d));
    return s;
  };
  const streakOf = (uid, now = new Date()) => {
    const set = activeDays(uid), today = eatDay(now);
    let cur = 0, d = set.has(today) ? today : addDays(today, -1);
    while (set.has(d)) { cur++; d = addDays(d, -1); }
    const days = [...set].sort(); let longest = 0, run = 0, prev = null;
    for (const x of days) { run = prev && addDays(prev, 1) === x ? run + 1 : 1; if (run > longest) longest = run; prev = x; }
    return { current: cur, longest, active_today: set.has(today), total_active_days: set.size, last14: Array.from({ length: 14 }, (_, i) => { const day = addDays(today, i - 13); return { day, active: set.has(day) }; }) };
  };
  R('POST', '/api/checkin', (c) => {
    if (!mustUser(c)) return;
    const focus = ['lesson', 'practice', 'project', 'review'].includes(c.body.focus) ? c.body.focus : 'lesson';
    db.prepare('INSERT OR IGNORE INTO daily_checkins(user_id,day,focus) VALUES(?,?,?)').run(c.user.id, eatDay(), focus);
    send(c.res, 200, streakOf(c.user.id));
  });
  R('GET', '/api/streak', (c) => { if (!mustUser(c)) return; send(c.res, 200, { ...streakOf(c.user.id), due_reviews: dueCount(c.user.id) }); });

  // ---------- Spaced-repetition reviews (Leitner boxes built from quiz questions in lessons the learner completed) ----------
  const accessSql = "(l.is_free=1 OR EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=? AND e.course_id=l.course_id))";
  const dueCount = (uid) => {
    const today = eatDay();
    const due = db.prepare(`SELECT COUNT(*) n FROM review_cards rc JOIN quizzes q ON q.id=rc.quiz_id JOIN lessons l ON l.id=q.lesson_id WHERE rc.user_id=? AND rc.due<=? AND ${accessSql}`).get(uid, today, uid).n;
    const fresh = db.prepare(`SELECT COUNT(*) n FROM progress p JOIN quizzes q ON q.lesson_id=p.lesson_id JOIN lessons l ON l.id=q.lesson_id WHERE p.user_id=? AND ${accessSql} AND q.id NOT IN (SELECT quiz_id FROM review_cards WHERE user_id=?)`).get(uid, uid, uid).n;
    return due + Math.min(fresh, 5);
  };
  R('GET', '/api/review/queue', (c) => {
    if (!mustUser(c)) return; const uid = c.user.id, today = eatDay();
    const cols = 'q.id,q.question,q.options,l.title lesson,co.title course';
    const due = db.prepare(`SELECT ${cols} FROM review_cards rc JOIN quizzes q ON q.id=rc.quiz_id JOIN lessons l ON l.id=q.lesson_id JOIN courses co ON co.id=l.course_id WHERE rc.user_id=? AND rc.due<=? AND ${accessSql} ORDER BY rc.due,rc.box LIMIT 10`).all(uid, today, uid);
    const fresh = due.length < 10 ? db.prepare(`SELECT ${cols} FROM progress p JOIN quizzes q ON q.lesson_id=p.lesson_id JOIN lessons l ON l.id=q.lesson_id JOIN courses co ON co.id=l.course_id WHERE p.user_id=? AND ${accessSql} AND q.id NOT IN (SELECT quiz_id FROM review_cards WHERE user_id=?) ORDER BY p.done_at DESC LIMIT ?`).all(uid, uid, uid, Math.min(5, 10 - due.length)) : [];
    const stats = db.prepare('SELECT COUNT(*) total, COALESCE(SUM(box=5),0) mastered FROM review_cards WHERE user_id=?').get(uid);
    send(c.res, 200, { cards: due.concat(fresh).map(r => ({ id: r.id, question: r.question, options: JSON.parse(r.options), lesson: r.lesson, course: r.course })), total_cards: stats.total, mastered: stats.mastered });
  });
  R('POST', '/api/review/answer', (c) => {
    if (!mustUser(c)) return; const uid = c.user.id;
    if (limited('rev' + uid, 60)) return err(c.res, 429, 'Slow down a little and try again.');
    const quizId = Number(c.body.quiz_id), choice = Number(c.body.choice);
    const q = db.prepare(`SELECT q.*,l.is_free,l.course_id FROM quizzes q JOIN lessons l ON l.id=q.lesson_id WHERE q.id=?`).get(quizId); if (!q) return err(c.res, 404, 'Question not found');
    const options = JSON.parse(q.options); if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) return err(c.res, 400, 'Choose one of the options');
    const allowed = c.user.role === 'admin' || q.is_free || db.prepare('SELECT 1 x FROM enrollments WHERE user_id=? AND course_id=?').get(uid, q.course_id);
    const done = db.prepare('SELECT 1 x FROM progress WHERE user_id=? AND lesson_id=?').get(uid, q.lesson_id);
    if (!allowed || !done) return err(c.res, 403, 'Complete the lesson first to review its questions');
    const correct = choice === q.answer, today = eatDay(), card = db.prepare('SELECT * FROM review_cards WHERE user_id=? AND quiz_id=?').get(uid, quizId);
    const box = correct ? Math.min((card ? card.box : 0) + 1, 5) : 1, due = addDays(today, INTERVALS[box]);
    db.prepare('INSERT INTO review_cards(user_id,quiz_id,box,due,last_reviewed,correct_count,wrong_count) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,quiz_id) DO UPDATE SET box=excluded.box,due=excluded.due,last_reviewed=excluded.last_reviewed,correct_count=correct_count+?,wrong_count=wrong_count+?')
      .run(uid, quizId, box, due, today, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0, correct ? 0 : 1);
    send(c.res, 200, { correct, correct_index: q.answer, explanation: q.explain || '', box, next_due: due });
  });

  // ---------- Practice Lab (code runs in the learner's browser sandbox; completion is self-reported practice, not an assessment) ----------
  R('GET', '/api/exercises', (c) => {
    const done = c.user ? new Set(db.prepare('SELECT exercise_key k FROM exercise_completions WHERE user_id=?').all(c.user.id).map(r => r.k)) : new Set();
    send(c.res, 200, exercises.map(({ solution, ...e }) => ({ ...e, completed: done.has(e.key) })));
  });
  R('POST', '/api/exercises/:key/complete', (c, key) => {
    if (!mustUser(c)) return; if (!exercises.some(e => e.key === key)) return err(c.res, 404, 'Exercise not found');
    if (limited('ex' + c.user.id, 30)) return err(c.res, 429, 'Too many requests');
    db.prepare('INSERT OR IGNORE INTO exercise_completions(user_id,exercise_key) VALUES(?,?)').run(c.user.id, key); send(c.res, 200, { ok: true, ...streakOf(c.user.id) });
  });

  // ---------- Cohorts ----------
  const cohortRow = (r, uid) => ({ ...r, members: db.prepare('SELECT COUNT(*) n FROM cohort_members WHERE cohort_id=?').get(r.id).n, joined: !!(uid && db.prepare('SELECT 1 x FROM cohort_members WHERE cohort_id=? AND user_id=?').get(r.id, uid)) });
  R('GET', '/api/cohorts', (c) => send(c.res, 200, db.prepare("SELECT ch.id,ch.title,ch.description,ch.starts_on,ch.ends_on,ch.capacity,ch.status,co.title course FROM cohorts ch LEFT JOIN courses co ON co.id=ch.course_id WHERE ch.status!='cancelled' AND ch.ends_on>=? ORDER BY ch.starts_on").all(eatDay()).map(r => cohortRow(r, c.user && c.user.id))));
  R('POST', '/api/cohorts/:id/join', (c, id) => {
    if (!mustUser(c)) return; const ch = db.prepare('SELECT * FROM cohorts WHERE id=?').get(Number(id));
    if (!ch || ch.status !== 'open' || ch.ends_on < eatDay()) return err(c.res, 404, 'This cohort is not open for joining');
    if (db.prepare('SELECT 1 x FROM cohort_members WHERE cohort_id=? AND user_id=?').get(ch.id, c.user.id)) return send(c.res, 200, { ok: true, already: true });
    if (db.prepare('SELECT COUNT(*) n FROM cohort_members WHERE cohort_id=?').get(ch.id).n >= ch.capacity) return err(c.res, 409, 'This cohort is full');
    db.prepare('INSERT INTO cohort_members(cohort_id,user_id) VALUES(?,?)').run(ch.id, c.user.id); send(c.res, 200, { ok: true });
  });
  R('POST', '/api/cohorts/:id/leave', (c, id) => { if (!mustUser(c)) return; db.prepare('DELETE FROM cohort_members WHERE cohort_id=? AND user_id=?').run(Number(id), c.user.id); send(c.res, 200, { ok: true }); });
  const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  R('POST', '/api/admin/cohorts', admin((c) => {
    const b = c.body, title = String(b.title || '').trim(), desc = String(b.description || '').trim().slice(0, 1000), cap = Number(b.capacity || 30);
    if (title.length < 3 || title.length > 120 || !isDay(b.starts_on) || !isDay(b.ends_on) || b.ends_on < b.starts_on || !Number.isInteger(cap) || cap < 2 || cap > 500) return err(c.res, 400, 'Title, valid start/end dates (end on or after start) and capacity 2-500 are required');
    const courseId = b.course_id ? Number(b.course_id) : null; if (courseId && !db.prepare('SELECT 1 x FROM courses WHERE id=?').get(courseId)) return err(c.res, 400, 'Unknown course');
    const r = db.prepare('INSERT INTO cohorts(title,description,course_id,starts_on,ends_on,capacity,created_by) VALUES(?,?,?,?,?,?,?)').run(title, desc, courseId, b.starts_on, b.ends_on, cap, c.user.id);
    audit(c, 'cohort.create', Number(r.lastInsertRowid), title); send(c.res, 201, { id: Number(r.lastInsertRowid) });
  }));
  R('GET', '/api/admin/cohorts', admin((c) => send(c.res, 200, db.prepare('SELECT ch.*,co.title course FROM cohorts ch LEFT JOIN courses co ON co.id=ch.course_id ORDER BY ch.starts_on DESC LIMIT 100').all().map(r => cohortRow(r, null)))));
  R('PUT', '/api/admin/cohorts/:id', admin((c, id) => {
    const status = String(c.body.status || ''); if (!['open', 'closed', 'cancelled'].includes(status)) return err(c.res, 400, 'Status must be open, closed or cancelled');
    const r = db.prepare('UPDATE cohorts SET status=? WHERE id=?').run(status, Number(id)); if (!r.changes) return err(c.res, 404, 'Cohort not found'); audit(c, 'cohort.' + status, id); send(c.res, 200, { ok: true });
  }));

  // ---------- Learner outcomes (admin-verified) and public results ----------
  R('POST', '/api/outcomes', (c) => {
    if (!mustUser(c)) return; const kind = String(c.body.kind || ''), note = String(c.body.note || '').trim().slice(0, 500), ev = String(c.body.evidence_url || '').trim();
    if (!OUTCOME_KINDS[kind]) return err(c.res, 400, 'Choose what happened'); if (ev && (!/^https:\/\//.test(ev) || ev.length > 300)) return err(c.res, 400, 'Evidence link must start with https://');
    if (db.prepare('SELECT COUNT(*) n FROM learner_outcomes WHERE user_id=?').get(c.user.id).n >= 10) return err(c.res, 429, 'You have reached the limit of 10 outcome reports');
    db.prepare('INSERT INTO learner_outcomes(user_id,kind,note,evidence_url) VALUES(?,?,?,?)').run(c.user.id, kind, note, ev); send(c.res, 201, { ok: true, message: 'Thank you. Your report will be checked by our team before it is counted in our public results.' });
  });
  R('GET', '/api/outcomes/mine', (c) => { if (!mustUser(c)) return; send(c.res, 200, db.prepare('SELECT id,kind,note,evidence_url,status,created FROM learner_outcomes WHERE user_id=? ORDER BY id DESC').all(c.user.id).map(r => ({ ...r, label: OUTCOME_KINDS[r.kind] }))); });
  R('GET', '/api/admin/outcomes', admin((c) => send(c.res, 200, db.prepare("SELECT o.id,o.kind,o.note,o.evidence_url,o.status,o.created,u.name,u.email FROM learner_outcomes o JOIN users u ON u.id=o.user_id ORDER BY (o.status='pending') DESC,o.id DESC LIMIT 200").all().map(r => ({ ...r, label: OUTCOME_KINDS[r.kind] })))));
  R('PUT', '/api/admin/outcomes/:id', admin((c, id) => {
    const status = String(c.body.status || ''); if (!['verified', 'rejected'].includes(status)) return err(c.res, 400, 'Status must be verified or rejected');
    const r = db.prepare('UPDATE learner_outcomes SET status=?,reviewed_by=?,reviewed=CURRENT_TIMESTAMP WHERE id=?').run(status, c.user.id, Number(id)); if (!r.changes) return err(c.res, 404, 'Report not found'); audit(c, 'outcome.' + status, id); send(c.res, 200, { ok: true });
  }));
  R('GET', '/api/results', (c) => {
    const n = (q) => db.prepare(q).get().n, enrolled = n('SELECT COUNT(DISTINCT user_id) n FROM enrollments'), completers = n('SELECT COUNT(DISTINCT user_id) n FROM certificates');
    const outcomes = {}; db.prepare("SELECT kind,COUNT(*) n FROM learner_outcomes WHERE status='verified' GROUP BY kind").all().forEach(r => { outcomes[r.kind] = { label: OUTCOME_KINDS[r.kind], count: r.n }; });
    send(c.res, 200, {
      learners: n("SELECT COUNT(*) n FROM users WHERE role='student'"), courses: n('SELECT COUNT(*) n FROM courses WHERE published=1'), lessons_completed: n('SELECT COUNT(*) n FROM progress'), certificates_issued: n('SELECT COUNT(*) n FROM certificates'),
      completion_rate_percent: enrolled >= 30 ? Math.round(completers / enrolled * 100) : null, // hidden until the sample is big enough to mean something
      enrolled_learners: enrolled, verified_outcomes: outcomes, verified_outcomes_total: Object.values(outcomes).reduce((a, o) => a + o.count, 0),
      note: 'Figures come from live platform records. Outcomes are self-reported and counted only after staff verification. Completion rate appears once at least 30 learners are enrolled.'
    });
  });

  // ---------- SMS reminders (Africa\'s Talking). Numbers must be verified by a one-time code before any reminder is sent. ----------
  const smsConfigured = () => !!(env.AT_USERNAME && env.AT_API_KEY);
  const sendSms = async (phone, message) => {
    const base = env.AT_USERNAME === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
    const form = new URLSearchParams({ username: env.AT_USERNAME, to: '+' + phone, message }); if (env.AT_SENDER_ID) form.set('from', env.AT_SENDER_ID);
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
    try { const r = await fetchImpl(base + '/version1/messaging', { method: 'POST', headers: { apiKey: env.AT_API_KEY, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), signal: ac.signal }); const j = await r.json().catch(() => ({})); const rec = j.SMSMessageData && j.SMSMessageData.Recipients && j.SMSMessageData.Recipients[0]; return r.ok && !!rec && /success/i.test(rec.status); } finally { clearTimeout(t); }
  };
  const mask = (p) => p ? p.slice(0, 5) + '***' + p.slice(-3) : '';
  R('GET', '/api/reminders', (c) => { if (!mustUser(c)) return; const r = db.prepare('SELECT phone,verified,sms_opt_in FROM user_contacts WHERE user_id=?').get(c.user.id) || { phone: '', verified: 0, sms_opt_in: 0 }; send(c.res, 200, { sms_available: smsConfigured(), phone: mask(r.phone), verified: !!r.verified, sms_opt_in: !!r.sms_opt_in, reminder_time: '6:00 PM Kenya time, only on days you have not studied' }); });
  R('POST', '/api/reminders/phone', async (c) => {
    try {
      if (!mustUser(c)) return; if (!smsConfigured()) return err(c.res, 503, 'SMS reminders are not switched on for this academy yet.');
      if (limited('otp' + c.user.id, 3)) return err(c.res, 429, 'Too many code requests. Please wait a minute.');
      const phone = normalizePhone(c.body.phone); if (!phone) return err(c.res, 400, 'Enter a valid Kenyan mobile number, e.g. 0712345678');
      if (db.prepare("SELECT COUNT(*) n FROM user_contacts WHERE phone=? AND verified=1 AND user_id!=?").get(phone, c.user.id).n) return err(c.res, 409, 'That number is already linked to another account');
      const code = String(crypto.randomInt(100000, 1000000));
      db.prepare("INSERT INTO user_contacts(user_id,phone,verified,sms_opt_in,otp_hash,otp_exp,otp_tries) VALUES(?,?,0,0,?,?,0) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,verified=0,sms_opt_in=0,otp_hash=excluded.otp_hash,otp_exp=excluded.otp_exp,otp_tries=0,updated=CURRENT_TIMESTAMP").run(c.user.id, phone, crypto.createHash('sha256').update(code + c.user.id).digest('hex'), Date.now() + 10 * 60000);
      const ok = await sendSms(phone, `Skillora verification code: ${code}. It expires in 10 minutes. If you did not ask for this, ignore it.`);
      if (!ok) return err(c.res, 502, 'We could not send the code. Check the number and try again.'); send(c.res, 200, { ok: true, phone: mask(phone) });
    } catch (e) { console.error('sms error:', e.message); err(c.res, 502, 'We could not send the code. Please try again.'); }
  });
  R('POST', '/api/reminders/verify', (c) => {
    if (!mustUser(c)) return; const r = db.prepare('SELECT * FROM user_contacts WHERE user_id=?').get(c.user.id);
    if (!r || !r.otp_hash || r.otp_exp < Date.now()) return err(c.res, 400, 'That code has expired. Request a new one.'); if (r.otp_tries >= 5) return err(c.res, 429, 'Too many wrong codes. Request a new one.');
    const good = safeEq(crypto.createHash('sha256').update(String(c.body.code || '').trim() + c.user.id).digest('hex'), r.otp_hash);
    if (!good) { db.prepare('UPDATE user_contacts SET otp_tries=otp_tries+1 WHERE user_id=?').run(c.user.id); return err(c.res, 400, 'Incorrect code'); }
    db.prepare('UPDATE user_contacts SET verified=1,sms_opt_in=1,otp_hash=NULL,otp_exp=NULL,otp_tries=0 WHERE user_id=?').run(c.user.id); send(c.res, 200, { ok: true });
  });
  R('POST', '/api/reminders/stop', (c) => { if (!mustUser(c)) return; db.prepare('UPDATE user_contacts SET sms_opt_in=0 WHERE user_id=?').run(c.user.id); send(c.res, 200, { ok: true }); });
  const runReminders = async (now = new Date()) => {
    if (!smsConfigured()) return 0; const hour = Number(new Date(now.getTime() + 3 * 3600e3).toISOString().slice(11, 13)); if (hour < 18 || hour > 20) return 0;
    const today = eatDay(now); let sent = 0;
    const users = db.prepare("SELECT uc.user_id,uc.phone FROM user_contacts uc WHERE uc.sms_opt_in=1 AND uc.verified=1 AND uc.phone!='' AND NOT EXISTS(SELECT 1 FROM reminder_log r WHERE r.user_id=uc.user_id AND r.day=? AND r.channel='sms') AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=uc.user_id) LIMIT 200").all(today);
    for (const u of users) {
      const st = streakOf(u.user_id, now); if (st.active_today) continue; const due = dueCount(u.user_id);
      const msg = st.current > 0 ? `Skillora: keep your ${st.current}-day learning streak alive! ${due ? due + ' quick review' + (due > 1 ? 's are' : ' is') + ' waiting. ' : ''}Study for 10 minutes today.` : `Skillora: a small step today beats a big plan someday. ${due ? due + ' quick review' + (due > 1 ? 's are' : ' is') + ' waiting.' : 'Open your next lesson.'}`;
      try { if (await sendSms(u.phone, msg + ' Stop reminders in Learning Hub > Settings.')) { db.prepare("INSERT OR IGNORE INTO reminder_log(user_id,day,channel) VALUES(?,?,'sms')").run(u.user_id, today); sent++; } } catch (e) { console.error('reminder failed:', e.message); }
    }
    return sent;
  };
  if (dbFile !== ':memory:' && !env.DISABLE_SCHEDULER) setInterval(() => runReminders().catch(e => console.error('reminders:', e.message)), 10 * 60000).unref();

  // ---------- Public certificate verification page ----------
  const verifyPage = (code) => {
    const safe = String(code || '').slice(0, 64), r = db.prepare('SELECT ce.code,ce.issued,u.name,co.title FROM certificates ce JOIN users u ON u.id=ce.user_id JOIN courses co ON co.id=ce.course_id WHERE ce.code=?').get(safe);
    const st = r ? (db.prepare('SELECT status,reason FROM certificate_status WHERE code=?').get(safe) || { status: 'valid' }) : null;
    const body = !r ? `<h1>Certificate not found</h1><p class="bad">We have no record of the code <b>${esc(safe)}</b>. Check the code and try again.</p>`
      : st.status === 'revoked' ? `<h1>Certificate revoked</h1><p class="bad">This certificate was revoked by Skillora Academy and should not be relied on.</p><p>Code: <b>${esc(r.code)}</b></p>`
      : `<h1>Certificate verified ✓</h1><p class="ok">Skillora Academy issued this certificate of course completion.</p><dl><dt>Learner</dt><dd>${esc(r.name)}</dd><dt>Course</dt><dd>${esc(r.title)}</dd><dt>Issued</dt><dd>${esc(String(r.issued).slice(0, 10))}</dd><dt>Code</dt><dd>${esc(r.code)}</dd></dl><p class="small">This records completion of a Skillora Academy course. It is not a government-accredited qualification.</p>`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Certificate verification — Skillora Academy</title><style>body{font-family:system-ui,sans-serif;background:#f7f8f4;color:#112a25;margin:0;padding:24px}main{max-width:560px;margin:40px auto;background:#fff;border:1px solid #e3e9e4;border-radius:16px;padding:28px}h1{font-size:26px;margin-top:0}.ok{color:#0b4a2b;font-weight:600}.bad{color:#a02334;font-weight:600}dt{font-size:12px;color:#61746e;margin-top:12px;text-transform:uppercase;letter-spacing:.5px}dd{margin:2px 0 0;font-size:18px;font-weight:600}.small{font-size:12px;color:#61746e}a{color:#08745a}</style></head><body><main>${body}<p><a href="/">← Skillora Academy</a></p></main></body></html>`;
    return { status: r ? 200 : 404, html };
  };
  return { runReminders, verifyPage, streakOf, dueCount, smsConfigured };
};
