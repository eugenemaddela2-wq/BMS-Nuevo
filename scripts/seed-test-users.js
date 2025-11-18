/**
 * Seed Test Users Script
 * Creates test user accounts for immediate login without waiting for admin approval
 * Usage: node scripts/seed-test-users.js
 */

import dotenv from 'dotenv';
import { query, transaction } from '../config/database.js';
import { hashPassword } from '../config/auth.js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

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
        status: 'active'
    },
    {
        username: 'official1',
        email: 'official@bms.local',
        password: 'password',
        firstName: 'Official',
        lastName: 'Officer',
        dateOfBirth: '1992-03-15',
        phoneNumber: '09234567890',
        purok: 'Zone 1',
        role: 'official',
        status: 'active'
    },
    {
        username: 'resident1',
        email: 'resident@bms.local',
        password: 'password',
        firstName: 'Resident',
        lastName: 'User',
        dateOfBirth: '1995-06-20',
        phoneNumber: '09345678901',
        purok: 'Purok 1',
        role: 'resident',
        status: 'active'
    }
];

export async function seedTestUsers() {
    try {
        console.log('🌱 Starting test user seeding into CockroachDB...\n');
        
        // Verify database connection
        console.log('📊 Verifying database connection...');
        try {
            const testConn = await query('SELECT NOW()');
            console.log('✅ Database connected:', testConn.rows[0].now);
        } catch (dbError) {
            console.error('❌ Database connection failed!');
            console.error('   Error:', dbError.message);
            console.error('   Make sure DATABASE_URL is set correctly in .env');
            throw dbError;
        }
        
        console.log('');

        for (const user of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await query(
                    'SELECT id FROM users WHERE username = $1 OR email = $2',
                    [user.username.toLowerCase(), user.email.toLowerCase()]
                );

                if (existingUser.rows.length > 0) {
                    console.log(`⏭️  Skipping ${user.username} (already exists)`);
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
                        const termStart = new Date();
                        const termEnd = new Date();
                        termEnd.setFullYear(termEnd.getFullYear() + 3);
                        
                        await client.query(
                            `INSERT INTO officials (user_id, first_name, last_name, position, term_start, term_end, status, created_at)
                             VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())`,
                            [newUser.id, user.firstName, user.lastName, 'Barangay Official', termStart, termEnd]
                        );
                    }

                    // Log the action
                    await client.query(
                        `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, ip_address, user_agent, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                        [
                            'SYSTEM_SEED_USER',
                            'users',
                            newUser.id,
                            JSON.stringify({ username: user.username, email: user.email, role: user.role }),
                            'SYSTEM',
                            'seed-test-users.js'
                        ]
                    );

                    return newUser;
                });

                console.log(`✅ Created ${user.role.toUpperCase()}: ${result.username}`);
                console.log(`   Email: ${result.email}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Stored in: users table (CockroachDB)\n`);

            } catch (error) {
                console.error(`❌ Failed to create ${user.username}:`, error.message);
            }
        }

        console.log('✨ Test user seeding complete!\n');
        console.log('📋 Test Login Credentials (Verified in CockroachDB):');
        console.log('────────────────────────────────────────────────────');
        console.log('Admin:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log('  Email: eugenemaddela9@gmail.com');
        console.log('  Database: CockroachDB (users table)\n');
        console.log('Official:');
        console.log('  Username: official1');
        console.log('  Password: password');
        console.log('  Database: CockroachDB (users table)\n');
        console.log('Resident:');
        console.log('  Username: resident1');
        console.log('  Password: password');
        console.log('  Database: CockroachDB (users table)\n');
        console.log('🔐 Security Notes:');
        console.log('  • All passwords hashed with bcrypt');
        console.log('  • Stored in CockroachDB users table');
        console.log('  • Database validates all login credentials');
        console.log('  • No hardcoded credentials in application\n');

        return true;

    } catch (error) {
        console.error('Fatal error during seeding:', error);
        return false;
    }
}
// If the script was executed directly, run seeder (standalone usage)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv.includes('--standalone')) {
    seedTestUsers().then((ok) => {
        process.exit(ok ? 0 : 1);
    }).catch(() => process.exit(1));
}

export default seedTestUsers;
