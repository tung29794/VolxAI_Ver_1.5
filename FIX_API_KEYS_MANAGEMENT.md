# Khắc phục vấn đề Quản lý API - Thêm API nhưng dữ liệu không lưu

## 🔍 Nguyên nhân vấn đề

Trang Admin `/admin` mục "Quản lý API" hiển thị thông báo "Thêm thành công" nhưng dữ liệu không được lưu vào database.

**Lý do:** Table `api_keys` **không tồn tại** trong database. Backend code (file `server/routes/api-keys.ts`) cố gọi table `api_keys` để lưu dữ liệu, nhưng table này chưa được tạo.

## 📋 Giải pháp

### Bước 1: Chạy Migration trên Database

#### Cách 1: Sử dụng phpMyAdmin (Khuyên dùng)

1. **Đăng nhập phpMyAdmin**
   - Truy cập: https://[your-domain]/phpmyadmin
   - Đăng nhập bằng thông tin database

2. **Chọn database:**
   - Sidebar trái → Chọn database: `jybcaorr_volxai_db` (hoặc tên database của bạn)

3. **Mở SQL editor:**
   - Click tab "SQL" (hoặc "Truy vấn")

4. **Copy SQL command bên dưới:**

```sql
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(100) NOT NULL COMMENT 'openai, serpapi, serper, zenserp, anthropic, google-ai, etc',
    category VARCHAR(50) NOT NULL COMMENT 'content, search, etc',
    api_key VARCHAR(500) NOT NULL COMMENT 'The actual API key',
    description VARCHAR(255) COMMENT 'Description or label for this key',
    is_active BOOLEAN DEFAULT TRUE,
    quota_remaining INT COMMENT 'Remaining quota if applicable',
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Centralized management of all API keys used by the application';
```

5. **Paste vào SQL editor** và click "Thực thi" (Execute/Go button)

6. **Kiểm tra kết quả:**
   - Nếu thành công sẽ thấy message: `"Table api_keys created successfully"`
   - Kiểm tra database structure: click vào database → tab "Cấu trúc" sẽ thấy table `api_keys`

#### Cách 2: Chạy toàn bộ SQL scripts

Bạn có thể chạy toàn bộ file initialization:

1. Mở phpMyAdmin
2. Click "Nhập" (Import)
3. Chọn file: `database/init.sql` hoặc `DATABASE_IMPORT.sql`
4. Click "Thực thi" (Go)

**Lưu ý:** Nếu database đã có dữ liệu, hãy backup trước khi chạy.

### Bước 2: Kiểm tra xem table đã được tạo

Chạy query kiểm tra:

```sql
DESCRIBE api_keys;
```

Nếu thấy kết quả hiển thị các cột như `id, provider, category, api_key, ...` thì table đã được tạo thành công.

### Bước 3: Restart Backend Server

Sau khi tạo table, restart lại backend server để áp dụng thay đổi:

```bash
# Terminal
npm run dev  # Hoặc command để restart server của bạn
```

## ✅ Kiểm tra xem vấn đề đã được khắc phục

1. **Truy cập Admin Dashboard:** https://[your-domain]/admin
2. **Vào mục "Quản lý API"**
3. **Click nút "Thêm API"**
4. **Điền thông tin:**
   - Loại API: "API Tạo nội dung" 
   - Nhà cung cấp: "OpenAI"
   - API Key: `sk-test-123456` (test key)
   - Mô tả: "Test API"
5. **Click "Thêm"**
6. **Kiểm tra:**
   - ✅ Thông báo "API key đã được thêm" xuất hiện
   - ✅ API key hiển thị trong danh sách
   - ✅ Refresh trang (F5) → API key vẫn hiển thị (chứng tỏ đã lưu vào database)

## 📝 Các file đã được cập nhật

| File | Thay đổi |
|------|---------|
| `database/init.sql` | Thêm CREATE TABLE api_keys |
| `DATABASE_IMPORT.sql` | Thêm CREATE TABLE api_keys |
| `database/migrations/create_api_keys_table.sql` | Migration file (đã tồn tại) |

## 🔧 Tài liệu liên quan

- Backend API: `server/routes/api-keys.ts` - Xử lý CRUD operations
- Frontend UI: `client/components/admin/AdminAPIs.tsx` - Giao diện quản lý
- Database schema: `database/init.sql` - Schema tổng hợp

## ❓ Nếu vấn đề vẫn còn

1. **Kiểm tra lại:**
   - Table `api_keys` đã được tạo trong database?
   - Backend server đã được restart?
   
2. **Kiểm tra browser console:**
   - Mở Developer Tools (F12)
   - Tab "Console" → Có error message nào?
   - Tab "Network" → Response từ API `/api/api-keys` là gì?

3. **Kiểm tra server logs:**
   - Có error message nào trong terminal server?

4. **Database:**
   - Kết nối database có bị cắt?
   - Thử chạy trực tiếp query SQL để test

## 📞 Support

Nếu vấn đề vẫn chưa giải quyết, hãy cung cấp:
- Database error message (nếu có)
- Browser console error (nếu có)
- Server logs output
