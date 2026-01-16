# 🔧 Fix: Đăng Bài Với Nội Dung Mới Nhất

## 🐛 Vấn Đề

Khi đăng bài lên website mà **KHÔNG lưu trước** ở VolxAI:
- ❌ Nội dung đăng lên là **nội dung CŨ** từ database
- ❌ Nội dung MỚI nhất từ editor bị BỎ QUA

**Nguyên nhân:**
1. Frontend chỉ gửi `articleId` đến backend
2. Backend query article từ database bằng `articleId`
3. Nếu chưa lưu → database có nội dung cũ → đăng lên nội dung cũ

## ✅ Giải Pháp

### Bước 1: Frontend Gửi Article Data Fresh
**File:** `/client/components/PublishModal.tsx`

```typescript
// STEP 2: Publish to WordPress
const publishResponse = await fetch(
  buildApiUrl(`/api/websites/${websiteId}/publish`),
  {
    method: "POST",
    body: JSON.stringify({
      articleId: savedArticleId,
      postType: selectedPostType,
      taxonomies: selectedTaxonomy,
      // ⭐ QUAN TRỌNG: Gửi data mới nhất từ editor
      articleData: {
        title: articleData.title,
        content: articleData.content,
        metaTitle: articleData.metaTitle || articleData.title,
        metaDescription: articleData.metaDescription || "",
        slug: articleData.slug || "",
        keywords: articleData.keywords || [],
        featuredImage: articleData.featuredImage || "",
      },
    }),
  }
);
```

### Bước 2: Backend Ưu Tiên Article Data Từ Request
**File:** `/server/routes/websites.ts`

```typescript
const handlePublishArticle: RequestHandler = async (req, res) => {
  // Lấy articleData từ request
  const { articleId, postType, taxonomies, articleData } = req.body;
  
  // Query article từ database
  const articleFromDB = await queryOne<any>(
    "SELECT * FROM articles WHERE id = ? AND user_id = ?",
    [articleId, userId]
  );
  
  // ⭐ Ưu tiên dùng articleData từ request (fresh)
  const article = articleData ? {
    ...articleFromDB,
    title: articleData.title || articleFromDB.title,
    content: articleData.content || articleFromDB.content,
    meta_title: articleData.metaTitle || articleFromDB.meta_title,
    meta_description: articleData.metaDescription || articleFromDB.meta_description,
    slug: articleData.slug || articleFromDB.slug,
    keywords: articleData.keywords || articleFromDB.keywords,
    featured_image: articleData.featuredImage || articleFromDB.featured_image,
  } : articleFromDB;
  
  console.log("✓ Using data from:", articleData ? "REQUEST (fresh)" : "DATABASE (cached)");
  
  // Tiếp tục đăng lên WordPress với article data mới nhất...
};
```

## 🎯 Cách Hoạt Động

### Flow Cũ (BUG):
```
User soạn bài → Click "Đăng bài" → Chọn website → Click "Đăng ngay"
→ Frontend gửi: {articleId: 123}
→ Backend query: SELECT * FROM articles WHERE id = 123
→ Lấy nội dung CŨ từ DB (chưa có nội dung mới)
→ Đăng lên WordPress với nội dung CŨ ❌
```

### Flow Mới (FIXED):
```
User soạn bài → Click "Đăng bài" → Chọn website → Click "Đăng ngay"

STEP 1: Lưu vào VolxAI
→ Frontend gửi: POST /api/articles/save với nội dung MỚI
→ Backend lưu vào DB → trả về savedArticleId
→ ✅ Database có nội dung MỚI

STEP 2: Đăng lên WordPress
→ Frontend gửi: POST /api/websites/:id/publish với {
    articleId: savedArticleId,
    articleData: {title, content, ...} // ⭐ Nội dung MỚI từ editor
  }
→ Backend nhận articleData từ request
→ Ưu tiên dùng articleData (fresh) thay vì query DB
→ Đăng lên WordPress với nội dung MỚI ✅
```

## 📊 So Sánh

| Tình Huống | Trước Fix | Sau Fix |
|------------|-----------|---------|
| **Soạn bài mới → Đăng luôn** | ❌ Đăng nội dung rỗng/cũ | ✅ Lưu VolxAI trước → Đăng nội dung mới |
| **Chỉnh sửa bài → Đăng luôn** | ❌ Đăng nội dung cũ (chưa lưu) | ✅ Lưu VolxAI trước → Đăng nội dung mới |
| **Lưu trước → Đăng sau** | ✅ OK (đã có trong DB) | ✅ OK (vẫn gửi fresh data) |
| **Đăng lại bài cũ** | ✅ OK (query từ DB) | ✅ OK (fallback to DB nếu không có articleData) |

## 🔍 Debug Logs

Console sẽ hiển thị:

```javascript
// Frontend
🎯 handlePublishNow called!
📝 STEP 1: Saving to VolxAI.com first...
✅ STEP 1 SUCCESS - Saved to VolxAI.com!
Saved article ID: 456

🚀 STEP 2: Publishing to WordPress...
```

```typescript
// Backend
🚀 PUBLISH ARTICLE REQUEST:
Website ID: 1
Article ID: 456
Post Type: post
Taxonomies: {...}
Has articleData: true  // ⭐ Có data từ request

✓ Website found: https://example.com
✓ Article found: Test Article
✓ Using data from: REQUEST (fresh)  // ⭐ Dùng data mới từ request, không query DB
```

## 📦 Files Đã Sửa

### 1. `/client/components/PublishModal.tsx`
**Thay đổi:** Gửi `articleData` trong request publish

```typescript
// Before
body: JSON.stringify({
  articleId: savedArticleId,
  postType: selectedPostType,
  taxonomies: selectedTaxonomy,
})

// After
body: JSON.stringify({
  articleId: savedArticleId,
  postType: selectedPostType,
  taxonomies: selectedTaxonomy,
  articleData: {  // ⭐ Thêm article data mới
    title: articleData.title,
    content: articleData.content,
    metaTitle: articleData.metaTitle,
    // ...
  },
})
```

### 2. `/server/routes/websites.ts`
**Thay đổi:** Nhận và ưu tiên `articleData` từ request

```typescript
// Before
const { articleId, postType, taxonomies } = req.body;
const article = await queryOne(...); // Query từ DB

// After
const { articleId, postType, taxonomies, articleData } = req.body;
const articleFromDB = await queryOne(...);
const article = articleData ? {
  ...articleFromDB,
  title: articleData.title || articleFromDB.title,
  content: articleData.content || articleFromDB.content,
  // Merge fresh data với DB data
} : articleFromDB;
```

## 🧪 Test Cases

### Test 1: Soạn Bài Mới → Đăng Luôn
```
1. Vào trang viết bài mới
2. Nhập title: "Test Fresh Content"
3. Nhập content: "This is NEW content"
4. Click "Đăng bài" (KHÔNG click "Lưu" trước)
5. Chọn website → Click "Đăng ngay"

Expected:
✅ STEP 1: Lưu vào VolxAI với "This is NEW content"
✅ STEP 2: Đăng lên WordPress với "This is NEW content"
✅ Bài viết trên WordPress có đúng nội dung mới
```

### Test 2: Chỉnh Sửa Bài → Đăng Luôn
```
1. Mở bài viết có sẵn (content cũ: "Old content")
2. Sửa content thành: "Updated content"
3. Click "Đăng bài" (KHÔNG click "Lưu" trước)
4. Chọn website → Click "Đăng ngay"

Expected:
✅ STEP 1: Cập nhật VolxAI với "Updated content"
✅ STEP 2: Đăng/Cập nhật WordPress với "Updated content"
✅ WordPress có nội dung mới "Updated content"
```

### Test 3: Lưu Trước → Đăng Sau
```
1. Soạn bài → Click "Lưu"
2. Sau đó click "Đăng bài" → Chọn website → "Đăng ngay"

Expected:
✅ STEP 1: Lưu lại (update nếu đã có ID)
✅ STEP 2: Đăng với nội dung từ articleData (vẫn fresh)
✅ Hoạt động bình thường
```

## 🚀 Deployment

### Build:
```bash
npm run build
```

Output:
```
dist/spa/assets/index-BuGVatTB.js   928.34 kB
dist/server/node-build.mjs          154.64 kB
✓ built in 1.92s
```

### Deploy:
```bash
# Copy files to server
scp -P 2210 dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:~/public_html/
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/server/

# Restart server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/restart.txt"
```

## ✅ Verification Checklist

Sau khi deploy, verify:

- [ ] Soạn bài mới → Đăng luôn → Check WordPress có nội dung mới
- [ ] Sửa bài cũ → Đăng luôn → Check WordPress có nội dung updated
- [ ] Check Console logs: "Using data from: REQUEST (fresh)"
- [ ] Check Network tab: request có chứa `articleData`
- [ ] Lưu trước → Đăng sau → Vẫn hoạt động bình thường

## 📝 Technical Notes

**Tại sao cần gửi articleData trong request?**
- Editor có nội dung MỚI nhất (user vừa soạn)
- Database có nội dung CŨ (chưa lưu)
- Gửi articleData = đảm bảo đăng nội dung MỚI nhất

**Fallback mechanism:**
- Nếu có `articleData` → dùng (fresh from editor)
- Nếu không có → query DB (backward compatibility)

**Performance:**
- Thêm ~1-2KB payload (articleData)
- Tránh race condition (lưu xong mới đăng)
- Đảm bảo data consistency

---

**Ngày fix:** 5/1/2026  
**Version:** 2.2.0  
**Build:** index-BuGVatTB.js
