import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Verify resident role
const requireResident = (req, res, next) => {
    if (req.user?.role !== 'resident') {
        return res.status(403).json({ error: 'Resident access required' });
    }
    next();
};

/**
 * ==========================================
 * RESIDENT DASHBOARD API ENDPOINTS
 * ==========================================
 */

/**
 * GET /api/resident/dashboard - Get dashboard summary
 */
router.get('/dashboard', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        
        // Get resident profile
        const profile = await db.query(
            'SELECT id, first_name, last_name, date_of_birth, sex, purok, address, contact_number, email, household_id, occupation, marital_status, national_id FROM residents WHERE id = $1',
            [residentId]
        );
        
        if (profile.rows.length === 0) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        
        const resident = profile.rows[0];
        
        // Get active complaints count
        const complaintsCount = await db.query(
            'SELECT COUNT(*) as count FROM complaints WHERE resident_id = $1 AND status != $2',
            [residentId, 'closed']
        );
        
        // Get pending document requests
        const documentsCount = await db.query(
            'SELECT COUNT(*) as count FROM document_requests WHERE resident_id = $1 AND status NOT IN ($2, $3)',
            [residentId, 'completed', 'cancelled']
        );
        
        // Get upcoming events
        const upcomingEvents = await db.query(
            'SELECT id, title, event_date FROM events WHERE event_date >= NOW() ORDER BY event_date LIMIT 3',
            []
        );
        
        // Get unread announcements
        const announcements = await db.query(
            'SELECT id, title, created_at FROM announcements WHERE created_at >= NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC LIMIT 5',
            []
        );
        
        // Get recent activity
        const recentActivity = await db.query(
            `SELECT 'complaint' as type, id, status, created_at FROM complaints WHERE resident_id = $1
             UNION ALL
             SELECT 'document' as type, id, status, created_at FROM document_requests WHERE resident_id = $1
             ORDER BY created_at DESC LIMIT 10`,
            [residentId]
        );
        
        // Get unread messages count
        const messagesCount = await db.query(
            'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND read_at IS NULL',
            [residentId]
        );
        
        res.json({
            resident: {
                id: resident.id,
                fullName: `${resident.first_name} ${resident.last_name}`,
                firstName: resident.first_name,
                lastName: resident.last_name,
                dateOfBirth: resident.date_of_birth,
                sex: resident.sex,
                purok: resident.purok,
                address: resident.address,
                contact: resident.contact_number,
                email: resident.email,
                householdId: resident.household_id,
                occupation: resident.occupation,
                maritalStatus: resident.marital_status
            },
            summary: {
                activeComplaints: complaintsCount.rows[0].count,
                pendingDocuments: documentsCount.rows[0].count,
                upcomingEvents: upcomingEvents.rows.length,
                unreadMessages: messagesCount.rows[0].count,
                unreadAnnouncements: announcements.rows.length
            },
            upcomingEvents: upcomingEvents.rows,
            announcements: announcements.rows,
            recentActivity: recentActivity.rows
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/profile - Get full profile
 */
router.get('/profile', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        
        const result = await db.query(
            `SELECT id, first_name, last_name, date_of_birth, sex, purok, address, contact_number, email, 
                    household_id, occupation, marital_status, national_id, photo_url, created_at 
             FROM residents WHERE id = $1`,
            [residentId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        
        try { req.app.locals.emitter?.emit('update', { topic: 'residents', action: 'update', id: residentId, payload: result.rows[0] }); } catch (e) {}
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/resident/profile - Update profile
 */
router.patch('/profile', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { occupation, maritalStatus, contactNumber, email } = req.body;
        
        const result = await db.query(
            `UPDATE residents 
             SET occupation = COALESCE($1, occupation),
                 marital_status = COALESCE($2, marital_status),
                 contact_number = COALESCE($3, contact_number),
                 email = COALESCE($4, email),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [occupation, maritalStatus, contactNumber, email, residentId]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/household - Get household members
 */
router.get('/household', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        
        const result = await db.query(
            `SELECT id, household_id, first_name, last_name, date_of_birth, sex, relation, status 
             FROM household_members 
             WHERE household_id = (SELECT household_id FROM residents WHERE id = $1)
             ORDER BY created_at`,
            [residentId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Household error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/resident/household - Add household member
 */
router.post('/household', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { firstName, lastName, dateOfBirth, sex, relation } = req.body;
        
        // Get household ID for resident
        const resident = await db.query(
            'SELECT household_id FROM residents WHERE id = $1',
            [residentId]
        );
        
        if (resident.rows.length === 0) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        
        const householdId = resident.rows[0].household_id;
        
        const result = await db.query(
            `INSERT INTO household_members (household_id, first_name, last_name, date_of_birth, sex, relation, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active')
             RETURNING *`,
            [householdId, firstName, lastName, dateOfBirth, sex, relation]
        );
        
        try { req.app.locals.emitter?.emit('update', { topic: 'household', action: 'create', id: result.rows[0].id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add household member error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/complaints - Get complaints
 */
router.get('/complaints', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { status } = req.query;
        
        let query = 'SELECT * FROM complaints WHERE resident_id = $1';
        const params = [residentId];
        
        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Complaints error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/resident/complaints - File a complaint
 */
router.post('/complaints', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { category, subject, description, location, attachments, confidential } = req.body;
        
        const result = await db.query(
            `INSERT INTO complaints (resident_id, category, subject, description, location, attachments, confidential, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
             RETURNING *`,
            [residentId, category, subject, description, location, JSON.stringify(attachments), confidential]
        );
        
        try { req.app.locals.emitter?.emit('update', { topic: 'complaints', action: 'create', id: result.rows[0].id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('File complaint error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/complaints/:id - Get complaint detail
 */
router.get('/complaints/:id', authenticate, requireResident, async (req, res) => {
    try {
        const { id } = req.params;
        const residentId = req.user.id;
        
        const result = await db.query(
            'SELECT * FROM complaints WHERE id = $1 AND resident_id = $2',
            [id, residentId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Complaint detail error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/documents - Get document requests
 */
router.get('/documents', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        
        const result = await db.query(
            `SELECT id, document_type, status, submitted_at, expected_date, file_url 
             FROM document_requests 
             WHERE resident_id = $1 
             ORDER BY submitted_at DESC`,
            [residentId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Documents error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/resident/documents - Request document
 */
router.post('/documents', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { documentType, purpose, attachments } = req.body;
        
        const result = await db.query(
            `INSERT INTO document_requests (resident_id, document_type, purpose, attachments, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING *`,
            [residentId, documentType, purpose, JSON.stringify(attachments)]
        );
        
        try { req.app.locals.emitter?.emit('update', { topic: 'documents', action: 'create', id: result.rows[0].id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Request document error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/events - Get events
 */
router.get('/events', authenticate, requireResident, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, description, event_date, venue, attendee_count, photo_url 
             FROM events 
             WHERE event_date >= NOW() 
             ORDER BY event_date ASC`,
            []
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/resident/events/:id/register - Register for event
 */
router.post('/events/:id/register', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { eventId } = req.params;
        const { attendeeCount, specialRequirements } = req.body;
        
        const result = await db.query(
            `INSERT INTO event_registrations (event_id, resident_id, attendee_count, special_requirements)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [eventId, residentId, attendeeCount, specialRequirements]
        );
        
        try { req.app.locals.emitter?.emit('update', { topic: 'events', action: 'register', id: eventId, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Event registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/announcements - Get announcements
 */
router.get('/announcements', authenticate, requireResident, async (req, res) => {
    try {
        const { purok } = req.query;
        
        let query = `SELECT id, title, content, created_at, attachments, author_id 
                     FROM announcements 
                     WHERE created_at >= NOW() - INTERVAL '30 days'`;
        const params = [];
        
        if (purok) {
            query += ' AND (purok = $1 OR purok IS NULL)';
            params.push(purok);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Announcements error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/resident/messages - Get messages/inbox
 */
router.get('/messages', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        
        const result = await db.query(
            `SELECT id, sender_id, subject, message, created_at, read_at 
             FROM messages 
             WHERE recipient_id = $1 
             ORDER BY created_at DESC`,
            [residentId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/resident/messages - Send message
 */
router.post('/messages', authenticate, requireResident, async (req, res) => {
    try {
        const residentId = req.user.id;
        const { recipientId, subject, message } = req.body;
        
        const result = await db.query(
            `INSERT INTO messages (sender_id, recipient_id, subject, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [residentId, recipientId, subject, message]
        );
        
        try { req.app.locals.emitter?.emit('update', { topic: 'messages', action: 'create', id: result.rows[0].id, payload: result.rows[0] }); } catch (e) {}
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
