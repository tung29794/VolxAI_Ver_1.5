# Quick Start - Backend Deployment 🚀

## TL;DR - 5 Minute Setup

### 1️⃣ Deploy Files to FTP (2 minutes)

```bash
node deploy-backend.mjs
```

This uploads everything to your FTP hosting.

### 2️⃣ Start the Server (1 minute)

SSH into your server and run:

```bash
cd /api
node node-build.mjs
```

Or use PM2:

```bash
npm install -g pm2
pm2 start /api/node-build.mjs --name volxai
pm2 startup && pm2 save
```

### 3️⃣ Test It Works (1 minute)

```bash
curl http://103.221.221.67:3000/api/ping
# Should return: {"message":"ping pong"}
```

### 4️⃣ You're Done! ✨

- Frontend: https://volxai.netlify.app
- Backend: http://103.221.221.67:3000

---

## Detailed Steps

### Prerequisites

- ✅ Build complete: `npm run build`
- ✅ FTP credentials ready:
  - Host: `103.221.221.67`
  - User: `volxai@volxai.com`
  - Pass: `Qnoc7vBSy8qh+BpV`
- ✅ Database configured
- ✅ Node.js available on server

### Step 1: Deploy to FTP

**Option A: Automatic (Recommended)**

```bash
node deploy-backend.mjs
```

**Option B: Manual with FileZilla**

1. Open FileZilla
2. Enter FTP credentials above
3. Drag `dist/server/` to `/api`
4. Drag `dist/spa/` to `/public_html`
5. Upload `.env`

### Step 2: Start Backend

SSH to server:

```bash
ssh volxai@103.221.221.67
```

Then:

```bash
cd /api
node node-build.mjs
```

**For production, use PM2:**

```bash
npm install -g pm2
cd /api
pm2 start node-build.mjs --name volxai
pm2 startup
pm2 save
```

### Step 3: Verify

Test the API:

```bash
curl http://103.221.221.67:3000/api/ping
```

### Step 4: Check Frontend

Visit https://volxai.netlify.app and try:

1. Register new account
2. Login with email/password
3. View account info

---

## Common Commands

### Check Server Status

```bash
pm2 status
pm2 logs volxai
```

### Restart Server

```bash
pm2 restart volxai
```

### Stop Server

```bash
pm2 stop volxai
```

### View Logs

```bash
pm2 logs volxai --lines 100
```

---

## Testing API Endpoints

### Register User

```bash
curl -X POST http://103.221.221.67:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123456",
    "full_name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://103.221.221.67:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

Save the `token` from response.

### Get User Profile

```bash
curl http://103.221.221.67:3000/api/auth/me \
  -H "Authorization: Bearer <token_here>"
```

---

## Troubleshooting

### "Cannot find module"

```bash
cd /api
npm install
```

### "Port 3000 already in use"

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 node node-build.mjs
```

### "Cannot connect to database"

1. Check `.env` credentials
2. Verify MySQL is running
3. Test: `mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p`

### "API returns 404"

1. Check server is running: `pm2 status`
2. Check files uploaded: Check `/api` via FTP
3. Restart server: `pm2 restart volxai`

---

## File Structure

```
📦 Project Root
├── 📁 dist/
│   ├── 📁 spa/           ← Frontend (Netlify)
│   └── 📁 server/        ← Backend (FTP)
│       └── node-build.mjs
├── 📁 client/
│   └── 📁 lib/
│       └── api.ts        ← API client
├── 📄 deploy-backend.mjs  ← Deploy script
├── 📄 .env                ← Secrets
└── 📄 DEPLOYMENT_SUMMARY.md ← Full guide
```

---

## URLs After Setup

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://volxai.netlify.app                   |
| Backend API  | http://103.221.221.67:3000                   |
| Health Check | http://103.221.221.67:3000/api/ping          |
| Register     | http://103.221.221.67:3000/api/auth/register |
| Login        | http://103.221.221.67:3000/api/auth/login    |

---

## Next Steps

- [ ] Run `node deploy-backend.mjs`
- [ ] SSH to server
- [ ] Start backend with PM2
- [ ] Test `/api/ping`
- [ ] Test login on frontend
- [ ] Monitor logs

---

**Questions?** See `DEPLOYMENT_SUMMARY.md` for more details.
