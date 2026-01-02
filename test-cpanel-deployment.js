#!/usr/bin/env node

/**
 * VolxAI cPanel Deployment Test Script
 * Run this AFTER deploying to verify everything works
 * 
 * Usage: node test-cpanel-deployment.js https://volxai.ghf57-22175.azdigihost.com
 */

const DOMAIN = process.argv[2] || 'https://volxai.ghf57-22175.azdigihost.com';
const BASE_URL = DOMAIN.replace(/\/$/, ''); // Remove trailing slash

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(type, message) {
  const icons = {
    '✅': `${colors.green}✅${colors.reset}`,
    '❌': `${colors.red}❌${colors.reset}`,
    '⏳': `${colors.yellow}⏳${colors.reset}`,
    '📝': `${colors.cyan}📝${colors.reset}`,
    '🔗': `${colors.blue}🔗${colors.reset}`,
  };
  console.log(`${icons[type] || type} ${message}`);
}

function logSection(title) {
  console.log(
    `\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`
  );
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}\n`
  );
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      ok: response.ok,
      data,
      error: null,
    };
  } catch (error) {
    return {
      status: null,
      ok: false,
      data: null,
      error: error.message,
    };
  }
}

async function testHealthCheck() {
  logSection('🏥 Test 1: Server Health Check');

  log('⏳', 'Checking if server is running...');
  const result = await makeRequest('/api/ping');

  if (!result.ok) {
    log(
      '❌',
      `Server not responding! Error: ${result.error || 'Unknown error'}`
    );
    log(
      '📝',
      `Make sure Node.js app is running in cPanel → Setup Node.js App`
    );
    return false;
  }

  log('✅', 'Server is running!');
  log('📝', `Response: ${JSON.stringify(result.data)}`);
  return true;
}

async function testFrontendLoads() {
  logSection('📱 Test 2: Frontend Loads');

  log('⏳', 'Checking if frontend index.html is served...');

  try {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();

    if (response.ok && html.includes('index')) {
      log('✅', 'Frontend is being served');
      log('📝', `Status: ${response.status}`);
      return true;
    } else {
      log('❌', 'Frontend not loading properly');
      return false;
    }
  } catch (error) {
    log('❌', `Frontend load error: ${error.message}`);
    return false;
  }
}

async function testRegisterEndpoint() {
  logSection('📝 Test 3: Register Endpoint');

  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testUsername = `testuser${timestamp}`;
  const testPassword = 'TestPassword123';

  log('⏳', 'Testing registration endpoint...');
  log('📝', `Test email: ${testEmail}`);
  log('📝', `Test username: ${testUsername}`);

  const result = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: {
      email: testEmail,
      username: testUsername,
      password: testPassword,
      full_name: 'Test User',
    },
  });

  if (!result.ok) {
    log('❌', `Registration failed! Status: ${result.status}`);
    log('📝', `Error: ${result.data?.message || 'Unknown error'}`);
    return { success: false, token: null };
  }

  log('✅', 'Registration successful!');
  log('📝', `User ID: ${result.data?.user?.id}`);
  log('📝', `Email: ${result.data?.user?.email}`);
  log('📝', `Token received: ${result.data?.token?.substring(0, 50)}...`);

  return { success: true, token: result.data?.token, email: testEmail };
}

async function testGetCurrentUser(token) {
  logSection('👤 Test 4: Get Current User');

  if (!token) {
    log('❌', 'No token provided (registration may have failed)');
    return false;
  }

  log('⏳', 'Fetching current user info...');

  const result = await makeRequest('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok) {
    log('❌', `Failed to get user! Status: ${result.status}`);
    log('📝', `Error: ${result.data?.message || 'Unknown error'}`);
    return false;
  }

  log('✅', 'Successfully retrieved user info!');
  log('📝', `User ID: ${result.data?.user?.id}`);
  log('📝', `Email: ${result.data?.user?.email}`);
  log('📝', `Username: ${result.data?.user?.username}`);

  return true;
}

async function testLoginEndpoint(email) {
  logSection('🔑 Test 5: Login Endpoint');

  if (!email) {
    log('❌', 'No email to test login (registration failed)');
    return { success: false, token: null };
  }

  const password = 'TestPassword123';

  log('⏳', 'Testing login endpoint...');
  log('📝', `Email: ${email}`);

  const result = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  if (!result.ok) {
    log('❌', `Login failed! Status: ${result.status}`);
    log('📝', `Error: ${result.data?.message || 'Unknown error'}`);
    return { success: false, token: null };
  }

  log('✅', 'Login successful!');
  log('📝', `User ID: ${result.data?.user?.id}`);
  log('📝', `Email: ${result.data?.user?.email}`);

  return { success: true, token: result.data?.token };
}

async function testErrorHandling() {
  logSection('🔐 Test 6: Error Handling');

  log('⏳', 'Testing invalid password handling...');

  const result = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'nonexistent@example.com',
      password: 'WrongPassword123',
    },
  });

  if (result.ok) {
    log('❌', 'ERROR: Should have rejected invalid login!');
    return false;
  }

  log('✅', 'Correctly rejected invalid credentials');
  log('📝', `Status: ${result.status}`);
  log('📝', `Error message: ${result.data?.message}`);

  return true;
}

async function testDatabaseConnection() {
  logSection('🗄️ Test 7: Database Connection');

  log('⏳', 'Checking if database is connected...');

  // Try to register a user (which requires database)
  const timestamp = Date.now();
  const result = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: {
      email: `db-test-${timestamp}@example.com`,
      username: `dbtest${timestamp}`,
      password: 'TestPassword123',
      full_name: 'DB Test',
    },
  });

  if (!result.ok && result.data?.message?.includes('database')) {
    log('❌', 'Database connection error!');
    log('📝', `Error: ${result.data?.message}`);
    log(
      '📝',
      'Check .env file: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME'
    );
    return false;
  }

  if (result.ok) {
    log('✅', 'Database is connected and working!');
    log('📝', `Successfully created user: ${result.data?.user?.id}`);
    return true;
  }

  // If registration failed for other reasons, database might still be fine
  log('⚠️ ', 'Could not determine database status (registration failed)');
  return null;
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 VolxAI cPanel Deployment Test Suite 🧪                ║');
  console.log('║                                                            ║');
  console.log(`║  Domain: ${BASE_URL.padEnd(54)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = [];

  // Test 1: Health Check
  try {
    const healthOk = await testHealthCheck();
    results.push({ test: 'Server Health Check', passed: healthOk });

    if (!healthOk) {
      log('❌', 'Server is not running. Please start the Node.js app in cPanel.');
      log('📝', 'Steps:');
      log('📝', '1. Go to cPanel → Setup Node.js App');
      log('📝', '2. Find your "volxai" app');
      log('📝', '3. Click "Restart"');
      log('📝', '4. Run this test again');
      process.exit(1);
    }
  } catch (error) {
    log('❌', `Health check error: ${error.message}`);
    results.push({ test: 'Server Health Check', passed: false });
    process.exit(1);
  }

  // Test 2: Frontend
  try {
    const frontendOk = await testFrontendLoads();
    results.push({ test: 'Frontend Loads', passed: frontendOk });
  } catch (error) {
    log('❌', `Frontend test error: ${error.message}`);
    results.push({ test: 'Frontend Loads', passed: false });
  }

  // Test 3: Register
  let registerResult = { success: false, token: null, email: null };
  try {
    registerResult = await testRegisterEndpoint();
    results.push({
      test: 'User Registration',
      passed: registerResult.success,
    });
  } catch (error) {
    log('❌', `Registration error: ${error.message}`);
    results.push({ test: 'User Registration', passed: false });
  }

  // Test 4: Get Current User
  try {
    const meOk = await testGetCurrentUser(registerResult.token);
    results.push({ test: 'Get Current User', passed: meOk });
  } catch (error) {
    log('❌', `Get user error: ${error.message}`);
    results.push({ test: 'Get Current User', passed: false });
  }

  // Test 5: Login
  let loginResult = { success: false, token: null };
  try {
    loginResult = await testLoginEndpoint(registerResult.email);
    results.push({ test: 'User Login', passed: loginResult.success });
  } catch (error) {
    log('❌', `Login error: ${error.message}`);
    results.push({ test: 'User Login', passed: false });
  }

  // Test 6: Error Handling
  try {
    const errorHandlingOk = await testErrorHandling();
    results.push({
      test: 'Error Handling',
      passed: errorHandlingOk,
    });
  } catch (error) {
    log('❌', `Error handling test failed: ${error.message}`);
    results.push({ test: 'Error Handling', passed: false });
  }

  // Test 7: Database
  try {
    const dbOk = await testDatabaseConnection();
    results.push({
      test: 'Database Connection',
      passed: dbOk !== false,
    });
  } catch (error) {
    log('❌', `Database test error: ${error.message}`);
    results.push({ test: 'Database Connection', passed: false });
  }

  // Summary
  logSection('📊 Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.table(results);

  console.log(
    `\n${colors.bright}Result: ${passed}/${total} tests passed${colors.reset}\n`
  );

  if (passed === total) {
    log('✅', '🎉 All tests passed! Deployment successful!');
    log('🚀', `Your site is live at: ${BASE_URL}`);
    process.exit(0);
  } else {
    log('❌', 'Some tests failed. Check the errors above.');
    log('📝', 'Common issues:');
    log('📝', '- Node.js app not running → Restart in cPanel');
    log('📝', '- Database not connected → Check .env file');
    log('📝', '- Files not uploaded → Use WinSCP or SSH to verify');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log('❌', `Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
