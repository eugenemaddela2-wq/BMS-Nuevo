/**
 * Create Official Account Script
 * Creates a new official account with complete credentials
 * Usage: node create-official-account.js
 */

import { query, transaction } from './config/database.js';
import { hashPassword } from './config/auth.js';

async function createOfficialAccount() {
    const newOfficial = {
        username: 'kapitan',
        email: 'kapitan@bms.local',
        password: 'Kapitan@2025',
        firstName: 'Justin',
        lastName: 'Urbi',
        dateOfBirth: '1988-07-15',
        phoneNumber: '09567891234',
        purok: 'Zone 1',
        position: 'Kapitan/Head',
        termStart: '2024-01-01',
        termEnd: '2028-01-01',
        role: 'official',
        status: 'active',
        verified: true
    };

    try {
        console.log('\n🔐 Creating Official Account...\n');

        // Check if user already exists
        const existingUser = await query(
            'SELECT id, username FROM users WHERE username = $1 OR email = $2',
            [newOfficial.username.toLowerCase(), newOfficial.email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            console.log(`❌ User "${newOfficial.username}" already exists!`);
            console.log(`   Username: ${existingUser.rows[0].username}`);
            return false;
        }

        // Hash password
        const hashedPassword = await hashPassword(newOfficial.password);

        // Create user and profile using transaction
        const result = await transaction(async (client) => {
            // Insert user
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, date_of_birth, phone_number, purok, role, status, verified_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
                 RETURNING id, username, email, role, status, first_name, last_name`,
                [
                    newOfficial.username.toLowerCase(),
                    newOfficial.email.toLowerCase(),
                    hashedPassword,
                    newOfficial.firstName,
                    newOfficial.lastName,
                    newOfficial.dateOfBirth,
                    newOfficial.phoneNumber,
                    newOfficial.purok,
                    newOfficial.role,
                    newOfficial.status
                ]
            );

            const newUser = userResult.rows[0];

            // Create official profile
            const officialResult = await client.query(
                `INSERT INTO officials (user_id, first_name, last_name, position, term_start, term_end, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                 RETURNING id, user_id, first_name, last_name, position, term_start, term_end, status`,
                [
                    newUser.id,
                    newOfficial.firstName,
                    newOfficial.lastName,
                    newOfficial.position,
                    newOfficial.termStart,
                    newOfficial.termEnd,
                    'active'
                ]
            );

            // Log the action
            await client.query(
                `INSERT INTO audit_logs (action_type, resource_type, resource_id, details, ip_address, user_agent, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                    'CREATE_OFFICIAL_ACCOUNT',
                    'users',
                    newUser.id,
                    JSON.stringify({
                        username: newUser.username,
                        email: newUser.email,
                        firstName: newUser.first_name,
                        lastName: newUser.last_name,
                        position: newOfficial.position,
                        role: newUser.role
                    }),
                    'SCRIPT',
                    'create-official-account.js'
                ]
            );

            return {
                user: newUser,
                official: officialResult.rows[0]
            };
        });

        console.log('✅ Official account created successfully!\n');
        console.log('📋 Account Details:');
        console.log(`   Full Name: ${result.user.first_name} ${result.user.last_name}`);
        console.log(`   Position: ${newOfficial.position}`);
        console.log(`   Term: ${newOfficial.termStart} to ${newOfficial.termEnd}`);
        console.log(`   Purok: ${newOfficial.purok}\n`);
        console.log('🔓 Login Credentials:');
        console.log(`   Username: ${result.user.username}`);
        console.log(`   Email: ${result.user.email}`);
        console.log(`   Password: ${newOfficial.password}`);
        console.log(`   Phone: ${newOfficial.phoneNumber}`);
        console.log(`   Date of Birth: ${newOfficial.dateOfBirth}\n`);
        console.log(`   User ID: ${result.user.id}`);
        console.log(`   Role: ${result.user.role}`);
        console.log(`   Status: ${result.user.status}\n`);
        console.log('🎉 Account ready to use!\n');

        return true;

    } catch (error) {
        console.error('❌ Error creating official account:', error.message);
        console.error('   Details:', error);
        return false;
    }
}

// Run the script
createOfficialAccount().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
