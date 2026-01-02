# ✅ VolxAI Deployment Checklist - Shared Hosting

**Status:** Ready to Deploy

---

## 📝 PRE-DEPLOYMENT (Local Machine)

### ☐ 1. Build the project

```bash
cd code/
npm run build
```

**Expected:**

- ✓ `dist/spa/` folder created
- ✓ `dist/server/node-build.mjs` file created

---

### ☐ 2. Prepare .env file

```bash
# Copy template
cp .env.shared-hosting .env

# Edit with your credentials (use nano or your editor)
nano .env
```

**Fields to update:**

```
DB_HOST=localhost
DB_USER=volxai_user          ← Change to your cPanel username
DB_PASSWORD=your_password    ← Change to your cPanel password
DB_NAME=volxai_db
PORT=3000
JWT_SECRET=change-this-secret-key-2024
```

---

### ☐ 3. Prepare database SQL schema

- ✓ File ready: `database/schema.sql`
- Copy content for import step

---

## 🌐 CPANEL SETUP

### ☐ 4. Create MariaDB Database

**Steps:**

1. Login to cPanel
2. Find **MySQL Databases**
3. **Create New Database**
   - Name: `volxai_db`
   - Click **Create Database**

**Result:** Database created ✓

---

### ☐ 5. Create MySQL User

**Steps:**

1. In cPanel → **MySQL Users**
2. **Create New User**
   - Username: `volxai_user`
   - Password: `(generate strong password)` ← **SAVE THIS**
   - Click **Create User**

**Save:**

```
cPanel Prefix: jybcaorr_          (shown in cPanel)
Full Username: jybcaorr_volxai_user
Password: ___________________
```

---

### ☐ 6. Grant User Privileges

**Steps:**

1. In cPanel → **MySQL Databases**
2. **Add User to Database**
3. Select User: `volxai_user`
4. Select Database: `volxai_db`
5. Check **ALL PRIVILEGES**
6. Click **Make Changes**

**Result:** User has all permissions ✓

---

### ☐ 7. Import Database Schema

**Steps:**

1. Open **phpMyAdmin** (from cPanel)
2. Click on database **volxai_db**
3. Click **SQL** tab
4. Open `database/schema.sql` file
5. Copy **ALL content**
6. Paste into phpMyAdmin SQL box
7. Click **Go**

**Expected Result:**

```
Query executed successfully
7 tables created:
✓ users
✓ sessions
✓ articles
✓ user_subscriptions
✓ user_usage
✓ password_reset_tokens
✓ activity_log
```

**Verify:**

- cPanel phpMyAdmin → volxai_db
- Should show 7 tables

---

## 📤 FILE UPLOAD TO SHARED HOSTING

### ☐ 8. Create Backend Directory

**Via cPanel File Manager or SSH:**

```bash
# SSH method:
ssh username@yourdomain.com
mkdir -p ~/public_html/api
cd ~/public_html/api
```

---

### ☐ 9. Upload Backend Files

**Upload these files to `/home/username/public_html/api/`:**

```
dist/server/
├── node-build.mjs          ← Main backend file
└── node-build.mjs.map

.env                        ← Configuration with DB credentials
package.json
```

**Via cPanel File Manager:**

1. File Manager → Navigate to `public_html/api/`
2. Upload Zip → Extract
3. Or drag & drop files

**Via SFTP:**

```bash
sftp username@yourdomain.com
cd public_html/api
put -r dist/server/* ./
put .env ./
```

---

### ☐ 10. Install Node.js Dependencies

**Via SSH:**

```bash
ssh username@yourdomain.com
cd ~/public_html/api
npm install --production
```

**Or via cPanel terminal (if available)**

---

### ☐ 11. Setup Node.js App in cPanel

**Steps:**

1. **cPanel → Setup Node.js App**
2. Click **CREATE APPLICATION**
3. Fill Form:
   ```
   Node.js version:        18.x or 20.x (latest available)
   Application name:       volxai-api
   Application root:       /home/username/public_html/api
   Application Startup:    dist/server/node-build.mjs
   Port:                   (leave empty - auto assign)
   ```
4. Click **CREATE**

**cPanel will show:**

- ✓ Status: Running
- ✓ Port Assigned: e.g., `3000` or `8000` ← **NOTE THIS PORT**

---

### ☐ 12. Test Backend

**Terminal command:**

```bash
curl https://yourdomain.com:PORT/api/ping
```

**Expected Response:**

```json
{ "message": "ping pong" }
```

**Check logs:**

- cPanel → Node.js App → View Logs
- Should show:
  ```
  ✓ Database connected
  ✓ Database connection successful
  🚀 VolxAI Server running on port 3000
  ```

---

### ☐ 13. Deploy Frontend

**Steps:**

1. Update `.env.production` with API port:

   ```
   VITE_API_URL=https://yourdomain.com:PORT
   ```

   (Replace PORT with the one cPanel assigned)

2. Rebuild frontend:

   ```bash
   npm run build
   ```

3. Upload `dist/spa/` contents to `/home/username/public_html/`
   ```bash
   dist/spa/index.html        → /public_html/
   dist/spa/assets/           → /public_html/assets/
   dist/spa/**                → /public_html/
   ```

---

### ☐ 14. Configure SSL

**cPanel Auto SSL:**

1. cPanel → **AutoSSL**
2. Should be automatic
3. Your domain gets Let's Encrypt certificate

**Verify:**

- Visit `https://yourdomain.com` (not http)
- Green lock icon ✓

---

## 🧪 TESTING & VERIFICATION

### ☐ 15. Test API Endpoints

```bash
# Test ping
curl https://yourdomain.com:PORT/api/ping

# Expected: {"message":"ping pong"}
```

---

### ☐ 16. Test Frontend Access

1. Open browser
2. Visit: `https://yourdomain.com`
3. Should see VolxAI home page ✓
4. Click "Đăng nhập" → Should see login form ✓

---

### ☐ 17. Test User Registration

1. Visit: `https://yourdomain.com/login`
2. Click "Đăng ký" (Register)
3. Fill in:
   ```
   Email:        test@example.com
   Username:     testuser
   Password:     Password123!
   ```
4. Click "Đăng nhập" button

**Expected:**

- ✓ No error message
- ✓ Browser should redirect or show success
- ✓ Should see dashboard or home page

---

### ☐ 18. Verify Database Entry

1. cPanel → phpMyAdmin
2. Open `volxai_db` → `users` table
3. Check if new user appears:
   ```
   email:     test@example.com
   username:  testuser
   ```

**Result:** ✓ Database is working!

---

### ☐ 19. Test Login

1. Logout if logged in
2. Go to `/login`
3. Enter credentials:
   ```
   Email:    test@example.com
   Password: Password123!
   ```
4. Click "Đăng nhập"

**Expected:** ✓ Login successful, redirect to dashboard

---

### ☐ 20. Check Browser Console

1. Press F12 on login page
2. Go to **Console** tab
3. Should see **NO** error messages
4. Especially check for:
   - ❌ Mixed content errors
   - ❌ CORS errors
   - ❌ 404 API errors

---

## 🎉 FINAL VERIFICATION

### ☐ Check All Working Features

- [ ] Frontend loads: `https://yourdomain.com`
- [ ] Login page accessible: `https://yourdomain.com/login`
- [ ] Register works → user in database
- [ ] Login works → authentication token generated
- [ ] API responds: `https://yourdomain.com:PORT/api/ping`
- [ ] Blog page works: `https://yourdomain.com/blog`
- [ ] Pricing page works: `https://yourdomain.com/pricing`
- [ ] About page works: `https://yourdomain.com/about`

---

## 📋 TROUBLESHOOTING TABLE

| Issue               | Diagnosis           | Fix                                       |
| ------------------- | ------------------- | ----------------------------------------- |
| Backend won't start | Check logs          | cPanel → Node.js App → View Logs          |
| DB connection error | Wrong credentials   | Verify .env matches cPanel MySQL settings |
| Mixed content error | HTTP/HTTPS mismatch | Use https:// in .env.production           |
| API 404 errors      | Wrong port          | Check cPanel assigned port, update .env   |
| Login returns error | Backend not running | Restart Node.js App in cPanel             |
| Empty database      | Schema not imported | Re-import database/schema.sql             |
| CORS error          | Wrong domain        | Check server/index.ts CORS whitelist      |

---

## 📞 QUICK REFERENCE

**File Locations:**

- Backend: `/home/username/public_html/api/`
- Frontend: `/home/username/public_html/`
- Database: `volxai_db` (MariaDB)

**Credentials:**

- DB User: `volxai_user`
- DB Name: `volxai_db`
- DB Host: `localhost`

**URLs:**

- Frontend: `https://yourdomain.com`
- Backend: `https://yourdomain.com:PORT`
- phpMyAdmin: `https://yourdomain.com:2083` → cPanel → phpMyAdmin

---

## ✅ DEPLOYMENT COMPLETE!

When all checkboxes above are checked ✓, your deployment is complete!

**Next Steps:**

- Backup database regularly
- Monitor Node.js app logs
- Setup email notifications for errors
- Plan for scaling if needed

🎉 **Congratulations!** VolxAI is live on your shared hosting! 🚀
