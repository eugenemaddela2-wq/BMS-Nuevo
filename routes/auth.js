// ============================================================================
// Authentication Routes
// ============================================================================

import express from 'express';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../config/database.js';
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    validateUsername,
    validatePassword,
    validatePhoneNumber,
    validateAge,
    isValidEmail,
    calculateAge,
    verifyToken
} from '../config/auth.js';
import { authenticate, authorize, rateLimit, auditTrail, validateRequestBody } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// REGISTER ROUTE
// ============================================================================

router.post('/api/auth/register', rateLimit('register', 10, 60000), async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            dateOfBirth,
            purok,
            phoneNumber,
            username,
            email,
            password,
            acceptedTerms,
            acceptedPrivacy
        } = req.body;

        // ========== Validation ==========
        
        // Check required fields
        const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'purok', 'phoneNumber', 'username', 'email', 'password'];
        const missing = requiredFields.filter(field => !req.body[field]);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(', ')}`
            });
        }

        // Validate terms and privacy
        if (!acceptedTerms || !acceptedPrivacy) {
            return res.status(400).json({
                success: false,
                error: 'You must accept Terms & Conditions and Privacy Policy'
            });
        }

        // Validate username
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: usernameValidation.errors[0]
            });
        }

        // Validate email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: passwordValidation.errors[0]
            });
        }

        // Validate phone
        if (!validatePhoneNumber(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use 09XXXXXXXXX or +639XXXXXXXXX'
            });
        }

        // Validate age
        const ageValidation = validateAge(dateOfBirth, 16, 90);
        if (!ageValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: ageValidation.error
            });
        }

        // ========== Database Checks ==========
        
        // Check if username exists
        const usernameResult = await query(
            'SELECT id FROM users WHERE username = $1',
            [username.toLowerCase()]
        );
        if (usernameResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Username already taken'
            });
        }

        // Check if email exists
        const emailResult = await query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        if (emailResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // ========== Create User ==========
        
        const hashedPassword = await hashPassword(password);

        const result = await transaction(async (client) => {
            // Insert user
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, date_of_birth, phone_number, purok, role, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id, username, email, status, created_at`,
                [
                    username.toLowerCase(),
                    email.toLowerCase(),
                    hashedPassword,
                    firstName,
                    lastName,
                    dateOfBirth,
                    phoneNumber,
                    purok,
                    'resident',
                    'pending'
                ]
            );

            const newUser = userResult.rows[0];

            // Create resident profile
            await client.query(
                `INSERT INTO residents (user_id, first_name, last_name, date_of_birth, purok, contact_number)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newUser.id, firstName, lastName, dateOfBirth, purok, phoneNumber]
            );

            // Log the action
            await client.query(
                `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, ip_address, user_agent, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                    'USER_REGISTRATION',
                    'users',
                    newUser.id,
                    JSON.stringify({ email, username }),
                    req.ip,
                    req.get('user-agent')
                ]
            );

            return newUser;
        });

        // ========== Response ==========
        
        res.status(201).json({
            success: true,
            message: 'Registration successful. Your account is pending admin approval.',
            referenceId: result.id,
            email: result.email,
            status: result.status
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// ============================================================================
// LOGIN ROUTE
// ============================================================================

router.post('/api/auth/login', rateLimit('login', 5, 15 * 60 * 1000), async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        // Validate inputs
        if (!username || !password) {
            req.recordAttempt?.();
            return res.status(400).json({
                success: false,
                error: 'Username/Email and password are required'
            });
        }

        // ========== Find User ==========
        
        const userResult = await query(
            `SELECT id, username, email, password_hash, role, status, verified_at
             FROM users
             WHERE (LOWER(username) = $1 OR LOWER(email) = $1)`,
            [username.toLowerCase().trim()]
        );

        if (userResult.rows.length === 0) {
            // Record failed attempt
            await query(
                `INSERT INTO login_attempts (identifier, attempt_at, ip_address, user_agent, success)
                 VALUES ($1, NOW(), $2, $3, $4)`,
                [username, req.ip, req.get('user-agent'), false]
            );
            req.recordAttempt?.();
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const user = userResult.rows[0];

        // ========== Check Account Status ==========
        
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                error: 'Account pending approval',
                referenceId: user.id
            });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({
                success: false,
                error: 'Account has been rejected'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Account is not active'
            });
        }

        // ========== Verify Password ==========
        
        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            // Record failed attempt
            await query(
                `INSERT INTO login_attempts (identifier, attempt_at, ip_address, user_agent, success)
                 VALUES ($1, NOW(), $2, $3, $4)`,
                [user.username, req.ip, req.get('user-agent'), false]
            );
            req.recordAttempt?.();
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // ========== Generate Tokens ==========
        
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);

        // ========== Store Session ==========
        
        const sessionResult = await query(
            `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, remember_me, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
             RETURNING id`,
            [
                user.id,
                hashToken(accessToken),
                hashToken(refreshToken),
                req.ip,
                req.get('user-agent'),
                rememberMe || false
            ]
        );

        // ========== Update Last Login ==========
        
        await query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1',
            [user.id]
        );

        // ========== Record Successful Login ==========
        
        await query(
            `INSERT INTO login_attempts (identifier, attempt_at, ip_address, user_agent, success)
             VALUES ($1, NOW(), $2, $3, $4)`,
            [user.username, req.ip, req.get('user-agent'), true]
        );

        // ========== Response ==========
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// ============================================================================
// REFRESH TOKEN ROUTE
// ============================================================================

router.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        // Verify refresh token format
        const decoded = verifyToken(refreshToken, 'refresh');

        // Generate new access token
        const newAccessToken = generateAccessToken(decoded.userId);

        res.json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
});

// ============================================================================
// LOGOUT ROUTE
// ============================================================================

router.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            await query(
                'UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1',
                [hashToken(token)]
            );
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// ============================================================================
// CHECK USERNAME AVAILABILITY (for registration form)
// ============================================================================

router.get('/api/auth/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const result = await query(
            'SELECT id FROM users WHERE LOWER(username) = $1',
            [username.toLowerCase()]
        );

        res.json({
            success: true,
            available: result.rows.length === 0
        });

    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({
            success: false,
            error: 'Check failed'
        });
    }
});

// ============================================================================
// CHECK EMAIL AVAILABILITY (for registration form)
// ============================================================================

router.get('/api/auth/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const result = await query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [email.toLowerCase()]
        );

        res.json({
            success: true,
            available: result.rows.length === 0
        });

    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({
            success: false,
            error: 'Check failed'
        });
    }
});

// ============================================================================
// GET REGISTRATION STATUS
// ============================================================================

router.get('/api/auth/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await query(
            `SELECT id, email, status, created_at, verified_at, rejected_at, rejection_reason
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            status: user.status,
            email: user.email,
            referenceId: user.id,
            createdAt: user.created_at,
            verifiedAt: user.verified_at,
            rejectedAt: user.rejected_at,
            rejectionReason: user.rejection_reason
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Status check failed'
        });
    }
});

// ============================================================================
// CURRENT USER PROFILE
// ============================================================================

router.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, username, email, first_name, last_name, role, status
             FROM users
             WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Profile fetch failed'
        });
    }
});

// ============================================================================
// GET CURRENT USER PROFILE WITH ROLE-SPECIFIC DATA
// ============================================================================

router.get('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get user basic info
        const userResult = await query(
            `SELECT id, username, email, first_name, last_name, role, status
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];
        const profile = {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                fullName: `${user.first_name} ${user.last_name}`,
                role: user.role,
                status: user.status
            }
        };

        // Get role-specific data
        if (user.role === 'official' || user.role === 'clerk') {
            const officialResult = await query(
                `SELECT position, first_name, last_name, office, phone_number
                 FROM officials
                 WHERE user_id = $1`,
                [userId]
            );
            
            if (officialResult.rows.length > 0) {
                const official = officialResult.rows[0];
                profile.user.position = official.position;
                profile.user.office = official.office;
                profile.user.phoneNumber = official.phone_number;
            }
        } else if (user.role === 'resident') {
            const residentResult = await query(
                `SELECT purok, contact_number, sex, civil_status
                 FROM residents
                 WHERE user_id = $1`,
                [userId]
            );
            
            if (residentResult.rows.length > 0) {
                const resident = residentResult.rows[0];
                profile.user.purok = resident.purok;
                profile.user.contactNumber = resident.contact_number;
                profile.user.sex = resident.sex;
                profile.user.civilStatus = resident.civil_status;
            }
        }

        res.json(profile);

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Profile fetch failed'
        });
    }
});

export default router;
