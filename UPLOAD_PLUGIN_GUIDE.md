# Hướng Dẫn Upload Plugin WordPress - Da Nang Chill Ride

## ⚠️ Quan trọng

WordPress plugin đã được sửa để hỗ trợ tham số `post_type` động. **Bạn cần upload file này lên WordPress server** của website danangchillride.com.

## File cần upload

✅ **File đã tạo**: `lisa-content-app-plugin-fixed.zip` (57 KB)

Hoặc chỉ upload file đã sửa:
- `lisa-content-app-plugin/includes/class-api-handler.php`

## Phương pháp 1: Upload qua WordPress Admin (Khuyến nghị)

### Bước 1: Đăng nhập WordPress Admin

1. Mở trình duyệt: https://danangchillride.com/wp-admin
2. Đăng nhập với tài khoản admin

### Bước 2: Vô hiệu hóa plugin hiện tại

1. Vào: **Plugins** → **Installed Plugins**
2. Tìm plugin: **Lisa Content App** hoặc **Article Writer Publisher**
3. Click **Deactivate**

### Bước 3: Xóa plugin cũ (Optional)

1. Sau khi deactivate, click **Delete**
2. Xác nhận xóa

### Bước 4: Upload plugin mới

#### Nếu đã xóa plugin cũ:
1. Click **Add New Plugin** → **Upload Plugin**
2. Chọn file `lisa-content-app-plugin-fixed.zip`
3. Click **Install Now**
4. Click **Activate Plugin**

#### Nếu không xóa plugin cũ:
1. Dùng FTP/File Manager để thay thế file
2. Đường dẫn: `wp-content/plugins/lisa-content-app-plugin/includes/class-api-handler.php`
3. Upload file mới ghi đè file cũ
4. Quay lại Plugins → **Activate** plugin

### Bước 5: Kiểm tra

1. Vào: **Settings** → **Article Writer API**
2. Kiểm tra plugin đang active
3. Copy API Token (cần để test)

## Phương pháp 2: Upload qua cPanel File Manager

### Bước 1: Đăng nhập cPanel

1. Vào: https://danangchillride.com/cpanel hoặc cPanel URL của hosting
2. Đăng nhập

### Bước 2: Mở File Manager

1. Tìm **File Manager** trong cPanel
2. Click để mở

### Bước 3: Navigate đến thư mục plugin

1. Vào: `public_html/wp-content/plugins/`
2. Tìm thư mục: `lisa-content-app-plugin` hoặc `article-writer-publisher`
3. Vào thư mục: `includes/`

### Bước 4: Upload file mới

1. Click **Upload** ở thanh công cụ
2. Chọn file: `class-api-handler.php` từ local
3. Click **Upload**
4. Xác nhận ghi đè file cũ

### Bước 5: Verify

1. Kiểm tra file đã được upload
2. File size phải khác với file cũ
3. Check timestamp update

## Phương pháp 3: Upload qua FTP/SFTP

### Bước 1: Kết nối FTP

Dùng FileZilla hoặc FTP client:
```
Host: ftp.danangchillride.com (hoặc IP hosting)
Username: [FTP username]
Password: [FTP password]
Port: 21 (FTP) hoặc 22 (SFTP)
```

### Bước 2: Navigate đến thư mục plugin

```
/public_html/wp-content/plugins/lisa-content-app-plugin/includes/
```

### Bước 3: Upload file

1. Drag & drop file `class-api-handler.php` vào thư mục
2. Chọn **Overwrite** khi có popup xác nhận
3. Đợi upload hoàn tất

## Phương pháp 4: Upload qua SSH (Advanced)

**Yêu cầu**: Có SSH access vào WordPress server

### Bước 1: SCP upload file

```bash
# Từ máy local
scp -P [SSH_PORT] lisa-content-app-plugin/includes/class-api-handler.php \
  [SSH_USER]@[SERVER_IP]:~/wp-content/plugins/lisa-content-app-plugin/includes/
```

Thay thế:
- `[SSH_PORT]`: Port SSH (thường là 22)
- `[SSH_USER]`: Username SSH
- `[SERVER_IP]`: IP hoặc domain của server

### Bước 2: SSH vào server và verify

```bash
ssh -p [SSH_PORT] [SSH_USER]@[SERVER_IP]

# Check file
ls -lh wp-content/plugins/lisa-content-app-plugin/includes/class-api-handler.php

# Check permissions
chmod 644 wp-content/plugins/lisa-content-app-plugin/includes/class-api-handler.php
```

## Test sau khi upload

### Test 1: Check plugin active

1. WordPress Admin → Plugins
2. Verify **Lisa Content App** đang **Active**
3. Không có error messages

### Test 2: Test API với post type "where-to-go"

```bash
curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Where To Go",
    "content": "<p>This is a test article for where-to-go post type</p>",
    "status": "publish",
    "post_type": "where-to-go",
    "seo_title": "Test SEO Title",
    "meta_description": "Test meta description",
    "primary_keyword": "test keyword"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "post_id": 999,
  "url": "https://danangchillride.com/where-to-go/test-where-to-go",
  "message": "Bài viết đã được tạo thành công"
}
```

### Test 3: Verify trên WordPress

1. Login WordPress Admin
2. Vào: **Where To Go** menu (custom post type)
3. Kiểm tra bài "Test Where To Go" xuất hiện
4. Click vào bài → Verify nội dung đúng

### Test 4: Verify post type trong database

```sql
SELECT ID, post_title, post_type 
FROM wp_posts 
WHERE post_title = 'Test Where To Go';

-- Expected result:
-- ID   | post_title         | post_type
-- 999  | Test Where To Go   | where-to-go  ✅
```

### Test 5: Test với post type "post"

```bash
curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Regular Post",
    "content": "<p>This is a regular post</p>",
    "status": "publish",
    "post_type": "post"
  }'
```

Verify bài xuất hiện trong **Posts** → **All Posts**

## Check WordPress Debug Log

Sau khi test, check log để xem có warning/error không:

**File**: `wp-content/debug.log`

**Expected logs**:
```
📨 ARTICLE WRITER API REQUEST RECEIVED
Post Type Parameter: where-to-go
✓ Post type validated: where-to-go exists
✅ POST CREATION SUCCESS
Post ID: 999
Post Type: where-to-go
```

**Bad logs** (nếu plugin chưa update):
```
⚠️ Invalid post type 'where-to-go', defaulting to 'post'
```

## Troubleshooting

### Lỗi: Plugin không hoạt động sau upload

**Giải pháp**:
1. Deactivate và Activate lại plugin
2. Check file permissions: `chmod 644 class-api-handler.php`
3. Check WordPress error log

### Lỗi: "post_type 'where-to-go' không tồn tại"

**Nguyên nhân**: Custom post type chưa được register

**Giải pháp**:
1. Kiểm tra theme hoặc plugin nào register post type "where-to-go"
2. Activate plugin/theme đó
3. Hoặc thêm code register post type vào `functions.php`

### Lỗi: API trả về 401 Unauthorized

**Nguyên nhân**: Token sai hoặc hết hạn

**Giải pháp**:
1. WordPress Admin → Settings → Article Writer API
2. Generate new token
3. Update token trong database `websites` table

### Lỗi: Permission denied khi upload file

**Giải pháp**:
1. Check user có quyền upload file
2. Dùng WordPress Admin upload thay vì FTP
3. Hoặc contact hosting support

## Sau khi hoàn tất

1. ✅ Test đăng bài từ VolxAI app
2. ✅ Chọn post type "where-to-go"
3. ✅ Verify bài xuất hiện đúng post type trên WordPress
4. ✅ Test luôn post type "post" để chắc chắn không bị break

## Liên hệ

Nếu gặp vấn đề khi upload:
- Check WordPress hosting documentation
- Contact hosting support
- Hoặc thuê developer có access vào WordPress server

---

**File cần upload**: `lisa-content-app-plugin-fixed.zip` (57 KB)  
**Hoặc chỉ cần**: `class-api-handler.php`  
**Đường dẫn WordPress**: `wp-content/plugins/lisa-content-app-plugin/includes/`  
**Website**: https://danangchillride.com  
**Date**: January 3, 2026
