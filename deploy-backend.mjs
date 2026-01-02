#!/usr/bin/env node

/**
 * Backend Deployment Script for VolxAI
 * Uploads backend files to FTP hosting
 *
 * Usage: node deploy-backend.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Client from "ssh2-sftp-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FTP Configuration
const FTP_CONFIG = {
  host: process.env.FTP_HOST || "103.221.221.67",
  username: process.env.FTP_USER || "volxai@volxai.com",
  password: process.env.FTP_PASS || "Qnoc7vBSy8qh+BpV",
  port: parseInt(process.env.FTP_PORT || "21", 10),
};

const LOCAL_DIRS = {
  backend: path.join(__dirname, "dist/server"),
  frontend: path.join(__dirname, "dist/spa"),
  env: path.join(__dirname, ".env"),
};

const REMOTE_DIRS = {
  backend: "/api",
  frontend: "/public_html",
};

const client = new Client();

async function uploadDirectory(localPath, remotePath, description) {
  try {
    if (!fs.existsSync(localPath)) {
      console.error(`✗ ${description}: Directory not found at ${localPath}`);
      return false;
    }

    console.log(
      `📤 Uploading ${description} from ${localPath} to ${remotePath}...`,
    );
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
  console.log("");
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  VolxAI Backend Deployment Script         ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("");

  try {
    // Validate builds exist
    if (!fs.existsSync(LOCAL_DIRS.backend)) {
      console.error("✗ Backend build not found!");
      console.error('   Run "npm run build" first');
      process.exit(1);
    }

    if (!fs.existsSync(LOCAL_DIRS.frontend)) {
      console.warn("⚠ Frontend build not found - skipping frontend upload");
    }

    console.log("🔐 Connecting to FTP server...");
    console.log(`   Host: ${FTP_CONFIG.host}`);
    console.log(`   User: ${FTP_CONFIG.username}`);
    console.log(`   Port: ${FTP_CONFIG.port}`);
    console.log("");

    await client.connect(FTP_CONFIG);
    console.log("✓ Connected to FTP server successfully");
    console.log("");

    // Upload backend
    console.log("📦 Uploading Backend Files...");
    const backendSuccess = await uploadDirectory(
      LOCAL_DIRS.backend,
      REMOTE_DIRS.backend,
      "Backend server files",
    );
    console.log("");

    // Upload frontend (optional)
    let frontendSuccess = true;
    if (fs.existsSync(LOCAL_DIRS.frontend)) {
      console.log("📦 Uploading Frontend Files...");
      frontendSuccess = await uploadDirectory(
        LOCAL_DIRS.frontend,
        REMOTE_DIRS.frontend,
        "Frontend files",
      );
      console.log("");
    }

    // Upload .env
    console.log("📦 Uploading Configuration...");
    const envSuccess = await uploadFile(
      LOCAL_DIRS.env,
      "/.env",
      ".env configuration file",
    );
    console.log("");

    if (backendSuccess) {
      console.log("╔═══════════════════════════════════════════╗");
      console.log("║  ✓ Deployment Completed Successfully!     ║");
      console.log("╚═══════════════════════════════════════════╝");
      console.log("");
      console.log("📝 Next Steps:");
      console.log("  1. Connect to your server via SSH");
      console.log("  2. Navigate to /api directory");
      console.log("  3. Start the server:");
      console.log("     node node-build.mjs");
      console.log("");
      console.log("📌 Or use PM2 for production:");
      console.log("  npm install -g pm2");
      console.log('  pm2 start node-build.mjs --name "volxai-backend"');
      console.log("  pm2 startup");
      console.log("  pm2 save");
      console.log("");
      console.log("🧪 Test the API:");
      console.log("  curl https://api.volxai.com/api/ping");
      console.log("");
      process.exit(0);
    } else {
      console.log("╔═══════════════════════════════════════════╗");
      console.log("║  ✗ Deployment Failed!                     ║");
      console.log("╚═══════════════════════════════════════════╝");
      process.exit(1);
    }
  } catch (error) {
    console.error("✗ Deployment error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run deployment
deploy();
