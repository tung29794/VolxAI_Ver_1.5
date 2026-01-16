# Keywords & SPA Path Fix - January 3, 2026

## Vấn đề

1. **Keywords không được sử dụng**: Backend đang dùng `primary_keyword` (column không tồn tại) thay vì `keywords` (JSON array)
2. **Frontend path sai**: Backend tìm SPA ở `/home/jybcaorr/spa/` thay vì `/home/jybcaorr/public_html/`

## Giải pháp

### 1. Sử dụng Keywords từ JSON Array

**File**: `server/routes/websites.ts` - `handlePublishArticle()`

#### Trước:
```typescript
primary_keyword: Array.isArray(article.keywords) && article.keywords.length > 0 
  ? article.keywords[0] 
  : '',
```

#### Sau:
```typescript
// Parse keywords from JSON if needed
let keywords: string[] = [];
if (article.keywords) {
  if (typeof article.keywords === 'string') {
    try {
      keywords = JSON.parse(article.keywords);
    } catch (e) {
      console.warn("Failed to parse keywords JSON:", e);
      keywords = [];
    }
  } else if (Array.isArray(article.keywords)) {
    keywords = article.keywords;
  }
}

console.log("Parsed keywords:", keywords);

// Prepare post data for WordPress
const postData: any = {
  title: article.title,
  content: article.content,
  status: article.status === 'published' ? 'publish' : 'draft',
  seo_title: article.meta_title || article.title,
  meta_description: article.meta_description || '',
  primary_keyword: keywords.length > 0 ? keywords[0] : '',
  permalink: article.slug || '',
};
```

**Logic**:
- Kiểm tra nếu `article.keywords` là string → Parse JSON
- Nếu đã là array → Sử dụng trực tiếp
- Lấy keyword đầu tiên `keywords[0]` làm primary_keyword cho WordPress
- Log để debug

### 2. Sửa Frontend Path

**File**: `server/node-build.ts`

#### Trước:
```typescript
const distPath = path.join(__dirname, "../spa");
```

#### Sau:
```typescript
// Use environment variable for SPA path, or fallback to relative path for development
const distPath = process.env.SPA_PATH || path.join(__dirname, "../spa");

console.log("📁 Serving SPA from:", distPath);
```

**Environment Variable**: `SPA_PATH=/home/jybcaorr/public_html`

### 3. Cập nhật .env trên Production

**File**: `~/api.volxai.com/.env`

Thêm dòng:
```bash
SPA_PATH=/home/jybcaorr/public_html
```

## Database Schema

### Table: articles

Column `keywords`:
```sql
keywords LONGTEXT NULL  -- Stored as JSON array: ["keyword1", "keyword2", "keyword3"]
```

**Ví dụ data**:
```json
["du lịch đà nẵng", "chill", "phượt biển"]
```

**Khi publish lên WordPress**:
- Primary keyword = `keywords[0]` = "du lịch đà nẵng"

## Deployment

### 1. Build Backend
```bash
npm run build:server
```

### 2. Deploy Backend
```bash
rsync -avz -e "ssh -p 2210" \
  dist/server/node-build.mjs \
  jybcaorr@103.221.221.67:~/api.volxai.com/
```

### 3. Update Environment Variables
```bash
ssh -p 2210 jybcaorr@103.221.221.67 \
  "echo 'SPA_PATH=/home/jybcaorr/public_html' >> ~/api.volxai.com/.env"
```

### 4. Restart Server
```bash
ssh -p 2210 jybcaorr@103.221.221.67 \
  "touch ~/api.volxai.com/tmp/restart.txt"
```

## Testing

### 1. Check Backend Logs
```bash
ssh -p 2210 jybcaorr@103.221.221.67 \
  "tail -f ~/api.volxai.com/stderr.log"
```

Tìm log:
- ✅ "📁 Serving SPA from: /home/jybcaorr/public_html"
- ✅ "Parsed keywords: ['keyword1', 'keyword2']"

### 2. Test Publish Article

**Request**:
```bash
POST https://api.volxai.com/api/websites/1/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "articleId": 123,
  "postType": "post"
}
```

**Expected Behavior**:
1. Backend lấy article từ database
2. Parse `keywords` từ JSON string → array
3. Lấy `keywords[0]` làm `primary_keyword`
4. Gửi lên WordPress với field `primary_keyword`

**WordPress API nhận**:
```json
{
  "title": "Article Title",
  "content": "...",
  "primary_keyword": "keyword từ keywords[0]",
  "seo_title": "...",
  "meta_description": "..."
}
```

### 3. Test Frontend Serving

**Before Fix**:
```
Error: ENOENT: no such file or directory, stat '/home/jybcaorr/spa/index.html'
```

**After Fix**:
```
✅ Serving SPA from: /home/jybcaorr/public_html
✅ Frontend accessible at https://volxai.com
```

## Files Changed

### Backend
- ✅ `server/routes/websites.ts` - Parse keywords from JSON
- ✅ `server/node-build.ts` - Use SPA_PATH environment variable

### Environment
- ✅ `~/api.volxai.com/.env` - Added SPA_PATH

## Benefits

### 1. No Database Migration Needed
- Không cần tạo column `primary_keyword`
- Không cần migrate data
- Sử dụng data có sẵn trong `keywords`

### 2. Flexible Keywords
- `keywords` column là JSON array
- Có thể chứa nhiều keywords
- Frontend có thể hiển thị tất cả keywords
- Backend lấy keyword đầu tiên để publish

### 3. Correct Frontend Path
- Backend serve frontend từ đúng location
- Không còn lỗi ENOENT
- Production và development dùng config khác nhau

## Example Data Flow

### Article trong Database:
```json
{
  "id": 41,
  "title": "Cung đường Hải Vân",
  "keywords": "[\"du lịch đà nẵng\",\"chill\",\"phượt biển\"]",
  "content": "...",
  "website_id": 1,
  "wordpress_post_id": null
}
```

### Backend Parse:
```typescript
keywords = JSON.parse(article.keywords)
// Result: ["du lịch đà nẵng", "chill", "phượt biển"]

primary_keyword = keywords[0]
// Result: "du lịch đà nẵng"
```

### Send to WordPress:
```json
{
  "title": "Cung đường Hải Vân",
  "content": "...",
  "primary_keyword": "du lịch đà nẵng",
  "status": "publish"
}
```

### WordPress Plugin Process:
```php
$primary_keyword = $params['primary_keyword']; // "du lịch đà nẵng"
update_post_meta($post_id, 'rank_math_focus_keyword', $primary_keyword);
```

## Verification

### Check Keywords Parsing
```bash
# Publish một bài viết có keywords
# Check log để thấy:
Parsed keywords: ["du lịch đà nẵng", "chill", "phượt biển"]
✓ Saved rank_math_focus_keyword: du lịch đà nẵng
```

### Check SPA Path
```bash
# Restart server và check log:
📁 Serving SPA from: /home/jybcaorr/public_html
🚀 VolxAI Server running on port 3000
```

## Summary

✅ **Keywords**: Backend parse từ JSON và dùng keyword đầu tiên  
✅ **Frontend Path**: Dùng environment variable `SPA_PATH`  
✅ **No Migration**: Không cần alter database  
✅ **Deployed**: Backend đã update và restart thành công

---

**Date**: January 3, 2026  
**Status**: ✅ Completed and Deployed  
**Next**: Test bulk publish functionality
