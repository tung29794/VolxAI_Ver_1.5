# Đơn Giản Hóa Modal Đăng Bài - Trang Viết Bài Mới

## 📋 Mục Tiêu
Khi user click nút "Đăng bài" ở trang viết bài mới (/write-article), modal chỉ hiển thị nút **"Tạm lưu ở VolxAI.com"** thay vì form phức tạp với đăng lên website.

## ✅ Những Gì Đã Làm

### 1. Tạo Component Mới: SaveDraftModal
**File:** `/client/components/SaveDraftModal.tsx`

Component mới này chỉ có:
- ✅ Hiển thị thông tin bài viết (tiêu đề, nội dung preview, trạng thái)
- ✅ Nút "Tạm lưu ở VolxAI.com" để lưu bản nháp
- ✅ Nút "Hủy" để đóng modal
- ❌ KHÔNG có form chọn website
- ❌ KHÔNG có form chọn post type
- ❌ KHÔNG có form chọn categories/tags
- ❌ KHÔNG có hẹn giờ đăng bài

### 2. Cập Nhật ArticleEditor.tsx
**File:** `/client/pages/ArticleEditor.tsx`

#### Thay đổi:
```typescript
// Import thêm SaveDraftModal
import SaveDraftModal from "@/components/SaveDraftModal";

// Thêm state cho SaveDraftModal
const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);

// Logic mở modal phù hợp
if (status === "published") {
  if (isUserMode) {
    setShowSaveDraftModal(true);  // User → Modal đơn giản
  } else {
    setShowPublishModal(true);     // Admin → Modal đầy đủ
  }
}

// Thêm SaveDraftModal vào render
<SaveDraftModal
  isOpen={showSaveDraftModal}
  onClose={() => setShowSaveDraftModal(false)}
  articleId={id ? parseInt(id) : undefined}
  articleData={{...}}
  onSaveSuccess={handlePublishSuccess}
/>
```

## 🎯 Cách Hoạt Động

### User Mode (/write-article)
```
User viết bài → Click "Đăng bài" 
→ SaveDraftModal mở ra
→ Chỉ có nút "Tạm lưu ở VolxAI.com"
→ Click → Lưu bản nháp → Thành công ✅
```

### Admin Mode (/admin/articles/edit/:id)
```
Admin viết bài → Click "Đăng bài"
→ PublishModal mở ra (modal cũ)
→ Có đầy đủ options: chọn website, post type, taxonomies
→ Đăng lên WordPress hoặc lưu VolxAI ✅
```

## 📦 Files Đã Sửa

1. ✅ `/client/components/SaveDraftModal.tsx` - Tạo mới
2. ✅ `/client/pages/ArticleEditor.tsx` - Cập nhật logic modal

## 🧪 Test Checklist

- [ ] Vào trang `/write-article`
- [ ] Viết tiêu đề và nội dung
- [ ] Click nút "Đăng bài"
- [ ] Kiểm tra modal chỉ có nút "Tạm lưu ở VolxAI.com"
- [ ] Click "Tạm lưu ở VolxAI.com" → Bài viết được lưu thành công
- [ ] Vào trang admin `/admin/articles` → Vẫn có modal đầy đủ

## 📝 Ghi Chú

### Điểm Khác Biệt Giữa 2 Modal:

#### SaveDraftModal (User - Modal Đơn Giản)
- Chỉ lưu vào database VolxAI
- Trạng thái: "draft"
- Không cần chọn website
- Không cần chọn post type/taxonomies
- UI đơn giản, nhanh gọn

#### PublishModal (Admin - Modal Đầy Đủ)
- Có thể đăng lên WordPress
- Có thể lưu vào VolxAI
- Chọn website, post type, categories, tags
- Hẹn giờ đăng bài
- UI phức tạp, nhiều options

## 🚀 Deployment

Build đã hoàn tất:
```bash
npm run build:client
```

Kết quả:
```
✓ 1958 modules transformed.
dist/spa/index.html                   0.41 kB │ gzip:   0.27 kB
dist/spa/assets/index-CRo0yfEy.css  103.91 kB │ gzip:  17.10 kB
dist/spa/assets/index-UWY2VeaO.js   926.44 kB │ gzip: 254.78 kB
✓ built in 1.95s
```

## ✨ Tổng Kết

✅ **Hoàn thành:** Modal đơn giản cho user chỉ với nút "Tạm lưu ở VolxAI.com"
✅ **Giữ nguyên:** Modal đầy đủ cho admin với tất cả chức năng đăng lên website
✅ **Code:** Clean, tách biệt rõ ràng giữa user mode và admin mode

---

**Ngày tạo:** 5/1/2026
**Phiên bản:** 1.0.0
