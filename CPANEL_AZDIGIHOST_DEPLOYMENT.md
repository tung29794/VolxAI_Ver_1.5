# 🚀 cPanel AzDigiHost Deployment - VolxAI Option B

Hướng dẫn chi tiết deploy Frontend + Backend lên cPanel AzDigiHost

---

## 📋 Thông tin của bạn

```
cPanel URL: https://ghf57-22175.azdigihost.com:2083
cPanel Username: jybcaorr
cPanel Password: (đã lưu)

SSH Information:
SSH Host: ghf57-22175.azdigihost.com
SSH Port: 2210
SSH Username: jybcaorr
SSH Password: (đã lưu)

Home Directory: /home/jybcaorr/
Public HTML: /home/jybcaorr/public_html/
```

---

## ⏱️ Thời gian dự kiến

- **Phần 1 (Build Frontend)**: 3 phút
- **Phần 2 (Setup Node.js trong cPanel)**: 5 phút
- **Phần 3 (Upload files SSH)**: 5 phút
- **Phần 4 (Cấu hình Environment)**: 3 phút
- **Phần 5 (Start & Test)**: 5 phút

**Tổng cộng: ~20 phút**

---

## ✅ PHẦN 1: Build Frontend & Backend (Máy của bạn)

### Step 1.1: Build toàn bộ project

Chạy lệnh này trên máy của bạn:

```bash
cd code/
npm run build
```

**Output sẽ tạo 2 folder:**
```
dist/
├── spa/                    # Frontend React
│   ├── index.html
│   ├── assets/
│   │   └── index-XXXX.js
│   │   └── index-XXXX.css
│   └── ...
├── server/                 # Backend Node.js
│   ├── production.mjs       # Compiled server
│   └── production.mjs.map
```

✅ **Kết quả:** Cả frontend và backend đã được build sẵn sàng

---

## ✅ PHẦN 2: Setup Node.js App trong cPanel

### Step 2.1: Đăng nhập cPanel

1. Mở: `https://ghf57-22175.azdigihost.com:2083`
2. Username: `jybcaorr`
3. Password: (nhập password)
4. Nhấp **Login**

### Step 2.2: Tìm Node.js Manager

Trong cPanel, tìm và nhấp vào: **Setup Node.js App**

*Nếu không thấy, AzDigiHost có thể chưa enable. Liên hệ support AzDigiHost*

### Step 2.3: Tạo Node.js Application

Nhấp **Create Application**

Điền thông tin:
```
Node Version: 18 or higher (chọn version mới nhất)
Application mode: production
Application root: /home/jybcaorr/volxai
Application startup file: production.mjs
Application URL: volxai (sẽ tạo domain subdomain volxai.ghf57-22175.azdigihost.com)
```

Hoặc nếu bạn có domain riêng như `yourdomain.com`:
- Tạo subdomain `api.yourdomain.com` trước
- Rồi chọn `api.yourdomain.com` làm Application URL

Nhấp **Create**

✅ **Node.js app created!** 

**Ghi chú các thông tin hiển thị:**
- Application root: `/home/jybcaorr/volxai`
- App URL được tạo

---

## ✅ PHẦN 3: Upload Backend Files qua SSH

### Step 3.1: Kết nối SSH

Trên Terminal/PowerShell của bạn, chạy:

```bash
# Kết nối SSH
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
# Nhập password: ;)|o|=NhgnM)
```

✅ Bây giờ bạn đã kết nối vào server

### Step 3.2: Tạo thư mục ứng dụng

```bash
# Tạo thư mục volxai
mkdir -p ~/volxai
cd ~/volxai

# Kiểm tra có Node.js không
node --version
npm --version
```

**Kết quả mong đợi:**
```
v18.x.x hoặc cao hơn
npm version
```

Nếu không thấy → Node.js chưa được activate. Liên hệ AzDigiHost support.

### Step 3.3: Upload files từ máy của bạn lên server

Có 3 cách:

#### **Cách A: Dùng SCP (Nhanh nhất)**

Trên máy của bạn (mở Terminal/PowerShell mới - không phải SSH connection):

```bash
# Điều hướng tới folder code
cd code/

# Copy folder dist lên server
scp -P 2210 -r dist/server/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/

scp -P 2210 -r dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/public/

# Copy package.json & package-lock.json
scp -P 2210 package.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
scp -P 2210 package-lock.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
```

#### **Cách B: Dùng WinSCP hoặc Cyberduck (GUI)**

1. Tải WinSCP: https://winscp.net/
2. Tạo connection:
   - **Hostname**: `ghf57-22175.azdigihost.com`
   - **Port**: `2210`
   - **Username**: `jybcaorr`
   - **Password**: `;)|o|=NhgnM)`
3. Kéo-thả folders:
   - `dist/server/*` → `/home/jybcaorr/volxai/`
   - `dist/spa/*` → `/home/jybcaorr/volxai/public/`
   - `package.json` → `/home/jybcaorr/volxai/`

#### **Cách C: Dùng Git (Nếu code trên GitHub)**

```bash
cd ~/volxai
git clone https://github.com/your-username/your-repo.git .
npm install --production
npm run build
```

### Step 3.4: Kiểm tra files được upload

```bash
# SSH connection (nếu đã đóng, kết nối lại)
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Kiểm tra thư mục
ls -la ~/volxai/

# Output sẽ hiển thị:
# drwxr-xr-x  production.mjs
# drwxr-xr-x  production.mjs.map
# -rw-r--r--  package.json
# drwxr-xr-x  public/     (frontend files)
```

✅ Files uploaded successfully!

---

## ✅ PHẦN 4: Cài Dependencies & Cấu hình Environment

### Step 4.1: Cài npm dependencies

Từ SSH connection:

```bash
cd ~/volxai

# Cài dependencies (chỉ production)
npm install --production
```

**Chờ 2-3 phút để cài xong**

```bash
npm list  # Kiểm tra không có error
```

### Step 4.2: Cấu hình Environment Variables trong cPanel

Quay lại cPanel:

1. **Setup Node.js App** → Tìm app `volxai` → Nhấp **Edit**

2. Trong mục **Environment Variables**, thêm các biến:

```
KEY: NODE_ENV
VALUE: production

KEY: JWT_SECRET
VALUE: your-super-secret-jwt-key-32-chars-min-jybcaorr-2024

KEY: DB_HOST
VALUE: localhost

KEY: DB_USER
VALUE: jybcaorr_volxai_user

KEY: DB_PASSWORD
VALUE: (lấy từ cPanel MySQL Database Users)

KEY: DB_NAME
VALUE: jybcaorr_volxai

KEY: DB_PORT
VALUE: 3306

KEY: PORT
VALUE: 3000
```

**Hoặc tạo file `.env` trực tiếp:**

```bash
# SSH connection
cd ~/volxai
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-32-chars-min-jybcaorr-2024
DB_HOST=localhost
DB_USER=jybcaorr_volxai_user
DB_PASSWORD=your-db-password
DB_NAME=jybcaorr_volxai
DB_PORT=3306
PORT=3000
PING_MESSAGE=ping pong
EOF

# Kiểm tra file
cat .env
```

✅ Environment variables configured!

---

## ✅ PHẦN 5: Start Node.js App & Test

### Step 5.1: Start Node.js App

**Cách A: Via cPanel GUI (Dễ nhất)**

1. cPanel → **Setup Node.js App**
2. Tìm app `volxai`
3. Nhấp **Run npm install**
4. Nhấp **Restart** (hoặc **Start** nếu chưa running)

**Hoặc Cách B: Via SSH (Manual)**

```bash
cd ~/volxai

# Start app
npm start

# Hoặc dùng PM2 (nếu cPanel support)
npm install -g pm2
pm2 start production.mjs --name "volxai"
pm2 save
pm2 startup
```

✅ App đang chạy!

### Step 5.2: Kiểm tra app đang chạy

```bash
# From SSH
curl http://localhost:3000/api/ping
# Expected output: {"message":"ping pong"}

# Hoặc từ browser
# https://volxai.ghf57-22175.azdigihost.com/api/ping
```

### Step 5.3: Kiểm tra Node.js app logs

cPanel → **Setup Node.js App** → Chọn app `volxai` → Xem tab **Logs**

Kết quả mong đợi:
```
🚀 VolxAI Server running on port 3000
📱 Frontend: http://localhost:3000
🔧 API: http://localhost:3000/api
```

### Step 5.4: Test Registration & Login

Mở browser:

```
https://volxai.ghf57-22175.azdigihost.com/register
```

hoặc nếu có domain riêng:
```
https://api.yourdomain.com/register
```

**Test Form:**
```
Username: testuser123
Email: test@example.com
Password: TestPassword123
```

✅ Kết quả mong đợi:
- Thông báo "Đăng ký thành công! 🎉"
- Chuyển sang page `/account`
- Header hiển thị "Tài khoản"

---

## 📊 Kiểm tra Final (DevTools)

Mở **F12 → Network**:

Kiểm tra requests:
- `POST /api/auth/register` → Status `201`
- Response có `token` và `user` object

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "username": "testuser123",
    "full_name": "testuser123",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🗄️ BONUS: Database Setup (Nếu chưa có)

### Tạo Database trong cPanel

1. cPanel → **MySQL Databases**
2. **Create New Database**
   - Database name: `volxai`
   - Full name sẽ là: `jybcaorr_volxai`

3. **MySQL Users** → **Create New User**
   - Username: `volxai_user`
   - Password: (tạo mật khẩu mạnh)
   - Full name sẽ là: `jybcaorr_volxai_user`

4. **Add User to Database**
   - Chọn user và database
   - Grant **ALL PRIVILEGES**

### Import Database Schema

```bash
# SSH vào server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Upload file init.sql
# (hoặc copy content từ database/init.sql)

# Kết nối MySQL
mysql -u jybcaorr_volxai_user -p jybcaorr_volxai

# Nhập mật khẩu DB

# Import schema
source /home/jybcaorr/volxai/database/init.sql;

# Hoặc từ file:
mysql -u jybcaorr_volxai_user -p jybcaorr_volxai < database/init.sql
```

---

## 🔧 Troubleshooting

### ❌ "Cannot find module" error

```bash
cd ~/volxai
npm list
# Nếu ada error, cài lại:
npm install --production
```

### ❌ "Database connection refused"

```bash
# Kiểm tra credentials
mysql -u jybcaorr_volxai_user -p jybcaorr_volxai

# Nếu error, reset di cPanel:
# MySQL Databases → Users → Change Password
```

### ❌ "Port already in use"

```bash
# Cek port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Restart via cPanel
```

### ❌ "App won't start"

cPanel → **Setup Node.js App** → Xem **Logs** tab
- Ghi chú error message
- Check environment variables
- Kiểm tra package.json có `start` script

### ❌ "Frontend not loading"

- Kiểm tra `public/` folder có files không
- Kiểm tra `.env` có `VITE_API_URL` pointing tới backend

---

## 📋 Deployment Checklist

- [ ] `npm run build` thành công (tạo `dist/` folder)
- [ ] Node.js App created trong cPanel
- [ ] Backend files uploaded vào `/home/jybcaorr/volxai`
- [ ] `npm install --production` thành công
- [ ] Environment variables configured
- [ ] Node.js app running (check cPanel)
- [ ] `curl http://localhost:3000/api/ping` → `{"message":"ping pong"}`
- [ ] Database created & schema imported
- [ ] Can register user: `/register` form works
- [ ] Can login: `/login` form works
- [ ] User appears dalam database

---

## 🎉 Success!

```
✅ Frontend: https://volxai.ghf57-22175.azdigihost.com
✅ Backend API: https://volxai.ghf57-22175.azdigihost.com/api
✅ Database: Connected
✅ Auth: Registration & Login working
```

**VolxAI deployed successfully on cPanel AzDigiHost! 🚀**

---

## 🆘 Cần help?

1. Kiểm tra Node.js app logs: cPanel → Setup Node.js App → Logs
2. Kiểm tra SSH connection: `ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com`
3. Kiểm tra files uploaded: `ls -la ~/volxai/`
4. Test API: `curl https://volxai.ghf57-22175.azdigihost.com/api/ping`

---

**Hướng dẫn đầy đủ! Bạn có thể bắt đầu ngay!** 🎯
