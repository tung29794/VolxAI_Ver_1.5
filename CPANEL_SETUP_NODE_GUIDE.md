# cPanel Node.js Setup - Complete Guide

## Current Status

- ✓ Frontend deployed to `/home/jybcaorr/public_html`
- ✓ Backend files deployed to `/home/jybcaorr/api.volxai.com`
- ✗ Node.js app not running (503 error)

## Why 503 Error?

The Node.js application is not running because it hasn't been registered in cPanel yet.

---

## Step 1: Setup Node.js App in cPanel 🚀

### 1.1 Access cPanel

1. Go to: **https://ghf57-22175.azdigihost.com:2083**
2. Login with your cPanel credentials
3. Look for **"Setup Node.js App"** (search in the search bar if needed)

### 1.2 Create Node.js Application

Click on **"Create Node.js Application"** and fill in:

**Application Details:**

- **Node.js Version**: Select `18.x` or `20.x` (latest stable)
- **Application Name**: `volxai-api`
- **Domain**: `api.volxai.com`
- **Application Root**: `/home/jybcaorr/api.volxai.com`
- **Application Startup File**: `node-build.mjs`
- **Application Port**: `3000`
- **Application Mode**: `Production`

**Environment Variables** (optional in UI, already in .env):

```
NODE_ENV=production
```

### 1.3 Deploy the Application

Click the **"Deploy"** or **"Create"** button.

**What cPanel does:**

- ✓ Creates a Node.js process manager entry
- ✓ Starts the Node.js application
- ✓ Configures reverse proxy (nginx/Apache)
- ✓ Routes `api.volxai.com` traffic to `localhost:3000`

### 1.4 Wait for Startup

- Give it 30-60 seconds to start
- You'll see status change to "Running"

---

## Step 2: Verify Backend is Running ✓

### 2.1 Test API Endpoint

Open in browser or use curl:

```bash
curl https://api.volxai.com/api/ping
```

**Expected response:**

```json
{ "message": "ping pong" }
```

### 2.2 Check Node.js App Status

In cPanel → Setup Node.js App:

- Look for "volxai-api" in the list
- Status should show: **Running** ✓
- Port: **3000**
- PID: (should show a process ID)

### 2.3 Check Application Logs

If still not working:

1. In cPanel → Setup Node.js App
2. Click on "volxai-api"
3. View logs to see any errors
4. Common errors:
   - `ECONNREFUSED` - Database not connected
   - `PORT already in use` - Use different port
   - `Cannot find module` - Files not copied correctly

---

## Step 3: Import Database Schema 🗄️

Once Node.js is running, import the database:

### 3.1 Open phpMyAdmin

1. Go to: **https://ghf57-22175.azdigihost.com:2083 → phpMyAdmin**
2. Login (usually same as cPanel)
3. Left sidebar → Select database: **jybcaorr_lisacontentdbapi**

### 3.2 Import Database Schema

1. Click **SQL** tab at top
2. Clear any existing query in the text area
3. Copy entire content from `DATABASE_IMPORT.sql`
4. Paste into the SQL query box
5. Click **Go** (blue button at bottom)

### 3.3 Verify Tables Created

After import succeeds:

1. Click **Structure** tab
2. You should see these tables:
   - `users`
   - `sessions`
   - `articles`
   - `user_subscriptions`
   - `user_usage`
   - `password_reset_tokens`
   - `activity_log`

### 3.4 Test Database Connection

Try login at: **https://volxai.com/login**

- Username: Test with any email
- If database works, you'll see proper error messages
- If DB fails, you'll see "500 Internal Server Error"

---

## Step 4: Troubleshooting 🔧

### API Still Returns 503?

**Check Node.js status:**

```bash
# SSH into server
ssh jybcaorr@ghf57-22175.azdigihost.com

# Check running processes
ps aux | grep node

# Check if port 3000 is listening
netstat -tlnp | grep 3000
```

**Restart Node.js Application:**

1. Go to cPanel → Setup Node.js App
2. Find "volxai-api"
3. Click "Restart" button
4. Wait 30 seconds
5. Test: `curl https://api.volxai.com/api/ping`

### Environment Variables Not Loaded?

The `.env` file was created at:

```
/home/jybcaorr/api.volxai.com/.env
```

Verify it exists:

```bash
ssh jybcaorr@ghf57-22175.azdigihost.com
cat /home/jybcaorr/api.volxai.com/.env
```

Should show:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
PORT=3000
NODE_ENV=production
```

### Database Connection Fails?

Check database credentials in phpMyAdmin:

1. Go to **Settings** (gear icon)
2. Check server settings
3. Verify username: `jybcaorr_lisaaccountcontentapi`
4. Verify database: `jybcaorr_lisacontentdbapi`

---

## Complete Testing Checklist ✅

After setup, test everything:

- [ ] **Frontend loads**: https://volxai.com (should see homepage)
- [ ] **API ping works**: https://api.volxai.com/api/ping (should return `{"message":"ping pong"}`)
- [ ] **Node.js running**: cPanel shows "Running" status
- [ ] **Database tables exist**: phpMyAdmin shows 7 tables
- [ ] **Login works**: https://volxai.com/login (can attempt login)
- [ ] **Registration works**: https://volxai.com/register (can attempt signup)

---

## Quick Reference

| Component            | Path                                 | Status            |
| -------------------- | ------------------------------------ | ----------------- |
| Frontend             | `/home/jybcaorr/public_html`         | ✓ Deployed        |
| Backend              | `/home/jybcaorr/api.volxai.com`      | ✓ Deployed        |
| Backend Executable   | `node-build.mjs`                     | ✓ Present         |
| .env Configuration   | `/home/jybcaorr/api.volxai.com/.env` | ✓ Created         |
| Database             | `jybcaorr_lisacontentdbapi`          | ⏳ Pending Import |
| Node.js App (cPanel) | volxai-api                           | ⏳ Needs Setup    |

---

## Support

If you encounter errors:

1. Check cPanel Node.js logs
2. Verify `.env` file exists and has correct values
3. Ensure database is imported
4. Restart Node.js application
5. Wait 60 seconds for full startup
