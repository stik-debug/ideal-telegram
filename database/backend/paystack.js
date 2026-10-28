'use strict';
// Paystack payments (cards, mobile money where enabled). Server-side only — never expose the secret key.
// Required env: PAYSTACK_SECRET_KEY, PUBLIC_URL (https for live)
// Optional: PAYSTACK_PUBLIC_KEY (returned to browser for inline JS if you add it later)

function create(env, fetchImpl) {
  const f = fetchImpl || env.fetch || globalThis.fetch;
  const secret = env.PAYSTACK_SECRET_KEY || '';
  const configured = !!(secret && /^https:\/\//.test(env.PUBLIC_URL || ''));
  const base = 'https://api.paystack.co';

  const timeoutFetch = async (url, opt) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);
    try { return await f(url, { ...opt, signal: ac.signal }); }
    finally { clearTimeout(t); }
  };

  async function initialize({ email, amountKes, ref, callbackUrl, metadata }) {
    if (!configured) throw new Error('Paystack is not configured');
    // Paystack amounts are in the subunit of the currency. For KES Paystack uses kobo-style *100.
    const amount = Math.round(Number(amountKes) * 100);
    if (!Number.isFinite(amount) || amount < 100) throw new Error('Invalid amount');
    const body = {
      email,
      amount,
      currency: 'KES',
      reference: ref,
      callback_url: callbackUrl,
      metadata: metadata || {},
    };
    const r = await timeoutFetch(base + '/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.status) {
      throw new Error((j && j.message) || ('Paystack initialize failed (' + r.status + ')'));
    }
    return {
      authorizationUrl: j.data.authorization_url,
      accessCode: j.data.access_code,
      reference: j.data.reference,
    };
  }

  async function verify(reference) {
    if (!configured) throw new Error('Paystack is not configured');
    const r = await timeoutFetch(base + '/transaction/verify/' + encodeURIComponent(reference), {
      headers: { Authorization: 'Bearer ' + secret },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.status) {
      throw new Error((j && j.message) || 'Paystack verify failed');
    }
    return j.data;
  }

  /** Validate Paystack webhook signature (x-paystack-signature = HMAC SHA512 of raw body). */
  function verifyWebhookSignature(rawBody, signatureHeader) {
    if (!secret || !signatureHeader) return false;
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(signatureHeader)));
    } catch {
      return false;
    }
  }

  return {
    configured,
    publicKey: env.PAYSTACK_PUBLIC_KEY || '',
    initialize,
    verify,
    verifyWebhookSignature,
  };
}

module.exports = { create };
