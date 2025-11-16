/**
 * Database Initialization Module
 * Automatically creates tables and seeds test users on first run
 * Runs automatically when server starts - no manual commands needed
 */

import { query, transaction } from './database.js';
import { hashPassword } from '../config/auth.js';

/**
 * Check if initialization has already been done
 */
async function isInitialized() {
    try {
        const result = await query(
            `SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'users'
            )`
        );
        return result.rows[0].exists;
    } catch (error) {
        return false;
    }
}

/**
 * Create all database tables
 */
async function createTables() {
    console.log('📊 Creating database tables...');
    
    try {
        // Users table
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                date_of_birth DATE,
                phone_number VARCHAR(20),
                purok VARCHAR(255),
                role VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                verified_at TIMESTAMP,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ users table created');

        // Login attempts table
        await query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                identifier VARCHAR(255),
                attempt_at TIMESTAMP DEFAULT NOW(),
                ip_address VARCHAR(45),
                user_agent TEXT,
                success BOOLEAN DEFAULT false
            )
        `);
        console.log('  ✓ login_attempts table created');

        // Sessions table
        await query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                token_hash VARCHAR(255),
                refresh_token_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                remember_me BOOLEAN DEFAULT false,
                expires_at TIMESTAMP,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ sessions table created');

        // Audit logs table
        await query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action_type VARCHAR(100),
                resource_type VARCHAR(100),
                resource_id VARCHAR(255),
                details JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ audit_logs table created');

        // Residents table
        await query(`
            CREATE TABLE IF NOT EXISTS residents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                date_of_birth DATE,
                purok VARCHAR(255),
                contact_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ residents table created');

        // Officials table
        await query(`
            CREATE TABLE IF NOT EXISTS officials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                position VARCHAR(255),
                office VARCHAR(255),
                phone_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✓ officials table created');

        console.log('✅ All tables created successfully\n');
        return true;

    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        throw error;
    }
}

/**
 * Seed test users into database
 */
async function seedTestUsers() {
    console.log('🌱 Seeding test users...');

    const testUsers = [
        {
            username: 'admin',
            email: 'eugenemaddela9@gmail.com',
            password: 'admin123',
            firstName: 'Eugene',
            lastName: 'Maddela',
            dateOfBirth: '2005-09-30',
            phoneNumber: '09987654321',
            purok: 'Zone 4',
            role: 'admin',
            status: 'active',
            verified: true,
            lastLogin: new Date()
        },
        {
            username: 'official1',
            email: 'official@bms.local',
            password: 'Official@123',
            firstName: 'Maria',
            lastName: 'Santos',
            dateOfBirth: '1992-03-15',
            phoneNumber: '09234567890',
            purok: 'Zone 1',
            role: 'official',
            status: 'active',
            verified: true,
            lastLogin: null
        },
        {
            username: 'resident1',
            email: 'resident@bms.local',
            password: 'Resident@123',
            firstName: 'Juan',
            lastName: 'dela Cruz',
            dateOfBirth: '1995-06-20',
            phoneNumber: '09345678901',
            purok: 'Purok 1',
            role: 'resident',
            status: 'active',
            verified: true,
            lastLogin: null
        }
    ];

    for (const user of testUsers) {
        try {
            // Check if user exists
            const existingUser = await query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [user.username.toLowerCase(), user.email.toLowerCase()]
            );

            if (existingUser.rows.length > 0) {
                console.log(`  ℹ️  ${user.username} already exists, skipping...`);
                continue;
            }

            // Hash password
            const hashedPassword = await hashPassword(user.password);

            // Create user with transaction
            const result = await transaction(async (client) => {
                // Insert user
                const userResult = await client.query(
                    `INSERT INTO users (username, email, password_hash, first_name, last_name, date_of_birth, phone_number, purok, role, status, verified_at, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                     RETURNING id, username, email, role, status`,
                    [
                        user.username.toLowerCase(),
                        user.email.toLowerCase(),
                        hashedPassword,
                        user.firstName,
                        user.lastName,
                        user.dateOfBirth,
                        user.phoneNumber,
                        user.purok,
                        user.role,
                        user.status
                    ]
                );

                const newUser = userResult.rows[0];

                // Create appropriate profile based on role
                if (user.role === 'resident') {
                    await client.query(
                        `INSERT INTO residents (user_id, first_name, last_name, date_of_birth, purok, contact_number, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                        [newUser.id, user.firstName, user.lastName, user.dateOfBirth, user.purok, user.phoneNumber]
                    );
                } else if (user.role === 'official') {
                    await client.query(
                        `INSERT INTO officials (user_id, first_name, last_name, position, office, phone_number, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                        [newUser.id, user.firstName, user.lastName, 'Barangay Official', 'Official Office', user.phoneNumber]
                    );
                }

                // Log the action
                await client.query(
                    `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, ip_address, user_agent, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [
                        'SYSTEM_INIT_USER',
                        'users',
                        newUser.id,
                        JSON.stringify({ username: user.username, email: user.email, role: user.role }),
                        'SYSTEM',
                        'database-init.js'
                    ]
                );

                return newUser;
            });

            console.log(`  ✅ Created ${user.role.toUpperCase()}: ${result.username}`);

        } catch (error) {
            console.error(`  ❌ Failed to create ${user.username}:`, error.message);
        }
    }

    console.log('✅ Test users seeding complete\n');
}

/**
 * Initialize database on startup
 */
export async function initializeDatabase() {
    try {
        console.log('\n🔧 Database Initialization Starting...\n');

        // Check if already initialized
        const initialized = await isInitialized();
        
        if (initialized) {
            console.log('✅ Database already initialized\n');
            return true;
        }

        console.log('⚠️  First run detected - initializing database...\n');

        // Create tables
        await createTables();

        // Seed test users
        await seedTestUsers();

        console.log('🎉 Database initialization complete!\n');
        console.log('📋 Ready to login with:');
        console.log('   Username: admin');
        console.log('   Password: admin123\n');

        return true;

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('\n⚠️  Server will continue but login will not work');
        console.error('    Please check your DATABASE_URL configuration\n');
        return false;
    }
}

export default initializeDatabase;
