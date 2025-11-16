/**
 * Seed Test Users Script
 * Creates test user accounts for immediate login without waiting for admin approval
 * Usage: node scripts/seed-test-users.js
 */

import dotenv from 'dotenv';
import { query, transaction } from '../config/database.js';
import { hashPassword } from '../config/auth.js';

dotenv.config();

const testUsers = [
    {
        username: 'admin',
        email: 'admin@bms.local',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        phoneNumber: '09123456789',
        purok: 'Admin Zone',
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

async function seedTestUsers() {
    try {
        console.log('🌱 Starting test user seeding...\n');

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
                console.log(`   Status: ${result.status}\n`);

            } catch (error) {
                console.error(`❌ Failed to create ${user.username}:`, error.message);
            }
        }

        console.log('✨ Test user seeding complete!\n');
        console.log('📋 Test Login Credentials:');
        console.log('────────────────────────────');
        console.log('Admin:');
        console.log('  Username: admin');
        console.log('  Password: admin123\n');
        console.log('Official:');
        console.log('  Username: official1');
        console.log('  Password: password\n');
        console.log('Resident:');
        console.log('  Username: resident1');
        console.log('  Password: password\n');

        process.exit(0);

    } catch (error) {
        console.error('Fatal error during seeding:', error);
        process.exit(1);
    }
}

// Run the seeding
seedTestUsers();
