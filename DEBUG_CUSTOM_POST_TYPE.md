# 🔍 Debug Guide: Custom Post Type không đăng được

## Vấn đề hiện tại
- Frontend báo "Đăng thành công"
- Bài viết KHÔNG xuất hiện trên WordPress
- Cần debug từng layer để tìm vấn đề

## Debug Step by Step

### Step 1: Kiểm tra Frontend có gửi đúng không

**A. Mở Browser DevTools**
1. Vào https://volxai.com/account
2. F12 → Network tab
3. Filter: `publish`
4. Chọn bài viết + website + custom post type
5. Click "Đăng lên Website"

**B. Kiểm tra Request**
```
POST https://api.volxai.com/api/websites/1/publish

Payload:
{
  "articleId": 123,
  "postType": "tour",  // ✅ Check: Có field này không?
  "taxonomies": {      // ✅ Check: Có taxonomies không?
    "category": 5
  }
}
```

**C. Kiểm tra Response**
```json
{
  "success": true,
  "data": {
    "wordpressPostId": 456,
    "wordpressUrl": "https://...",
    "action": "created"  // or "updated"
  }
}
```

### Step 2: Kiểm tra Backend có forward đúng không

**SSH vào server:**
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/api.volxai.com
```

**Kiểm tra logs:**
```bash
# Check if file node-build.mjs is updated
ls -lh node-build.mjs
stat node-build.mjs

# Check restart file
ls -la tmp/restart.txt

# Find log files
find . -name "*.log" -o -name "*log*" 2>/dev/null
```

**Manual test backend code:**
```bash
# Check if post_type is in the code
grep -n "post_type" node-build.mjs | head -20
```

### Step 3: Kiểm tra WordPress có nhận được không

**A. Enable WordPress Debug Mode**

Edit `wp-config.php` on danangchillride.com:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

**B. Check WordPress logs:**
```bash
# Find WordPress installation
find ~ -name "wp-config.php" 2>/dev/null

# Common locations:
# ~/public_html/danangchillride.com/
# ~/domains/danangchillride.com/public_html/
# ~/www/danangchillride.com/

# Check debug.log
tail -f ~/path/to/wordpress/wp-content/debug.log
```

**C. Look for these logs:**
```
📨 ARTICLE WRITER API REQUEST RECEIVED
├─ post_type: ✓ YES: tour
```

### Step 4: Test WordPress API trực tiếp

**A. Lấy API Token từ WordPress Admin**
1. Login WordPress admin
2. Article Writer → API Tokens
3. Copy token

**B. Test với curl:**
```bash
# Test 1: Default post type
curl -X POST "https://danangchillride.com/wp-json/article-writer/v1/publish" \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "title": "Test - Default Post Type",
    "content": "Testing default post type",
    "status": "draft",
    "post_type": "post"
  }'

# Test 2: Custom post type
curl -X POST "https://danangchillride.com/wp-json/article-writer/v1/publish" \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN" \
  -d '{
    "title": "Test - Custom Tour Type",
    "content": "Testing tour post type",
    "status": "draft",
    "post_type": "tour"
  }'

# Expected response:
{
  "success": true,
  "post_id": 123,
  "post_url": "https://...",
  "message": "Bài viết đã được đăng thành công"
}
```

**C. Verify trong WordPress:**
```
WordPress Admin → Tours (custom post type menu)
→ Should see "Test - Custom Tour Type" in Drafts
```

## Các vấn đề có thể gặp

### Problem 1: Backend chưa restart
**Symptoms:**
- Request vẫn gửi nhưng không có `post_type`
- Logs không thấy `post_type`

**Solution:**
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
touch ~/api.volxai.com/tmp/restart.txt
# Wait 20-30 seconds
```

### Problem 2: WordPress plugin chưa update
**Symptoms:**
- Backend logs show `post_type` sent
- WordPress logs không thấy `post_type`

**Solution:**
```bash
# Upload updated plugin file
scp -P PORT lisa-content-app-plugin/includes/class-api-handler.php \
  user@host:~/path/to/wordpress/wp-content/plugins/article-writer-publisher/includes/
```

### Problem 3: Post type không tồn tại
**Symptoms:**
- WordPress logs show: "Invalid post type 'xxx', defaulting to 'post'"

**Solution:**
```php
// Check available post types in WordPress
add_action('init', function() {
    error_log('Available post types: ' . print_r(get_post_types(['public' => true]), true));
});
```

### Problem 4: Permission issues
**Symptoms:**
- Error: "Sorry, you are not allowed to create posts"

**Solution:**
```php
// Check current user in plugin
error_log('Current user: ' . get_current_user_id());
error_log('Can create post: ' . (current_user_can('publish_posts') ? 'YES' : 'NO'));
```

## Checklist để verify

### Frontend (volxai.com)
- [ ] DevTools Network tab shows `postType` in request body
- [ ] Response is 200 OK with `success: true`
- [ ] `wordpressPostId` is returned

### Backend (api.volxai.com)  
- [ ] File `node-build.mjs` updated (check file timestamp)
- [ ] File includes `post_type: postType` in code
- [ ] Backend restarted (restart.txt touched)
- [ ] Console logs show `post_type` being sent

### WordPress (danangchillride.com)
- [ ] Plugin file updated
- [ ] WP_DEBUG enabled
- [ ] debug.log shows incoming requests
- [ ] debug.log shows `post_type` parameter
- [ ] Post created with correct post type

## Quick Test Commands

```bash
# 1. Check backend file is updated
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "ls -lh ~/api.volxai.com/node-build.mjs && \
   grep -c 'post_type.*postType' ~/api.volxai.com/node-build.mjs"

# 2. Test API endpoint
curl -I "https://api.volxai.com/api/websites/1/taxonomies?post_type=post"

# 3. Check WordPress response
curl -I "https://danangchillride.com/wp-json/article-writer/v1/post-types"
```

## Files to check/update

1. ✅ `server/routes/websites.ts` (Line ~700)
   ```typescript
   post_type: postType, // Must be here
   ```

2. ✅ `lisa-content-app-plugin/includes/class-api-handler.php`
   - Line ~140: Logging post_type
   - Line ~820: Using post_type in prepare_post_data

3. ✅ `client/components/UserArticles.tsx`
   - Line ~320: handleBulkPublish sends postType

## Expected Full Flow

```
User clicks "Đăng lên Website"
  ↓
Frontend: POST /api/websites/1/publish
  body: { articleId: 123, postType: "tour", taxonomies: {...} }
  ↓
Backend: Receives request
  - Logs: "Post Type: tour"
  - Adds to postData: post_type: "tour"
  - Forwards to WordPress
  ↓
WordPress: POST /wp-json/article-writer/v1/publish  
  body: { title: "...", post_type: "tour", ... }
  ↓
Plugin: handle_publish_request
  - Logs: "post_type: ✓ YES: tour"
  - Calls prepare_post_data
  - Creates post with post_type = "tour"
  ↓
WordPress: wp_insert_post(['post_type' => 'tour'])
  ↓
✅ Post created in "Tours" custom post type
```

## Next Steps

1. Follow Step 1-4 above
2. Find where the flow breaks
3. Report back with:
   - Which step failed?
   - Error messages seen?
   - Screenshots of Network tab / logs
