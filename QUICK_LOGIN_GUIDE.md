# Quick Login Guide - 60 Seconds

## Step 1: Seed Test Users (First Time Only)
```bash
node scripts/seed-test-users.js
```

## Step 2: Start Server
```bash
npm run dev
```

## Step 3: Open Browser
```
http://localhost:5000/login.html
```

## Step 4: Use Test Credentials

### Option 1: Admin Login
```
Username: admin
Password: admin123
→ Redirects to: Official Dashboard
```

### Option 2: Official Login
```
Username: official1
Password: password
→ Redirects to: Official Dashboard
```

### Option 3: Resident Login
```
Username: resident1
Password: password
→ Redirects to: Resident Dashboard
```

---

## What Changed?

✅ **Login Page (login.html)** - Works as before
✅ **Authentication (auth-redirect.js)** - NEW! Protects all dashboards
✅ **Test Users (seed-test-users.js)** - NEW! Creates accounts with active status
✅ **Dashboards** - Now require authentication to access

---

## How It Works

```
login.html
    ↓
    Enter credentials
    ↓
    POST /api/auth/login
    ↓
    Database validates
    ↓
    If VALID:
      Save tokens
      Check role
      Redirect to dashboard
    
    If INVALID:
      Show error
      Stay on login
```

---

## Files You Need to Know

| File | Purpose |
|------|---------|
| `public/login.html` | Login form |
| `public/js/login.js` | Login logic |
| `public/js/auth-redirect.js` | Auth checks |
| `scripts/seed-test-users.js` | Create test users |
| `LOGIN_SETUP_GUIDE.md` | Full documentation |

---

## Troubleshooting

**"Invalid credentials"**
→ Run `node scripts/seed-test-users.js` first

**"Blank page after login"**
→ Check browser console (F12 → Console tab)

**"Can't access dashboard directly"**
→ This is normal! You must login first

**"Server not running"**
→ Run `npm run dev` in terminal

---

## Test All Three Dashboards

```bash
# Terminal 1: Start server
npm run dev

# Browser: Login with each credential set
Admin      → official-dashboard.html ✅
Official   → official-dashboard.html ✅
Resident   → resident-dashboard.html ✅

# Verify in each dashboard:
- Clock updates every second
- Calendar shows today's date
- Real-time features working
```

---

**Status:** ✅ READY TO USE
**Last Updated:** November 16, 2025
