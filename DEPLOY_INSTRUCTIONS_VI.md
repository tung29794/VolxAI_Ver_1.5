# 🚀 Hướng Dẫn Cài Đặt VolxAI Lên Azdigi Host

## 📋 Yêu Cầu Trước Khi Bắt Đầu

✅ SSH Access vào server Azdigi  
✅ Access vào cPanel  
✅ Database đã import schema (DATABASE_IMPORT.sql)  
✅ Build project đã hoàn thành (`npm run build`)

---

## ⚙️ Bước 1: Chạy Deployment Script (Tùy Chọn)

Nếu bạn có SSH access, chạy script tự động:

```bash
bash DEPLOY_PRODUCTION.sh
```

**Hoặc** làm theo **Bước 2** để deploy thủ công qua cPanel.

---

## 📦 Bước 2: Upload Files Lên Server (Thủ Công)

### A. Upload Frontend Files

1. **Mở File Manager trên cPanel**
   - Đăng nhập: https://ghf57-22175.azdigihost.com:2083
   - Click "File Manager"
   - Chọn "public_html"

2. **Xóa files cũ**
   - Delete tất cả files cũ trong public_html (TRỪ .htaccess nếu có)

3. **Upload Frontend**
   - Từ `dist/spa/` upload:
     - `index.html`
     - Folder `assets/`
   - Hoặc upload từ local: Open terminal → `zip -r spa.zip dist/spa/` → Upload spa.zip → Extract

### B. Upload Backend Files

1. **Vào File Manager**
   - Click vào folder `api.volxai.com`

2. **Upload Backend Files**
   - Từ `dist/server/` upload:
     - `node-build.mjs`
     - `node-build.mjs.map`

3. **Upload package.json**
   - Copy `package.json` từ root project

---

## 🔧 Bước 3: Tạo/Cập Nhật .env File

1. **Vào File Manager → api.volxai.com**
2. **Tạo file: `.env`** (hoặc edit nếu đã có)

```
# VolxAI Production Environment
DB_HOST=localhost
DB_PORT=3306
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=ISlc)_+hKk+g2.m^
DB_NAME=jybcaorr_lisacontentdbapi
PORT=3000
NODE_ENV=production
JWT_SECRET=964dWJijnTQc0BencpGcDADL+7GIGP3av7SaeVZtzbY=
VITE_API_URL=https://api.volxai.com
VITE_APP_NAME=VolxAI
VITE_APP_VERSION=1.0.0
PING_MESSAGE=ping pong
```

---

## 🎯 Bước 4: Setup Node.js App Trên cPanel

1. **Đăng nhập cPanel**: https://ghf57-22175.azdigihost.com:2083

2. **Tìm và Click: "Setup Node.js App"**

3. **Điền thông tin:**

   ```
   Application Name: volxai-api
   Application Root: /home/jybcaorr/api.volxai.com
   Application URL: https://api.volxai.com
   Startup File: node-build.mjs
   NodeJS Version: 18.x hoặc 20.x
   ```

4. **Nếu lần đầu**: Click "Create"  
   **Nếu đã tạo rồi**: Chọn "volxai-api" → Click "Restart"

5. **Chờ 30 giây** để server khởi động

---

## 🔄 Bước 5: Cập Nhật Database (Nếu Cần)

Nếu có thêm cột hoặc bảng mới:

1. **Vào phpMyAdmin trên cPanel**
2. **Chọn database: jybcaorr_lisacontentdbapi**
3. **Click tab SQL**
4. **Paste các query cần cập nhật**

Hoặc import lại schema đầy đủ từ `DATABASE_IMPORT.sql`

---

## ✅ Bước 6: Test Deployment

### Test Backend API

```bash
# Kiểm tra ping
curl https://api.volxai.com/api/ping

# Phải trả về:
# {"message":"ping pong","success":true}
```

### Test Frontend

- Mở browser: https://volxai.com
- Kiểm tra:
  - ✅ Trang Home load đúng
  - ✅ Links hoạt động
  - ✅ Click "Đăng nhập" hoạt động
  - ✅ API calls gửi đúng đến https://api.volxai.com

### Test Login

```
Email: admin@volxai.com
Password: (mật khẩu bạn đã tạo)
```

Sau đó:

- ✅ Tự động redirect đến /account
- ✅ Hiển thị thông tin user
- ✅ Nút "Nâng cấp" hoạt động
- ✅ QR code thanh toán hiển thị

---

## 🐛 Troubleshooting

### ❌ Error: "Cannot find module..."

**Giải pháp:** Cài npm dependencies

```bash
cd /home/jybcaorr/api.volxai.com
npm install
```

### ❌ Error: "Port already in use"

**Giải pháp:**

- Vào cPanel → Setup Node.js App
- Click "Restart"
- Chọn port khác nếu cần

### ❌ Error: "Database connection failed"

**Giải pháp:**

- Kiểm tra .env file có mật khẩu đúng không
- Kiểm tra database user có tồn tại không (cPanel → MySQL Databases)
- Kiểm tra database tên đúng không

### ❌ Frontend shows blank page

**Giải pháp:**

- Kiểm tra index.html có trong public_html không
- Kiểm tra assets folder có copy đầy đủ không
- Clear browser cache (Ctrl+Shift+Delete)
- Kiểm tra console (F12) có error gì không

---

## 📊 Kiểm tra Status

Vào cPanel → Setup Node.js App → Chọn "volxai-api"

**Status phải là:** ✅ Running

---

## 🔄 Cập Nhật Sau Này

Mỗi lần cập nhật code:

1. **Chạy lệnh build:**

   ```bash
   npm run build
   ```

2. **Chạy deployment script:**

   ```bash
   bash DEPLOY_PRODUCTION.sh
   ```

3. **Hoặc upload files thủ công:**
   - Upload frontend files từ `dist/spa/` vào public_html
   - Upload backend files từ `dist/server/` vào api.volxai.com
   - Restart Node.js App trên cPanel

---

## 📞 Hỗ Trợ

Nếu gặp lỗi:

- Kiểm tra logs trên cPanel
- Kiểm tra console browser (F12)
- Kiểm tra .env file
- Kiểm tra database connection

✅ **Mọi thứ sẵn sàng rồi!**
