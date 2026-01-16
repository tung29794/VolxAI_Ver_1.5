# Deploy Tính năng Upload Ảnh lên WordPress

## ✅ Trạng thái hiện tại

### Backend (VolxAI) - HOÀN TẤT ✅
- ✅ File `server/routes/websites.ts` đã có hàm `uploadAndReplaceImages()`
- ✅ Sử dụng method `image_url` (WordPress tự download)
- ✅ Tích hợp vào `handlePublishArticle` 
- ✅ Clean duplicate folder paths trong URL
- ✅ Build thành công (npm run build)

### WordPress Plugin - ĐÃ SẴN SÀNG ✅
- ✅ Endpoint `/wp-json/article-writer/v1/upload-image` đã có
- ✅ Nhận `image_url` và `post_title` trong JSON body
- ✅ Tự động download ảnh từ URL
- ✅ Lưu vào WordPress Media Library
- ✅ Hỗ trợ đặc biệt cho Pixabay URLs
- ✅ Có fallback nếu download thất bại

## 🚀 Hướng dẫn Deploy

### Bước 1: Deploy Backend (VolxAI)

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5

# Build đã chạy thành công rồi
# Chỉ cần upload lên server:

# Upload files lên hosting
# - dist/server/node-build.mjs
# - dist/spa/* (tất cả files trong spa)
# - package.json
# - .env

# Restart Node.js app trên server
```

### Bước 2: Kiểm tra WordPress Plugin

Plugin **KHÔNG CẦN** cập nhật vì đã có sẵn tất cả code cần thiết!

**Kiểm tra plugin đã active:**
1. Vào WordPress Admin → Plugins
2. Tìm "Article Writer Publisher" 
3. Đảm bảo đã Active

**Test endpoint:**
```bash
# Thay YOUR_SITE và YOUR_TOKEN
curl -X POST https://YOUR_SITE/wp-json/article-writer/v1/upload-image \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "image_url": "https://pixabay.com/get/test.jpg",
    "post_title": "test-article"
  }'
```

**Response mong đợi:**
```json
{
  "success": true,
  "url": "https://yoursite.com/wp-content/uploads/2026/01/test-article-abc123.jpg",
  "attachment_id": 123,
  "message": "Image uploaded successfully and registered in Media Library"
}
```

## 🧪 Test tính năng

### 1. Tạo bài viết với Auto-insert Images

1. Vào VolxAI → "AI Viết bài theo từ khóa"
2. Nhập từ khóa: `Xe Mazda, Mazda 2, Mazda 3`
3. ✅ **Bật checkbox** "Tự động tìm và chèn ảnh theo từ khoá"
4. Chọn Model AI và các tùy chọn khác
5. Click "Tạo bài viết"

### 2. Kiểm tra trong Editor

Sau khi tạo xong, bài viết sẽ có:
- ✅ Ảnh được chèn tự động (1 ảnh mỗi 3 đoạn)
- ✅ Mỗi ảnh có thuộc tính `alt` chứa từ khóa
- ✅ URL ảnh là từ SerpAPI/Pixabay (chưa upload WordPress)

Ví dụ:
```html
<img src="https://serpapi.com/searches/abc123/xyz.jpg" alt="xe mazda">
<img src="https://pixabay.com/get/def456.jpg" alt="mazda 2">
```

### 3. Đăng bài lên WordPress

1. Click button "Đăng bài" hoặc "Đăng bài lên WordPress"
2. Chọn website đích
3. Click "Publish"

### 4. Kiểm tra Console Log

Trong terminal server, bạn sẽ thấy:

```
📸 Processing images in article content...
📸 Found 5 images to upload

   📤 Uploading image 1/5: https://serpapi.com/searches/abc.jpg
   ✅ Uploaded successfully: https://yoursite.com/wp-content/uploads/2026/01/image-1.jpg
   
   📤 Uploading image 2/5: https://pixabay.com/get/def.jpg
   ✅ Uploaded successfully: https://yoursite.com/wp-content/uploads/2026/01/image-2.jpg
   
   ⏭️  Skipping image (already on WordPress): https://yoursite.com/wp-content/uploads/old.jpg
   
✅ Successfully uploaded 4/5 images
🚀 Publishing article to WordPress...
```

### 5. Kiểm tra kết quả trên WordPress

1. Vào WordPress Admin → Posts
2. Mở bài vừa đăng
3. View Source hoặc Edit để xem HTML

**Kết quả mong đợi:**
```html
<!-- TRƯỚC KHI UPLOAD -->
<img src="https://serpapi.com/searches/abc123/xyz.jpg" alt="xe mazda">
<img src="https://pixabay.com/get/def456.jpg" alt="mazda 2">

<!-- SAU KHI UPLOAD -->
<img src="https://yoursite.com/wp-content/uploads/2026/01/image-abc123.jpg" alt="xe mazda">
<img src="https://yoursite.com/wp-content/uploads/2026/01/image-def456.jpg" alt="mazda 2">
```

4. Check WordPress Media Library:
   - Vào Media → Library
   - Xem các ảnh vừa upload
   - Kiểm tra metadata (dimensions, file size, etc.)

## 🐛 Troubleshooting

### Lỗi: "Missing image_url parameter"

**Nguyên nhân:** Request không có `image_url` trong body

**Giải pháp:** 
- Kiểm tra code `uploadImageToWordPress()` trong `server/routes/websites.ts`
- Đảm bảo có: `body: JSON.stringify({ image_url: imageUrl, post_title: postTitle })`

### Lỗi: "Invalid or expired API Token"

**Nguyên nhân:** Token không đúng hoặc đã hết hạn

**Giải pháp:**
1. Vào WordPress Admin → Article Writer → API Tokens
2. Tạo token mới
3. Copy token
4. Cập nhật trong VolxAI → Quản lý Website → Edit website
5. Paste token vào trường "API Token"

### Lỗi: Ảnh không upload được (keep external URLs)

**Nguyên nhân:** WordPress không thể download ảnh từ URL

**Kiểm tra:**
1. WordPress có quyền write vào `wp-content/uploads/` không?
2. Server có thể kết nối ra ngoài internet không?
3. URL ảnh có hợp lệ không? (test bằng curl)

**Xem log:**
```bash
# Trên server WordPress
tail -f wp-content/debug.log

# Hoặc check PHP error log
tail -f /var/log/php/error.log
```

### Ảnh vẫn là link ngoài sau khi đăng

**Nguyên nhân:** 
- Function `uploadAndReplaceImages()` không được gọi
- Hoặc upload thất bại nhưng không có error

**Giải pháp:**
1. Check console log xem có message "📸 Processing images..." không
2. Kiểm tra `handlePublishArticle` có gọi `uploadAndReplaceImages` không
3. Test upload 1 ảnh riêng lẻ để xem có lỗi gì

### Duplicate folder paths (vd: /2025/12/2025/12/)

**Đã fix:** Function `cleanWordPressUrl()` sẽ tự động clean

Nếu vẫn xảy ra:
- Check regex trong `cleanWordPressUrl()`: `/\/(\d{4}\/\d{2})\/(\d{4}\/\d{2}\/)+/g`
- Test với URL cụ thể

## 📊 Monitoring

### Check upload statistics

```sql
-- Trong WordPress database
SELECT 
    COUNT(*) as total_images,
    DATE(post_date) as upload_date
FROM wp_posts 
WHERE post_type = 'attachment' 
    AND post_mime_type LIKE 'image/%'
GROUP BY DATE(post_date)
ORDER BY post_date DESC
LIMIT 30;
```

### Check VolxAI logs

```bash
# Trên server VolxAI
tail -f logs/app.log | grep "📸"
```

## 🎯 Tính năng đã hoàn thành

✅ Auto-insert images (checkbox trong form)
✅ Search 20 images per keyword từ multiple APIs
✅ Insert 1 image every 3 paragraphs
✅ Primary/secondary keyword parsing
✅ Image alt attributes với từ khóa
✅ Upload ảnh lên WordPress Media Library
✅ Replace external URLs với WordPress URLs
✅ Clean duplicate folder paths
✅ Skip ảnh đã có trên WordPress
✅ Skip data URIs
✅ Fallback nếu upload fail (giữ URL gốc)
✅ Detailed logging cho debugging

## 📝 Notes

- **Cost:** Mỗi lần search ảnh tốn 200 tokens (FIND_IMAGE_SERP)
- **Performance:** Upload ảnh có thể mất 5-10 giây với 5-10 ảnh
- **Reliability:** Plugin có fallback mechanism, không làm fail việc đăng bài
- **WordPress version:** Tested với WordPress 5.8+
- **PHP version:** Requires PHP 7.4+

---

**Last updated:** January 6, 2026
**Status:** ✅ Ready for Production
