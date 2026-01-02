# ⚡ Quick Start - Deploy VolxAI to Shared Hosting

## 📌 Prerequisites

- [ ] Shared hosting with **Node.js support** (cPanel/Plesk)
- [ ] **phpMyAdmin** access
- [ ] SSH access (recommended) or cPanel File Manager
- [ ] Domain name

---

## 🚀 5-Step Deployment

### **Step 1: Setup Database (5 min)**

1. Login to **cPanel**
2. Go **MySQL Databases** → Create database `volxai_db`
3. Go **MySQL Users** → Create user `volxai_user` with password
4. Add user to database with **ALL PRIVILEGES**
5. Open **phpMyAdmin** → Select `volxai_db`
6. Go **SQL** tab → Copy-paste content from `database/schema.sql` → Click **Go** ✓

**Save credentials:**

- Host: `localhost`
- User: `volxai_user`
- Password: `your_password`
- Database: `volxai_db`

---

### **Step 2: Build Project (2 min)**

```bash
cd code/
npm run build
```

**Output:** `dist/spa/` (frontend) + `dist/server/` (backend)

---

### **Step 3: Create .env File (2 min)**

Copy `.env.shared-hosting` to `.env`:

```bash
cp .env.shared-hosting .env
```

Edit `.env` with your credentials:

```bash
DB_HOST=localhost
DB_USER=volxai_user
DB_PASSWORD=your_cpanel_password
DB_NAME=volxai_db
PORT=3000
JWT_SECRET=your-secret-key-2024
```

---

### **Step 4: Deploy Backend (3 min)**

**Via cPanel:**

1. Go **Setup Node.js App** (in cPanel)
2. Click **Create Application**
3. Fill in:
   - **App Name:** `volxai-api`
   - **Node Version:** 18+ (newest available)
   - **App Root:** `/home/username/public_html/api` (or your preferred path)
   - **Startup File:** `dist/server/node-build.mjs`
4. Click **Create** and wait ✓

cPanel will show you the assigned **Port** → Note it down!

**Or via SSH:**

```bash
ssh user@domain.com
mkdir -p ~/api && cd ~/api
# Upload files: dist/server/*, .env
npm install
node dist/server/node-build.mjs
```

---

### **Step 5: Deploy Frontend (1 min)**

1. Upload contents of `dist/spa/` to `/public_html/`
2. Check that `index.html` is in `/public_html/`

**Setup API URL:**

- Find the port assigned by cPanel (e.g., `3000`)
- Update `.env.production`:
  ```
  VITE_API_URL=https://yourdomain.com:3000
  ```
- Rebuild: `npm run build`
- Re-upload `dist/spa/`

---

## ✅ Verify Installation

### Test Backend:

```bash
curl https://yourdomain.com:3000/api/ping
# Should return: {"message":"ping pong"}
```

### Test Frontend:

```
Visit: https://yourdomain.com/login
```

---

## 🐛 Troubleshooting

| Issue                         | Fix                                                  |
| ----------------------------- | ---------------------------------------------------- |
| **Database connection error** | Check `.env` credentials match cPanel MySQL          |
| **Port already in use**       | cPanel auto-assigns port, check Node.js app settings |
| **Mixed content error**       | Use HTTPS URL in `.env.production`                   |
| **API 404**                   | Check backend port in `.env.production` is correct   |
| **Frontend blank**            | Check `dist/spa/` uploaded to `/public_html/`        |

---

## 📚 Full Documentation

For detailed setup and troubleshooting, see:

- **`SHARED_HOSTING_SETUP.md`** - Complete guide with all details
- **`database/schema.sql`** - Database schema setup
- **`.env.shared-hosting`** - Template environment variables

---

## 🎉 Success!

Your VolxAI app is live on shared hosting! 🚀

Visit `https://yourdomain.com` to start.
