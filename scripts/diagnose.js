/**
 * Diagnostic Script - Check Database and Authentication Status
 * Usage: node scripts/diagnose.js
 */

import dotenv from 'dotenv';
import { query } from '../config/database.js';

dotenv.config();

async function diagnose() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          BMS AUTHENTICATION DIAGNOSTIC                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // ========== Check Database Connection ==========
        console.log('📊 [1/5] Checking Database Connection...');
        try {
            const connTest = await query('SELECT NOW()');
            console.log('✅ Database connected successfully');
            console.log(`   Timestamp: ${connTest.rows[0].now}\n`);
        } catch (error) {
            console.error('❌ Database connection failed!');
            console.error(`   Error: ${error.message}`);
            console.error('   Make sure DATABASE_URL is set correctly in .env\n');
            process.exit(1);
        }

        // ========== Check Tables Exist ==========
        console.log('📋 [2/5] Checking Database Tables...');
        try {
            const tables = await query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            
            if (tables.rows.length === 0) {
                console.error('❌ No tables found in database!');
                console.error('   Run migrations first: node scripts/migrate.js\n');
            } else {
                console.log(`✅ Found ${tables.rows.length} tables:`);
                tables.rows.forEach(t => console.log(`   • ${t.table_name}`));
                console.log('');
            }
        } catch (error) {
            console.error('❌ Failed to check tables:', error.message, '\n');
        }

        // ========== Check Users Table ==========
        console.log('👤 [3/5] Checking Users in Database...');
        try {
            const users = await query('SELECT id, username, email, role, status FROM users');
            
            if (users.rows.length === 0) {
                console.error('❌ NO USERS FOUND in database!');
                console.error('   This is why login fails. Run: node scripts/seed-test-users.js\n');
            } else {
                console.log(`✅ Found ${users.rows.length} user(s):`);
                users.rows.forEach(u => {
                    console.log(`   • ${u.username} (${u.email}) - Role: ${u.role}, Status: ${u.status}`);
                });
                console.log('');
            }
        } catch (error) {
            console.error('❌ Failed to query users:', error.message, '\n');
        }

        // ========== Check Admin User ==========
        console.log('🔐 [4/5] Checking Admin User...');
        try {
            const admin = await query(
                'SELECT id, username, email, role, status, verified_at FROM users WHERE username = $1',
                ['admin']
            );
            
            if (admin.rows.length === 0) {
                console.error('❌ Admin user NOT found in database!');
                console.error('   Username "admin" does not exist\n');
            } else {
                const user = admin.rows[0];
                console.log('✅ Admin user found:');
                console.log(`   • ID: ${user.id}`);
                console.log(`   • Username: ${user.username}`);
                console.log(`   • Email: ${user.email}`);
                console.log(`   • Role: ${user.role}`);
                console.log(`   • Status: ${user.status}`);
                console.log(`   • Verified: ${user.verified_at ? 'Yes' : 'No'}\n`);
            }
        } catch (error) {
            console.error('❌ Failed to check admin:', error.message, '\n');
        }

        // ========== Check Configuration ==========
        console.log('⚙️  [5/5] Checking Configuration...');
        console.log(`✅ Configuration Status:`);
        console.log(`   • DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
        console.log(`   • JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Not set'}`);
        console.log(`   • PORT: ${process.env.PORT || 5000}`);
        console.log(`   • NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

        // ========== Summary ==========
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                    DIAGNOSIS SUMMARY                   ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('If you see "Admin user NOT found", run:');
        console.log('  → node scripts/seed-test-users.js');
        console.log('');
        console.log('If you see "NO USERS FOUND", run:');
        console.log('  → node scripts/migrate.js (create tables)');
        console.log('  → node scripts/seed-test-users.js (create admin)');
        console.log('');

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

diagnose().then(() => process.exit(0));
