# Skillora Academy — complete setup

## Render
| Setting | Value |
|---------|--------|
| NODE_VERSION | 22.14.0 |
| Build | `echo ok` |
| Start | `npm start` |
| Root Directory | empty |

## Required env
```text
NODE_VERSION=22.14.0
DB_FILE=/var/data/skillora.db
COOKIE_SECURE=true
PUBLIC_URL=https://YOUR-APP.onrender.com
OWNER_EMAIL=you@example.com
OWNER_PASSWORD=at-least-10-characters
OWNER_NAME=Your Name
PAYSTACK_SECRET_KEY=sk_...
PAYSTACK_PUBLIC_KEY=pk_...
```

## Persistent disk
Mount `/var/data` → `DB_FILE=/var/data/skillora.db`

## Email (recommended)
```text
RESEND_API_KEY=re_...
MAIL_FROM=Skillora Academy <you@yourdomain.com>
ALERT_EMAIL=you@example.com
```
Without Resend, emails log to the server console (password reset links appear in logs).

## Paystack webhook
```text
https://YOUR-APP.onrender.com/api/webhooks/paystack
```

## Features included
- Paid courses + Paystack / M-Pesa
- **No refunds** (payment policy page)
- Welcome, payment receipt, certificate, password-reset emails
- Password forgot / reset
- Privacy, Terms, Payment policy, Contact
- Owner revenue dashboard + CSV export
- Database backup download
- Continue learning + progress %
- Course reviews (1–5 stars)
- Referral invite links
- Homepage testimonials
- YouTube video embeds in lessons
- Certificates (Stive Willman signature)
- Control Center
