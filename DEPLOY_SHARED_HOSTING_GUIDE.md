# 🚀 Deploy VolxAI to Shared Hosting (Same Server Setup)

**Bạn sắp triển khai VolxAI trên shared hosting với cả database và source code trên cùng một server.**

---

## 📋 Yêu cầu

- ✅ Shared hosting hỗ trợ **Node.js** (cPanel)
- ✅ **phpMyAdmin** access để quản lý database
- ✅ SSH access hoặc cPanel File Manager
- ✅ Domain name (ví dụ: `volxai.com`)

---

## 🎯 Tổng quan triển khai

```
Shared Hosting (Same Server)
├── Database (MariaDB/MySQL)
│   ├── Database: volxai_db
│   ├── User: volxai_user
│   └── Tables: users, sessions, articles, subscriptions, ...
│
├── Frontend (React/Vite)
│   └── /home/username/public_html/ (served by Apache/Nginx)
│       ├── index.html
│       ├── assets/
│       └── ...
│
└── Backend (Node.js)
    └── /home/username/public_html/api/ (Node.js App)
        ├── dist/server/node-build.mjs
        ├── dist/spa/
        ├── .env
        └── package.json
```

---

## ✅ PHẦN 1: Chuẩn bị trên máy local

### Bước 1: Build ứng dụng

```bash
cd code/
npm run build
```

**Kết quả:**

```
✓ dist/spa/              → Frontend (React build)
✓ dist/server/           → Backend (Node.js)
  - node-build.mjs
  - node-build.mjs.map
```

### Bước 2: Chuẩn bị tệp cấu hình

Tạo file `.env` cho production (dùng credentials từ cPanel):

```bash
# Copy template
cp .env.shared-hosting .env

# Edit .env
nano .env
```

**Điền vào `.env`:**

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=volxai_user
DB_PASSWORD=your_cpanel_password
DB_NAME=volxai_db
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key-2024-change-this
PING_MESSAGE=ping pong
```

---

## ✅ PHẦN 2: Cài đặt Database trên cPanel

### Bước 1: Tạo Database

1. **Đăng nhập vào cPanel**
2. Tìm **MySQL Databases** (hoặc **MariaDB**)
3. **Create New Database:**
   - Database Name: `volxai_db`
   - Nhấp **Create Database**

### Bước 2: Tạo MySQL User

1. Tìm **MySQL Users**
2. **Create New User:**
   - Username: `volxai_user`
   - Password: (tạo mật khẩu mạnh) ← **GHI NHỚ MẬT KHẨU NÀY**
   - Nhấp **Create User**

### Bước 3: Gán quyền cho User

1. Tìm **Add User to Database**
2. Chọn user: `volxai_user`
3. Chọn database: `volxai_db`
4. Tích **ALL PRIVILEGES**
5. Nhấp **Make Changes** ✓

---

## ✅ PHẦN 3: Import Database Schema

### Bước 1: Mở phpMyAdmin

1. Từ cPanel → **phpMyAdmin**
2. Ở sidebar → Chọn database **volxai_db**

### Bước 2: Import SQL Schema

1. Nhấp tab **SQL**
2. **Nội dung file:** `database/schema.sql` ← Copy toàn bộ

```bash
# Hoặc trên máy local:
cat database/schema.sql
```

3. Dán nội dung vào phpMyAdmin SQL tab
4. Nhấp **Go** ✓

**Kết quả:** Tạo 7 bảng:

- `users`
- `sessions`
- `articles`
- `user_subscriptions`
- `user_usage`
- `password_reset_tokens`
- `activity_log`

---

## ✅ PHẦN 4: Deploy Backend lên Shared Hosting

### **Cách 1: Setup Node.js App qua cPanel (Dễ nhất) ⭐**

#### 1. Tạo thư mục cho backend

Qua cPanel File Manager:

```
/home/username/public_html/api/
```

#### 2. Upload files backend

Upload những tệp này vào `/home/username/public_html/api/`:

```
dist/
├── server/
│   ├── node-build.mjs
│   └── node-build.mjs.map
└── spa/
    ├── index.html
    ├── assets/
    └── ...
.env (cấu hình cơ sở dữ liệu)
package.json
node_modules/ (nếu cần, chạy npm install trên server)
```

#### 3. Cài đặt Node.js App

Vào cPanel → **Setup Node.js App**

```
1. Nhấp CREATE APPLICATION
2. Chọn Node.js version: 18.x hoặc 20.x
3. Điền:
   Application name: volxai-api
   Application root: /home/username/public_html/api
   Application Startup File: dist/server/node-build.mjs
   Port: (để cPanel tự chọn)
4. Nhấp CREATE
```

**cPanel sẽ gán cổng tự động** → Ghi nhớ cổng (ví dụ: `3000` hoặc `8000`)

#### 4. Kiểm tra backend chạy

```bash
curl https://yourdomain.com:PORT/api/ping
# Kết quả: {"message":"ping pong"}
```

---

### **Cách 2: Setup via SSH (Advanced)**

```bash
# SSH vào server
ssh username@yourdomain.com

# Tạo thư mục
mkdir -p ~/public_html/api && cd ~/public_html/api

# Upload files (qua SFTP hoặc git clone)
# hoặc: rsync -avz dist/ user@domain.com:~/public_html/api/dist/

# Cài dependencies
npm install --production

# Tạo .env
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=volxai_user
DB_PASSWORD=your_password
DB_NAME=volxai_db
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key
EOF

# Test backend
node dist/server/node-build.mjs
# Bấm Ctrl+C để dừng

# Chạy với PM2 (24/7)
npm install -g pm2
pm2 start dist/server/node-build.mjs --name volxai-api
pm2 startup
pm2 save
```

---

## ✅ PHẦN 5: Deploy Frontend

### Bước 1: Upload Frontend Files

Cập nhật Frontend API URL trước:

**Cập nhật `.env.production`:**

```
VITE_API_URL=https://yourdomain.com:PORT
```

**Build lại:**

```bash
npm run build
```

### Bước 2: Upload dist/spa/ vào public_html

```
/home/username/public_html/
├── index.html
├── assets/
│   ├── index-HASH.js
│   └── index-HASH.css
└── ...
```

---

## ✅ PHẦN 6: Cấu hình Domain & SSL

### Bước 1: Cấu hình Domain cho Frontend

cPanel → **Addon Domains** hoặc **Domains**

```
Domain: volxai.com
Document Root: /public_html
```

### Bước 2: Bật SSL (Let's Encrypt)

cPanel sẽ tự động bật **Auto SSL** từ Let's Encrypt ✓

---

## 🧪 PHẦN 7: Test & Xác Minh

### Test 1: Backend API

```bash
# Ping
curl https://yourdomain.com:PORT/api/ping
# Expected: {"message":"ping pong"}

# Kiểm tra logs
# cPanel → Node.js App → View Logs
```

### Test 2: Frontend & Database Connection

1. Truy cập: `https://yourdomain.com/`
2. Nhấp **Đăng ký**
3. Tạo tài khoản mới:
   - Email: `test@example.com`
   - Mật khẩu: `Password123`
4. Nhấp **Đăng nhập**

### Test 3: Kiểm tra Database

phpMyAdmin → `volxai_db` → `users` table

```
Nếu thấy bản ghi user mới tạo → ✅ Database kết nối thành công!
```

---

## ⚠️ Troubleshooting

| Lỗi                             | Nguyên nhân                           | Giải pháp                                         |
| ------------------------------- | ------------------------------------- | ------------------------------------------------- |
| **Cannot connect to database**  | DB credentials sai                    | Kiểm tra `.env` trùng với cPanel MySQL settings   |
| **Port already in use**         | Node.js app đang chạy                 | cPanel → Node.js App → Restart                    |
| **Mixed content error (HTTPS)** | API dùng HTTP                         | Cập nhật `.env.production` dùng `https://`        |
| **404 on /api/ping**            | Port sai                              | Kiểm tra cổng cPanel gán (có thể không phải 3000) |
| **Database table not found**    | Schema chưa import                    | Chạy lại SQL schema qua phpMyAdmin                |
| **CORS error**                  | Frontend domain không trong whitelist | Kiểm tra CORS config trong `server/index.ts`      |

---

## 📝 Checklist Deployment

- [ ] Build project: `npm run build`
- [ ] Tạo database `volxai_db` trên cPanel
- [ ] Tạo user `volxai_user` + gán quyền
- [ ] Import SQL schema qua phpMyAdmin
- [ ] Tạo `.env` với DB credentials đúng
- [ ] Setup Node.js App trong cPanel
- [ ] Upload backend files (`dist/server/`, `.env`)
- [ ] Upload frontend files (`dist/spa/` → `/public_html/`)
- [ ] Cấu hình domain + SSL
- [ ] Test `/api/ping` → thành công
- [ ] Test `/login` → không có lỗi
- [ ] Test đăng ký & đăng nhập → tạo user trong DB

---

## 🎯 Kết quả sau deployment

```
✅ Frontend: https://volxai.com
✅ Backend: https://volxai.com:PORT/api/
✅ Database: MariaDB trên cùng server
✅ SSL: Let's Encrypt tự động
✅ Fully functional authentication & blog system
```

---

## 📞 Cần Giúp?

Nếu gặp vấn đề:

1. **Kiểm tra logs:**
   - cPanel → Node.js App → View Logs
   - cPanel → phpMyAdmin → kiểm tra database

2. **Kiểm tra kết nối:**

   ```bash
   curl https://yourdomain.com:PORT/api/ping
   ```

3. **Xem chi tiết lỗi:**
   - Browser → F12 → Console tab
   - Xem exact error message

4. **Liên hệ hosting provider:**
   - Nếu Node.js app không start
   - Hoặc database connection error

---

## 🎉 Chúc mừng!

Bạn đã hoàn tất setup VolxAI trên shared hosting! 🚀

Giờ có thể mời người dùng truy cập `https://volxai.com`
