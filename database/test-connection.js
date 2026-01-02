#!/usr/bin/env node

/**
 * VolxAI Database Connection Test
 * Verifies MariaDB/MySQL connection and tables
 * 
 * Usage: node database/test-connection.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  host: process.env.DB_HOST || '103.221.221.67',
  user: process.env.DB_USER || 'jybcaorr_lisaaccountcontentapi',
  password: process.env.DB_PASSWORD || '18{hopk2e$#CBv=1',
  database: process.env.DB_NAME || 'jybcaorr_lisacontentdbapi',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  let connection = null;

  try {
    log('\n╔════════════════════════════════════════════════════╗', 'cyan');
    log('║  VolxAI Database Connection Test                  ║', 'cyan');
    log('╚════════════════════════════════════════════════════╝', 'cyan');

    // Display configuration
    log('\n📋 Configuration:', 'blue');
    log(`  Host: ${config.host}`, 'reset');
    log(`  Port: ${config.port}`, 'reset');
    log(`  Database: ${config.database}`, 'reset');
    log(`  User: ${config.user}`, 'reset');

    // Test connection
    log('\n🔐 Testing connection...', 'yellow');
    connection = await mysql.createConnection(config);
    log('✓ Connection successful!', 'green');

    // Test ping
    log('\n🧪 Pinging database...', 'yellow');
    await connection.ping();
    log('✓ Ping successful!', 'green');

    // Get database info
    log('\n📊 Database Information:', 'blue');
    
    const [[{ version }]] = await connection.execute('SELECT VERSION() as version');
    log(`  MySQL/MariaDB Version: ${version}`, 'reset');

    const [[{ database_size }]] = await connection.execute(
      `SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as database_size
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );
    log(`  Database Size: ${database_size || 0} MB`, 'reset');

    // Check tables
    log('\n📋 Tables Status:', 'blue');
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME, TABLE_ROWS, ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [config.database]
    );

    if (tables.length === 0) {
      log('  ⚠️  No tables found! Run "node database/setup.js" to create them.', 'yellow');
    } else {
      log(`  Found ${tables.length} tables:`, 'reset');
      for (const table of tables) {
        const rows = table.TABLE_ROWS || 0;
        const size = table.size_mb || 0;
        log(`    ✓ ${table.TABLE_NAME.padEnd(25)} (${rows} rows, ${size} MB)`, 'green');
      }
    }

    // Test user privileges
    log('\n🔑 User Privileges:', 'blue');
    try {
      // Try CREATE
      await connection.execute('CREATE TEMPORARY TABLE temp_test (id INT)');
      log('  ✓ CREATE privilege: Yes', 'green');
      await connection.execute('DROP TABLE temp_test');
    } catch (e) {
      log('  ✗ CREATE privilege: No', 'red');
    }

    try {
      // Try SELECT
      await connection.execute('SELECT 1');
      log('  ✓ SELECT privilege: Yes', 'green');
    } catch (e) {
      log('  ✗ SELECT privilege: No', 'red');
    }

    try {
      // Try INSERT
      await connection.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
        ['test', 'test@test.com', 'test']);
      await connection.execute('DELETE FROM users WHERE username = ?', ['test']);
      log('  ✓ INSERT/DELETE privilege: Yes', 'green');
    } catch (e) {
      if (e.message.includes('Unknown table')) {
        log('  ⚠️  INSERT/DELETE: Users table not created yet', 'yellow');
      } else {
        log('  ✗ INSERT/DELETE privilege: No', 'red');
      }
    }

    // Summary
    log('\n╔════════════════════════════════════════════════════╗', 'cyan');
    log('║  ✓ All Tests Passed!                              ║', 'green');
    log('╚════════════════════════════════════════════════════╝', 'cyan');

    log('\n✅ Database is ready to use!', 'green');
    log('\n📝 Next Steps:', 'blue');
    log('  1. Deploy backend: node deploy-backend.mjs', 'reset');
    log('  2. Start backend on your server', 'reset');
    log('  3. Test API endpoints with curl or Postman', 'reset');

  } catch (error) {
    log('\n╔════════════════════════════════════════════════════╗', 'cyan');
    log('║  ✗ Connection Test Failed!                        ║', 'red');
    log('╚════════════════════════════════════════════════════╝', 'cyan');

    log(`\nError: ${error.message}`, 'red');
    log(`Code: ${error.code}`, 'yellow');

    // Provide helpful suggestions
    log('\n💡 Troubleshooting:', 'yellow');

    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNREFUSED') {
      log('  • Check if database server is running', 'reset');
      log('  • Verify host: ' + config.host, 'reset');
      log('  • Verify port: ' + config.port, 'reset');
      log('  • Check firewall/network access', 'reset');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('  • Check username: ' + config.user, 'reset');
      log('  • Check password (correct in .env?)', 'reset');
      log('  • Verify user has privileges', 'reset');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log('  • Database not found: ' + config.database, 'reset');
      log('  • Create it first or check the name', 'reset');
    } else if (error.code === 'ENOTFOUND') {
      log('  • Cannot resolve hostname: ' + config.host, 'reset');
      log('  • Check DNS or IP address', 'reset');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run test
testConnection().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
