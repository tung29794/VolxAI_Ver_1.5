# CORS PATCH Method Fix - Admin Prompts Toggle

## 🐛 Vấn đề

Khi click nút **Power** (Toggle Active/Inactive) trong Admin Prompts, gặp lỗi CORS:

```
Access to fetch at 'https://api.volxai.com/api/admin/prompts/6/toggle' 
from origin 'https://volxai.com' has been blocked by CORS policy: 
Method PATCH is not allowed by Access-Control-Allow-Methods in preflight response
```

### Nguyên nhân

Backend CORS config trong `server/index.ts` **không có method PATCH**:

```typescript
// ❌ Before
methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
```

Nhưng toggle endpoint sử dụng **PATCH method**:

```typescript
// Backend route
router.patch("/prompts/:id/toggle", ...)

// Frontend call
fetch(url, { method: "PATCH", ... })
```

## ✅ Giải pháp

### Thêm PATCH vào CORS config

**File:** `server/index.ts`

```typescript
// ✅ After
methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
```

### Chi tiết thay đổi

```diff
  app.use(
    cors({
      origin: [
        "https://volxai.com",
        "https://www.volxai.com",
        "http://localhost:8080",
        "http://localhost:5173",
      ],
      credentials: true,
-     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
+     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
```

## 🚀 Deploy

### Build và deploy server:

```bash
# Build server
npm run build:server

# Deploy to production
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# Restart server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

**Status:** ✅ Deployed

## 🧪 Testing

### Test toggle prompt:

1. Vào https://volxai.com/admin → AI Prompts
2. Click nút **Power** (màu xanh) trên bất kỳ prompt nào
3. Kiểm tra:
   - ✅ Không còn CORS error
   - ✅ Toggle thành công
   - ✅ Prompt chuyển trạng thái active ↔ inactive
   - ✅ Toast notification hiển thị

### Network tab check:

```
Request URL: https://api.volxai.com/api/admin/prompts/6/toggle
Request Method: PATCH
Status: 200 OK
Response: { success: true, message: "...", is_active: true/false }
```

## 📋 HTTP Methods và Use Cases

| Method | Use Case | Example trong Admin Prompts |
|--------|----------|----------------------------|
| GET | Lấy dữ liệu | Fetch danh sách prompts |
| POST | Tạo mới | Tạo prompt mới |
| PUT | Update toàn bộ | Update prompt (display_name, template, etc) |
| **PATCH** | **Update một phần** | **Toggle is_active (chỉ 1 field)** |
| DELETE | Xóa | Delete prompt |
| OPTIONS | Preflight | CORS preflight request |

## 💡 Tại sao dùng PATCH cho toggle?

**PATCH** là method chuẩn REST cho **partial update** (cập nhật một phần):

```typescript
// ✅ PATCH - Chỉ update is_active
PATCH /api/admin/prompts/6/toggle
Body: (empty hoặc { is_active: true })

// ❌ PUT - Phải gửi toàn bộ data
PUT /api/admin/prompts/6
Body: { 
  display_name: "...",
  description: "...",
  prompt_template: "...",
  system_prompt: "...",
  is_active: true  // chỉ muốn đổi field này
}
```

## 🔧 Related Endpoints sử dụng PATCH

Nếu có thêm các endpoint dùng PATCH trong tương lai, chúng cũng sẽ hoạt động:

```typescript
PATCH /api/admin/prompts/:id/toggle      // ✅ Fixed
PATCH /api/admin/users/:id/status        // ✅ Would work
PATCH /api/admin/features/:id/enable     // ✅ Would work
```

## ✨ Summary

### What was fixed?
- ❌ CORS không cho phép PATCH method
- ❌ Toggle prompt button bị block bởi CORS policy

### How was it fixed?
- ✅ Thêm "PATCH" vào CORS methods array
- ✅ Rebuild và deploy server

### Impact?
- ✅ Nút Power toggle hoạt động bình thường
- ✅ Admin có thể bật/tắt prompts
- ✅ Không còn CORS errors
- ✅ Consistent với REST API best practices

---

**Deploy Date:** January 4, 2026
**Status:** ✅ Completed & Deployed
**Tested:** ✅ Ready for production use
