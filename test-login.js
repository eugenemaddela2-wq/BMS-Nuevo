/**
 * Test Login Script - Tests login for Admin, Official, and Resident
 */

const BASE_URL = 'http://localhost:5000';

const testUsers = [
    {
        role: 'ADMIN',
        username: 'admin',
        password: 'admin123'
    },
    {
        role: 'OFFICIAL',
        username: 'official1',
        password: 'password'
    },
    {
        role: 'RESIDENT',
        username: 'resident1',
        password: 'password'
    }
];

async function testLogin(user) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 Testing ${user.role} Login`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${user.password}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: user.username,
                password: user.password,
                rememberMe: false
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.log(`❌ Login Failed (${response.status})`);
            console.log(`Error: ${data.error}`);
            return null;
        }

        console.log(`✅ Login Successful!`);
        console.log(`\nResponse Details:`);
        console.log(`  • User ID: ${data.user?.id}`);
        console.log(`  • Username: ${data.user?.username}`);
        console.log(`  • Email: ${data.user?.email}`);
        console.log(`  • Role: ${data.user?.role}`);
        console.log(`  • Status: ${data.user?.status}`);
        console.log(`\nToken Details:`);
        console.log(`  • Access Token Length: ${data.accessToken?.length || 0} chars`);
        console.log(`  • Token Type: Bearer`);

        return {
            ...user,
            token: data.accessToken,
            userId: data.user?.id,
            email: data.user?.email
        };
    } catch (error) {
        console.log(`❌ Request Failed`);
        console.log(`Error: ${error.message}`);
        return null;
    }
}

async function testDashboard(user) {
    if (!user.token) return;

    const dashboardUrl = `${BASE_URL}/api/${user.role.toLowerCase()}/dashboard`;
    
    console.log(`\n📊 Testing ${user.role} Dashboard Endpoint`);
    console.log(`URL: ${dashboardUrl}`);

    try {
        const response = await fetch(dashboardUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const data = await response.json();
            console.log(`❌ Dashboard Request Failed (${response.status})`);
            console.log(`Error: ${data.error}`);
            return;
        }

        const data = await response.json();
        console.log(`✅ Dashboard Data Retrieved!`);
        console.log(`  • Response Size: ${JSON.stringify(data).length} bytes`);
        console.log(`  • Keys: ${Object.keys(data).slice(0, 5).join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
    } catch (error) {
        console.log(`❌ Dashboard Request Error`);
        console.log(`Error: ${error.message}`);
    }
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       BMS LOGIN & DASHBOARD TEST                           ║');
    console.log('║       Testing Admin, Official & Resident Accounts           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Server: ${BASE_URL}`);
    console.log(`Test Started: ${new Date().toLocaleString()}`);

    const results = [];

    for (const user of testUsers) {
        const loginResult = await testLogin(user);
        if (loginResult) {
            results.push(loginResult);
            await testDashboard(loginResult);
        }
    }

    // Summary
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📋 TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nTotal Tests: ${testUsers.length}`);
    console.log(`Successful: ${results.length}`);
    console.log(`Failed: ${testUsers.length - results.length}`);

    if (results.length > 0) {
        console.log('\n✅ VALID TEST CREDENTIALS (Ready for Deployment):');
        console.log('────────────────────────────────────────────────────\n');
        
        results.forEach(user => {
            console.log(`${user.role.toUpperCase()}:`);
            console.log(`  Username: ${user.username}`);
            console.log(`  Password: ${user.password}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  User ID: ${user.userId}`);
            console.log(`  Dashboard: /api/${user.role.toLowerCase()}/dashboard\n`);
        });
    }

    console.log(`Test Completed: ${new Date().toLocaleString()}\n`);
}

// Run tests
runTests().catch(console.error);
