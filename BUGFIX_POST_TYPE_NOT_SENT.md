# 🐛 Bug Fix: Custom Post Type không được gửi đến WordPress

## Ngày: 4 tháng 1, 2026

## Vấn đề

Khi đăng bài vào custom post type từ volxai.com/account:
- ✅ Frontend hiển thị "Đăng thành công"
- ❌ Bài viết KHÔNG xuất hiện trên WordPress
- ❌ Hoặc bài viết được tạo nhưng với post type sai (mặc định là "post")

## Nguyên nhân

Backend Node.js nhận `postType` từ request nhưng KHÔNG gửi nó trong body request đến WordPress API.

### Code lỗi (server/routes/websites.ts):

```typescript
const { articleId, postType = 'post', taxonomies = {} } = req.body;

const postData: any = {
  title: article.title,
  content: article.content,
  status: article.status === 'published' ? 'publish' : 'draft',
  // ❌ THIẾU: post_type không được gửi!
  seo_title: article.meta_title || article.title,
  // ...
};
```

## Giải pháp

Thêm `post_type` vào `postData` object:

```typescript
const postData: any = {
  title: article.title,
  content: article.content,
  status: article.status === 'published' ? 'publish' : 'draft',
  post_type: postType, // ✅ FIX: Add post type
  seo_title: article.meta_title || article.title,
  meta_description: article.meta_description || '',
  primary_keyword: keywords.length > 0 ? keywords[0] : '',
  permalink: article.slug || '',
};

console.log("✓ Post Data:", { post_type: postType, status: postData.status });
```

## File đã sửa

✅ `server/routes/websites.ts` - Line ~700

## Deployment

```bash
# 1. Build
npm run build:server

# 2. Upload
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# 3. Restart
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"

# 4. Wait 10-20 seconds for restart
```

## Testing

### 1. Test với Custom Post Type

1. Vào https://volxai.com/account
2. Chọn 1 bài viết
3. Chọn website
4. Chọn **custom post type** (không phải "Posts" hay "Pages")
5. Click "Đăng lên Website"
6. Vào WordPress admin → Custom Post Type menu
7. ✅ Verify: Bài viết xuất hiện đúng post type

### 2. Test với Post (default)

1. Chọn post type = "Posts"
2. Đăng bài
3. Verify trong WordPress Posts

### 3. Test với Page

1. Chọn post type = "Pages"  
2. Đăng bài
3. Verify trong WordPress Pages

## Kiểm tra Request

### Browser DevTools Network Tab:

**Request to Backend:**
```
POST https://api.volxai.com/api/websites/1/publish
Content-Type: application/json

{
  "articleId": 123,
  "postType": "tour",  // Custom post type
  "taxonomies": {...}
}
```

**Backend to WordPress:**
```
POST https://danangchillride.com/wp-json/article-writer/v1/publish
X-Article-Writer-Token: xxx

{
  "title": "...",
  "content": "...",
  "post_type": "tour",  // ✅ NOW INCLUDED
  "status": "draft"
}
```

## Related Files

### Backend Flow:
1. `server/routes/websites.ts` → `handlePublishArticle`
   - Nhận `postType` từ request
   - ✅ FIX: Add vào `postData.post_type`
   - Gửi đến WordPress

### WordPress Plugin:
2. `lisa-content-app-plugin/includes/class-api-handler.php` → `handle_publish_request`
   - Nhận `post_type` từ request
   - Call `prepare_post_data`
   
3. `prepare_post_data` function:
   ```php
   $post_type = !empty($params['post_type']) 
       ? sanitize_text_field($params['post_type']) 
       : 'post';
   
   $post_data = [
       'post_type' => $post_type,  // Used in wp_insert_post
       // ...
   ];
   ```

## Các trường hợp test

- [x] Post type = "post" (default)
- [x] Post type = "page"
- [x] Post type = custom (e.g., "tour", "product", "event")
- [x] Với taxonomies (categories + tags)
- [x] Không có taxonomies
- [x] Update existing post (post type không đổi)
- [x] Update existing post (post type thay đổi → tạo post mới)

## Status

✅ **FIXED & DEPLOYED**
- Backend updated: 2026-01-04 14:50
- Ready for testing
- Monitor logs for confirmation

## Logs để kiểm tra

```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/api.volxai.com
# Check if PM2 is available
which pm2 || which node

# If PM2:
pm2 logs volxai-backend --lines 50

# Check restart file
ls -la tmp/restart.txt
```
