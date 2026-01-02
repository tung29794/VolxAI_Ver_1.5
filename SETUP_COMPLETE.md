# 🎯 VolxAI Website - Authentication & Deployment Setup

## 📊 Project Status

✅ **Database Structure** - Bảng users đã sẵn có  
✅ **Auth Module** - Login, Register, Sessions đã implement  
✅ **API Routes** - `/api/auth/*` endpoints ready  
✅ **Database Migrations** - SQL scripts prepared  
✅ **Deployment Guide** - FTP upload documentation  
✅ **Environment Config** - `.env` configured with credentials  

---

## 🗄️ Database Configuration

### Database Info
- **Host:** 103.221.221.67
- **Database:** jybcaorr_lisacontentdbapi
- **User:** jybcaorr_lisaaccountcontentapi
- **Password:** 18{hopk2e$#CBv=1

### Tables
1. **users** (existing)
   - id, username, password_hash, token_balance, created_at, last_login, updated_at
   - **New columns to add:** email, full_name, is_active

2. **sessions** (new)
   - Tracks user sessions with JWT tokens

3. **password_reset_tokens** (new)
   - For password reset functionality

---

## 🚀 Quick Deploy

### Step 1: Build
```bash
npm install
npm run build
```

### Step 2: Configure Database
Run SQL migrations from `database/migrations/001_add_auth_columns.sql`

### Step 3: Deploy
```bash
npm run deploy:prod
```

---

## 🔐 Authentication API

### Register
**POST** `/api/auth/register`
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

### Login
**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User
**GET** `/api/auth/me`
- Header: `Authorization: Bearer <token>`

### Logout
**POST** `/api/auth/logout`
- Header: `Authorization: Bearer <token>`

---

## 📁 File Structure

```
VolxAI-20Website/
├── server/
│   ├── routes/
│   │   ├── auth.ts          ✅ Authentication routes
│   │   └── demo.ts
│   ├── db.ts                ✅ Database connection
│   └── index.ts             ✅ Server setup
├── database/
│   ├── migrations/
│   │   └── 001_add_auth_columns.sql  ✅ Database schema
│   └── schema.sql
├── .env                     ✅ Configuration
├── .env.example             ✅ Example config
├── deploy.mjs               ✅ Auto deploy script
├── DEPLOYMENT_GUIDE.md      📖 Detailed guide
├── QUICK_DEPLOY.md          📖 Quick start guide
└── package.json             ✅ Dependencies updated
```

---

## 🔑 Environment Variables

File `.env` sudah dikonfigurasi dengan:

```env
# Database
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi

# Security
JWT_SECRET=volxai-secret-jwt-key-2024

# Server
PING_MESSAGE=ping pong
```

⚠️ **Security Note:** 
- Jangan commit `.env` ke git
- Ubah JWT_SECRET ke nilai random yang kuat di production
- File `.env` sudah di `.gitignore`

---

## 🎯 Hosting Information

### FTP Hosting
- **IP:** 103.221.221.67
- **User:** volxai@volxai.com
- **Password:** Qnoc7vBSy8qh+BpV
- **Port:** 21 (FTP) atau 22 (SFTP)

### Deployment Methods
1. **Automatic (npm):** `npm run deploy:prod`
2. **FileZilla (GUI):** Upload `dist/` folders manually
3. **lftp (CLI):** Use FTP script from DEPLOYMENT_GUIDE.md

---

## 📦 Dependencies Added

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",           // Password hashing
    "jsonwebtoken": "^9.1.2",       // JWT tokens
    "mysql2": "^3.6.5",             // MySQL connection
  },
  "devDependencies": {
    "ssh2-sftp-client": "^11.1.0"   // SFTP deployment
  }
}
```

---

## ✅ Implementation Details

### Password Security
- ✅ Passwords hashed dengan bcryptjs (10 salt rounds)
- ✅ Never stored in plain text
- ✅ Safe comparison to prevent timing attacks

### Authentication
- ✅ JWT tokens with 7-day expiration
- ✅ Session tracking in database
- ✅ Token validation on protected routes
- ✅ Logout clears sessions

### Validation
- ✅ Email format validation
- ✅ Username minimum 3 characters
- ✅ Password minimum 6 characters
- ✅ Zod schema validation

### Database
- ✅ Connection pooling (10 connections)
- ✅ Automatic reconnection
- ✅ Error handling
- ✅ Foreign key relationships

---

## 🧪 Testing

### Test Locally
```bash
npm run dev
```

### Test After Deploy
```bash
# Register
curl -X POST https://volxai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"Test@123"}'

# Login
curl -X POST https://volxai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'
```

---

## 📖 Documentation

- **DEPLOYMENT_GUIDE.md** - Comprehensive deployment instructions
- **QUICK_DEPLOY.md** - Quick start guide
- **database/migrations/** - SQL schema files
- **.env.example** - Environment template

---

## ⚠️ Important Notes

### Before Deploy
1. Run database migrations
2. Update JWT_SECRET to a random strong key
3. Test locally with `npm run dev`
4. Verify `.env` credentials are correct

### During Deploy
1. Build production: `npm run build`
2. Verify `dist/` folders exist
3. Run deploy: `npm run deploy:prod`
4. Check console for upload status

### After Deploy
1. Test API endpoints
2. Try register/login flow
3. Check server logs for errors
4. Verify database connection

---

## 🔧 Troubleshooting

### Build Error
```bash
npm run typecheck
npm run build
```

### Database Connection Failed
- Check `.env` credentials
- Verify server IP is accessible
- Test: `telnet 103.221.221.67 3306`

### Upload Failed
- Check FTP credentials
- Use FileZilla instead of auto script
- Check file permissions

### API Not Responding
- Check if server is running
- Verify web server proxy settings
- Check `.htaccess` or nginx config

---

## 📋 Next Steps

1. **Test Database Connection**
   ```bash
   npm run dev
   curl http://localhost:5173/api/ping
   ```

2. **Run Database Migrations**
   - Execute SQL from `database/migrations/001_add_auth_columns.sql`

3. **Build Production**
   ```bash
   npm run build
   ```

4. **Deploy to Hosting**
   ```bash
   npm run deploy:prod
   ```

5. **Verify Deployment**
   - Test API endpoints
   - Check website loads
   - Test auth flows

---

## 🆘 Support

If you encounter issues:

1. Check DEPLOYMENT_GUIDE.md for detailed steps
2. Review error messages in console/logs
3. Verify all credentials are correct
4. Check database table structures
5. Test with curl before front-end

---

**Created:** December 28, 2025  
**Version:** 1.0.0  
**Status:** Ready for Deployment ✅
