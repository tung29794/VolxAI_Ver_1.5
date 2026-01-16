# Admin Prompts Fix - Sửa lỗi chức năng AI Prompts

## 🐛 Vấn đề

Chức năng **AI Prompts** trong `/admin` gặp các lỗi:

1. ❌ **Failed to load `/api/admin/statistics`** - HTTP 500
2. ❌ **Failed to load `/api/admin/prompts`** - HTTP 404 / 401
3. ❌ **SyntaxError: Unexpected token '<', "<!DOCTYPE ..." is not valid JSON**
4. ❌ **Error: Invalid token** - 401 Unauthorized

### Nguyên nhân

**Lỗi 1 & 2:** File `AdminPrompts.tsx` đang sử dụng:
```typescript
`${import.meta.env.VITE_API_URL}/api/admin/prompts`
```

Thay vì sử dụng hàm `buildAdminApiUrl()` như các admin components khác, dẫn đến:
- Request không được gửi đến đúng API backend (`api.volxai.com`)
- Server trả về HTML thay vì JSON
- Frontend không parse được response

**Lỗi 3 & 4:** File `AdminPrompts.tsx` sử dụng sai key localStorage:
```typescript
localStorage.getItem("token")  // ❌ Sai
```

Trong khi các component admin khác dùng:
```typescript
localStorage.getItem("authToken")  // ✅ Đúng
```

## ✅ Giải pháp

### 1. Thay đổi code trong `AdminPrompts.tsx`

**Import thêm hàm helper:**
```typescript
import { buildAdminApiUrl } from "@/lib/api";
```

**Fix #1: Thay đổi tất cả API calls để dùng buildAdminApiUrl:**

#### Before (❌):
```typescript
const response = await fetch(
  `${import.meta.env.VITE_API_URL}/api/admin/prompts`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

#### After (✅):
```typescript
const response = await fetch(
  buildAdminApiUrl("/api/admin/prompts"),
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Fix #2: Thay đổi localStorage key để lấy đúng token:**

#### Before (❌):
```typescript
const token = localStorage.getItem("token");  // Wrong key!
```

#### After (✅):
```typescript
const token = localStorage.getItem("authToken");  // Correct key!
if (!token) {
  toast.error("Vui lòng đăng nhập lại");
  return;
}
```

### 2. Các endpoint đã được sửa

1. ✅ `GET /api/admin/prompts` - Fetch all prompts
2. ✅ `PUT /api/admin/prompts/:id` - Update prompt
3. ✅ `PATCH /api/admin/prompts/:id/toggle` - Toggle active status
4. ✅ `DELETE /api/admin/prompts/:id` - Delete prompt

## 📦 Files đã thay đổi

```
client/components/admin/AdminPrompts.tsx
```

### Các thay đổi cụ thể:

1. **Line 1-31**: Added import `buildAdminApiUrl`
2. **Line 78-85**: Changed `fetchPrompts()` 
   - ✅ Use `buildAdminApiUrl()`
   - ✅ Change to `localStorage.getItem("authToken")`
   - ✅ Add token validation
3. **Line 118-130**: Changed `handleSave()`
   - ✅ Use `buildAdminApiUrl()`
   - ✅ Change to `localStorage.getItem("authToken")`
   - ✅ Add token validation
4. **Line 168-180**: Changed `handleToggleActive()`
   - ✅ Use `buildAdminApiUrl()`
   - ✅ Change to `localStorage.getItem("authToken")`
   - ✅ Add token validation
5. **Line 196-208**: Changed `handleDelete()`
   - ✅ Use `buildAdminApiUrl()`
   - ✅ Change to `localStorage.getItem("authToken")`
   - ✅ Add token validation

## 🚀 Deploy

### Quick Deploy (Recommended)
```bash
./deploy-admin-prompts-fix.sh
```

### Manual Deploy

#### 1. Build Server
```bash
npm run build:server
```

#### 2. Deploy Server
```bash
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
```

#### 3. Restart Server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

#### 4. Build Client
```bash
npm run build:client
```

#### 5. Deploy Client
```bash
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'
```

## 🧪 Testing

### 1. Kiểm tra Network tab

1. Mở https://volxai.com/admin
2. Vào mục **AI Prompts**
3. Mở DevTools → Network tab
4. Kiểm tra requests:

✅ **Đúng:**
```
https://api.volxai.com/api/admin/prompts
https://api.volxai.com/api/admin/statistics
```

❌ **Sai:**
```
https://volxai.com/api/admin/prompts (trả về HTML)
```

### 2. Kiểm tra Console

Không còn các lỗi:
- ❌ "Failed to load resource: the server responded with a status of 404"
- ❌ "SyntaxError: Unexpected token '<'"
- ❌ "Unexpected token '<', "<!DOCTYPE ..." is not valid JSON"

### 3. Kiểm tra UI

✅ Danh sách prompts hiển thị đầy đủ
✅ Có thể edit prompt
✅ Có thể toggle active/inactive
✅ Có thể delete prompt (nếu có quyền)

## 📋 API Endpoints (Backend)

Tất cả đã được implement trong `server/routes/admin.ts`:

```typescript
// Get all prompts
router.get("/prompts", verifyAdmin, async (req, res) => {...})

// Get single prompt
router.get("/prompts/:id", verifyAdmin, async (req, res) => {...})

// Create new prompt
router.post("/prompts", verifyAdmin, async (req, res) => {...})

// Update prompt
router.put("/prompts/:id", verifyAdmin, async (req, res) => {...})

// Delete prompt
router.delete("/prompts/:id", verifyAdmin, async (req, res) => {...})

// Toggle active status
router.patch("/prompts/:id/toggle", verifyAdmin, async (req, res) => {...})
```

## 🔐 Security

- ✅ Tất cả endpoints đều require admin authentication
- ✅ JWT token được validate qua middleware `verifyAdmin()`
- ✅ CORS đã được cấu hình đúng cho cross-domain requests

## 📚 Related Documentation

- `ADMIN_API_TESTING_GUIDE.md` - Hướng dẫn test Admin API
- `ADMIN_FIX_QUICK_SUMMARY.md` - Tổng kết các fix admin khác
- `AI_PROMPT_MANAGEMENT_FEATURE.md` - Chi tiết về feature AI Prompts
- `buildAdminApiUrl()` helper in `client/lib/api.ts`

## ✨ Summary

### What was fixed?
1. ❌ AdminPrompts component không call đúng API endpoint
   - Sử dụng relative paths thay vì full URLs với correct domain
2. ❌ AdminPrompts component dùng sai localStorage key
   - Dùng `"token"` thay vì `"authToken"` → Invalid token 401

### How was it fixed?
1. ✅ Import và sử dụng `buildAdminApiUrl()` helper
2. ✅ Đảm bảo tất cả API calls đi đến `api.volxai.com`
3. ✅ Đổi `localStorage.getItem("token")` → `localStorage.getItem("authToken")`
4. ✅ Thêm token validation và error message

### Impact?
- ✅ AI Prompts page hoạt động bình thường
- ✅ Admin có thể quản lý prompts
- ✅ Consistent với các admin pages khác
- ✅ Không còn lỗi 401 Unauthorized

---

**Deploy Date:** January 4, 2026
**Status:** ✅ Completed & Deployed
**Tested:** ✅ Ready for production use
