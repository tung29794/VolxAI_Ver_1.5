# VolxAI Deployment Fix Guide

## Problem

The DEPLOY.sh script ran on the server but couldn't find the built files:

- ✗ Backend executable NOT found
- ✗ Frontend index.html NOT found

## Root Cause

The project needs to be **built locally first** before deployment. The script expects:

- `dist/server/node-build.mjs` (backend executable)
- `dist/spa/index.html` (frontend files)

## Solution: Correct Deployment Process

### Step 1: Build the Project Locally ⚙️

Run this command on your **local machine**:

```bash
npm run build
```

This creates:

- `dist/server/` - Backend compiled files
- `dist/spa/` - Frontend compiled files

### Step 2: Upload Built Files to Server 📤

Upload these folders to your server via SSH/SFTP:

- Upload entire `dist/` folder
- Upload `DEPLOY.sh` script
- Upload `DATABASE_IMPORT.sql` (for database setup)

**Or alternatively**, you can modify DEPLOY.sh to run locally:

```bash
# Run on your LOCAL machine (not server)
bash DEPLOY.sh
```

Then SFTP the deployed files to:

- Backend: `/home/jybcaorr/api.volxai.com`
- Frontend: `/home/jybcaorr/public_html`

### Step 3: Run DEPLOY.sh on Server 🚀

After uploading the built files:

```bash
ssh jybcaorr@ghf57-22175.azdigihost.com
bash /home/jybcaorr/DEPLOY.sh
```

### Step 4: Import Database via phpMyAdmin 🗄️

1. Go to: https://ghf57-22175.azdigihost.com:2083 → phpMyAdmin
2. Select database: `jybcaorr_lisacontentdbapi`
3. Click **SQL** tab
4. Copy content from `DATABASE_IMPORT.sql`
5. Paste into SQL editor
6. Click **Go** button

### Step 5: Setup Node.js App in cPanel ⚙️

1. Log into cPanel: https://ghf57-22175.azdigihost.com:2083
2. Go to **Setup Node.js App**
3. Create new application:
   - **Application Name**: volxai-api
   - **Application Root**: `/home/jybcaorr/api.volxai.com`
   - **Startup File**: `node-build.mjs`
   - **Port**: 3000
4. Click **Deploy**

### Step 6: Test Your Deployment ✅

- Frontend: https://volxai.com
- API: https://api.volxai.com/api/ping
- Login test: https://volxai.com/login

## Quick Summary

```
Local Machine:
$ npm run build          # Creates dist/ folder
$ scp -r dist/ user@server:/path/to/deploy/

Server:
$ bash DEPLOY.sh        # Copies files to correct paths
$ # Import DB in phpMyAdmin
$ # Setup Node.js in cPanel
```

## Database Credentials

- **Host**: localhost
- **Database**: jybcaorr_lisacontentdbapi
- **User**: jybcaorr_lisaaccountcontentapi
- **Password**: 18{hopk2e$#CBv=1

## Environment Variables

The DEPLOY.sh script automatically creates `.env` with:

- DB_HOST=localhost
- DB_PORT=3306
- DB_USER=jybcaorr_lisaaccountcontentapi
- DB_PASSWORD=18{hopk2e$#CBv=1
- DB_NAME=jybcaorr_lisacontentdbapi
- PORT=3000
- NODE_ENV=production
