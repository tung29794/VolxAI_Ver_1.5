# ✅ Checklist - Khắc phục vấn đề Quản lý API

## 📋 Bước 1: Chuẩn bị

- [ ] Backup database (nếu production)
- [ ] Đảm bảo có quyền truy cập phpMyAdmin hoặc database tool
- [ ] Chuẩn bị SQL migration file (`database/migrations/fix_api_keys_table.sql`)

## 🗄️ Bước 2: Tạo Table trong Database

### Tùy chọn A: Dùng phpMyAdmin

- [ ] Mở phpMyAdmin: https://[domain]/phpmyadmin
- [ ] Đăng nhập bằng thông tin database
- [ ] Chọn database: `jybcaorr_volxai_db` (hoặc database name của bạn)
- [ ] Click tab **"SQL"**
- [ ] Copy toàn bộ nội dung từ `database/migrations/fix_api_keys_table.sql`
- [ ] Paste vào SQL editor
- [ ] Click nút **"Thực thi"** (Go)
- [ ] Kiểm tra kết quả:
  - [ ] Thấy message: "Query executed successfully" ✅
  - [ ] Hoặc "0 rows affected" ✅
- [ ] Xác nhận table được tạo:
  - [ ] Chạy query: `SELECT * FROM api_keys;`
  - [ ] Kết quả: "Empty set" hoặc 0 rows = ✅ Table tồn tại

### Tùy chọn B: Chạy SQL command trực tiếp

- [ ] Kết nối database bằng MySQL client
- [ ] Chọn database: `USE jybcaorr_volxai_db;`
- [ ] Chạy SQL:
```sql
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    quota_remaining INT,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
- [ ] Kiểm tra kết quả:
  - [ ] Query OK, 0 rows affected = ✅

### Tùy chọn C: Chạy full initialization

- [ ] Backup database trước
- [ ] Chạy `database/init.sql` trên database
- [ ] Hoặc chạy `DATABASE_IMPORT.sql`

## 🖥️ Bước 3: Restart Backend Server

- [ ] Terminal: `npm run dev`
- [ ] Kiểm tra logs:
  - [ ] Không có error liên quan đến database connection
  - [ ] Message: "✓ Database connected" xuất hiện
- [ ] Server running trên: `http://localhost:3000` (hoặc port khác)

## 🧪 Bước 4: Test tính năng

### 4.1 Truy cập Admin Dashboard

- [ ] Mở browser → `/admin`
- [ ] Login bằng admin account
- [ ] Kiểm tra sidebar → tìm mục "Quản lý API"

### 4.2 Thêm API key test

- [ ] Click button "Thêm API"
- [ ] Dialog "Thêm API Key mới" xuất hiện
- [ ] Điền form:
  - [ ] Loại API: Chọn "API Tạo nội dung"
  - [ ] Nhà cung cấp: Chọn "OpenAI"
  - [ ] API Key: Nhập `sk-test-12345` (test key)
  - [ ] Mô tả: Nhập "Test API Key"
  - [ ] Checkbox "Kích hoạt API key này": ✅ Ticked
- [ ] Click button "Thêm"

### 4.3 Kiểm tra kết quả

- [ ] Notification xuất hiện: "API key đã được thêm" ✅
- [ ] Dialog đóng ✅
- [ ] Danh sách API keys update:
  - [ ] "OpenAI" key hiển thị trong danh sách
  - [ ] Status: "sk-te...3456" (masked) ✅
  - [ ] Có button Edit & Delete ✅

### 4.4 Verify data persistence (Quan trọng!)

- [ ] Refresh trang (F5)
- [ ] Kiểm tra:
  - [ ] API key vẫn hiển thị trong danh sách ✅
  - [ ] Thông tin không thay đổi ✅
  - [ ] Có thể click Edit xem chi tiết ✅

### 4.5 Test các tính năng khác

- [ ] **Edit API key:**
  - [ ] Click icon Edit (✏️)
  - [ ] Sửa description: "Updated test"
  - [ ] Click "Cập nhật"
  - [ ] Thông báo "API key đã được cập nhật" ✅
  - [ ] Refresh → thay đổi được lưu ✅

- [ ] **Show/Hide API key:**
  - [ ] Trong danh sách, click icon (eye/eye-off)
  - [ ] API key full hiển thị
  - [ ] Click lại → ẩn key ✅

- [ ] **Xóa API key:**
  - [ ] Click icon Delete (🗑️)
  - [ ] Confirm dialog xuất hiện
  - [ ] Click "Xóa"
  - [ ] Thông báo "API key đã được xóa" ✅
  - [ ] Refresh → key biến mất ✅

## 🔍 Bước 5: Verify trong Database

- [ ] Mở phpMyAdmin
- [ ] Chọn table `api_keys`
- [ ] Click tab "Dữ liệu" (Data)
- [ ] Kiểm tra:
  - [ ] Test API key hiển thị trong table
  - [ ] Tất cả các cột có dữ liệu đúng:
    - [ ] id: Auto-increment
    - [ ] provider: "openai"
    - [ ] category: "content"
    - [ ] api_key: "sk-test-12345"
    - [ ] description: "Test API Key"
    - [ ] is_active: 1 (TRUE)
    - [ ] created_at: Current timestamp
    - [ ] updated_at: Current timestamp

## 🎯 Bước 6: Quyết định Go-Live

- [ ] Tất cả tests passed ✅
- [ ] Không có error trong console hoặc logs
- [ ] Database backup đã được tạo
- [ ] Deploy thay đổi code (nếu có):
  - [ ] `database/init.sql` - Updated
  - [ ] `DATABASE_IMPORT.sql` - Updated
  - [ ] Các file khác không thay đổi

## ⚠️ Bước 7: Rollback Plan (Nếu có vấn đề)

- [ ] Database backup có sẵn
- [ ] Rollback command:
  ```sql
  DROP TABLE IF EXISTS api_keys;
  ```
- [ ] Revert code changes (Git)
- [ ] Restart server

## 📞 Troubleshooting

### ❓ Sau khi add API key, refresh trang → key biến mất

**Kiểm tra:**
1. [ ] Query trong database: `SELECT * FROM api_keys;`
   - Nếu empty = Table tạo nhưng INSERT không thành công
   - Kiểm tra server logs có error không?

2. [ ] Browser DevTools (F12) → Network tab
   - [ ] POST /api/api-keys → Status 201? (Success)
   - [ ] Response body có `id` field không?
   - [ ] GET /api/api-keys → Status 200?

3. [ ] Browser console (F12 → Console)
   - [ ] Có error message đỏ không?

### ❓ Khi add API key → Lỗi "Lỗi khi lưu API key"

**Giải pháp:**
1. [ ] Kiểm tra database table tồn tại:
   ```sql
   DESCRIBE api_keys;
   ```

2. [ ] Kiểm tra backend logs:
   - [ ] Có error message trong terminal?
   - [ ] Connection string đúng không?

3. [ ] Restart server:
   ```bash
   npm run dev
   ```

### ❓ "Table 'api_keys' doesn't exist" error

**Nguyên nhân:** Migration SQL chưa được chạy

**Giải pháp:**
- [ ] Chạy SQL migration lại (Bước 2)
- [ ] Verify table tồn tại: `SHOW TABLES LIKE 'api_keys';`

---

## ✅ Final Checklist

- [ ] Database migration chạy thành công
- [ ] Backend server running
- [ ] Admin Dashboard accessible
- [ ] Add/Edit/Delete API keys working
- [ ] Data persists after refresh
- [ ] Database contains saved data
- [ ] No errors in console/logs
- [ ] Ready for production

---

**Status:** ⏳ Pending execution
**Date Completed:** _______________
**Completed by:** _______________
