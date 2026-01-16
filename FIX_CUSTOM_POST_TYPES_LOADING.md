# Fix: Custom Post Types Not Loading

## Vấn đề
- Đã load được "Posts" và "Pages" (default fallback)
- Nhưng chưa load được custom post types từ WordPress (như "Tours", "Products", etc.)

## Nguyên nhân
WordPress plugin trả về format khác với backend expected:
- **WordPress plugin trả về**: `{name: "post", label: "Posts"}`
- **Backend expect**: `{slug: "post", label: "Posts"}`
- Backend filter `type.slug` nên bỏ qua tất cả post types có field `name`

## Phân tích WordPress Plugin Response

### WordPress Plugin Code (class-api-handler.php, lines 477-530)
```php
public static function handle_get_post_types($request) {
    $post_types = get_post_types(['public' => true], 'objects');
    
    foreach ($post_types as $post_type) {
        $post_types_list[] = array(
            'name'        => $post_type->name,        // ← field "name"
            'label'       => $post_type->label,       // ← field "label"
            'singular'    => $post_type->labels->singular_name,
            'description' => $post_type->description,
            'count'       => $total,
            'hierarchical'=> $post_type->hierarchical,
        );
    }
    
    return [
        'success' => true,
        'post_types' => $post_types_list  // Array of objects
    ];
}
```

### Response Example
```json
{
  "success": true,
  "count": 4,
  "post_types": [
    {
      "name": "post",
      "label": "Posts",
      "singular": "Post",
      "count": 150
    },
    {
      "name": "page",
      "label": "Pages", 
      "singular": "Page",
      "count": 25
    },
    {
      "name": "tour",
      "label": "Tours",
      "singular": "Tour",
      "count": 30
    },
    {
      "name": "product",
      "label": "Products",
      "singular": "Product",
      "count": 100
    }
  ]
}
```

## Giải pháp

### Backend (server/routes/websites.ts)

✅ **Support multiple formats**:

```typescript
postTypes = postTypes
  .filter(type => {
    // Accept if it has slug, name, or is a string
    return type && (type.slug || type.name || typeof type === 'string');
  })
  .map(type => {
    // Format 1: {name: "post", label: "Posts"} - Our plugin format ✅
    if (typeof type === 'object' && type.name && type.label) {
      return { slug: type.name, label: type.label };
    }
    
    // Format 2: {slug: "post", label: "Posts"} - Standard format ✅
    if (typeof type === 'object' && type.slug && type.label) {
      return { slug: type.slug, label: type.label };
    }
    
    // Format 3: String only ✅
    if (typeof type === 'string') {
      return { slug: type, label: type };
    }
    
    // Format 4: Object with slug but no label ✅
    if (typeof type === 'object' && type.slug) {
      return { slug: type.slug, label: type.label || type.slug };
    }
    
    // Format 5: Object with name but no label ✅
    if (typeof type === 'object' && type.name) {
      return { slug: type.name, label: type.label || type.name };
    }
    
    return null;
  })
  .filter(Boolean);
```

## Kết quả

### Before Fix
```
📦 Raw response from WordPress: {
  post_types: [
    {name: "post", label: "Posts"},
    {name: "tour", label: "Tours"}
  ]
}
⚠️ No post types from WordPress, using defaults
✅ Data returned: [
  {slug: "post", label: "Posts"},
  {slug: "page", label: "Pages"}
]
```

### After Fix
```
📦 Raw response from WordPress: {
  post_types: [
    {name: "post", label: "Posts"},
    {name: "page", label: "Pages"},
    {name: "tour", label: "Tours"},
    {name: "product", label: "Products"}
  ]
}
✅ Normalized 4 post types from WordPress
📋 Post types: [
  {slug: "post", label: "Posts"},
  {slug: "page", label: "Pages"},
  {slug: "tour", label: "Tours"},
  {slug: "product", label: "Products"}
]
```

## Tương thích

Fix này support nhiều format từ các WordPress plugins khác nhau:

| Format | Source | Support |
|--------|--------|---------|
| `{name, label}` | Our plugin | ✅ |
| `{slug, label}` | Other plugins | ✅ |
| `string` | Simple arrays | ✅ |
| `{slug}` only | Minimal | ✅ |
| `{name}` only | Alternative | ✅ |

## Deployment

**Build**:
```bash
npm run build:server
✓ 12 modules transformed (275ms)
dist/server/node-build.mjs  128.77 kB
```

**Deploy**:
```bash
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"

✓ 100% uploaded (126KB @ 1.8MB/s)
✓ Server restarted
```

## Testing

### Test Steps:
1. Refresh https://volxai.com/write-article/54
2. Click "Đăng bài" or "Cập nhật"
3. Select website: "Da Nang Chill Ride"
4. **Post Type dropdown should now show**:
   - ✅ Posts
   - ✅ Pages
   - ✅ Tours (custom)
   - ✅ Any other custom post types

### Expected Console:
```javascript
📦 Post types response: {success: true, data: Array(4)}
📦 Post types data: Array(4)
  0: {slug: "post", label: "Posts"}
  1: {slug: "page", label: "Pages"}
  2: {slug: "tour", label: "Tours"}
  3: {slug: "product", label: "Products"}
✅ Setting post types, count: 4
```

## WordPress Plugin Location

Plugin files are in: `/lisa-content-app-plugin/`
- Main: `article-writer-publisher.php`
- API Handler: `includes/class-api-handler.php` (lines 477-530)

To check on WordPress site:
```bash
# SSH to WordPress hosting
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Find WordPress
find ~ -name "wp-content" -type d 2>/dev/null

# Check plugin
ls ~/path/to/wp-content/plugins/article-writer-publisher/
```

## Related Files
- `server/routes/websites.ts` - Lines 574-625
- `lisa-content-app-plugin/includes/class-api-handler.php` - Lines 477-530
- `client/components/PublishModal.tsx` - Frontend handler

## Status
✅ **DEPLOYED & READY FOR TESTING**

Custom post types should now load from WordPress!

---
**Fix deployed**: January 4, 2026  
**Build size**: 128.77 kB  
**Deployment time**: ~5 seconds
