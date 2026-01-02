#!/usr/bin/env node

/**
 * VolxAI Authentication Test Script
 * Kiểm tra chức năng đăng ký, đăng nhập, và lấy thông tin user
 */

const BASE_URL = "https://api.volxai.com";
const TIMESTAMP = Date.now();
const TEST_EMAIL = `testuser-${TIMESTAMP}@example.com`;
const TEST_USERNAME = `testuser${TIMESTAMP}`;
const TEST_PASSWORD = "TestPassword123";

let authToken = "";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(type, message) {
  const prefix = {
    "✅": `${colors.green}✅${colors.reset}`,
    "❌": `${colors.red}❌${colors.reset}`,
    "⏳": `${colors.yellow}⏳${colors.reset}`,
    "📝": `${colors.cyan}📝${colors.reset}`,
  };
  console.log(`${prefix[type] || type} ${message}`);
}

function logSection(title) {
  console.log(
    `\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`,
  );
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}\n`,
  );
}

function logJSON(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

async function makeRequest(
  endpoint,
  method = "GET",
  body = null,
  includeAuth = false,
) {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (includeAuth && authToken) {
    config.headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: null,
      statusText: error.message,
      data: null,
      ok: false,
      error: error.message,
    };
  }
}

async function testHealthCheck() {
  logSection("🏥 Test 1: Health Check");

  log("⏳", "Checking server health...");
  const result = await makeRequest("/api/ping");

  if (!result.ok) {
    log("❌", `Server is not responding! Error: ${result.statusText}`);
    log(
      "❌",
      "Make sure the backend server is running at https://api.volxai.com",
    );
    return false;
  }

  log("✅", `Server is healthy! Response: ${result.data.message}`);
  return true;
}

async function testRegister() {
  logSection("📝 Test 2: User Registration");

  const testData = {
    email: TEST_EMAIL,
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
    full_name: "Test User",
  };

  log("⏳", `Attempting to register user...`);
  log("📝", `Email: ${testData.email}`);
  log("📝", `Username: ${testData.username}`);

  const result = await makeRequest("/api/auth/register", "POST", testData);

  if (!result.ok) {
    log("❌", `Registration failed! Status: ${result.status}`);
    log("❌", `Error: ${result.data?.message || result.statusText}`);
    logJSON(result.data);
    return false;
  }

  authToken = result.data.token;
  log("✅", "Registration successful!");
  log("📝", `User ID: ${result.data.user?.id}`);
  log("📝", `Email: ${result.data.user?.email}`);
  log("📝", `Username: ${result.data.user?.username}`);
  log("📝", `Token received: ${authToken.substring(0, 50)}...`);

  return true;
}

async function testGetCurrentUser() {
  logSection("👤 Test 3: Get Current User");

  log("⏳", "Fetching current user info...");

  const result = await makeRequest("/api/auth/me", "GET", null, true);

  if (!result.ok) {
    log("❌", `Failed to get user! Status: ${result.status}`);
    log("❌", `Error: ${result.data?.message || result.statusText}`);
    return false;
  }

  log("✅", "Successfully retrieved current user!");
  log("📝", `User ID: ${result.data.user?.id}`);
  log("📝", `Email: ${result.data.user?.email}`);
  log("📝", `Username: ${result.data.user?.username}`);
  log("📝", `Created: ${result.data.user?.created_at}`);

  return true;
}

async function testLogin() {
  logSection("🔑 Test 4: User Login (New Session)");

  log("⏳", "Attempting to login with registered credentials...");

  const loginData = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  };

  const result = await makeRequest("/api/auth/login", "POST", loginData);

  if (!result.ok) {
    log("❌", `Login failed! Status: ${result.status}`);
    log("❌", `Error: ${result.data?.message || result.statusText}`);
    return false;
  }

  const newToken = result.data.token;
  log("✅", "Login successful!");
  log("📝", `User ID: ${result.data.user?.id}`);
  log("📝", `Email: ${result.data.user?.email}`);
  log("📝", `New token received: ${newToken.substring(0, 50)}...`);

  // Update authToken for subsequent requests
  authToken = newToken;

  return true;
}

async function testLogout() {
  logSection("🚪 Test 5: User Logout");

  log("⏳", "Attempting to logout...");

  const result = await makeRequest("/api/auth/logout", "POST", null, true);

  if (!result.ok) {
    log("❌", `Logout failed! Status: ${result.status}`);
    log("❌", `Error: ${result.data?.message || result.statusText}`);
    return false;
  }

  log("✅", "Logout successful!");
  log("📝", result.data.message);

  return true;
}

async function testInvalidPassword() {
  logSection("🔐 Test 6: Invalid Password (Error Handling)");

  log("⏳", "Attempting login with wrong password...");

  const invalidLoginData = {
    email: TEST_EMAIL,
    password: "WrongPassword123",
  };

  const result = await makeRequest("/api/auth/login", "POST", invalidLoginData);

  if (result.ok) {
    log("❌", "ERROR: Login should have failed with wrong password!");
    return false;
  }

  log("✅", "Correctly rejected invalid password!");
  log("📝", `Status: ${result.status}`);
  log("📝", `Error message: ${result.data?.message}`);

  return true;
}

async function testInvalidEmail() {
  logSection("📧 Test 7: Non-existent Email (Error Handling)");

  log("⏳", "Attempting login with non-existent email...");

  const invalidLoginData = {
    email: "nonexistent@example.com",
    password: TEST_PASSWORD,
  };

  const result = await makeRequest("/api/auth/login", "POST", invalidLoginData);

  if (result.ok) {
    log("❌", "ERROR: Login should have failed with non-existent email!");
    return false;
  }

  log("✅", "Correctly rejected non-existent email!");
  log("📝", `Status: ${result.status}`);
  log("📝", `Error message: ${result.data?.message}`);

  return true;
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}`);
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║     🧪 VolxAI Authentication Test Suite 🧪         ║");
  console.log("║                                                    ║");
  console.log(`║  Backend: ${BASE_URL.padEnd(42)}║`);
  console.log("╚════════════════════════════════════════════════════╝");
  console.log(colors.reset);

  const results = [];

  // Test 1: Health Check
  try {
    const healthOk = await testHealthCheck();
    results.push({ test: "Health Check", passed: healthOk });

    if (!healthOk) {
      log("❌", "Backend server is not running. Cannot continue tests.");
      process.exit(1);
    }
  } catch (error) {
    log("❌", `Health check error: ${error.message}`);
    results.push({ test: "Health Check", passed: false });
    process.exit(1);
  }

  // Test 2: Register
  try {
    const registerOk = await testRegister();
    results.push({ test: "User Registration", passed: registerOk });

    if (!registerOk) {
      log("❌", "Registration test failed. Skipping dependent tests.");
    }
  } catch (error) {
    log("❌", `Register error: ${error.message}`);
    results.push({ test: "User Registration", passed: false });
  }

  // Test 3: Get Current User
  try {
    const meOk = await testGetCurrentUser();
    results.push({ test: "Get Current User", passed: meOk });
  } catch (error) {
    log("❌", `Get user error: ${error.message}`);
    results.push({ test: "Get Current User", passed: false });
  }

  // Test 4: Login
  try {
    const loginOk = await testLogin();
    results.push({ test: "User Login", passed: loginOk });
  } catch (error) {
    log("❌", `Login error: ${error.message}`);
    results.push({ test: "User Login", passed: false });
  }

  // Test 5: Logout
  try {
    const logoutOk = await testLogout();
    results.push({ test: "User Logout", passed: logoutOk });
  } catch (error) {
    log("❌", `Logout error: ${error.message}`);
    results.push({ test: "User Logout", passed: false });
  }

  // Test 6: Invalid Password
  try {
    const invalidPassOk = await testInvalidPassword();
    results.push({ test: "Invalid Password Handling", passed: invalidPassOk });
  } catch (error) {
    log("❌", `Invalid password test error: ${error.message}`);
    results.push({ test: "Invalid Password Handling", passed: false });
  }

  // Test 7: Non-existent Email
  try {
    const invalidEmailOk = await testInvalidEmail();
    results.push({
      test: "Non-existent Email Handling",
      passed: invalidEmailOk,
    });
  } catch (error) {
    log("❌", `Invalid email test error: ${error.message}`);
    results.push({ test: "Non-existent Email Handling", passed: false });
  }

  // Summary
  logSection("📊 Test Summary");

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.table(results);

  console.log(
    `\n${colors.bright}Result: ${passed}/${total} tests passed${colors.reset}\n`,
  );

  if (passed === total) {
    log(
      "✅",
      "🎉 All tests passed! Your authentication system is working perfectly!",
    );
    process.exit(0);
  } else {
    log("❌", "Some tests failed. Please check the errors above.");
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  log("❌", `Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
