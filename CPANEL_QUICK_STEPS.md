# ⚡ cPanel Deployment - Quick Steps

Hướng dẫn nhanh đăng tải VolxAI lên cPanel (5 bước chính)

---

## 📌 Chuẩn bị thông tin

Chuẩn bị trước khi bắt đầu:

```
cPanel URL: ________________
cPanel Username: ________________
cPanel Password: ________________
Domain: volxai.com
API Subdomain: api.volxai.com
FTP/SFTP Host: ________________
Database: volxai_db
DB User: volxai_user
DB Password: ________________
```

---

## 🎯 Step 1: Build Frontend (2 phút)

Chạy trên máy của bạn:

```bash
cd code/
npm run build
```

✅ Output: `dist/` folder ready to upload

---

## 📤 Step 2: Upload Frontend (5 phút)

### Cách nhanh nhất: File Manager

1. **Đăng nhập cPanel** → Tìm **File Manager**
2. Vào `/public_html/`
3. **Upload** file từ `dist/` folder (upload toàn bộ files)
4. **Hoặc** upload file `dist.zip` rồi Extract

### File cần upload:
```
dist/
  ├── index.html
  ├── assets/
  │   ├── index-HASH.js
  │   ├── index-HASH.css
  │   └── ...
```

✅ Done: Frontend files uploaded

---

## ⚙️ Step 3: Cấu hình React Router (.htaccess)

### Tạo file `.htaccess` trong `/public_html/`

**File Manager cPanel:**
1. Vào `/public_html/`
2. Nhấp **"+ File"** → Tạo file mới tên `.htaccess`
3. Paste nội dung:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # HTTP -> HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # React Router - nếu file không tồn tại, redirect về index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
```

4. Nhấp **Save**

✅ Frontend Config Done

---

## 🔌 Step 4: Deploy Backend (10 phút)

### A. Nếu cPanel hỗ trợ Node.js:

1. **cPanel → Setup Node.js App** → **Create Application**
   - **Node Version**: 18 or higher
   - **Application root**: `/home/username/nodesapp`
   - **Application Startup File**: `server.js`
   - **Application URL**: `api.volxai.com` (create new subdomain first)

2. **SSH hoặc File Manager upload backend files:**

   ```bash
   # SSH (terminal)
   ssh username@cpanel-ip
   cd /home/username/nodesapp
   # Upload files via FTP hoặc Git clone
   npm install --production
   npm run build  # Build TypeScript nếu cần
   ```

3. **Set Environment Variables** (trong cPanel → Setup Node.js App → Edit):
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-key-min-32-chars
   DB_HOST=localhost
   DB_USER=volxai_user
   DB_PASSWORD=your-db-password
   DB_NAME=volxai_db
   DB_PORT=3306
   ```

4. **Restart** (cPanel → Setup Node.js App → Restart button)

✅ Backend Running on `api.volxai.com`

### B. Nếu cPanel KHÔNG hỗ trợ Node.js:

Giữ backend trên VPS hiện tại: `103.221.221.67:3000`

Cấu hình frontend tới backend cũ:
```
Update VITE_API_URL = "http://103.221.221.67:3000"
```

---

## 🔒 Step 5: SSL & Domain (5 phút)

### 5.1: Thêm Domain trong cPanel

**cPanel → Addon Domains** → Thêm domain `volxai.com`

### 5.2: DNS Records

Cập nhật DNS tại Registrar (GoDaddy, Namecheap, etc.):

```
A Record: volxai.com → [cPanel IP]
CNAME: api.volxai.com → volxai.com
```

### 5.3: Install SSL (Let's Encrypt - Miễn phí)

**cPanel → AutoSSL** → **Check and Install**

Hoặc

**cPanel → SSL/TLS → Certificates (CertBot)** → **Issue, view or delete**

✅ SSL installed - HTTPS ready

---

## ✅ Step 6: Test (2 phút)

### Test Frontend
```
https://volxai.com
```
✅ Trang chủ hiển thị, có 🔒 lock icon

### Test Backend
```bash
curl https://api.volxai.com/api/ping
```
✅ Response: `{"message":"ping"}`

### Test Register
1. Mở `https://volxai.com`
2. Nhấp **Đăng ký**
3. Điền form:
   ```
   Tên đăng nhập: testuser
   Email: test@example.com
   Mật khẩu: TestPassword123
   ```
4. Nhấp **Đăng ký**

✅ Kết quả:
- Thông báo "Đăng ký thành công! 🎉"
- Chuyển sang page `/account`
- Header hiển thị "Tài khoản" (không phải "Đăng nhập")

---

## 🐛 Quick Troubleshoot

| Lỗi | Giải pháp |
|-----|----------|
| 404 on `/login` | Kiểm tra `.htaccess` có trong `/public_html` |
| CORS error | Backend cần `cors()` middleware |
| Database error | Kiểm tra credentials, test: `mysql -u volxai_user -p` |
| SSL error | cPanel → AutoSSL → Check & Install |
| Node.js won't start | cPanel → Setup Node.js → Check Logs |
| Can't access API | DNS chưa propagate (chờ 1-2h hoặc clear DNS cache) |

---

## 🔄 Update Flow (sau này)

Khi update code:

```bash
# Trên máy dev
npm run build
# Upload dist/ vào /public_html (overwrite)

# Backend (nếu dùng Node.js trên cPanel)
# Upload mới hoặc pull git
npm install
npm run build
# Restart qua cPanel
```

---

## 📱 Summary

| Thành phần | URL | Loại |
|-----------|-----|------|
| **Frontend** | `https://volxai.com` | Static (React) |
| **Backend API** | `https://api.volxai.com` | Node.js hoặc VPS |
| **Database** | `localhost:3306` | MariaDB |

---

## ✨ Finished!

```
✅ Frontend: https://volxai.com
✅ Backend: https://api.volxai.com
✅ SSL: HTTPS everywhere
✅ Database: Connected
✅ Users: Can register & login
```

**Chúc mừng bạn đã deploy thành công! 🎉🚀**

---

## 📚 Chi tiết đầy đủ

Xem `CPANEL_DEPLOYMENT_GUIDE.md` cho hướng dẫn chi tiết + gỡ lỗi

---

**Cần giúp? Cấp cứu? Xem section Troubleshoot hoặc đọc CPANEL_DEPLOYMENT_GUIDE.md**
