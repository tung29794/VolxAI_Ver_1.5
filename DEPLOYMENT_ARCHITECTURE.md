# 🏗️ VolxAI Deployment Architecture

**Visual guide to understand how your deployed system works**

---

## 📊 System Architecture After Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                      User's Browser                             │
│                                                                 │
│         https://volxai.ghf57-22175.azdigihost.com              │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        │                                            │
┌───────▼─────────┐                    ┌────────────▼──────┐
│   cPanel Nginx   │                    │   Node.js Server  │
│   Web Server     │                    │   (Production)    │
│                  │                    │                   │
│ Static Files:    │                    │ Serves:           │
│ ├── index.html   │                    │ ├── Frontend (SPA)│
│ ├── assets/      │                    │ ├── API Routes    │
│ └── js/css       │                    │ └── WebSockets    │
│                  │                    │                   │
└──────────────────┘                    └────────────┬──────┘
                                                     │
                                                     │
                                    ┌────────────────┴───────┐
                                    │                        │
                       ┌────────────▼────────────┐           │
                       │   MariaDB Database      │           │
                       │   (on same server)      │           │
                       │                         │           │
                       │  Tables:                │           │
                       │  ├── users              │           │
                       │  ├── sessions           │           │
                       │  ├── articles           │           │
                       │  ├── subscriptions      │           │
                       │  └── token_usage_logs   │           │
                       │                         │           │
                       └─────────────────────────┘           │
                                                              │
                       ┌──────────────────────────────────────┘
                       │
                       │ (Optional) External Services
                       │
                       ├─► Google OAuth (Sign in)
                       └─► Email Service (Notifications)
```

---

## 🔄 Request Flow

### 1️⃣ User visits website

```
Browser → https://volxai.ghf57-22175.azdigihost.com
   ↓
Nginx routes to → Node.js server
   ↓
Node.js serves → index.html + React app
   ↓
React loads in browser → User sees VolxAI home page
```

### 2️⃣ User clicks "Đăng ký" (Register)

```
Browser → /register route (React Router)
   ↓
React renders → Register form
   ↓
User fills form & clicks "Đăng ký"
   ↓
JavaScript POST → /api/auth/register
   ↓
Node.js backend receives request
   ↓
Backend validates data (Zod schema)
   ↓
Backend hashes password (bcryptjs)
   ↓
Backend writes to → MariaDB (users table)
   ↓
Backend generates → JWT token (7 days expiry)
   ↓
Backend returns → { token, user, success }
   ↓
React saves token → localStorage
   ↓
React redirects → /account page
   ↓
✅ User sees: "Đăng ký thành công! 🎉"
```

### 3️⃣ User logs in

```
Browser → /login route
   ↓
User enters email & password
   ↓
JavaScript POST → /api/auth/login
   ↓
Backend queries → MariaDB (find user by email)
   ↓
Backend compares → password hash
   ↓
If match → Generate new JWT token
   ↓
Backend returns → { token, user, success }
   ↓
React saves token → localStorage
   ↓
✅ Logged in! Can access protected pages
```

### 4️⃣ User accesses protected page (e.g., /account)

```
React checks localStorage
   ↓
Found token? 
   ├─→ YES → Render /account page
   │         Include token in Authorization header
   │         GET /api/auth/me
   │         Backend verifies JWT
   │         Backend returns user info
   │         Page displays data
   │
   └─→ NO → Redirect to /login
```

---

## 🗂️ File Structure on cPanel

```
/home/jybcaorr/
│
├── public_html/
│   ├── index.html          (Entry point)
│   ├── .htaccess           (React Router config)
│   └── assets/
│       ├── index-HASH.js   (React app bundled)
│       ├── index-HASH.css  (Styles)
│       └── ...
│
└── volxai/
    ├── production.mjs      (Compiled Node.js server)
    ├── production.mjs.map  (Source map for debugging)
    ├── package.json
    ├── .env                (Environment variables)
    ├── public/
    │   ├── index.html      (Same as /public_html)
    │   └── assets/         (Frontend files)
    │
    └── node_modules/       (Dependencies)
        ├── express
        ├── bcryptjs
        ├── jsonwebtoken
        ├── mysql2
        └── ... (other packages)
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│           Registration & Authentication Flow       │
└─────────────────────────────────────────────────────┘

REGISTER:
┌─────┐              ┌──────┐             ┌──────────┐
│User │──POST─────→  │ Node │──Hash─────→ │ MariaDB  │
│Form │  /register   │ .js  │ password   │  (write) │
└─────┘              │      │ + Insert   │          │
                     │      │            └──────────┘
                     │      │
                     │ JWT Sign
                     │ (7 days)
                     │
                     └──Token───→ Browser localStorage
                                 ✅ Logged in

LOGIN:
┌─────┐              ┌──────┐             ┌──────────┐
│User │──POST─────→  │ Node │──Query─────→ │ MariaDB  │
│Form │  /login      │ .js  │ + Verify    │  (read)  │
└─────┘              │      │ password    │          │
                     │      │             └──────────┘
                     │ JWT Sign
                     │
                     └──Token───→ Browser localStorage
                                 ✅ New session

API CALL with TOKEN:
┌──────────────┐     ┌──────────────┐      ┌─────────────┐
│ Authenticated│────→│ Request with │─────→│ Node.js     │
│ Request      │     │ JWT token in │      │ Validates   │
│ (with token) │     │ Authorization│      │ Token       │
└──────────────┘     │ header       │      │ (JWT.verify)│
                     └──────────────┘      └──────┬──────┘
                                                  │
                                          ✅ Valid? Proceed
                                          ❌ Invalid? 401
```

---

## 🔒 Security Features

### Password Security
```
User Password
    ↓
bcryptjs.hash(password, 10 rounds)
    ↓
Hashed password stored in database
(Never stored in plain text!)
    ↓
On login: bcryptjs.compare(entered, stored)
    ↓
✅ Match → Generate token
❌ No match → Reject login
```

### Token Security
```
JWT Token Generation:
- Includes: userId, email, username
- Signed with: JWT_SECRET (private key)
- Expires: 7 days
- Stored: Browser localStorage

Token Verification:
- User sends token in Authorization header
- Backend verifies signature (JWT_SECRET)
- If tampered with → Reject
- If expired → Request new login
```

### Database Security
```
- User passwords: Hashed (bcryptjs)
- Tokens: Stored separately in sessions table
- Sessions: Have expiry time
- User data: Not exposed to client
```

---

## 📊 Data Models

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255) HASHED,      -- Bcrypt hash
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT FOREIGN KEY,
  token VARCHAR(255) UNIQUE,          -- JWT token
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Other Tables
- `articles` - Saved articles
- `user_subscriptions` - Pricing plans
- `token_usage_history` - API usage tracking
- `audit_logs` - Login/action logs

---

## 🚀 Deployment Architecture Details

### Frontend (React SPA)
```
Location: /home/jybcaorr/public_html/ + /home/jybcaorr/volxai/public/
Type: Static files (HTML, CSS, JS)
Served by: Node.js server (Express static middleware)
Entry: index.html
Router: React Router (client-side)
Framework: React 18, TypeScript, Tailwind CSS
State: Context API + localStorage
```

### Backend (Node.js API)
```
Location: /home/jybcaorr/volxai/
Type: Express server
Port: 3000 (internal)
Exposed via: Nginx reverse proxy
Framework: Express, TypeScript
Database: mysql2 driver
Authentication: JWT tokens
Routes:
  ├── GET  /api/ping
  ├── POST /api/auth/register
  ├── POST /api/auth/login
  ├── POST /api/auth/logout
  └── GET  /api/auth/me
```

### Database (MariaDB)
```
Location: localhost:3306 (internal)
Database: jybcaorr_volxai
User: jybcaorr_volxai_user
Type: Relational (MySQL compatible)
Version: Latest available on cPanel
```

---

## 🌐 Domain & DNS

### Current Setup (After Deployment)
```
volxai.ghf57-22175.azdigihost.com
    ├─ Frontend: volxai.ghf57-22175.azdigihost.com
    ├─ Backend API: volxai.ghf57-22175.azdigihost.com/api
    └─ Both served by: Node.js on port 3000

(Or with custom domain like yourdomain.com)
    ├─ Frontend: yourdomain.com
    ├─ Backend API: yourdomain.com/api
    └─ Or separate: api.yourdomain.com
```

---

## 📈 Scaling Potential

### Current Setup
```
Single Node.js instance on port 3000
Handles sequential requests
Good for: < 100 concurrent users
```

### Future Scaling
```
If you need to scale:

Option 1: PM2 Cluster Mode
├── Run multiple Node.js processes
├── Load balance between them
└── Still single database

Option 2: Multiple Servers
├── Separate frontend CDN
├── Multiple backend instances
├── Database replication
└── Load balancing

Option 3: Microservices
├── Auth service
├── API service
├── Content service
├── Analytics service
└── Separate databases per service
```

---

## 🔧 Environment Variables Flow

```
.env file (on cPanel)
    ↓
Node.js reads on startup
    ↓
Process.env object contains values:
├── NODE_ENV=production
├── JWT_SECRET=secret-key
├── DB_HOST=localhost
├── DB_USER=jybcaorr_volxai_user
├── DB_PASSWORD=***
├── DB_NAME=jybcaorr_volxai
├── DB_PORT=3306
└── PORT=3000
    ↓
Used by application at runtime
    ↓
Never exposed to browser/client
```

---

## 🧪 Testing Architecture

### Unit Tests (Local)
```
npm run test
→ vitest runs
→ Tests auth logic, validation, etc.
```

### Integration Tests (After Deployment)
```
node test-cpanel-deployment.js [url]
→ Tests all endpoints
→ Verifies frontend loads
→ Tests registration flow
→ Tests login flow
→ Checks database connectivity
```

---

## 📊 Performance Considerations

### Frontend
```
React SPA (Single Page Application)
- Initial load: Download HTML + JS (100-300KB gzipped)
- After: Navigate without page reloads
- Fast local routing (React Router)
- Good for: Modern browsers, >5MB+ connection

CDN/Caching:
- Static assets: Cache 1 year
- index.html: Cache 1 hour
- API responses: Cache based on need
```

### Backend
```
Express Server
- Request/response time: ~50-200ms
- Database query time: ~10-50ms
- Network latency: ~20-100ms

Optimization:
- Connection pooling (mysql2)
- Token caching (JWT)
- Response compression (gzip)
```

---

## 🎯 Summary

```
┌──────────────────────────────────────────────────┐
│        Your VolxAI Deployment Summary           │
├──────────────────────────────────────────────────┤
│                                                  │
│ Domain:     volxai.ghf57-22175.azdigihost.com   │
│ Server:     cPanel / Node.js / Express          │
│ Database:   MariaDB (on same server)            │
│ Frontend:   React SPA + Tailwind CSS            │
│ Backend:    Node.js + Express + JWT             │
│ Auth:       Bcrypt + JWT tokens (7 days)        │
│                                                  │
│ Users:                                           │
│ ├─ Can register with email & password           │
│ ├─ Can login with JWT token                     │
│ ├─ Can access protected pages                   │
│ ├─ Can logout (session cleared)                 │
│ └─ Data stored in MariaDB                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

**This is your VolxAI deployment! 🚀**

Now go deploy it! Open **DEPLOYMENT_CHECKLIST_AZDIGIHOST.md**

