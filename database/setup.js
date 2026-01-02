#!/usr/bin/env node

/**
 * VolxAI Database Setup Script
 * Automatically creates all tables for MariaDB/MySQL
 * 
 * Usage: node database/setup.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration
const config = {
  host: process.env.DB_HOST || '103.221.221.67',
  user: process.env.DB_USER || 'jybcaorr_lisaaccountcontentapi',
  password: process.env.DB_PASSWORD || '18{hopk2e$#CBv=1',
  database: process.env.DB_NAME || 'jybcaorr_lisacontentdbapi',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 1,
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

function logSection(title) {
  log('', 'reset');
  log('════════════════════════════════════════════════════════', 'cyan');
  log(`  ${title}`, 'cyan');
  log('════════════════════════════════════════════════════════', 'cyan');
}

async function setupDatabase() {
  let connection = null;

  try {
    logSection('VolxAI Database Setup');

    // Display configuration
    log('\n📋 Database Configuration:', 'blue');
    log(`  Host: ${config.host}`, 'reset');
    log(`  User: ${config.user}`, 'reset');
    log(`  Database: ${config.database}`, 'reset');
    log(`  Port: ${config.port}`, 'reset');

    // Connect to database
    log('\n🔐 Connecting to database...', 'yellow');
    connection = await mysql.createConnection(config);
    log('✓ Connected successfully!', 'green');

    // Read SQL file
    log('\n📖 Reading SQL schema file...', 'yellow');
    const sqlFile = path.join(__dirname, 'init.sql');
    
    if (!fs.existsSync(sqlFile)) {
      log('✗ SQL file not found: ' + sqlFile, 'red');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    log('✓ SQL file loaded successfully!', 'green');

    // Execute SQL script
    log('\n⚙️  Creating database tables...', 'yellow');
    
    // Split by semicolon and filter empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let tablesCreated = 0;
    
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
          if (tableName) {
            log(`  ✓ Created table: ${tableName}`, 'green');
            tablesCreated++;
          }
        }
      } catch (error) {
        if (!error.message.includes('already exists')) {
          log(`  ⚠ ${error.message}`, 'yellow');
        }
      }
    }

    // Verify tables
    log('\n🔍 Verifying tables...', 'yellow');
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    const expectedTables = [
      'users',
      'sessions',
      'password_reset_tokens',
      'user_subscriptions',
      'articles',
      'token_usage_history',
      'audit_logs',
    ];

    const createdTables = tables.map(row => row.TABLE_NAME);
    let allTablesCreated = true;

    for (const table of expectedTables) {
      if (createdTables.includes(table)) {
        log(`  ✓ ${table}`, 'green');
      } else {
        log(`  ✗ ${table} (missing)`, 'red');
        allTablesCreated = false;
      }
    }

    // Test connection
    log('\n🧪 Testing database connection...', 'yellow');
    await connection.ping();
    log('✓ Connection test successful!', 'green');

    // Summary
    logSection('Setup Complete! 🎉');
    
    if (allTablesCreated) {
      log('✅ All tables created successfully!', 'green');
      log(`\n📊 Created ${createdTables.length} tables:`, 'blue');
      createdTables.forEach(table => {
        log(`  • ${table}`, 'green');
      });
    } else {
      log('⚠️  Some tables may not have been created', 'yellow');
    }

    log('\n📝 Next Steps:', 'blue');
    log('  1. Deploy backend: node deploy-backend.mjs', 'reset');
    log('  2. Start backend on your server', 'reset');
    log('  3. Test API: curl http://103.221.221.67:3000/api/ping', 'reset');
    log('  4. Test registration/login on frontend', 'reset');

    log('\n📖 Documentation:', 'blue');
    log('  • Database Guide: DATABASE_SETUP.md', 'reset');
    log('  • Deployment Guide: DEPLOYMENT_SUMMARY.md', 'reset');
    log('  • Quick Start: QUICK_START_BACKEND.md', 'reset');

    log('\n✨ Database setup complete!', 'green');

  } catch (error) {
    log('\n✗ Setup failed!', 'red');
    log(`\nError: ${error.message}`, 'red');
    
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      log('\n💡 Connection lost. Check if:', 'yellow');
      log('  • Database server is running', 'reset');
      log('  • Credentials are correct', 'reset');
      log('  • Network access is allowed', 'reset');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\n💡 Access denied. Check:', 'yellow');
      log('  • Username is correct: ' + config.user, 'reset');
      log('  • Password is correct', 'reset');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log('\n💡 Database not found. Create it first:', 'yellow');
      log(`  CREATE DATABASE ${config.database};`, 'reset');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup
setupDatabase().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
