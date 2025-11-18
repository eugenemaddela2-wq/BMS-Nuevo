// ============================================================================
// Calendar Events Routes - Real-time Calendar Management
// ============================================================================

import express from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// GET ALL EVENTS (Public Calendar View)
// ============================================================================

router.get('/api/events', async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();
        
        // Get start and end of the month
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const result = await query(
            `SELECT 
                id, title, description, organizer_id, start_date, end_date, 
                venue, location, status, published_at, created_at
             FROM events
             WHERE start_date >= $1 AND start_date <= $2
             ORDER BY start_date ASC`,
            [startDate, endDate]
        );

        res.json({
            success: true,
            month,
            year,
            events: result.rows.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                startDate: event.start_date,
                endDate: event.end_date,
                organizer: event.organizer_id,
                venue: event.venue,
                location: event.location,
                status: event.status,
                publishedAt: event.published_at,
                createdAt: event.created_at
            }))
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events'
        });
    }
});

// ============================================================================
// GET EVENTS BY DATE RANGE
// ============================================================================

router.get('/api/events/range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required'
            });
        }

        const result = await query(
            `SELECT 
                id, title, description, organizer_id, start_date, end_date, 
                venue, location, status, published_at
             FROM events
             WHERE start_date >= $1 AND end_date <= $2
             ORDER BY start_date ASC`,
            [startDate, endDate]
        );

        res.json({
            success: true,
            events: result.rows
        });

    } catch (error) {
        console.error('Error fetching events by range:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events'
        });
    }
});

// ============================================================================
// GET SINGLE EVENT DETAILS
// ============================================================================

router.get('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT 
                id, title, description, organizer_id, start_date, end_date, 
                venue, location, status, published_at, created_at
             FROM events
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const event = result.rows[0];
        res.json({
            success: true,
            event: {
                id: event.id,
                title: event.title,
                description: event.description,
                organizerId: event.organizer_id,
                startDate: event.start_date,
                endDate: event.end_date,
                venue: event.venue,
                location: event.location,
                status: event.status,
                publishedAt: event.published_at,
                createdAt: event.created_at
            }
        });

    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event'
        });
    }
});

// ============================================================================
// CREATE NEW EVENT (Protected - Officials/Admins only)
// ============================================================================

router.post('/api/events', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, description, startDate, endDate, venue, location, status } = req.body;

        // Validate required fields
        if (!title || !startDate) {
            return res.status(400).json({
                success: false,
                error: 'Title and startDate are required'
            });
        }

        // Only officials and admins can create events
        const userResult = await query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        const userRole = userResult.rows[0].role;
        if (!['admin', 'official', 'clerk'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only officials and admins can create events'
            });
        }

        const result = await transaction(async (client) => {
            const eventResult = await client.query(
                `INSERT INTO events 
                 (title, description, organizer_id, start_date, end_date, venue, location, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                 RETURNING id, title, description, organizer_id, start_date, end_date, venue, location, status`,
                [title, description, userId, startDate, endDate, venue, location, status || 'draft']
            );

            const event = eventResult.rows[0];

            // Log the action
            await client.query(
                `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, actor_user_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                ['EVENT_CREATED', 'events', event.id, JSON.stringify({ title, venue }), userId]
            );

            return event;
        });

        res.status(201).json({
            success: true,
            event: result
        });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create event'
        });
    }
});

// ============================================================================
// UPDATE EVENT (Protected - Event creator or admin)
// ============================================================================

router.put('/api/events/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { title, description, startDate, endDate, venue, location, status } = req.body;

        // Check if event exists and user is authorized
        const eventResult = await query(
            'SELECT organizer_id FROM events WHERE id = $1',
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Check authorization
        const userRole = (await query('SELECT role FROM users WHERE id = $1', [userId])).rows[0]?.role;
        const isCreator = eventResult.rows[0].organizer_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You can only update your own events'
            });
        }

        const result = await transaction(async (client) => {
            const updateResult = await client.query(
                `UPDATE events 
                 SET title = COALESCE($1, title),
                     description = COALESCE($2, description),
                     start_date = COALESCE($3, start_date),
                     end_date = COALESCE($4, end_date),
                     venue = COALESCE($5, venue),
                     location = COALESCE($6, location),
                     status = COALESCE($7, status)
                 WHERE id = $8
                 RETURNING id, title, description, organizer_id, start_date, end_date, venue, location, status`,
                [title, description, startDate, endDate, venue, location, status, id]
            );

            if (updateResult.rows.length > 0) {
                // Log the action
                await client.query(
                    `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, actor_user_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    ['EVENT_UPDATED', 'events', id, JSON.stringify({ title }), userId]
                );
            }

            return updateResult.rows[0];
        });

        res.json({
            success: true,
            event: result
        });

    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update event'
        });
    }
});

// ============================================================================
// DELETE EVENT (Protected - Event creator or admin)
// ============================================================================

router.delete('/api/events/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        // Check if event exists and user is authorized
        const eventResult = await query(
            'SELECT organizer_id, title FROM events WHERE id = $1',
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const event = eventResult.rows[0];
        const userRole = (await query('SELECT role FROM users WHERE id = $1', [userId])).rows[0]?.role;
        const isCreator = event.organizer_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own events'
            });
        }

        await transaction(async (client) => {
            // Delete event
            await client.query('DELETE FROM events WHERE id = $1', [id]);

            // Log the action
                await client.query(
                    `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, actor_user_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    ['EVENT_DELETED', 'events', id, JSON.stringify({ title: event.title }), userId]
                );
        });

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete event'
        });
    }
});

// ============================================================================
// PUBLISH EVENT (Make public)
// ============================================================================

router.post('/api/events/:id/publish', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const eventResult = await query('SELECT organizer_id FROM events WHERE id = $1', [id]);

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const userRole = (await query('SELECT role FROM users WHERE id = $1', [userId])).rows[0]?.role;
        const isCreator = eventResult.rows[0].organizer_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        await query(
            `UPDATE events 
             SET status = $1, published_at = NOW()
             WHERE id = $2`,
            ['published', id]
        );

        res.json({ success: true, message: 'Event published' });

    } catch (error) {
        console.error('Error publishing event:', error);
        res.status(500).json({ success: false, error: 'Failed to publish event' });
    }
});

export default router;
