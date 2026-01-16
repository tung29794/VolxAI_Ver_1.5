# WordPress Post Type Selection - Complete Implementation Guide

## 📋 Overview
This feature allows users to selectively sync different WordPress post types (posts, pages, products, custom post types) from their connected websites to VolxAI.

**Version:** 1.1.0  
**Date:** January 3, 2025  
**Status:** ✅ Deployed to Production

---

## 🎯 Feature Highlights

### What's New
- **Post Type Selection Modal**: User can choose which content type to sync
- **Multiple Post Types Support**: Posts, Pages, and custom post types (products, events, etc.)
- **Post Count Display**: Shows how many items exist for each post type
- **Database Tracking**: Stores post_type for each synced article
- **Dynamic Sync**: Fetches available post types from WordPress in real-time

### User Flow
1. User clicks "Đồng bộ" button on a connected website
2. System fetches available post types from WordPress
3. Modal displays all post types with counts (e.g., "Posts (45)", "Pages (12)")
4. User selects desired post type
5. System syncs only that post type
6. Database stores post_type for future filtering

---

## 🗄️ Database Changes

### Articles Table - New Column
```sql
ALTER TABLE articles 
ADD COLUMN post_type VARCHAR(50) DEFAULT 'post' AFTER status;
```

**Field Details:**
- **Type:** VARCHAR(50)
- **Default:** 'post'
- **Nullable:** NO
- **Position:** Between `status` and `views` columns
- **Purpose:** Track which WordPress post type the article came from

**Impact:**
- Existing articles default to 'post'
- New synced articles store their actual post type
- Enables future filtering by post type

---

## 🔌 WordPress Plugin Updates

### New Endpoint: `/post-types`
**File:** `lisa-content-app-plugin/includes/class-api-handler.php`

#### Registration (Lines 54-63)
```php
register_rest_route($this->namespace, '/post-types', array(
    'methods'             => 'GET',
    'callback'            => array($this, 'handle_get_post_types'),
    'permission_callback' => array($this, 'check_api_token'),
));
```

#### Handler Function (Lines 437-497)
```php
public function handle_get_post_types($request) {
    try {
        // Get all public post types
        $post_types = get_post_types(['public' => true], 'objects');
        $result = array();
        
        foreach ($post_types as $post_type_obj) {
            // Skip attachments
            if ($post_type_obj->name === 'attachment') continue;
            
            // Count posts for this type
            $count = wp_count_posts($post_type_obj->name);
            $total_count = 0;
            if ($count) {
                foreach ($count as $status => $num) {
                    if ($status !== 'trash' && $status !== 'auto-draft') {
                        $total_count += $num;
                    }
                }
            }
            
            // Build post type info
            $result[] = array(
                'name'         => $post_type_obj->name,
                'label'        => $post_type_obj->label,
                'singular'     => $post_type_obj->labels->singular_name,
                'description'  => $post_type_obj->description,
                'count'        => $total_count,
                'hierarchical' => $post_type_obj->hierarchical,
                'has_archive'  => $post_type_obj->has_archive,
            );
        }
        
        return new WP_REST_Response([
            'success' => true,
            'post_types' => $result,
        ], 200);
    } catch (Exception $e) {
        return new WP_REST_Response([
            'success' => false,
            'message' => $e->getMessage(),
        ], 500);
    }
}
```

**Response Format:**
```json
{
  "success": true,
  "post_types": [
    {
      "name": "post",
      "label": "Posts",
      "singular": "Post",
      "description": "",
      "count": 45,
      "hierarchical": false,
      "has_archive": true
    },
    {
      "name": "page",
      "label": "Pages", 
      "singular": "Page",
      "description": "",
      "count": 12,
      "hierarchical": true,
      "has_archive": false
    }
  ]
}
```

### Updated Endpoint: `/posts` - Dynamic Post Type
**File:** `lisa-content-app-plugin/includes/class-api-handler.php` (Lines 329-435)

#### Parameter Addition (Lines 346-348)
```php
$per_page = $request->get_param('per_page') ?: 50;
$page = $request->get_param('page') ?: 1;
$status = $request->get_param('status') ?: 'any';
$post_type = $request->get_param('post_type') ?: 'post'; // NEW
```

#### Query Update (Line 359)
```php
// OLD: 'post_type' => 'post',
// NEW:
'post_type' => $post_type,
```

**Usage:**
```
GET /wp-json/article-writer/v1/posts?per_page=100&post_type=page
GET /wp-json/article-writer/v1/posts?per_page=100&post_type=product
```

---

## 🖥️ Backend API Updates

### New Endpoint: GET `/api/websites/:id/post-types`
**File:** `server/routes/websites.ts` (Lines 484-543)

```typescript
const handleGetPostTypes = async (req: Request, res: Response) => {
  try {
    const websiteId = parseInt(req.params.id);
    const userId = (req as any).userId;

    // Verify website ownership
    const websiteQuery = `
      SELECT url, api_token, name 
      FROM websites 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `;
    const [websites] = await query<any[]>(websiteQuery, [websiteId, userId]);

    if (!websites || websites.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Website not found or inactive",
      });
    }

    const website = websites[0];
    const postTypesUrl = `${website.url}/wp-json/article-writer/v1/post-types`;

    // Fetch from WordPress
    const response = await fetch(postTypesUrl, {
      method: "GET",
      headers: {
        "X-Article-Writer-Token": website.api_token,
      },
    });

    const data = await response.json();

    if (data.success) {
      res.json({
        success: true,
        data: data.post_types,
      });
    } else {
      res.status(400).json({
        success: false,
        message: data.message || "Failed to fetch post types",
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch post types from WordPress",
    });
  }
};
```

### Updated Endpoint: POST `/api/websites/:id/sync`
**File:** `server/routes/websites.ts` (Lines 317-460)

#### Accept post_type Parameter (Lines 322-323)
```typescript
const { id } = req.params;
const { post_type = 'post' } = req.body; // NEW: Accept from body
```

#### Pass to WordPress API (Lines 344-345)
```typescript
// OLD: const postsUrl = `${website.url}/wp-json/article-writer/v1/posts?per_page=100`;
// NEW:
const postsUrl = `${website.url}/wp-json/article-writer/v1/posts?per_page=100&post_type=${encodeURIComponent(post_type)}`;
```

#### Include in INSERT/UPDATE (Lines 380-450)
```typescript
const articleData = {
  // ... other fields
  post_type: post_type, // NEW: Include post_type
  // ...
};

// UPDATE query
UPDATE articles SET 
  title = ?, content = ?, meta_title = ?, meta_description = ?, 
  primary_keyword = ?, slug = ?, status = ?, post_type = ?, featured_image = ?, 
  updated_at = NOW()
WHERE id = ?

// INSERT query
INSERT INTO articles 
  (title, content, meta_title, meta_description, primary_keyword, 
   slug, status, post_type, featured_image, wordpress_post_id, website_id, 
   user_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
```

---

## 🎨 Frontend Implementation

### New Component: PostTypeSelectorModal
**File:** `client/components/PostTypeSelectorModal.tsx`

```tsx
interface PostType {
  name: string;
  label: string;
  singular: string;
  description?: string;
  count: number;
  hierarchical: boolean;
  has_archive: boolean;
}

interface PostTypeSelectorModalProps {
  open: boolean;
  onClose: () => void;
  postTypes: PostType[];
  loading: boolean;
  onConfirm: (postType: string) => void;
  websiteName: string;
}
```

**Features:**
- Radio button selection
- Shows post count per type
- Loading state while fetching
- Empty state handling
- Responsive design with Shadcn UI

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Chọn loại nội dung để đồng bộ          │
│ Chọn loại nội dung bạn muốn đồng bộ    │
│ từ website Website Name                 │
├─────────────────────────────────────────┤
│ ○ Posts               (45 items)        │
│   Type: post • Có archive               │
├─────────────────────────────────────────┤
│ ○ Pages               (12 items)        │
│   Type: page • Phân cấp                 │
├─────────────────────────────────────────┤
│ ○ Products            (8 items)         │
│   Type: product • Có archive            │
├─────────────────────────────────────────┤
│                    [Hủy]  [Đồng bộ]    │
└─────────────────────────────────────────┘
```

### Updated Component: WebsiteManagement
**File:** `client/components/WebsiteManagement.tsx`

#### New State Variables (Lines 43-47)
```tsx
const [postTypeSelectorOpen, setPostTypeSelectorOpen] = useState(false);
const [postTypes, setPostTypes] = useState<PostType[]>([]);
const [loadingPostTypes, setLoadingPostTypes] = useState(false);
const [selectedWebsiteForSync, setSelectedWebsiteForSync] = useState<Website | null>(null);
```

#### Updated handleSyncPosts (Lines 209-242)
```tsx
const handleSyncPosts = async (website: Website) => {
  try {
    // Fetch available post types
    setSelectedWebsiteForSync(website);
    setLoadingPostTypes(true);
    setPostTypeSelectorOpen(true);

    const token = localStorage.getItem("authToken");
    const response = await fetch(
      buildApiUrl(`/api/websites/${website.id}/post-types`),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();
    if (data.success) {
      setPostTypes(data.data || []);
    } else {
      toast.error("Không thể tải danh sách loại nội dung");
      setPostTypeSelectorOpen(false);
    }
  } catch (error) {
    toast.error("Không thể tải danh sách loại nội dung");
    setPostTypeSelectorOpen(false);
  } finally {
    setLoadingPostTypes(false);
  }
};
```

#### New handleConfirmSync (Lines 244-276)
```tsx
const handleConfirmSync = async (postType: string) => {
  if (!selectedWebsiteForSync) return;

  try {
    setSyncingWebsiteId(selectedWebsiteForSync.id);
    setPostTypeSelectorOpen(false);
    
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      buildApiUrl(`/api/websites/${selectedWebsiteForSync.id}/sync`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_type: postType }),
      }
    );

    const data = await response.json();
    if (data.success) {
      const postTypeLabel = postTypes.find(pt => pt.name === postType)?.label || postType;
      toast.success(
        `Đồng bộ ${postTypeLabel} thành công! ${data.data.created} bài mới, ${data.data.updated} bài cập nhật`
      );
      fetchWebsites();
    } else {
      toast.error(data.message || "Không thể đồng bộ bài viết");
    }
  } catch (error) {
    toast.error("Không thể đồng bộ bài viết");
  } finally {
    setSyncingWebsiteId(null);
    setSelectedWebsiteForSync(null);
  }
};
```

#### Modal Integration (Lines 503-513)
```tsx
<PostTypeSelectorModal
  open={postTypeSelectorOpen}
  onClose={() => {
    setPostTypeSelectorOpen(false);
    setSelectedWebsiteForSync(null);
  }}
  postTypes={postTypes}
  loading={loadingPostTypes}
  onConfirm={handleConfirmSync}
  websiteName={selectedWebsiteForSync?.name || ""}
/>
```

---

## 📦 Deployment

### Files Deployed
1. **WordPress Plugin:** `lisa-content-app-plugin-with-post-types.zip`
2. **Backend:** `dist/server/node-build.mjs` → `jybcaorr@ghf57-22175.azdigihost.com:dist/server/`
3. **Frontend:** `dist/spa/` → `jybcaorr@ghf57-22175.azdigihost.com:public_html/`

### Deployment Commands
```bash
# Build WordPress plugin
zip -r lisa-content-app-plugin-with-post-types.zip lisa-content-app-plugin/

# Build backend
npm run build:server

# Deploy backend
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:dist/server/

# Restart backend
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch api.volxai.com/tmp/restart.txt"

# Build frontend
npm run build:client

# Deploy frontend
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:public_html/
```

### WordPress Plugin Installation
1. Download `lisa-content-app-plugin-with-post-types.zip` from server
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload the ZIP file
4. Activate the plugin
5. Go to Article Writer → Settings to verify token

---

## 🧪 Testing Guide

### Test Case 1: Fetch Post Types
**Steps:**
1. Login to VolxAI account
2. Go to Cấu hình → Website
3. Click "Đồng bộ" on a connected website
4. Modal should appear with loading spinner
5. Post types should load (Posts, Pages, etc.)
6. Each post type shows count

**Expected:**
- Modal opens immediately
- Loading state visible
- Post types load within 2-3 seconds
- Counts are accurate

### Test Case 2: Sync Posts
**Steps:**
1. Select "Posts" from post type list
2. Click "Đồng bộ" button
3. Wait for sync to complete

**Expected:**
- Modal closes
- Sync button shows loading state
- Toast notification shows: "Đồng bộ Posts thành công! X bài mới, Y bài cập nhật"
- last_sync timestamp updates

### Test Case 3: Sync Pages
**Steps:**
1. Click "Đồng bộ" again
2. Select "Pages" this time
3. Click "Đồng bộ"

**Expected:**
- Pages are synced separately
- Database has articles with post_type='page'
- Toast shows "Đồng bộ Pages thành công!"

### Test Case 4: Custom Post Types
**Steps:**
1. Install a plugin that creates custom post types (e.g., WooCommerce for products)
2. Create some products in WordPress
3. Click "Đồng bộ" in VolxAI
4. "Products" should appear in the list
5. Select and sync products

**Expected:**
- Custom post type appears
- Shows correct count
- Syncs successfully
- post_type='product' in database

### Test Case 5: Error Handling
**Steps:**
1. Disconnect WordPress plugin
2. Try to sync
3. Should show error message

**Expected:**
- Error toast: "Không thể tải danh sách loại nội dung"
- Modal closes
- No crash

---

## 🔍 Database Queries for Verification

### Check Synced Articles by Post Type
```sql
SELECT 
  id, 
  title, 
  post_type, 
  wordpress_post_id, 
  website_id,
  status,
  created_at
FROM articles 
WHERE user_id = [USER_ID]
ORDER BY post_type, created_at DESC;
```

### Count Articles by Post Type
```sql
SELECT 
  post_type,
  COUNT(*) as count,
  COUNT(DISTINCT website_id) as websites
FROM articles
WHERE user_id = [USER_ID]
GROUP BY post_type;
```

### Articles from Specific Website
```sql
SELECT 
  a.id,
  a.title,
  a.post_type,
  a.status,
  w.name as website_name,
  w.url as website_url
FROM articles a
JOIN websites w ON a.website_id = w.id
WHERE a.user_id = [USER_ID]
  AND a.website_id = [WEBSITE_ID]
ORDER BY a.created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: Modal doesn't open
**Cause:** API endpoint not responding  
**Solution:**
1. Check backend logs: `ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f logs/error.log"`
2. Verify route registered: Check `server/routes/websites.ts` line 548
3. Test endpoint directly: `curl -H "Authorization: Bearer TOKEN" https://api.volxai.com/api/websites/1/post-types`

### Issue: No post types returned
**Cause:** WordPress plugin not updated  
**Solution:**
1. Verify plugin version in WordPress
2. Check plugin file has handle_get_post_types() function
3. Test endpoint: `curl -H "X-Article-Writer-Token: aw-xxxxx" https://yoursite.com/wp-json/article-writer/v1/post-types`
4. Check WordPress error logs

### Issue: post_type not saved
**Cause:** Database column missing  
**Solution:**
```sql
-- Check if column exists
DESCRIBE articles;

-- Add if missing
ALTER TABLE articles 
ADD COLUMN post_type VARCHAR(50) DEFAULT 'post' AFTER status;
```

### Issue: Sync includes wrong post type
**Cause:** Parameter not passed correctly  
**Solution:**
1. Check browser Network tab → Sync request → Body should include `{"post_type":"page"}`
2. Check backend logs for post_type value
3. Verify WordPress endpoint receives post_type parameter

---

## 📊 Success Metrics

### Implementation Complete ✅
- [x] Database column added
- [x] WordPress plugin /post-types endpoint created
- [x] WordPress plugin /posts accepts post_type parameter
- [x] Backend GET /api/websites/:id/post-types implemented
- [x] Backend POST /api/websites/:id/sync accepts post_type
- [x] Frontend PostTypeSelectorModal created
- [x] Frontend WebsiteManagement integrated
- [x] All code deployed to production
- [x] Plugin ZIP file created

### Expected Behavior ✅
- User sees post type selection modal
- All available post types display with counts
- Sync only affects selected post type
- Database stores post_type correctly
- Toast shows post type label in success message
- Multiple syncs can target different post types

---

## 🔮 Future Enhancements

### Phase 2 Features (Planned)
1. **Filter articles by post_type** in UserArticles component
2. **Display post_type badge** in article list
3. **Bulk sync** - sync all post types at once
4. **Schedule sync** by post type
5. **Post type statistics** dashboard
6. **Export by post type**

### Database Optimization
```sql
-- Add index for better filtering
CREATE INDEX idx_articles_post_type ON articles(post_type);
CREATE INDEX idx_articles_user_post_type ON articles(user_id, post_type);
```

---

## 📝 Summary

This feature enables flexible WordPress content synchronization by allowing users to:
- Choose which content type to sync (posts, pages, custom types)
- See available post types with counts before syncing
- Store post type information for future filtering
- Sync different content types independently

**Technical Stack:**
- Frontend: React + TypeScript + Shadcn UI + RadioGroup
- Backend: Node.js + Express + TypeScript
- WordPress: Custom REST API endpoints
- Database: MariaDB with post_type column

**Deployment Status:** ✅ Live on Production  
**Plugin Version:** 1.1.0  
**Last Updated:** January 3, 2025

---

## 🔗 Related Documentation
- [WORDPRESS_SYNC_GUIDE.md](./WORDPRESS_SYNC_GUIDE.md) - Original sync implementation
- [WORDPRESS_INTEGRATION_GUIDE.md](./WORDPRESS_INTEGRATION_GUIDE.md) - Website connection setup
- [API_KEYS_FIX_COMPLETE.md](./API_KEYS_FIX_COMPLETE.md) - Authentication system

**Questions or Issues?**  
Contact: Technical Support  
Server: ghf57-22175.azdigihost.com:2210  
Environment: Production (volxai.com)
