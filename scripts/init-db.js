// ============================================================================
// Database Initialization Script
// Setup CockroachDB schema and seed initial data
// ============================================================================

import dotenv from 'dotenv';
import { query, transaction } from '../config/database.js';
import { hashPassword } from '../config/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initializeDatabase() {
    try {
        console.log('🔄 Starting database initialization...\n');
        
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by statements and execute
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const stmt of statements) {
            if (stmt.trim()) {
                try {
                    console.log(`📝 Executing: ${stmt.substring(0, 60)}...`);
                    await query(stmt.trim());
                    await delay(100); // Small delay between statements
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log('   ℹ️  Table already exists (skipping)');
                    } else {
                        console.error('   ❌ Error:', error.message);
                    }
                }
            }
        }
        
        console.log('\n✅ Database schema initialized successfully!\n');
        
        // Note: No automatic seeding - users will register manually
        console.log('📋 Database is ready for use!');
        console.log('   • Navigate to http://localhost:5000/login.html');
        console.log('   • Register a new account as a resident');
        console.log('   • Register an official account');
        console.log('   • Create an admin account for testing\n');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase().then(() => {
    console.log('✨ Database setup complete!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
