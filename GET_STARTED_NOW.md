# ⚡ Get Started NOW - Quick Action

**Pick ONE and follow the commands below. Copy-paste and run!**

---

## 🎯 Option 1: Start Backend Locally (FASTEST - Do this now!)

**Why:** Test login immediately without any setup

### Copy-Paste These Commands:

```bash
# 1. Build everything (2 min)
npm run build

# 2. Start the server (same terminal)
npm run start

# You should see:
# 🚀 VolxAI Server running on port 3000
# 📱 Frontend: http://localhost:3000
```

### Done! 

Open: **http://localhost:3000** in browser

Try to login now - should work! ✅

---

## 🎯 Option 2: Check if FTP Backend (103.221.221.67) is Running

**Why:** See if old backend is still alive

### Copy-Paste These Commands:

```bash
# Test if backend is running
curl http://103.221.221.67:3000/api/ping

# If you see: {"message":"ping"}
# ✅ Backend is running! Update your frontend API URL to use it.

# If you see error:
# ❌ Backend is down. Either:
#    - Start it (Option 1)
#    - Deploy to cPanel (Option 3)
```

---

## 🎯 Option 3: Deploy to cPanel (PRODUCTION)

**Why:** Go live for real users

### Quick 5-Step Deployment:

```bash
# Step 1: Build (2 min)
npm run build

# Step 2: SSH into cPanel (1 min)
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
# Password: ;)|o|=NhgnM)

# Step 3: Create folder (while in SSH)
mkdir -p ~/volxai
cd ~/volxai

# Step 4: Upload files (open NEW terminal, run from code/ folder)
scp -P 2210 -r dist/server/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
scp -P 2210 -r dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/public/
scp -P 2210 package.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
scp -P 2210 package-lock.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/

# Step 5: Install & Start (back in SSH)
npm install --production
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=secret-key-min-32-chars-jybcaorr-2024
DB_HOST=localhost
DB_USER=jybcaorr_volxai_user
DB_PASSWORD=your-db-password-here
DB_NAME=jybcaorr_volxai
DB_PORT=3306
PORT=3000
EOF
```

### Then in cPanel GUI:

1. Go to: https://ghf57-22175.azdigihost.com:2083
2. Find: **Setup Node.js App**
3. Click: **Create Application**
4. Fill:
   - Node Version: 18+
   - App root: `/home/jybcaorr/volxai`
   - Startup file: `production.mjs`
   - App URL: `volxai`
5. Click: **Create**
6. Click: **Restart**

### Test it:

```bash
# From your local machine
curl https://volxai.ghf57-22175.azdigihost.com/api/ping

# Should return: {"message":"ping"}
```

### Done!

Open: **https://volxai.ghf57-22175.azdigihost.com**

Login should work! ✅

---

## 📋 Which ONE Should You Do?

```
├─ QUICKEST (5 min):        Option 1 - Local
├─ VERIFY OLD (3 min):      Option 2 - FTP Check  
└─ PRODUCTION (20 min):     Option 3 - cPanel
```

**👉 I recommend: Start with Option 1 (Local) to test, then do Option 3 (cPanel) to go live**

---

## 🆘 Not Working?

### "Failed to fetch" still showing?

```bash
# Check which backend you're trying to use:

# If local:
curl http://localhost:3000/api/ping

# If FTP:
curl http://103.221.221.67:3000/api/ping

# If cPanel:
curl https://volxai.ghf57-22175.azdigihost.com/api/ping

# One of them should return: {"message":"ping"}
```

Then make sure your frontend is pointing to the right one.

**Edit `client/lib/api.ts` line 8:**

```typescript
// Local
const API_BASE_URL = "http://localhost:3000";

// or FTP
const API_BASE_URL = "http://103.221.221.67:3000";

// or cPanel
const API_BASE_URL = "https://volxai.ghf57-22175.azdigihost.com";
```

Then: `npm run build` and restart

---

## 📚 Full Guides

- **BACKEND_SETUP_GUIDE.md** - Detailed explanations
- **DEPLOYMENT_CHECKLIST_AZDIGIHOST.md** - Step-by-step checklist
- **START_DEPLOYMENT_HERE.md** - Overview

---

## 🚀 Let's Go!

**Pick your option above and start with the first command!** 

Questions? Check the detailed guides or run the test script after deployment.

**You've got this! 💪**

