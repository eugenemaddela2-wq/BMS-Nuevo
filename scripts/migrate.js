/**
 * Database Migration Script
 * Creates all required tables in CockroachDB
 * Usage: node scripts/migrate.js
 */

import dotenv from 'dotenv';
import { query } from '../config/database.js';

dotenv.config();

const tables = [
    {
        name: 'users',
        sql: `
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
                role VARCHAR(50) NOT NULL DEFAULT 'resident',
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                verified_at TIMESTAMP,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `
    },
    {
        name: 'login_attempts',
        sql: `
            CREATE TABLE IF NOT EXISTS login_attempts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                identifier VARCHAR(255),
                attempt_at TIMESTAMP DEFAULT NOW(),
                ip_address VARCHAR(45),
                user_agent TEXT,
                success BOOLEAN DEFAULT false
            )
        `
    },
    {
        name: 'sessions',
        sql: `
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255),
                refresh_token_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                remember_me BOOLEAN DEFAULT false,
                expires_at TIMESTAMP,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `
    },
    {
        name: 'audit_logs',
        sql: `
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
        `
    },
    {
        name: 'residents',
        sql: `
            CREATE TABLE IF NOT EXISTS residents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                date_of_birth DATE,
                purok VARCHAR(255),
                contact_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `
    },
    {
        name: 'officials',
        sql: `
            CREATE TABLE IF NOT EXISTS officials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                position VARCHAR(255),
                office VARCHAR(255),
                phone_number VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `
    }
];

async function migrate() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          DATABASE MIGRATION - CREATE TABLES            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Test connection
        console.log('📊 Testing database connection...');
        await query('SELECT NOW()');
        console.log('✅ Connected to CockroachDB\n');

        // Create tables
        console.log('📋 Creating tables...\n');
        for (const table of tables) {
            try {
                await query(table.sql);
                console.log(`✅ ${table.name.toUpperCase()} table created`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⏭️  ${table.name.toUpperCase()} already exists`);
                } else {
                    console.error(`❌ Failed to create ${table.name}:`, error.message);
                }
            }
        }

        console.log('\n✨ Migration complete!\n');
        console.log('Next step: Seed test users');
        console.log('Run: node scripts/seed-test-users.js\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nMake sure DATABASE_URL is set correctly in .env\n');
        process.exit(1);
    }
}

migrate().then(() => process.exit(0));
