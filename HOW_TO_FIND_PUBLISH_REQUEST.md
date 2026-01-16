# 🔍 Hướng dẫn tìm Request Publish trong DevTools

## Cách tìm request đăng bài

### Bước 1: Mở DevTools và chuẩn bị
1. Vào https://volxai.com/account
2. Nhấn **F12** hoặc **Cmd+Opt+I** (macOS)
3. Click tab **Network** (như trong ảnh bạn gửi)
4. ✅ **QUAN TRỌNG:** Click nút **Clear** (icon thùng rác) để xóa hết requests cũ

### Bước 2: Filter để dễ tìm
1. Trong ô **Filter** (bên trái Network tab), gõ: `publish`
2. HOẶC click vào filter **Fetch/XHR** để chỉ hiện API calls

### Bước 3: Thực hiện action đăng bài
1. Trên trang /account, **chọn 1 bài viết** (checkbox)
2. Chọn **website** từ dropdown
3. Chọn **post type** (ví dụ: Tours)
4. Click nút **"Đăng lên Website"** (button màu xanh lá)

### Bước 4: Tìm request
Sau khi click, trong Network tab sẽ xuất hiện request mới:
```
Name: publish
Method: POST
URL: https://api.volxai.com/api/websites/1/publish
Status: 200 (nếu thành công)
```

### Bước 5: Xem chi tiết
1. **Click vào dòng request `publish`**
2. Bên phải sẽ hiện ra tabs:
   - **Headers** - thông tin header
   - **Payload** - dữ liệu GỬI đi ← **XEM TAB NÀY**
   - **Response** - kết quả trả về

### Bước 6: Kiểm tra Payload
Trong tab **Payload**, bạn sẽ thấy:

**✅ ĐÚNG - Nếu có postType:**
```json
{
  "articleId": 123,
  "postType": "tour",
  "taxonomies": {
    "category": 5
  }
}
```

**❌ SAI - Nếu thiếu postType:**
```json
{
  "articleId": 123,
  "taxonomies": {
    "category": 5
  }
}
```

## Hình minh họa vị trí

```
┌─────────────────────────────────────────────────────┐
│ Network tab (đã mở)                                 │
├─────────────────────────────────────────────────────┤
│ [Clear] [Filter: publish]  [Fetch/XHR] [All]       │ ← Filter ở đây
├─────────────────────────────────────────────────────┤
│ Name          │ Status │ Type  │ Initiator         │
├───────────────┼────────┼───────┼───────────────────┤
│ me            │ 200    │ fetch │ index.js         │
│ me            │ 200    │ fetch │ index.js         │
│ ↓ CLICK ĐĂNG BÀI → request "publish" xuất hiện    │
│ publish       │ 200    │ fetch │ UserArticles.tsx │ ← Click vào dòng này
│               │        │       │                   │
└─────────────────────────────────────────────────────┘

Sau khi click vào "publish":
┌─────────────────────────────────────────────────────┐
│ Headers │ Payload │ Response │ Preview │ Timing    │ ← Tabs ở đây
├─────────────────────────────────────────────────────┤
│                                                      │
│ Payload (click vào tab này):                        │
│                                                      │
│ {                                                    │
│   "articleId": 123,                                 │
│   "postType": "tour",      ← Cần có dòng này       │
│   "taxonomies": {...}                               │
│ }                                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Nếu không thấy request "publish"

### Nguyên nhân 1: Request quá nhanh, đã biến mất
**Giải pháp:**
- Tick vào **"Preserve log"** (ở đầu Network tab)
- Thử lại

### Nguyên nhân 2: Request bị filter
**Giải pháp:**
- Xóa filter (xóa chữ trong ô Filter)
- Click **"All"** thay vì "Fetch/XHR"
- Tìm request có URL chứa `/publish`

### Nguyên nhân 3: Có lỗi, request không gửi
**Giải pháp:**
- Mở tab **Console** (bên cạnh Network)
- Xem có error màu đỏ không
- Nếu có, screenshot và gửi cho tôi

## Video walkthrough (steps)

1. F12 → Network tab
2. Clear (thùng rác icon)
3. Filter: "publish" hoặc click "Fetch/XHR"
4. Tick "Preserve log"
5. Chọn bài viết + website + post type
6. Click "Đăng lên Website"
7. Tìm request "publish" vừa xuất hiện
8. Click vào request đó
9. Tab "Payload" → Copy JSON
10. Gửi cho tôi hoặc kiểm tra có `postType` không

## Screenshot mẫu cần chụp

**Screenshot 1: Request trong list**
```
Cần thấy:
- Request name: "publish"
- URL: api.volxai.com/api/websites/*/publish
- Status: 200 hoặc 4xx/5xx
```

**Screenshot 2: Payload tab**
```
Cần thấy:
- JSON body với các fields
- Đặc biệt: có "postType" field không?
```

**Screenshot 3: Response tab**
```
Cần thấy:
- success: true/false
- error message (nếu có)
- wordpressPostId (nếu success)
```

## Quick checklist

- [ ] DevTools đã mở (F12)
- [ ] Network tab đã chọn
- [ ] "Preserve log" đã tick
- [ ] Đã clear requests cũ
- [ ] Filter = "publish" hoặc "Fetch/XHR"
- [ ] Đã click "Đăng lên Website"
- [ ] Thấy request "publish" xuất hiện
- [ ] Đã click vào request đó
- [ ] Đã xem tab "Payload"
- [ ] Đã kiểm tra có "postType" field

---

**Sau khi làm xong, cho tôi biết:**
1. Có thấy request "publish" không?
2. Status code là gì? (200, 400, 500?)
3. Trong Payload có field "postType" không?
4. Giá trị của "postType" là gì? ("post", "tour", "page"?)
