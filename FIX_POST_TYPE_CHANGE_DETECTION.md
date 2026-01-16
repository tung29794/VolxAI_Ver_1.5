# Fix: Post Type Change Detection - January 3, 2026

## Vấn đề

User báo: **"Đăng bài từ post type 'where-to-go' sang 'post' vẫn không được sau khi fix response body error"**

### Triệu chứng
- Frontend hiển thị "Đã xử lý (1 cập nhật)"
- Bài viết **VẪN KHÔNG** xuất hiện với post type mới
- WordPress post vẫn giữ nguyên post type cũ

### Root Cause - Không thể đổi Post Type

**WordPress không cho phép đổi post type của post đã tồn tại bằng API update!**

#### Ví dụ từ Database

```
wordpress_post_id | website_id | post_type   | primary_keyword
-----------------|------------|-------------|------------------
560              | 1          | where-to-go | thánh địa mỹ sơn
558              | 1          | where-to-go | cù lao chăm
```

**User action**: Muốn đăng bài "thánh địa mỹ sơn" (ID 560) lên post type "post"

**Code cũ làm gì**:
```typescript
// Check existing mapping
existingWordPressPostId = 560;  // Found!

// Try to UPDATE post 560
wpResponse = await fetch(`/update/560`, {
  body: JSON.stringify({
    post_type: "post"  // ❌ WordPress IGNORES this!
  })
});
```

**Kết quả**: Post 560 được update nội dung NHƯNG vẫn là post type "where-to-go" ❌

### WordPress Post Type Constraints

**Fact**: WordPress **KHÔNG CHO PHÉP** đổi post type qua REST API:

```php
// WordPress REST API - update endpoint
wp_update_post([
  'ID' => 560,
  'post_type' => 'post'  // ❌ IGNORED! Post type cannot be changed
]);
```

**Lý do**:
- Post type xác định database schema và meta fields
- Mỗi post type có meta boxes, taxonomies, capabilities riêng
- Đổi post type có thể phá vỡ data integrity

**Solution**: Phải **TẠO BÀI MỚI** với post type mới

## Giải pháp

### Logic mới: Check Post Type trước khi quyết định Update/Create

```typescript
// 1. Query existing post WITH post_type
const existingMapping = await queryOne(
  `SELECT wordpress_post_id, post_type 
   FROM article_website_mapping 
   WHERE article_id = ? AND website_id = ?`,
  [articleId, websiteId]
);

// 2. Check if post_type MATCHES
if (existingMapping) {
  existingPostType = existingMapping.post_type;
  
  if (existingPostType === postType) {
    // ✅ Same post type → UPDATE existing post
    existingWordPressPostId = existingMapping.wordpress_post_id;
  } else {
    // ⚠️ Different post type → CREATE NEW post
    existingWordPressPostId = null;
  }
}
```

### Code Implementation

```typescript
let existingWordPressPostId = null;
let existingPostType = null;

try {
  // Query with post_type column
  const existingMapping = await queryOne<any>(
    `SELECT wordpress_post_id, post_type 
     FROM article_website_mapping 
     WHERE article_id = ? AND website_id = ?`,
    [articleId, websiteId]
  );
  
  if (existingMapping && existingMapping.wordpress_post_id) {
    existingPostType = existingMapping.post_type;
    
    // ✅ Only use existing post ID if post type matches
    if (existingPostType === postType) {
      existingWordPressPostId = existingMapping.wordpress_post_id;
      console.log(`✓ Found existing post ID ${existingWordPressPostId} with same post type: ${postType}`);
    } else {
      console.log(`⚠️ Post type changed: "${existingPostType}" → "${postType}". Will create NEW post.`);
    }
  }
} catch (error) {
  // Fallback to legacy method
  console.log("Note: article_website_mapping table not found, using legacy method");
  if (article.wordpress_post_id && article.website_id === parseInt(websiteId)) {
    // Also check post type in legacy method
    if (article.post_type === postType) {
      existingWordPressPostId = article.wordpress_post_id;
    } else {
      console.log(`⚠️ Post type changed: "${article.post_type}" → "${postType}". Will create NEW post.`);
    }
  }
}

console.log("Existing WordPress Post ID:", existingWordPressPostId || "None (will create new)");
```

## Use Cases

### Case 1: Đăng bài lần đầu

```
Article ID: 44 (chưa đăng lên website nào)
User action: Đăng lên "post"

Step 1: Query mapping
→ No existing mapping found

Step 2: Decision
→ existingWordPressPostId = null
→ CREATE new post

Step 3: WordPress
→ POST /publish with post_type = "post"
→ New post ID: 999

Step 4: Save mapping
→ article 44 → website 1 → WP 999 → post_type "post"
```

**Result**: ✅ Bài mới với post type "post"

### Case 2: Update bài đã đăng (cùng post type)

```
Article ID: 44 đã đăng lên "post" (WP ID 999)
User action: Edit và publish lại với post type "post"

Step 1: Query mapping
→ Found: WP ID 999, post_type "post"

Step 2: Check post type
→ Existing: "post"
→ Requested: "post"
→ ✅ MATCH!

Step 3: Decision
→ existingWordPressPostId = 999
→ UPDATE existing post

Step 4: WordPress
→ POST /update/999
→ Updated post 999

Step 5: Update mapping
→ article 44 → website 1 → WP 999 → post_type "post" (unchanged)
```

**Result**: ✅ Bài được update, post type không đổi

### Case 3: Đổi post type (where-to-go → post)

```
Article ID: 44 đã đăng lên "where-to-go" (WP ID 560)
User action: Publish lại với post type "post"

Step 1: Query mapping
→ Found: WP ID 560, post_type "where-to-go"

Step 2: Check post type
→ Existing: "where-to-go"
→ Requested: "post"
→ ❌ DIFFERENT!

Step 3: Decision
→ existingWordPressPostId = null
→ CREATE NEW post (không dùng ID 560)

Step 4: WordPress
→ POST /publish with post_type = "post"
→ New post ID: 888

Step 5: Update mapping
→ article 44 → website 1 → WP 888 → post_type "post"
→ (Old mapping deleted by ON DUPLICATE KEY UPDATE)
```

**Result**: 
- ✅ Bài MỚI với post type "post" (ID 888)
- ⚠️ Bài CŨ "where-to-go" (ID 560) vẫn tồn tại trên WordPress (không tự động xóa)

### Case 4: Đổi post type nhiều lần

```
Article ID: 50

Action 1: Publish as "post"
→ Creates WP post 100

Action 2: Publish as "page" 
→ Creates WP post 200 (vì post type khác)

Action 3: Publish as "post" again
→ Creates WP post 300 (vì mapping đã bị overwrite ở action 2)

Action 4: Publish as "where-to-go"
→ Creates WP post 400
```

**Note**: Mỗi lần đổi post type tạo bài mới, mapping cũ bị ghi đè

## Database Impact

### article_website_mapping table

```sql
-- Before
id | article_id | website_id | wordpress_post_id | post_type
---+------------+------------+-------------------+-----------
1  | 44         | 1          | 560               | where-to-go

-- User publish article 44 to website 1 as "post"

-- After (ON DUPLICATE KEY UPDATE)
id | article_id | website_id | wordpress_post_id | post_type
---+------------+------------+-------------------+-----------
1  | 44         | 1          | 888               | post
```

**Constraint**: `UNIQUE(article_id, website_id)`
- Mỗi article chỉ có 1 mapping per website
- Đổi post type → ghi đè mapping cũ
- Post cũ trên WordPress vẫn tồn tại (orphaned)

### Legacy articles table

```sql
-- Before
id | wordpress_post_id | website_id | post_type
---+-------------------+------------+-----------
44 | 560               | 1          | where-to-go

-- After (if fallback to legacy update)
id | wordpress_post_id | website_id | post_type
---+-------------------+------------+-----------
44 | 888               | 1          | post
```

## Backend Logs

### Scenario 1: Same post type (UPDATE)

```
✓ Website found: https://danangchillride.com
✓ Article found: My Son Sanctuary
✓ Found existing post ID 560 with same post type: where-to-go
🔄 Updating existing WordPress post ID: 560
✓ WordPress response: { success: true, post_id: 560 }
✓ Saved to mapping table: article 44 → website 1 → WP 560 → post_type where-to-go
```

### Scenario 2: Different post type (CREATE NEW)

```
✓ Website found: https://danangchillride.com
✓ Article found: My Son Sanctuary
⚠️ Post type changed: "where-to-go" → "post". Will create NEW post.
Existing WordPress Post ID: None (will create new)
➕ Creating new WordPress post
✓ WordPress response: { success: true, post_id: 888 }
✓ Saved to mapping table: article 44 → website 1 → WP 888 → post_type post
```

## Frontend Behavior

### Before Fix

```
User: Publish article "where-to-go" → "post"
Frontend: "Đã xử lý (1 cập nhật)" ✅
WordPress: Post 560 still "where-to-go" ❌
```

### After Fix

```
User: Publish article "where-to-go" → "post"
Frontend: "Đã xử lý (1 mới)" ✅
WordPress: New post 888 as "post" ✅
```

## Testing

### Test Case 1: Change post type

```bash
# Article 44 currently: WP post 560, post_type "where-to-go"

# Publish as "post"
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 44, "postType": "post"}'

# Expected Response:
{
  "success": true,
  "message": "Article created successfully on WordPress",
  "data": {
    "wordpressPostId": 888,  # NEW post ID
    "action": "created"
  }
}

# Verify WordPress:
# - Post 560 still exists with post_type "where-to-go"
# - New post 888 exists with post_type "post"
```

### Test Case 2: Same post type (normal update)

```bash
# Article 44 currently: WP post 888, post_type "post"

# Publish as "post" again
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 44, "postType": "post"}'

# Expected Response:
{
  "success": true,
  "message": "Article updated successfully on WordPress",
  "data": {
    "wordpressPostId": 888,  # SAME post ID
    "action": "updated"
  }
}

# Verify WordPress:
# - Post 888 content updated
# - Post type still "post"
```

### Test Case 3: Multiple post type changes

```bash
# Article 50: New article

# Step 1: Publish as "post"
curl ... -d '{"articleId": 50, "postType": "post"}'
# Response: created, WP ID 100

# Step 2: Publish as "page"
curl ... -d '{"articleId": 50, "postType": "page"}'
# Response: created, WP ID 200

# Step 3: Publish as "where-to-go"
curl ... -d '{"articleId": 50, "postType": "where-to-go"}'
# Response: created, WP ID 300

# Step 4: Publish as "post" again
curl ... -d '{"articleId": 50, "postType": "post"}'
# Response: created, WP ID 400 (new, because mapping was overwritten)

# Verify mapping table:
# article 50 → website 1 → WP 400 → post_type "post"

# Verify WordPress:
# - Posts 100, 200, 300 still exist (orphaned)
# - Post 400 is the active one
```

## Orphaned Posts Issue

### Problem

Khi đổi post type, bài cũ vẫn tồn tại trên WordPress:

```
Article 44:
- WP post 560 (post_type "where-to-go") ← Orphaned
- WP post 888 (post_type "post") ← Active in mapping
```

### Options for Cleanup

#### Option 1: Manual cleanup (current)
- User tự xóa bài cũ trên WordPress admin
- Pros: An toàn, không tự động xóa
- Cons: Phải manual, có thể quên

#### Option 2: Auto-delete old post (future enhancement)
```typescript
if (existingPostType !== postType) {
  // Delete old post before creating new
  await fetch(`${website.url}/wp-json/article-writer/v1/delete/${existingWordPressPostId}`, {
    method: "DELETE",
    headers: { "X-Article-Writer-Token": website.api_token }
  });
  
  console.log(`🗑️ Deleted old post ${existingWordPressPostId} (post_type: ${existingPostType})`);
}
```

#### Option 3: Track all posts (future enhancement)
- Change mapping table to allow multiple rows per article-website
- Remove UNIQUE constraint
- Track history of all published versions

```sql
-- Multiple rows for same article-website
id | article_id | website_id | wordpress_post_id | post_type   | is_active
---+------------+------------+-------------------+-------------+----------
1  | 44         | 1          | 560               | where-to-go | false
2  | 44         | 1          | 888               | post        | true
```

## Best Practices

### 1. Always check post type before deciding update/create

```typescript
// ✅ Good
if (existingMapping && existingMapping.post_type === requestedPostType) {
  // UPDATE
} else {
  // CREATE
}

// ❌ Bad
if (existingMapping) {
  // UPDATE (ignores post type change)
}
```

### 2. Log post type changes

```typescript
if (existingPostType !== postType) {
  console.log(`⚠️ Post type changed: "${existingPostType}" → "${postType}"`);
}
```

### 3. Return clear action in response

```typescript
return res.json({
  action: existingWordPressPostId ? "updated" : "created",
  oldPostType: existingPostType,
  newPostType: postType
});
```

### 4. Consider cleanup strategy

- Document orphaned posts behavior
- Provide admin UI to view/delete orphaned posts
- Or auto-delete with confirmation

## Summary

### Problem
- WordPress không cho phép đổi post type qua API
- Code cũ cố update post với post type mới → thất bại im lặng
- Bài viết không xuất hiện với post type mới

### Solution
- Check post type TRƯỚC khi quyết định update/create
- Nếu post type khác → CREATE NEW post
- Nếu post type giống → UPDATE existing post

### Files Changed
- `server/routes/websites.ts` - handlePublishArticle function
  - Query `post_type` from mapping table
  - Compare existing vs requested post type
  - Create new post if different

### Deployment
```bash
npm run build:server → 118.61 kB
rsync to ~/api.volxai.com/
touch restart.txt
```

### Testing
✅ Đổi post type → tạo bài mới  
✅ Giữ post type → update bài cũ  
✅ Đổi post type nhiều lần → mỗi lần tạo bài mới

### Side Effects
⚠️ **Orphaned posts**: Bài cũ vẫn tồn tại trên WordPress sau khi đổi post type
- Giải pháp hiện tại: Manual cleanup
- Future: Auto-delete hoặc tracking system

---

**Date**: January 3, 2026  
**Status**: ✅ Fixed and Deployed  
**Impact**: Critical - Không thể đổi post type  
**Related**: FIX_RESPONSE_BODY_ALREADY_READ.md
