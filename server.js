import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';

// Import routes
import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendar.js';
import residentApiRoutes from './routes/resident-api.js';
import adminApiRoutes from './routes/admin-api.js';
import officialApiRoutes from './routes/official-api.js';

// Import middleware
import { logRequest, errorHandler, corsOptions } from './middleware/auth.js';

// Import database initialization
import { initializeDatabase } from './config/database-init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// Initialize Database (creates tables and seeds data on first run)
// ============================================================================

console.log('[SERVER] Starting database initialization...');
initializeDatabase().catch(err => {
    console.error('[SERVER] Database initialization warning:', err.message);
}).finally(() => {
    console.log('[SERVER] Database initialization complete, server ready');
});

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(logRequest);

// Serve static files from public
// Serve admin-dashboard.html with dynamic WS URL meta when set in env
app.get('/admin-dashboard.html', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'admin-dashboard.html');
    let content = fs.readFileSync(filePath, 'utf-8');
    const injected = (process.env.APP_WS_URL || '').replace(/"/g, '');
    content = content.replace('<meta name="app:ws_url" content="%APP_WS_URL%">', `<meta name="app:ws_url" content="${injected}">`);
    return res.type('html').send(content);
  } catch (err) {
    console.error('[SERVER] Failed to serve admin-dashboard with dynamic WS URL:', err.message);
    return res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
  }
});

app.use('/', express.static(path.join(__dirname, 'public')));

// ============================================================================
// Authentication Routes
// ============================================================================

app.use(authRoutes);

// ============================================================================
// Calendar Routes
// ============================================================================

app.use(calendarRoutes);

// ============================================================================
// Resident API Routes
// ============================================================================

app.use('/api/resident', residentApiRoutes);

// ============================================================================
// Admin API Routes
// ============================================================================

app.use('/api/admin', adminApiRoutes);

// ============================================================================
// Official API Routes
// ============================================================================

app.use('/api/official', officialApiRoutes);

// ============================================================================
// Helper: sample data
// ============================================================================

const now = () => new Date().toISOString();

/* --------- Admin API stubs --------- */
app.get('/api/admin/recent-activity', (req, res) => {
  res.json([
    { actor: 'Clerk Maria', action: 'Approved document', timestamp: now(), link: '/admin/doc/123', color:'#10b981' },
    { actor: 'System', action: 'Imported 120 residents', timestamp: now(), link: '/admin/imports/456', color:'#3b82f6' },
    { actor: 'Admin', action: 'Escalated complaint', timestamp: now(), link: '/admin/complaint/789', color:'#f59e0b' }
  ]);
});

app.get('/api/admin/pending', (req, res) => {
  const category = req.query.category || 'all';
  const items = [
    { id: 'p1', type: 'Resident Registration', ref: 'R-2025-001', name:'Juan Dela Cruz', actor:'Applicant', date: now() },
    { id: 'p2', type: 'Document Approval', ref: 'DOC-78', name:'Appointment Letter', actor:'Clerk', date: now() },
    { id: 'p3', type: 'Complaint', ref: 'C-555', name:'Noise complaint', actor:'Resident', date: now() }
  ];
  res.json(items.filter(it=> category==='all' ? true : it.type.toLowerCase().includes(category)));
});

app.post('/api/admin/pending/:id/approve', (req, res) => {
  res.json({ success: true, id: req.params.id });
});
app.post('/api/admin/pending/:id/reject', (req, res) => {
  res.json({ success: true, id: req.params.id, reason:req.body.reason||null });
});

app.get('/api/admin/audit-snapshot', (req, res) => {
  res.json([
    { actor: 'Admin', action: 'Changed roles', target: 'User: 12', time: now() },
    { actor: 'System', action: 'Exported residents', target: 'Residents CSV', time: now() }
  ]);
});

app.get('/api/admin/active-sessions', (req, res) => {
  res.json([
    { sessionId: 's1', admin: 'Admin', ip: '192.168.1.10', agent: 'Chrome on Windows' },
    { sessionId: 's2', admin: 'Clerk Maria', ip: '192.168.1.11', agent: 'Safari on Mac' }
  ]);
});

app.post('/api/admin/sessions/:sessionId/signout', (req, res) => {
  res.json({ success: true, sessionId: req.params.sessionId });
});

app.get('/api/admin/exports/recent', (req, res) => {
  res.json([
    { dataset:'Residents', format:'CSV', count:120, status:'Ready', url:'/downloads/residents-2025.csv' }
  ]);
});

app.get('/api/admin/exports', (req, res)=>{
  res.json([{ exportId:'e1', dataset:'Residents', format:'CSV', records:120, status:'Ready', requestedAt: now(), downloadUrl:'/downloads/residents-2025.csv' }]);
});
app.post('/api/admin/exports', (req, res)=>{
  res.json({ success:true, exportId:'e'+Math.floor(Math.random()*10000) });
});

// Imports: validate and start (note some client calls use /admin/imports/validate without /api)
app.post('/admin/imports/validate', (req, res) => {
  // Since file upload not implemented here, return mock preview
  res.json({ importId: 'imp123', sampleCount: 5, errors: [], importSummary: { total: 120, errors: 0 } });
});
app.post('/api/admin/imports/validate', (req, res) => res.json({ importId: 'imp123', sampleCount: 5, errors: [] }));
app.post('/api/admin/imports/start', (req, res) => res.json({ success:true, jobId: 'job'+Math.floor(Math.random()*9999) }));
app.get('/api/admin/imports/recent', (req,res)=> res.json([{ importId:'imp123', dataset:'residents', status:'Completed', recordsImported:120, recordsTotal:120 }]));

/* --------- Generic resource endpoints (stubs) --------- */
app.get('/api/residents', (req,res)=>{
  res.json([ { residentId:'R-001', firstName:'Juan', lastName:'Dela Cruz', age:30, sex:'M', purok:'A', contact:'09171234567', status:'Active', registeredAt: now() } ]);
});
app.get('/api/announcements', (req,res)=>{ res.json([{ id:'A1', title:'Clearance Processing', audience:'All', start: now(), end: now(), status:'Published' }]); });
app.get('/api/users', (req,res)=>{ res.json([{ userId:'U1', username:'admin', fullName:'Admin User', roles:['Admin'], status:'Active' }]); });
app.get('/api/officials', (req,res)=>{ res.json([{ officialId:'O1', fullName:'Punong Barangay', position:'Punong Barangay', termStart:'2023', termEnd:'2026', status:'Active' }]); });
app.get('/api/complaints', (req,res)=>{ res.json([{ ref:'C123', complainantName:'Ana', category:'Noise', dateReported: now(), status:'New', priority:'High' }]); });
app.get('/api/audit-logs', (req,res)=>{ res.json([{ logId:'L1', timestamp: now(), actor:'Admin', actionType:'Update', targetType:'Resident', targetId:'R-001', ip:'127.0.0.1', details:'changed address' }]); });

/* --------- Fallbacks & start server --------- */
app.use((req,res,next)=>{
  // If request seems to accept html, serve index or 404
  if(req.accepts('html')){
    return res.status(404).sendFile(path.join(__dirname,'public','404.html'), err=>{ if(err) res.status(404).send('Not found'); });
  }
  res.status(404).json({ error:'Not found' });
});

// Error handling middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`BMS server listening on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');

  // Send a welcome message
  ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));

  // Handle incoming messages
  ws.on('message', (data) => {
    console.log(`[WebSocket] Received: ${data}`);
    // Echo the message back to the client
    ws.send(JSON.stringify({ message: `Echo: ${data}` }));
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

console.log('[WebSocket] WebSocket server is running');

// Health/probe route for monitoring
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ws: 'ok' });
});

// Keep server alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close();
  process.exit(0);
});
