# 📖 HƯỚNG DẪN SỬ DỤNG NHANH - VolxAI Website

## 🚀 Bắt Đầu Ngay (Chỉ 3 Lệnh)

```bash
# 1. Cài dependencies
npm install

# 2. Build production
npm run build

# 3. Deploy lên hosting
npm run deploy:prod
```

**Xong!** ✅ Website của bạn đã lên hosting.

---

## 📊 Thông Tin Hosting

### Database
```
Host: 103.221.221.67
Database: jybcaorr_lisacontentdbapi
User: jybcaorr_lisaaccountcontentapi
Password: 18{hopk2e$#CBv=1
Port: 3306
```

### FTP
```
Host: 103.221.221.67
User: volxai@volxai.com
Password: Qnoc7vBSy8qh+BpV
Port: 21
```

---

## 📋 Các Bước Chi Tiết

### Bước 1️⃣: Chuẩn Bị Database

1. Truy cập phpMyAdmin hoặc tool quản lý database
2. Chọn database: `jybcaorr_lisacontentdbapi`
3. Chạy SQL script từ file: `database/migrations/001_add_auth_columns.sql`

**SQL Script (Copy & Paste):**
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

✅ **Done!** Database đã sẵn sàng.

---

### Bước 2️⃣: Cài Dependencies

```bash
cd VolxAI-20Website
npm install
```

⏱️ Mất ~2-5 phút tùy vào internet.

✅ **Done!** Packages đã cài xong.

---

### Bước 3️⃣: Build Production

```bash
npm run build
```

⏱️ Mất ~1-2 phút.

✅ **Done!** Build hoàn tất. Folder `dist/` đã tạo.

---

### Bước 4️⃣: Deploy

```bash
npm run deploy:prod
```

✅ **Done!** Website đã upload lên hosting!

---

## 🧪 Test Sau Deploy (Optional)

### Test 1: Kiểm tra Website
```bash
curl https://volxai.com
```
Nếu có HTML response → Thành công! ✅

### Test 2: Kiểm tra API
```bash
curl https://volxai.com/api/ping
```
Response:
```json
{"message":"ping pong"}
```

### Test 3: Đăng Ký
```bash
curl -X POST https://volxai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "username": "testuser",
    "password": "Test@123"
  }'
```

Response nên có:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {...}
}
```

### Test 4: Đăng Nhập
```bash
curl -X POST https://volxai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test@123"
  }'
```

Response nên giống như test 3.

---

## 🔐 API Endpoints

### 1. Đăng Ký `/api/auth/register`
```json
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

**Response (200):**
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

---

### 2. Đăng Nhập `/api/auth/login`
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
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

---

### 3. Lấy Thông Tin User `/api/auth/me`
```json
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User found",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "full_name": "Full Name",
    "created_at": "2024-12-28T..."
  }
}
```

---

### 4. Đăng Xuất `/api/auth/logout`
```json
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## ⚙️ Tùy Chỉnh (Optional)

### Thay Đổi JWT Secret
Mở file `.env` và sửa:
```
JWT_SECRET=your-random-secret-key-here
```

### Thay Đổi Database Credentials
```
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
```

---

## 🆘 Gặp Lỗi?

### ❌ Lỗi: "npm: command not found"
**Giải pháp:**
- Cài Node.js từ https://nodejs.org
- Kiểm tra: `node --version`

### ❌ Lỗi: "Cannot connect to database"
**Giải pháp:**
1. Kiểm tra `.env` có đúng credentials không
2. Kiểm tra IP 103.221.221.67 có accessible không:
   ```bash
   ping 103.221.221.67
   ```
3. Kiểm tra database có bảng `users` không

### ❌ Lỗi: "FTP connection failed"
**Giải pháp:**
1. Kiểm tra credentials:
   - User: `volxai@volxai.com`
   - Pass: `Qnoc7vBSy8qh+BpV`
2. Sử dụng FileZilla thay vì npm script
3. Kiểm tra FTP port 21 có mở không

### ❌ Lỗi: "Build failed"
**Giải pháp:**
```bash
# Xóa cache và cài lại
rm -rf node_modules dist
npm install
npm run build
```

### ❌ API Returns 404
**Giải pháp:**
1. Kiểm tra files có upload lên hosting không
2. Kiểm tra `.htaccess` hoặc nginx config
3. Kiểm tra Node.js process có chạy không

### ❌ API Returns 500
**Giải pháp:**
1. Kiểm tra database connection
2. Kiểm tra table structures
3. Xem server logs

---

## 📚 Tài Liệu Chi Tiết

Cần thêm thông tin? Xem các file:
- **README.md** - Project overview
- **SETUP_COMPLETE.md** - Setup details
- **QUICK_DEPLOY.md** - Deployment guide
- **DEPLOYMENT_GUIDE.md** - Comprehensive guide
- **DEPLOYMENT_CHECKLIST.md** - Checklist & troubleshooting
- **DOCUMENTATION_INDEX.md** - All documentation

---

## 🎯 Tóm Tắt

| Công Việc | Command | Thời Gian |
|-----------|---------|----------|
| Cài dependencies | `npm install` | 2-5 phút |
| Build production | `npm run build` | 1-2 phút |
| Deploy | `npm run deploy:prod` | 5-10 phút |
| **Total** | | **10-20 phút** |

---

## ✅ Checklist

- [ ] Database SQL chạy thành công
- [ ] npm install hoàn tất
- [ ] npm run build không có lỗi
- [ ] .env file có credentials đúng
- [ ] npm run deploy:prod chạy thành công
- [ ] Website accessible (https://volxai.com)
- [ ] API ping response (https://volxai.com/api/ping)
- [ ] Register/Login test thành công

---

## 🎉 Hoàn Tất!

Website của bạn đã sẵn sàng! 

### Tiếp Theo:
1. Test tất cả API endpoints
2. Monitor performance
3. Collect user feedback
4. Cập nhật features theo nhu cầu

---

## 📞 Quick Help

**Có câu hỏi?** Xem:
1. DEPLOYMENT_CHECKLIST.md - Troubleshooting
2. DEPLOYMENT_GUIDE.md - Detailed guide
3. README.md - Project overview

---

**Created:** December 28, 2025  
**Version:** 1.0.0  
**Status:** Ready for Production ✅

Happy Coding! 🚀
