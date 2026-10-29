'use strict';
/** Transactional email via Resend API, SMTP, or dev console log. */
const crypto = require('crypto');

function wrapHtml(title, body) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f4f6f2;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e3e9e4">
    <div style="font-weight:800;color:#0a3d32;font-size:18px;margin-bottom:8px">Skillora Academy</div>
    <h1 style="font-size:20px;color:#0c1f1a;margin:0 0 12px">${title}</h1>
    <div style="color:#334;line-height:1.55;font-size:15px">${body}</div>
    <p style="margin-top:28px;font-size:12px;color:#667">Skillora Academy · All course sales are final.</p>
  </div></body></html>`;
}

function configured(env) {
  return !!(env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS));
}

async function sendMail(env, { to, subject, text, html }) {
  if (!to) return { ok: false, error: 'no recipient' };
  const from = env.SMTP_FROM || env.MAIL_FROM || 'Skillora Academy <onboarding@resend.dev>';
  const bodyHtml = html || `<pre>${String(text || '').replace(/</g, '&lt;')}</pre>`;

  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html: bodyHtml, text: text || '' }),
      });
      if (!r.ok) {
        const err = await r.text();
        console.error('[mail:resend]', r.status, err);
        return { ok: false, error: err };
      }
      return { ok: true, provider: 'resend' };
    } catch (e) {
      console.error('[mail:resend]', e.message);
      return { ok: false, error: e.message };
    }
  }

  // Dev / unconfigured: log so flows still work
  console.log('[mail:dev]', { to, subject, preview: String(text || '').slice(0, 240) });
  return { ok: true, dev: true };
}

module.exports = {
  configured,
  sendMail,
  wrapHtml,
  async welcome(env, user) {
    return sendMail(env, {
      to: user.email,
      subject: 'Welcome to Skillora Academy',
      text: `Hi ${user.name},\n\nWelcome to Skillora Academy. Sign in and start with a free preview lesson.\n${env.PUBLIC_URL || ''}\n`,
      html: wrapHtml('Welcome', `<p>Hi <b>${escapeHtml(user.name)}</b>,</p><p>Your account is ready. Pick a course and start with a free preview lesson.</p><p><a href="${env.PUBLIC_URL || '#'}">Open Skillora</a></p>`),
    });
  },
  async passwordReset(env, user, link) {
    return sendMail(env, {
      to: user.email,
      subject: 'Reset your Skillora password',
      text: `Hi ${user.name},\n\nReset link (1 hour):\n${link}\n\nIf you did not request this, ignore this email.\n`,
      html: wrapHtml('Password reset', `<p>Hi <b>${escapeHtml(user.name)}</b>,</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour.</p>`),
    });
  },
  async paymentReceipt(env, user, { ref, amount, course }) {
    return sendMail(env, {
      to: user.email,
      subject: `Payment received — ${course}`,
      text: `Hi ${user.name},\n\nReceived KSh ${amount} for "${course}".\nRef: ${ref}\nAccess is unlocked. All sales are final.\n`,
      html: wrapHtml('Payment received', `<p>Hi <b>${escapeHtml(user.name)}</b>,</p><p>We received <b>KSh ${Number(amount).toLocaleString()}</b> for <b>${escapeHtml(course)}</b>.</p><p>Reference: <code>${escapeHtml(ref)}</code></p><p>Full course access is unlocked. <b>All sales are final.</b></p>`),
    });
  },
  async certificateReady(env, user, { course, code, url }) {
    return sendMail(env, {
      to: user.email,
      subject: `Your certificate — ${course}`,
      text: `Hi ${user.name},\n\nCertificate ready for "${course}".\nCode: ${code}\n${url || ''}\n`,
      html: wrapHtml('Certificate ready', `<p>Hi <b>${escapeHtml(user.name)}</b>,</p><p>Your certificate for <b>${escapeHtml(course)}</b> is ready.</p><p>Code: <code>${escapeHtml(code)}</code></p>${url ? `<p><a href="${url}">Download PDF</a></p>` : ''}`),
    });
  },
  async alertOwner(env, subject, text) {
    const to = env.ALERT_EMAIL || env.OWNER_EMAIL;
    if (!to) return { ok: false };
    return sendMail(env, { to, subject: `[Skillora] ${subject}`, text, html: wrapHtml(subject, `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`) });
  },
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
