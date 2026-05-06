# ContactHub — Contact Form + Admin Dashboard

A full-stack Next.js app: **public contact form** + **protected admin dashboard**, backed by **Neon PostgreSQL**, deployed on **Vercel free tier**.

```
Public  →  /              Contact form (anyone can submit)
Admin   →  /dashboard     View, filter, update, delete messages
API     →  /api/contacts  REST API (POST=public, GET/PATCH/DELETE=protected)
Health  →  /api/health    DB connectivity check
```

---

## 🗂️ Project Structure

```
contact-app/
├── app/
│   ├── api/
│   │   ├── contacts/
│   │   │   ├── route.js        ← POST (public submit) + GET (auth'd list)
│   │   │   └── [id]/route.js   ← GET, PATCH (status), DELETE
│   │   └── health/route.js     ← DB health check
│   ├── dashboard/
│   │   └── page.js             ← Admin dashboard (password protected)
│   ├── globals.css
│   ├── layout.js
│   └── page.js                 ← Public contact form
├── lib/
│   └── db.js                   ← Neon connection + schema init
├── scripts/
│   └── migrate.js              ← Creates table + seeds sample data
├── .env.local.example
├── next.config.js
├── vercel.json
└── package.json
```

---

## ⚡ Local Setup (5 minutes)

### 1. Install dependencies

```bash
cd contact-app
npm install
```

### 2. Get a free Neon PostgreSQL database

1. Go to **https://neon.tech** → Sign up free
2. Click **New Project** → give it a name → Create
3. On the dashboard, click **Connect** → copy the **Connection string**
   - Looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://your-neon-connection-string"
DASHBOARD_SECRET="choose-any-password-here"
```

### 4. Run database migration

```bash
npm run db:migrate
```

This creates the `contacts` table and seeds 5 sample messages.

### 5. Start dev server

```bash
npm run dev
```

- **Contact form** → http://localhost:3000
- **Dashboard** → http://localhost:3000/dashboard (use your `DASHBOARD_SECRET`)
- **Health check** → http://localhost:3000/api/health

---

## 🌐 Deploy to Vercel (Free Tier)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: ContactHub"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/contact-hub.git
git push -u origin main
```

### Step 2 — Import on Vercel

1. Go to **https://vercel.com** → **Add New Project**
2. Click **Import** next to your GitHub repo
3. Framework will auto-detect as **Next.js**

### Step 3 — Add Environment Variables

In the Vercel deploy screen, click **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `DASHBOARD_SECRET` | Your chosen admin password |

### Step 4 — Deploy!

Click **Deploy** — it builds in ~60 seconds ✅

### Step 5 — Run migration on production

After your first deploy, run the migration once using your production DATABASE_URL:

```bash
# Windows
set DATABASE_URL=your-neon-url && npm run db:migrate

# Mac/Linux
DATABASE_URL="your-neon-url" npm run db:migrate
```

---

## 🔌 API Reference

### POST `/api/contacts` — Public
Submit a new contact message.
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "General Inquiry",
  "message": "Hello, I'd like to know more..."
}
```

### GET `/api/contacts` — Protected
Requires header: `x-dashboard-secret: YOUR_SECRET`

Query params: `?status=new|read|replied|archived|all&page=1&limit=20`

### PATCH `/api/contacts/:id` — Protected
Update status: `{ "status": "read" | "replied" | "archived" | "new" }`

### DELETE `/api/contacts/:id` — Protected
Permanently delete a message.

### GET `/api/health`
Returns database connectivity status.

---

## 💰 Free Tier Summary

| Service | Free Tier |
|---------|-----------|
| **Neon PostgreSQL** | 0.5 GB storage, auto-suspend, unlimited API calls |
| **Vercel** | 100 GB bandwidth, 100 deploys/day, serverless functions |

No credit card required for either. 🎉
