import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Verify official role
const requireOfficial = (req, res, next) => {
    if (req.user?.role !== 'official') {
        return res.status(403).json({ error: 'Official access required' });
    }
    next();
};

router.use(authenticate);
router.use(requireOfficial);

// GET /api/official/profile - Get official's profile data
router.get('/profile', async (req, res) => {
    try {
        const officialId = req.user.id;

        const result = await db.query(
            `SELECT 
                o.official_id, 
                o.full_name, 
                o.position, 
                o.term_start, 
                o.term_end, 
                o.contact_number, 
                o.email, 
                o.address, 
                o.purok_zone,
                o.status,
                o.office_hours,
                o.assigned_puroks,
                o.emergency_contact,
                o.bio
            FROM officials o
            JOIN users u ON o.user_id = u.id
            WHERE u.id = $1`,
            [officialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Official profile not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching official profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/dashboard - Get dashboard overview data
router.get('/dashboard', async (req, res) => {
    try {
        const officialId = req.user.id;

        // Get counts
        const countResults = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM complaints WHERE assigned_to_official_id = $1 AND status != 'resolved') as complaint_count,
                (SELECT COUNT(*) FROM documents WHERE required_approval_from_id = $1 AND status = 'pending') as approval_count,
                (SELECT COUNT(*) FROM events WHERE DATE(event_date) >= CURRENT_DATE AND status = 'published') as event_count,
                (SELECT COUNT(*) FROM announcements WHERE status = 'published') as announcement_count,
                (SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND is_read = FALSE) as message_count
            `,
            [officialId]
        );

        const counts = countResults.rows[0];

        // Get recent tasks
        const tasksResult = await db.query(
            `SELECT id, type, title, assigned_date, status
            FROM official_tasks
            WHERE official_id = $1 AND status IN ('pending', 'in_progress')
            ORDER BY assigned_date DESC
            LIMIT 5`,
            [officialId]
        );

        // Get recent activity
        const activitiesResult = await db.query(
            `SELECT action_type, description, timestamp
            FROM activity_logs
            WHERE actor_id = $1 OR target_official_id = $1
            ORDER BY timestamp DESC
            LIMIT 10`,
            [officialId]
        );

        // Get upcoming events
        const eventsResult = await db.query(
            `SELECT id, title, event_date, venue, organizer
            FROM events
            WHERE DATE(event_date) >= CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT 5`,
            []
        );

        // Get notifications
        const notificationsResult = await db.query(
            `SELECT id, title, priority, created_at
            FROM notifications
            WHERE recipient_official_id = $1
            ORDER BY created_at DESC
            LIMIT 5`,
            [officialId]
        );

        // Get resident statistics
        const statsResult = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM residents) as total_residents,
                (SELECT COUNT(*) FROM residents WHERE DATE(date_registered) >= CURRENT_DATE - INTERVAL '30 days') as new_registrations,
                (SELECT COUNT(*) FROM residents WHERE flags IS NOT NULL AND flags != '{}') as flagged_households,
                (SELECT COUNT(*) FROM documents WHERE status = 'pending' AND required_approval_from_id = $1) as pending_documents
            `,
            [officialId]
        );

        const stats = statsResult.rows[0];

        res.json({
            complaintCount: parseInt(counts.complaint_count),
            approvalCount: parseInt(counts.approval_count),
            eventCount: parseInt(counts.event_count),
            announcementCount: parseInt(counts.announcement_count),
            messageCount: parseInt(counts.message_count),
            tasks: tasksResult.rows,
            activities: activitiesResult.rows,
            upcomingEvents: eventsResult.rows,
            notifications: notificationsResult.rows,
            totalResidents: parseInt(stats.total_residents),
            newRegistrations: parseInt(stats.new_registrations),
            flaggedHouseholds: parseInt(stats.flagged_households),
            pendingDocuments: parseInt(stats.pending_documents)
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/tasks - Get all tasks assigned to official
router.get('/tasks', async (req, res) => {
    try {
        const officialId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT id, type, title, description, assigned_date, status, priority
            FROM official_tasks
            WHERE official_id = $1
            ORDER BY assigned_date DESC
            LIMIT $2 OFFSET $3`,
            [officialId, limit, offset]
        );

        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/complaints - Get assigned complaints
router.get('/complaints', async (req, res) => {
    try {
        const officialId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const statusFilter = req.query.status || '';

        let query = `SELECT 
            c.id as complaint_id,
            c.reference_id,
            r.first_name || ' ' || r.last_name as complainant_name,
            c.category,
            c.date_reported,
            c.status,
            c.priority
        FROM complaints c
        JOIN residents r ON c.resident_id = r.id
        WHERE c.assigned_to_official_id = $1`;

        const params = [officialId];

        if (statusFilter) {
            query += ` AND c.status = $2`;
            params.push(statusFilter);
        }

        query += ` ORDER BY c.date_reported DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({ complaints: result.rows });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/official/complaints/:id/status - Update complaint status
router.patch('/complaints/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const officialId = req.user.id;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        // Update complaint
        await db.query(
            `UPDATE complaints 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND assigned_to_official_id = $3`,
            [status, id, officialId]
        );

        // Log to audit trail
        await db.query(
            `INSERT INTO audit_logs (actor_user_id, action_type, target_type, target_id, details, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                officialId,
                'complaint_status_update',
                'complaint',
                id,
                JSON.stringify({ new_status: status, notes: notes || null }),
                req.ip
            ]
        );

        try { req.app.locals.emitter?.emit('update', { topic: 'complaints', action: 'update', id, payload: { status } }); } catch (e) {}
        res.json({ success: true, message: 'Complaint status updated' });
    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/official/complaints/:id/comment - Add comment to complaint
router.post('/complaints/:id/comment', async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const officialId = req.user.id;

        if (!comment) {
            return res.status(400).json({ error: 'Comment is required' });
        }

        await db.query(
            `INSERT INTO complaint_comments (complaint_id, commenter_id, comment_text, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [id, officialId, comment]
        );

        try { req.app.locals.emitter?.emit('update', { topic: 'complaints', action: 'comment', id, payload: { comment, commenter: officialId } }); } catch (e) {}
        res.json({ success: true, message: 'Comment added' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/approvals - Get documents awaiting approval
router.get('/approvals', async (req, res) => {
    try {
        const officialId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || 'pending';

        const result = await db.query(
            `SELECT id, document_type, requester_name, date_requested, purpose, status
            FROM documents
            WHERE required_approval_from_id = $1 AND status = $2
            ORDER BY date_requested DESC
            LIMIT $3 OFFSET $4`,
            [officialId, status, limit, offset]
        );

        res.json({ approvals: result.rows });
    } catch (error) {
        console.error('Error fetching approvals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/official/approvals/:id - Approve or reject document
router.patch('/approvals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body;
        const officialId = req.user.id;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        await db.query(
            `UPDATE documents
            SET status = $1, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND required_approval_from_id = $3`,
            [newStatus, id, officialId]
        );

        // Log to audit trail
        await db.query(
            `INSERT INTO audit_logs (actor_user_id, action_type, target_type, target_id, details, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                officialId,
                `document_${action}ed`,
                'document',
                id,
                JSON.stringify({ reason: reason || null }),
                req.ip
            ]
        );

        try { req.app.locals.emitter?.emit('update', { topic: 'documents', action: newStatus === 'approved' ? 'approve' : 'reject', id, payload: { officialId } }); } catch (e) {}
        res.json({ success: true, message: `Document ${newStatus}` });
    } catch (error) {
        console.error('Error updating approval:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/events - Get events
router.get('/events', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT id, title, event_date, venue, organizer, 
                (SELECT COUNT(*) FROM event_registrations WHERE event_id = events.id) as participant_count,
                (SELECT rsvp_status FROM event_rsvps WHERE event_id = events.id AND official_id = $1) as official_rsvp
            FROM events
            WHERE DATE(event_date) >= CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        res.json({ events: result.rows });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/official/events/:id/rsvp - RSVP to event
router.post('/events/:id/rsvp', async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;
        const officialId = req.user.id;

        if (!['attending', 'not_attending', 'maybe'].includes(response)) {
            return res.status(400).json({ error: 'Invalid RSVP response' });
        }

        await db.query(
            `INSERT INTO event_rsvps (event_id, official_id, rsvp_status, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (event_id, official_id) DO UPDATE SET rsvp_status = $3`,
            [id, officialId, response]
        );

        try { req.app.locals.emitter?.emit('update', { topic: 'events', action: 'rsvp', id, payload: { officialId, response } }); } catch (e) {}
        res.json({ success: true, message: 'RSVP submitted' });
    } catch (error) {
        console.error('Error submitting RSVP:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/announcements - Get announcements
router.get('/announcements', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT id, title, content, creator_name, created_at, status
            FROM announcements
            WHERE status = 'published'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({ announcements: result.rows });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/official/announcements - Create announcement
router.post('/announcements', async (req, res) => {
    try {
        const { title, content, audience } = req.body;
        const officialId = req.user.id;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const result = await db.query(
            `INSERT INTO announcements (title, content, creator_id, audience, status, created_at)
            VALUES ($1, $2, $3, $4, 'published', CURRENT_TIMESTAMP)
            RETURNING id`,
            [title, content, officialId, audience || 'all']
        );

        // Log to audit trail
        await db.query(
            `INSERT INTO audit_logs (actor_user_id, action_type, target_type, target_id, ip_address)
            VALUES ($1, $2, $3, $4, $5)`,
            [officialId, 'announcement_created', 'announcement', result.rows[0].id, req.ip]
        );

        try { req.app.locals.emitter?.emit('update', { topic: 'announcements', action: 'create', id: result.rows[0].id, payload: { title, audience } }); } catch (e) {}
        res.json({ success: true, announcement_id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/residents - Get residents in assigned puroks
router.get('/residents', async (req, res) => {
    try {
        const officialId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // First get official's assigned puroks
        const officialResult = await db.query(
            `SELECT assigned_puroks FROM officials
            WHERE user_id = $1`,
            [officialId]
        );

        if (officialResult.rows.length === 0) {
            return res.status(404).json({ error: 'Official not found' });
        }

        const assignedPuroks = officialResult.rows[0].assigned_puroks || [];

        const result = await db.query(
            `SELECT id as resident_id, first_name, last_name, date_of_birth, purok, 
                contact_number, status, flags, address
            FROM residents
            WHERE purok = ANY($1)
            ORDER BY last_name, first_name
            LIMIT $2 OFFSET $3`,
            [assignedPuroks, limit, offset]
        );

        res.json({ residents: result.rows });
    } catch (error) {
        console.error('Error fetching residents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/official/reports - Get reports and statistics
router.get('/reports', async (req, res) => {
    try {
        const officialId = req.user.id;

        const complaintStats = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated
            FROM complaints
            WHERE assigned_to_official_id = $1`,
            [officialId]
        );

        const avgResponseTime = await db.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
            FROM complaints
            WHERE assigned_to_official_id = $1 AND status = 'resolved'`,
            [officialId]
        );

        const slaCompliance = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600 <= 48 THEN 1 ELSE 0 END) as sla_met
            FROM complaints
            WHERE assigned_to_official_id = $1 AND status = 'resolved'`,
            [officialId]
        );

        const auditTrail = await db.query(
            `SELECT action_type as action, target_type as record_type, target_id as record_id, 
                details, timestamp
            FROM audit_logs
            WHERE actor_user_id = $1
            ORDER BY timestamp DESC
            LIMIT 10`,
            [officialId]
        );

        const complain = complaintStats.rows[0];
        const avgResp = avgResponseTime.rows[0];
        const sla = slaCompliance.rows[0];

        res.json({
            totalComplaints: parseInt(complain.total),
            resolvedComplaints: parseInt(complain.resolved) || 0,
            inProgressComplaints: parseInt(complain.in_progress) || 0,
            escalatedComplaints: parseInt(complain.escalated) || 0,
            avgResponseTime: `${Math.round(avgResp.avg_hours || 0)} hours`,
            slaCompliance: `${Math.round((parseInt(sla.sla_met) / parseInt(sla.total)) * 100 || 0)}%`,
            auditTrail: auditTrail.rows
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
