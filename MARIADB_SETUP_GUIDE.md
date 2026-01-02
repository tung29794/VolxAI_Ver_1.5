# VolxAI MariaDB Setup & Connection Guide

## 📌 Your Database Credentials

```
Host: 103.221.221.67
Database: jybcaorr_lisacontentdbapi
User: jybcaorr_lisaaccountcontentapi
Password: 18{hopk2e$#CBv=1
Port: 3306
```

---

## ✅ Status Check

- [x] Backend code written and compiled
- [x] Database credentials configured in `.env`
- [x] SQL schema prepared (`database/init.sql`)
- [x] Connection scripts ready
- ⏳ **NEXT: Create tables in your MariaDB database**

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Create Database Tables

Choose ONE of these methods:

#### **Method A: Automated Setup (Recommended)**

```bash
# Install dependencies (if not done)
npm install

# Run automated setup
node database/setup.js
```

This script will:
- ✓ Connect to your MariaDB
- ✓ Create all required tables
- ✓ Verify everything is set up correctly

#### **Method B: phpMyAdmin (Web Interface)**

1. Go to your hosting cpanel → phpMyAdmin
2. Select database: `jybcaorr_lisacontentdbapi`
3. Click "Import" tab
4. Upload `database/init.sql`
5. Click "Go"

#### **Method C: Command Line**

```bash
# On your local machine
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < database/init.sql

# Enter password when prompted: 18{hopk2e$#CBv=1
```

### Step 2: Verify Connection

```bash
# Test connection
node database/test-connection.js

# Should show:
# ✓ Connection successful!
# ✓ All tables created
```

### Step 3: Deploy Backend

```bash
# Build backend
npm run build

# Deploy to FTP
node deploy-backend.mjs
```

### Step 4: Start Backend Server

```bash
# SSH to your server
ssh volxai@103.221.221.67

# Navigate to backend
cd /api

# Start with Node
node node-build.mjs

# Or with PM2
pm2 start node-build.mjs --name volxai
```

### Step 5: Test Everything

```bash
# Test API health
curl http://103.221.221.67:3000/api/ping

# Should return:
# {"message":"ping pong"}
```

---

## 📊 What Gets Created

### 7 Database Tables:

1. **users** - User accounts and authentication
2. **sessions** - Active login sessions
3. **password_reset_tokens** - Password recovery tokens
4. **user_subscriptions** - Plan/billing information
5. **articles** - Generated articles and content
6. **token_usage_history** - Usage tracking
7. **audit_logs** - Activity logging

---

## 🔍 Detailed Setup Steps

### Option 1: Using Automated Script (Best)

```bash
# Test database connection first
node database/test-connection.js

# If all tests pass, run setup
node database/setup.js
```

**Output should show:**
```
════════════════════════════════════════════════════════
  VolxAI Database Setup
════════════════════════════════════════════════════════

✓ Connected successfully!
✓ SQL file loaded successfully!

⚙️ Creating database tables...
  ✓ Created table: users
  ✓ Created table: sessions
  ✓ Created table: password_reset_tokens
  ✓ Created table: user_subscriptions
  ✓ Created table: articles
  ✓ Created table: token_usage_history
  ✓ Created table: audit_logs

✅ All tables created successfully!
```

### Option 2: Using phpMyAdmin

1. **Login to phpMyAdmin**
   - URL: Usually at `yourdomain.com/phpmyadmin`
   - Use hosting panel credentials

2. **Select Your Database**
   - Left panel → Click `jybcaorr_lisacontentdbapi`

3. **Import SQL File**
   - Top menu → "Import" tab
   - "Choose File" → Select `database/init.sql`
   - Click "Go"

4. **Verify Tables**
   - Refresh the page
   - You should see all 7 tables listed

### Option 3: Using Command Line

```bash
# Connect to database and run SQL
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -D jybcaorr_lisacontentdbapi < database/init.sql

# When prompted, enter: 18{hopk2e$#CBv=1

# Verify tables were created
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -D jybcaorr_lisacontentdbapi \
       -e "SHOW TABLES;"

# Should list all 7 tables
```

---

## 🧪 Test Database Connection

### From Local Machine

```bash
# Test connection with script
node database/test-connection.js

# Manual test
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -e "SELECT COUNT(*) as tables_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='jybcaorr_lisacontentdbapi';"

# Should show: tables_count = 7
```

### From Backend

Once backend is running:

```bash
# Health check
curl http://103.221.221.67:3000/api/ping
# Response: {"message":"ping pong"}
```

---

## 🔐 Environment Configuration

Your `.env` file should have:

```bash
# Database Connection
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
DB_PORT=3306

# JWT/Auth
JWT_SECRET=volxai-secret-jwt-key-2024

# Server Settings
PORT=3000
NODE_ENV=production
PING_MESSAGE=ping pong
```

**⚠️ Never commit `.env` to git!**

---

## 🛠 Troubleshooting

### Problem: "Can't connect to MySQL server"

**Cause:** Database server not accessible

**Solutions:**
1. Check credentials are correct
2. Verify database server is running
3. Check if port 3306 is open
4. Contact hosting to whitelist your IP

```bash
# Test connection
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p

# Type password and press Enter
# If you get MySQL prompt > then connection works
```

### Problem: "Unknown database"

**Cause:** Database doesn't exist

**Solution:** Create it manually

```bash
# Connect as admin
mysql -h 103.221.221.67 -u admin -p

# Create database
CREATE DATABASE jybcaorr_lisacontentdbapi 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'jybcaorr_lisaaccountcontentapi'@'%' 
IDENTIFIED BY '18{hopk2e$#CBv=1';

# Grant privileges
GRANT ALL PRIVILEGES ON jybcaorr_lisacontentdbapi.* 
TO 'jybcaorr_lisaaccountcontentapi'@'%';

# Flush privileges
FLUSH PRIVILEGES;
```

### Problem: "Access denied for user"

**Cause:** Wrong password or user doesn't exist

**Solution:** Reset password in hosting panel or via MySQL

```bash
# Connect as admin and reset password
mysql -h 103.221.221.67 -u admin -p

# Change user password
ALTER USER 'jybcaorr_lisaaccountcontentapi'@'%' 
IDENTIFIED BY '18{hopk2e$#CBv=1';
FLUSH PRIVILEGES;
```

### Problem: "Table doesn't exist"

**Cause:** `init.sql` was not executed

**Solution:** Run it now

```bash
# Execute SQL file
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < database/init.sql
```

---

## 📈 Database Maintenance

### Backup Database

```bash
# Create backup
mysqldump -h 103.221.221.67 \
          -u jybcaorr_lisaaccountcontentapi \
          -p jybcaorr_lisacontentdbapi > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -h 103.221.221.67 \
      -u jybcaorr_lisaaccountcontentapi \
      -p jybcaorr_lisacontentdbapi < backup_20250101.sql
```

### Monitor Database Size

```bash
# Check database size
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -D jybcaorr_lisacontentdbapi \
       -e "SELECT 
             TABLE_SCHEMA,
             ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as 'Size (MB)'
           FROM INFORMATION_SCHEMA.TABLES
           WHERE TABLE_SCHEMA = 'jybcaorr_lisacontentdbapi'
           GROUP BY TABLE_SCHEMA;"
```

### View Table Stats

```bash
# Show all tables with row count and size
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -D jybcaorr_lisacontentdbapi \
       -e "SELECT 
             TABLE_NAME,
             TABLE_ROWS,
             ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as 'Size (MB)'
           FROM INFORMATION_SCHEMA.TABLES
           ORDER BY TABLE_NAME;"
```

---

## 📋 Complete Setup Checklist

- [ ] **Database Credentials Verified**
  - Host: 103.221.221.67
  - User: jybcaorr_lisaaccountcontentapi
  - Password: 18{hopk2e$#CBv=1

- [ ] **Tables Created**
  - [ ] Run `node database/setup.js` OR
  - [ ] Upload `database/init.sql` via phpMyAdmin OR
  - [ ] Use command line to import

- [ ] **Connection Verified**
  - [ ] Run `node database/test-connection.js`
  - [ ] All tests pass ✓

- [ ] **Environment Configured**
  - [ ] `.env` has correct DB credentials
  - [ ] `.env` is in `.gitignore`
  - [ ] Never commit `.env` to git!

- [ ] **Backend Built & Deployed**
  - [ ] `npm run build` completes
  - [ ] `node deploy-backend.mjs` uploads files
  - [ ] Files are on FTP server

- [ ] **Backend Started**
  - [ ] Connected to server via SSH
  - [ ] Started with `node node-build.mjs` or PM2
  - [ ] Shows "Database connection successful"

- [ ] **API Tested**
  - [ ] `curl http://103.221.221.67:3000/api/ping` returns `{"message":"ping pong"}`

- [ ] **Frontend Connected**
  - [ ] Update `client/lib/api.ts` with backend URL
  - [ ] Rebuild frontend: `npm run build`
  - [ ] Deploy to Netlify or test locally

---

## 🎯 Final Steps

1. ✅ Run database setup script
2. ✅ Verify tables exist
3. ✅ Deploy backend to FTP
4. ✅ Start backend server
5. ✅ Test API endpoints
6. ✅ Test login/register on frontend

---

## 📚 Database Schema Summary

### users
```
- id (PK): Auto-increment user ID
- username: Unique username
- email: Unique email address  
- password_hash: Bcrypt hashed password
- full_name: User's name
- token_balance: Available tokens
- is_active: Account active status
- created_at, updated_at, last_login: Timestamps
```

### sessions
```
- id: Session ID
- user_id: Foreign key to users
- token: JWT token
- expires_at: Token expiration time
```

### user_subscriptions
```
- id: Subscription ID
- user_id: Foreign key to users
- plan_name: Starter/Grow/Pro/Corp/Premium
- is_annual: Monthly or annual billing
- monthly_articles: Limit per month
- monthly_tokens: Token limit per month
```

### articles
```
- id: Article ID
- user_id: Author foreign key
- title, content: Article text
- ai_model: Model used to generate
- keyword: Target keyword
- status: draft/published/archived
- tokens_used: Token consumption
```

### token_usage_history
```
- Track token usage per action
- Monitor user consumption
- Audit trail for billing
```

### audit_logs
```
- Log all user actions
- Security and compliance tracking
- User IP and browser info
```

---

## 🆘 Need Help?

1. **Connection Issues?**
   - Run: `node database/test-connection.js`
   - Check `.env` file
   - Verify hosting allows remote access

2. **Tables Not Created?**
   - Run: `node database/setup.js`
   - Or import `database/init.sql` manually

3. **Backend Won't Connect?**
   - Check database credentials
   - Verify tables exist
   - Check server logs

4. **Still Stuck?**
   - Review DATABASE_SETUP.md
   - Check DEPLOYMENT_SUMMARY.md
   - Review error messages carefully

---

**✅ Database setup complete! Your VolxAI app is ready to store user data.** 🎉
