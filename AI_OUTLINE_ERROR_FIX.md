# Fix Lỗi AI Outline - SyntaxError: Unexpected token '<'

## 🐛 Mô tả lỗi

**Các bước gây lỗi:**
1. Truy cập trang `/account`
2. Chọn **Viết bài** > **Viết bài** > **Viết bài theo từ khóa**
3. Nhập từ khóa
4. Chọn **AI Outline**
5. Click **AI tạo**

**Lỗi xuất hiện:**
```
Error generating outline: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

## 🔍 Nguyên nhân

Lỗi xảy ra do sử dụng sai biến môi trường trong file `client/components/WriteByKeywordForm.tsx`:

- **Code lỗi:** `import.meta.env.VITE_API_BASE_URL` (biến này không tồn tại)
- **Kết quả:** API URL bị `undefined`, request gọi đến URL không đúng, server trả về trang HTML 404 thay vì JSON
- **Lỗi phân tích:** JavaScript cố gắng parse HTML như JSON → SyntaxError

## ✅ Giải pháp

### Thay đổi trong `client/components/WriteByKeywordForm.tsx`

**1. Import helper function:**
```typescript
// Thêm import
import { buildApiUrl } from "@/lib/api";
```

**2. Sửa fetch call:**
```typescript
// Trước:
const response = await fetch(
  `${import.meta.env.VITE_API_BASE_URL}/api/ai/generate-outline`,
  {
    method: "POST",
    // ...
  }
);

// Sau:
const response = await fetch(
  buildApiUrl("/api/ai/generate-outline"),
  {
    method: "POST",
    // ...
  }
);
```

## 📝 Chi tiết kỹ thuật

### Biến môi trường đúng
- `VITE_API_URL` - biến môi trường chính xác (định nghĩa trong `.env`)
- `API_BASE_URL` - constant được export từ `client/lib/api.ts`
- `buildApiUrl()` - helper function để build URL đầy đủ

### Cấu hình trong `client/lib/api.ts`
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.volxai.com";

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}
```

## 🚀 Deployment

```bash
# Build lại ứng dụng
npm run build

# Kết quả build thành công
✓ dist/spa/index.html
✓ dist/spa/assets/index-C_LXt5Si.js
```

## ✔️ Kết quả

Sau khi fix:
- ✅ API call đúng endpoint: `/api/ai/generate-outline`
- ✅ Server trả về JSON response hợp lệ
- ✅ AI Outline generation hoạt động bình thường
- ✅ Không còn lỗi SyntaxError

## 📌 Lưu ý

**Các file khác sử dụng đúng:**
- `client/pages/ArticleEditor.tsx` - sử dụng `buildApiUrl()`
- `client/pages/Account.tsx` - sử dụng `buildApiUrl()`
- `client/pages/Upgrade.tsx` - sử dụng `buildApiUrl()`

**Nguyên tắc:**
- Luôn sử dụng `buildApiUrl()` cho các API calls
- Không sử dụng trực tiếp `import.meta.env.VITE_API_BASE_URL`
- Sử dụng `import.meta.env.VITE_API_URL` nếu cần access trực tiếp

## 🎯 Status: FIXED ✅

**Build date:** January 6, 2026
**Version:** 1.5
**Status:** Ready for deployment
