# 🧪 Quick Test Commands

Danh sách lệnh nhanh để kiểm tra chức năng đăng ký và đăng nhập

---

## 1️⃣ Chạy Automated Test Script (Dễ nhất!)

```bash
# Chạy tất cả các tests tự động
node test-auth.js
```

**Điều này sẽ:**
- ✅ Kiểm tra server có chạy không
- ✅ Tạo user test mới (tên email ngẫu nhiên)
- ✅ Đăng ký user mới
- ✅ Lấy thông tin user
- ✅ Đăng nhập
- ✅ Đăng xuất
- ✅ Test error handling (sai mật khẩu, email không tồn tại)
- ✅ Hiển thị báo cáo chi tiết

---

## 2️⃣ Kiểm tra Health Check

```bash
# Dùng curl
curl http://103.221.221.67:3000/api/ping

# Hoặc dùng wget
wget -O- http://103.221.221.67:3000/api/ping

# Hoặc dùng Python
python3 -c "import requests; print(requests.get('http://103.221.221.67:3000/api/ping').json())"
```

**Kết quả mong đợi:**
```json
{"message":"ping"}
```

---

## 3️⃣ Test Đăng Ký (cURL)

```bash
curl -X POST http://103.221.221.67:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "username": "test123",
    "password": "TestPassword123",
    "full_name": "Test User"
  }'
```

---

## 4️⃣ Test Đăng Nhập (cURL)

```bash
# Lưu token từ response đăng ký/đăng nhập
# Thay "EMAIL" và "PASSWORD" bằng thông tin test
curl -X POST http://103.221.221.67:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "password": "TestPassword123"
  }'
```

---

## 5️⃣ Test Get Current User (cURL)

```bash
# Thay "TOKEN_HERE" bằng token từ response đăng nhập
curl -X GET http://103.221.221.67:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN_HERE"
```

---

## 6️⃣ Test Đăng Xuất (cURL)

```bash
# Thay "TOKEN_HERE" bằng token từ response
curl -X POST http://103.221.221.67:3000/api/auth/logout \
  -H "Authorization: Bearer TOKEN_HERE"
```

---

## 7️⃣ Kiểm tra Database (MySQL/MariaDB)

```bash
# Kết nối vào MariaDB
mysql -h 103.221.221.67 -u volxai_user -p volxai_db

# Sau đó chạy:
SELECT * FROM users;
SELECT * FROM sessions;
```

---

## 8️⃣ Kiểm tra trên UI (Manual)

1. Mở trình duyệt tại: `https://your-netlify-site.netlify.app`
2. Nhấp **Đăng ký** → Điền form → Nhấp **Đăng ký**
3. Nếu thành công → được chuyển tới `/account`
4. Nhấp **Đăng xuất** → được chuyển về Home
5. Nhấp **Đăng nhập** → Đăng nhập lại
6. Kiểm tra DevTools:
   - **F12 → Application → Local Storage** → Tìm `authToken`
   - **F12 → Network** → Xem API requests

---

## 🐛 Nếu gặp lỗi

### "Connection refused"
```bash
# Kiểm tra server có chạy không
ssh user@103.221.221.67
ps aux | grep node
# Nếu chưa chạy: npm start hoặc pm2 start
```

### "Email already registered"
```bash
# Dùng email mới cho test
# Email format: test-{random}@example.com
```

### "Cannot connect to database"
```bash
# Kiểm tra MariaDB
ssh user@103.221.221.67
mysql -u volxai_user -p
# Nhập mật khẩu
# Nếu kết nối được → database OK
```

### Token không được lưu
```bash
# Kiểm tra DevTools Console (F12)
# Tìm lỗi CORS hoặc JavaScript errors
```

---

## ✅ Checklist Verification

- [ ] Server responds to `/api/ping`
- [ ] Can register new user via API
- [ ] Can login with registered user
- [ ] Token is returned and stored
- [ ] Can get current user info with token
- [ ] Can logout successfully
- [ ] UI shows "Tài khoản" after login (not "Đăng nhập")
- [ ] User data appears in database
- [ ] Error handling works (wrong password, duplicate email)

---

## 📞 Còn vấn đề?

1. Xem `AUTH_TESTING_GUIDE.md` để hướng dẫn chi tiết
2. Kiểm tra server logs: `tail -f /var/log/backend.log`
3. Kiểm tra browser DevTools: F12 → Console → Network
4. Đảm bảo firewall không chặn port 3000

---

**Chúc bạn test thành công! 🚀**
