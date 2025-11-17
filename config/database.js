// ============================================================================
// Database Connection Module for CockroachDB
// ============================================================================

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Error handler for pool
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('✓ Database connected successfully at:', result.rows[0].now);
    }
});

// Helper to run queries
export const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`Query took ${duration}ms: ${text.substring(0, 50)}...`);
        }
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        console.error('Query:', text);
        throw error;
    }
};

// Helper for transactions
export const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Get pool for raw operations
export const getPool = () => pool;

export default pool;
