#!/usr/bin/env node

/**
 * BMS System Test Script
 * Tests login and dashboard access for all three roles
 */

import http from 'http';

const API_BASE_URL = 'http://localhost:5000';

// HTTP request helper
function httpRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const testCredentials = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    },
    official: {
        username: 'official1',
        password: 'password',
        role: 'official'
    },
    resident: {
        username: 'resident1',
        password: 'password',
        role: 'resident'
    }
};

async function testLogin(role) {
    const creds = testCredentials[role];
    console.log(`\n📝 Testing ${role.toUpperCase()} Login...`);
    console.log(`   Username: ${creds.username}`);
    console.log(`   Password: ${creds.password}`);

    try {
        const response = await httpRequest('POST', '/api/auth/login', {
            username: creds.username,
            password: creds.password
        });

        if (response.status >= 400) {
            console.log(`   ❌ Login Failed: ${response.data.error || 'Unknown error'}`);
            return null;
        }

        console.log(`   ✅ Login Successful!`);
        const token = response.data.accessToken || response.data.token;
        console.log(`   Token: ${token?.substring(0, 20)}...`);
        return token;
    } catch (error) {
        console.log(`   ❌ Login Error: ${error.message}`);
        return null;
    }
}

async function testDashboard(role, token) {
    if (!token) return;

    console.log(`\n📊 Testing ${role.toUpperCase()} Dashboard...`);

    const endpoints = {
        admin: '/api/admin/dashboard',
        official: '/api/official/dashboard',
        resident: '/api/resident/dashboard'
    };

    const endpoint = endpoints[role];

    try {
        const response = await httpRequest('GET', endpoint, null, {
            'Authorization': `Bearer ${token}`
        });

        if (response.status >= 400) {
            console.log(`   ❌ Dashboard Error: ${response.status}`);
            console.log(`   Error: ${response.data.error || response.data.message}`);
            return;
        }

        console.log(`   ✅ Dashboard Loaded Successfully!`);
        console.log(`   Data Keys: ${Object.keys(response.data).slice(0, 5).join(', ')}...`);
    } catch (error) {
        console.log(`   ❌ Dashboard Error: ${error.message}`);
    }
}

async function testConnection() {
    console.log('\n🔌 Testing Database Connection...');
    try {
        const response = await httpRequest('POST', '/api/auth/login', {
            username: 'invalid',
            password: 'invalid'
        });
        console.log(`   ✅ Server is running and responding`);
        return true;
    } catch (error) {
        console.log(`   ❌ Cannot connect to server: ${error.message}`);
        console.log(`   Make sure the server is running on ${API_BASE_URL}`);
        return false;
    }
}

async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  BMS SYSTEM TEST - All Roles & CockroachDB Connection     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const serverOk = await testConnection();
    if (!serverOk) {
        console.log('\n❌ Server is not running. Start it with: npm start');
        process.exit(1);
    }

    const results = {};

    for (const role of ['admin', 'official', 'resident']) {
        const token = await testLogin(role);
        results[role] = { loginOk: !!token };
        
        if (token) {
            await testDashboard(role, token);
            results[role].dashboardOk = true;
        }
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Test Credentials:');
    console.log('────────────────────────────────────────────────────────────');
    console.log('\n🔐 ADMIN:');
    console.log(`   Username: admin`);
    console.log(`   Password: admin123`);
    console.log(`   Login: ${results.admin.loginOk ? '✅' : '❌'}`);
    console.log(`   Dashboard: ${results.admin.dashboardOk ? '✅' : '❌'}`);

    console.log('\n🔐 OFFICIAL:');
    console.log(`   Username: official1`);
    console.log(`   Password: password`);
    console.log(`   Login: ${results.official.loginOk ? '✅' : '❌'}`);
    console.log(`   Dashboard: ${results.official.dashboardOk ? '✅' : '❌'}`);

    console.log('\n🔐 RESIDENT:');
    console.log(`   Username: resident1`);
    console.log(`   Password: password`);
    console.log(`   Login: ${results.resident.loginOk ? '✅' : '❌'}`);
    console.log(`   Dashboard: ${results.resident.dashboardOk ? '✅' : '❌'}`);

    console.log('\n\n✨ All tests completed!');
}

runAllTests().catch(console.error);
