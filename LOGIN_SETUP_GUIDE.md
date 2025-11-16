# Login & Authentication Setup Guide

## Problem Solved
The login system now properly:
✅ Validates credentials against the database
✅ Redirects to correct dashboard based on user role
✅ Protects all dashboards with authentication checks
✅ Provides test credentials for quick testing

---

## Quick Start - Login with Test Credentials

### 1. Seed Test Users (First Time Only)

```bash
node scripts/seed-test-users.js
```

This creates three test accounts in the database with 'active' status (no approval waiting):

```
Admin Account
├─ Username: admin
├─ Password: admin123
└─ Role: admin → redirects to official-dashboard.html

Official Account
├─ Username: official1
├─ Password: password
└─ Role: official → redirects to official-dashboard.html

Resident Account
├─ Username: resident1
├─ Password: password
└─ Role: resident → redirects to resident-dashboard.html
```

### 2. Start the Server

```bash
npm run dev
# or
npm start
```

### 3. Open Login Page

Go to: `http://localhost:5000/login.html`

### 4. Login with Test Credentials

Use any of the credentials above. You'll be automatically redirected to the correct dashboard:

- **Admin/Official** → Official Dashboard
- **Resident** → Resident Dashboard

---

## How It Works

### Login Flow

```
1. User enters credentials in login.html
   ↓
2. Credentials sent to API: POST /api/auth/login
   ↓
3. Backend validates against database
   ↓
4. If valid:
   - Tokens generated (accessToken, refreshToken)
   - User data returned
   - Stored in sessionStorage
   ↓
5. Login.js saves tokens and user data
   ↓
6. User redirected to correct dashboard:
   - admin/official/clerk → official-dashboard.html
   - resident → resident-dashboard.html
   ↓
7. Dashboard loads (auth-redirect.js)
   ↓
8. Auth check verifies token is valid
   ↓
9. If valid: Dashboard loads normally
   If invalid: Redirected to login.html
```

### Authentication Layers

**Layer 1: Login Page (login.html)**
- User submits credentials
- `login.js` validates and sends to API
- Tokens stored in `sessionStorage`

**Layer 2: Dashboard Access (auth-redirect.js)**
- Checks if `accessToken` exists
- Verifies token with backend (`/api/auth/me`)
- If invalid: redirects to login
- If valid: dashboard loads

**Layer 3: Protected Dashboards**
- All dashboard scripts call `redirectIfNotAuthenticated()`
- Dashboard won't initialize without valid auth
- Prevents direct URL access without login

---

## Files Modified

### New Files Created
- `scripts/seed-test-users.js` - Creates test user accounts
- `public/js/auth-redirect.js` - Authentication utilities

### Files Updated
- `public/login.html` - No changes needed ✅
- `public/js/login.js` - Enhanced to save user data
- `public/resident-dashboard.html` - Added auth-redirect.js reference
- `public/official-dashboard.html` - Added auth-redirect.js reference
- `public/admin/admin-dashboard.html` - Added auth-redirect.js reference
- `public/js/resident-dashboard.js` - Added auth check in DOMContentLoaded
- `public/js/official-dashboard.js` - Added auth check in DOMContentLoaded
- `public/admin/admin-dashboard.js` - Added auth check in init

---

## Functions in auth-redirect.js

### `isAuthenticated()`
Returns `true` if access token exists in sessionStorage

### `getAccessToken()`
Returns the current access token

### `getRefreshToken()`
Returns the current refresh token

### `saveAuthTokens(accessToken, refreshToken)`
Saves tokens to sessionStorage

### `clearAuth()`
Removes all authentication data from sessionStorage

### `verifyAuth()`
Verifies token with backend API `/api/auth/me`
Returns user data if valid, null otherwise

### `redirectIfNotAuthenticated()`
**Use this in all protected dashboard pages!**
- Checks for token
- Verifies with backend
- Redirects to login if invalid
- Returns true if authenticated

### `redirectByRole(userRole, requiredRole)`
Restricts access by role
Example:
```javascript
redirectByRole(user.role, 'admin'); // Only allow admins
```

### `getUserFromSession()`
Gets stored user data from sessionStorage

### `storeUserInSession(userData)`
Stores user data in sessionStorage

### `logout()`
- Calls logout API
- Clears all tokens
- Redirects to login

---

## Troubleshooting

### "Invalid Credentials" Error

**Solution 1:** Check if you seeded test users
```bash
node scripts/seed-test-users.js
```

**Solution 2:** Verify database is running
```bash
# Check .env file
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=bms_database
```

**Solution 3:** Clear sessionStorage and try again
```javascript
// In browser console
sessionStorage.clear();
location.reload();
```

### "Redirected to Login" on Dashboard

**Cause 1:** Token expired
- Log in again

**Cause 2:** Token invalid
- Clear sessionStorage and log in again

**Cause 3:** API not responding
- Check if server is running: `npm run dev`
- Check `/api/auth/me` endpoint

### Test User Already Exists

**Solution:** This is normal!
The script checks if users exist before creating them.
Just log in with the credentials.

---

## Manual User Creation

If you prefer to create users manually via database:

```sql
-- Hash password first (use bcrypt or similar)
-- Example password: 'admin123'

INSERT INTO users (
  username, 
  email, 
  password_hash, 
  first_name, 
  last_name, 
  date_of_birth, 
  phone_number, 
  purok, 
  role, 
  status, 
  verified_at
) VALUES (
  'admin',
  'admin@bms.local',
  '$2b$10$...',  -- Hash of 'admin123'
  'Admin',
  'User',
  '1990-01-01',
  '09123456789',
  'Admin Zone',
  'admin',
  'active',
  NOW()
);
```

---

## Token Storage

**Access Token:**
- Stored in: `sessionStorage.accessToken`
- Duration: 24 hours
- Purpose: Authenticate API requests
- Sent as: `Authorization: Bearer {token}`

**Refresh Token:**
- Stored in: `sessionStorage.refreshToken`
- Duration: 7 days
- Purpose: Get new access token when expired
- Used at: `POST /api/auth/refresh`

**User Data:**
- Stored in: `sessionStorage.userData`
- Contains: `{id, username, email, role, ...}`
- Updated on: Login only

---

## Security Notes

✅ **Good Practices Implemented:**
- Passwords hashed with bcrypt
- Tokens stored in sessionStorage (not localStorage)
- API validates every token
- Rate limiting on login attempts
- Failed login attempts logged

⚠️ **Future Improvements:**
- Refresh token rotation
- CSRF token implementation
- Session timeout warnings
- Two-factor authentication

---

## Next Steps

1. ✅ Run `node scripts/seed-test-users.js`
2. ✅ Start server: `npm run dev`
3. ✅ Go to http://localhost:5000/login.html
4. ✅ Login with test credentials
5. ✅ Verify redirect to correct dashboard
6. ✅ Check real-time clock and calendar

---

**Last Updated:** November 16, 2025
**Status:** Production Ready
