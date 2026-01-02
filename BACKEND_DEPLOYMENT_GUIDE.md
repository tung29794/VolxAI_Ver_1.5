# Backend Deployment Guide - VolxAI

## Overview

Deploy the Node.js backend server to your FTP hosting at **103.221.221.67**

## Prerequisites

- ✅ Backend code is built in `dist/server/`
- ✅ Frontend is in `dist/spa/`
- ✅ `.env` file configured with database credentials

## Deployment Steps

### Step 1: Set Environment Variables

Create a `.env` file on your server with:

```bash
# Database Configuration
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
DB_PORT=3306

# JWT Configuration
JWT_SECRET=volxai-secret-jwt-key-2024

# Server Configuration
PORT=3000
NODE_ENV=production
PING_MESSAGE=ping pong
```

### Step 2: Upload Files to FTP

Use **FileZilla** or command line FTP:

**FTP Credentials:**

- Host: `103.221.221.67`
- Username: `volxai@volxai.com`
- Password: `Qnoc7vBSy8qh+BpV`
- Port: `21`

**Upload these folders:**

1. Local `dist/spa/` → Remote `/public_html/`
2. Local `dist/server/` → Remote `/api/` or `/backend/`
3. Local `.env` → Remote root `/` or `/api/`

### Step 3: Ensure Node.js is Running

Your hosting should have Node.js available. Check:

```bash
node --version
npm --version
```

If not available, contact your hosting provider to enable Node.js.

### Step 4: Start the Server

**Option A: Using Node directly**

```bash
cd /path/to/backend
node dist/server/node-build.mjs
```

**Option B: Using PM2 (Recommended for production)**

```bash
npm install -g pm2

# Start the server
pm2 start /path/to/server/node-build.mjs --name "volxai-backend"

# Make it restart on reboot
pm2 startup
pm2 save
```

**Option C: Using a Cron job** (if you have control panel)
Add to crontab:

```bash
@reboot /usr/bin/node /path/to/backend/dist/server/node-build.mjs >> /var/log/volxai.log 2>&1
```

### Step 5: Verify Deployment

Test the API:

```bash
# Test ping endpoint
curl http://103.221.221.67:3000/api/ping

# Expected response:
# {"message":"ping pong"}
```

### Step 6: Connect Frontend to Backend

Update the frontend API URL. In your Netlify dashboard or when deploying, set:

```bash
VITE_API_URL=http://103.221.221.67:3000
```

Or update the frontend code:

```typescript
// In client/lib/api.ts or similar
const API_URL = process.env.VITE_API_URL || "http://103.221.221.67:3000";
```

---

## Automated Deployment Script

Save this as `deploy-to-ftp.sh` and run:

```bash
#!/bin/bash

# Configuration
FTP_HOST="103.221.221.67"
FTP_USER="volxai@volxai.com"
FTP_PASS="Qnoc7vBSy8qh+BpV"
FTP_PORT="21"

# Build
echo "Building project..."
npm run build

# Deploy using lftp
echo "Deploying to FTP..."
lftp -u ${FTP_USER},${FTP_PASS} ${FTP_HOST} <<EOF
mirror -R dist/spa/ /public_html/
mirror -R dist/server/ /api/
put .env
quit
EOF

echo "Deployment complete!"
```

Run it:

```bash
chmod +x deploy-to-ftp.sh
./deploy-to-ftp.sh
```

---

## Troubleshooting

### API returns 404

- Check if files are uploaded to `/api/` folder
- Verify `node-build.mjs` is executable

### Cannot connect to database

- Verify database credentials in `.env`
- Check if MySQL port 3306 is open
- Ensure database tables exist (run SQL from DEPLOYMENT_CHECKLIST.md)

### Server crashes on startup

- Check server logs: `tail -f /var/log/volxai.log`
- Verify Node.js version is compatible (Node 18+)
- Ensure all dependencies are installed

### Port already in use

- Change PORT in `.env` to another port (3001, 3002, etc)
- Or kill the process: `pkill -f "node-build.mjs"`

---

## Testing API Endpoints

Once deployed, test these:

### Register User

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

### Login

```bash
curl -X POST http://103.221.221.67:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volxai.com",
    "password": "Test@123456"
  }'
```

### Get Current User

```bash
curl -X GET http://103.221.221.67:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## Production Checklist

- [ ] Build successful: `npm run build`
- [ ] Files uploaded via FTP
- [ ] `.env` configured on server
- [ ] Node.js running on server
- [ ] Database connection working
- [ ] API responding to requests
- [ ] Frontend connected to backend URL
- [ ] SSL/HTTPS configured
- [ ] PM2 or supervisor set up
- [ ] Logs configured

---

## Next Steps

1. **Upload files** to FTP using FileZilla
2. **Start the server** using PM2 or Node directly
3. **Test API endpoints** to verify everything works
4. **Update frontend** to point to your backend URL
5. **Monitor logs** for any issues

---

**Need Help?**

- Backend Logs: `/api/server.log`
- Database Logs: Check phpMyAdmin
- Node.js Docs: https://nodejs.org/docs/
- PM2 Docs: https://pm2.keymetrics.io/
