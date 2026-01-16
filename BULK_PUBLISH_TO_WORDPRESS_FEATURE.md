# Bulk Publish to WordPress Feature

## Tổng quan

Tính năng cho phép đăng hàng loạt nhiều bài viết lên WordPress với các tùy chọn:
- **Chọn Website**: Chọn website WordPress đích
- **Chọn Post Type**: Chọn loại post (post, page, hoặc custom post types)
- **Tự động cập nhật**: Nếu bài viết đã tồn tại trên WordPress, hệ thống sẽ cập nhật thay vì tạo mới
- **Bulk actions**: Chọn nhiều bài viết và đăng cùng lúc

## Các tính năng chính

### 1. Post Type Selection
- Tự động lấy danh sách post types từ WordPress
- Hiển thị label và số lượng bài viết của mỗi post type
- Default: `post`

### 2. Smart Update Logic
- Kiểm tra `wordpress_post_id` và `website_id` trong database
- Nếu bài viết đã có WordPress ID → **Cập nhật**
- Nếu chưa có → **Tạo mới**
- Tracking: Hiển thị số bài "mới" và "cập nhật"

### 3. Bulk Publishing
- Chọn nhiều bài viết qua checkbox
- Publish song song (parallel) với Promise.all()
- Progress tracking: "Đã xử lý X/Y bài viết (Z mới, T cập nhật)"

## Backend API

### 1. Get Post Types
```http
GET /api/websites/:websiteId/post-types
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "post",
      "label": "Posts",
      "singular": "Post",
      "count": 25,
      "hierarchical": false
    },
    {
      "name": "page",
      "label": "Pages",
      "singular": "Page",
      "count": 10,
      "hierarchical": true
    }
  ]
}
```

### 2. Publish Article
```http
POST /api/websites/:websiteId/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "articleId": 123,
  "postType": "post"
}
```

**Response (New Post):**
```json
{
  "success": true,
  "message": "Article created successfully on WordPress",
  "data": {
    "articleId": 123,
    "wordpressPostId": 456,
    "wordpressUrl": "https://example.com/blog/post-title",
    "action": "created"
  }
}
```

**Response (Updated Post):**
```json
{
  "success": true,
  "message": "Article updated successfully on WordPress",
  "data": {
    "articleId": 123,
    "wordpressPostId": 456,
    "wordpressUrl": "https://example.com/blog/post-title",
    "action": "updated"
  }
}
```

## WordPress Plugin Requirements

Plugin phải có các endpoints sau:

### 1. Publish Endpoint
```php
POST /wp-json/article-writer/v1/publish
```

### 2. Update Endpoint
```php
POST /wp-json/article-writer/v1/update/:postId
```

### 3. Get Post Types Endpoint
```php
GET /wp-json/article-writer/v1/post-types
```

## Database Schema

### Table: articles

Các field liên quan:
- `wordpress_post_id`: INT - ID của post trên WordPress
- `website_id`: INT - ID của website (FK to websites table)
- `post_type`: VARCHAR(50) - Loại post (post, page, custom)

```sql
ALTER TABLE articles 
ADD COLUMN wordpress_post_id INT NULL,
ADD COLUMN website_id INT NULL,
ADD COLUMN post_type VARCHAR(50) DEFAULT 'post';
```

## Frontend Implementation

### File: client/components/UserArticles.tsx

#### State Variables
```tsx
const [selectedWebsite, setSelectedWebsite] = useState<string>("");
const [postTypes, setPostTypes] = useState<any[]>([]);
const [selectedPostType, setSelectedPostType] = useState<string>("post");
```

#### Functions

**fetchPostTypes()**: Lấy danh sách post types từ WordPress
```tsx
const fetchPostTypes = async (websiteId: string) => {
  const response = await fetch(
    buildApiUrl(`/api/websites/${websiteId}/post-types`),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (data.success) {
    setPostTypes(data.data);
  }
};
```

**handleBulkPublish()**: Publish nhiều bài viết
```tsx
const handleBulkPublish = async () => {
  const publishPromises = Array.from(selectedArticles).map(articleId =>
    fetch(buildApiUrl(`/api/websites/${selectedWebsite}/publish`), {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ articleId, postType: selectedPostType }),
    })
  );
  
  const results = await Promise.all(publishPromises);
  // Process results...
};
```

#### UI Components

**Bulk Action Bar:**
```tsx
{selectedArticles.size > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-center gap-3">
      {/* Website Selector */}
      <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Chọn website" />
        </SelectTrigger>
        <SelectContent>
          {websites.map((website) => (
            <SelectItem key={website.id} value={website.id.toString()}>
              {website.name || website.url}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Post Type Selector (conditional) */}
      {selectedWebsite && postTypes.length > 0 && (
        <Select value={selectedPostType} onValueChange={setSelectedPostType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Post Type" />
          </SelectTrigger>
          <SelectContent>
            {postTypes.map((postType) => (
              <SelectItem key={postType.name} value={postType.name}>
                {postType.label} ({postType.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Publish Button */}
      <Button
        onClick={handleBulkPublish}
        disabled={bulkActionLoading || !selectedWebsite || !selectedPostType}
        className="bg-green-600 hover:bg-green-700"
      >
        <Upload className="w-4 h-4 mr-2" />
        {bulkActionLoading ? "Đang đăng..." : "Đăng lên Website"}
      </Button>
    </div>
  </div>
)}
```

## User Flow

1. **Chọn bài viết**: Click checkbox để chọn 1 hoặc nhiều bài viết
2. **Bulk action bar hiện ra**: Thanh action màu xanh xuất hiện
3. **Chọn website**: Dropdown hiển thị danh sách websites đã kết nối
4. **Chọn post type**: Dropdown hiển thị post types của website (tự động load khi chọn website)
5. **Click "Đăng lên Website"**:
   - Hệ thống kiểm tra từng bài viết
   - Nếu đã có WordPress ID → Gọi UPDATE endpoint
   - Nếu chưa có → Gọi CREATE endpoint
   - Hiển thị kết quả: "Đã xử lý 5/5 bài viết (3 mới) (2 cập nhật)"

## Smart Update Logic

### Backend Logic (handlePublishArticle)

```typescript
// Check if article already published to this website
const existingWordPressPostId = 
  article.wordpress_post_id && article.website_id === parseInt(websiteId)
    ? article.wordpress_post_id
    : null;

if (existingWordPressPostId) {
  // UPDATE existing post
  wpResponse = await fetch(
    `${website.url}/wp-json/article-writer/v1/update/${existingWordPressPostId}`,
    { method: "POST", body: JSON.stringify(postData) }
  );
  action = "updated";
} else {
  // CREATE new post
  wpResponse = await fetch(
    `${website.url}/wp-json/article-writer/v1/publish`,
    { method: "POST", body: JSON.stringify(postData) }
  );
  action = "created";
}

// Update database
await execute(
  `UPDATE articles 
   SET wordpress_post_id = ?, website_id = ?, post_type = ?
   WHERE id = ?`,
  [wpPostId, websiteId, postType, articleId]
);
```

### Frontend Result Display

```typescript
const successResults = await Promise.all(
  results.filter(r => r.ok).map(r => r.json())
);

const updatedCount = successResults.filter(
  (r: any) => r.data?.action === 'updated'
).length;

const createdCount = successResults.filter(
  (r: any) => r.data?.action === 'created'
).length;

let message = `Đã xử lý ${successCount}/${selectedArticles.size} bài viết`;
if (createdCount > 0) message += ` (${createdCount} mới)`;
if (updatedCount > 0) message += ` (${updatedCount} cập nhật)`;

toast.success(message);
```

## Error Handling

### Validation Errors
- "Vui lòng chọn ít nhất một bài viết"
- "Vui lòng chọn website để đăng bài"
- "Vui lòng chọn post type"

### API Errors
- "Article not found" - Bài viết không tồn tại
- "Website not found" - Website không tồn tại hoặc không thuộc user
- "Failed to publish to WordPress" - Lỗi khi gọi WordPress API
- "WordPress API error" - WordPress trả về lỗi

### Network Errors
- Retry logic không được implement
- User cần refresh và thử lại

## Performance Considerations

### Parallel Execution
- Sử dụng `Promise.all()` để publish song song
- Tối đa số requests song song: Không giới hạn (tùy browser)
- Trade-off: Nhanh hơn nhưng có thể overload server

### Optimization Ideas
1. **Batch API**: Tạo endpoint nhận array của articleIds
2. **Queue System**: Sử dụng job queue (Bull, Bee-Queue)
3. **Rate Limiting**: Giới hạn số requests/giây
4. **Progress Indicator**: Real-time progress updates via WebSocket

## Testing

### Manual Testing Steps

1. **Test Create New**:
   - Chọn bài viết chưa publish
   - Chọn website và post type
   - Click "Đăng lên Website"
   - Verify: Toast hiển thị "X mới"
   - Verify: Bài viết xuất hiện trên WordPress
   - Verify: Database có `wordpress_post_id` và `website_id`

2. **Test Update Existing**:
   - Chọn bài viết đã publish (có wordpress_post_id)
   - Sửa nội dung bài viết
   - Click "Đăng lên Website"
   - Verify: Toast hiển thị "X cập nhật"
   - Verify: Nội dung trên WordPress được cập nhật

3. **Test Mixed (New + Update)**:
   - Chọn 2 bài: 1 mới, 1 cũ
   - Click "Đăng lên Website"
   - Verify: Toast hiển thị "(1 mới) (1 cập nhật)"

4. **Test Different Post Types**:
   - Chọn post type "page"
   - Publish bài viết
   - Verify: Bài viết tạo dưới dạng Page trên WordPress

### Error Scenarios

1. **Invalid Website**:
   - Xóa website trên database
   - Try publish → Should show "Website not found"

2. **Invalid Article**:
   - Xóa article trên database
   - Try publish → Should show "Article not found"

3. **WordPress API Down**:
   - Stop WordPress site
   - Try publish → Should show error message

4. **Invalid API Token**:
   - Change website API token to invalid value
   - Try publish → Should show "Invalid or expired API Token"

## Deployment

### Frontend
```bash
npm run build
rsync -avz --delete -e "ssh -p 2210" dist/spa/ jybcaorr@103.221.221.67:~/public_html/
```

### Backend
```bash
rsync -avz -e "ssh -p 2210" dist/server/ jybcaorr@103.221.221.67:~/api_server/
ssh -p 2210 jybcaorr@103.221.221.67 "cd ~/api_server && pm2 restart all"
```

### .htaccess
```bash
rsync -avz -e "ssh -p 2210" public_html/.htaccess jybcaorr@103.221.221.67:~/public_html/
```

## Production URLs

- **Frontend**: https://volxai.com
- **Backend API**: https://api.volxai.com
- **WordPress Site Example**: https://danangchillride.com

## Future Enhancements

### Priority: HIGH
1. **Batch Publish API**: Single endpoint nhận nhiều articleIds
2. **Progress Bar**: Real-time progress updates
3. **Retry Failed**: Tự động retry failed requests

### Priority: MEDIUM
4. **Schedule Publishing**: Đặt lịch đăng bài
5. **Category Mapping**: Map categories giữa VolxAI và WordPress
6. **Tag Syncing**: Sync tags khi publish

### Priority: LOW
7. **Rollback Feature**: Hoàn tác publish
8. **Draft Preview**: Preview trước khi publish
9. **Publish History**: Lịch sử publish của bài viết

## Related Documentation

- [BULK_ACTIONS_FEATURE.md](./BULK_ACTIONS_FEATURE.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [WordPress Plugin Documentation](./lisa-content-app-plugin/README.md)

---

**Implemented**: January 3, 2026  
**Status**: ✅ Deployed to Production  
**Version**: 1.5.1
