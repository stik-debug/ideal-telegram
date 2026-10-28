'use strict';
// Safaricom Daraja (M-Pesa Express / STK Push) client. All calls are server-side; secrets never reach the browser.
// Required env: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_SECRET, PUBLIC_URL (https)
// Optional: MPESA_ENV=production (default sandbox), MPESA_TXN_TYPE=CustomerPayBillOnline|CustomerBuyGoodsOnline, MPESA_PARTY_B
function normalizePhone(input) {
  const d = String(input || '').replace(/[\s\-()+]/g, '');
  const m = /^(?:254|0)?([17]\d{8})$/.exec(d);
  return m ? '254' + m[1] : null;
}
function create(env, fetchImpl) {
  const f = fetchImpl || env.fetch || globalThis.fetch;
  const base = env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  const configured = !!(env.MPESA_CONSUMER_KEY && env.MPESA_CONSUMER_SECRET && env.MPESA_SHORTCODE && env.MPESA_PASSKEY && env.MPESA_CALLBACK_SECRET && /^https:\/\//.test(env.PUBLIC_URL || ''));
  let tok = null;
  const timeoutFetch = async (url, opt) => { const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000); try { return await f(url, { ...opt, signal: ac.signal }); } finally { clearTimeout(t); } };
  const token = async () => {
    if (tok && tok.exp > Date.now() + 30000) return tok.v;
    const r = await timeoutFetch(base + '/oauth/v1/generate?grant_type=client_credentials', { headers: { Authorization: 'Basic ' + Buffer.from(env.MPESA_CONSUMER_KEY + ':' + env.MPESA_CONSUMER_SECRET).toString('base64') } });
    if (!r.ok) throw new Error('M-Pesa auth failed (' + r.status + ')');
    const j = await r.json(); if (!j.access_token) throw new Error('M-Pesa auth returned no token');
    tok = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 }; return tok.v;
  };
  const stamp = () => new Date(Date.now() + 3 * 3600e3).toISOString().replace(/[-:T]/g, '').slice(0, 14); // EAT clock
  const pass = (ts) => Buffer.from(env.MPESA_SHORTCODE + env.MPESA_PASSKEY + ts).toString('base64');
  const post = async (path, body) => { const r = await timeoutFetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { ok: r.ok, j }; };
  return {
    configured, normalizePhone,
    async stkPush({ phone, amount, ref, desc }) {
      const ts = stamp();
      const { ok, j } = await post('/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: env.MPESA_SHORTCODE, Password: pass(ts), Timestamp: ts, TransactionType: env.MPESA_TXN_TYPE || 'CustomerPayBillOnline',
        Amount: Math.round(amount), PartyA: phone, PartyB: env.MPESA_PARTY_B || env.MPESA_SHORTCODE, PhoneNumber: phone,
        CallBackURL: env.PUBLIC_URL.replace(/\/$/, '') + '/api/webhooks/mpesa/' + env.MPESA_CALLBACK_SECRET,
        AccountReference: String(ref).slice(0, 12), TransactionDesc: String(desc || 'Skillora course').slice(0, 13)
      });
      if (!ok || String(j.ResponseCode) !== '0') throw Object.assign(new Error(j.errorMessage || j.ResponseDescription || 'M-Pesa request was not accepted'), { provider: j });
      return { checkoutRequestId: j.CheckoutRequestID, merchantRequestId: j.MerchantRequestID, customerMessage: j.CustomerMessage || 'Check your phone and enter your M-Pesa PIN.' };
    },
    async stkQuery(checkoutRequestId) {
      const ts = stamp();
      const { j } = await post('/mpesa/stkpushquery/v1/query', { BusinessShortCode: env.MPESA_SHORTCODE, Password: pass(ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId });
      if (j.ResultCode === undefined) return { pending: true }; // still processing / provider busy
      return { pending: false, success: Number(j.ResultCode) === 0, code: Number(j.ResultCode), desc: j.ResultDesc };
    }
  };
}
module.exports = { create, normalizePhone };
