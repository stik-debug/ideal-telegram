# Skillora — complete setup (Render)

## 1. Keep accounts after deploy (required)

This app uses **SQLite**. Render Postgres is **not** connected.

1. Web Service → **Disks** → Add disk  
   - Mount path: `/var/data`  
   - Size: 1 GB  
2. Environment:

```text
DB_FILE=/var/data/skillora.db
COOKIE_SECURE=true
PUBLIC_URL=https://YOUR-APP.onrender.com
NODE_VERSION=22.14.0
OWNER_EMAIL=you@example.com
OWNER_PASSWORD=at-least-10-characters
OWNER_NAME=Your Name
```

Without the disk, logins reset on every deploy.

---

## 2. Paystack (card payments)

```text
PAYSTACK_SECRET_KEY=sk_live_or_test_...
PAYSTACK_PUBLIC_KEY=pk_live_or_test_...
PUBLIC_URL=https://YOUR-APP.onrender.com
```

Paystack Dashboard → Webhook URL:

```text
https://YOUR-APP.onrender.com/api/webhooks/paystack
```

**Learner flow:** Course → **Pay with card (Paystack)** → Paystack page → return → course unlocks.

---

## 3. M-Pesa (optional)

```text
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_CALLBACK_SECRET=long-random-string
PUBLIC_URL=https://YOUR-APP.onrender.com
```

Callback URL (automatic from app):

```text
https://YOUR-APP.onrender.com/api/webhooks/mpesa/YOUR_CALLBACK_SECRET
```

---

## 4. What works in the product

| Feature | Status |
|---------|--------|
| Register / login | Yes |
| Data on persistent disk | Yes if `DB_FILE=/var/data/...` |
| Free course enrol | Yes |
| Paystack card checkout | Yes when keys set |
| M-Pesa STK | Yes when Daraja keys set |
| Course lessons + quizzes | Yes |
| Certificates PDF | Yes |
| Control Center | Yes (admin) |
| Learning Hub | Yes |
| Owner bootstrap from env | Yes |

---

## 5. Render service settings

| Setting | Value |
|---------|--------|
| Build | `echo ok` |
| Start | `npm start` |
| Root Directory | empty |

---

## 6. First login after disk

Use `OWNER_EMAIL` / `OWNER_PASSWORD`.  
Open **Control Center** → Database & payments → confirm Paystack **Ready**.
'''
