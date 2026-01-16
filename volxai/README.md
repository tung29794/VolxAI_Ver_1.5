# Article Writer Publisher Plugin

Plugin WordPress tùy chỉnh để nhận bài viết từ ứng dụng Python Article Writer qua REST API.

## Tính Năng

✅ **REST API Endpoint** để publish bài viết từ Python app  
✅ **Quản lý API Tokens** - Tạo, deactivate, xóa tokens  
✅ **Request Logging** - Ghi lại tất cả API requests  
✅ **Custom Post Meta** - Lưu từ khóa chính và phụ  
✅ **Category/Tag Support** - Tự động gán categories và tags  
✅ **Status Management** - Draft, Pending Review, hoặc Publish  
✅ **Scheduled Publishing** - Lên lịch đăng bài  

## Yêu Cầu

- WordPress 5.0+
- PHP 7.4+
- REST API enabled (mặc định enabled)

## Cài Đặt

### 1. Upload Plugin

```bash
# Vào thư mục plugins của WordPress
cd wp-content/plugins/

# Copy plugin vào đây
cp -r article-writer-publisher /path/to/wp-content/plugins/
```

### 2. Kích Hoạt Plugin

- Đăng nhập vào WordPress Admin Dashboard
- Vào **Plugins** → Tìm **Article Writer Publisher**
- Click **Activate**

### 3. Tạo API Token

- Vào **Article Writer** → **API Tokens**
- Nhập tên token (vd: "Python App Token")
- Click **Tạo Token Mới**
- Copy token xuất hiện (giữ an toàn!)

### 4. Cấu Hình Python App

Xem file `wordpress_config.py` trong thư mục ứng dụng Python của bạn.

## API Documentation

### Endpoint: `/wp-json/article-writer/v1/publish`

**Method:** `POST`

**Headers:**
```
X-Article-Writer-Token: your-api-token-here
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Tiêu đề bài viết",
  "content": "Nội dung bài viết...",
  "excerpt": "Mô tả ngắn",
  "primary_keyword": "Từ khóa chính",
  "secondary_keywords": ["kw1", "kw2", "kw3"],
  "status": "draft",
  "category_id": 1,
  "tags": ["tag1", "tag2"],
  "scheduled_time": "2024-12-25T10:00:00Z"
}
```

**Required Fields:**
- `title` (string): Tiêu đề bài viết
- `content` (string): Nội dung bài viết

**Optional Fields:**
- `excerpt` (string): Mô tả ngắn
- `primary_keyword` (string): Từ khóa chính (lưu vào meta)
- `secondary_keywords` (array): Danh sách từ khóa phụ (lưu vào meta)
- `status` (string): `draft`, `pending`, hoặc `publish` (mặc định: `draft`)
- `category_id` (integer): ID của category
- `tags` (array): Danh sách tên tag
- `scheduled_time` (string): ISO 8601 format (vd: `2024-12-25T10:00:00Z`)

**Response (201 Created):**
```json
{
  "success": true,
  "post_id": 12345,
  "post_url": "https://yoursite.com/article-title",
  "title": "Tiêu đề bài viết",
  "status": "draft",
  "message": "Bài viết đã được đăng thành công",
  "timestamp": "2024-12-23T10:30:45Z"
}
```

### Endpoint: `/wp-json/article-writer/v1/drafts`

**Method:** `GET`

**Headers:**
```
X-Article-Writer-Token: your-api-token-here
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "drafts": [
    {
      "id": 12345,
      "title": "Tiêu đề bài viết",
      "excerpt": "Mô tả ngắn",
      "modified": "2024-12-23T10:30:45Z",
      "url": "https://yoursite.com/wp-admin/post.php?post=12345&action=edit"
    }
  ],
  "timestamp": "2024-12-23T10:30:45Z"
}
```

## Error Responses

**401 Unauthorized - Missing Token:**
```json
{
  "code": "missing_token",
  "message": "API Token is missing. Please provide X-Article-Writer-Token header.",
  "data": {
    "status": 401
  }
}
```

**403 Forbidden - Invalid Token:**
```json
{
  "code": "invalid_token",
  "message": "Invalid or expired API Token.",
  "data": {
    "status": 403
  }
}
```

**400 Bad Request - Validation Error:**
```json
{
  "code": "validation_error",
  "message": "Title is required",
  "data": {
    "status": 400
  }
}
```

**500 Server Error:**
```json
{
  "code": "server_error",
  "message": "Error message details",
  "data": {
    "status": 500
  }
}
```

## Admin Pages

### 1. Dashboard
- **URL:** `/wp-admin/admin.php?page=article-writer-publisher`
- Thông tin API endpoint
- Hướng dẫn sử dụng
- Ví dụ request

### 2. API Tokens
- **URL:** `/wp-admin/admin.php?page=article-writer-publisher-tokens`
- Xem tất cả tokens
- Tạo token mới
- Deactivate/Activate tokens
- Xóa tokens
- Xem lần cuối sử dụng

### 3. Settings
- **URL:** `/wp-admin/admin.php?page=article-writer-publisher-settings`
- Cài đặt trạng thái bài mặc định
- Chọn tác giả mặc định
- Cài đặt thời gian lưu logs

### 4. Logs
- **URL:** `/wp-admin/admin.php?page=article-writer-publisher-logs`
- Xem 100 logs gần nhất (7 ngày)
- Status requests
- IP address của requester
- Messages

## Bảo Mật

### ⚠️ Lưu Ý Quan Trọng

1. **Giữ Token Bí Mật**
   - Đừng chia sẻ token trên public
   - Nếu lộ token, tạo token mới và xóa cái cũ

2. **HTTPS Only**
   - Luôn sử dụng HTTPS khi gọi API
   - Không gửi token qua HTTP

3. **Token Rotation**
   - Định kỳ tạo token mới
   - Xóa các token cũ không dùng

4. **Monitor Logs**
   - Kiểm tra logs định kỳ
   - Phát hiện unusual activity

5. **Database Backup**
   - Backup WordPress database thường xuyên
   - Plugin sẽ tạo table `wp_article_writer_tokens`

## Troubleshooting

### Token không hoạt động
- Kiểm tra token đã active chưa
- Kiểm tra log để xem error chi tiết
- Tạo token mới

### API endpoint không tìm thấy
- Kiểm tra REST API có enabled không
- Refresh REST API routes: `/wp-admin/options-permalink.php` → Save
- Kiểm tra WordPress version >= 5.0

### Posts không được tạo
- Kiểm tra logs
- Kiểm tra user có permission post không
- Kiểm tra các required fields có đúng không

## File Structure

```
article-writer-publisher/
├── article-writer-publisher.php    # Main plugin file
├── includes/
│   ├── class-api-handler.php       # Xử lý API requests
│   ├── class-token-manager.php     # Quản lý tokens
│   ├── class-logger.php            # Ghi logs
│   └── class-settings-page.php     # Admin settings
├── assets/
│   └── css/
│       └── admin-style.css         # Admin styles
├── logs/                           # Log files (auto-created)
└── README.md                       # This file
```

## Database Tables

### wp_article_writer_tokens

```sql
CREATE TABLE wp_article_writer_tokens (
    id mediumint(9) NOT NULL AUTO_INCREMENT,
    token varchar(255) NOT NULL UNIQUE,
    token_name varchar(100) NOT NULL,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    last_used datetime DEFAULT NULL,
    is_active tinyint(1) DEFAULT 1,
    created_by bigint(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY token (token)
);
```

## Support

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs trong **Article Writer** → **Logs**
2. Kiểm tra WordPress error logs
3. Kiểm tra PHP error logs

## License

GPL v2 or later

## Changelog

### v1.0.0
- Initial release
- REST API endpoint
- Token management
- Request logging
- Category/Tag support
- Scheduled publishing
