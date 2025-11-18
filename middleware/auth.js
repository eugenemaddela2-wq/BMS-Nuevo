// ============================================================================
// Authentication Middleware
// ============================================================================

import { verifyToken, hashToken } from '../config/auth.js';
import { query } from '../config/database.js';

// ============================================================================
// JWT Verification Middleware
// ============================================================================

export const authenticate = async (req, res, next) => {
    try {
        // Support tokens in header OR query parameter (SSE / EventSource can't set headers)
        const token = req.headers.authorization?.split(' ')[1] || req.query?.token || req.body?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No authorization token provided'
            });
        }
        
        const decoded = verifyToken(token, 'access');
        // Check session state to ensure token hasn't been revoked
        try {
            const tokenHash = hashToken(token);
            const sessionRes = await query('SELECT revoked_at, expires_at FROM sessions WHERE token_hash = $1', [tokenHash]);
            if (sessionRes.rows.length === 0) {
                // If session row is not found, treat as invalid
                return res.status(401).json({ success: false, error: 'Invalid session' });
            }
            const sessionRow = sessionRes.rows[0];
            if (sessionRow.revoked_at || (sessionRow.expires_at && new Date(sessionRow.expires_at) < new Date())) {
                return res.status(401).json({ success: false, error: 'Session revoked or expired' });
            }
        } catch (sessErr) {
            // If session lookup fails, proceed cautiously by rejecting the token
            console.error('Session lookup error:', sessErr.message);
            return res.status(401).json({ success: false, error: 'Invalid session' });
        }
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

// ============================================================================
// Role-Based Authorization Middleware
// ============================================================================

export const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }
        
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        
        next();
    };
};

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

const loginAttempts = new Map();

export const rateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const key = identifier || req.ip;
        const attempts = loginAttempts.get(key) || { count: 0, timestamp: Date.now() };
        
        // Reset if window has passed
        if (Date.now() - attempts.timestamp > windowMs) {
            attempts.count = 0;
            attempts.timestamp = Date.now();
        }
        
        if (attempts.count >= maxAttempts) {
            const remainingTime = Math.ceil((windowMs - (Date.now() - attempts.timestamp)) / 1000);
            return res.status(429).json({
                success: false,
                error: `Too many attempts. Try again in ${remainingTime} seconds.`
            });
        }
        
        req.recordAttempt = () => {
            attempts.count++;
            loginAttempts.set(key, attempts);
        };
        
        next();
    };
};

// ============================================================================
// Request Logging Middleware
// ============================================================================

export const logRequest = async (req, res, next) => {
    req.startTime = Date.now();
    
    res.on('finish', async () => {
        if (req.user) {
            try {
                await query(
                    `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, ip_address, user_agent)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        req.user.userId,
                        req.method,
                        req.route?.path || req.path,
                        '',
                        JSON.stringify({ statusCode: res.statusCode }),
                        req.ip,
                        req.get('user-agent')
                    ]
                );
            } catch (error) {
                console.error('Error logging request:', error.message);
            }
        }
    });
    
    next();
};

// ============================================================================
// CORS Middleware (already in server but can be customized here)
// ============================================================================

export const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
    optionsSuccessStatus: 200
};

// ============================================================================
// Error Handling Middleware
// ============================================================================

export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// ============================================================================
// Validation Middleware
// ============================================================================

export const validateRequestBody = (requiredFields = []) => {
    return (req, res, next) => {
        const missing = requiredFields.filter(field => !req.body[field]);
        
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(', ')}`
            });
        }
        
        next();
    };
};

// ============================================================================
// Audit Trail Middleware
// ============================================================================

export const auditTrail = (actionType) => {
    return async (req, res, next) => {
        res.on('finish', async () => {
            if (res.statusCode < 400 && req.user) {
                try {
                    await query(
                        `INSERT INTO audit_logs (user_id, action_type, resource_type, details, ip_address, user_agent, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                        [
                            req.user.userId,
                            actionType,
                            req.path,
                            JSON.stringify({ body: req.body, query: req.query }),
                            req.ip,
                            req.get('user-agent')
                        ]
                    );
                } catch (error) {
                    console.error('Audit trail error:', error.message);
                }
            }
        });
        next();
    };
};
