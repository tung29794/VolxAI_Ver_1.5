# 🧪 VolxAI Authentication Testing Guide

Hướng dẫn kiểm tra chi tiết chức năng đăng ký và đăng nhập của VolxAI

---

## 📋 Mục lục
1. [Kiểm tra nhanh (Health Check)](#kiểm-tra-nhanh)
2. [Kiểm tra thủ công (Manual Testing)](#kiểm-tra-thủ-công)
3. [Kiểm tra tự động (Automated Testing)](#kiểm-tra-tự-động)
4. [Kiểm tra cơ sở dữ liệu (Database Verification)](#kiểm-tra-cơ-sở-dữ-liệu)
5. [Gỡ lỗi (Troubleshooting)](#gỡ-lỗi)

---

## ✅ Kiểm tra nhanh

### Bước 1: Kiểm tra Server Health

Mở Terminal/Console trình duyệt và chạy lệnh:

```bash
curl http://103.221.221.67:3000/api/ping
```

**Kết quả mong đợi:**
```json
{
  "message": "ping"
}
```

**Nếu không thành công:**
- ❌ Có thể server chưa chạy hoặc IP sai
- ❌ Firewall có thể chặn port 3000
- Xem [Gỡ lỗi](#gỡ-lỗi) để fix

---

## 🎯 Kiểm tra thủ công

### Tùy chọn A: Dùng giao diện web (Dễ nhất!)

#### Test Đăng ký:

1. Mở ứng dụng VolxAI tại `https://your-netlify-url`
2. Nhấp vào nút **"Đăng ký"** hoặc truy cập `/register`
3. Điền form với thông tin test:
   ```
   Tên đăng nhập: testuser123
   Email: testuser@example.com
   Mật khẩu: TestPassword123
   Nhập lại mật khẩu: TestPassword123
   ✓ Tôi không phải robot
   ```
4. Nhấp **"Đăng ký"**
5. Kết quả mong đợi:
   - ✅ Thấy thông báo "Đăng ký thành công! 🎉"
   - ✅ Được chuyển hướng tới trang `/account`
   - ✅ Thấy nút "Tài khoản" ở header (thay vì "Đăng nhập")

#### Test Đăng nhập:

1. Đăng xuất (nếu đã đăng nhập)
2. Nhấp **"Đăng nhập"** hoặc truy cập `/login`
3. Điền form:
   ```
   Email: testuser@example.com
   Mật khẩu: TestPassword123
   ```
4. Nhấp **"Đăng nhập"**
5. Kết quả mong đợi:
   - ✅ Thấy thông báo "Đăng nhập thành công! 🎉"
   - ✅ Được chuyển hướng tới `/account`
   - ✅ Header hiển thị "Tài khoản"

---

### Tùy chọn B: Dùng Browser DevTools (Nâng cao)

#### 1. Kiểm tra Local Storage

1. Mở DevTools: **F12** → Tab **Application** (Chrome) hoặc **Storage** (Firefox)
2. Vào **Local Storage** → chọn domain của bạn
3. Tìm key `authToken`
4. Kết quả mong đợi:
   - ✅ Sau đăng ký/đăng nhập: `authToken` có giá trị (JWT token dài)
   - ✅ Sau đăng xuất: `authToken` bị xóa

#### 2. Kiểm tra Network Requests

1. Mở DevTools: **F12** → Tab **Network**
2. Xóa tab Network, sau đó thực hiện đăng ký/đăng nhập
3. Tìm request tới `103.221.221.67:3000`
4. Kiểm tra từng request:

**POST /api/auth/register** hoặc **POST /api/auth/login**
- Request Headers:
  ```
  Content-Type: application/json
  ```
- Request Body:
  ```json
  {
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "username": "testuser123",  // chỉ cho register
    "full_name": "testuser123"  // chỉ cho register
  }
  ```
- Response Status: **201** (register) hoặc **200** (login)
- Response Body:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "testuser@example.com",
      "username": "testuser123",
      "full_name": "testuser123",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

**GET /api/auth/me**
- Request Headers:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- Response Status: **200**
- Response Body:
  ```json
  {
    "success": true,
    "message": "User found",
    "user": {
      "id": 1,
      "email": "testuser@example.com",
      "username": "testuser123",
      "full_name": "testuser123",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

---

## 🤖 Kiểm tra tự động

### Tùy chọn A: Dùng cURL (Terminal)

#### Test Đăng ký:

```bash
curl -X POST http://103.221.221.67:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser123",
    "password": "TestPassword123",
    "full_name": "Test User"
  }'
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "username": "testuser123",
    "full_name": "Test User",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test Đăng nhập:

```bash
curl -X POST http://103.221.221.67:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }'
```

#### Test Get Current User:

```bash
# Thay "YOUR_TOKEN_HERE" bằng token từ response trên
curl -X GET http://103.221.221.67:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Test Logout:

```bash
curl -X POST http://103.221.221.67:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Tùy chọn B: Dùng Postman (GUI)

1. **Tải Postman**: https://www.postman.com/downloads/
2. **Tạo Request mới**:
   - **URL**: `http://103.221.221.67:3000/api/auth/register`
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`
   - **Body** (JSON):
     ```json
     {
       "email": "testuser@example.com",
       "username": "testuser123",
       "password": "TestPassword123",
       "full_name": "Test User"
     }
     ```
3. **Nhấp Send** → xem Response

Làm tương tự cho `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`

---

### Tùy chọn C: Dùng Node.js Script

Tạo file `test-auth.js`:

```javascript
const BASE_URL = 'http://103.221.221.67:3000';

async function testAuth() {
  try {
    // 1. Test Register
    console.log('📝 Testing Register...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        username: 'testuser123',
        password: 'TestPassword123',
        full_name: 'Test User'
      })
    });
    const registerData = await registerRes.json();
    console.log('Register Response:', registerData);
    
    if (!registerData.token) {
      console.error('❌ Register failed: No token returned');
      return;
    }
    
    const token = registerData.token;
    console.log('✅ Register successful');
    
    // 2. Test Get Current User
    console.log('\n👤 Testing Get Current User...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log('Me Response:', meData);
    console.log('✅ Get current user successful');
    
    // 3. Test Login
    console.log('\n🔑 Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'TestPassword123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    console.log('✅ Login successful');
    
    // 4. Test Logout
    console.log('\n🚪 Testing Logout...');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logoutData = await logoutRes.json();
    console.log('Logout Response:', logoutData);
    console.log('✅ Logout successful');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuth();
```

Chạy:
```bash
node test-auth.js
```

---

## 📊 Kiểm tra cơ sở dữ liệu

### Kết nối trực tiếp vào MariaDB

1. **Dùng MySQL Client** (nếu có cài sẵn):
```bash
mysql -h 103.221.221.67 -u volxai_user -p volxai_db
# Password: Nhập mật khẩu MariaDB
```

2. **Kiểm tra dữ liệu người dùng đã đăng ký**:

```sql
-- Xem tất cả người dùng
SELECT id, email, username, full_name, is_active, created_at FROM users;

-- Xem chi tiết một người dùng
SELECT * FROM users WHERE email = 'testuser@example.com';

-- Đếm tổng người dùng
SELECT COUNT(*) as total_users FROM users;

-- Xem sessions đang hoạt động
SELECT * FROM sessions WHERE expires_at > NOW();
```

3. **Nếu không thể kết nối**:
   - Có thể MariaDB chưa cho phép kết nối từ máy của bạn
   - Xem phần [Gỡ lỗi](#gỡ-lỗi) để fix

---

## 🔧 Gỡ lỗi

### ❌ Vấn đề: "Connection refused" tới 103.221.221.67:3000

**Nguyên nhân có thể:**
1. Server backend chưa chạy
2. Port 3000 chưa được mở
3. Firewall chặn

**Cách fix:**

```bash
# Kiểm tra xem server có chạy không
ssh user@103.221.221.67
cd /path/to/backend
npm start  # hoặc node server.js

# Hoặc dùng PM2 để chạy background
pm2 start server.js --name "volxai-backend"
pm2 save
```

---

### ❌ Vấn đề: "Email already registered" hoặc "Username already taken"

**Nguyên nhân:**
- Email hoặc username này đã tồn tại trong database

**Cách fix:**
1. Dùng email/username mới cho test
2. Hoặc xóa user cũ từ database:

```sql
DELETE FROM users WHERE email = 'testuser@example.com';
```

---

### ❌ Vấn đề: "Invalid email or password" khi đăng nhập

**Nguyên nhân:**
- Email không tồn tại
- Mật khẩu sai
- Tài khoản bị khóa (is_active = FALSE)

**Cách fix:**
1. Kiểm tra user có tồn tại không:
```sql
SELECT * FROM users WHERE email = 'testuser@example.com';
```

2. Kiểm tra is_active:
```sql
UPDATE users SET is_active = TRUE WHERE email = 'testuser@example.com';
```

3. Reset mật khẩu (xóa user và đăng ký lại)

---

### ❌ Vấn đề: Token không được lưu vào localStorage

**Nguyên nhân:**
- CORS error từ backend
- JavaScript error trong frontend
- Browser chặn localStorage (Private mode)

**Cách fix:**
1. Kiểm tra DevTools Console (F12 → Console)
2. Tìm lỗi CORS:
   - Đảm bảo backend có `cors()` middleware:
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```

3. Thử lại trên non-private mode browser

---

### ❌ Vấn đề: "Cannot connect to database"

**Nguyên nhân:**
- Firewall chặn port 3306
- MariaDB chưa chạy
- Credentials sai

**Cách fix:**

```bash
# Kiểm tra MariaDB có chạy không
ssh user@103.221.221.67
ps aux | grep mariadb

# Nếu chưa chạy
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Kiểm tra port 3306 có mở không
sudo netstat -tlnp | grep 3306

# Hoặc dùng script test-connection.js (đã cung cấp)
node database/test-connection.js
```

---

### ❌ Vấn đề: Form validation errors

**Nguyên nhân:**
- Dữ liệu nhập không hợp lệ

**Yêu cầu validation:**
- **Email**: phải có @ và domain
- **Username**: 
  - Tối thiểu 3 ký tự
  - Chỉ chứa chữ, số, gạch dưới, gạch ngang
- **Password (Register)**:
  - Tối thiểu 8 ký tự
  - Phải có chữ hoa, chữ thường, số
- **Password (Login)**: tối thiểu 6 ký tự

**Cách fix:**
- Nhập đúng format theo hướng dẫn trên form

---

## ✨ Checklist Kiểm tra Hoàn chỉnh

- [ ] ✅ Kiểm tra health check: `curl http://103.221.221.67:3000/api/ping`
- [ ] ✅ Đăng ký tài khoản mới trên UI
- [ ] ✅ Kiểm tra token được lưu vào localStorage
- [ ] ✅ Kiểm tra user mới xuất hiện trong database
- [ ] ✅ Đăng xuất rồi đăng nhập lại
- [ ] ✅ Kiểm tra Network tab trong DevTools
- [ ] ✅ Kiểm tra Account page hiển thị đúng thông tin
- [ ] ✅ Test lỗi: đăng nhập sai mật khẩu
- [ ] ✅ Test lỗi: đăng ký duplicate email
- [ ] ✅ Kiểm tra API responses có đúng format

---

## 📞 Cần giúp?

Nếu gặp vấn đề:

1. **Kiểm tra logs**:
   ```bash
   # Logs trên server
   ssh user@103.221.221.67
   tail -f /var/log/backend.log
   ```

2. **Kiểm tra DevTools Console**:
   - F12 → Console → xem lỗi gì hiện ra

3. **Cung cấp thông tin**:
   - Lỗi chính xác hiển thị
   - Steps để reproduce
   - Screenshot DevTools
   - Server logs

---

**Chúc bạn test thành công! 🚀**
