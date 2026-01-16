# Fix: Taxonomies Not Loading for Custom Post Types

## Vấn đề
Custom post type "Where to go" đã hiển thị ✅  
Nhưng Categories và Tags (taxonomies) không load cho custom post type này ❌

## Nguyên nhân
Frontend và backend mismatch parameter name:
- **Frontend gửi**: `?postType=where_to_go` (camelCase)
- **Backend expect**: `?post_type=where_to_go` (snake_case)

→ Backend không nhận được post_type parameter → Fallback về 'post' → Load sai taxonomies

## Code Analysis

### Frontend (PublishModal.tsx) - Before
```tsx
const response = await fetch(
  buildApiUrl(`/api/websites/${websiteId}/taxonomies?postType=${postType}`),
  //                                                     ^^^^^^^^ WRONG!
```

### Backend (websites.ts) - Line 1147
```typescript
const postType = (req.query.post_type as string) || 'post';
//                          ^^^^^^^^^^ Expects post_type with underscore
```

## Giải pháp

### Frontend Fix (PublishModal.tsx)

✅ **Sửa parameter name và thêm logging**:
```tsx
const fetchTaxonomies = async (websiteId: number, postType: string) => {
  setLoadingTaxonomies(true);
  try {
    const token = localStorage.getItem("authToken");
    console.log("🔍 Fetching taxonomies for post type:", postType);
    
    // FIX: postType → post_type
    const response = await fetch(
      buildApiUrl(`/api/websites/${websiteId}/taxonomies?post_type=${encodeURIComponent(postType)}`),
      //                                                     ^^^^^^^^^^ FIXED!
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("📡 Taxonomies response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log("📦 Taxonomies response:", result);
      console.log("📦 Taxonomies data:", result.data);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log("✅ Setting taxonomies, count:", result.data.length);
        setTaxonomies(result.data);
      } else {
        console.log("⚠️ No taxonomies data or invalid format");
        setTaxonomies([]);
      }
      setSelectedTaxonomy({});
    }
  } catch (error) {
    console.error("❌ Error fetching taxonomies:", error);
    toast.error("Không thể tải danh sách chuyên mục");
    setTaxonomies([]);
  } finally {
    setLoadingTaxonomies(false);
  }
};
```

### Backend Enhancement (websites.ts)

✅ **Thêm detailed logging**:
```typescript
const data = await response.json();

console.log("📦 Raw taxonomies response from WordPress:", JSON.stringify(data, null, 2));

if (data.success) {
  console.log(`✅ Found ${data.count || 0} taxonomies`);
  console.log("📋 Taxonomies data:", JSON.stringify(data.taxonomies, null, 2));
  res.json({
    success: true,
    data: data.taxonomies || [],  // Safe fallback to empty array
    post_type: data.post_type,
  });
} else {
  console.log("❌ WordPress returned success: false");
  console.log("Message:", data.message);
  res.status(400).json({
    success: false,
    message: data.message || "Failed to fetch taxonomies",
  });
}
```

## WordPress Plugin Response Format

Từ `class-api-handler.php` (lines 534-620):

```php
public static function handle_get_taxonomies($request) {
    $post_type = $request->get_param('post_type') ?: 'post';
    
    // Get taxonomies for this post type
    $taxonomies = get_object_taxonomies($post_type, 'objects');
    
    $taxonomies_list = array();
    foreach ($taxonomies as $taxonomy) {
        if ($taxonomy->public && $taxonomy->show_ui) {
            $terms = get_terms([
                'taxonomy' => $taxonomy->name,
                'hide_empty' => false,
            ]);
            
            $taxonomies_list[] = array(
                'name'  => $taxonomy->name,    // e.g., "category", "post_tag", "destination"
                'label' => $taxonomy->label,   // e.g., "Categories", "Tags", "Destinations"
                'terms' => $terms_list
            );
        }
    }
    
    return [
        'success' => true,
        'count' => count($taxonomies_list),
        'taxonomies' => $taxonomies_list,
        'post_type' => $post_type
    ];
}
```

## Expected Response Example

### For custom post type "where_to_go":
```json
{
  "success": true,
  "count": 3,
  "post_type": "where_to_go",
  "taxonomies": [
    {
      "name": "destination",
      "label": "Destinations",
      "terms": [
        {"id": 1, "name": "Da Nang"},
        {"id": 2, "name": "Hoi An"},
        {"id": 3, "name": "Hue"}
      ]
    },
    {
      "name": "tour_type",
      "label": "Tour Types",
      "terms": [
        {"id": 4, "name": "Adventure"},
        {"id": 5, "name": "Culture"},
        {"id": 6, "name": "Food Tour"}
      ]
    },
    {
      "name": "where_to_go_tag",
      "label": "Tags",
      "terms": [
        {"id": 7, "name": "Popular"},
        {"id": 8, "name": "New"}
      ]
    }
  ]
}
```

## Flow Diagram

```
User selects "Where to go" post type
         ↓
Frontend: fetchTaxonomies(websiteId, "where_to_go")
         ↓
API Call: /api/websites/1/taxonomies?post_type=where_to_go
         ↓  ← FIXED: Now using post_type (was postType)
Backend: Extract post_type from req.query
         ↓
WordPress: GET /wp-json/article-writer/v1/taxonomies?post_type=where_to_go
         ↓
WordPress: Returns taxonomies for "where_to_go"
         ↓
Backend: Forward response
         ↓
Frontend: Render taxonomy dropdowns
         ↓
User sees: "Destinations", "Tour Types", "Tags" dropdowns
```

## Deployment

**Build**:
```bash
npm run build
✓ Client: 1953 modules (1.81s)
  - index-Cq33IfjT.js (901.42 kB)
  - index-cNBCx-f2.css (102.72 kB)
✓ Server: 12 modules (162ms)
  - node-build.mjs (129.07 kB)
```

**Deploy**:
```bash
# Server
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
✓ 100% (126KB @ 1.7MB/s)

# Client
rsync -avz -e "ssh -p 2210" dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/
✓ 8 files transferred (2.28 MB/s)

# Restart
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
✓ Server restarted
```

## Testing Checklist

### Test with custom post type:
1. ✅ Refresh https://volxai.com/write-article/54
2. ✅ Click "Đăng bài" or "Cập nhật"
3. ✅ Select website: "Da Nang Chill Ride"
4. ✅ Select post type: "Where to go"
5. **Categories & Tags dropdowns should now load** ✅
6. **Check console for**:
   ```
   🔍 Fetching taxonomies for post type: where_to_go
   📡 Taxonomies response status: 200
   📦 Taxonomies response: {success: true, data: [...]}
   ✅ Setting taxonomies, count: 3
   ```

### Test with default post type:
1. ✅ Select post type: "Posts"
2. **Should see**: "Categories" dropdown
3. **Should see**: "Tags" dropdown

## Console Debugging

### Frontend logs to look for:
- `🔍 Fetching taxonomies for post type: where_to_go`
- `📡 Taxonomies response status: 200`
- `📦 Taxonomies response:` (full object)
- `✅ Setting taxonomies, count: X`

### Backend logs (server console):
- `🔍 Fetching taxonomies for website: X`
- `📝 Post Type: where_to_go`
- `📦 Raw taxonomies response from WordPress:`
- `✅ Found X taxonomies`
- `📋 Taxonomies data:`

## Related Files
- ✅ `client/components/PublishModal.tsx` - Lines 192-228
- ✅ `server/routes/websites.ts` - Lines 1139-1205
- 📄 `lisa-content-app-plugin/includes/class-api-handler.php` - Lines 534-620

## Related Issues Fixed
1. `FIX_POST_TYPE_SELECTION.md` - Post type selection UI
2. `FIX_POST_TYPES_FALLBACK.md` - Fallback post types
3. `FIX_CUSTOM_POST_TYPES_LOADING.md` - Custom post types loading
4. **THIS FIX** - Taxonomies loading for custom post types

## Status
✅ **DEPLOYED & READY FOR TESTING**

Taxonomies should now load correctly for all post types, including custom ones!

---
**Fix deployed**: January 4, 2026  
**Build time**: Client 1.81s, Server 162ms  
**Total size**: 1.13 MB
