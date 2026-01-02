# ⚡ Quick Start - Deploy VolxAI on jybcaorr Account

**Tài khoản:** jybcaorr  
**Backend path:** `/home/jybcaorr/api.volxai.com`  
**Frontend path:** `/home/jybcaorr/public_html`  
**Database:** MariaDB (localhost)

---

## 🚀 STEP 1: Setup Database (5 phút)

### ☐ 1.1 Tạo Database

```
cPanel → MySQL Databases
├─ Create New Database
├─ Database name: volxai_db
└─ Click CREATE
```

**Kết quả:** Database tên `jybcaorr_volxai_db` được tạo

---

### ☐ 1.2 Tạo MySQL User

```
cPanel → MySQL Users
├─ Create New User
├─ Username: volxaiuser
├─ Password: (tạo mật khẩu, ví dụ: Volxai@2024#Secure)
└─ Click CREATE
```

**Ghi nhớ:**

```
Full username: jybcaorr_volxaiuser
Password: Volxai@2024#Secure
```

---

### ☐ 1.3 Gán quyền

```
cPanel → MySQL Databases
├─ Add User to Database
├─ User: jybcaorr_volxaiuser
├─ Database: jybcaorr_volxai_db
├─ Check: ALL PRIVILEGES
└─ Click MAKE CHANGES
```

---

### ☐ 1.4 Import SQL Schema

```
cPanel → phpMyAdmin
├─ Click database: jybcaorr_volxai_db
├─ Click SQL tab
├─ Copy nội dung: DATABASE_IMPORT.sql (file này)
├─ Paste vào
└─ Click GO
```

**Kết quả:** 7 tables được tạo ✓

---

## 🚀 STEP 2: Build Project (2 phút)

```bash
cd code/
npm run build
```

**Verify:**

```
✓ dist/spa/              (Frontend)
✓ dist/server/           (Backend)
  - node-build.mjs
  - node-build.mjs.map
```

---

## 🚀 STEP 3: Tạo .env file (1 phút)

**Copy từ template:**

```bash
cp .env.jybcaorr-production .env
```

**Edit .env - Thay đổi giá trị này:**

```
DB_USER=jybcaorr_volxaiuser
DB_PASSWORD=Volxai@2024#Secure     ← Mật khẩu bạn tạo ở STEP 1.2
DB_NAME=jybcaorr_volxai_db
JWT_SECRET=your-secret-key-change-this
```

---

## 🚀 STEP 4: Deploy Backend (3 phút)

### ☐ 4.1 Upload Backend Files

**File Manager: `/home/jybcaorr/api.volxai.com`**

Upload files:

```
dist/server/
├─ node-build.mjs
└─ node-build.mjs.map

.env               ← File cấu hình
package.json
```

---

### ☐ 4.2 Setup Node.js App

```
cPanel → Setup Node.js App
├─ Click CREATE APPLICATION
├─ Application name: volxai-api
├─ Node version: 18.x or 20.x (chọn mới nhất)
├─ Application root: /home/jybcaorr/api.volxai.com
├─ Startup file: dist/server/node-build.mjs
├─ Port: (để trống - tự gán)
└─ Click CREATE
```

**cPanel sẽ gán port, ví dụ: 3000 hoặc 8000**
➡️ **GHI NHỚ PORT NÀY!** (dùng ở STEP 5)

---

### ☐ 4.3 Kiểm tra Backend

```bash
curl https://api.volxai.com/api/ping
# Kết quả: {"message":"ping pong"}
```

---

## 🚀 STEP 5: Deploy Frontend (2 phút)

### ☐ 5.1 Cập nhật API URL

**Tìm trong `.env.production`:**

```
VITE_API_URL=https://api.volxai.com
```

Nếu cPanel gán port khác (ví dụ 3000):

```
VITE_API_URL=https://your-host:3000
```

---

### ☐ 5.2 Build lại Frontend

```bash
npm run build
```

---

### ☐ 5.3 Upload Frontend Files

**File Manager: `/home/jybcaorr/public_html`**

Upload contents của `dist/spa/`:

```
index.html
assets/
  ├─ index-HASH.js
  └─ index-HASH.css
... (other files)
```

---

## 🧪 STEP 6: Test (5 phút)

### ☐ 6.1 Test Backend

```bash
curl https://api.volxai.com/api/ping
# Expected: {"message":"ping pong"}
```

✓ If successful, backend is running

---

### ☐ 6.2 Test Frontend Load

Open browser:

```
https://api.volxai.com/
# hoặc: https://your-domain.com/
```

Should see VolxAI home page ✓

---

### ☐ 6.3 Test Register & Login

1. Go to: `https://api.volxai.com/login`
2. Click "Đăng ký"
3. Register:
   ```
   Email:    test@example.com
   Username: testuser
   Password: Test@123456
   ```
4. Click "Đăng nhập" button

**Expected:** No error, user created ✓

---

### ☐ 6.4 Verify Database

```
cPanel → phpMyAdmin
├─ Database: jybcaorr_volxai_db
├─ Table: users
└─ Should see: test@example.com entry
```

✓ If visible, database is working!

---

### ☐ 6.5 Check Console (F12)

Press F12 in browser → Console tab

**Should NOT see:**

- ❌ Mixed content errors
- ❌ CORS errors
- ❌ 404 API errors

---

## 📋 Final Checklist

- [ ] Database created: `jybcaorr_volxai_db`
- [ ] User created: `jybcaorr_volxaiuser`
- [ ] Schema imported (7 tables)
- [ ] Project built: `npm run build`
- [ ] `.env` file created with credentials
- [ ] Backend files uploaded
- [ ] Node.js App created in cPanel
- [ ] Backend running: `/api/ping` works
- [ ] Frontend files uploaded
- [ ] Frontend loads: home page visible
- [ ] Register works: test user created
- [ ] Database entry verified
- [ ] No console errors

---

## ⚠️ If Something Goes Wrong

| Issue               | Fix                                   |
| ------------------- | ------------------------------------- |
| Backend won't start | cPanel → Node.js App → View Logs      |
| DB connection error | Check .env credentials = cPanel MySQL |
| Frontend blank      | Check `/public_html` has `index.html` |
| API 404             | Check cPanel Node.js App port         |
| Mixed content error | Use `https://` in API URL             |

---

## 🎉 SUCCESS!

When all checkboxes above are ✓, your deployment is complete!

**Your VolxAI is live!**

- Frontend: `https://api.volxai.com`
- Backend: `https://api.volxai.com:PORT/api/`
- Database: MariaDB on localhost

🚀 **Chúc mừng!**

---

## 📞 File References

- **Full Deployment Guide:** `DEPLOYMENT_VOLXAI_JYBCAORR.md`
- **Database Schema:** `DATABASE_IMPORT.sql`
- **Environment Template:** `.env.jybcaorr-production`
- **Troubleshooting:** See full guide file
