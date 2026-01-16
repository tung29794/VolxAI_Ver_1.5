# 🔧 KHẮC PHỤC VẤN ĐỀ QUẢN LÝ API

## ❌ Vấn đề

**Admin Dashboard** → **Quản lý API**
- Thêm API key → Hiển thị "✅ API key đã được thêm"
- **NHƯNG** dữ liệu **KHÔNG** được lưu vào database
- Refresh trang → API key biến mất

## 🎯 Nguyên nhân

**Table `api_keys` không tồn tại trong database**

Backend code cố gọi table này nhưng table chưa được tạo.

## ✅ CÁCH KHẮC PHỤC (3 bước)

### BƯỚC 1️⃣ : Chạy SQL Migration

**File:** `database/migrations/fix_api_keys_table.sql`

Có 2 cách:

#### ✂️ Cách A: Sử dụng phpMyAdmin (Dễ nhất)

1. Mở: https://[domain]/phpmyadmin
2. Click "Nhập" (Import)
3. Chọn file: `database/migrations/fix_api_keys_table.sql`
4. Click "Thực thi" (Go button)
5. ✅ Thấy thông báo "Query executed successfully" = Thành công

#### ✂️ Cách B: Chạy SQL command trực tiếp

1. Mở phpMyAdmin
2. Chọn database của bạn
3. Click tab "SQL"
4. Paste code dưới đây:

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

5. Click "Thực thi"
6. ✅ Xong!

### BƯỚC 2️⃣: Restart Backend Server

```bash
npm run dev
```

### BƯỚC 3️⃣: Test lại

1. Truy cập: `/admin` → **Quản lý API**
2. Click **"Thêm API"**
3. Điền thông tin:
   - Loại API: "API Tạo nội dung"
   - Nhà cung cấp: "OpenAI"
   - API Key: `sk-test-123`
   - Mô tả: "Test"
4. Click **"Thêm"**
5. **Kiểm tra:**
   - ✅ Thông báo xuất hiện
   - ✅ API key hiển thị trong danh sách
   - ✅ **Refresh trang (F5)** → API key **vẫn còn** ✅

---

## 📚 Tài liệu chi tiết

Các file hướng dẫn chi tiết:
- 📄 `API_KEYS_FIX_SUMMARY.md` - Tóm tắt kỹ thuật
- 📄 `FIX_API_KEYS_MANAGEMENT.md` - Hướng dẫn chi tiết từng bước
- 📄 `database/migrations/fix_api_keys_table.sql` - SQL migration file

## ❓ Troubleshooting

### ❌ Sau khi chạy migration vẫn lỗi?

**Kiểm tra:**
1. Table đã được tạo? Chạy query:
   ```sql
   SELECT * FROM api_keys;
   ```
   - Nếu thấy "Empty set" = ✅ Table tồn tại
   - Nếu thấy "Table doesn't exist" = ❌ Migration thất bại

2. Backend có restart? 
   - Restart lại: `npm run dev`

3. Browser console có error?
   - Mở DevTools (F12) → Console → Có message đỏ?

---

**Status:** ✅ FIX READY - Chỉ cần chạy SQL migration
