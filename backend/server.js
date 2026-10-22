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


  const pub = path.join(__dirname, '..', 'public');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (!url.pathname.startsWith('/api') && url.pathname !== '/health' && req.method === 'GET') {
        const f = path.join(pub, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
        if (!f.startsWith(pub) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'" });
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
