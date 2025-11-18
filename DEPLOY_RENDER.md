# Deploying BMS-Nuevo to Render (Free tier)  

This guide helps you deploy the project to Render with a free-tier setup. The system is designed for demo use and includes automatic seeding support and demo login buttons for your professor.

---

## Recommended free-tier services
- Render: Web Service (free tier)
- CockroachDB Serverless: free cluster
  - Use the CockroachDB Serverless cluster and copy the connection string to `DATABASE_URL`.

Notes:
- SSE server push is supported in Render; for demos, in-process EventEmitter is sufficient.
- If you intend to scale (multiple instances), use a free Redis addon (or Upstash free plan) to pub/sub, but this requires extra setup and may not be free across services.

---

## Step-by-step deploy (Render)
1. Create a Render account and link your GitHub repository.
2. Create a new **Web Service** for the repo with the following build and start commands:
   - Build command: `npm ci`
   - Start command: `npm start`
3. Add **Environment Variables** in the service settings (click "Add Environment Variable"):
   - `DATABASE_URL` (CockroachDB connection string or connection details)
   - `JWT_SECRET` (a random strong secret)
   - `NODE_ENV` = `production`
   - `PORT` (optional; Render sets it automatically, but can set 10000)
   - `SEED_DEMO_USERS` = `true` (optional: set to `true` to auto-seed demo accounts on startup)
   - `DEMO_SHOW_QUICK_LOGIN` = `true` (optional: show demo quick login buttons)

4. Optional: If you prefer to seed manually, you can remove or unset `SEED_DEMO_USERS` and run the seed script via a `One-Off` or after deployment via manual run:
   - Command: `node scripts/seed-test-users.js` or `npm run seed`

5. After setting environment variables, deploy the service.

6. Visit the service URL provided by Render. The seeded users (admin, official1, resident1) will be available for the demo.

---

## Testing Demo Features
- Quick login buttons: If `DEMO_SHOW_QUICK_LOGIN = true` and `NODE_ENV` is not `production`, quick login buttons will appear in the login page. Click any to auto-populate and login.
- SSE push: SSE endpoint `/api/events/stream` will listen and send updates to the client. Client managers will react and refresh sections.
- Auto seeding: If `SEED_DEMO_USERS = true`, the server runs the seeder on startup (see `scripts/seed-test-users.js`).

---

## Security Notes
- The demo uses short-lived access tokens and safe password hashing (bcrypt).
- Avoid enabling seed and demo features for production services — they are intended only for demo/testing.
- SSE tokens are accepted in query parameters to support EventSource; this is convenient for demos but less secure because the token appears in logs. For production, prefer cookie-based or short-lived signed tokens.

---

## Troubleshooting
- If the `/api/status` or `/api/config` endpoints show `Not configured`, double-check `DATABASE_URL` and restart the service.
- If SSE doesn't appear to deliver events, verify that `NODE_ENV` is `development` or that you ran the demo seeds to create users.

---

If you want me to also automate pub/sub across multiple instances with a free Redis provider or change the SSE token strategy for better security, I can put that in the next step.
