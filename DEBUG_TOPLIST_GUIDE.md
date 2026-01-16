# 🔍 Debug Guide: Toplist Save Issue

**Date:** January 13, 2026  
**Status:** Debug logging added  
**Files:** `client/components/WritingProgressView.tsx`

---

## 📋 Hướng dẫn debug chi tiết

### 1. Mở Browser Console

1. Truy cập VolxAI
2. Mở DevTools: `F12` hoặc `Cmd+Option+I` (Mac)
3. Chuyển sang tab **Console**

### 2. Test Toplist Generation

1. Vào **Viết bài** → **Viết bài Toplist**
2. Nhập keyword: **"món ngon đà nẵng"**
3. Set số lượng mục: **5**
4. Click **"Tạo bài"**

### 3. Kiểm tra Console Logs

#### A. Khi streaming bắt đầu:
```
📊 Status: Generating toplist article...
📊 Status: Đang tiếp tục viết bài (2/10)...
✅ Streaming completed
```

#### B. Khi nhận event 'complete':
```
✅ Complete event received: {
  success: true/false,
  articleId: 123,
  title: "...",
  content: "...",
  ...
}
```

**CHÚ Ý các trường quan trọng:**
- `success`: true hoặc false
- `articleId`: có hoặc undefined
- `title`: tiêu đề bài viết
- `content`: nội dung HTML

#### C. Khi click nút "Tiếp tục chỉnh sửa":
```
🔘 Continue editing button clicked
   articleData: {...}
   articleData.articleId: 123 hoặc undefined
   articleData.success: true hoặc false
```

**Trường hợp 1: Có articleId**
```
✅ ArticleId exists, navigating to editor: 123
```
→ Navigate đến `/article/123`

**Trường hợp 2: Không có articleId (Fallback)**
```
⚠️ No articleId, attempting fallback save...
   formData: {...}
   content length: 12345
📝 Creating draft with:
   title: "Top 10 món ngon Đà Nẵng"
   slug: "top-10-mon-ngon-da-nang"
   content length: 12345
🚀 Sending POST /api/articles...
📥 Response status: 201
📥 Response body: {"success":true,"articleId":456,...}
✅ Save successful, response: {...}
   Extracted ID: 456
```
→ Navigate đến `/article/456`

---

## 🔥 Các lỗi thường gặp

### Lỗi 1: Không nhận được 'complete' event
**Console log:**
```
✅ Streaming completed
(không có dòng "✅ Complete event received")
```

**Nguyên nhân:**
- Backend không gửi SSE event `complete`
- Backend crashed trước khi gửi event

**Cách khắc phục:**
1. Check server logs: `pm2 logs` hoặc `tail -f server/logs/error.log`
2. Tìm lỗi liên quan đến request ID
3. Check xem có lỗi save DB không

---

### Lỗi 2: Complete event nhưng không có articleId
**Console log:**
```
✅ Complete event received: {
  success: false,
  error: "Failed to save article to database",
  content: "...",
  title: "..."
}
   articleId: undefined
   success: false
⚠️ Backend save failed, will use fallback on button click
```

**Nguyên nhân:**
- Backend save DB thất bại (duplicate slug, connection error, etc.)
- Backend catch error và gửi `success: false`

**Cách khắc phục:**
1. Check server logs để tìm lỗi DB
2. Common issues:
   - Duplicate slug → Backend đã fix bằng unique suffix
   - DB connection timeout → Check DB server
   - Missing required fields → Check INSERT query

---

### Lỗi 3: Fallback save thất bại
**Console log:**
```
⚠️ No articleId, attempting fallback save...
🚀 Sending POST /api/articles...
📥 Response status: 400
📥 Response body: {"error":"Slug already exists"}
❌ Save failed with status: 400
```

**Nguyên nhân:**
- Slug bị trùng
- Thiếu required fields
- Token hết hạn

**Cách khắc phục:**
1. Nếu slug trùng: Frontend slugify đã thêm unique suffix, check lại logic
2. Nếu token hết hạn: User cần đăng nhập lại
3. Nếu thiếu fields: Check payload trong console

---

### Lỗi 4: Không có token
**Console log:**
```
❌ No auth token found
```

**Cách khắc phục:**
User cần đăng nhập lại

---

## 🛠️ Cách debug nâng cao

### 1. Check Network Tab
1. Mở DevTools → Tab **Network**
2. Filter: `generate-toplist`
3. Check:
   - Request payload
   - Response headers
   - SSE events (EventStream)

### 2. Check Server Logs
```bash
# PM2 logs
pm2 logs

# Or tail server logs
tail -f /path/to/server/logs/error.log

# Search for request ID
pm2 logs | grep "req_"
```

### 3. Check Database
```sql
-- Check recent articles
SELECT id, title, slug, created_at 
FROM articles 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for duplicate slugs
SELECT slug, COUNT(*) as count 
FROM articles 
GROUP BY slug 
HAVING count > 1;

-- Check latest toplist article
SELECT * 
FROM articles 
WHERE title LIKE 'Top%' OR title LIKE '%món ngon%'
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 📊 Expected Flow Diagram

```
User clicks "Tạo bài"
    ↓
Frontend POST /api/ai/generate-toplist
    ↓
Backend SSE stream opens
    ↓
Backend: event=status "Generating..."
    ↓
Backend: event=content (streaming chunks)
    ↓
Backend: Generate title
    ↓
Backend: Generate slug with Vietnamese normalization
    ↓
Backend: Check slug uniqueness
    ↓
Backend: INSERT INTO articles
    ↓
    ├─ Success ─> event=complete { articleId: 123 }
    │
    └─ Fail ───> event=complete { success: false, content: "..." }
    ↓
Frontend receives complete event
    ↓
User clicks "Tiếp tục chỉnh sửa"
    ↓
    ├─ If articleId exists ─> Navigate to /article/123
    │
    └─ If no articleId ──────> POST /api/articles (fallback)
                                   ↓
                               Navigate to /article/{newId}
```

---

## 📝 Checklist Debug

Khi test, check các điểm sau:

- [ ] Console hiển thị "✅ Streaming completed"
- [ ] Console hiển thị "✅ Complete event received"
- [ ] `articleData` có các trường: `success`, `title`, `content`
- [ ] `articleData.articleId` có giá trị (hoặc undefined)
- [ ] Khi click button, console hiển thị "🔘 Continue editing button clicked"
- [ ] Nếu không có articleId, fallback save được trigger
- [ ] Response status là 200 hoặc 201
- [ ] Navigate đến editor thành công

---

## 🚀 Next Steps

Sau khi có logs, hãy:

1. Screenshot/copy tất cả console logs
2. Gửi cho dev team
3. Include:
   - Request payload (keyword, itemCount, etc.)
   - Complete event payload
   - Any error messages
   - Server logs (nếu có access)

---

**Author:** GitHub Copilot  
**Updated:** January 13, 2026
