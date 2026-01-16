# Hướng dẫn Đồng bộ Bài viết từ WordPress

## Tổng quan
Tính năng đồng bộ bài viết cho phép user import tất cả bài viết từ WordPress về VolxAI. Bài viết đã tồn tại sẽ được cập nhật (ghi đè), bài mới sẽ được tạo.

## Cập nhật Database

### Các trường mới trong bảng `articles`:
```sql
wordpress_post_id INT NULL       -- ID của bài viết trên WordPress
website_id INT NULL               -- ID của website nguồn
UNIQUE KEY unique_wordpress_post (website_id, wordpress_post_id)
```

**Mục đích**:
- `wordpress_post_id`: Lưu ID gốc của bài viết trên WordPress để xác định bài đã sync
- `website_id`: Biết bài viết đến từ website nào
- Unique constraint: Đảm bảo không sync duplicate (mỗi bài WordPress chỉ được sync 1 lần per website)

### Migration đã chạy:
✅ Các column đã được thêm sẵn
✅ Unique constraint đã được tạo
✅ Foreign key đã được setup

## WordPress Plugin Updates

### Endpoint mới: GET /wp-json/article-writer/v1/posts

**Tham số**:
- `per_page`: Số bài per page (default: 50, max: 100)
- `page`: Trang hiện tại (default: 1)
- `status`: Trạng thái bài viết (publish, draft, any - default: any)

**Response**:
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "total_pages": 5,
  "current_page": 1,
  "posts": [
    {
      "id": 123,
      "title": "Tiêu đề bài viết",
      "content": "<p>Nội dung...</p>",
      "excerpt": "Tóm tắt...",
      "status": "publish",
      "slug": "tieu-de-bai-viet",
      "date": "2024-01-03T10:00:00+00:00",
      "modified": "2024-01-03T11:30:00+00:00",
      "url": "https://example.com/tieu-de-bai-viet",
      "featured_image": "https://example.com/wp-content/uploads/image.jpg",
      "categories": ["Category 1", "Category 2"],
      "tags": ["tag1", "tag2"],
      "seo_title": "SEO Title",
      "meta_description": "Meta description...",
      "primary_keyword": "từ khóa chính"
    }
  ]
}
```

**Plugin file**: `lisa-content-app-plugin-with-sync.zip`

## Backend API

### Endpoint: POST /api/websites/:id/sync

**URL**: `POST https://api.volxai.com/api/websites/:id/sync`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "message": "Posts synced successfully",
  "data": {
    "total": 50,      // Tổng số bài fetch từ WordPress
    "synced": 48,     // Số bài sync thành công
    "created": 30,    // Số bài tạo mới
    "updated": 18     // Số bài cập nhật
  }
}
```

### Logic hoạt động:

1. **Fetch posts từ WordPress**:
   ```typescript
   GET {website_url}/wp-json/article-writer/v1/posts?per_page=100
   Headers: X-Article-Writer-Token: {api_token}
   ```

2. **Kiểm tra bài đã tồn tại**:
   ```sql
   SELECT id FROM articles 
   WHERE wordpress_post_id = ? AND website_id = ?
   ```

3. **Update hoặc Insert**:
   - Nếu tồn tại → UPDATE: title, content, meta_title, meta_description, slug, status, featured_image
   - Nếu chưa có → INSERT: tạo bài mới với đầy đủ thông tin

4. **Cập nhật last_sync**:
   ```sql
   UPDATE websites SET last_sync = NOW() WHERE id = ?
   ```

### Files changed:
- `server/routes/websites.ts`: Thêm `handleSyncPosts` function và route `POST /:id/sync`

## Frontend Component

### WebsiteManagement.tsx Updates

**New UI elements**:
- Nút "Đồng bộ" (RefreshCw icon) trong mỗi website card
- Loading state khi đang sync
- Confirmation dialog trước khi sync
- Toast notification với kết quả sync

**New state**:
```typescript
const [syncingWebsiteId, setSyncingWebsiteId] = useState<number | null>(null);
```

**New function**:
```typescript
const handleSyncPosts = async (websiteId: number) => {
  // Confirm
  // Call POST /api/websites/:id/sync
  // Show result toast
  // Refresh website list
}
```

**Button UI**:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSyncPosts(website.id)}
  disabled={syncingWebsiteId === website.id}
>
  {syncingWebsiteId === website.id ? (
    <>
      <Loader2 className="animate-spin" />
      Đang sync...
    </>
  ) : (
    <>
      <RefreshCw />
      Đồng bộ
    </>
  )}
</Button>
```

## User Flow

### 1. Kết nối Website
```
User → /account → Website tab → Thêm Website
↓
Nhập: name, url, api_token
↓
Test connection (optional)
↓
Thêm thành công → Website hiển thị trong list
```

### 2. Đồng bộ Bài viết
```
User → Click nút "Đồng bộ" trên website card
↓
Confirm dialog: "Bạn muốn đồng bộ tất cả bài viết?"
↓
Frontend gọi: POST /api/websites/{id}/sync
↓
Backend fetch posts từ WordPress API
↓
Backend kiểm tra từng bài:
  - Đã có (wordpress_post_id + website_id match) → UPDATE
  - Chưa có → INSERT mới
↓
Backend update last_sync timestamp
↓
Frontend nhận kết quả:
  - Toast: "Đồng bộ thành công! 30 bài mới, 18 bài cập nhật"
  - Refresh danh sách website (hiển thị last_sync mới)
```

### 3. Xem Bài viết đã đồng bộ
```
User → /account → Tab "Tất cả bài viết"
↓
UserArticles component load articles:
  - Bài từ WordPress (có wordpress_post_id)
  - Bài tự viết trên VolxAI (không có wordpress_post_id)
↓
Có thể edit, xóa cả 2 loại bài
```

## Data Flow Diagram

```
┌─────────────┐
│  WordPress  │
│   Website   │
└──────┬──────┘
       │ GET /wp-json/article-writer/v1/posts
       │ X-Article-Writer-Token: xxx
       ↓
┌──────────────┐
│   Backend    │ ← POST /api/websites/:id/sync
│   VolxAI     │   (JWT Auth)
└──────┬───────┘
       │ For each post:
       │ ├─ Check if exists (wordpress_post_id + website_id)
       │ ├─ UPDATE or INSERT into articles table
       │ └─ Update last_sync
       ↓
┌──────────────┐
│   Database   │
│  jybcaorr_   │
│ lisacontentd │
│     bapi     │
└──────────────┘
       ↑
       │ SELECT * FROM articles WHERE user_id = ?
       │
┌──────────────┐
│   Frontend   │
│ UserArticles │
│  Component   │
└──────────────┘
```

## Conflict Resolution

### Trường hợp: Cùng 1 bài WordPress được sync từ 2 user khác nhau
**Giải quyết**: KHÔNG XẢY RA
- Mỗi user có website riêng trong bảng `websites` (user_id FK)
- Unique constraint: `(website_id, wordpress_post_id)`
- Mỗi user chỉ thấy website và bài viết của mình

### Trường hợp: Bài viết đã được edit trên VolxAI, sau đó sync lại từ WordPress
**Giải quyết**: WordPress OVERWRITE
- Khi sync, backend sẽ UPDATE theo data từ WordPress
- User cần aware: "Bài viết đã tồn tại sẽ được cập nhật"
- Future enhancement: Thêm option "Skip existing" hoặc "Merge changes"

### Trường hợp: Bài viết bị xóa trên WordPress, vẫn còn trên VolxAI
**Giải quyết**: GIỮ NGUYÊN
- Sync chỉ ADD/UPDATE, không DELETE
- Bài trên VolxAI vẫn tồn tại
- User có thể xóa manual nếu muốn

## Testing

### Test Plugin Endpoint
```bash
curl https://danangchillride.com/wp-json/article-writer/v1/posts?per_page=5 \
  -H "X-Article-Writer-Token: aw-211d4be5cc32fce5932cda0b396c4ce4970cf9d1780937079f191ddab4418a35"
```

**Expected**: JSON với 5 bài viết

### Test Backend Sync
```bash
# Get JWT token from localStorage
TOKEN="your_jwt_token"
WEBSITE_ID=1

curl -X POST https://api.volxai.com/api/websites/$WEBSITE_ID/sync \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: 
```json
{
  "success": true,
  "message": "Posts synced successfully",
  "data": {
    "total": 50,
    "synced": 48,
    "created": 30,
    "updated": 18
  }
}
```

### Test Frontend
1. Login vào https://volxai.com/account
2. Tab "Website" → Thấy website đã kết nối
3. Click nút "Đồng bộ" trên website
4. Confirm dialog xuất hiện
5. Loading spinner trong khi sync
6. Toast success với số liệu
7. Last sync timestamp được update
8. Tab "Tất cả bài viết" → Thấy bài mới được sync

## Database Queries

### Xem bài viết đã sync từ WordPress
```sql
SELECT 
  a.id,
  a.title,
  a.wordpress_post_id,
  w.name as website_name,
  w.url as website_url,
  a.created_at,
  a.updated_at
FROM articles a
LEFT JOIN websites w ON a.website_id = w.id
WHERE a.wordpress_post_id IS NOT NULL
ORDER BY a.updated_at DESC;
```

### Thống kê sync per website
```sql
SELECT 
  w.name,
  w.url,
  w.last_sync,
  COUNT(a.id) as total_synced_posts
FROM websites w
LEFT JOIN articles a ON w.id = a.website_id
WHERE w.user_id = ?
GROUP BY w.id;
```

### Tìm bài duplicate (nếu có lỗi unique constraint)
```sql
SELECT 
  wordpress_post_id,
  website_id,
  COUNT(*) as count
FROM articles
WHERE wordpress_post_id IS NOT NULL
GROUP BY wordpress_post_id, website_id
HAVING count > 1;
```

## Error Handling

### Frontend Errors
| Error | Message | Action |
|-------|---------|--------|
| Network error | "Không thể đồng bộ bài viết" | Retry hoặc check connection |
| 404 | "Website not found" | Refresh page, website có thể đã bị xóa |
| 400 | "Failed to fetch posts from WordPress" | Check plugin activated, API token valid |
| 500 | "Failed to sync posts" | Check backend logs |

### Backend Errors
| Error | Cause | Solution |
|-------|-------|----------|
| Website not found | Website bị xóa hoặc không thuộc user | Return 404 |
| WordPress API error | Plugin not activated, token invalid | Return 400 with message |
| Database error | Unique constraint violation, FK error | Log error, continue with next post |
| Fetch timeout | WordPress server slow | Increase timeout, retry |

### Plugin Errors
| Error | Cause | Solution |
|-------|-------|----------|
| 500 Internal Server Error | PHP error in handler | Check WordPress error logs |
| Empty posts array | No posts in WordPress | Return success with count=0 |
| Invalid token | Token expired/deleted | Regenerate token in WP admin |

## Performance Considerations

### Large WordPress Sites (1000+ posts)
**Problem**: Sync takes too long, may timeout
**Solutions**:
1. Implement pagination (fetch 100 posts per page)
2. Add progress indicator in frontend
3. Process sync in background job (future)
4. Add option to sync only recent posts (last 30 days)

### Database Load
**Problem**: Many INSERTs/UPDATEs at once
**Solutions**:
1. Use batch INSERT (future optimization)
2. Add indexes on wordpress_post_id and website_id (✅ done)
3. Use transactions for consistency

### Memory Usage
**Problem**: Loading all posts content into memory
**Solutions**:
1. Fetch in smaller batches
2. Process one post at a time
3. Clear processed posts from memory

## Future Enhancements

### Phase 2
- [ ] Incremental sync (only new/updated posts since last sync)
- [ ] Selective sync (choose specific posts/categories)
- [ ] Schedule auto-sync (daily, weekly)
- [ ] Sync direction: VolxAI → WordPress (publish back)

### Phase 3
- [ ] Two-way sync with conflict detection
- [ ] Batch operations UI (bulk edit synced posts)
- [ ] Sync history log
- [ ] Rollback/undo sync

### Phase 4
- [ ] Multi-site sync to single VolxAI account
- [ ] Content comparison tool (diff between WP and VolxAI)
- [ ] Merge changes from both sides

## Deployment Checklist

✅ Plugin updated: `lisa-content-app-plugin-with-sync.zip`
✅ Backend built and deployed
✅ Frontend built and deployed
✅ Database migration completed
✅ Unique constraint added
✅ Foreign key configured

### To deploy plugin on WordPress:
1. Download `lisa-content-app-plugin-with-sync.zip`
2. Go to https://danangchillride.com/wp-admin
3. Plugins → Add New → Upload Plugin
4. Select zip file → Install Now
5. Replace existing plugin
6. Activate (if not already)

### Verify deployment:
```bash
# Test new endpoint
curl https://danangchillride.com/wp-json/article-writer/v1/posts?per_page=1 \
  -H "X-Article-Writer-Token: aw-211d4be5cc32fce5932cda0b396c4ce4970cf9d1780937079f191ddab4418a35"

# Should return 1 post
```

## Support & Troubleshooting

### Issue: "Không thể đồng bộ bài viết"
1. Check WordPress plugin activated
2. Verify API token is correct
3. Test endpoint manually with curl
4. Check WordPress error logs: `/wp-content/debug.log`
5. Check backend logs: `ssh ... tail -f /home/jybcaorr/api.volxai.com/stderr.log`

### Issue: "Duplicate entry" error
- Unique constraint violation
- Should not happen with proper logic
- If happens: Check database for duplicates with query above
- Manual fix: Remove duplicate manually

### Issue: Sync very slow
- Too many posts (1000+)
- WordPress server slow response
- Solution: Reduce per_page, implement pagination

### Issue: Some posts not synced
- Check post status (only publish/draft are synced)
- Check content has required fields (title, content)
- Check backend logs for specific errors

---

**Documentation Version**: 1.0
**Last Updated**: 2026-01-03
**Author**: GitHub Copilot
