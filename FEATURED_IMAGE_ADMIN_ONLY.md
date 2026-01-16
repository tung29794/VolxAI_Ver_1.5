# Chức năng "Ảnh đại diện" - Chỉ dành cho Admin

## 📝 Yêu cầu

Trong trang `/admin/articles/new` (ArticleEditor), chức năng "Ảnh đại diện" chỉ được hiển thị cho **admin**, với các user khác thì ẩn đi.

## ✅ Đã hoàn thành

### 1. Import useAuth từ AuthContext

```tsx
import { useAuth } from "@/contexts/AuthContext";
```

### 2. Lấy thông tin user và check role

```tsx
export default function ArticleEditor({ hideFeaturedImage = false }: ArticleEditorProps) {
  const { user } = useAuth(); // Get current user from AuthContext
  
  // Check if user is admin
  const isAdmin = user?.role === "admin";
  
  // ... rest of code
}
```

### 3. Cập nhật điều kiện hiển thị "Ảnh đại diện"

**Trước:**
```tsx
{!hideFeaturedImage && (
  <div>
    <Label>Ảnh đại diện</Label>
    {/* ... featured image UI ... */}
  </div>
)}
```

**Sau:**
```tsx
{!hideFeaturedImage && isAdmin && (
  <div>
    <Label>Ảnh đại diện</Label>
    {/* ... featured image UI ... */}
  </div>
)}
```

### 4. Xóa state isAdmin cũ

Trước đây code có:
```tsx
const [isAdmin, setIsAdmin] = useState(false);

// Load from article
if (article.username) {
  setIsAdmin(article.username === 'admin');
}
```

Đã xóa và thay bằng:
```tsx
const isAdmin = user?.role === "admin"; // From AuthContext
```

## 🎯 Kết quả

### Admin user (`role: "admin"`):
- ✅ Nhìn thấy section "Ảnh đại diện"
- ✅ Có thể nhập URL ảnh
- ✅ Có thể upload ảnh từ máy tính
- ✅ Có thể xóa ảnh (Remove button)

### Non-admin user (`role: "user"`):
- ❌ **KHÔNG** nhìn thấy section "Ảnh đại diện"
- ✅ Vẫn có thể:
  - Viết bài
  - Sửa nội dung
  - Thêm từ khóa
  - Tối ưu SEO
  - Save draft
  - Publish (nếu có quyền)

## 📸 Screenshot minh họa

### Admin View (role: admin)
```
┌─────────────────────────────────────┐
│ Giới thiệu ngắn                     │
│ [Tùy chọn giới thiệu trên Serp]     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Ảnh đại diện                        │  ← HIỂN THỊ
│ [Featured Image Preview]            │
│ [Nhập URL ảnh đại diện...]          │
│ [Choose File] No file chosen        │
│ Hoặc tải lên một hình ảnh từ máy    │
└─────────────────────────────────────┘
```

### User View (role: user)
```
┌─────────────────────────────────────┐
│ Giới thiệu ngắn                     │
│ [Tùy chọn giới thiệu trên Serp]     │
└─────────────────────────────────────┘

                                        ← ẨN SECTION "Ảnh đại diện"

[Next section...]
```

## 🔧 Technical Details

### File đã sửa:
- `client/pages/ArticleEditor.tsx`

### Changes:
1. Import `useAuth` từ AuthContext
2. Thay đổi từ `useState` sang `useAuth()` để lấy user role
3. Cập nhật điều kiện render từ `!hideFeaturedImage` thành `!hideFeaturedImage && isAdmin`
4. Xóa logic check admin cũ dựa trên `article.username`

### Build Status:
✅ Build thành công
- Client bundle: 930.18 kB
- Server bundle: 184.13 kB
- No TypeScript errors
- No compilation warnings

## 🧪 Testing

### Test Case 1: Admin user tạo bài mới
1. Login với admin account
2. Vào `/admin/articles/new`
3. **Expected:** Nhìn thấy section "Ảnh đại diện" với input URL và file upload

### Test Case 2: Non-admin user tạo bài mới
1. Login với user account (không phải admin)
2. Vào `/admin/articles/new` hoặc `/write-article`
3. **Expected:** KHÔNG nhìn thấy section "Ảnh đại diện"

### Test Case 3: Admin edit bài cũ
1. Login với admin account
2. Edit một bài viết có featured image
3. **Expected:** Nhìn thấy featured image hiện tại và có thể edit

### Test Case 4: Non-admin edit bài cũ
1. Login với user account
2. Edit một bài viết
3. **Expected:** Không nhìn thấy featured image section

## 🔐 Security

- ✅ Frontend validation: Check `user.role === "admin"`
- ✅ AuthContext: User role được lấy từ server `/api/auth/me`
- ⚠️ Backend validation: Đảm bảo endpoint `/api/articles/save` cũng check quyền admin khi lưu `featuredImage`

## 📋 Checklist

- [x] Import useAuth
- [x] Get user from AuthContext
- [x] Check isAdmin từ user.role
- [x] Cập nhật điều kiện render
- [x] Xóa state isAdmin cũ
- [x] Xóa logic setIsAdmin trong loadArticle
- [x] Build thành công
- [x] Tạo tài liệu

## 🚀 Deployment

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
npm run build

# Upload files:
# - dist/spa/* → hosting
# - dist/server/node-build.mjs → server
# - Restart Node.js app
```

---

**Completed:** January 6, 2026
**Status:** ✅ Ready for Production
