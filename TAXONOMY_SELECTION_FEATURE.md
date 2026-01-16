# Tính năng chọn Category/Taxonomy khi đăng bài

## Ngày thực hiện: 4 tháng 1, 2026

## Mô tả tính năng

Thêm khả năng chọn category/taxonomy khi đăng bài lên WordPress, với logic:
- **Post Type = "post"**: Hiển thị select cho Categories (taxonomy "category")
- **Post Type = Custom Post Type**: Hiển thị select cho Taxonomies tương ứng với post type đó
- **Post Type = "page"**: KHÔNG hiển thị select nào (pages không có taxonomy)

## Các thay đổi thực hiện

### 1. WordPress Plugin - Thêm API Endpoint mới

#### File: `lisa-content-app-plugin/includes/class-api-handler.php`

**A. Đăng ký route mới:**
```php
// Get taxonomies for a specific post type
register_rest_route(
    'article-writer/v1',
    '/taxonomies',
    [
        'methods' => 'GET',
        'callback' => [self::class, 'handle_get_taxonomies'],
        'permission_callback' => [self::class, 'check_api_token'],
    ]
);
```

**B. Handler mới `handle_get_taxonomies`:**
- Lấy tất cả taxonomies liên kết với post type
- Lấy tất cả terms của mỗi taxonomy
- Trả về danh sách taxonomies với terms
- Skip taxonomy "post_format"

**C. Cập nhật `handle_publish_request`:**
```php
// Add taxonomies if provided
if (!empty($params['taxonomies']) && is_array($params['taxonomies'])) {
    foreach ($params['taxonomies'] as $taxonomy => $term_id) {
        if (!empty($term_id) && $term_id > 0) {
            wp_set_post_terms($post_id, intval($term_id), $taxonomy);
        }
    }
}
```

**D. Cập nhật `handle_update_request`:**
- Thêm logic tương tự để update taxonomies khi update post

### 2. Backend API - Node.js/Express

#### File: `server/routes/websites.ts`

**A. Handler mới `handleGetTaxonomies`:**
```typescript
GET /api/websites/:id/taxonomies?post_type=post
```
- Verify user ownership
- Fetch taxonomies từ WordPress API
- Return taxonomies data

**B. Đăng ký route:**
```typescript
router.get("/:id/taxonomies", handleGetTaxonomies);
```

**C. Cập nhật `handlePublishArticle`:**
```typescript
const { articleId, postType = 'post', taxonomies = {} } = req.body;

// Add taxonomies to postData
if (taxonomies && Object.keys(taxonomies).length > 0) {
  postData.taxonomies = taxonomies;
}
```

### 3. Frontend - React Component

#### File: `client/components/UserArticles.tsx`

**A. State mới:**
```typescript
const [taxonomies, setTaxonomies] = useState<any[]>([]);
const [selectedTaxonomy, setSelectedTaxonomy] = useState<Record<string, number>>({});
```

**B. Fetch taxonomies function:**
```typescript
const fetchTaxonomies = async (websiteId: string, postType: string) => {
  const response = await fetch(
    buildApiUrl(`/api/websites/${websiteId}/taxonomies?post_type=${postType}`)
  );
  const data = await response.json();
  if (data.success) {
    setTaxonomies(data.data || []);
    setSelectedTaxonomy({});
  }
};
```

**C. useEffect để fetch taxonomies:**
```typescript
useEffect(() => {
  if (selectedWebsite && selectedPostType) {
    fetchTaxonomies(selectedWebsite, selectedPostType);
  } else {
    setTaxonomies([]);
    setSelectedTaxonomy({});
  }
}, [selectedWebsite, selectedPostType]);
```

**D. UI - Taxonomy Selects:**
```tsx
{/* Only show if post type is not "page" */}
{selectedWebsite && selectedPostType && selectedPostType !== 'page' && taxonomies.length > 0 && (
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
    {taxonomies.map((taxonomy) => (
      <Select
        key={taxonomy.name}
        value={selectedTaxonomy[taxonomy.name]?.toString() || ""}
        onValueChange={(value) => {
          setSelectedTaxonomy({
            ...selectedTaxonomy,
            [taxonomy.name]: parseInt(value)
          });
        }}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder={`Chọn ${taxonomy.label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Không chọn {taxonomy.label}</SelectItem>
          {taxonomy.terms.map((term: any) => (
            <SelectItem key={term.id} value={term.id.toString()}>
              {term.name} ({term.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ))}
  </div>
)}
```

**E. Cập nhật handleBulkPublish:**
```typescript
const body: any = { 
  articleId,
  postType: selectedPostType 
};

// Add taxonomy terms if selected
if (Object.keys(selectedTaxonomy).length > 0) {
  body.taxonomies = selectedTaxonomy;
}
```

## Luồng hoạt động

1. **User chọn website** → Fetch post types
2. **User chọn post type** → Fetch taxonomies cho post type đó
3. **Hiển thị taxonomy selects**:
   - Nếu post type = "page" → KHÔNG hiển thị
   - Nếu post type khác → Hiển thị tất cả taxonomies liên quan
4. **User chọn terms** từ các taxonomy
5. **User click "Đăng lên Website"** → Gửi data bao gồm taxonomies
6. **Backend nhận request** → Forward đến WordPress
7. **WordPress plugin** → Set terms cho post

## Cấu trúc dữ liệu

### API Response - Get Taxonomies
```json
{
  "success": true,
  "post_type": "post",
  "count": 2,
  "taxonomies": [
    {
      "name": "category",
      "label": "Categories",
      "singular": "Category",
      "hierarchical": true,
      "public": true,
      "terms": [
        {
          "id": 1,
          "name": "Uncategorized",
          "slug": "uncategorized",
          "count": 5,
          "parent": 0
        }
      ],
      "count": 1
    },
    {
      "name": "post_tag",
      "label": "Tags",
      "singular": "Tag",
      "hierarchical": false,
      "public": true,
      "terms": [
        {
          "id": 10,
          "name": "Technology",
          "slug": "technology",
          "count": 3,
          "parent": 0
        }
      ],
      "count": 5
    }
  ]
}
```

### Publish Request Body
```json
{
  "articleId": 123,
  "postType": "post",
  "taxonomies": {
    "category": 1,
    "post_tag": 10
  }
}
```

## Testing

### Test Cases
1. ✅ Chọn post type = "post" → Hiện Categories và Tags
2. ✅ Chọn post type = "page" → KHÔNG hiện taxonomy selects
3. ✅ Chọn custom post type → Hiện taxonomies tương ứng
4. ✅ Đăng bài với category được chọn
5. ✅ Đăng bài không chọn category (skip)
6. ✅ Update bài với taxonomy mới

### Kiểm tra WordPress
1. Vào WordPress admin
2. Kiểm tra post đã được assign đúng category/taxonomy
3. Verify trong database: `wp_term_relationships` table

## Files đã chỉnh sửa

1. ✅ `lisa-content-app-plugin/includes/class-api-handler.php`
2. ✅ `server/routes/websites.ts`
3. ✅ `client/components/UserArticles.tsx`

## Deployment

### 1. WordPress Plugin
```bash
# Upload plugin file đã cập nhật lên server
# Hoặc update qua FTP/cPanel File Manager
```

### 2. Backend
```bash
cd server
npm run build
pm2 restart volxai-backend
```

### 3. Frontend
```bash
cd client
npm run build
```

## Lưu ý

- Taxonomy "post_format" được skip tự động
- Nếu không chọn taxonomy, sẽ không gán term nào (giữ nguyên default)
- Hỗ trợ nhiều taxonomies cùng lúc (category + tags + custom taxonomies)
- Responsive trên mobile

## Tương lai

- [ ] Thêm khả năng chọn multiple terms cho một taxonomy
- [ ] Tạo term mới trực tiếp từ UI
- [ ] Preview terms hierarchy (cho hierarchical taxonomies)
