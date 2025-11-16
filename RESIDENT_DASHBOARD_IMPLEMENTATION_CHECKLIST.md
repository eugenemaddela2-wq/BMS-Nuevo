# Resident Dashboard - Implementation Checklist & Setup Guide

## Overview

This document provides a step-by-step implementation guide for deploying the complete Resident Dashboard system with all components, API endpoints, and database integration.

## Prerequisites

- Node.js v16+
- PostgreSQL/CockroachDB cluster
- npm/yarn package manager
- Git version control
- VS Code or similar editor

## Implementation Steps

### Step 1: Backend Setup

#### 1.1 Database Initialization

```bash
# Connect to CockroachDB
cockroach sql --insecure

# Create database
CREATE DATABASE barangay;
USE barangay;

# Run schema (from config/database-init.js)
# Tables will be auto-created on first server start
```

#### 1.2 Environment Configuration

Create `.env` file in project root:

```env
# Database
DB_HOST=localhost
DB_PORT=26257
DB_NAME=barangay
DB_USER=root
DB_PASSWORD=
DB_SSL=true

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_very_secure_secret_key_min_32_chars_long
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5000,https://yourdomain.com

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

#### 1.3 Install Dependencies

```bash
npm install
```

#### 1.4 Start Server

```bash
npm start

# Or with nodemon for development
npm run dev
```

Expected output:
```
✓ Database initialized
✓ Server running on http://localhost:5000
✓ CORS enabled
✓ Routes loaded
```

### Step 2: Frontend Setup

#### 2.1 File Structure Verification

```bash
# Verify all files are in place
public/
├── resident-dashboard.html
├── resident-dashboard-v2.html (alternative version)
├── js/
│   ├── resident-dashboard-manager.js
│   ├── auth-redirect.js
│   └── section-loader.js
├── css/
│   └── resident-dashboard.css
└── sections/
    ├── resident-home.html
    ├── resident-profile.html
    ├── resident-household.html
    ├── resident-documents.html
    ├── resident-complaints.html
    ├── resident-events.html
    ├── resident-announcements.html
    └── resident-messages.html
```

#### 2.2 CSS Variables Verification

Ensure your `resident-dashboard.css` includes:

```css
:root {
    --color-primary: #667eea;
    --color-primary-light: #764ba2;
    --accent-cyan: #4fc3dc;
    --accent-green: #26d07c;
    --glass-bg: rgba(255, 255, 255, 0.08);
    --glass-border: rgba(255, 255, 255, 0.15);
    --text-strong: #ffffff;
    --text-muted: rgba(255,255,255,0.7);
}
```

#### 2.3 Authentication Redirect

Update `auth-redirect.js`:

```javascript
// Check if user is logged in
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = '/login.html';
}

if (role !== 'resident') {
    window.location.href = '/login.html';
}
```

### Step 3: API Integration Testing

#### 3.1 Test Authentication

```bash
# Login to get token
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "resident@example.com",
    "password": "password123"
  }'

# Response should include token
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "role": "resident",
#   "id": "uuid..."
# }
```

#### 3.2 Test Dashboard Endpoint

```bash
# Get dashboard data (replace TOKEN with actual token)
curl http://localhost:5000/api/resident/dashboard \
  -H "Authorization: Bearer TOKEN"
```

#### 3.3 Test Complaint Submission

```bash
curl -X POST http://localhost:5000/api/resident/complaints \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Infrastructure",
    "subject": "Pothole on Main Street",
    "description": "Large pothole on Main Street near the market",
    "location": "Main Street",
    "confidential": false
  }'
```

### Step 4: Database Testing

#### 4.1 Verify Tables

```sql
-- Connect to database
USE barangay;

-- List all tables
SHOW TABLES;

-- Expected output
-- residents
-- households
-- household_members
-- complaints
-- document_requests
-- events
-- event_registrations
-- announcements
-- messages

-- Check table structure
DESCRIBE residents;
```

#### 4.2 Test Data Insertion

```sql
-- Insert test resident
INSERT INTO residents (
    user_id, first_name, last_name, date_of_birth, sex,
    purok, address, contact_number, email, household_id
) VALUES (
    'user-uuid-here', 'Maria', 'Santos', '1995-01-15', 'F',
    'Zone 1', '123 Main Street', '+63 900 123 4567',
    'maria@example.com', 'household-uuid-here'
);
```

### Step 5: Frontend Initialization

#### 5.1 Update Server Routes

Ensure `server.js` includes:

```javascript
import residentApiRoutes from './routes/resident-api.js';

app.use('/api/resident', residentApiRoutes);
```

#### 5.2 Verify HTML File

Open `resident-dashboard.html` and verify:

```html
<!-- Header -->
<header>
    <h2>Resident Dashboard — <span id="resFullName">John Doe</span></h2>
</header>

<!-- Sidebar -->
<aside>
    <nav>
        <a href="#home" class="nav-item" data-section="home">Home</a>
        <!-- ... other nav items ... -->
    </nav>
</aside>

<!-- Main Content -->
<main>
    <div class="content-wrapper">
        <!-- Summary Cards -->
        <!-- Content Sections -->
    </div>
</main>

<!-- Scripts -->
<script src="js/resident-dashboard-manager.js"></script>
```

#### 5.3 Test Dashboard Load

1. Open browser: `http://localhost:5000/resident-dashboard.html`
2. Should automatically load user's data
3. Check browser console for errors

### Step 6: Feature Testing

#### 6.1 Test Navigation

```javascript
// In browser console
residentDashboard.showSection('profile');
residentDashboard.showSection('complaints');
residentDashboard.showSection('documents');
```

#### 6.2 Test Form Submission

```javascript
// File complaint
openModal('complaintForm');
// Fill form and submit
```

#### 6.3 Test Data Loading

```javascript
// Check if data loaded
console.log(residentDashboard.residentData);
console.log(residentDashboard.dashboardData);
```

### Step 7: Security Implementation

#### 7.1 Implement Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});

app.use('/api/', apiLimiter);
```

#### 7.2 Add HTTPS Support

```javascript
import https from 'https';
import fs from 'fs';

const options = {
    key: fs.readFileSync('path/to/private-key.pem'),
    cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

#### 7.3 Set Security Headers

```javascript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:']
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

### Step 8: Performance Optimization

#### 8.1 Enable Gzip Compression

```javascript
import compression from 'compression';

app.use(compression({
    level: 6,
    threshold: 1024
}));
```

#### 8.2 Implement Caching

```javascript
// Cache control headers
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        res.set('Cache-Control', 'public, max-age=31536000');
    }
    next();
});
```

#### 8.3 Database Query Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_complaints_resident_status 
ON complaints(resident_id, status, created_at DESC);

CREATE INDEX idx_documents_resident_status
ON document_requests(resident_id, status);

CREATE INDEX idx_messages_recipient_unread
ON messages(recipient_id, read_at) WHERE read_at IS NULL;
```

### Step 9: Monitoring & Logging

#### 9.1 Set Up Error Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
```

#### 9.2 Set Up Performance Monitoring

```javascript
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestDuration.labels(req.method, req.route?.path, res.statusCode).observe(duration);
    });
    next();
});
```

### Step 10: Deployment

#### 10.1 Production Checklist

- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] API documentation updated
- [ ] User credentials rotated

#### 10.2 Deploy to Production

```bash
# Build for production
npm run build

# Run production server
NODE_ENV=production npm start

# Or with PM2
pm2 start server.js --name "bms-resident-dashboard"
pm2 save
pm2 startup
```

#### 10.3 Post-Deployment Verification

```bash
# Test API endpoints
curl https://yourdomain.com/api/resident/dashboard \
  -H "Authorization: Bearer TOKEN"

# Check server health
curl https://yourdomain.com/health

# Monitor logs
tail -f logs/combined.log
```

## Troubleshooting Guide

### Issue: "Failed to load dashboard"

**Solution:**
1. Check JWT token validity: `console.log(localStorage.getItem('token'))`
2. Verify API endpoint: `curl http://localhost:5000/api/resident/dashboard`
3. Check browser console for error details
4. Verify database connection in server logs

### Issue: "Database connection refused"

**Solution:**
```bash
# Check if CockroachDB is running
cockroach status

# Check connection string
echo $DATABASE_URL

# Try manual connection
cockroach sql --certs-dir=certs -e "SELECT 1"
```

### Issue: "CORS policy violation"

**Solution:**
1. Verify CORS_ORIGIN in `.env`
2. Restart server after changing CORS settings
3. Clear browser cache
4. Check server logs for CORS errors

### Issue: "Modal not opening"

**Solution:**
```javascript
// In browser console
openModal('complaintForm'); // Should display modal
// Check if modal element exists
document.getElementById('complaintForm');
```

### Issue: "Form submission fails"

**Solution:**
1. Check form data: `console.log(form.elements)`
2. Verify API endpoint is accessible
3. Check network tab in DevTools
4. Verify JWT token is still valid

## Maintenance Tasks

### Daily
- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify database health

### Weekly
- [ ] Review security logs
- [ ] Check database query performance
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Database maintenance/cleanup
- [ ] Security audit
- [ ] Performance optimization review
- [ ] User feedback analysis

### Quarterly
- [ ] Full system backup test
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Load testing

## Support & Documentation

- **System Design**: See `RESIDENT_DASHBOARD_SYSTEM_DESIGN.md`
- **API Guide**: See `RESIDENT_DASHBOARD_GUIDE.md`
- **Database Schema**: See `scripts/schema.sql`
- **Troubleshooting**: See this document's troubleshooting section

## Next Steps

1. ✅ Complete Steps 1-10
2. ⏭️ Configure official dashboard
3. ⏭️ Configure admin dashboard
4. ⏭️ Set up user training
5. ⏭️ Go-live preparation

## Success Metrics

Track these metrics to measure dashboard success:

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | - |
| API Response Time | < 500ms | - |
| Uptime | 99.9% | - |
| User Satisfaction | 4.5/5 | - |
| Error Rate | < 0.1% | - |
| Data Accuracy | 100% | - |

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Status**: Ready for Implementation
