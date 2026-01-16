# Fix: WordPress Plugin - Post Type Parameter Support

## Vấn đề

**User báo**: "Post type 'post' đăng sang 'where-to-go' không thành công"

### Root Cause

WordPress plugin **hard-coded** post type = "post" trong function `prepare_post_data()`:

```php
// ❌ BUG: Hard-coded 'post'
$post_data = [
    'post_title' => sanitize_text_field($params['title']),
    'post_content' => wp_kses_post($content),
    'post_status' => $status,
    'post_type' => 'post',  // ❌ ALWAYS 'post'
    'post_author' => get_current_user_id() ?: 1,
];
```

**Kết quả**: 
- Backend gửi `post_type: 'where-to-go'` 
- Plugin IGNORE và luôn tạo post type 'post'
- Bài không xuất hiện trong post type 'where-to-go'

## Giải pháp

### Updated Code

**File**: `lisa-content-app-plugin/includes/class-api-handler.php`  
**Function**: `prepare_post_data()`  
**Line**: ~700-715

```php
// ✅ FIX: Get post_type from request params
private static function prepare_post_data($params) {
    $status = !empty($params['status']) ? sanitize_text_field($params['status']) : 'draft';
    
    // Ensure status is valid
    $allowed_status = ['draft', 'pending', 'publish'];
    if (!in_array($status, $allowed_status)) {
        $status = 'draft';
    }
    
    // Extract and clean content
    $content = isset($params['content']) ? $params['content'] : '';
    $content = self::extract_content_without_metadata($content);
    
    // Set post slug from permalink if provided
    $post_name = '';
    if (!empty($params['permalink'])) {
        $post_name = sanitize_title($params['permalink']);
    }
    
    // ✅ Get post type from params, default to 'post'
    $post_type = !empty($params['post_type']) ? sanitize_text_field($params['post_type']) : 'post';
    
    // ✅ Validate post type exists
    if (!post_type_exists($post_type)) {
        error_log("⚠️  Invalid post type '{$post_type}', defaulting to 'post'");
        $post_type = 'post';
    }
    
    $post_data = [
        'post_title' => sanitize_text_field($params['title']),
        'post_content' => wp_kses_post($content),
        'post_excerpt' => !empty($params['excerpt']) ? sanitize_text_field($params['excerpt']) : '',
        'post_status' => $status,
        'post_type' => $post_type,  // ✅ Use dynamic post_type
        'post_author' => get_current_user_id() ?: 1,
    ];
    
    // Add post slug/name if provided
    if (!empty($post_name)) {
        $post_data['post_name'] = $post_name;
    }
    
    return $post_data;
}
```

### Key Changes

1. **Extract post_type from request**:
   ```php
   $post_type = !empty($params['post_type']) ? sanitize_text_field($params['post_type']) : 'post';
   ```

2. **Validate post type exists**:
   ```php
   if (!post_type_exists($post_type)) {
       error_log("⚠️  Invalid post type '{$post_type}', defaulting to 'post'");
       $post_type = 'post';
   }
   ```

3. **Use dynamic post_type**:
   ```php
   'post_type' => $post_type,  // Instead of hard-coded 'post'
   ```

## Request Payload

Backend phải gửi `post_type` trong JSON payload:

### Create New Post

```json
POST /wp-json/article-writer/v1/publish

{
  "title": "My Son Sanctuary",
  "content": "<p>Content here...</p>",
  "status": "publish",
  "post_type": "where-to-go",  // ✅ Required
  "seo_title": "Visit My Son Sanctuary",
  "meta_description": "Discover ancient ruins...",
  "primary_keyword": "my son sanctuary",
  "featured_media": 123
}
```

### Update Existing Post

```json
POST /wp-json/article-writer/v1/update/560

{
  "title": "Updated Title",
  "content": "<p>Updated content...</p>",
  "status": "publish",
  "seo_title": "Updated SEO Title",
  "meta_description": "Updated description",
  "primary_keyword": "updated keyword",
  "featured_media": 456
}
```

**Note**: Update endpoint KHÔNG thay đổi post type (WordPress không cho phép). Nếu cần đổi post type, phải tạo bài mới.

## WordPress Post Types

### Default Post Types

```php
post_type_exists('post');       // ✅ true - Blog posts
post_type_exists('page');       // ✅ true - Pages
post_type_exists('attachment'); // ✅ true - Media
```

### Custom Post Types (Da Nang Chill Ride)

```php
post_type_exists('where-to-go'); // ✅ true - Custom post type
post_type_exists('invalid');     // ❌ false - Not registered
```

### Plugin Behavior

| Request post_type | Exists? | Result |
|-------------------|---------|---------|
| `"post"` | ✅ Yes | Creates "post" ✅ |
| `"where-to-go"` | ✅ Yes | Creates "where-to-go" ✅ |
| `"page"` | ✅ Yes | Creates "page" ✅ |
| `"invalid"` | ❌ No | Fallback to "post" + log warning |
| (empty) | N/A | Default to "post" |

## Testing

### Test Case 1: Create post with custom post type

```bash
curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "title": "Test Where To Go",
    "content": "<p>Test content</p>",
    "status": "publish",
    "post_type": "where-to-go",
    "seo_title": "Test SEO Title",
    "meta_description": "Test meta description",
    "primary_keyword": "test keyword"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "post_id": 888,
  "url": "https://danangchillride.com/where-to-go/test-where-to-go",
  "message": "Bài viết đã được tạo thành công"
}
```

**Verify**:
```bash
# Check post type in WordPress database
SELECT post_type FROM wp_posts WHERE ID = 888;
# Result: where-to-go ✅
```

### Test Case 2: Invalid post type fallback

```bash
curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "title": "Test Invalid Type",
    "content": "<p>Test content</p>",
    "post_type": "invalid_type"
  }'
```

**Expected**:
- WordPress log: `⚠️ Invalid post type 'invalid_type', defaulting to 'post'`
- Post created with `post_type = 'post'` ✅

### Test Case 3: Default to 'post' if not specified

```bash
curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "title": "Test Default Type",
    "content": "<p>Test content</p>"
  }'
```

**Expected**:
- Post created with `post_type = 'post'` (default) ✅

## Backend Integration

Backend đã gửi `post_type` trong request từ trước:

**File**: `server/routes/websites.ts`  
**Function**: `handlePublishArticle`

```typescript
const postData = {
  title: article.title,
  content: article.content,
  status: "publish",
  post_type: postType,  // ✅ Already sending
  seo_title: article.meta_title,
  meta_description: article.meta_description,
  primary_keyword: primary_keyword,
  featured_media: featuredMediaId,
  permalink: article.slug
};

const wpResponse = await fetch(
  `${website.url}/wp-json/article-writer/v1/publish`,
  {
    method: "POST",
    body: JSON.stringify(postData)  // ✅ Includes post_type
  }
);
```

**Before Fix**: Plugin ignored `post_type` parameter  
**After Fix**: Plugin uses `post_type` parameter ✅

## Deployment

### 1. Update WordPress Plugin

Plugin phải được upload lên WordPress server của danangchillride.com.

#### Option A: Via WordPress Admin (Recommended)

1. Zip file đã sửa:
   ```bash
   cd lisa-content-app-plugin/includes/
   zip class-api-handler.zip class-api-handler.php
   ```

2. Login WordPress admin: https://danangchillride.com/wp-admin

3. Go to: **Plugins** → **Installed Plugins** → **Lisa Content App**

4. Click **Deactivate** → Upload new file → **Activate**

#### Option B: Via FTP/SFTP

Upload file đến:
```
/path/to/wordpress/wp-content/plugins/lisa-content-app-plugin/includes/class-api-handler.php
```

#### Option C: Via SSH (if you have access)

```bash
scp -P PORT class-api-handler.php user@danangchillride-server:~/wp-content/plugins/lisa-content-app-plugin/includes/
```

### 2. Verify Plugin Updated

1. Check WordPress debug log: `/wp-content/debug.log`

2. Test publish with `post_type: "where-to-go"`:
   ```bash
   curl -X POST https://danangchillride.com/wp-json/article-writer/v1/publish \
     -H "X-Article-Writer-Token: TOKEN" \
     -d '{"title":"Test","content":"test","post_type":"where-to-go"}'
   ```

3. Check response and verify post created with correct post_type

## WordPress Debug Logs

### Before Fix

```
📨 ARTICLE WRITER API REQUEST RECEIVED
Post Type Parameter: where-to-go
[Creating post...]
✅ POST CREATION SUCCESS
Post ID: 888
Post Type: post  // ❌ Wrong! Should be 'where-to-go'
```

### After Fix

```
📨 ARTICLE WRITER API REQUEST RECEIVED
Post Type Parameter: where-to-go
✓ Post type validated: where-to-go exists
[Creating post...]
✅ POST CREATION SUCCESS
Post ID: 888
Post Type: where-to-go  // ✅ Correct!
```

## Summary

### Problem
- WordPress plugin hard-coded `post_type = 'post'`
- Ignored `post_type` parameter from backend
- Could not create custom post type posts

### Solution
- Extract `post_type` from request params
- Validate with `post_type_exists()`
- Use dynamic post_type or fallback to 'post'

### Files Changed
- `lisa-content-app-plugin/includes/class-api-handler.php`
  - Function: `prepare_post_data()`
  - Lines: ~700-715

### Deployment Required
⚠️ **Manual Upload**: Plugin file must be uploaded to WordPress server (danangchillride.com) via:
- WordPress Admin, or
- FTP/SFTP, or
- SSH (if available)

### Testing
✅ Create post with post_type = "post" → works  
✅ Create post with post_type = "where-to-go" → works  
✅ Create post with post_type = "page" → works  
✅ Create post with invalid post_type → fallback to "post"  
✅ Create post without post_type → default to "post"

---

**Date**: January 3, 2026  
**Status**: ✅ Fixed - Requires WordPress Plugin Upload  
**Impact**: Critical - Cannot create custom post type posts  
**Related**: FIX_POST_TYPE_CHANGE_DETECTION.md
