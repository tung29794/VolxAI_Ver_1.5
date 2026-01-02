# 🚀 Hướng dẫn Deploy VolxAI - Tài khoản jybcaorr

**Cấu hình triển khai:**

- Backend: `/home/jybcaorr/api.volxai.com`
- Frontend: `/home/jybcaorr/public_html`
- Database: MariaDB (localhost) via phpMyAdmin
- Hosting: Shared hosting hỗ trợ Node.js

---

## 📋 Phần 1: Chuẩn bị Database trên cPanel

### Bước 1: Tạo Database MariaDB

1. **Đăng nhập cPanel**
   - URL: `https://your-host:2083`
   - Username: `jybcaorr`
   - Password: (password cPanel của bạn)

2. **Tìm MySQL Databases (hoặc MariaDB)**
   - Thường ở phần "Databases"

3. **Tạo Database mới:**
   - Click **Create New Database**
   - Database name: `volxai_db`
   - Click **Create Database**

**Kết quả:** Database `jybcaorr_volxai_db` được tạo ✓

---

### Bước 2: Tạo MySQL User

1. **Tìm MySQL Users** (trong MySQL Databases section)

2. **Tạo User mới:**
   - Click **Create New User**
   - Username: `volxaiuser`
   - Password: (tạo mật khẩu mạnh, ví dụ: `Volxai@2024#Secure`)
   - Click **Create User**

**Lưu ý:** cPanel sẽ hiển thị full username là `jybcaorr_volxaiuser`

**GHI NHỚ:**

```
Full Username: jybcaorr_volxaiuser
Password:      Volxai@2024#Secure (hoặc password bạn tạo)
```

---

### Bước 3: Gán quyền cho User

1. **Quay lại MySQL Databases**
2. **Tìm "Add User to Database"**
3. **Chọn:**
   - User: `jybcaorr_volxaiuser`
   - Database: `jybcaorr_volxai_db`
4. **Tích ALL PRIVILEGES**
5. **Click Make Changes** ✓

---

### Bước 4: Import SQL Schema

1. **Mở phpMyAdmin**
   - Từ cPanel → phần Tools → **phpMyAdmin**
   - Hoặc vào: `https://your-host/phpmyadmin`

2. **Chọn database:** Click vào `jybcaorr_volxai_db`

3. **Import schema:**
   - Click tab **SQL**
   - Copy toàn bộ nội dung từ file `database/schema.sql` (xem ở dưới)
   - Dán vào phpMyAdmin
   - Click **Go**

**Kết quả:** 7 bảng được tạo:

- ✓ users
- ✓ sessions
- ✓ articles
- ✓ user_subscriptions
- ✓ user_usage
- ✓ password_reset_tokens
- ✓ activity_log

---

## 📋 Phần 2: Tạo File .env cho Shared Hosting

### Tạo file `.env` trên máy local

```bash
# Tại thư mục project root, tạo hoặc sửa .env:

DB_HOST=localhost
DB_PORT=3306
DB_USER=jybcaorr_volxaiuser
DB_PASSWORD=Volxai@2024#Secure
DB_NAME=jybcaorr_volxai_db
PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-jwt-key-2024-change-this
PING_MESSAGE=ping pong
```

**Lưu ý:** Thay `Volxai@2024#Secure` bằng password bạn tạo trên cPanel

---

## 📋 Phần 3: Build & Chuẩn bị Upload

### Bước 1: Build ứng dụng

```bash
cd code/
npm run build
```

**Kết quả:**

```
✓ dist/spa/              (Frontend - React)
✓ dist/server/           (Backend - Node.js)
  - node-build.mjs
  - node-build.mjs.map
```

### Bước 2: Chuẩn bị files để upload

**Files cần upload:**

**Cho Backend (`/home/jybcaorr/api.volxai.com`):**

```
dist/server/
├── node-build.mjs
└── node-build.mjs.map

.env (file cấu hình)
package.json
```

**Cho Frontend (`/home/jybcaorr/public_html`):**

```
dist/spa/
├── index.html
├── assets/
│   ├── index-HASH.js
│   ├── index-HASH.css
│   └── ...
└── ...
```

---

## 📋 Phần 4: Deploy Backend lên `/home/jybcaorr/api.volxai.com`

### Bước 1: Tạo thư mục backend (nếu chưa có)

**Via cPanel File Manager:**

1. File Manager → Home Directory
2. Tạo folder `api.volxai.com` (nếu chưa tồn tại)
3. Vào thư mục vừa tạo

**Hoặc via SSH:**

```bash
ssh jybcaorr@your-host.com
mkdir -p ~/api.volxai.com
cd ~/api.volxai.com
```

---

### Bước 2: Upload Backend Files

**Cách 1: Upload via cPanel File Manager (Dễ nhất)**

1. File Manager → Chọn `/home/jybcaorr/api.volxai.com`
2. Upload/Unzip files:
   - Upload folder `dist/server/` → `api.volxai.com/dist/server/`
   - Upload file `.env` → `api.volxai.com/.env`
   - Upload file `package.json` → `api.volxai.com/package.json`

**Cách 2: Upload via SFTP (WinSCP, Cyberduck)**

```bash
# Local command
sftp jybcaorr@your-host.com
cd api.volxai.com
put -r dist/server/* ./
put .env ./
put package.json ./
```

**Cách 3: Via SSH + Git**

```bash
ssh jybcaorr@your-host.com
cd ~/api.volxai.com
git clone <your-repo-url> .
npm install --production
```

---

### Bước 3: Cài đặt Dependencies (nếu cần)

**Via SSH:**

```bash
ssh jybcaorr@your-host.com
cd ~/api.volxai.com
npm install --production
```

---

### Bước 4: Setup Node.js App trong cPanel

**⭐ Quan trọng:**

1. **Vào cPanel → Setup Node.js App**
   - Có thể gọi là "Node.js App", "Node.js", hoặc "Ruby on Rails"

2. **Nhấp CREATE APPLICATION**

3. **Điền thông tin:**

   ```
   Application name:       volxai-api
   Node.js version:        18.x hoặc 20.x (chọn mới nhất)
   Application root:       /home/jybcaorr/api.volxai.com
   Application Startup:    dist/server/node-build.mjs
   Port:                   (để trống - cPanel tự gán)
   ```

4. **Nhấp CREATE**

**cPanel sẽ gán port tự động, ví dụ: 3000 hoặc 8000**
➡️ **Ghi nhớ port này!** (sẽ dùng ở bước Frontend)

---

### Bước 5: Kiểm tra Backend chạy

**Dấu hiệu chạy thành công:**

- cPanel → Node.js App → Status: **Running** ✓
- Click **View Logs** → không có error

**Test API:**

```bash
curl https://api.volxai.com/api/ping
# Hoặc: curl https://your-host/api/ping

# Kết quả mong đợi:
{"message":"ping pong"}
```

---

## 📋 Phần 5: Deploy Frontend lên `/home/jybcaorr/public_html`

### Bước 1: Cập nhật Frontend API URL

**Cập nhật `.env.production`:**

Tìm dòng `VITE_API_URL` và cập nhật:

**Nếu API được proxy qua cPanel:**

```
VITE_API_URL=https://api.volxai.com
```

**Hoặc nếu API trên port cPanel gán (ví dụ 3000):**

```
VITE_API_URL=https://your-host:3000
```

### Bước 2: Build lại Frontend

```bash
npm run build
```

**Output:** `dist/spa/` được update với API URL mới

---

### Bước 3: Upload Frontend Files

**Cách 1: Via cPanel File Manager (Dễ nhất)**

1. File Manager → `/home/jybcaorr/public_html`
2. **Xóa files cũ** (nếu có)
3. **Upload contents của `dist/spa/`:**
   - `index.html`
   - `assets/` folder
   - Các file khác

**Cách 2: Via SFTP**

```bash
sftp jybcaorr@your-host.com
cd public_html
put -r dist/spa/* ./
```

**Cách 3: Via SSH**

```bash
ssh jybcaorr@your-host.com
cd ~/public_html
rm -rf *                    # Xóa files cũ
cp -r ~/code/dist/spa/* ./  # Copy files mới
```

---

### Bước 4: Verify Files Uploaded

**Check:**

1. File Manager → `/home/jybcaorr/public_html`
2. Phải có:
   - ✓ `index.html`
   - ✓ `assets/` folder
   - ✓ Các file CSS/JS

---

## 🧪 Phần 6: Test & Kiểm tra

### Test 1: Backend API

```bash
# Kiểm tra ping
curl https://api.volxai.com/api/ping

# Kết quả mong đợi:
{"message":"ping pong"}

# Hoặc thử access qua cPanel Node.js App Logs:
# cPanel → Node.js App → View Logs
# Không có error = OK ✓
```

---

### Test 2: Frontend Access

1. **Mở browser**
2. **Truy cập:** `https://your-domain.com` hoặc `https://api.volxai.com`
3. **Kiểm tra:**
   - ✓ Trang home hiển thị bình thường
   - ✓ Nhấp "Đăng nhập" → có form login
   - ✓ F12 Console → không có error (đặc biệt: không có Mixed Content, CORS error)

---

### Test 3: Test Đăng ký & Đăng nhập

1. **Truy cập:** `https://your-domain.com/login`
2. **Chọn "Đăng ký"**
3. **Điền:**
   ```
   Email:        test@example.com
   Username:     testuser
   Password:     TestPassword123!
   ```
4. **Nhấp "Đăng nhập" button**

**Kết quả mong đợi:**

- ✓ Không có lỗi
- ✓ Redirect đến dashboard hoặc home
- ✓ Trong phpMyAdmin → Database → users table → có user mới tạo

---

### Test 4: Kiểm tra Database

**Verify user được tạo:**

1. **phpMyAdmin** → `jybcaorr_volxai_db` → `users` table
2. **Nếu thấy user mới tạo:**
   ```
   email:    test@example.com
   username: testuser
   ```
   ➡️ ✅ Database kết nối thành công!

---

## ⚠️ Troubleshooting

| Lỗi                         | Nguyên nhân                       | Giải pháp                                      |
| --------------------------- | --------------------------------- | ---------------------------------------------- |
| **Backend không start**     | File sai hoặc config lỗi          | Check cPanel Node.js App → View Logs           |
| **Cannot connect database** | Username/password sai             | Verify .env trùng với cPanel MySQL settings    |
| **Mixed content error**     | Frontend dùng HTTP, backend HTTPS | Update `.env.production` dùng `https://`       |
| **API 404**                 | Port sai hoặc URL sai             | Check cPanel Node.js App assigned port         |
| **Frontend blank**          | Files không upload đúng           | Check `/public_html` có `index.html`           |
| **CORS error**              | Frontend domain không whitelist   | Check `server/index.ts` CORS config            |
| **Database empty**          | Schema chưa import                | Re-import `database/schema.sql` via phpMyAdmin |

---

## 📝 Checklist Deployment

- [ ] **Database & User created:**
  - [ ] Database: `jybcaorr_volxai_db`
  - [ ] User: `jybcaorr_volxaiuser`
  - [ ] Privileges granted

- [ ] **Schema imported:**
  - [ ] 7 tables created via phpMyAdmin

- [ ] **Environment prepared:**
  - [ ] `.env` file created with correct DB credentials
  - [ ] `.env.production` updated with correct API URL

- [ ] **Backend deployed:**
  - [ ] Files uploaded to `/home/jybcaorr/api.volxai.com`
  - [ ] Node.js App created in cPanel
  - [ ] Status: Running ✓
  - [ ] `curl /api/ping` returns `{"message":"ping pong"}`

- [ ] **Frontend deployed:**
  - [ ] `dist/spa/` uploaded to `/home/jybcaorr/public_html`
  - [ ] `index.html` present
  - [ ] `assets/` folder present

- [ ] **Testing:**
  - [ ] Frontend loads: `https://your-domain.com`
  - [ ] Login page works: `/login`
  - [ ] Register works: user created in database
  - [ ] Login works: authentication successful
  - [ ] No console errors (F12)

---

## 🎉 Deployment Complete!

Khi tất cả checkboxes trên được tick ✓, deployment hoàn tất!

**Địa chỉ truy cập:**

- Frontend: `https://your-domain.com`
- Backend: `https://api.volxai.com` (hoặc port được gán)

🚀 **Chúc mừng! VolxAI đang hoạt động!**

---

## 📞 Cần giúp đỡ?

**Kiểm tra:**

1. cPanel → Node.js App → View Logs
2. cPanel → phpMyAdmin → Check database
3. Browser F12 → Console tab → Check errors

**Liên hệ:**

- Hosting provider nếu Node.js không start
- Check log messages chi tiết trước khi liên hệ
