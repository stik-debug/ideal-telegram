const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { open } = require('./db'); const { hash, verify } = require('./auth');

function createApp(env = process.env) {
  const db = open(env.DB_FILE || './data/skillforge.db');
  const secret = env.PAYMENT_WEBHOOK_SECRET || '';
  const hits = new Map();
  const limited = (key, max = 10) => { const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < 60000); a.push(now); hits.set(key, a); return a.length > max; };
  const send = (res, code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(obj)); };
  const err = (res, code, msg) => send(res, code, { error: msg });
  const certificatePdf = (student, course, code, issued) => {
    // A dependency-free, one-page PDF certificate with a verifiable unique code.
    const safe = (v) => String(v || '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/([\\()])/g, '\\$1').slice(0, 110);
    const lines = [
      'q', '0.05 0.25 0.20 rg', '0 0 842 595 re f',
      'Q', 'q', '0.98 0.98 0.95 rg', '18 18 806 559 re f', 'Q',
      'q', '0.05 0.25 0.20 RG', '3 w', '32 32 778 531 re S', 'Q',
      'q', '0.78 0.58 0.20 RG', '1.2 w', '43 43 756 509 re S', 'Q',
      'BT /F1 15 Tf 0.05 0.25 0.20 rg 1 0 0 1 0 0 Tm 1 0 0 1 315 520 Tm (SKILLFORGE ACADEMY) Tj ET',
      'BT /F1 11 Tf 0.35 0.43 0.38 rg 1 0 0 1 334 493 Tm (CERTIFICATE OF COMPLETION) Tj ET',
      'BT /F2 34 Tf 0.05 0.25 0.20 rg 1 0 0 1 251 435 Tm (Certificate) Tj ET',
      'BT /F2 30 Tf 0.05 0.25 0.20 rg 1 0 0 1 300 394 Tm (of Completion) Tj ET',
      'BT /F1 13 Tf 0.30 0.37 0.33 rg 1 0 0 1 304 350 Tm (This is proudly presented to) Tj ET',
      `BT /F2 26 Tf 0.05 0.25 0.20 rg 1 0 0 1 ${Math.max(90, 421-safe(student).length*7)} 309 Tm (${safe(student)}) Tj ET`,
      'q 0.78 0.58 0.20 RG 1.5 w 130 294 m 712 294 l S Q',
      'BT /F1 13 Tf 0.30 0.37 0.33 rg 1 0 0 1 300 260 Tm (for successfully completing the course) Tj ET',
      `BT /F2 20 Tf 0.05 0.25 0.20 rg 1 0 0 1 ${Math.max(75, 421-safe(course).length*5.5)} 225 Tm (${safe(course)}) Tj ET`,
      'BT /F1 11 Tf 0.30 0.37 0.33 rg 1 0 0 1 260 188 Tm (Awarded by SkillForge Academy) Tj ET',
      `BT /F1 10 Tf 0.30 0.37 0.33 rg 1 0 0 1 135 130 Tm (Issued: ${safe(issued).slice(0,10)}) Tj ET`,
      `BT /F1 10 Tf 0.30 0.37 0.33 rg 1 0 0 1 495 130 Tm (Certificate ID: ${safe(code)}) Tj ET`,
      'BT /F1 9 Tf 0.30 0.37 0.33 rg 1 0 0 1 190 83 Tm (Independent course completion record; not an accredited qualification.) Tj ET',
      'BT /F1 8 Tf 0.30 0.37 0.33 rg 1 0 0 1 230 65 Tm (Verify this code using the official SkillForge Academy verification page.) Tj ET'
    ].join('\n');
    const stream = Buffer.from(lines, 'latin1');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      `<< /Length ${stream.length} >>\nstream\n${stream.toString('latin1')}\nendstream`
    ];
    let pdf = '%PDF-1.4\n%SFCA\n', offsets = [0];
    for (let i=0;i<objs.length;i++){offsets.push(Buffer.byteLength(pdf,'latin1'));pdf += `${i+1} 0 obj\n${objs[i]}\nendobj\n`;}
    const xref = Buffer.byteLength(pdf,'latin1'); pdf += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf,'latin1');
  };
  const readBody = (req) => new Promise((ok, no) => { let b = ''; req.on('data', d => { b += d; if (b.length > 1e6) { req.destroy(); no(new Error('too large')); } }); req.on('end', () => ok(b)); });
  const cookie = (req, n) => ((req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(n + '=')) || '').slice(n.length + 1);
  const userOf = (req) => { const t = cookie(req, 'sid'); if (!t) return null; return db.prepare('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.exp>?').get(t, Date.now()) || null; };
  const canRead = (u, courseId) => u && (u.role === 'admin' || db.prepare('SELECT 1 x FROM enrollments WHERE user_id=? AND course_id=?').get(u.id, courseId));
  const newSession = (res, uid, body) => { const t = crypto.randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(t, uid, Date.now() + 7 * 864e5);
    send(res, 200, body, { 'Set-Cookie': `sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${env.COOKIE_SECURE === 'true' ? '; Secure' : ''}` }); };

  const routes = [];
  const R = (m, p, fn) => routes.push([m, new RegExp('^' + p.replace(/:\w+/g, '([^/]+)') + '$'), fn]);

  R('GET', '/health', (c) => send(c.res, 200, { status: 'ok', db: db.prepare('SELECT 1 x').get().x === 1 }));
  R('POST', '/api/register', (c) => {
    const { email, name, password } = c.body;
    if (limited('reg' + c.ip)) return err(c.res, 429, 'Too many attempts');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '') || !name || String(name).length > 80 || (password || '').length < 10) return err(c.res, 400, 'Valid email, name and a password of 10+ characters are required');
    try { const r = db.prepare("INSERT INTO users(email,name,pass_hash) VALUES(?,?,?)").run(email.toLowerCase(), name, hash(password)); newSession(c.res, Number(r.lastInsertRowid), { ok: true }); }
    catch { err(c.res, 409, 'Email already registered'); }
  });
  R('POST', '/api/login', (c) => {
    if (limited('login' + c.ip)) return err(c.res, 429, 'Too many attempts');
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(String(c.body.email || '').toLowerCase());
    if (!u || !verify(String(c.body.password || ''), u.pass_hash)) return err(c.res, 401, 'Invalid email or password');
    newSession(c.res, u.id, { ok: true });
  });
  R('POST', '/api/logout', (c) => { db.prepare('DELETE FROM sessions WHERE token=?').run(cookie(c.req, 'sid')); send(c.res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Max-Age=0; Path=/' }); });
  R('GET', '/api/me', (c) => c.user ? send(c.res, 200, c.user) : err(c.res, 401, 'Not signed in'));
  R('GET', '/api/courses', (c) => send(c.res, 200, db.prepare('SELECT id,slug,title,summary,price_kes,content_status,(SELECT COUNT(*) FROM lessons WHERE course_id=courses.id) lessons FROM courses WHERE published=1').all()));
  R('GET', '/api/courses/:slug', (c, slug) => {
    const co = db.prepare('SELECT * FROM courses WHERE slug=? AND published=1').get(slug);
    if (!co) return err(c.res, 404, 'Course not found');
    const full = canRead(c.user, co.id);
    const done = c.user ? new Set(db.prepare('SELECT lesson_id FROM progress WHERE user_id=?').all(c.user.id).map(r => r.lesson_id)) : new Set();
    const lessons = db.prepare('SELECT id,pos,title,body,is_free FROM lessons WHERE course_id=? ORDER BY pos').all(co.id).map(l => {
      const open = full || l.is_free; const qs = open ? db.prepare('SELECT id,question,options FROM quizzes WHERE lesson_id=?').all(l.id).map(q => ({ ...q, options: JSON.parse(q.options) })) : [];
      return { id: l.id, pos: l.pos, title: l.title, is_free: !!l.is_free, locked: !open, done: done.has(l.id), body: open ? l.body : null, quiz: qs };
    });
    send(c.res, 200, { id: co.id, slug, title: co.title, summary: co.summary, price_kes: co.price_kes, enrolled: !!full, lessons });
  });
  const lessonAccess = (c, id) => {
    const l = db.prepare('SELECT * FROM lessons WHERE id=?').get(id);
    if (!l) { err(c.res, 404, 'Lesson not found'); return null; }
    if (!c.user) { err(c.res, 401, 'Sign in required'); return null; }
    if (!l.is_free && !canRead(c.user, l.course_id)) { err(c.res, 403, 'Enrol to access this lesson'); return null; }
    return l;
  };
  R('POST', '/api/lessons/:id/complete', (c, id) => { const l = lessonAccess(c, id); if (!l) return; db.prepare('INSERT OR IGNORE INTO progress(user_id,lesson_id) VALUES(?,?)').run(c.user.id, l.id); send(c.res, 200, { ok: true }); });
  R('POST', '/api/lessons/:id/quiz', (c, id) => {
    const l = lessonAccess(c, id); if (!l) return;
    const qs = db.prepare('SELECT * FROM quizzes WHERE lesson_id=?').all(l.id); const ans = c.body.answers || {};
    let score = 0; const results = qs.map(q => { const ok = Number(ans[q.id]) === q.answer; if (ok) score++; return { id: q.id, correct: ok, explanation: q.explain }; });
    db.prepare('INSERT INTO quiz_attempts(user_id,lesson_id,score,total) VALUES(?,?,?,?)').run(c.user.id, l.id, score, qs.length);
    send(c.res, 200, { score, total: qs.length, results });
  });
  R('GET', '/api/dashboard', (c) => {
    if (!c.user) return err(c.res, 401, 'Sign in required');
    const rows = db.prepare('SELECT c.id,c.slug,c.title,(SELECT COUNT(*) FROM lessons WHERE course_id=c.id) total,(SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=c.id) done,(SELECT code FROM certificates ce WHERE ce.user_id=e.user_id AND ce.course_id=c.id) certificate_code FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=?').all(c.user.id, c.user.id);
    send(c.res, 200, { courses: rows, certificates: db.prepare('SELECT code,course_id,issued FROM certificates WHERE user_id=?').all(c.user.id), payments: db.prepare('SELECT ref,amount_kes,provider,status,created FROM payments WHERE user_id=?').all(c.user.id) });
  });
  R('POST', '/api/courses/:slug/certificate', (c, slug) => {
    if (!c.user) return err(c.res, 401, 'Sign in required');
    const co = db.prepare('SELECT * FROM courses WHERE slug=?').get(slug); if (!co) return err(c.res, 404, 'Not found');
    if (!db.prepare('SELECT 1 x FROM enrollments WHERE user_id=? AND course_id=?').get(c.user.id, co.id)) return err(c.res, 403, 'Not enrolled');
    const total = db.prepare('SELECT COUNT(*) n FROM lessons WHERE course_id=?').get(co.id).n;
    const done = db.prepare('SELECT COUNT(*) n FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=?').get(c.user.id, co.id).n;
    if (!total || done < total) return err(c.res, 409, `Complete all lessons first (${done}/${total})`);
    const code = 'SF-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    db.prepare('INSERT OR IGNORE INTO certificates(code,user_id,course_id) VALUES(?,?,?)').run(code, c.user.id, co.id);
    send(c.res, 200, db.prepare('SELECT code FROM certificates WHERE user_id=? AND course_id=?').get(c.user.id, co.id));
  });
  R('GET', '/api/verify/:code', (c, code) => {
    const r = db.prepare('SELECT ce.code,ce.issued,u.name,co.title FROM certificates ce JOIN users u ON u.id=ce.user_id JOIN courses co ON co.id=ce.course_id WHERE ce.code=?').get(code);
    r ? send(c.res, 200, { valid: true, ...r }) : err(c.res, 404, 'Certificate not found');
  });
  R('GET', '/api/certificates/:code.pdf', (c, code) => {
    if (!c.user) return err(c.res, 401, 'Sign in required');
    const r = db.prepare('SELECT ce.code,ce.issued,ce.user_id,u.name,co.title FROM certificates ce JOIN users u ON u.id=ce.user_id JOIN courses co ON co.id=ce.course_id WHERE ce.code=?').get(code);
    if (!r) return err(c.res, 404, 'Certificate not found');
    if (c.user.role !== 'admin' && r.user_id !== c.user.id) return err(c.res, 403, 'You cannot download another learner’s certificate');
    const pdf = certificatePdf(r.name, r.title, r.code, r.issued);
    c.res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="SkillForge-Certificate-${r.code}.pdf"`, 'Content-Length': pdf.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    c.res.end(pdf);
  });
  // Payments: pending record is created server-side; access is granted ONLY by a signed webhook.
  R('POST', '/api/checkout', (c) => {
    if (!c.user) return err(c.res, 401, 'Sign in required');
    const co = db.prepare('SELECT * FROM courses WHERE id=? AND published=1').get(Number(c.body.courseId)); if (!co) return err(c.res, 404, 'Course not found');
    const provider = c.body.provider === 'card' ? 'card' : 'mpesa';
    const ref = 'SF' + crypto.randomBytes(8).toString('hex').toUpperCase();
    db.prepare('INSERT INTO payments(ref,user_id,course_id,amount_kes,provider) VALUES(?,?,?,?,?)').run(ref, c.user.id, co.id, co.price_kes, provider);
    const live = !!(env.PAYMENT_PROVIDER && env.PAYMENT_API_KEY);
    // TODO(provider): when live, call the gateway here (server-side) with `ref` and amount, return its checkout/STK info.
    send(c.res, live ? 202 : 503, { ref, status: 'pending', live_payments_enabled: live, message: live ? 'Awaiting provider confirmation' : 'Live payments are not enabled yet. No access has been granted.' });
  });
  R('POST', '/api/webhooks/payment', (c) => {
    const sig = String(c.req.headers['x-signature'] || '');
    const want = crypto.createHmac('sha256', secret).update(c.raw).digest('hex');
    if (!secret || sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return err(c.res, 401, 'Bad signature');
    const { event_id, ref, status, amount_kes } = c.body;
    const p = db.prepare('SELECT * FROM payments WHERE ref=?').get(ref); if (!event_id || !p) return err(c.res, 404, 'Unknown payment');
    if (db.prepare('SELECT 1 x FROM webhook_events WHERE event_id=?').get(event_id)) return send(c.res, 200, { duplicate: true });
    db.prepare('INSERT INTO webhook_events(event_id) VALUES(?)').run(event_id);
    if (!['successful', 'failed', 'cancelled', 'refunded'].includes(status)) return err(c.res, 400, 'Bad status');
    if (status === 'successful' && Number(amount_kes) !== p.amount_kes) return err(c.res, 409, 'Amount mismatch');
    db.prepare('UPDATE payments SET status=? WHERE ref=?').run(status, ref);
    if (status === 'successful') db.prepare('INSERT OR IGNORE INTO enrollments(user_id,course_id) VALUES(?,?)').run(p.user_id, p.course_id);
    if (status === 'refunded') db.prepare('DELETE FROM enrollments WHERE user_id=? AND course_id=?').run(p.user_id, p.course_id);
    send(c.res, 200, { ok: true });
  });
  const admin = (fn) => (c, ...a) => { if (!c.user) return err(c.res, 401, 'Sign in required'); if (c.user.role !== 'admin') return err(c.res, 403, 'Admins only'); return fn(c, ...a); };
  R('GET', '/api/admin/payments', admin((c) => send(c.res, 200, db.prepare('SELECT p.*,u.email FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC').all())));
  R('GET', '/api/admin/students', admin((c) => send(c.res, 200, db.prepare("SELECT u.id,u.email,u.name,(SELECT COUNT(*) FROM progress WHERE user_id=u.id) lessons_done FROM users u WHERE role='student'").all())));
  R('GET', '/api/admin/courses', admin((c) => send(c.res, 200, db.prepare('SELECT id,slug,title,summary,price_kes,published,content_status,(SELECT COUNT(*) FROM lessons WHERE course_id=courses.id) lessons FROM courses ORDER BY title').all())));
  R('PUT', '/api/admin/courses/:id', admin((c, id) => {
    const { price_kes, published } = c.body;
    if (!Number.isInteger(price_kes) || price_kes < 0) return err(c.res, 400, 'price_kes must be a non-negative integer');
    db.prepare('UPDATE courses SET price_kes=?, published=? WHERE id=?').run(price_kes, published ? 1 : 0, Number(id)); send(c.res, 200, { ok: true });
  }));
  R('GET', '/api/admin/overview', admin((c) => send(c.res, 200, {
    students: db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n,
    courses: db.prepare('SELECT COUNT(*) n FROM courses').get().n,
    published_courses: db.prepare('SELECT COUNT(*) n FROM courses WHERE published=1').get().n,
    enrolments: db.prepare('SELECT COUNT(*) n FROM enrollments').get().n,
    certificates: db.prepare('SELECT COUNT(*) n FROM certificates').get().n,
    open_tickets: db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE status!='resolved'").get().n,
    pending_assignments: db.prepare("SELECT COUNT(*) n FROM assignments WHERE status='submitted'").get().n
  })));
  R('GET', '/api/admin/enrolments', admin((c) => send(c.res, 200, db.prepare('SELECT e.created,u.id user_id,u.name,u.email,c.id course_id,c.title course FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id ORDER BY e.created DESC').all())));
  R('GET', '/api/admin/certificates', admin((c) => send(c.res, 200, db.prepare('SELECT ce.code,ce.issued,u.name,u.email,c.title course FROM certificates ce JOIN users u ON u.id=ce.user_id JOIN courses c ON c.id=ce.course_id ORDER BY ce.issued DESC').all())));
  R('PUT', '/api/admin/courses/:id/details', admin((c, id) => {
    const { title, summary, slug, price_kes, published } = c.body;
    if (!title || String(title).trim().length > 140 || !Number.isInteger(price_kes) || price_kes < 0) return err(c.res, 400, 'A title (max 140 characters) and non-negative integer price are required');
    try { const r = db.prepare('UPDATE courses SET title=?,summary=?,slug=?,price_kes=?,published=? WHERE id=?').run(String(title).trim(), String(summary||''), String(slug||'').trim(), price_kes, published ? 1 : 0, Number(id)); if (!r.changes) return err(c.res,404,'Course not found'); send(c.res,200,{ok:true}); } catch { err(c.res,409,'Course slug already exists or is invalid'); }
  }));
  R('POST', '/api/admin/courses', admin((c) => {
    const { title, slug, summary, price_kes, published } = c.body;
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||'') || !Number.isInteger(price_kes) || price_kes < 0) return err(c.res,400,'Title, URL-safe slug and non-negative integer price required');
    try { const r=db.prepare('INSERT INTO courses(slug,title,summary,price_kes,published,content_status) VALUES(?,?,?,?,?,?)').run(slug,title,String(summary||''),price_kes,published?1:0,'draft'); send(c.res,201,{id:Number(r.lastInsertRowid)}); } catch { err(c.res,409,'Course slug already exists'); }
  }));
  R('GET', '/api/admin/courses/:id/lessons', admin((c,id) => send(c.res,200,db.prepare('SELECT id,course_id,pos,title,body,is_free FROM lessons WHERE course_id=? ORDER BY pos').all(Number(id)))));
  R('POST', '/api/admin/courses/:id/lessons', admin((c,id) => {
    const { pos,title,body,is_free }=c.body;
    if (!Number.isInteger(pos)||pos<1||!title||!body) return err(c.res,400,'Lesson position, title and body required');
    try { const r=db.prepare('INSERT INTO lessons(course_id,pos,title,body,is_free) VALUES(?,?,?,?,?)').run(Number(id),pos,String(title),String(body),is_free?1:0); send(c.res,201,{id:Number(r.lastInsertRowid)}); } catch { err(c.res,409,'Course not found or lesson position already used'); }
  }));
  R('PUT', '/api/admin/lessons/:id', admin((c,id) => {
    const {pos,title,body,is_free}=c.body; if (!Number.isInteger(pos)||pos<1||!title||!body) return err(c.res,400,'Lesson position, title and body required');
    try { const r=db.prepare('UPDATE lessons SET pos=?,title=?,body=?,is_free=? WHERE id=?').run(pos,String(title),String(body),is_free?1:0,Number(id)); if(!r.changes)return err(c.res,404,'Lesson not found');send(c.res,200,{ok:true}); } catch { err(c.res,409,'Lesson position already used in this course'); }
  }));
  R('DELETE', '/api/admin/lessons/:id', admin((c,id) => { const r=db.prepare('DELETE FROM lessons WHERE id=?').run(Number(id)); r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Lesson not found'); }));
  R('POST', '/api/assignments', (c) => {
    if (!c.user) return err(c.res,401,'Sign in required');
    const {course_id,lesson_id,title,filename,mime_type,data,submission_text}=c.body;
    if(!Number.isInteger(Number(course_id))||!title||!filename||!mime_type||!data||String(data).length>700000) return err(c.res,400,'Course, title, filename, MIME type and file data (max ~500 KB) required');
    if(!db.prepare('SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?').get(c.user.id,Number(course_id)))return err(c.res,403,'Enrol in this course before submitting an assignment');
    if(!/^[-\w .()]+$/.test(filename)||!['application/pdf','text/plain','image/png','image/jpeg','application/zip'].includes(mime_type))return err(c.res,400,'Unsupported filename or file type');
    const b64=String(data).replace(/^data:[^;]+;base64,/,''); if(!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))return err(c.res,400,'File must be base64 encoded'); const buf=Buffer.from(b64,'base64'); if(buf.length>512000)return err(c.res,413,'Maximum upload size is 500 KB');
    const r=db.prepare('INSERT INTO assignments(user_id,course_id,lesson_id,title,filename,mime_type,file_data,submission_text) VALUES(?,?,?,?,?,?,?,?)').run(c.user.id,Number(course_id),lesson_id?Number(lesson_id):null,String(title).slice(0,160),filename,mime_type,buf,String(submission_text||'').slice(0,4000));send(c.res,201,{id:Number(r.lastInsertRowid),status:'submitted'});
  });
  R('GET', '/api/assignments', (c) => { if(!c.user)return err(c.res,401,'Sign in required'); const q=c.user.role==='admin'?db.prepare('SELECT a.id,a.user_id,u.name,u.email,a.course_id,c.title course,a.lesson_id,a.title,a.filename,a.mime_type,a.submission_text,a.status,a.instructor_feedback,a.submitted,a.reviewed FROM assignments a JOIN users u ON u.id=a.user_id JOIN courses c ON c.id=a.course_id ORDER BY a.submitted DESC').all():db.prepare('SELECT id,course_id,lesson_id,title,filename,mime_type,submission_text,status,instructor_feedback,submitted,reviewed FROM assignments WHERE user_id=? ORDER BY submitted DESC').all(c.user.id);send(c.res,200,q); });
  R('GET', '/api/assignments/:id/file', (c,id) => { if(!c.user)return err(c.res,401,'Sign in required');const a=db.prepare('SELECT * FROM assignments WHERE id=?').get(Number(id));if(!a)return err(c.res,404,'Assignment not found');if(c.user.role!=='admin'&&a.user_id!==c.user.id)return err(c.res,403,'Not allowed');c.res.writeHead(200,{'Content-Type':a.mime_type,'Content-Disposition':`attachment; filename="${a.filename.replace(/["\\]/g,'_')}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});c.res.end(a.file_data); });
  R('PUT', '/api/admin/assignments/:id/review', admin((c,id) => { const {status,feedback}=c.body;if(!['reviewed','resubmit'].includes(status)||!String(feedback||'').trim())return err(c.res,400,'Status reviewed/resubmit and feedback required');const r=db.prepare('UPDATE assignments SET status=?,instructor_feedback=?,reviewed=CURRENT_TIMESTAMP WHERE id=?').run(status,String(feedback).slice(0,4000),Number(id));r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Assignment not found'); }));
  R('POST', '/api/support/tickets', (c) => {if(!c.user)return err(c.res,401,'Sign in required');const {subject,message}=c.body;if(!String(subject||'').trim()||!String(message||'').trim())return err(c.res,400,'Subject and message required');const r=db.prepare('INSERT INTO support_tickets(user_id,subject) VALUES(?,?)').run(c.user.id,String(subject).slice(0,160));db.prepare('INSERT INTO support_replies(ticket_id,user_id,message) VALUES(?,?,?)').run(Number(r.lastInsertRowid),c.user.id,String(message).slice(0,5000));send(c.res,201,{id:Number(r.lastInsertRowid),status:'open'});});
  R('GET', '/api/support/tickets', (c) => {if(!c.user)return err(c.res,401,'Sign in required');const tickets=c.user.role==='admin'?db.prepare('SELECT t.*,u.name,u.email FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.updated DESC').all():db.prepare('SELECT * FROM support_tickets WHERE user_id=? ORDER BY updated DESC').all(c.user.id);send(c.res,200,tickets);});
  R('GET', '/api/support/tickets/:id/replies', (c,id) => {if(!c.user)return err(c.res,401,'Sign in required');const t=db.prepare('SELECT * FROM support_tickets WHERE id=?').get(Number(id));if(!t)return err(c.res,404,'Ticket not found');if(c.user.role!=='admin'&&t.user_id!==c.user.id)return err(c.res,403,'Not allowed');send(c.res,200,db.prepare('SELECT r.id,r.user_id,u.name,u.role,r.message,r.created FROM support_replies r JOIN users u ON u.id=r.user_id WHERE ticket_id=? ORDER BY r.id').all(Number(id)));});
  R('POST', '/api/support/tickets/:id/replies', (c,id) => {if(!c.user)return err(c.res,401,'Sign in required');const t=db.prepare('SELECT * FROM support_tickets WHERE id=?').get(Number(id));if(!t)return err(c.res,404,'Ticket not found');if(c.user.role!=='admin'&&t.user_id!==c.user.id)return err(c.res,403,'Not allowed');const message=String(c.body.message||'').trim();if(!message)return err(c.res,400,'Message required');db.prepare('INSERT INTO support_replies(ticket_id,user_id,message) VALUES(?,?,?)').run(Number(id),c.user.id,message.slice(0,5000));const status=c.user.role==='admin'?(c.body.status==='resolved'?'resolved':'waiting_student'):'open';db.prepare('UPDATE support_tickets SET status=?,updated=CURRENT_TIMESTAMP WHERE id=?').run(status,Number(id));send(c.res,201,{ok:true,status});});
  R('PUT', '/api/admin/support/tickets/:id', admin((c,id) => {const status=c.body.status;if(!['open','waiting_student','resolved'].includes(status))return err(c.res,400,'Invalid ticket status');const r=db.prepare('UPDATE support_tickets SET status=?,updated=CURRENT_TIMESTAMP WHERE id=?').run(status,Number(id));r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Ticket not found');}));


  // Learner-outcome features: portfolio, community, opportunities, business teams and reporting.
  const mustUser = (c) => { if (!c.user) { err(c.res,401,'Sign in required'); return false; } return true; };
  R('GET','/api/portfolio',(c)=>{if(!mustUser(c))return;const own=c.user.role==='admin'&&new URL(c.req.url,'http://x').searchParams.get('all')==='1';send(c.res,200,db.prepare(`SELECT p.id,p.user_id,u.name,p.title,p.description,p.skills,p.project_url,p.visibility,p.created FROM portfolio_projects p JOIN users u ON u.id=p.user_id WHERE ${own?'1=1':'(p.user_id=? OR p.visibility=\'public\')'} ORDER BY p.created DESC`).all(...(own?[]:[c.user.id])));});
  R('POST','/api/portfolio',(c)=>{if(!mustUser(c))return;const b=c.body;if(!String(b.title||'').trim()||!String(b.description||'').trim())return err(c.res,400,'Project title and description required');if(b.project_url&&!/^https:\/\//i.test(b.project_url))return err(c.res,400,'Project URL must use HTTPS');const r=db.prepare('INSERT INTO portfolio_projects(user_id,title,description,skills,project_url,visibility) VALUES(?,?,?,?,?,?)').run(c.user.id,String(b.title).slice(0,120),String(b.description).slice(0,3000),String(b.skills||'').slice(0,300),String(b.project_url||'').slice(0,500),b.visibility==='public'?'public':'private');send(c.res,201,{id:Number(r.lastInsertRowid)});});
  R('DELETE','/api/portfolio/:id',(c,id)=>{if(!mustUser(c))return;const r=db.prepare('DELETE FROM portfolio_projects WHERE id=? AND user_id=?').run(Number(id),c.user.id);r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Project not found');});
  R('GET','/api/opportunities',(c)=>send(c.res,200,db.prepare("SELECT id,title,organization,description,type,location,apply_url,created FROM opportunities WHERE status='open' ORDER BY created DESC").all()));
  R('POST','/api/admin/opportunities',admin((c)=>{const b=c.body;if(!String(b.title||'').trim()||!String(b.organization||'').trim()||!String(b.description||'').trim())return err(c.res,400,'Title, organization and description required');if(b.apply_url&&!/^https:\/\//i.test(b.apply_url))return err(c.res,400,'Apply URL must use HTTPS');const r=db.prepare('INSERT INTO opportunities(title,organization,description,type,location,apply_url,created_by) VALUES(?,?,?,?,?,?,?)').run(String(b.title).slice(0,160),String(b.organization).slice(0,160),String(b.description).slice(0,3000),String(b.type||'project').slice(0,40),String(b.location||'Remote').slice(0,100),String(b.apply_url||'').slice(0,500),c.user.id);db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?)').run(c.user.id,'opportunity.create',String(r.lastInsertRowid),String(b.title));send(c.res,201,{id:Number(r.lastInsertRowid)});}));
  R('PUT','/api/admin/opportunities/:id',admin((c,id)=>{const status=c.body.status;if(!['open','closed'].includes(status))return err(c.res,400,'Status must be open or closed');const r=db.prepare('UPDATE opportunities SET status=? WHERE id=?').run(status,Number(id));r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Opportunity not found');}));
  R('GET','/api/discussions',(c)=>{if(!mustUser(c))return;const courseId=Number(new URL(c.req.url,'http://x').searchParams.get('course_id')||0);send(c.res,200,db.prepare('SELECT d.id,d.user_id,u.name,d.course_id,d.parent_id,d.body,d.created FROM discussions d JOIN users u ON u.id=d.user_id WHERE (?=0 OR d.course_id=?) ORDER BY d.created DESC LIMIT 200').all(courseId,courseId));});
  R('POST','/api/discussions',(c)=>{if(!mustUser(c))return;const b=c.body,body=String(b.body||'').trim();if(!body||body.length>3000)return err(c.res,400,'Message must be 1–3000 characters');let courseId=b.course_id?Number(b.course_id):null;if(courseId&&!db.prepare('SELECT id FROM courses WHERE id=?').get(courseId))return err(c.res,404,'Course not found');const parent=b.parent_id?Number(b.parent_id):null;if(parent&&!db.prepare('SELECT id FROM discussions WHERE id=?').get(parent))return err(c.res,404,'Parent post not found');const r=db.prepare('INSERT INTO discussions(user_id,course_id,parent_id,body) VALUES(?,?,?,?)').run(c.user.id,courseId,parent,body);send(c.res,201,{id:Number(r.lastInsertRowid)});});
  R('GET','/api/reviews',(c)=>{const id=Number(new URL(c.req.url,'http://x').searchParams.get('course_id')||0);send(c.res,200,db.prepare('SELECT r.id,r.rating,r.review,r.created,u.name FROM course_reviews r JOIN users u ON u.id=r.user_id WHERE (?=0 OR r.course_id=?) ORDER BY r.created DESC').all(id,id));});
  R('POST','/api/reviews',(c)=>{if(!mustUser(c))return;const b=c.body,id=Number(b.course_id),rating=Number(b.rating);if(!db.prepare('SELECT id FROM enrollments WHERE user_id=? AND course_id=?').get(c.user.id,id))return err(c.res,403,'Only enrolled learners can review a course');if(!Number.isInteger(rating)||rating<1||rating>5)return err(c.res,400,'Rating must be 1 to 5');db.prepare('INSERT INTO course_reviews(user_id,course_id,rating,review) VALUES(?,?,?,?) ON CONFLICT(user_id,course_id) DO UPDATE SET rating=excluded.rating,review=excluded.review,created=CURRENT_TIMESTAMP').run(c.user.id,id,rating,String(b.review||'').slice(0,2000));send(c.res,201,{ok:true});});
  R('POST','/api/teams',(c)=>{if(!mustUser(c))return;const b=c.body,seats=Number(b.seats);if(!String(b.name||'').trim()||!Number.isInteger(seats)||seats<1||seats>500)return err(c.res,400,'Team name and seat count (1–500) required');const r=db.prepare('INSERT INTO business_teams(owner_id,name,seats) VALUES(?,?,?)').run(c.user.id,String(b.name).slice(0,120),seats);send(c.res,201,{id:Number(r.lastInsertRowid),name:b.name,seats});});
  R('GET','/api/teams',(c)=>{if(!mustUser(c))return;send(c.res,200,db.prepare('SELECT t.id,t.name,t.seats,t.created,(SELECT COUNT(*) FROM team_members m WHERE m.team_id=t.id AND m.status<>\'removed\') members FROM business_teams t WHERE owner_id=? ORDER BY id DESC').all(c.user.id));});
  R('POST','/api/teams/:id/invite',(c,id)=>{if(!mustUser(c))return;const t=db.prepare('SELECT * FROM business_teams WHERE id=? AND owner_id=?').get(Number(id),c.user.id);if(!t)return err(c.res,404,'Team not found');const email=String(c.body.email||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return err(c.res,400,'Valid email required');const count=db.prepare("SELECT COUNT(*) n FROM team_members WHERE team_id=? AND status<>'removed'").get(t.id).n;if(count>=t.seats)return err(c.res,409,'All team seats are in use');db.prepare('INSERT INTO team_members(team_id,email) VALUES(?,?) ON CONFLICT(team_id,email) DO UPDATE SET status=\'invited\'').run(t.id,email);send(c.res,201,{ok:true,email,status:'invited'});});
  R('POST','/api/ai-tutor',(c)=>{if(!mustUser(c))return;const q=String(c.body.question||'').trim();if(!q||q.length>2000)return err(c.res,400,'Ask a question (maximum 2,000 characters)');const course=c.body.course_id?db.prepare('SELECT title,summary FROM courses WHERE id=?').get(Number(c.body.course_id)):null;const configured=Boolean(env.OPENAI_API_KEY);if(!configured)return send(c.res,200,{mode:'guided',message:`AI tutor is not connected yet, so this is a study guide rather than a generated AI answer.\n\nYour question: ${q}\n\nTry this learning sequence:\n1. Identify the key concept in ${course?course.title:'your current lesson'}.\n2. Write what you already understand and where you are stuck.\n3. Build a tiny example and test one change at a time.\n4. Explain the result in your own words.\n\n${course?`Course context: ${course.summary||course.title}`:'Tip: include the lesson title and a short example for more focused help.'}\n\nNever paste passwords, payment details or private student information here.`});return send(c.res,501,{error:'AI provider adapter is not configured. Do not expose API keys in the browser.'});});
  R('GET','/api/admin/analytics',admin((c)=>send(c.res,200,{students:db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n,enrollments:db.prepare('SELECT COUNT(*) n FROM enrollments').get().n,successful_payments:db.prepare("SELECT COUNT(*) n FROM payments WHERE status='successful'").get().n,revenue_kes:db.prepare("SELECT COALESCE(SUM(amount_kes),0) n FROM payments WHERE status='successful'").get().n,completed_lessons:db.prepare('SELECT COUNT(*) n FROM progress').get().n,certificates:db.prepare('SELECT COUNT(*) n FROM certificates').get().n,open_tickets:db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE status<>'resolved'").get().n,course_completion:db.prepare('SELECT c.title,COUNT(DISTINCT e.user_id) enrolled,COUNT(DISTINCT CASE WHEN x.done=(SELECT COUNT(*) FROM lessons WHERE course_id=c.id) AND x.done>0 THEN x.user_id END) completed FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id LEFT JOIN (SELECT p.user_id,l.course_id,COUNT(*) done FROM progress p JOIN lessons l ON l.id=p.lesson_id GROUP BY p.user_id,l.course_id) x ON x.user_id=e.user_id AND x.course_id=c.id GROUP BY c.id ORDER BY c.title').all()})));
  R('POST','/api/admin/certificates/:code/revoke',admin((c,code)=>{const cert=db.prepare('SELECT code FROM certificates WHERE code=?').get(code);if(!cert)return err(c.res,404,'Certificate not found');const reason=String(c.body.reason||'Admin revocation').slice(0,500);db.prepare('INSERT INTO certificate_status(code,status,reason) VALUES(?,\'revoked\',?) ON CONFLICT(code) DO UPDATE SET status=\'revoked\',reason=excluded.reason,updated=CURRENT_TIMESTAMP').run(code,reason);db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?)').run(c.user.id,'certificate.revoke',code,reason);send(c.res,200,{ok:true,code,status:'revoked'});}));
  R('GET','/api/admin/audit-log',admin((c)=>send(c.res,200,db.prepare('SELECT a.id,a.action,a.target,a.detail,a.created,u.name actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 500').all())));

  R('GET','/api/achievements',(c)=>{if(!mustUser(c))return;const completed=db.prepare('SELECT COUNT(*) n FROM progress WHERE user_id=?').get(c.user.id).n;const courses=db.prepare('SELECT COUNT(*) n FROM certificates WHERE user_id=?').get(c.user.id).n;const projects=db.prepare('SELECT COUNT(*) n FROM portfolio_projects WHERE user_id=?').get(c.user.id).n;const streak=db.prepare("SELECT COUNT(DISTINCT date(done_at)) n FROM progress WHERE user_id=? AND date(done_at)>=date('now','-6 days')").get(c.user.id).n;const badges=[];if(completed>=1)badges.push({key:'first-step',title:'First Step',description:'Completed your first lesson'});if(completed>=5)badges.push({key:'practice-five',title:'Practice Builder',description:'Completed five lessons'});if(courses>=1)badges.push({key:'course-finish',title:'Course Finisher',description:'Earned a completion certificate'});if(projects>=1)badges.push({key:'show-your-work',title:'Show Your Work',description:'Added a portfolio project'});if(streak>=3)badges.push({key:'consistent',title:'Consistent Learner',description:'Studied on three different days in the last week'});send(c.res,200,{completed_lessons:completed,certificates:courses,projects,study_days_last_7:streak,badges});});
  R('GET','/api/referral',(c)=>{if(!mustUser(c))return;let row=db.prepare('SELECT code FROM referrals WHERE referrer_id=?').get(c.user.id);if(!row){const code='SF'+crypto.randomBytes(5).toString('hex').toUpperCase();db.prepare('INSERT INTO referrals(referrer_id,code) VALUES(?,?)').run(c.user.id,code);row={code};}send(c.res,200,{code,share_message:`Join me on SkillForge Academy. Use referral code ${row.code} when contacting support. Referral rewards are not enabled yet.`});});
  R('POST','/api/admin/coupons',admin((c)=>{const b=c.body,code=String(b.code||'').trim().toUpperCase(),pct=Number(b.percent_off),max=Number(b.max_uses||100);if(!/^[A-Z0-9_-]{3,32}$/.test(code)||!Number.isInteger(pct)||pct<1||pct>90||!Number.isInteger(max)||max<1)return err(c.res,400,'Use a 3–32 character code, 1–90% discount and positive use limit');db.prepare('INSERT INTO coupons(code,percent_off,max_uses,expires,active) VALUES(?,?,?,?,1)').run(code,pct,max,b.expires||null);db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?)').run(c.user.id,'coupon.create',code,`${pct}% discount; max ${max}`);send(c.res,201,{code,percent_off:pct,max_uses:max});}));
  R('POST','/api/coupons/validate',(c)=>{const code=String(c.body.code||'').trim().toUpperCase();const x=db.prepare("SELECT code,percent_off,max_uses,uses,expires FROM coupons WHERE code=? AND active=1").get(code);if(!x||x.uses>=x.max_uses||(x.expires&&x.expires<new Date().toISOString().slice(0,10)))return err(c.res,404,'Coupon is invalid, expired or fully used');send(c.res,200,{valid:true,code:x.code,percent_off:x.percent_off});});


  // Adaptive learning: recommendations are calculated from the learner's own quiz history.
  R('POST','/api/skill-assessment',(c)=>{if(!mustUser(c))return;const courseId=Number(c.body.course_id),answers=c.body.answers;if(!Number.isInteger(courseId)||!Array.isArray(answers)||!db.prepare('SELECT id FROM courses WHERE id=? AND published=1').get(courseId))return err(c.res,400,'A published course and answer array are required');const qs=db.prepare('SELECT q.id,q.answer,l.id lesson_id FROM quizzes q JOIN lessons l ON l.id=q.lesson_id WHERE l.course_id=? ORDER BY l.pos,q.id LIMIT 30').all(courseId);if(!qs.length)return err(c.res,409,'This course has no assessment questions yet');let score=0;const submitted=new Map(answers.map(a=>[Number(a.question_id),Number(a.answer)]));for(const q of qs)if(submitted.get(q.id)===q.answer)score++;const pct=Math.round(score/qs.length*100),level=pct<40?'foundation':pct<75?'developing':'ready';db.prepare('INSERT INTO skill_assessments(user_id,course_id,score,total,level,answers) VALUES(?,?,?,?,?,?)').run(c.user.id,courseId,score,qs.length,level,JSON.stringify([...submitted.entries()]));send(c.res,200,{score,total:qs.length,percent:pct,level,recommendation:level==='foundation'?'Start with the first lessons and repeat the guided examples.':level==='developing'?'Review missed topics and complete a small practice project before advancing.':'You appear ready for the course projects; complete a capstone to demonstrate the skill.'});});
  R('GET','/api/learning-path',(c)=>{if(!mustUser(c))return;const courses=db.prepare('SELECT c.id,c.title,c.summary,c.price_kes,(SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) lessons,(SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE l.course_id=c.id AND p.user_id=?) completed,(SELECT level FROM skill_assessments a WHERE a.course_id=c.id AND a.user_id=? ORDER BY a.id DESC LIMIT 1) level FROM courses c WHERE c.published=1 ORDER BY c.title').all(c.user.id,c.user.id);send(c.res,200,{courses:courses.map(x=>({...x,progress_percent:x.lessons?Math.round(x.completed/x.lessons*100):0,next_step:x.level==='foundation'?'Review fundamentals':x.level==='developing'?'Practise missed topics':x.level==='ready'?'Build the capstone':'Take a short skills assessment'}))});});

  // Mentorship clinics are only visible when an administrator publishes real sessions.
  R('GET','/api/mentor-clinics',(c)=>{if(!mustUser(c))return;send(c.res,200,db.prepare("SELECT m.id,m.title,m.mentor_name,m.description,m.starts_at,m.capacity,m.status,(SELECT COUNT(*) FROM clinic_bookings b WHERE b.clinic_id=m.id AND b.status='booked') booked,(SELECT status FROM clinic_bookings b WHERE b.clinic_id=m.id AND b.user_id=?) my_booking FROM mentor_clinics m WHERE m.status='open' AND m.starts_at>=datetime('now') ORDER BY m.starts_at").all(c.user.id));});
  R('POST','/api/mentor-clinics/:id/book',(c,id)=>{if(!mustUser(c))return;const m=db.prepare("SELECT * FROM mentor_clinics WHERE id=? AND status='open' AND starts_at>=datetime('now')").get(Number(id));if(!m)return err(c.res,404,'Clinic is not available');const count=db.prepare("SELECT COUNT(*) n FROM clinic_bookings WHERE clinic_id=? AND status='booked'").get(m.id).n;if(count>=m.capacity)return err(c.res,409,'Clinic is full');try{db.prepare("INSERT INTO clinic_bookings(clinic_id,user_id) VALUES(?,?)").run(m.id,c.user.id)}catch{return err(c.res,409,'You already have a booking')};send(c.res,201,{ok:true,status:'booked'});});
  R('DELETE','/api/mentor-clinics/:id/book',(c,id)=>{if(!mustUser(c))return;const r=db.prepare("UPDATE clinic_bookings SET status='cancelled' WHERE clinic_id=? AND user_id=? AND status='booked'").run(Number(id),c.user.id);r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Active booking not found');});
  R('POST','/api/admin/mentor-clinics',admin((c)=>{const b=c.body,capacity=Number(b.capacity);if(!String(b.title||'').trim()||!String(b.mentor_name||'').trim()||!String(b.description||'').trim()||!b.starts_at||!Number.isInteger(capacity)||capacity<1||capacity>500||!Number.isFinite(Date.parse(b.starts_at)))return err(c.res,400,'Valid title, mentor, description, date and capacity required');const r=db.prepare('INSERT INTO mentor_clinics(title,mentor_name,description,starts_at,capacity,created_by) VALUES(?,?,?,?,?,?)').run(String(b.title).slice(0,160),String(b.mentor_name).slice(0,120),String(b.description).slice(0,2000),new Date(b.starts_at).toISOString(),capacity,c.user.id);send(c.res,201,{id:Number(r.lastInsertRowid)});}));
  R('GET','/api/admin/mentor-clinics',admin((c)=>send(c.res,200,db.prepare('SELECT m.*,(SELECT COUNT(*) FROM clinic_bookings b WHERE b.clinic_id=m.id AND b.status=\'booked\') booked FROM mentor_clinics m ORDER BY starts_at DESC').all())));

  // Scholarships have a review trail; an application never automatically promises funding.
  R('POST','/api/scholarships/applications',(c)=>{if(!mustUser(c))return;const reason=String(c.body.reason||'').trim();if(reason.length<30||reason.length>3000)return err(c.res,400,'Explain your circumstances in 30–3,000 characters');const existing=db.prepare("SELECT id FROM scholarship_applications WHERE user_id=? AND status='pending'").get(c.user.id);if(existing)return err(c.res,409,'You already have a pending application');const r=db.prepare('INSERT INTO scholarship_applications(user_id,reason) VALUES(?,?)').run(c.user.id,reason);send(c.res,201,{id:Number(r.lastInsertRowid),status:'pending',message:'Application received; funding is not guaranteed.'});});
  R('GET','/api/scholarships/applications', (c)=>{if(!mustUser(c))return;send(c.res,200,c.user.role==='admin'?db.prepare('SELECT s.id,s.user_id,u.name,u.email,s.reason,s.status,s.admin_note,s.created,s.reviewed FROM scholarship_applications s JOIN users u ON u.id=s.user_id ORDER BY s.created DESC').all():db.prepare('SELECT id,reason,status,admin_note,created,reviewed FROM scholarship_applications WHERE user_id=? ORDER BY created DESC').all(c.user.id));});
  R('PUT','/api/admin/scholarships/:id',admin((c,id)=>{const status=c.body.status,note=String(c.body.admin_note||'').slice(0,1500);if(!['approved','declined'].includes(status))return err(c.res,400,'Status must be approved or declined');const r=db.prepare('UPDATE scholarship_applications SET status=?,admin_note=?,reviewed=CURRENT_TIMESTAMP WHERE id=? AND status=\'pending\'').run(status,note,Number(id));if(!r.changes)return err(c.res,404,'Pending application not found');db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?,?)'.replace('VALUES(?,?,?,?,?)','VALUES(?,?,?,?)')).run(c.user.id,'scholarship.review',String(id),status);send(c.res,200,{ok:true,status});}));

  // Genuine partner challenges only; no seeded fake opportunities.
  R('GET','/api/business-challenges',(c)=>{if(!mustUser(c))return;send(c.res,200,db.prepare("SELECT b.id,b.title,b.organization,b.description,b.skills,b.deadline,b.created,(SELECT status FROM challenge_applications a WHERE a.challenge_id=b.id AND a.user_id=?) my_status FROM business_challenges b WHERE b.status='open' AND (b.deadline IS NULL OR b.deadline>=date('now')) ORDER BY b.created DESC").all(c.user.id));});
  R('POST','/api/admin/business-challenges',admin((c)=>{const b=c.body;if(!String(b.title||'').trim()||!String(b.organization||'').trim()||!String(b.description||'').trim())return err(c.res,400,'Title, organization and description required');const r=db.prepare('INSERT INTO business_challenges(title,organization,description,skills,deadline,created_by) VALUES(?,?,?,?,?,?)').run(String(b.title).slice(0,160),String(b.organization).slice(0,160),String(b.description).slice(0,3000),String(b.skills||'').slice(0,300),b.deadline||null,c.user.id);db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?)').run(c.user.id,'challenge.create',String(r.lastInsertRowid),String(b.title));send(c.res,201,{id:Number(r.lastInsertRowid)});}));
  R('POST','/api/business-challenges/:id/apply',(c,id)=>{if(!mustUser(c))return;const challenge=db.prepare("SELECT id FROM business_challenges WHERE id=? AND status='open' AND (deadline IS NULL OR deadline>=date('now'))").get(Number(id));if(!challenge)return err(c.res,404,'Challenge is not open');const message=String(c.body.message||'').trim();if(message.length<20||message.length>2000)return err(c.res,400,'Add a 20–2,000 character introduction');try{db.prepare('INSERT INTO challenge_applications(challenge_id,user_id,message) VALUES(?,?,?)').run(Number(id),c.user.id,message)}catch{return err(c.res,409,'You already applied')};send(c.res,201,{ok:true,status:'submitted'});});
  R('GET','/api/admin/challenge-applications',admin((c)=>send(c.res,200,db.prepare('SELECT a.id,a.challenge_id,a.user_id,a.message,a.status,a.created,u.name,u.email,b.title challenge FROM challenge_applications a JOIN users u ON u.id=a.user_id JOIN business_challenges b ON b.id=a.challenge_id ORDER BY a.created DESC').all())));
  R('PUT','/api/admin/challenge-applications/:id',admin((c,id)=>{const status=c.body.status;if(!['shortlisted','declined'].includes(status))return err(c.res,400,'Status must be shortlisted or declined');const r=db.prepare('UPDATE challenge_applications SET status=? WHERE id=?').run(status,Number(id));r.changes?send(c.res,200,{ok:true}):err(c.res,404,'Application not found');}));

  // Safety reporting for community posts, opportunities and other user-generated content.
  R('POST','/api/reports',(c)=>{if(!mustUser(c))return;const b=c.body,type=String(b.target_type||''),id=Number(b.target_id),reason=String(b.reason||'').trim();if(!['discussion','opportunity','portfolio','review','challenge'].includes(type)||!Number.isInteger(id)||id<1||reason.length<10||reason.length>1500)return err(c.res,400,'Valid target type/id and a 10–1,500 character reason required');const r=db.prepare('INSERT INTO abuse_reports(reporter_id,target_type,target_id,reason) VALUES(?,?,?,?)').run(c.user.id,type,id,reason);send(c.res,201,{id:Number(r.lastInsertRowid),status:'open'});});
  R('GET','/api/admin/reports',admin((c)=>send(c.res,200,db.prepare('SELECT r.id,r.reporter_id,u.name reporter,r.target_type,r.target_id,r.reason,r.status,r.admin_note,r.created,r.reviewed FROM abuse_reports r JOIN users u ON u.id=r.reporter_id ORDER BY r.created DESC').all())));
  R('PUT','/api/admin/reports/:id',admin((c,id)=>{const status=c.body.status,note=String(c.body.admin_note||'').slice(0,1500);if(!['reviewing','resolved','dismissed'].includes(status))return err(c.res,400,'Invalid report status');const r=db.prepare('UPDATE abuse_reports SET status=?,admin_note=?,reviewed=CURRENT_TIMESTAMP WHERE id=?').run(status,note,Number(id));if(!r.changes)return err(c.res,404,'Report not found');db.prepare('INSERT INTO audit_log(actor_id,action,target,detail) VALUES(?,?,?,?)').run(c.user.id,'report.review',String(id),status);send(c.res,200,{ok:true,status});}));

  R('GET','/api/admin/quality-report',admin((c)=>{const since="datetime('now','-30 days')";send(c.res,200,{generated_at:new Date().toISOString(),period_days:30,students:db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n,new_students_30d:db.prepare(`SELECT COUNT(*) n FROM users WHERE role='student' AND created>=${since}`).get().n,enrollments:db.prepare('SELECT COUNT(*) n FROM enrollments').get().n,active_learners_30d:db.prepare(`SELECT COUNT(DISTINCT user_id) n FROM progress WHERE done_at>=${since}`).get().n,lesson_completions_30d:db.prepare(`SELECT COUNT(*) n FROM progress WHERE done_at>=${since}`).get().n,quiz_attempts_30d:db.prepare(`SELECT COUNT(*) n FROM quiz_attempts WHERE created>=${since}`).get().n,average_quiz_percent:db.prepare('SELECT ROUND(AVG(100.0*score/NULLIF(total,0)),1) n FROM quiz_attempts').get().n,refunds:db.prepare("SELECT COUNT(*) n FROM payments WHERE status='refunded'").get().n,open_support_tickets:db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE status<>'resolved'").get().n,open_safety_reports:db.prepare("SELECT COUNT(*) n FROM abuse_reports WHERE status IN('open','reviewing')").get().n,scholarships_pending:db.prepare("SELECT COUNT(*) n FROM scholarship_applications WHERE status='pending'").get().n,clinics_upcoming:db.prepare("SELECT COUNT(*) n FROM mentor_clinics WHERE status='open' AND starts_at>=datetime('now')").get().n});}));

  R('GET','/api/admin/backup-info',admin((c)=>send(c.res,200,{database_configured:!!(env.DB_FILE||'./data/skillforge.db'),backup_command:'npm run backup',note:'Run the backup command on the persistent host and copy the resulting file to secure off-site storage. Test restoration before production.'})));



  const pub = path.join(__dirname, '..', 'public');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (!url.pathname.startsWith('/api') && url.pathname !== '/health' && req.method === 'GET') {
        const f = path.join(pub, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
        if (!f.startsWith(pub) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'" });
        return fs.createReadStream(f).pipe(res);
      }
      const raw = req.method === 'GET' ? '' : await readBody(req);
      const isHook = url.pathname === '/api/webhooks/payment';
      if (req.method !== 'GET' && !isHook && !(req.headers['content-type'] || '').includes('application/json')) return err(res, 415, 'JSON required');
      let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { return err(res, 400, 'Invalid JSON'); }
      for (const [m, re, fn] of routes) { const mt = re.exec(url.pathname); if (m === req.method && mt) return fn({ req, res, body, raw, user: userOf(req), ip: req.socket.remoteAddress }, ...mt.slice(1)); }
      err(res, 404, 'Not found');
    } catch (e) { console.error('error:', e.message); err(res, 500, 'Internal error'); }
  });
  return { server, db };
}
module.exports = { createApp };
if (require.main === module) createApp().server.listen(process.env.PORT || 3000, () => console.log('SkillForge Academy on port ' + (process.env.PORT || 3000)));
