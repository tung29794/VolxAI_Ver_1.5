# Mixed Content Error Fix - VolxAI

## ❌ Problem

Your frontend at `https://volxai.com/login` is trying to access your backend at `http://103.221.221.67:3000/api/auth/login` (plain HTTP).

**Browsers block this for security:** HTTPS pages cannot make requests to unsecured HTTP endpoints.

## ✅ Solution Path

Follow the steps below based on your server setup:

---

### **Option 1: Enable HTTPS on Backend Server (RECOMMENDED)**

If you have SSH access or support on your backend server (103.221.221.67):

#### Step 1: Install Let's Encrypt SSL

```bash
ssh root@103.221.221.67
cd /path/to/your/app
npm install -g certbot
certbot certonly --standalone -d yourdomain.com
```

#### Step 2: Update Node.js to use HTTPS

Create an HTTPS server in your backend:

```javascript
const https = require("https");
const fs = require("fs");
const app = require("./app");

const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/yourdomain.com/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/yourdomain.com/fullchain.pem"),
};

https.createServer(options, app).listen(3000);
```

#### Step 3: Update Frontend Configuration

Change `.env.production`:

```
VITE_API_URL=https://103.221.221.67:3000
```

#### Step 4: Rebuild and redeploy frontend

```bash
npm run build
# Upload dist/ folder to cPanel public_html
```

---

### **Option 2: Use cPanel Reverse Proxy (IF AVAILABLE)**

Some cPanel hosts allow you to proxy requests through the main domain:

#### Step 1: Check cPanel for Reverse Proxy

- Log in to cPanel
- Look for "Proxy" or "Reverse Proxy" settings
- Create a rule: `/api` → `http://103.221.221.67:3000`

#### Step 2: Update Frontend Configuration

Change `.env.production`:

```
VITE_API_URL=/api
```

#### Step 3: Rebuild and redeploy

```bash
npm run build
# Upload dist/ folder to cPanel public_html
```

---

### **Option 3: Use Domain-Based HTTPS**

If your hosting provider allows a separate API domain:

#### Step 1: Create API subdomain in cPanel

- Create subdomain: `api.volxai.com` pointing to backend
- Enable SSL on the subdomain

#### Step 2: Update Frontend Configuration

```
VITE_API_URL=https://api.volxai.com
```

#### Step 3: Update Backend CORS

```javascript
// server/index.ts or your Express app
app.use(
  cors({
    origin: "https://volxai.com",
    credentials: true,
  }),
);
```

---

## 🔍 Quick Test

To determine which option to use, run these commands:

### Test 1: Can backend be accessed via HTTPS?

```bash
curl https://103.221.221.67:3000/api/ping
# If this works → Use Option 1
```

### Test 2: Can backend be proxied via cPanel?

```bash
curl https://volxai.com/api/ping
# If this works → Use Option 2
```

### Test 3: Is there a domain for the API?

```bash
curl https://api.volxai.com/api/ping
# If this works → Use Option 3
```

---

## 📝 Files to Update

After choosing an option:

1. **`.env.production`** - Update `VITE_API_URL`
2. **`client/lib/api.ts`** - Already reads from `VITE_API_URL`, no change needed
3. **Frontend build** - Run `npm run build` and redeploy
4. **Backend** - May need CORS update if using subdomain/reverse proxy

---

## 🆘 Still Not Working?

1. Check browser console for exact error
2. Verify backend is running: `curl http://103.221.221.67:3000/api/ping`
3. Check if backend has CORS properly configured
4. Verify frontend was rebuilt with new `VITE_API_URL`

---

## Contact Your Hosting

If unsure, contact your hosting provider:

- **For cPanel:** Ask if they support Node.js reverse proxy
- **For Backend Server:** Ask if they can help install SSL certificate for port 3000
