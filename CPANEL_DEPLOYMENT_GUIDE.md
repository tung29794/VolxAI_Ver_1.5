# 📦 cPanel Deployment Guide - VolxAI

Hướng dẫn chi tiết đăng tải Frontend và Backend lên cPanel

---

## 📋 Mục lục

1. [Chuẩn bị (Prerequisites)](#chuẩn-bị)
2. [Phần 1: Deploy Frontend](#phần-1-deploy-frontend)
3. [Phần 2: Deploy Backend](#phần-2-deploy-backend)
4. [Phần 3: Cấu hình Domain & SSL](#phần-3-cấu-hình-domain--ssl)
5. [Phần 4: Xác minh & Test](#phần-4-xác-minh--test)
6. [Gỡ lỗi](#gỡ-lỗi)

---

## 🔧 Chuẩn bị

### Thông tin cần có:

- ✅ **cPanel URL**: `https://your-domain.com:2083` hoặc IP cPanel
- ✅ **cPanel username & password**
- ✅ **FTP/SFTP credentials** (hoặc dùng File Manager trong cPanel)
- ✅ **Domain name**: VD: `volxai.com`
- ✅ **MariaDB/MySQL credentials** (nếu chưa tạo)
- ✅ **SSH access** (tùy chọn, để chạy build)

### Kiểm tra cPanel hỗ trợ Node.js:

1. Đăng nhập vào cPanel
2. Tìm **"Setup Node.js App"** hoặc **"Node.js"**
3. Nếu không thấy → hosting không hỗ trợ Node.js → cần dùng backend thay thế (ví dụ: Python Flask hoặc PHP)

**⚠️ Lưu ý:** Nếu cPanel không hỗ trợ Node.js, bạn cần:
- Chuyển backend sang PHP hoặc Python
- Hoặc giữ backend trên VPS riêng (như hiện tại: 103.221.221.67)

---

## ✅ PHẦN 1: Deploy Frontend

### Step 1.1: Build ứng dụng React

Trên máy của bạn, chạy:

```bash
cd code/
npm run build
```

**Output:**
```
✓ built in XXXms
  dist/
    ├── index.html
    ├── assets/
    │   ├── index-HASH.js
    │   ├── index-HASH.css
    │   └── ...
```

### Step 1.2: Tạo subdomain cho frontend (tùy chọn)

**Cách 1: Dùng cPanel GUI**
1. Đăng nhập cPanel
2. Vào **Addon Domains** hoặc **Subdomains**
3. Tạo subdomain: `app.volxai.com` → points to `/public_html/app`

**Hoặc** dùng domain chính: `volxai.com` → `/public_html`

### Step 1.3: Upload frontend files

**Cách A: Dùng cPanel File Manager (Dễ nhất)**

1. Đăng nhập vào cPanel
2. Vào **File Manager**
3. Chọn `/public_html/` (hoặc `/public_html/app` nếu dùng subdomain)
4. Nhấp **Upload** → Upload file zip hoặc upload folder `dist/`
   - Dùng WinSCP hoặc Cyberduck để kéo-thả files

**Cách B: Dùng FTP/SFTP**

```bash
# Dùng lftp hoặc FileZilla
lftp -u username,password ftp://your-ftp-server.com
cd public_html
mirror -R dist/  # Upload từ local dist/ vào remote
```

**Cách C: Dùng SSH & Git (Nếu có SSH access)**

```bash
# SSH vào cPanel
ssh username@your-domain.com

# Clone project
cd /home/username/public_html
git clone https://github.com/your-repo.git .

# Build
npm install
npm run build

# Copy dist ra public_html
cp -r dist/* .
```

### Step 1.4: Cấu hình .htaccess cho React Router

Tạo file `.htaccess` trong `/public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Loại bỏ .html từ URLs
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
```

**Hoặc nếu dùng subdomain `/app`:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
```

### Step 1.5: Cấu hình environment variables

Tạo file `vite.config.ts` với biến môi trường cho production:

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'https://api.volxai.com'
    ),
  },
});
```

Hoặc tạo file `.env.production`:

```
VITE_API_URL=https://api.volxai.com
```

### Step 1.6: Xác minh frontend hoạt động

Mở trình duyệt:
```
https://volxai.com
hoặc
https://app.volxai.com
```

Kết quả mong đợi: ✅ Trang chủ VolxAI hiển thị bình thường

---

## ✅ PHẦN 2: Deploy Backend

### ⚠️ Kiểm tra Node.js hỗ trợ

#### **Nếu cPanel hỗ trợ Node.js:**

#### Step 2.1: Tạo Node.js app trong cPanel

1. Đăng nhập cPanel
2. Vào **Setup Node.js App**
3. Nhấp **Create Node.js Application**
   - **Application mode**: `production`
   - **Node.js version**: `18+` hoặc latest
   - **Application root**: `/home/username/nodesapp` hoặc tùy chọn
   - **Application startup file**: `server.js` hoặc `index.ts`
   - **Application URL**: `api.volxai.com` (tạo subdomain mới)

#### Step 2.2: Upload backend files

```bash
# SSH vào cPanel
ssh username@your-domain.com

# Tạo thư mục backend
cd /home/username
mkdir -p nodesapp
cd nodesapp

# Clone backend code
git clone https://github.com/your-repo.git .
# Hoặc upload files FTP

# Cài dependencies
npm install --production
```

#### Step 2.3: Build backend TypeScript

```bash
npm run build  # Builds server files
# Hoặc nếu sử dụng Vite:
npx vite build --config vite.config.server.ts
```

#### Step 2.4: Cấu hình environment variables trong cPanel

1. Vào **Setup Node.js App** → chọn app vừa tạo
2. Nhấp **Edit**
3. Thêm **Environment Variables**:

```
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-key-here
DB_HOST=your-db-host
DB_USER=volxai_user
DB_PASSWORD=your-db-password
DB_NAME=volxai_db
DB_PORT=3306
```

#### Step 2.5: Restart Node.js app

```bash
# Qua cPanel: Setup Node.js App → Restart
# Hoặc qua SSH:
cd /home/username/nodesapp
npm start
# Hoặc dùng PM2:
pm2 start server.js --name "volxai-api"
pm2 save
```

---

#### **Nếu cPanel KHÔNG hỗ trợ Node.js:**

#### Tùy chọn A: Giữ backend trên VPS riêng

Nếu backend vẫn chạy trên `103.221.221.67:3000`:
- Frontend (cPanel): `https://volxai.com`
- Backend (VPS): `https://api.volxai.com` (forward tới 103.221.221.67:3000)

Cấu hình proxy trong `.htaccess` (Advanced):

```apache
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyPass /api http://103.221.221.67:3000/api
  ProxyPassReverse /api http://103.221.221.67:3000/api
</IfModule>
```

**Lưu ý:** Yêu cầu cPanel enable `mod_proxy`

#### Tùy chọn B: Dùng PHP wrapper (không khuyến khích)

```php
<?php
// api.php - gửi request tới backend Node.js
$ch = curl_init('http://103.221.221.67:3000' . $_SERVER['REQUEST_URI']);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => $_SERVER['REQUEST_METHOD'] === 'POST',
  CURLOPT_POSTFIELDS => file_get_contents('php://input'),
]);
echo curl_exec($ch);
?>
```

---

## ✅ PHẦN 3: Cấu hình Domain & SSL

### Step 3.1: Thêm domain (nếu chưa có)

1. Cấp **DNS** cho domain `volxai.com`:
   - **A Record**: `volxai.com` → `your-cpanel-ip`
   - **CNAME**: `api.volxai.com` → `volxai.com`
   - **CNAME**: `app.volxai.com` → `volxai.com` (nếu dùng subdomain)

2. Hoặc trong cPanel:
   - **Addon Domains** → Thêm domain mới

### Step 3.2: Cài SSL Certificate (HTTPS)

**Cách 1: AutoSSL (miễn phí - Let's Encrypt)**

1. cPanel → **AutoSSL**
2. Nhấp **Check and Install**
3. Chọn domains để install SSL

**Cách 2: Manual (cPanel → SSL/TLS)**

1. cPanel → **SSL/TLS**
2. **Certificates (CertBot)**
3. Nhấp **Issue, view or delete SSL certificates**
4. Tạo certificate cho:
   - `volxai.com`
   - `api.volxai.com`
   - `app.volxai.com` (nếu dùng)

### Step 3.3: Chuyển hướng HTTP → HTTPS

Tạo/Chỉnh sửa `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # HTTP -> HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # React Router
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
```

---

## ✅ PHẦN 4: Xác minh & Test

### Step 4.1: Test Frontend

```bash
# Mở trình duyệt
https://volxai.com

# Kiểm tra:
✅ Trang chủ hiển thị
✅ Có SSL certificate (🔒 icon)
✅ Buttons hoạt động
✅ Responsive trên mobile
```

### Step 4.2: Test Backend Health Check

```bash
curl https://api.volxai.com/api/ping
# hoặc
curl http://your-cpanel-domain/api/ping  # nếu proxy
```

**Kết quả mong đợi:**
```json
{"message":"ping"}
```

### Step 4.3: Test Registration & Login

1. Mở `https://volxai.com`
2. Nhấp **Đăng ký**
3. Điền form test:
   ```
   Tên đăng nhập: testuser
   Email: test@example.com
   Mật khẩu: TestPassword123
   ```
4. Nhấp **Đăng ký**

**Kết quả mong đợi:**
- ✅ Thông báo "Đăng ký thành công!"
- ✅ Chuyển hướng tới `/account`
- ✅ Header hiển thị "Tài khoản"

### Step 4.4: Kiểm tra DevTools

Mở **F12 → Network**:
- Tìm requests tới `api.volxai.com` hoặc `/api`
- Status codes: **201** (register), **200** (login)
- Response có token và user info

### Step 4.5: Kiểm tra Database

```bash
# SSH vào cPanel
ssh username@your-domain.com

# Kết nối MariaDB
mysql -u volxai_user -p volxai_db
# Nhập mật khẩu

# Kiểm tra user
SELECT * FROM users;
```

---

## 🔧 Gỡ lỗi

### ❌ "404 Not Found" khi truy cập `/login` hoặc `/register`

**Nguyên nhân:** `.htaccess` không hoạt động hoặc chưa được upload

**Cách fix:**
```bash
# SSH vào cPanel
cd /home/username/public_html

# Kiểm tra .htaccess tồn tại
ls -la .htaccess

# Nếu chưa có, tạo file mới
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
EOF
```

### ❌ "Cannot connect to API" hoặc CORS error

**Nguyên nhân:** Backend không accessible hoặc CORS chưa cấu hình

**Cách fix:**
1. Kiểm tra backend chạy:
   ```bash
   curl https://api.volxai.com/api/ping
   ```

2. Kiểm tra CORS trong backend (`server/index.ts`):
   ```typescript
   import cors from 'cors';
   app.use(cors());  // Cho phép tất cả origins
   ```

3. Rebuild và restart:
   ```bash
   npm run build
   npm start
   ```

### ❌ "SSL Certificate error"

**Cách fix:**
1. cPanel → **SSL/TLS**
2. Reissue certificate
3. Chờ 5-10 phút để propagate
4. Hoặc dùng **AutoSSL** để tự động renew

### ❌ "Database connection refused"

**Cách fix:**
1. Kiểm tra credentials:
   ```bash
   mysql -u volxai_user -p -h localhost volxai_db
   ```

2. Nếu error "Access denied":
   - cPanel → **MySQL Databases**
   - Reset password user

3. Kiểm tra database tồn tại:
   ```sql
   SHOW DATABASES;
   USE volxai_db;
   SHOW TABLES;
   ```

### ❌ "Node.js app won't start"

**Cách fix:**
1. Kiểm tra logs:
   ```bash
   # Vào cPanel → Setup Node.js App
   # Kiểm tab "Logs"
   ```

2. Kiểm tra `package.json` có `main` field:
   ```json
   {
     "name": "volxai-api",
     "main": "server.js",
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

3. Kiểm tra dependencies:
   ```bash
   npm install
   npm list  # Kiểm tra không có lỗi
   ```

---

## 📋 Deployment Checklist

### Frontend (cPanel)
- [ ] Build production: `npm run build`
- [ ] Upload `dist/` files vào `/public_html`
- [ ] Tạo/Cấu hình `.htaccess` cho React Router
- [ ] Test URL: `https://volxai.com` → hiển thị trang
- [ ] Test SSL: có 🔒 icon
- [ ] Test routes: `/login`, `/register`, `/account` hoạt động
- [ ] Test API connection: DevTools Network → có requests tới API

### Backend (cPanel Node.js)
- [ ] Build backend: `npm run build`
- [ ] Tạo Node.js app trong cPanel
- [ ] Upload/Clone files vào app directory
- [ ] Cài dependencies: `npm install --production`
- [ ] Cấu hình environment variables
- [ ] Start/Restart app
- [ ] Test health: `curl https://api.volxai.com/api/ping`
- [ ] Test register: POST to `/api/auth/register`
- [ ] Test login: POST to `/api/auth/login`

### Domain & SSL
- [ ] DNS records pointing to cPanel IP
- [ ] SSL certificate installed (HTTPS)
- [ ] HTTP redirects to HTTPS
- [ ] All domains secured: `volxai.com`, `api.volxai.com`

### Database
- [ ] MariaDB created: `volxai_db`
- [ ] User created: `volxai_user`
- [ ] Tables initialized via `database/init.sql`
- [ ] Test connection: `mysql -u volxai_user -p volxai_db`

### Testing
- [ ] Frontend loads without errors
- [ ] Can register new user
- [ ] Token saved to localStorage
- [ ] Can login with registered user
- [ ] User appears in database
- [ ] Can logout and login again
- [ ] All buttons and links work

---

## 🚀 Sau khi Deploy thành công

### Tối ưu hóa:

1. **Bật Gzip compression** (cPanel → EasyApache):
   ```apache
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>
   ```

2. **Cấu hình cache** cho static files:
   ```apache
   <FilesMatch "\\.(jpg|jpeg|png|gif|ico|css|js|woff)$">
     Header set Cache-Control "max-age=31536000, public"
   </FilesMatch>
   ```

3. **Cài Cloudflare** (CDN miễn phí):
   - Domain nameservers → Cloudflare
   - Bật "Rocket Loader" và "Minify"

4. **Monitor logs**:
   - cPanel → **Raw Access Logs**
   - cPanel → **Error Log**

---

## 📞 Cần giúp?

Cung cấp thông tin:
- cPanel IP hoặc URL
- Domain name
- Lỗi chính xác từ browser/console
- Logs từ cPanel

---

**Chúc bạn deploy thành công! 🎉**
