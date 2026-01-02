#!/usr/bin/env node

/**
 * Deployment script for VolxAI Website
 * Uploads built files to FTP hosting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Client from 'ssh2-sftp-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FTP Configuration
const FTP_CONFIG = {
  host: process.env.FTP_HOST || '103.221.221.67',
  username: process.env.FTP_USER || 'volxai@volxai.com',
  password: process.env.FTP_PASS || 'Qnoc7vBSy8qh+BpV',
  port: parseInt(process.env.FTP_PORT || '21', 10),
};

const LOCAL_DIRS = {
  frontend: path.join(__dirname, 'dist/spa'),
  backend: path.join(__dirname, 'dist/server'),
  env: path.join(__dirname, '.env'),
};

const REMOTE_DIRS = {
  frontend: '/public_html',
  backend: '/api',
};

const client = new Client();

async function uploadDirectory(localPath, remotePath, description) {
  try {
    if (!fs.existsSync(localPath)) {
      console.error(`✗ ${description}: Directory not found at ${localPath}`);
      return false;
    }

    console.log(`📤 Uploading ${description}...`);
    await client.uploadDir(localPath, remotePath);
    console.log(`✓ ${description} uploaded successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to upload ${description}:`, error.message);
    return false;
  }
}

async function uploadFile(localPath, remotePath, description) {
  try {
    if (!fs.existsSync(localPath)) {
      console.warn(`⚠ ${description}: File not found at ${localPath}`);
      return false;
    }

    console.log(`📤 Uploading ${description}...`);
    await client.put(localPath, remotePath);
    console.log(`✓ ${description} uploaded successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to upload ${description}:`, error.message);
    return false;
  }
}

async function deploy() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  VolxAI Website Deployment Script');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    // Validate build exists
    if (!fs.existsSync(LOCAL_DIRS.frontend)) {
      console.error('✗ Build not found! Run "npm run build" first');
      process.exit(1);
    }

    console.log('🔐 Connecting to FTP server...');
    console.log(`   Host: ${FTP_CONFIG.host}`);
    console.log(`   User: ${FTP_CONFIG.username}`);
    console.log('');

    await client.connect(FTP_CONFIG);
    console.log('✓ Connected to FTP server');
    console.log('');

    // Upload frontend
    const frontendSuccess = await uploadDirectory(
      LOCAL_DIRS.frontend,
      REMOTE_DIRS.frontend,
      'Frontend files'
    );

    // Upload backend
    const backendSuccess = await uploadDirectory(
      LOCAL_DIRS.backend,
      REMOTE_DIRS.backend,
      'Backend files'
    );

    // Upload .env
    const envSuccess = await uploadFile(
      LOCAL_DIRS.env,
      '/.env',
      '.env configuration file'
    );

    console.log('');

    if (frontendSuccess && backendSuccess) {
      console.log('═══════════════════════════════════════');
      console.log('  ✓ Deployment Completed Successfully!');
      console.log('═══════════════════════════════════════');
      console.log('');
      console.log('📝 Next steps:');
      console.log('  1. Verify files uploaded: https://volxai.com');
      console.log('  2. Test API: https://volxai.com/api/ping');
      console.log('  3. Check server logs for any errors');
      console.log('');
      process.exit(0);
    } else {
      console.log('═══════════════════════════════════════');
      console.log('  ✗ Deployment Failed!');
      console.log('═══════════════════════════════════════');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Deployment error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run deployment
deploy();
