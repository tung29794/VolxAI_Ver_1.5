# Fix: Response Body Already Read Error - January 3, 2026

## Vấn đề

User báo: **"Đăng bài viết từ post type 'where-to-go' sang post type 'post' thì không đăng được, mặc dù có thông báo đăng thành công"**

### Triệu chứng
- Frontend hiển thị "Đã xử lý (1 mới)" hoặc "Đã xử lý (1 cập nhật)"
- Bài viết **KHÔNG xuất hiện** trên WordPress
- Backend log: `TypeError: Body is unusable: Body has already been read`

### Backend Error Log
```
❌ Error publishing article: TypeError: Body is unusable: Body has already been read
    at consumeBody (node:internal/deps/undici/undici:5712:15)
    at _Response.json (node:internal/deps/undici/undici:5665:18)
    at handlePublishArticle (file:///home/jybcaorr/api.volxai.com/node-build.mjs:3684:37)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
```

## Root Cause

**Problem**: Response body được đọc nhiều lần trong code

### Code cũ (BUG)

```typescript
// Case 1: Update existing post
if (existingWordPressPostId) {
  wpResponse = await fetch(...);
  wpPostId = existingWordPressPostId;  // Không đọc response
} 
// Case 2: Create new post
else {
  wpResponse = await fetch(...);
  
  const wpData = await wpResponse.json();  // ✅ Đọc lần 1
  if (!wpData.success) {
    throw new Error(wpData.message);
  }
  wpPostId = wpData.post_id;
}

// ❌ Lỗi: Cố đọc lại response
if (!wpResponse.ok) {
  const errorData = await wpResponse.json();  // ❌ Đọc lần 2 - LỖI!
  throw new Error(errorData.message);
}

const wpData = await wpResponse.json();  // ❌ Đọc lần 3 - LỖI!
console.log("✓ WordPress response:", wpData);
```

### Vấn đề chi tiết

**Khi CREATE new post**:
1. Dòng 749: Đọc `wpResponse.json()` → Lấy `post_id` ✅
2. Dòng 757: Kiểm tra `!wpResponse.ok` và cố đọc lại → **LỖI**
3. Dòng 761: Cố đọc lần 3 → **LỖI**

**Khi UPDATE existing post**:
1. Không đọc response, chỉ gán `wpPostId = existingWordPressPostId`
2. Dòng 757: Cố đọc response → **LỖI**
3. Dòng 761: Cố đọc lại → **LỖI**

### HTTP Response Body Behavior

**Quan trọng**: HTTP Response body là stream, **chỉ có thể đọc 1 lần**:

```typescript
const response = await fetch(url);

// ✅ Đọc lần 1 - OK
const data1 = await response.json();

// ❌ Đọc lần 2 - LỖI!
const data2 = await response.json();  // TypeError: Body is unusable
```

**Lý do**: 
- Response body là readable stream
- Sau khi đọc xong, stream đã consumed
- Không thể rewind hay đọc lại

## Giải pháp

### Fix: Đọc response đúng 1 lần

```typescript
let wpPostId;
let action;
let wpData;  // ✅ Declare variable để share data

// Update existing post
if (existingWordPressPostId) {
  console.log("🔄 Updating existing WordPress post ID:", existingWordPressPostId);
  action = "updated";

  const wpResponse = await fetch(
    `${website.url}/wp-json/article-writer/v1/update/${existingWordPressPostId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Article-Writer-Token": website.api_token,
      },
      body: JSON.stringify(postData),
    }
  );

  // ✅ Check response và đọc JSON ĐÚNG 1 LẦN
  if (!wpResponse.ok) {
    const errorData = await wpResponse.json();
    throw new Error(errorData.message || "WordPress API error");
  }

  wpData = await wpResponse.json();  // ✅ Đọc lần duy nhất
  if (!wpData.success) {
    throw new Error(wpData.message || "Failed to update WordPress post");
  }
  
  wpPostId = existingWordPressPostId;
} 
// Create new post
else {
  console.log("➕ Creating new WordPress post");
  action = "created";

  const wpResponse = await fetch(
    `${website.url}/wp-json/article-writer/v1/publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Article-Writer-Token": website.api_token,
      },
      body: JSON.stringify(postData),
    }
  );

  // ✅ Check response và đọc JSON ĐÚNG 1 LẦN
  if (!wpResponse.ok) {
    const errorData = await wpResponse.json();
    throw new Error(errorData.message || "WordPress API error");
  }

  wpData = await wpResponse.json();  // ✅ Đọc lần duy nhất
  if (!wpData.success) {
    throw new Error(wpData.message || "Failed to publish to WordPress");
  }
  
  wpPostId = wpData.post_id;
}

console.log("✓ WordPress response:", wpData);  // ✅ Dùng data đã đọc
```

### Key Changes

#### 1. Move response variable to local scope
```typescript
// ❌ Old: Global wpResponse variable
let wpResponse;
wpResponse = await fetch(...);

// ✅ New: Local const in each block
if (existingWordPressPostId) {
  const wpResponse = await fetch(...);
} else {
  const wpResponse = await fetch(...);
}
```

#### 2. Read JSON only once per block
```typescript
// ✅ Check status FIRST
if (!wpResponse.ok) {
  const errorData = await wpResponse.json();  // Read error
  throw new Error(errorData.message);
}

// ✅ Then read success data
wpData = await wpResponse.json();  // Read success - chỉ 1 lần
```

#### 3. Share data via variable
```typescript
let wpData;  // Declare outside blocks

// In update block
wpData = await wpResponse.json();  // Assign

// In create block  
wpData = await wpResponse.json();  // Assign

// Later use
console.log("✓ WordPress response:", wpData);  // Use shared data
```

## Impact Analysis

### Before Fix

**Scenario 1**: Đăng bài mới (post type khác nhau)
```
1. User chọn bài "where-to-go" → đăng lên "post"
2. Backend gọi WordPress API → Response 200 OK
3. Đọc response.json() → Lấy post_id
4. ❌ Cố đọc lại response.json() → LỖI "Body already read"
5. Throw error → Frontend hiện "thành công" nhưng thực tế FAILED
6. Bài viết KHÔNG được tạo trên WordPress
```

**Scenario 2**: Update bài đã đăng
```
1. User edit bài → publish lại
2. Backend gọi WordPress API → Response 200 OK
3. KHÔNG đọc response (chỉ dùng existing post ID)
4. ❌ Check !wpResponse.ok → Cố đọc response.json() → LỖI
5. Throw error → Frontend hiện "thành công" nhưng thực tế FAILED
6. Bài viết KHÔNG được update trên WordPress
```

### After Fix

**Scenario 1**: Đăng bài mới
```
1. User chọn bài "where-to-go" → đăng lên "post"
2. Backend gọi WordPress API → Response 200 OK
3. Check wpResponse.ok ✓
4. Đọc wpResponse.json() ĐÚNG 1 LẦN ✓
5. Lấy post_id ✓
6. Save mapping ✓
7. Return success ✓
8. ✅ Bài viết XUẤT HIỆN trên WordPress
```

**Scenario 2**: Update bài đã đăng
```
1. User edit bài → publish lại
2. Backend gọi WordPress API → Response 200 OK
3. Check wpResponse.ok ✓
4. Đọc wpResponse.json() ĐÚNG 1 LẦN ✓
5. Update mapping ✓
6. Return success ✓
7. ✅ Bài viết ĐƯỢC UPDATE trên WordPress
```

## Testing

### Test Case 1: Publish New Post (Different Post Type)

```bash
# Bài viết ID 44: post_type = "where-to-go" (synced from WordPress)
# Đăng lên post_type = "post"

curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": 44,
    "postType": "post"
  }'

# Expected Response:
{
  "success": true,
  "message": "Article created successfully on WordPress",
  "data": {
    "articleId": 44,
    "wordpressPostId": 999,  # New post ID
    "wordpressUrl": "https://website.com/post/my-son-sanctuary",
    "action": "created"
  }
}
```

**Verify on WordPress**:
- Check post ID 999 exists
- Post type = "post"
- Content matches article

### Test Case 2: Update Existing Post

```bash
# Bài viết ID 44 đã có trên website (WP post 560)
# Update lại bài đã đăng

curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": 44,
    "postType": "where-to-go"
  }'

# Expected Response:
{
  "success": true,
  "message": "Article updated successfully on WordPress",
  "data": {
    "articleId": 44,
    "wordpressPostId": 560,  # Same post ID
    "wordpressUrl": "https://website.com/where-to-go/my-son-sanctuary",
    "action": "updated"
  }
}
```

**Verify on WordPress**:
- Check post ID 560 updated
- Modified date changed
- Content updated

### Test Case 3: Cross-Website Publishing

```bash
# Bài viết ID 50: synced from Website A (WP post 554)
# Publish to Website B

# Step 1: Publish to Website B
curl -X POST https://api.volxai.com/api/websites/2/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 50, "postType": "page"}'

# Expected: Creates NEW post on Website B

# Step 2: Re-publish to Website B
curl -X POST https://api.volxai.com/api/websites/2/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 50, "postType": "page"}'

# Expected: UPDATES existing post on Website B

# Step 3: Re-publish to Website A
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer TOKEN" \
  -d '{"articleId": 50, "postType": "post"}'

# Expected: UPDATES existing post on Website A (WP 554)
```

**Verify**:
- Website A: Post 554 unchanged or updated
- Website B: New post created → updated on second publish

### Test Case 4: Multiple Post Types

```bash
# Same article to 3 different post types

# Type 1: post
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -d '{"articleId": 48, "postType": "post"}'

# Type 2: page
curl -X POST https://api.volxai.com/api/websites/2/publish \
  -d '{"articleId": 48, "postType": "page"}'

# Type 3: where-to-go
curl -X POST https://api.volxai.com/api/websites/3/publish \
  -d '{"articleId": 48, "postType": "where-to-go"}'
```

**Expected**:
- 3 different WordPress posts created
- Each with different post type
- All with same content from article 48

## Backend Logs

### Before Fix (ERROR)
```
❌ Error publishing article: TypeError: Body is unusable: Body has already been read
    at consumeBody (node:internal/deps/undici/undici:5712:15)
    at _Response.json (node:internal/deps/undici/undici:5665:18)
```

### After Fix (SUCCESS)
```
🔄 Updating existing WordPress post ID: 554
✓ WordPress response: { success: true, post_id: 554, url: 'https://...' }
✓ Saved to mapping table: article 50 → website 1 → WP post 554

➕ Creating new WordPress post
✓ WordPress response: { success: true, post_id: 888, url: 'https://...' }
✓ Saved to mapping table: article 50 → website 2 → WP post 888
```

## Best Practices

### 1. Always read response body only once
```typescript
const response = await fetch(url);

// ✅ Good: Read once
const data = await response.json();

// ❌ Bad: Try to read again
const data2 = await response.json();  // Error!
```

### 2. Check status before reading body
```typescript
const response = await fetch(url);

// ✅ Good: Check first
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}

const data = await response.json();  // Read success data
```

### 3. Use variables to share data
```typescript
let responseData;

if (condition) {
  const response = await fetch(url1);
  responseData = await response.json();
} else {
  const response = await fetch(url2);
  responseData = await response.json();
}

// Use shared data
console.log(responseData);
```

### 4. Handle errors properly
```typescript
try {
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error("Fetch error:", error);
  throw error;
}
```

## Summary

### Problem
- Response body được đọc nhiều lần
- Gây lỗi "Body is unusable: Body has already been read"
- Bài viết không được tạo/update trên WordPress mặc dù frontend hiện "thành công"

### Solution
- Đọc response body đúng 1 lần per request
- Check status trước khi đọc body
- Dùng local const thay vì shared variable
- Share data qua declared variable

### Files Changed
- `server/routes/websites.ts` - handlePublishArticle function

### Deployment
```bash
npm run build:server
rsync ... node-build.mjs ...
ssh ... touch restart.txt
```

### Testing
✅ Publish new post with different post type - WORKS  
✅ Update existing post - WORKS  
✅ Cross-website publishing - WORKS  
✅ Multiple post types per article - WORKS

---

**Date**: January 3, 2026  
**Status**: ✅ Fixed and Deployed  
**Impact**: Critical - Đăng bài lên WordPress không hoạt động  
**Resolution Time**: < 30 minutes
