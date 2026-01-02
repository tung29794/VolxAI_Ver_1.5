# Frontend Rebuild - Fix Mixed Content Error

## Problem

Frontend was built with the old HTTP API URL (`http://103.221.221.67:3000`), causing mixed content errors when:

- Trying to register: `https://volxai.com/register` → ❌ Blocked
- Trying to login: `https://volxai.com/login` → ❌ Blocked

## Solution

Rebuild the frontend with the production environment variables that use HTTPS.

---

## Step 1: Fix API URL Fallback ✓ (Already Done)

Updated `client/lib/api.ts` to use HTTPS as fallback:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.volxai.com";
```

---

## Step 2: Rebuild Frontend Locally

### 2.1 On Your Local Machine

```bash
# Navigate to project directory
cd /path/to/volxai/project

# Install dependencies (if not done)
npm install

# Build frontend with production environment
npm run build:client
```

This creates:

- `dist/spa/` - Compiled frontend files with correct API URL

### 2.2 Build Backend (Optional if not changed)

```bash
npm run build:server
```

### 2.3 Build Everything at Once

```bash
npm run build
```

---

## Step 3: Upload New Build to Server

### Option A: Using SFTP (Recommended)

Upload the new `dist/` folder to server:

```bash
# Using scp (from your local machine)
scp -r dist/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/
```

### Option B: Manual Upload via File Manager

1. Connect via SFTP client (FileZilla, WinSCP, etc.)
2. Navigate to `/home/jybcaorr/`
3. Delete old `dist/` folder
4. Upload new `dist/` folder

---

## Step 4: Run Deployment Script on Server

```bash
# SSH into server
ssh jybcaorr@ghf57-22175.azdigihost.com

# Navigate to home
cd /home/jybcaorr

# Run deployment script to copy files
bash DEPLOY.sh
```

This updates:

- Frontend files in: `/home/jybcaorr/public_html/`
- Backend files in: `/home/jybcaorr/api.volxai.com/`

---

## Step 5: Verify Frontend Updated

Check if frontend now has correct API URL:

```bash
# SSH into server
ssh jybcaorr@ghf57-22175.azdigihost.com

# Check if new file exists
ls -la /home/jybcaorr/public_html/index.html

# Check timestamp (should be recent)
stat /home/jybcaorr/public_html/index.html
```

---

## Step 6: Clear Browser Cache & Test

1. **Hard refresh** in browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache** if needed
3. **Test registration**: https://volxai.com/register
   - Should NOT show mixed content error
   - Should be able to submit form
4. **Test login**: https://volxai.com/login
   - Should NOT show mixed content error
   - Should be able to submit form

---

## Quick Summary

```bash
# Local machine
npm run build

# Upload dist/ to server via SFTP
scp -r dist/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/

# Server
ssh jybcaorr@ghf57-22175.azdigihost.com
bash DEPLOY.sh

# Test
curl https://api.volxai.com/api/ping
# Should return: {"message":"ping pong"}
```

---

## Environment Variables Used During Build

The build process uses `.env.production`:

```
VITE_API_URL=https://api.volxai.com
VITE_APP_NAME=VolxAI
VITE_APP_VERSION=1.0.0
```

These get compiled into the JavaScript bundle, so they can't be changed after deployment without rebuilding.

---

## Troubleshooting

### Still Getting Mixed Content Error?

1. **Clear browser cache completely**:
   - DevTools → Application → Clear storage
   - Or use incognito/private window

2. **Verify new files were deployed**:

   ```bash
   ssh jybcaorr@ghf57-22175.azdigihost.com
   ls -la /home/jybcaorr/public_html/assets/ | head -5
   ```

   Compare timestamps with when you ran DEPLOY.sh

3. **Check browser network tab**:
   - Open DevTools → Network tab
   - Look for HTTP requests (should all be HTTPS)
   - If still HTTP, files weren't updated

### API Still Returns 503?

1. Check Node.js is running: `cPanel → Setup Node.js App → volxai-api`
2. Status should be: **Running**
3. If not, click **Restart**
