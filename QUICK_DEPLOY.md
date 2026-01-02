# VolxAI Website - Quick Deploy Guide

## 🚀 Quick Start Deploy

### Option 1: Automatic Deploy (Recommended)

```bash
# Build và upload automatically
npm run deploy:prod
```

### Option 2: Manual Deploy

```bash
# Step 1: Build
npm run build

# Step 2: Upload (sử dụng FileZilla hoặc lftp)
# Xem DEPLOYMENT_GUIDE.md cho hướng dẫn chi tiết

# Step 3: Configure Database (nếu chưa)
# Chạy các SQL queries từ database/migrations/001_add_auth_columns.sql
```

---

## 📋 Setup Checklist

### 1. ✅ Clone Repository
```bash
git clone https://github.com/tung29794/VolxAI-20Website.git
cd VolxAI-20Website
```

### 2. ✅ Cài Dependencies
```bash
npm install
# hoặc với pnpm
pnpm install
```

### 3. ✅ Cấu Hình Database

**Thêm cột vào bảng users (nếu chưa có):**

1. Mở phpMyAdmin
2. Chọn database `jybcaorr_lisacontentdbapi`
3. Chọn bảng `users`
4. Chạy SQL:

```sql
-- Nếu cột email chưa tồn tại
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE AFTER password_hash,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) AFTER email,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER full_name,
ADD INDEX IF NOT EXISTS idx_email (email);

-- Tạo sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. ✅ Cấu Hình Environment

File `.env` đã được cấu hình. Kiểm tra các thông tin:

```env
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
JWT_SECRET=volxai-secret-jwt-key-2024
```

### 5. ✅ Test Locally (Optional)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Kiểm tra API (trong 1 terminal khác)
curl http://localhost:5173/api/ping
```

### 6. ✅ Build & Deploy

```bash
# Build production
npm run build

# Deploy to hosting
npm run deploy:prod
```

---

## 📝 API Endpoints Sau Deploy

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "full_name": "Full Name",
    "created_at": "2024-12-28T..."
  }
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## 🧪 Test After Deploy

```bash
# Test frontend
curl https://volxai.com

# Test API ping
curl https://volxai.com/api/ping

# Test register
curl -X POST https://volxai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123",
    "full_name": "Test User"
  }'

# Test login
curl -X POST https://volxai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123"
  }'
```

---

## ⚠️ Common Issues & Solutions

### Issue: Database Connection Error

**Error:**
```
✗ Database connection failed: Error: connect ECONNREFUSED
```

**Solution:**
1. Kiểm tra credentials trong `.env`
2. Kiểm tra IP host `103.221.221.67` có accessible không:
```bash
ping 103.221.221.67
telnet 103.221.221.67 3306
```

### Issue: Upload Failed

**Error:**
```
✗ Failed to upload Frontend files: Permissions denied
```

**Solution:**
1. Kiểm tra FTP credentials
2. Kiểm tra folder permissions trên server (755 cho folders)
3. Sử dụng FileZilla thay vì script

### Issue: Auth Routes Not Working

**Error:**
```
404 Not Found /api/auth/register
```

**Solution:**
1. Kiểm tra build có hoàn tất không: `ls dist/server/`
2. Kiểm tra `.env` cấu hình
3. Xem server logs để debug

---

## 📚 Full Documentation

Xem `DEPLOYMENT_GUIDE.md` để có hướng dẫn chi tiết hơn.

---

## 🔧 Development

### Local Development
```bash
npm run dev
```

### Build
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

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs: `npm run dev` để xem console output
2. Kiểm tra browser console (F12)
3. Kiểm tra FTP log file
4. Kiểm tra database connection

---

**Last Updated:** December 28, 2025
**Version:** 1.0.0
