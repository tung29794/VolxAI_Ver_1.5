# 📤 Publish Modal Feature - Hướng dẫn sử dụng

## 🎯 Tính năng mới

Khi viết hoặc chỉnh sửa bài viết, click nút **"Đăng bài"** hoặc **"Cập nhật"** sẽ hiển thị modal để:
- Chọn website đăng lên
- Chọn Post Type (nếu là WordPress)
- Chọn chuyên mục/taxonomy
- Đăng ngay hoặc hẹn giờ đăng bài

## 📋 Chức năng chi tiết

### 1. Chọn Website
- **Tạm lưu ở VolxAI.com**: Lưu bài viết vào database VolxAI (không đăng lên website nào)
- **Website đã liên kết**: Chọn từ danh sách các website WordPress đã kết nối qua API

### 2. Chọn Post Type (chỉ với WordPress)
- Tự động load danh sách post types từ WordPress
- Bao gồm: Post, Page, Custom Post Types
- Hiển thị loading spinner khi đang tải

### 3. Chọn Chuyên mục
- **Post Type = Post**: Hiển thị Categories
- **Post Type = Custom**: Hiển thị Taxonomies tương ứng
- **Post Type = Page**: Không hiển thị (pages không có taxonomy)
- Có thể chọn nhiều taxonomy khác nhau

### 4. Đăng bài

#### A. Đăng ngay
- Click nút **"Đăng ngay"** hoặc **"Cập nhật ngay"**
- Bài viết được đăng lên website ngay lập tức
- Nếu chọn "Tạm lưu ở VolxAI.com": Lưu với status "published" trong database

#### B. Hẹn giờ đăng bài
**Chỉ có khi chọn website WordPress (không có với "Tạm lưu ở VolxAI.com")**

1. Chọn **Ngày đăng** từ calendar
2. Chọn **Giờ đăng** (format 24h: HH:MM)
3. Click nút **"Hẹn giờ"**
4. Bài viết được tạo với status `future` trên WordPress
5. WordPress tự động publish vào thời gian đã chọn

**Lưu ý:**
- Ngày giờ phải ở tương lai (không thể chọn quá khứ)
- Nếu chọn "Tạm lưu ở VolxAI.com": Nút "Hẹn giờ" không có tác dụng, chỉ lưu bình thường

## 🔧 Technical Details

### Files Changed

#### Frontend
1. **client/components/PublishModal.tsx** (NEW)
   - Component modal đầy đủ
   - Fetch websites, post types, taxonomies
   - Handle publish và schedule publish
   
2. **client/pages/ArticleEditor.tsx** (UPDATED)
   - Import PublishModal
   - Thêm state `showPublishModal`
   - Sửa `handleSaveArticle` để mở modal thay vì save trực tiếp
   - Tạo hàm `handleSaveDraft` riêng cho draft
   - Tạo hàm `handlePublishSuccess` cho callback

#### Backend
3. **server/routes/websites.ts** (UPDATED)
   - Thêm handler `handleSchedulePublish`
   - Thêm route `POST /api/websites/:id/schedule-publish`
   - Support WordPress scheduled posts với status `future`

### API Endpoints

#### 1. GET /api/websites
Lấy danh sách websites đã liên kết

**Response:**
```json
[
  {
    "id": 1,
    "name": "My Website",
    "url": "https://example.com",
    "platform": "wordpress"
  }
]
```

#### 2. GET /api/websites/:id/post-types
Lấy danh sách post types từ WordPress

**Response:**
```json
[
  { "slug": "post", "label": "Posts" },
  { "slug": "page", "label": "Pages" },
  { "slug": "product", "label": "Products" }
]
```

#### 3. GET /api/websites/:id/taxonomies?postType=post
Lấy taxonomies cho post type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "category",
      "label": "Categories",
      "terms": [
        { "id": 1, "name": "News" },
        { "id": 2, "name": "Blog" }
      ]
    }
  ]
}
```

#### 4. POST /api/websites/:id/publish
Đăng bài ngay

**Request:**
```json
{
  "articleId": 123,
  "postType": "post",
  "taxonomies": {
    "category": 1,
    "post_tag": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Article published successfully!",
  "data": {
    "wordpressPostId": 456,
    "wordpressUrl": "https://example.com/?p=456",
    "action": "created"
  }
}
```

#### 5. POST /api/websites/:id/schedule-publish (NEW)
Hẹn giờ đăng bài

**Request:**
```json
{
  "articleId": 123,
  "postType": "post",
  "taxonomies": { "category": 1 },
  "scheduledTime": "2026-01-10T14:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Article scheduled for publishing successfully!",
  "data": {
    "wordpressPostId": 456,
    "wordpressUrl": "https://example.com/?p=456",
    "scheduledTime": "2026-01-10T14:30:00.000Z",
    "action": "created"
  }
}
```

## 🚀 Deployment

### 1. Build
```bash
npm run build
```

### 2. Upload Backend
```bash
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/api.volxai.com/
```

### 3. Upload Frontend
```bash
scp -P 2210 -r dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:~/public_html/
```

### 4. Restart Backend
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/api.volxai.com/tmp/restart.txt"
```

## ✅ Testing Checklist

### Test 1: Lưu vào VolxAI.com
- [ ] Viết bài mới
- [ ] Click "Đăng bài"
- [ ] Chọn "Tạm lưu ở VolxAI.com"
- [ ] Click "Đăng ngay"
- [ ] Kiểm tra bài viết có status "published" trong database

### Test 2: Đăng lên WordPress ngay
- [ ] Viết bài mới
- [ ] Click "Đăng bài"
- [ ] Chọn website WordPress
- [ ] Chọn Post Type = "Post"
- [ ] Chọn Category
- [ ] Click "Đăng ngay"
- [ ] Kiểm tra bài viết xuất hiện trên WordPress

### Test 3: Đăng Custom Post Type
- [ ] Viết bài mới
- [ ] Click "Đăng bài"
- [ ] Chọn website WordPress
- [ ] Chọn Post Type = Custom (vd: "where-to-go")
- [ ] Chọn Taxonomy tương ứng
- [ ] Click "Đăng ngay"
- [ ] Kiểm tra bài viết xuất hiện đúng custom post type

### Test 4: Hẹn giờ đăng bài
- [ ] Viết bài mới
- [ ] Click "Đăng bài"
- [ ] Chọn website WordPress
- [ ] Chọn Post Type
- [ ] Chọn ngày giờ tương lai
- [ ] Click "Hẹn giờ"
- [ ] Vào WordPress Admin → Posts → Scheduled
- [ ] Kiểm tra bài viết có status "Scheduled"

### Test 5: Cập nhật bài đã đăng
- [ ] Mở bài viết đã đăng
- [ ] Chỉnh sửa nội dung
- [ ] Click "Cập nhật"
- [ ] Modal hiển thị mode "update"
- [ ] Chọn website
- [ ] Click "Cập nhật ngay"
- [ ] Kiểm tra bài viết được update trên WordPress

## 🐛 Troubleshooting

### Modal không hiện
- Check console log
- Verify `showPublishModal` state
- Check import PublishModal component

### Không load được Post Types
- Kiểm tra website đã kết nối
- Verify WordPress plugin active
- Check API token đúng
- Xem network tab trong DevTools

### Không load được Taxonomies
- Kiểm tra post type đã chọn
- Verify endpoint `/taxonomies?postType=xxx`
- Check WordPress plugin có endpoint này
- Xem response trong DevTools

### Hẹn giờ không hoạt động
- Kiểm tra thời gian chọn phải ở tương lai
- Verify WordPress cron job hoạt động
- Check status post = "future" trên WordPress
- Xem wp-cron.php có chạy không

## 📝 Notes

- Modal tự động ẩn phần Schedule nếu chọn "Tạm lưu ở VolxAI.com"
- Modal tự động load post types khi chọn website WordPress
- Modal tự động load taxonomies khi chọn post type (trừ page)
- Calendar chỉ cho phép chọn ngày từ hôm nay trở đi
- Time input sử dụng HTML5 native time picker
- Tất cả errors được hiển thị qua toast notification
- Modal có loading state cho mỗi action
