# ✅ Taxonomy Feature - Deployment Complete

## Ngày: 4 tháng 1, 2026

## Deployment Status

### ✅ Backend (api.volxai.com)
- **Status**: Deployed & Running
- **File**: `dist/server/node-build.mjs`
- **Endpoint**: `https://api.volxai.com/api/websites/:id/taxonomies?post_type=X`
- **Test**: `curl -I "https://api.volxai.com/api/websites/1/taxonomies?post_type=post"` → 401 (OK, cần auth)

### ✅ Frontend (volxai.com)
- **Status**: Deployed
- **Files**: `dist/spa/*` → `/home/jybcaorr/public_html/`
- **URL**: https://volxai.com/account

### ✅ WordPress Plugin (danangchillride.com)
- **Status**: Uploaded & Activated (by user)
- **File**: `class-api-handler.php`
- **New Endpoint**: `/wp-json/article-writer/v1/taxonomies?post_type=X`

## How It Works

1. **User chọn website** → Frontend fetch post types
2. **User chọn post type** → Frontend fetch taxonomies:
   ```
   GET https://api.volxai.com/api/websites/1/taxonomies?post_type=post
   ```
3. **Backend** forward request to WordPress:
   ```
   GET https://danangchillride.com/wp-json/article-writer/v1/taxonomies?post_type=post
   ```
4. **WordPress Plugin** trả về categories/taxonomies
5. **Frontend** hiển thị select boxes:
   - Post = "post" → Show Categories & Tags
   - Post = "page" → Hide all (pages không có taxonomy)
   - Post = Custom → Show custom taxonomies
6. **User publish** → Gửi kèm taxonomy selections
7. **WordPress** assign terms to post

## Testing Steps

### 1. Mở Browser Console
```bash
# macOS
open https://volxai.com/account
# Mở DevTools (Cmd+Opt+I)
```

### 2. Test Flow
1. ✅ Login vào account
2. ✅ Chọn ít nhất 1 bài viết (checkbox)
3. ✅ Chọn website: "Da Nang Chill Ride"
4. ✅ Chọn post type: "Posts (X)"
5. ✅ **Kiểm tra**: Taxonomy selects có hiện không?
   - Nếu KHÔNG hiện → Check console errors
   - Nếu CÓ hiện → Test chọn category
6. ✅ Chọn category từ dropdown
7. ✅ Click "Đăng lên Website"
8. ✅ Vào WordPress admin kiểm tra post có đúng category không

## Troubleshooting

### Nếu taxonomy select không hiện:

**A. Check Browser Console**
```javascript
// Expected requests:
// 1. GET /api/websites/1/post-types → 200 OK
// 2. GET /api/websites/1/taxonomies?post_type=post → 200 OK
```

**B. Check Backend Logs**
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd ~/api.volxai.com
pm2 logs volxai-backend --lines 50
```

**C. Check WordPress Plugin**
```bash
# Test WordPress endpoint directly
curl -H "X-Article-Writer-Token: YOUR_TOKEN" \
  "https://danangchillride.com/wp-json/article-writer/v1/taxonomies?post_type=post"
```

**D. Check Network Tab**
- Look for 404 errors on `/api/websites/*/taxonomies`
- Check response data structure
- Verify authentication headers

### Common Issues:

**1. 404 on taxonomies endpoint**
```bash
# Solution: Restart backend
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
touch ~/api.volxai.com/tmp/restart.txt
# Wait 10-20 seconds
```

**2. Empty taxonomies array**
- WordPress plugin chưa active
- API token không đúng
- WordPress không có categories

**3. Taxonomies không gửi khi publish**
- Check handleBulkPublish function
- Verify request body includes `taxonomies` field

## API Endpoints

### Backend
```
GET /api/websites/:id/taxonomies?post_type=post
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "name": "category",
      "label": "Categories",
      "terms": [
        {"id": 1, "name": "Tech", "count": 5}
      ]
    }
  ]
}
```

### WordPress
```
GET /wp-json/article-writer/v1/taxonomies?post_type=post
X-Article-Writer-Token: <token>

Response:
{
  "success": true,
  "taxonomies": [...]
}
```

## Files Changed

### Backend
- ✅ `server/routes/websites.ts` - Added `handleGetTaxonomies`

### Frontend  
- ✅ `client/components/UserArticles.tsx` - Added taxonomy selection UI

### WordPress Plugin
- ✅ `lisa-content-app-plugin/includes/class-api-handler.php`
  - Added `handle_get_taxonomies` endpoint
  - Updated `handle_publish_request` to process taxonomies
  - Updated `handle_update_request` to process taxonomies

## Next Steps

1. ✅ Test taxonomy selection on https://volxai.com/account
2. ✅ Verify WordPress posts get correct categories
3. ✅ Test with different post types (post, page, custom)
4. ✅ Test with multiple taxonomies (categories + tags)
5. ✅ Test on mobile devices

## Deploy Commands (For Future Updates)

```bash
# Full redeploy
./deploy-taxonomy.sh

# Backend only
npm run build:server
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"

# Frontend only
npm run build:client
rsync -avz -e "ssh -p 2210" dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ \
  --exclude='.htaccess'
```

---

**Status**: ✅ DEPLOYED - Ready for Testing
**URL**: https://volxai.com/account
