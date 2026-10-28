# Persistence, accounts & payments — Skillora

## Why accounts looked “lost”
The app has always used **SQLite** (`DB_FILE`, default `./data/skillforge.db`).  
On many hosts (Render, Railway, Fly free tiers, etc.) the filesystem is **ephemeral**: every redeploy wipes `./data`.

### Fix (required for production)
1. Attach a **persistent volume**.
2. Set environment variable:
   ```bash
   DB_FILE=/var/data/skillora.db
   ```
3. Keep `COOKIE_SECURE=true` and `PUBLIC_URL=https://your-domain` when live.

## What we added
- **WAL mode** + busy timeout for safer concurrent writes
- **Soft-delete accounts** (`deleted_at`): learners can close an account; email is freed; learning rows stay until an admin **purges**
- **GET `/api/account/export`** — JSON download of the learner’s data
- **POST `/api/account/delete`** — password-confirmed close
- **Admin**: list closed accounts, restore (new email), permanent purge, **one-click backup**
- **Paystack** alongside **M-Pesa STK** (card / alternative checkout)

## Payment APIs

### M-Pesa (Safaricom Daraja)
Set: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_SECRET`, `PUBLIC_URL` (https).

Checkout: `POST /api/checkout` with `{ courseId, provider: "mpesa", phone: "0712345678" }`.

### Paystack
Set: `PAYSTACK_SECRET_KEY`, optional `PAYSTACK_PUBLIC_KEY`, `PUBLIC_URL` (https).

Checkout: `POST /api/checkout` with `{ courseId, provider: "paystack" }`  
→ returns `authorization_url`. After payment, Paystack calls  
`POST /api/webhooks/paystack` (configure this URL in the Paystack dashboard).  
Learners can also `POST /api/payments/paystack/verify` with `{ ref }` after redirect.

Access is granted **only** after a verified webhook (or successful verify). Pending payments never unlock courses.

## Control Center
Sign in as admin → **Control Center** (or `/admin`, Alt+Shift+A).

New panels:
- **Closed accounts** — restore / purge
- **Database & payments** — provider status + run backup

## Frontend polish (this release)
- Course **skeleton loaders**
- **Command palette** — `Ctrl+K` / `Cmd+K`
- **Certificate share** helpers (Web Share, copy link, LinkedIn)
'''
