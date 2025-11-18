/**
 * Admin API Routes - Complete admin dashboard endpoints
 * /api/admin/*
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Middleware: Verify admin role
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

router.use(authenticate);
router.use(requireAdmin);

// ============= DASHBOARD =============

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview with statistics
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Use defensive queries so missing tables or columns won't crash the entire endpoint.
        const getCount = async (sql, params = []) => {
            try {
                const r = await db.query(sql, params);
                return parseInt(r.rows?.[0]?.count || 0, 10);
            } catch (err) {
                console.warn('Count query failed:', sql, err.message);
                return 0;
            }
        };

        const totalResidents = await getCount("SELECT COUNT(*)::int as count FROM residents WHERE status = 'Active'");
        const pendingResidents = await getCount("SELECT COUNT(*)::int as count FROM residents WHERE status = 'Pending'");
        const pendingDocuments = await getCount("SELECT COUNT(*)::int as count FROM documents WHERE status = 'Pending'");
        const pendingComplaints = await getCount("SELECT COUNT(*)::int as count FROM complaints WHERE status = 'New'");
        const activeSessions = await getCount("SELECT COUNT(DISTINCT user_id)::int as count FROM sessions WHERE expires_at > NOW()");

        // Safe fetch helper for result sets
        const safeFetch = async (sql, params = []) => {
            try {
                const r = await db.query(sql, params);
                return r.rows || [];
            } catch (err) {
                console.warn('Query failed:', sql, err.message);
                return [];
            }
        };

        const recentActivity = await safeFetch(`
            SELECT 
                audit_logs.log_id as id,
                audit_logs.action_type as type,
                audit_logs.target_type as target_type,
                audit_logs.target_id,
                CONCAT(users.first_name, ' ', users.last_name) as actor,
                audit_logs.details as description,
                audit_logs.timestamp
            FROM audit_logs
            JOIN users ON audit_logs.actor_user_id = users.user_id
            ORDER BY audit_logs.timestamp DESC
            LIMIT 10
        `);

        const pendingItemsRows = await safeFetch(`
            SELECT 'Registration' as type, CONCAT(first_name, ' ', last_name) as title, 
                   'Pending' as category, resident_id as id FROM residents WHERE status = 'Pending'
            UNION ALL
            SELECT 'Document' as type, document_type as title, 'Documents' as category, 
                   document_id as id FROM documents WHERE status = 'Pending'
            UNION ALL
            SELECT 'Complaint' as type, subject as title, 'Complaints' as category, 
                   complaint_id as id FROM complaints WHERE status = 'New'
            LIMIT 20
        `);

        const auditSnapshot = await safeFetch(`
            SELECT 
                audit_logs.log_id,
                CONCAT(users.first_name, ' ', users.last_name) as actor,
                audit_logs.action_type as action,
                audit_logs.target_type as targetType,
                audit_logs.target_id as targetId,
                audit_logs.ip_address as ipAddress,
                audit_logs.timestamp
            FROM audit_logs
            JOIN users ON audit_logs.actor_user_id = users.user_id
            ORDER BY audit_logs.timestamp DESC
            LIMIT 5
        `);

        const sessionsRows = await safeFetch(`
            SELECT 
                sessions.session_id as sessionId,
                users.username,
                sessions.ip_address as ipAddress,
                sessions.created_at as loginAt,
                sessions.user_id = $1 as isCurrent
            FROM sessions
            JOIN users ON sessions.user_id = users.user_id
            WHERE sessions.expires_at > NOW()
            ORDER BY sessions.created_at DESC
        `, [req.user.user_id]);

        res.json({
            statistics: {
                totalResidents,
                pendingItems: pendingResidents + pendingDocuments + pendingComplaints,
                activeSessions
            },
            recentActivity: recentActivity.map(row => ({
                ...row,
                timestamp: row.timestamp,
                title: `${row.actor} ${row.type}`
            })),
            pendingItems: pendingItemsRows,
            auditSnapshot: auditSnapshot,
            sessions: sessionsRows
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// ============= RESIDENTS MANAGEMENT =============

/**
 * GET /api/admin/residents
 * Get all residents with filtering
 */
router.get('/residents', async (req, res) => {
    try {
        const { status = 'Active', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const residents = await db.query(`
            SELECT 
                resident_id, first_name, middle_name, last_name, date_of_birth,
                sex, purok_zone, address, contact_number, email, household_id,
                occupation, marital_status, status, registered_at, updated_at
            FROM residents
            WHERE status = $1 OR $1 = 'all'
            ORDER BY registered_at DESC
            LIMIT $2 OFFSET $3
        `, [status === 'all' ? '%' : status, limit, offset]);

        const total = await db.query(
            'SELECT COUNT(*) as count FROM residents WHERE status = $1 OR $1 = \'all\'',
            [status === 'all' ? '%' : status]
        );

        res.json({
            residents: residents.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.rows[0].count
            }
        });

    } catch (error) {
        console.error('Error fetching residents:', error);
        res.status(500).json({ error: 'Failed to fetch residents' });
    }
});

/**
 * POST /api/admin/residents
 * Create new resident
 */
router.post('/residents', async (req, res) => {
    try {
        const { firstName, lastName, dateOfBirth, sex, purokZone, address, contactNumber, email } = req.body;

        const result = await db.query(`
            INSERT INTO residents 
            (first_name, last_name, date_of_birth, sex, purok_zone, address, 
             contact_number, email, status, registered_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', NOW())
            RETURNING resident_id, first_name, last_name
        `, [firstName, lastName, dateOfBirth, sex, purokZone, address, contactNumber, email]);

        // Log audit
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'Create', 'Resident', $2, $3, NOW())
        `, [req.user.user_id, result.rows[0].resident_id, req.ip]);

        // Emit SSE update
        try { req.app.locals.emitter?.emit('update', { topic: 'residents', action: 'create', id: result.rows[0].resident_id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json({ success: true, resident: result.rows[0] });

    } catch (error) {
        console.error('Error creating resident:', error);
        res.status(500).json({ error: 'Failed to create resident' });
    }
});

/**
 * PATCH /api/admin/residents/:id
 * Update resident
 */
router.patch('/residents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const result = await db.query(`
            UPDATE residents 
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                status = COALESCE($3, status),
                updated_at = NOW()
            WHERE resident_id = $4
            RETURNING *
        `, [updates.firstName, updates.lastName, updates.status, id]);

        // Log audit
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp, details)
            VALUES ($1, 'Update', 'Resident', $2, $3, NOW(), $4)
        `, [req.user.user_id, id, req.ip, JSON.stringify(updates)]);

        try { req.app.locals.emitter?.emit('update', { topic: 'residents', action: 'update', id: result.rows[0].resident_id, payload: result.rows[0] }); } catch (e) {}
        res.json({ success: true, resident: result.rows[0] });

    } catch (error) {
        console.error('Error updating resident:', error);
        res.status(500).json({ error: 'Failed to update resident' });
    }
});

// ============= OFFICIALS MANAGEMENT =============

/**
 * GET /api/admin/officials
 */
router.get('/officials', async (req, res) => {
    try {
        const officials = await db.query(`
            SELECT official_id, full_name, position, term_start, term_end, 
                   contact_number, email, photo_url, address, status, linked_user_id
            FROM officials
            ORDER BY term_start DESC
        `);

        res.json({ officials: officials.rows });

    } catch (error) {
        console.error('Error fetching officials:', error);
        res.status(500).json({ error: 'Failed to fetch officials' });
    }
});

/**
 * POST /api/admin/officials
 */
router.post('/officials', async (req, res) => {
    try {
        const { fullName, position, termStart, termEnd, contactNumber, email } = req.body;

        const result = await db.query(`
            INSERT INTO officials 
            (full_name, position, term_start, term_end, contact_number, email, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Active')
            RETURNING official_id, full_name
        `, [fullName, position, termStart, termEnd, contactNumber, email]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'Create', 'Official', $2, $3, NOW())
        `, [req.user.user_id, result.rows[0].official_id, req.ip]);

        try { req.app.locals.emitter?.emit('update', { topic: 'officials', action: 'create', id: result.rows[0].official_id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json({ success: true, official: result.rows[0] });

    } catch (error) {
        console.error('Error creating official:', error);
        res.status(500).json({ error: 'Failed to create official' });
    }
});

// ============= EVENTS MANAGEMENT =============

/**
 * GET /api/admin/events
 */
router.get('/events', async (req, res) => {
    try {
        const { status = 'Published', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const events = await db.query(`
            SELECT 
                events.event_id, events.title, events.description, events.start_date_time,
                events.end_date_time, events.venue, events.max_capacity, 
                CONCAT(users.first_name, ' ', users.last_name) as organizer,
                events.status, events.created_at,
                COUNT(er.event_id) as registered_count
            FROM events
            LEFT JOIN users ON events.created_by = users.user_id
            LEFT JOIN event_registrations er ON events.event_id = er.event_id
            WHERE events.status = $1 OR $1 = 'all'
            GROUP BY events.event_id
            ORDER BY events.start_date_time DESC
            LIMIT $2 OFFSET $3
        `, [status === 'all' ? '%' : status, limit, offset]);

        res.json({ events: events.rows });

    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

/**
 * POST /api/admin/events
 */
router.post('/events', async (req, res) => {
    try {
        const { title, description, startDateTime, endDateTime, venue, maxCapacity } = req.body;

        const result = await db.query(`
            INSERT INTO events 
            (title, description, start_date_time, end_date_time, venue, max_capacity, 
             created_by, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft', NOW())
            RETURNING event_id, title
        `, [title, description, startDateTime, endDateTime, venue, maxCapacity, req.user.user_id]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'Create', 'Event', $2, $3, NOW())
        `, [req.user.user_id, result.rows[0].event_id, req.ip]);

        try { req.app.locals.emitter?.emit('update', { topic: 'events', action: 'create', id: result.rows[0].event_id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json({ success: true, event: result.rows[0] });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// ============= ANNOUNCEMENTS MANAGEMENT =============

/**
 * GET /api/admin/announcements
 */
router.get('/announcements', async (req, res) => {
    try {
        const { status = 'Published', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const announcements = await db.query(`
            SELECT 
                announcement_id, title, content, audience, is_pinned, 
                start_date_time, end_date_time,
                CONCAT(users.first_name, ' ', users.last_name) as created_by,
                status, created_at
            FROM announcements
            LEFT JOIN users ON announcements.created_by = users.user_id
            WHERE announcements.status = $1 OR $1 = 'all'
            ORDER BY is_pinned DESC, created_at DESC
            LIMIT $2 OFFSET $3
        `, [status === 'all' ? '%' : status, limit, offset]);

        res.json({ announcements: announcements.rows });

    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

/**
 * POST /api/admin/announcements
 */
router.post('/announcements', async (req, res) => {
    try {
        const { title, content, audience, startDateTime, endDateTime } = req.body;

        const result = await db.query(`
            INSERT INTO announcements 
            (title, content, audience, start_date_time, end_date_time, 
             created_by, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'Draft', NOW())
            RETURNING announcement_id, title
        `, [title, content, audience, startDateTime, endDateTime, req.user.user_id]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'Create', 'Announcement', $2, $3, NOW())
        `, [req.user.user_id, result.rows[0].announcement_id, req.ip]);

        try { req.app.locals.emitter?.emit('update', { topic: 'announcements', action: 'create', id: result.rows[0].announcement_id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json({ success: true, announcement: result.rows[0] });

    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// ============= COMPLAINTS MANAGEMENT =============

/**
 * GET /api/admin/complaints
 */
router.get('/complaints', async (req, res) => {
    try {
        const { status = 'New', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const complaints = await db.query(`
            SELECT 
                complaint_id, complainant_name, contact_number, category, subcategory,
                description, date_reported, evidence_attachments, assigned_to,
                status, priority, resolution_notes, is_confidential, created_at, updated_at
            FROM complaints
            WHERE status = $1 OR $1 = 'all'
            ORDER BY date_reported DESC
            LIMIT $2 OFFSET $3
        `, [status === 'all' ? '%' : status, limit, offset]);

        res.json({ complaints: complaints.rows });

    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

/**
 * PATCH /api/admin/complaints/:id/status
 */
router.patch('/complaints/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        await db.query(`
            UPDATE complaints 
            SET status = $1, resolution_notes = COALESCE($2, resolution_notes), updated_at = NOW()
            WHERE complaint_id = $3
        `, [status, notes, id]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp, details)
            VALUES ($1, 'Update', 'Complaint', $2, $3, NOW(), $4)
        `, [req.user.user_id, id, req.ip, JSON.stringify({ status, notes })]);

        try { req.app.locals.emitter?.emit('update', { topic: 'complaints', action: 'update', id, payload: { status } }); } catch (e) {}
        res.json({ success: true });

    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// ============= USERS MANAGEMENT =============

/**
 * GET /api/admin/users
 */
router.get('/users', async (req, res) => {
    try {
        const users = await db.query(`
            SELECT user_id, username, email, full_name, role, status, 
                   last_login_at, last_login_ip, mfa_enabled, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json({ users: users.rows });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * POST /api/admin/users
 */
router.post('/users', async (req, res) => {
    try {
        const { username, email, fullName, role } = req.body;
        const tempPassword = Math.random().toString(36).slice(-8);

        const result = await db.query(`
            INSERT INTO users 
            (username, email, full_name, password_hash, role, status, created_at)
            VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5, 'Active', NOW())
            RETURNING user_id, username, email
        `, [username, email, fullName, tempPassword, role]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'Create', 'User', $2, $3, NOW())
        `, [req.user.user_id, result.rows[0].user_id, req.ip]);

        res.status(201).json({ 
            success: true, 
            user: result.rows[0],
            temporaryPassword: tempPassword 
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * PATCH /api/admin/users/:id/role
 */
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        await db.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, id]);

        // Audit log
        await db.query(`
            INSERT INTO audit_logs 
            (actor_user_id, action_type, target_type, target_id, ip_address, timestamp, details)
            VALUES ($1, 'PermissionChange', 'User', $2, $3, NOW(), $4)
        `, [req.user.user_id, id, req.ip, JSON.stringify({ role })]);

        // Emit SSE update for role change
        try { req.app.locals.emitter?.emit('update', { topic: 'users', action: 'role-change', id, payload: { role } }); } catch (e) {}

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

/**
 * POST /api/admin/users/:id/approve - Approve (activate) a pending user
 */
router.post('/users/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('UPDATE users SET status = $1, updated_at = NOW() WHERE user_id = $2', ['Active', id]);

        await db.query(`
            INSERT INTO audit_logs (actor_user_id, action_type, target_type, target_id, ip_address, timestamp)
            VALUES ($1, 'ApproveUser', 'User', $2, $3, NOW())
        `, [req.user.user_id, id, req.ip]);

        try { req.app.locals.emitter?.emit('update', { topic: 'users', action: 'approve', id }); } catch (e) {}
        res.json({ success: true, message: 'User approved' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

/**
 * POST /api/admin/users/:id/reject - Reject a pending user (with optional reason)
 */
router.post('/users/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        await db.query('UPDATE users SET status = $1, updated_at = NOW() WHERE user_id = $2', ['Rejected', id]);

        await db.query(`
            INSERT INTO audit_logs (actor_user_id, action_type, target_type, target_id, details, ip_address, timestamp)
            VALUES ($1, 'RejectUser', 'User', $2, $3, $4, NOW())
        `, [req.user.user_id, id, reason || null, req.ip]);

        try { req.app.locals.emitter?.emit('update', { topic: 'users', action: 'reject', id }); } catch (e) {}
        res.json({ success: true, message: 'User rejected' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ error: 'Failed to reject user' });
    }
});

// ============= AUDIT LOGS =============

/**
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const { actionType, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const logs = await db.query(`
            SELECT 
                audit_logs.log_id, audit_logs.timestamp, 
                CONCAT(users.first_name, ' ', users.last_name) as actor_name,
                audit_logs.action_type, audit_logs.target_type, audit_logs.target_id,
                audit_logs.ip_address, audit_logs.details
            FROM audit_logs
            LEFT JOIN users ON audit_logs.actor_user_id = users.user_id
            WHERE audit_logs.action_type = $1 OR $1 IS NULL
            ORDER BY audit_logs.timestamp DESC
            LIMIT $2 OFFSET $3
        `, [actionType || null, limit, offset]);

        res.json({ logs: logs.rows });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ============= DATA IMPORTS =============

/**
 * GET /api/admin/imports
 */
router.get('/imports', async (req, res) => {
    try {
        const imports = await db.query(`
            SELECT 
                import_id, dataset_target, file_name, file_type,
                CONCAT(users.first_name, ' ', users.last_name) as requested_by,
                requested_at, status, records_total, records_imported, 
                records_failed, rollback_available
            FROM imports
            LEFT JOIN users ON imports.requested_by = users.user_id
            ORDER BY requested_at DESC
        `);

        res.json({ imports: imports.rows });

    } catch (error) {
        console.error('Error fetching imports:', error);
        res.status(500).json({ error: 'Failed to fetch imports' });
    }
});

/**
 * POST /api/admin/imports
 */
router.post('/imports', async (req, res) => {
    try {
        const { datasetTarget, fileName } = req.body;

        const result = await db.query(`
            INSERT INTO imports 
            (dataset_target, file_name, requested_by, requested_at, status)
            VALUES ($1, $2, $3, NOW(), 'Validating')
            RETURNING import_id
        `, [datasetTarget, fileName, req.user.user_id]);

        try { req.app.locals.emitter?.emit('update', { topic: 'imports', action: 'create', id: result.rows[0].import_id }); } catch (e) {}
        res.status(201).json({ success: true, import_id: result.rows[0].import_id });

    } catch (error) {
        console.error('Error creating import:', error);
        res.status(500).json({ error: 'Failed to create import' });
    }
});

// ============= DATA EXPORTS =============

/**
 * GET /api/admin/exports
 */
router.get('/exports', async (req, res) => {
    try {
        const exports = await db.query(`
            SELECT 
                export_id, dataset, format,
                CONCAT(users.first_name, ' ', users.last_name) as requested_by,
                requested_at, status, records_count, download_url, retention_until
            FROM exports
            LEFT JOIN users ON exports.requested_by = users.user_id
            ORDER BY requested_at DESC
        `);

        res.json({ exports: exports.rows });

    } catch (error) {
        console.error('Error fetching exports:', error);
        res.status(500).json({ error: 'Failed to fetch exports' });
    }
});

/**
 * POST /api/admin/exports
 */
router.post('/exports', async (req, res) => {
    try {
        const { dataset, format, filters } = req.body;

        const result = await db.query(`
            INSERT INTO exports 
            (dataset, format, requested_by, requested_at, status, filters_applied)
            VALUES ($1, $2, $3, NOW(), 'Queued', $4)
            RETURNING export_id
        `, [dataset, format, req.user.user_id, JSON.stringify(filters || {})]);

        try { req.app.locals.emitter?.emit('update', { topic: 'exports', action: 'create', id: result.rows[0].export_id }); } catch (e) {}
        res.status(201).json({ success: true, export_id: result.rows[0].export_id });

    } catch (error) {
        console.error('Error creating export:', error);
        res.status(500).json({ error: 'Failed to create export' });
    }
});

/**
 * GET /api/admin/exports/:id/download
 */
router.get('/exports/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const exportRecord = await db.query(
            'SELECT * FROM exports WHERE export_id = $1',
            [id]
        );

        if (exportRecord.rows.length === 0) {
            return res.status(404).json({ error: 'Export not found' });
        }

        // This would serve the file - implementation depends on storage
        res.download(exportRecord.rows[0].download_url);

    } catch (error) {
        console.error('Error downloading export:', error);
        res.status(500).json({ error: 'Failed to download export' });
    }
});

export default router;
