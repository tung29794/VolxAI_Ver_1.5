# Multi-Website Publishing Support - January 3, 2026

## Vấn đề

User không thể đăng bài viết lên nhiều website khác nhau với post type khác nhau:

**Tình huống**:
1. Đồng bộ bài viết từ Website A (post type = "where-to-go")
2. Chỉnh sửa bài viết
3. Muốn đăng lên Website B (post type = "post")
4. **Lỗi**: Không thể đăng được vì hệ thống chỉ cho phép update lại Website A

**Root Cause**:
```typescript
// Old logic - chỉ cho phép update nếu đúng website cũ
const existingWordPressPostId = 
  article.wordpress_post_id && article.website_id === parseInt(websiteId)
    ? article.wordpress_post_id
    : null;
```

## Giải pháp

### 1. Tạo bảng mapping nhiều-nhiều

**Table**: `article_website_mapping`

```sql
CREATE TABLE article_website_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  website_id INT NOT NULL,
  wordpress_post_id INT NOT NULL,
  post_type VARCHAR(50) DEFAULT 'post',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_article_website (article_id, website_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);
```

**Lợi ích**:
- Một bài viết có thể đăng lên nhiều website
- Mỗi website có thể có post type khác nhau
- Track được WordPress post ID cho từng website
- Update đúng post khi re-publish

### 2. Cập nhật Backend Logic

#### Check existing post per website
```typescript
// Check if article already published to THIS specific website
let existingWordPressPostId = null;

try {
  const existingMapping = await queryOne<any>(
    `SELECT wordpress_post_id 
     FROM article_website_mapping 
     WHERE article_id = ? AND website_id = ?`,
    [articleId, websiteId]
  );
  
  if (existingMapping && existingMapping.wordpress_post_id) {
    existingWordPressPostId = existingMapping.wordpress_post_id;
  }
} catch (error) {
  // Fallback to old method if table doesn't exist
  if (article.wordpress_post_id && article.website_id === parseInt(websiteId)) {
    existingWordPressPostId = article.wordpress_post_id;
  }
}
```

#### Save mapping after publish
```typescript
// Save to mapping table
await execute(
  `INSERT INTO article_website_mapping 
   (article_id, website_id, wordpress_post_id, post_type, created_at, updated_at)
   VALUES (?, ?, ?, ?, NOW(), NOW())
   ON DUPLICATE KEY UPDATE 
     wordpress_post_id = ?,
     post_type = ?,
     updated_at = NOW()`,
  [articleId, websiteId, wpPostId, postType, wpPostId, postType]
);
```

### 3. Backward Compatibility

Code tự động fallback nếu bảng `article_website_mapping` chưa tồn tại:
- Dùng try-catch khi query mapping table
- Nếu lỗi → dùng logic cũ từ `articles` table
- Tương thích với cả hệ thống cũ và mới

## Use Cases

### Case 1: Đăng bài mới lên nhiều website

```
Article ID: 123 (chưa đăng lên website nào)

Step 1: Publish to Website A (post type = "post")
→ Tạo WordPress Post ID: 456
→ Mapping: article 123 → website A → WP post 456

Step 2: Publish to Website B (post type = "page") 
→ Tạo WordPress Post ID: 789
→ Mapping: article 123 → website B → WP post 789

Step 3: Publish to Website C (post type = "where-to-go")
→ Tạo WordPress Post ID: 101
→ Mapping: article 123 → website C → WP post 101
```

**Result**: Một bài viết → 3 WordPress posts trên 3 website khác nhau

### Case 2: Update bài đã đăng

```
Article ID: 123 đã đăng lên Website A (WP post 456)

User edit article và publish lại:

Option 1: Publish to Website A
→ Check mapping → Found WP post 456
→ UPDATE existing post 456
→ Action: "updated"

Option 2: Publish to Website B (lần đầu)
→ Check mapping → Not found
→ CREATE new post → WP post 789
→ Action: "created"
```

### Case 3: Đồng bộ từ WordPress rồi đăng sang website khác

```
Article ID: 50 (synced from Website A, WP post 554)

Original:
- website_id = 1 (Website A)
- wordpress_post_id = 554
- post_type = "post"

Step 1: Edit article
Step 2: Publish to Website B (post type = "page")

Before Fix: ❌ Không thể đăng vì website_id != 2
After Fix: ✅ Tạo mới trên Website B → WP post 888

Mappings:
- article 50 → website A → WP post 554 (from sync)
- article 50 → website B → WP post 888 (manual publish)
```

## Database Schema

### article_website_mapping

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| article_id | INT | FK to articles.id |
| website_id | INT | FK to websites.id |
| wordpress_post_id | INT | WordPress post ID |
| post_type | VARCHAR(50) | Post type (post/page/custom) |
| created_at | TIMESTAMP | First publish time |
| updated_at | TIMESTAMP | Last update time |

**Constraints**:
- UNIQUE(article_id, website_id) - Mỗi bài chỉ có 1 post per website
- CASCADE DELETE - Xóa article/website → xóa mapping

### Example Data

```sql
+----+------------+------------+-------------------+-----------+
| id | article_id | website_id | wordpress_post_id | post_type |
+----+------------+------------+-------------------+-----------+
|  1 |         50 |          1 |               554 | post      |
|  2 |         49 |          1 |               555 | where-to-go|
|  3 |         50 |          2 |               888 | page      |
|  4 |         48 |          1 |               556 | post      |
|  5 |         48 |          3 |               999 | post      |
+----+------------+------------+-------------------+-----------+
```

**Giải thích**:
- Article 50: Đăng lên 2 websites (ID 1 và 2) với post type khác nhau
- Article 49: Chỉ đăng lên website 1
- Article 48: Đăng lên 2 websites (ID 1 và 3) cùng post type

## Migration

### Create Table & Migrate Data

```sql
-- Create table
CREATE TABLE IF NOT EXISTS article_website_mapping (...);

-- Migrate existing data from articles table
INSERT IGNORE INTO article_website_mapping 
  (article_id, website_id, wordpress_post_id, post_type)
SELECT 
  id, website_id, wordpress_post_id, COALESCE(post_type, 'post')
FROM articles
WHERE website_id IS NOT NULL AND wordpress_post_id IS NOT NULL;
```

**Run Migration**:
```bash
mysql -u user -p database < create_article_website_mapping.sql
```

## API Behavior

### POST /api/websites/:websiteId/publish

**Request**:
```json
{
  "articleId": 123,
  "postType": "page"
}
```

**Logic Flow**:
1. Get article from database
2. Check `article_website_mapping` for existing post on this website
3. If found → UPDATE WordPress post
4. If not found → CREATE new WordPress post
5. Save/update mapping in `article_website_mapping`

**Response (New Post)**:
```json
{
  "success": true,
  "message": "Article created successfully on WordPress",
  "data": {
    "articleId": 123,
    "wordpressPostId": 789,
    "wordpressUrl": "https://example.com/page/title",
    "action": "created"
  }
}
```

**Response (Updated Post)**:
```json
{
  "success": true,
  "message": "Article updated successfully on WordPress",
  "data": {
    "articleId": 123,
    "wordpressPostId": 456,
    "wordpressUrl": "https://example.com/post/title",
    "action": "updated"
  }
}
```

## Frontend Impact

**No changes needed!** Frontend logic vẫn giữ nguyên:
- User chọn website và post type
- Click "Đăng lên Website"
- Backend tự động handle logic create/update

**User Experience**:
1. Đăng bài lần đầu lên Website A → Toast: "Đã xử lý (1 mới)"
2. Đăng lại lên Website A → Toast: "Đã xử lý (1 cập nhật)"
3. Đăng lên Website B → Toast: "Đã xử lý (1 mới)"
4. Đăng lên Website C → Toast: "Đã xử lý (1 mới)"

## Testing

### Test Case 1: New Article to Multiple Websites

```
1. Create article ID 999
2. Publish to Website A (post type = "post")
   → Expect: Created, WP post 111
3. Publish to Website B (post type = "page")
   → Expect: Created, WP post 222
4. Check mapping table:
   - article 999 → website A → WP 111
   - article 999 → website B → WP 222
```

### Test Case 2: Synced Article to Another Website

```
1. Sync article from Website A (ID 554)
   → article_id = 50, wordpress_post_id = 554, website_id = 1
2. Publish article 50 to Website B
   → Expect: Created new post on B (not update A)
   → Mapping: article 50 → website B → WP post 888
3. Check Website A post 554 → Unchanged ✓
4. Check Website B post 888 → New post ✓
```

### Test Case 3: Update Existing Post

```
1. Article 48 already on Website A (WP post 556)
2. Edit article 48
3. Publish to Website A again
   → Expect: Updated WP post 556
   → Action: "updated"
4. Publish to Website C (first time)
   → Expect: Created WP post 999
   → Action: "created"
```

## Benefits

### 1. Flexibility
- Đăng một bài lên nhiều website
- Mỗi website có post type riêng
- Không bị giới hạn bởi nguồn đồng bộ

### 2. Data Integrity
- Unique constraint ngăn duplicate mapping
- Foreign keys đảm bảo consistency
- Cascade delete tự động cleanup

### 3. Performance
- Indexed columns cho query nhanh
- Chỉ query mapping khi cần
- Fallback logic không ảnh hưởng performance

### 4. Backward Compatible
- Hệ thống cũ vẫn hoạt động
- Tự động fallback nếu chưa migrate
- Zero downtime migration

## Deployment

### 1. Create Table
```bash
scp -P 2210 create_article_website_mapping.sql server:~/
ssh -p 2210 server "mysql -u user -p database < ~/create_article_website_mapping.sql"
```

### 2. Deploy Backend
```bash
npm run build:server
rsync -avz -e "ssh -p 2210" dist/server/node-build.mjs server:~/api.volxai.com/
ssh -p 2210 server "touch ~/api.volxai.com/tmp/restart.txt"
```

### 3. Verify
```bash
# Check table created
mysql> SELECT COUNT(*) FROM article_website_mapping;

# Check migration
mysql> SELECT * FROM article_website_mapping LIMIT 5;

# Test publish
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 50, "postType": "page"}'
```

## Migration Results

```
✅ Table created: article_website_mapping
✅ Data migrated: 6 articles → 6 mappings
✅ Backend deployed with new logic
✅ Backward compatibility maintained
```

**Migrated Data**:
```
id | article_id | article_title        | website_id | wordpress_post_id | post_type
---+------------+----------------------+------------+-------------------+-------------
1  | 50         | Hoi An Ancient Town  | 1          | 554               | post
2  | 49         | Ba Na Hills          | 1          | 555               | where-to-go
3  | 48         | VinWonders Nam Hoi An| 1          | 556               | post
4  | 47         | Linh Ung Pagoda      | 1          | 557               | post
5  | 46         | Cu Lao Cham Island   | 1          | 558               | where-to-go
6  | 44         | My Son Sanctuary     | 1          | 560               | where-to-go
```

## Summary

✅ **Problem**: Bài viết chỉ có thể đăng lên 1 website  
✅ **Solution**: Mapping table hỗ trợ nhiều website  
✅ **Deployed**: Backend và database đã update  
✅ **Tested**: Migration thành công với 6 bài viết  
✅ **Compatible**: Backward compatible với hệ thống cũ

**Bây giờ user có thể**:
- Đăng một bài lên nhiều website khác nhau
- Mỗi website dùng post type khác nhau
- Update bài đã đăng mà không ảnh hưởng website khác
- Đồng bộ từ website A, đăng lên website B, C, D...

---

**Date**: January 3, 2026  
**Status**: ✅ Completed and Deployed  
**Version**: 1.5.2
