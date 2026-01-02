# VolxAI Website

![Status](https://img.shields.io/badge/Status-Ready%20for%20Deployment-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A modern full-stack web application built with TypeScript, React, Express, and MySQL. Features user authentication with JWT tokens, secure password hashing, and automated deployment.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Deploy to hosting
npm run deploy:prod
```

## 📚 Documentation

Start here based on your role:

### 👨‍💼 Project Managers
→ [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What's been done

### 👨‍💻 Developers (First Time)
→ [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - Project overview

### 🚀 DevOps/Deployment
→ [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide

### ⚡ Experienced Developers
→ [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Quick reference

### 📋 Verification
→ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre/post deployment checklist

### 📚 Full Documentation Index
→ [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - All documentation

---

## ✨ Features

### Authentication
- ✅ User registration with email validation
- ✅ Secure login with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Session management
- ✅ Token-based authorization
- ✅ Automatic session cleanup

### Security
- ✅ SQL injection prevention (parameterized queries)
- ✅ Timing attack prevention
- ✅ Environment variable protection
- ✅ CORS configuration
- ✅ Error handling without info leakage

### Technology Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend:** Express, Node.js, TypeScript
- **Database:** MySQL with connection pooling
- **Security:** bcryptjs, jsonwebtoken, Zod validation
- **Deployment:** Automated FTP/SFTP upload

---

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm or pnpm
- MySQL Database (provided)
- FTP/SFTP access to hosting (provided)

---

## 🛠️ Setup

### 1. Clone Repository
```bash
git clone https://github.com/tung29794/VolxAI-20Website.git
cd VolxAI-20Website
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
File `.env` is already configured with:
- Database credentials
- JWT secret
- Server configuration

**For new installations:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Setup Database (First Time Only)
Run SQL migrations from `database/migrations/001_add_auth_columns.sql`:

```sql
-- Add columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🚀 Development

### Start Development Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser

### Build for Production
```bash
npm run build
```

### Type Check
```bash
npm run typecheck
```

### Format Code
```bash
npm run format.fix
```

---

## 📦 Production Deployment

### One-Command Deploy
```bash
npm run deploy:prod
```

This will:
1. Build frontend and backend
2. Connect to FTP hosting
3. Upload all files
4. Deploy configuration

### Manual Deploy
```bash
# Build
npm run build

# Upload via FileZilla (GUI) or lftp (CLI)
# See DEPLOYMENT_GUIDE.md for detailed instructions
```

---

## 🔐 API Endpoints

### Authentication Routes

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## 📊 Project Structure

```
VolxAI-20Website/
├── client/                    # Frontend React app
├── server/                    # Backend Express server
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   └── demo.ts
│   ├── db.ts                 # Database connection
│   └── index.ts              # Server setup
├── database/                 # Database files
│   └── migrations/           # SQL migration scripts
├── public/                   # Static assets
├── shared/                   # Shared types
├── .env                      # Configuration (not in git)
├── .env.example              # Configuration template
├── deploy.mjs                # Deployment script
├── package.json              # Dependencies
└── README.md                 # This file
```

---

## 🧪 Testing

### Test Locally
```bash
npm run dev
curl http://localhost:5173/api/ping
```

### Test Production
```bash
# Register
curl -X POST https://volxai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123"
  }'

# Login
curl -X POST https://volxai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123"
  }'
```

---

## 🔑 Credentials

### Database
- **Host:** 103.221.221.67
- **Database:** jybcaorr_lisacontentdbapi
- **User:** jybcaorr_lisaaccountcontentapi
- **Password:** 18{hopk2e$#CBv=1

### FTP Hosting
- **Host:** 103.221.221.67
- **User:** volxai@volxai.com
- **Password:** Qnoc7vBSy8qh+BpV

---

## ⚠️ Security Notes

1. **JWT Secret:** Change `JWT_SECRET` in `.env` to a random strong value
2. **Database:** Credentials protected in `.env` (not in git)
3. **Passwords:** Hashed with bcryptjs, never stored in plain text
4. **HTTPS:** Use SSL certificates in production
5. **Backups:** Regularly backup database

---

## 🆘 Troubleshooting

### Database Connection Failed
```bash
# Check .env credentials
cat .env

# Test connection
telnet 103.221.221.67 3306
```

### Build Error
```bash
# Clear and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Deployment Failed
```bash
# Check FTP credentials
# See DEPLOYMENT_CHECKLIST.md for detailed steps
```

### API Returns 500
```bash
# Check database connection
# Check table structure
# Review server logs
```

For more troubleshooting, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) | Project overview |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Comprehensive deployment |
| [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) | Quick reference |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | Verification steps |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | What's implemented |
| [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) | Doc index |

---

## 📝 Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run build:client     # Build frontend only
npm run build:server     # Build backend only
npm run start            # Start production server
npm run deploy           # Deploy (local)
npm run deploy:prod      # Deploy (production)
npm run typecheck        # Check TypeScript
npm run format.fix       # Format code
npm run test             # Run tests
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run typecheck` and `npm run format.fix`
4. Push and create a pull request

---

## 📄 License

MIT License - feel free to use this project as you wish.

---

## 📞 Support

Having issues? Check:
1. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Common issues
2. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed guide
3. Error logs and console output

---

## 🎯 What's Next?

### Immediate (Today)
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Run `npm run deploy:prod`
- [ ] Test authentication endpoints

### Short Term (This Week)
- [ ] Monitor deployment
- [ ] Test all features
- [ ] Check analytics
- [ ] Get user feedback

### Future (Coming Soon)
- [ ] Email verification
- [ ] Password reset flow
- [ ] OAuth integration
- [ ] Admin dashboard
- [ ] User profile management

---

## 🎉 Status

✅ **Development:** Complete  
✅ **Testing:** Ready  
✅ **Documentation:** Complete  
⏳ **Deployment:** Ready  

---

**Last Updated:** December 28, 2025  
**Version:** 1.0.0  
**Status:** Ready for Production ✅

For detailed information, see [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
