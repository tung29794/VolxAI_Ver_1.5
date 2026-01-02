# 🚀 Backend Setup Guide - Choose Your Path

**Pick ONE option below based on what you want to do**

---

## 🎯 Choose Your Path

```
What do you want to do?

┌─ Option 1: Start Backend Locally (Testing Now)
│   └─ Time: 5 minutes
│   └─ Use: Testing & development
│   └─ Go to: SECTION A ↓
│
├─ Option 2: Check FTP Backend (103.221.221.67)
│   └─ Time: 3 minutes
│   └─ Use: Verify if it's running
│   └─ Go to: SECTION B ↓
│
└─ Option 3: Deploy to cPanel (Final Production)
    └─ Time: 20 minutes
    └─ Use: Live deployment
    └─ Go to: SECTION C ↓
```

---

# 🔵 SECTION A: Start Backend Locally

**Use this if:** You want to test the app locally before deploying

### Step A.1: Open a NEW Terminal

Keep your current terminal running the frontend dev server. Open a **brand new terminal** window.

### Step A.2: Navigate to project folder

```bash
cd /path/to/code/
```

### Step A.3: Build everything

```bash
npm run build
```

**Output sẽ tạo:**
```
dist/
├── spa/           (Frontend)
└── server/        (Backend)
```

### Step A.4: Start the backend

Choose **one** of these methods:

#### **Method A.4.1: Start Full Server (Frontend + Backend together)**

```bash
npm run start
```

**Output sẽ hiển thị:**
```
🚀 VolxAI Server running on port 3000
📱 Frontend: http://localhost:3000
🔧 API: http://localhost:3000/api
```

Then open browser: `http://localhost:3000`

✅ Everything works together!

#### **Method A.4.2: Start Only Backend (If frontend already running)**

```bash
node dist/server/production.mjs
```

**Output:**
```
🚀 VolxAI Server running on port 3000
```

### Step A.5: Configure Frontend to Use Local Backend

Your frontend is pointing to `103.221.221.67:3000`. Change it to localhost:

**Create `.env.development` in project root:**

```
VITE_API_URL=http://localhost:3000
```

Or edit `client/lib/api.ts`:

```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";  // Change from 103.221.221.67
```

### Step A.6: Refresh Browser

Press **F5** to refresh, or restart frontend:

```bash
npm run dev
```

### Step A.7: Test Login

1. Open http://localhost:8080 (or the frontend dev URL)
2. Try to **register** a new user
3. Check DevTools (F12 → Network) for requests to `http://localhost:3000/api`

✅ **Status:** Login should work now!

---

### 🐛 Troubleshoot Local Backend

**❌ "Failed to fetch" still showing**

```bash
# Check if backend is actually running
curl http://localhost:3000/api/ping

# Expected output:
# {"message":"ping"}

# If error, try:
# 1. Kill any existing process on port 3000
# 2. Check if port 3000 is in use
lsof -i :3000

# If something using it, kill it
kill -9 <PID>

# Try starting again
node dist/server/production.mjs
```

**❌ "Cannot find module" error**

```bash
npm install
npm run build
```

**❌ Database connection error**

Database might not be running. See "Local Database Setup" below.

---

### 🗄️ Local Database Setup (Optional)

If you want to test with a real database locally:

#### Option 1: Use Docker (Easiest)

```bash
# Start MariaDB in Docker
docker run --name volxai-db \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=volxai_dev \
  -e MYSQL_USER=volxai_dev \
  -e MYSQL_PASSWORD=devpass \
  -p 3306:3306 \
  -d mariadb:latest

# Create .env file
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=volxai_dev
DB_PASSWORD=devpass
DB_NAME=volxai_dev
DB_PORT=3306
JWT_SECRET=dev-secret-key
NODE_ENV=development
EOF

# Import schema
mysql -u volxai_dev -p volxai_dev < database/init.sql
# Password: devpass
```

#### Option 2: Install MariaDB Locally

```bash
# macOS
brew install mariadb

# Linux (Ubuntu)
sudo apt-get install mariadb-server

# Windows
# Download from: https://mariadb.org/download/

# Then setup
mysql -u root -p
CREATE DATABASE volxai_dev;
CREATE USER 'volxai_dev'@'localhost' IDENTIFIED BY 'devpass';
GRANT ALL ON volxai_dev.* TO 'volxai_dev'@'localhost';
FLUSH PRIVILEGES;
```

#### Option 3: Skip Database (In-Memory)

The app can run without real database for testing UI:
- Registration will fail
- But you can test the UI/form

---

# 🔵 SECTION B: Check FTP Backend (103.221.221.67)

**Use this if:** You want to verify the old FTP server is still running

### Step B.1: SSH into FTP Server

```bash
# Assuming you still have access to:
# IP: 103.221.221.67
# User: volxai@volxai.com
# Password: (from deployment docs)

ssh volxai@103.221.221.67
```

If you don't have these credentials, check your earlier deployment notes.

### Step B.2: Check if Backend is Running

```bash
# Check Node.js processes
ps aux | grep node

# Output should show:
# node server.js
# or similar

# If nothing shows → Backend is NOT running
```

### Step B.3: Verify Port 3000 is Open

```bash
# Check if port 3000 is listening
netstat -tlnp | grep 3000

# Should show:
# tcp ... 0.0.0.0:3000
```

### Step B.4: Start Backend if Not Running

```bash
cd ~/backend
npm start

# Or with PM2:
pm2 start server.js --name "volxai"
pm2 save
```

### Step B.5: Test from Local Machine

```bash
# On your local machine (not SSH)
curl http://103.221.221.67:3000/api/ping

# Expected:
# {"message":"ping"}

# If works → Backend is running!
# If fails → Backend is down or unreachable
```

### Step B.6: Check Database Connection

```bash
# SSH back into the server
ssh volxai@103.221.221.67

# Try connecting to database
mysql -u volxai_user -p volxai_db
# Enter password when prompted

# If connects → Database is working
# Type: exit
```

---

### 🐛 FTP Backend Issues

**❌ Cannot SSH to server**

- Check IP address is correct: `103.221.221.67`
- Check SSH port: usually `22` (or custom if specified)
- Check credentials
- Server might be down

**❌ Backend process not running**

```bash
# SSH into server
ssh volxai@103.221.221.67

# Navigate to project
cd /home/volxai/backend  # or wherever it is

# Check package.json exists
cat package.json

# Install dependencies
npm install

# Start backend
npm start

# Or check logs
tail -f /var/log/backend.log  # if logs exist
```

**❌ Port 3000 blocked**

```bash
# Check firewall
sudo ufw status

# If blocked, open port
sudo ufw allow 3000

# Or check if something else using port
lsof -i :3000
```

---

# 🔵 SECTION C: Deploy to cPanel (Final)

**Use this if:** Ready to deploy to production on cPanel

### Prerequisites

- ✅ Backend built: `npm run build` completed
- ✅ cPanel login ready: `ghf57-22175.azdigihost.com:2083`
- ✅ SSH credentials: port 2210
- ✅ Database info: from earlier

### Quick Path (Copy-Paste)

Follow **DEPLOYMENT_CHECKLIST_AZDIGIHOST.md** - it has everything you need!

Or scroll down for **Step-by-Step** below.

---

### Step C.1: Build Locally

```bash
cd code/
npm run build
```

### Step C.2: SSH into cPanel

```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
# Password: ;)|o|=NhgnM)
```

### Step C.3: Create Backend Directory

```bash
mkdir -p ~/volxai
cd ~/volxai
```

### Step C.4: Upload Files via SCP

**In NEW terminal (not SSH):**

```bash
# From your local code/ folder
cd code/

# Upload backend
scp -P 2210 -r dist/server/* \
  jybcaorr@ghf57-22175.azdigihost.com:~/volxai/

# Upload frontend
scp -P 2210 -r dist/spa/* \
  jybcaorr@ghf57-22175.azdigihost.com:~/volxai/public/

# Upload config files
scp -P 2210 package.json \
  jybcaorr@ghf57-22175.azdigihost.com:~/volxai/

scp -P 2210 package-lock.json \
  jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
```

### Step C.5: Install Dependencies

**Back in SSH:**

```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/volxai

npm install --production
```

### Step C.6: Create .env File

```bash
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=your-secret-key-32-chars-minimum-here-jybcaorr
DB_HOST=localhost
DB_USER=jybcaorr_volxai_user
DB_PASSWORD=your-db-password
DB_NAME=jybcaorr_volxai
DB_PORT=3306
PORT=3000
PING_MESSAGE=ping pong
EOF

# Verify
cat .env
```

### Step C.7: Setup Node.js in cPanel

Go to: `https://ghf57-22175.azdigihost.com:2083`

1. **Login** with username `jybcaorr`
2. Find **Setup Node.js App**
3. Click **Create Application**
4. Fill in:
   ```
   Node Version: 18+
   Application mode: production
   Application root: /home/jybcaorr/volxai
   Application startup file: production.mjs
   Application URL: volxai
   ```
5. Click **Create**

### Step C.8: Restart App

In cPanel:
- **Setup Node.js App**
- Find `volxai` app
- Click **Restart**

### Step C.9: Test Deployment

```bash
# From your local machine
curl https://volxai.ghf57-22175.azdigihost.com/api/ping
```

✅ Should return: `{"message":"ping"}`

### Step C.10: Test in Browser

```
https://volxai.ghf57-22175.azdigihost.com
```

Try to register a user - should work!

---

## 📊 Summary: Which Option?

| Option | When | Time | Result |
|--------|------|------|--------|
| **A: Local** | Testing/development | 5 min | Works on localhost:3000 |
| **B: Check FTP** | Verify old server | 3 min | Know if it's running |
| **C: cPanel** | Production | 20 min | Live at azdigihost |

---

## 🚦 Next Steps

### **If you chose A (Local):**
- ✅ Continue developing locally
- 🚀 When ready, move to Option C

### **If you chose B (Check FTP):**
- ✅ Now you know FTP status
- 🚀 Use that URL or deploy to cPanel

### **If you chose C (cPanel):**
- ✅ Follow the detailed checklist
- ✅ Run test script after
- 🚀 You're live!

---

## 🆘 Still Getting "Failed to fetch"?

1. Check your API URL:
   - Local dev: `http://localhost:3000`
   - FTP: `http://103.221.221.67:3000`
   - cPanel: `https://volxai.ghf57-22175.azdigihost.com`

2. Verify backend is running:
   ```bash
   curl [your-backend-url]/api/ping
   ```

3. Check `.env` or `api.ts` has correct URL

4. Clear browser cache: Ctrl+Shift+Delete

5. Try in Incognito mode

---

**Ready? Pick your option above and follow the steps!** 🎯

