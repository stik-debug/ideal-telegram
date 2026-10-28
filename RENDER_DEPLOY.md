# Deploy Skillora on Render (fixed)

## Why the old zip failed
1. **Node version** — this app needs **Node 22.5+** (`node:sqlite`). Render often defaults to Node 18/20.
2. **Zip folder layout** — `package.json` must be at the **repo root**, not inside a subfolder.
3. **`DB_FILE=/var/data/...`** — that path only works with a paid persistent disk.

## Correct Render settings

| Setting | Value |
|---------|--------|
| **Runtime** | Node |
| **Root directory** | leave **empty** (repo root) |
| **Build command** | `echo ok` (or leave blank) |
| **Start command** | `npm start` |
| **Node version** | **22.14.0** (set env `NODE_VERSION=22.14.0`) |

### Environment variables

```text
NODE_VERSION=22.14.0
DB_FILE=./data/skillora.db
COOKIE_SECURE=true
PUBLIC_URL=https://YOUR-APP.onrender.com
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
OWNER_EMAIL=you@example.com
OWNER_PASSWORD=at-least-10-characters
OWNER_NAME=Your Name
```

## Deploy steps
1. Unzip so that `package.json` is visible at the top level.
2. Push that folder to a GitHub repo (files at root, not nested).
3. Render → New → Web Service → connect repo.
4. Use the settings table above.
5. Add env vars → Create Web Service.

## If logs show an error
- `Cannot find module 'node:sqlite'` → Node is too old → set `NODE_VERSION=22.14.0` and redeploy.
- `Cannot create or write database folder` → set `DB_FILE=./data/skillora.db`.
- `npm ERR!` / missing package.json → Root Directory is wrong; clear it.

## After it is live
1. Open `https://YOUR-APP.onrender.com`
2. Sign in with `OWNER_EMAIL` / `OWNER_PASSWORD`
3. Control Center → Database & payments → Paystack should say Ready
4. Paystack webhook: `https://YOUR-APP.onrender.com/api/webhooks/paystack`
'''
