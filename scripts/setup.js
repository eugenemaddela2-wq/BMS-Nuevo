#!/usr/bin/env node

/**
 * Automatic Setup Script - Initialize Everything
 * Usage: node scripts/setup.js
 * Runs: Diagnosis → Migration → Seeding
 */

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        const script = spawn('node', [path.join(__dirname, `${scriptName}.js`)], {
            stdio: 'inherit',
            cwd: __dirname
        });

        script.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${scriptName} exited with code ${code}`));
        });
    });
}

async function setup() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          BMS-NUEVO AUTOMATIC SETUP                    ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        console.log('🔍 Step 1: Running Diagnostics...\n');
        await runScript('diagnose');

        console.log('\n');
        console.log('🔧 Step 2: Creating Database Tables...\n');
        await runScript('migrate');

        console.log('\n');
        console.log('🌱 Step 3: Seeding Test Users...\n');
        await runScript('seed-test-users');

        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ SETUP COMPLETE!                     ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('Next Steps:');
        console.log('1. Start server: npm run dev');
        console.log('2. Open browser: http://localhost:5000/login.html');
        console.log('3. Login with:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setup().then(() => process.exit(0));
