# 🚀 Hướng dẫn cài đặt MariaDB & Deploy trên Shared Hosting - VolxAI

## 📋 Yêu cầu

- Shared hosting hỗ trợ **Node.js** (cPanel hoặc Plesk)
- **cPanel** với **phpMyAdmin**
- **SSH access** (tùy chọn nhưng khuyến khích)

---

## ✅ Phần 1: Tạo Database & User trên cPanel

### Bước 1: Tạo Database MariaDB

1. Đăng nhập vào **cPanel**
2. Tìm **MySQL Databases** (hoặc **MariaDB**)
3. Trong phần "Create New Database":
   - **Database Name**: `volxai_db` (hoặc tên bạn muốn)
   - Nhấp **Create Database**
4. Database đã được tạo ✓

### Bước 2: Tạo MySQL User

1. Trong **MySQL Databases**, tìm **MySQL Users**
2. Tạo user mới:
   - **Username**: `volxai_user`
   - **Password**: (tạo mật khẩu mạnh)
   - Nhấp **Create User**
3. Copy lại username và password để dùng sau

### Bước 3: Gán quyền cho User

1. Trong **MySQL Databases** → **Add User to Database**
2. Chọn user và database vừa tạo
3. Tất cả quyền (ALL PRIVILEGES)
4. Nhấp **Make Changes** ✓

### Bước 4: Kiểm tra kết nối qua phpMyAdmin

1. Vào **phpMyAdmin** từ cPanel
2. Chọn database `volxai_db`
3. Nếu thấy database trống → thành công ✓

---

## ✅ Phần 2: Chuẩn bị cấu hình trên máy local

### Bước 1: Cập nhật `.env` cho shared hosting

```bash
# Database Configuration - cho shared hosting
DB_HOST=localhost
DB_USER=volxai_user
DB_PASSWORD=your_password_here
DB_NAME=volxai_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=volxai-secret-jwt-key-2024

# Server Configuration
PORT=3000
NODE_ENV=production
PING_MESSAGE=ping pong
```

**⚠️ Lưu ý:** Thay `your_password_here` bằng mật khẩu bạn tạo trên cPanel

### Bước 2: Tạo Database Schema

Bạn cần chạy SQL script này trên phpMyAdmin để tạo bảng:

1. Vào **phpMyAdmin**
2. Chọn database `volxai_db`
3. Nhấp tab **SQL**
4. Dán đoạn SQL bên dưới vào
5. Nhấp **Go**

```sql
-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Articles table (cho blog)
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  content LONGTEXT,
  excerpt TEXT,
  featured_image VARCHAR(255),
  status ENUM('draft', 'published') DEFAULT 'draft',
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User subscriptions (cho pricing plans)
CREATE TABLE user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_type ENUM('free', 'starter', 'grow', 'professional') DEFAULT 'free',
  tokens_limit INT DEFAULT 10000,
  articles_limit INT DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_plan_type (plan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ✅ Phần 3: Build & Chuẩn bị deploy

### Bước 1: Build ứng dụng

```bash
cd code/
npm run build
```

**Output:**

```
✓ dist/spa/          (Frontend)
✓ dist/server/       (Backend)
```

### Bước 2: Chuẩn bị files để upload

```
📁 VolxAI deployment package:
├── dist/spa/              (Frontend files)
├── dist/server/           (Backend files)
├── .env                   (Environment variables)
├── package.json
└── node_modules/          (nếu deploy lên server)
```

---

## ✅ Phần 4: Deploy lên Shared Hosting

### **Cách 1: Deploy với cPanel File Manager (Dễ nhất)**

1. **SSH vào cPanel** hoặc dùng **File Manager**

2. **Tạo thư mục cho app:**

   ```bash
   mkdir -p ~/volxai-api
   cd ~/volxai-api
   ```

3. **Upload files:**
   - Upload `dist/server/node-build.mjs` vào `~/volxai-api/`
   - Upload `dist/spa/` vào `~/volxai-api/spa/`
   - Upload `.env` vào `~/volxai-api/`

4. **Cài đặt dependencies:**

   ```bash
   cd ~/volxai-api
   npm install
   ```

5. **Kiểm tra cổng Node.js:**
   - Vào cPanel → **Setup Node.js App**
   - Tạo app Node.js mới:
     - **App name**: `volxai-api`
     - **Node version**: Chọn version mới nhất (16+)
     - **Application root**: `/home/username/volxai-api`
     - **Application Startup File**: `dist/server/node-build.mjs`
     - **Port**: cPanel sẽ gán port tự động (ghi nhớ port này)
   - Nhấp **Create**

6. **Cập nhật Frontend API URL:**
   - cPanel sẽ tạo proxy URL như: `https://yourdomain.com:port`
   - Cập nhật `.env.production`:
     ```
     VITE_API_URL=https://yourdomain.com:port
     ```
   - Build lại frontend:
     ```bash
     npm run build
     ```
   - Upload `dist/spa/` mới lên cPanel `/public_html/`

---

### **Cách 2: Deploy với SSH (Advanced)**

```bash
# SSH vào server
ssh username@yourdomain.com

# Tạo thư mục
mkdir -p ~/apps/volxai
cd ~/apps/volxai

# Clone hoặc upload project
git clone https://your-repo.git .
# Hoặc upload via SFTP

# Cài đặt dependencies
npm install --production

# Tạo .env file
nano .env
# Dán cấu hình database

# Test backend
node dist/server/node-build.mjs

# Nếu thành công, dùng PM2 để chạy 24/7
npm install -g pm2
pm2 start dist/server/node-build.mjs --name volxai-api
pm2 startup
pm2 save
```

---

## ✅ Phần 5: Cấu hình Domain & SSL

### Bước 1: Cấu hình Domain cho Frontend

1. Vào cPanel → **Addon Domains** hoặc **Domains**
2. Thêm domain: `volxai.com` → `/public_html`
3. Chất lượng: Có **Auto SSL** từ cPanel (Let's Encrypt)

### Bước 2: Cấu hình Subdomain cho API (tùy chọn)

Nếu muốn API riêng:

1. Vào cPanel → **Subdomains**
2. Tạo subdomain: `api.volxai.com` → `/home/username/volxai-api`
3. Bật **Auto SSL**

---

## 🧪 Phần 6: Test & Xác minh

### Test Backend API:

```bash
curl https://yourdomain.com/api/ping
# Output: {"message":"ping pong"}
```

### Test Database Connection:

```bash
# Kiểm tra logs
pm2 logs volxai-api

# Hoặc xem logs từ cPanel Node.js App
```

### Test Login/Register:

1. Truy cập `https://volxai.com/login`
2. Thử đăng nhập hoặc đăng ký
3. Kiểm tra console (F12) không có lỗi

---

## ⚠️ Troubleshooting

| Lỗi                        | Nguyên nhân        | Giải pháp                                          |
| -------------------------- | ------------------ | -------------------------------------------------- |
| Cannot connect to database | Host/User/Pass sai | Kiểm tra `.env` với cPanel MySQL settings          |
| Port already in use        | App đang chạy      | `pm2 stop volxai-api` rồi start lại                |
| Mixed content error        | HTTP ← HTTPS       | Dùng HTTPS URL trong `.env`                        |
| 404 on API endpoints       | App route sai      | Check `dist/server/node-build.mjs` được build đúng |
| Node.js app không chạy     | Dependency thiếu   | Chạy `npm install` trên server                     |

---

## 📝 Checklist Deployment

- [ ] Database tạo trên cPanel (volxai_db)
- [ ] MySQL User tạo & gán quyền
- [ ] SQL schema chạy thành công
- [ ] `.env` được update với DB credentials
- [ ] `npm run build` thành công
- [ ] Files upload lên cPanel
- [ ] Node.js App tạo & chạy
- [ ] Domain & SSL cấu hình
- [ ] Test `/api/ping` → thành công
- [ ] Test `/login` → không có lỗi
- [ ] Database queries → thành công

---

## 🎉 Hoàn thành!

Nếu tất cả test pass, VolxAI đã sẵn sàng trên shared hosting! 🚀

Liên hệ support nếu có vấn đề.
