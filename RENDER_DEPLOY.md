# Skillora on Render — deploy & keep logins

## Why accounts disappear after deploy

This app stores users in **SQLite** (a file on disk), controlled by `DB_FILE`.

| Setup | What happens |
|--------|----------------|
| `DB_FILE=./data/skillora.db` (default) | File lives on the **temporary** server disk → **wiped on redeploy** |
| Render **PostgreSQL** addon only | **Not connected** — this app does not read `DATABASE_URL` yet |
| **Persistent Disk** + `DB_FILE=/var/data/skillora.db` | File survives redeploys → **logins stay** |

Adding a Postgres database in the Render dashboard does **not** move your data there automatically.

---

## Recommended fix: Persistent Disk + SQLite

### 1. Add a disk (paid plan required)

1. [dashboard.render.com](https://dashboard.render.com) → your **Web Service**
2. Left menu → **Disks**
3. **Add Disk**
   - Name: `skillora-data`
   - **Mount path:** `/var/data`
   - Size: `1` GB
4. Save (service redeploys)

### 2. Set environment variables

```text
NODE_VERSION=22.14.0
DB_FILE=/var/data/skillora.db
COOKIE_SECURE=true
PUBLIC_URL=https://YOUR-APP.onrender.com
OWNER_EMAIL=you@example.com
OWNER_PASSWORD=your-long-password
OWNER_NAME=Your Name
PAYSTACK_SECRET_KEY=sk_...
PAYSTACK_PUBLIC_KEY=pk_...
```

### 3. Redeploy and create the owner again

After the disk is attached, the first boot creates a **new** empty database on the disk.

Sign up is not enough for admin — use `OWNER_EMAIL` / `OWNER_PASSWORD` env vars (server creates/promotes admin on startup), or:

```bash
# in Render Shell, from the service root:
node --experimental-sqlite backend/create-admin.js you@example.com 'your-long-password' 'Your Name'
```

### 4. Confirm it worked

In **Logs** you should see something like:

```text
[skillora:db] DB_FILE= /var/data/skillora.db
```

You should **not** see the ephemeral-storage warning.

Create a test account → **Manual Deploy** again → log in still works.

---

## Free tier (no disk)

Keep:

```text
DB_FILE=./data/skillora.db
```

Expect accounts to reset when Render rebuilds the instance. Fine for demos only.

---

## About PostgreSQL

If you already created a Render Postgres instance:

- It is **not used** by the current Skillora code.
- You can delete it to save money, **or** keep it for a future migration.
- Migrating this app to Postgres is a separate code change (all SQL + driver).

---

## Render service settings

| Setting | Value |
|---------|--------|
| Build Command | `echo ok` |
| Start Command | `npm start` |
| Root Directory | *(empty)* |
| Node | `22.14.0` via `NODE_VERSION` |
