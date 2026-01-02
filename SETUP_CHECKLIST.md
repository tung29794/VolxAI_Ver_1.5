# ✅ VolxAI Complete Setup Checklist

## 🎯 Your Goals
- [ ] Create MariaDB tables
- [ ] Deploy backend to FTP
- [ ] Start backend server
- [ ] Test API connections
- [ ] Test frontend login

---

## 🚀 DO THIS FIRST (Database Setup)

### Step 1: Create Database Tables

**Choose ONE option:**

**Option A: Automated (EASIEST)**
```bash
npm install  # If not done yet
node database/setup.js
```
Expected output:
```
✓ Connected successfully!
✓ Created table: users
✓ Created table: sessions
✓ Created table: password_reset_tokens
✓ Created table: user_subscriptions
✓ Created table: articles
✓ Created table: token_usage_history
✓ Created table: audit_logs
✅ All tables created successfully!
```

**Option B: Web Interface (phpMyAdmin)**
1. Login to phpMyAdmin via hosting panel
2. Select: `jybcaorr_lisacontentdbapi`
3. Click "Import" tab
4. Upload: `database/init.sql`
5. Click "Go"

**Option C: Command Line**
```bash
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < database/init.sql
# Enter password: 18{hopk2e$#CBv=1
```

---

## 🔍 Step 2: Verify Connection

```bash
node database/test-connection.js
```

✅ Should show:
```
✓ Connection successful!
✓ Ping successful!
Found 7 tables:
  ✓ users
  ✓ sessions
  ✓ password_reset_tokens
  ✓ user_subscriptions
  ✓ articles
  ✓ token_usage_history
  ✓ audit_logs
```

---

## 📤 Step 3: Deploy Backend

```bash
# Build frontend & backend
npm run build

# Deploy to FTP
node deploy-backend.mjs
```

✅ Should show:
```
🔐 Connecting to FTP server...
✓ Connected to FTP server successfully

📦 Uploading Backend Files...
  ✓ Backend server files uploaded successfully

📦 Uploading Frontend Files...
  ✓ Frontend files uploaded successfully

📦 Uploading Configuration...
  ✓ .env configuration file uploaded successfully

✅ Deployment Completed Successfully!
```

---

## 🖥️ Step 4: Start Backend Server

### On Your Server

```bash
# SSH into server
ssh volxai@103.221.221.67

# Navigate to backend
cd /api

# Option A: Start directly with Node
node node-build.mjs

# Option B: Start with PM2 (RECOMMENDED)
npm install -g pm2
pm2 start node-build.mjs --name volxai
pm2 startup
pm2 save
pm2 status
```

✅ Should see:
```
✓ Database connected
✓ Database connection successful
🚀 VolxAI Server running on port 3000
```

---

## 🧪 Step 5: Test API

### Health Check
```bash
curl http://103.221.221.67:3000/api/ping
```
✅ Response: `{"message":"ping pong"}`

### Test Register
```bash
curl -X POST http://103.221.221.67:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volxai.com",
    "username": "testuser",
    "password": "Test@123456",
    "full_name": "Test User"
  }'
```
✅ Response includes `token` and `user` object

### Test Login
```bash
curl -X POST http://103.221.221.67:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volxai.com",
    "password": "Test@123456"
  }'
```
✅ Response includes `token`

---

## 🌐 Step 6: Test Frontend

1. Visit: **https://volxai.netlify.app**
2. Click "**Đăng nhập**" (top right)
3. Enter:
   - Email: `test@volxai.com`
   - Password: `Test@123456`
4. Click "Đăng nhập"
5. ✅ Should see account page
6. ✅ Header shows "**Tài khoản**" button

---

## ✅ Verification Checklist

### Database ✓
- [ ] Tables created (7 total)
- [ ] Connection test passes
- [ ] Can connect via MySQL client

### Backend ✓
- [ ] Files deployed to FTP
- [ ] Server starts without errors
- [ ] Shows "Database connection successful"
- [ ] `/api/ping` endpoint responds

### Authentication ✓
- [ ] Can register new user via API
- [ ] Can login via API and get token
- [ ] Can login via frontend
- [ ] Account page is protected

### Frontend ✓
- [ ] Header shows "Đăng nhập" when logged out
- [ ] Header shows "Tài khoản" when logged in
- [ ] Login/Register forms work
- [ ] Account page accessible after login

---

## 🐛 Troubleshooting Quick Fixes

### "Can't connect to MySQL"
```bash
# Check credentials
cat .env | grep DB_

# Test connection manually
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p

# Try different port
mysql -h 103.221.221.67 -P 3306 ...
```

### "Unknown database"
```bash
# Check if database exists
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -e "SHOW DATABASES;"

# Run setup script
node database/setup.js
```

### "Tables not found"
```bash
# Check tables
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       -D jybcaorr_lisacontentdbapi \
       -e "SHOW TABLES;"

# Import SQL if missing
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p \
       jybcaorr_lisacontentdbapi < database/init.sql
```

### "Backend won't start"
```bash
# Check logs
pm2 logs volxai

# Check if port 3000 is in use
lsof -i :3000

# Try different port
PORT=3001 node node-build.mjs
```

### "Login not working"
```bash
# Check API is responding
curl http://103.221.221.67:3000/api/ping

# Check frontend API URL
grep VITE_API_URL .env.production

# Check browser console for errors
# Open: https://volxai.netlify.app
# Press F12 → Console tab
# Look for error messages
```

---

## 📋 Configuration Verification

### Check .env File
```bash
cat .env
```
Should have:
```
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
DB_PORT=3306
JWT_SECRET=volxai-secret-jwt-key-2024
```

### Check .env.production
```bash
cat .env.production
```
Should have:
```
VITE_API_URL=http://103.221.221.67:3000
```

---

## 🚀 Quick Reference Commands

```bash
# Setup database
node database/setup.js

# Test connection
node database/test-connection.js

# Build project
npm run build

# Deploy backend
node deploy-backend.mjs

# View logs (on server)
pm2 logs volxai

# Restart server (on server)
pm2 restart volxai

# Stop server (on server)
pm2 stop volxai

# Check status (on server)
pm2 status

# Remove from PM2 (on server)
pm2 delete volxai
```

---

## 📊 Success Indicators

✅ **Database:** All 7 tables exist in MariaDB
✅ **Backend:** Server running on port 3000
✅ **API:** `/api/ping` returns `{"message":"ping pong"}`
✅ **Auth:** Can register and login via API
✅ **Frontend:** Can login via web interface
✅ **Account:** Account page shows user info

---

## 📞 Files for Reference

| File | Purpose |
|------|---------|
| `MARIADB_SETUP_GUIDE.md` | Complete database setup |
| `DATABASE_SETUP.md` | Database schema details |
| `DATABASE_CONNECTION_SUMMARY.md` | This summary |
| `DEPLOYMENT_SUMMARY.md` | Backend deployment |
| `QUICK_START_BACKEND.md` | Quick start guide |
| `database/init.sql` | SQL schema |
| `database/setup.js` | Setup script |
| `database/test-connection.js` | Connection test |

---

## 🎯 Next Actions

### Immediate (Now)
1. [ ] Run `node database/setup.js`
2. [ ] Run `node database/test-connection.js`
3. [ ] Verify all tables created

### Short Term (Next Hour)
1. [ ] Run `npm run build`
2. [ ] Run `node deploy-backend.mjs`
3. [ ] SSH to server and start backend

### Testing (Next 30 Minutes)
1. [ ] Test API with curl
2. [ ] Test login on frontend
3. [ ] Verify account page works

---

## 💯 You're Done When...

✅ All items checked
✅ All tests passing
✅ Can login to web app
✅ Account page shows user info

---

**Status: READY TO DEPLOY** 🚀

**Start with:** `node database/setup.js`

**Questions?** Read the appropriate guide file listed above.

---

**Estimated Time:** 15-20 minutes total
**Difficulty:** Medium (mostly copying commands)
**Success Rate:** 99% (following these steps)

Let's go! 🎉
