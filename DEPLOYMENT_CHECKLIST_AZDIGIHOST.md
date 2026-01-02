# ✅ AzDigiHost Deployment Checklist

**Quick reference checklist - print this out!**

---

## 📱 PHẦN 1: Build (Máy của bạn)

```
[ ] Mở Terminal trong folder `code/`
[ ] Chạy: npm run build
[ ] Đợi completion
[ ] Kiểm tra thư mục `dist/` được tạo
    [ ] dist/spa/ (frontend)
    [ ] dist/server/ (backend)
```

**Time: 2-3 phút**

---

## 🌐 PHẦN 2: cPanel Setup

```
[ ] Login cPanel: https://ghf57-22175.azdigihost.com:2083
[ ] Username: jybcaorr
[ ] Password: _______________
[ ] Tìm "Setup Node.js App"
[ ] Click "Create Application"
[ ] Điền:
    [ ] Node Version: 18+ 
    [ ] Application mode: production
    [ ] Application root: /home/jybcaorr/volxai
    [ ] Startup file: production.mjs
    [ ] Application URL: volxai
[ ] Click "Create"
[ ] Ghi chú:
    App URL: _______________________
```

**Time: 5 phút**

---

## 📤 PHẦN 3: SSH Upload

### Terminal Step 1: Connect SSH
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
# Password: ;)|o|=NhgnM)
```

```
[ ] Connected to SSH
[ ] Prompt shows: jybcaorr@ghf57-22175:~$
```

### Terminal Step 2: Create Folder
```bash
mkdir -p ~/volxai
cd ~/volxai
```

```
[ ] Folder created
[ ] Current path: /home/jybcaorr/volxai
```

### Terminal Step 3: Upload Files (NEW TERMINAL)
```bash
# Từ folder code/ trên máy của bạn
cd code/
scp -P 2210 -r dist/server/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
scp -P 2210 -r dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:~/volxai/public/
scp -P 2210 package.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
scp -P 2210 package-lock.json jybcaorr@ghf57-22175.azdigihost.com:~/volxai/
```

```
[ ] production.mjs uploaded
[ ] production.mjs.map uploaded
[ ] public/ folder uploaded
[ ] package.json uploaded
[ ] package-lock.json uploaded
```

**Time: 5 phút**

---

## ⚙️ PHẦN 4: Install Dependencies & Env

### Terminal Step 4: Install NPM Packages
```bash
# SSH connection (connect lại nếu cần)
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/volxai
npm install --production
```

```
[ ] npm install hoàn tất (không có error)
[ ] Folder node_modules/ được tạo
```

### Terminal Step 5: Create .env File
```bash
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=your-secret-key-32-chars-min-jybcaorr-2024
DB_HOST=localhost
DB_USER=jybcaorr_volxai_user
DB_PASSWORD=your-db-password-here
DB_NAME=jybcaorr_volxai
DB_PORT=3306
PORT=3000
PING_MESSAGE=ping pong
EOF

cat .env
```

```
[ ] .env file created
[ ] All variables visible: cat .env
[ ] DB_PASSWORD updated with real password
[ ] JWT_SECRET updated
```

**Time: 3 phút**

---

## 🚀 PHẦN 5: Start App

### Via cPanel (Easier)
```
[ ] cPanel → Setup Node.js App
[ ] Find "volxai" app
[ ] Click "Restart"
[ ] Check status: "Running"
```

### Via SSH (Alternative)
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/volxai
npm start
```

```
[ ] App started
[ ] Output: "🚀 VolxAI Server running on port 3000"
```

**Time: 1 phút**

---

## 🧪 PHẦN 6: Test

### Terminal Test: Health Check
```bash
# Can run from any terminal
curl -H "Host: volxai.ghf57-22175.azdigihost.com" \
  http://localhost:3000/api/ping
```

```
[ ] Response: {"message":"ping pong"}
```

### Browser Test: Register
```
1. Open: https://volxai.ghf57-22175.azdigihost.com
2. Click "Đăng ký"
3. Fill:
   [ ] Username: testuser123
   [ ] Email: test123@example.com
   [ ] Password: TestPassword123
   [ ] Confirm: TestPassword123
   [ ] Check: Tôi không phải robot
4. Click "Đăng ký"
5. Check:
   [ ] Toast: "Đăng ký thành công! 🎉"
   [ ] Redirected to: /account
   [ ] Header shows: "Tài khoản" (not "Đăng nhập")
```

### Browser Test: DevTools Check
```
F12 → Network Tab
Look for POST to /api/auth/register
[ ] Status: 201
[ ] Response has: token, user object, success: true
[ ] Local Storage: authToken exists
```

### Browser Test: Login
```
1. Click: Đăng xuất
2. Go to: /login
3. Fill:
   [ ] Email: test123@example.com
   [ ] Password: TestPassword123
4. Click: Đăng nhập
5. Check:
   [ ] Toast: "Đăng nhập thành công! 🎉"
   [ ] Redirected to: /account
   [ ] Shows user info
```

```
[ ] Login works
[ ] User data displayed
[ ] Can logout
```

**Time: 5 phút**

---

## 🗄️ Database Setup (Optional - Only if needed)

```
[ ] cPanel → MySQL Databases
[ ] Create database: volxai
    Full name: jybcaorr_volxai
[ ] Create user: volxai_user
    Full name: jybcaorr_volxai_user
    Password: ______________
[ ] Add user to database
[ ] Grant ALL PRIVILEGES

[ ] SSH: Upload database/init.sql
[ ] SSH: mysql -u jybcaorr_volxai_user -p jybcaorr_volxai < init.sql
[ ] Check tables: SHOW TABLES;
```

---

## 🎯 Final Verification

```
[ ] Can access: https://volxai.ghf57-22175.azdigihost.com
[ ] Can register user
[ ] User appears in database
[ ] Can login
[ ] Token saved to localStorage
[ ] User appears on /account page
[ ] Can logout
[ ] Browser console clear (no errors)
[ ] Network tab shows 2xx/3xx responses
```

---

## 🏁 Success Indicators

✅ All checkboxes above = Deployment successful!

```
Frontend: https://volxai.ghf57-22175.azdigihost.com ✅
Backend API: https://volxai.ghf57-22175.azdigihost.com/api ✅
Database: Connected ✅
Auth: Working ✅
```

---

## ⏱️ Total Time Expected

| Step | Time | Status |
|------|------|--------|
| Build | 3 min | |
| cPanel Setup | 5 min | |
| SSH Upload | 5 min | |
| Install & Env | 3 min | |
| Start App | 1 min | |
| Test | 5 min | |
| **TOTAL** | **~20-25 min** | |

---

## 🚨 Quick Troubleshoot

| Problem | Quick Fix |
|---------|-----------|
| Files won't upload | Check SSH password, use WinSCP instead |
| npm install fails | Run: `npm cache clean --force` |
| App won't start | Check .env file, check logs in cPanel |
| Can't register | Check database connection in .env |
| CORS error | Restart app from cPanel |
| DNS not resolving | Wait 1-2 hours, clear browser cache |

---

**You've got this! 💪 Follow the checkboxes and you'll be done in 20 minutes!**

Print this page and check off as you go! ✅✅✅
