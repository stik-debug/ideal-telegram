'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mail = require('./mail');
const { hash } = require('./auth');

function migrateGrowth(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets(
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      exp INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS course_reviews(
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      body TEXT NOT NULL DEFAULT '',
      created TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS testimonials(
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      created TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS referral_codes(
      user_id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      created TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS referral_hits(
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL,
      referred_user_id INTEGER,
      created TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // seed testimonials if empty
  const n = db.prepare('SELECT COUNT(*) n FROM testimonials').get().n;
  if (!n) {
    const ins = db.prepare('INSERT INTO testimonials(name,role,quote,published) VALUES(?,?,?,1)');
    ins.run('Amina K.', 'Freelance designer', 'The free preview convinced me. I finished the course and landed my first paid client within a month.');
    ins.run('Brian O.', 'Operations assistant', 'Clear lessons and a real certificate I could show my manager. Worth every shilling.');
    ins.run('Faith W.', 'Career switcher', 'I studied on my phone after work. Progress tracking kept me consistent until I completed the course.');
  }
}

function ensureReferralCode(db, userId) {
  let row = db.prepare('SELECT code FROM referral_codes WHERE user_id=?').get(userId);
  if (row) return row.code;
  const code = 'SF' + crypto.randomBytes(4).toString('hex').toUpperCase();
  try { db.prepare('INSERT INTO referral_codes(user_id,code) VALUES(?,?)').run(userId, code); }
  catch { return ensureReferralCode(db, userId); }
  return code;
}

function registerGrowth({ R, db, send, err, mustUser, admin, env, audit }) {
  migrateGrowth(db);
  const publicUrl = () => String(env.PUBLIC_URL || '').replace(/\/$/, '');

  // ---- Password reset ----
  R('POST', '/api/password/forgot', async (c) => {
    const email = String(c.body.email || '').trim().toLowerCase();
    // Always same message (no account enumeration)
    const okMsg = { ok: true, message: 'If that email exists, a reset link was sent.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(c.res, 200, okMsg);
    const user = db.prepare('SELECT id,email,name FROM users WHERE email=? AND deleted_at IS NULL').get(email);
    if (!user) return send(c.res, 200, okMsg);
    const token = crypto.randomBytes(24).toString('hex');
    const exp = Date.now() + 3600e3;
    db.prepare('DELETE FROM password_resets WHERE user_id=?').run(user.id);
    db.prepare('INSERT INTO password_resets(token,user_id,exp) VALUES(?,?,?)').run(token, user.id, exp);
    const link = `${publicUrl()}/?reset=${token}`;
    await mail.passwordReset(env, user, link);
    send(c.res, 200, okMsg);
  });

  R('POST', '/api/password/reset', (c) => {
    const token = String(c.body.token || '');
    const password = String(c.body.password || '');
    if (password.length < 10) return err(c.res, 400, 'Password must be at least 10 characters.');
    const row = db.prepare('SELECT * FROM password_resets WHERE token=? AND used=0').get(token);
    if (!row || row.exp < Date.now()) return err(c.res, 400, 'Reset link is invalid or expired.');
    db.prepare('UPDATE users SET pass_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash(password), row.user_id);
    db.prepare('UPDATE password_resets SET used=1 WHERE token=?').run(token);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
    send(c.res, 200, { ok: true, message: 'Password updated. Sign in with your new password.' });
  });

  // ---- Course reviews ----
  R('GET', '/api/courses/:slug/reviews', (c, slug) => {
    const co = db.prepare('SELECT id FROM courses WHERE slug=? AND published=1').get(slug);
    if (!co) return err(c.res, 404, 'Course not found');
    const rows = db.prepare(`SELECT r.rating,r.body,r.created,u.name FROM course_reviews r JOIN users u ON u.id=r.user_id WHERE r.course_id=? ORDER BY r.id DESC LIMIT 50`).all(co.id);
    const agg = db.prepare('SELECT COUNT(*) n, AVG(rating) avg FROM course_reviews WHERE course_id=?').get(co.id);
    send(c.res, 200, { count: agg.n || 0, average: agg.avg ? Math.round(agg.avg * 10) / 10 : 0, reviews: rows });
  });

  R('POST', '/api/courses/:slug/reviews', (c, slug) => {
    if (!mustUser(c)) return;
    const co = db.prepare('SELECT id FROM courses WHERE slug=? AND published=1').get(slug);
    if (!co) return err(c.res, 404, 'Course not found');
    const enrolled = db.prepare('SELECT 1 x FROM enrollments WHERE user_id=? AND course_id=?').get(c.user.id, co.id);
    if (!enrolled) return err(c.res, 403, 'Enrol in the course before reviewing.');
    const rating = Number(c.body.rating);
    const body = String(c.body.body || '').trim().slice(0, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return err(c.res, 400, 'Rating must be 1–5.');
    db.prepare(`INSERT INTO course_reviews(user_id,course_id,rating,body) VALUES(?,?,?,?)
      ON CONFLICT(user_id,course_id) DO UPDATE SET rating=excluded.rating, body=excluded.body, created=CURRENT_TIMESTAMP`)
      .run(c.user.id, co.id, rating, body);
    send(c.res, 200, { ok: true });
  });

  // ---- Testimonials (public) ----
  R('GET', '/api/testimonials', (c) => {
    send(c.res, 200, db.prepare('SELECT name,role,quote FROM testimonials WHERE published=1 ORDER BY id DESC LIMIT 12').all());
  });

  // ---- Referral ----
  R('GET', '/api/referral/me', (c) => {
    if (!mustUser(c)) return;
    const code = ensureReferralCode(db, c.user.id);
    const hits = db.prepare('SELECT COUNT(*) n FROM referral_hits WHERE code=?').get(code).n;
    const joined = db.prepare('SELECT COUNT(*) n FROM referral_hits WHERE code=? AND referred_user_id IS NOT NULL').get(code).n;
    send(c.res, 200, {
      code,
      link: `${publicUrl()}/?ref=${code}`,
      clicks: hits,
      signups: joined,
      reward_note: 'Share your link. When friends join, they are attributed to you.',
    });
  });

  R('POST', '/api/referral/hit', (c) => {
    const code = String(c.body.code || '').trim().toUpperCase();
    if (!code) return err(c.res, 400, 'Missing code');
    const exists = db.prepare('SELECT 1 x FROM referral_codes WHERE code=?').get(code);
    if (!exists) return send(c.res, 200, { ok: true });
    db.prepare('INSERT INTO referral_hits(code) VALUES(?)').run(code);
    send(c.res, 200, { ok: true });
  });

  // ---- Continue learning / progress ----
  R('GET', '/api/me/continue', (c) => {
    if (!mustUser(c)) return;
    const rows = db.prepare(`
      SELECT c.id,c.slug,c.title,c.price_kes,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) total,
        (SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=c.id) done,
        (SELECT l.id FROM lessons l WHERE l.course_id=c.id AND l.id NOT IN (SELECT lesson_id FROM progress WHERE user_id=?) ORDER BY l.pos LIMIT 1) next_lesson_id
      FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.user_id=? AND c.published=1
      ORDER BY e.created DESC LIMIT 12
    `).all(c.user.id, c.user.id, c.user.id);
    send(c.res, 200, rows.map((r) => ({
      ...r,
      percent: r.total ? Math.round((r.done / r.total) * 100) : 0,
    })));
  });

  // ---- Owner revenue ----
  R('GET', '/api/admin/revenue', admin((c) => {
    const today = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount_kes),0) kes FROM payments WHERE status='successful' AND date(created)=date('now')`).get();
    const month = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount_kes),0) kes FROM payments WHERE status='successful' AND strftime('%Y-%m',created)=strftime('%Y-%m','now')`).get();
    const pending = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount_kes),0) kes FROM payments WHERE status='pending'`).get();
    const failed = db.prepare(`SELECT COUNT(*) n FROM payments WHERE status IN ('failed','cancelled')`).get();
    const total = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount_kes),0) kes FROM payments WHERE status='successful'`).get();
    const recent = db.prepare(`SELECT p.ref,p.amount_kes,p.provider,p.status,p.created,u.email,c.title course FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id ORDER BY p.id DESC LIMIT 40`).all();
    send(c.res, 200, { today, month, pending, failed, total, recent, policy: 'All sales are final. No refunds.' });
  }));

  R('GET', '/api/admin/revenue.csv', admin((c) => {
    const rows = db.prepare(`SELECT p.ref,p.amount_kes,p.provider,p.status,p.created,u.email,c.title course FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id ORDER BY p.id DESC`).all();
    const header = 'ref,amount_kes,provider,status,created,email,course\n';
    const body = rows.map((r) => [r.ref, r.amount_kes, r.provider, r.status, r.created, r.email, JSON.stringify(r.course)].join(',')).join('\n');
    c.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="skillora-revenue.csv"',
      'Cache-Control': 'no-store',
    });
    c.res.end(header + body);
  }));

  // ---- Backup download ----
  R('GET', '/api/admin/backup/download', admin((c) => {
    const dbFile = env.DB_FILE || path.join(process.cwd(), 'data', 'skillora.db');
    if (!dbFile || dbFile === ':memory:' || !fs.existsSync(dbFile)) return err(c.res, 404, 'Database file not available for download.');
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (_) {}
    const data = fs.readFileSync(dbFile);
    const name = 'skillora-backup-' + new Date().toISOString().slice(0, 10) + '.db';
    c.res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="' + name + '"',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
    });
    c.res.end(data);
  }));

  // ---- Mail status for admin ----
  R('GET', '/api/admin/mail-status', admin((c) => {
    send(c.res, 200, {
      configured: mail.configured(env),
      provider: env.RESEND_API_KEY ? 'resend' : (env.SMTP_HOST ? 'smtp' : 'dev-log'),
      from: env.SMTP_FROM || env.MAIL_FROM || null,
    });
  }));

  // Legal content API (for SPA)
  R('GET', '/api/legal/:page', (c, page) => {
    const pages = legalPages();
    if (!pages[page]) return err(c.res, 404, 'Not found');
    send(c.res, 200, pages[page]);
  });
}

function legalPages() {
  return {
    privacy: {
      title: 'Privacy Policy',
      updated: '2026-10-29',
      html: `<p>Skillora Academy ("we") collects account data (name, email, password hash), learning progress, and payment references needed to deliver courses.</p>
<p><b>What we store:</b> account profile, enrolments, lesson progress, support messages, and payment status from Paystack/M-Pesa. We do not store full card numbers or M-Pesa PINs.</p>
<p><b>How we use data:</b> to provide access to courses, send transactional emails (receipts, password reset, certificates), improve the product, and prevent fraud.</p>
<p><b>Sharing:</b> payment processors (Paystack, M-Pesa) receive only what is required to process a payment. We do not sell personal data.</p>
<p><b>Retention:</b> account data is kept while your account is active. You may request account closure from your dashboard.</p>
<p><b>Contact:</b> use the in-app support form or the owner email published on the site.</p>`,
    },
    terms: {
      title: 'Terms of Use',
      updated: '2026-10-29',
      html: `<p>By creating an account or purchasing a course on Skillora Academy, you agree to these terms.</p>
<p><b>Accounts:</b> you must provide accurate information and keep your password secure.</p>
<p><b>Courses:</b> content is for personal learning. You may not redistribute course materials.</p>
<p><b>Payments:</b> prices are shown in Kenya Shillings unless stated otherwise. Successful payment unlocks the course for your account.</p>
<p><b>Certificates:</b> certificates confirm completion of Skillora coursework. They are not government or university accredited qualifications unless explicitly stated.</p>
<p><b>Acceptable use:</b> no abuse, fraud, scraping, or attempts to bypass payment.</p>
<p><b>Changes:</b> we may update these terms; continued use means acceptance of the latest version.</p>`,
    },
    payment: {
      title: 'Payment Policy',
      updated: '2026-10-29',
      html: `<p><b>All sales are final.</b> Skillora Academy does not offer refunds on successful course payments.</p>
<p>Please use free preview lessons to evaluate a course before you pay.</p>
<p>If a payment is deducted but access is not unlocked within a reasonable time, contact support with your payment reference so we can investigate delivery — this is not a refund process.</p>
<p>Supported methods depend on configuration: Paystack (cards) and/or M-Pesa STK Push.</p>`,
    },
    contact: {
      title: 'Contact',
      updated: '2026-10-29',
      html: `<p>For learning help, open a <b>support ticket</b> from your dashboard after signing in.</p>
<p>For account or payment delivery issues, include your registered email and payment reference.</p>
<p>We aim to respond during business hours (EAT).</p>`,
    },
  };
}

/** Attribute referral on register */
function attributeReferral(db, userId, code) {
  if (!code) return;
  const c = String(code).trim().toUpperCase();
  const owner = db.prepare('SELECT user_id FROM referral_codes WHERE code=?').get(c);
  if (!owner || owner.user_id === userId) return;
  db.prepare('INSERT INTO referral_hits(code,referred_user_id) VALUES(?,?)').run(c, userId);
}

module.exports = { registerGrowth, migrateGrowth, attributeReferral, ensureReferralCode };
