# 🔍 Hướng Dẫn Test & Debug - Auto Save VolxAI Before Publish

## ⚠️ QUAN TRỌNG: Hard Refresh Browser

Sau khi build, **BẮT BUỘC** phải hard refresh browser để load code mới:

### Windows/Linux:
```
Ctrl + Shift + R
hoặc
Ctrl + F5
```

### macOS:
```
Cmd + Shift + R
hoặc
Cmd + Option + R
```

### Nếu vẫn không được:
1. Mở Developer Tools (F12)
2. Right-click vào nút Reload
3. Chọn "Empty Cache and Hard Reload"

---

## 📋 Test Case: Đăng Bài Lên Website

### Bước 1: Chuẩn Bị
1. Vào trang `/account` hoặc `/admin/articles`
2. Click "Viết bài mới" hoặc chỉnh sửa bài có sẵn
3. Mở **Developer Console** (F12) → Tab "Console"

### Bước 2: Viết Nội Dung
1. Nhập tiêu đề: "Test Auto Save"
2. Nhập nội dung bất kỳ
3. (Optional) Thêm SEO metadata

### Bước 3: Click Đăng Bài
1. Click nút "Đăng bài" (ở góc trên)
2. Modal "Đăng bài viết" sẽ hiện ra

### Bước 4: Chọn Website
1. **KHÔNG CHỌN** "Tạm lưu ở VolxAI.com"
2. Chọn một website cụ thể (VD: Da Nang Chill Ride)
3. Chọn Post Type: Posts
4. Chọn Categories/Tags nếu có

### Bước 5: Click "Đăng Ngay"
1. Click nút "Đăng ngay"
2. Quan sát Console

---

## ✅ Expected Console Output

Nếu code hoạt động đúng, bạn sẽ thấy:

```javascript
🎯 handlePublishNow called!
Selected website: "1"
Article ID: undefined

📝 STEP 1: Saving to VolxAI.com first...
Payload: {id: undefined, title: "Test Auto Save", status: "published"}

Save response status: 200

✅ STEP 1 SUCCESS - Saved to VolxAI.com!
Save result: {success: true, data: {id: 123, ...}}
Saved article ID: 123

🚀 STEP 2: Publishing to WordPress...
Website ID: 1
Post Type: "post"
Taxonomies: {category: 5}

Publish response status: 200

✅ STEP 2 SUCCESS - Published to WordPress!
Publish result: {success: true, post_id: 456, ...}
```

---

## 🔴 Troubleshooting

### Vấn Đề 1: Không Thấy Log Trong Console
**Nguyên nhân:** Browser đang cache code cũ

**Giải pháp:**
1. Hard refresh: `Cmd + Shift + R` (Mac) hoặc `Ctrl + Shift + R` (Windows)
2. Clear cache:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images
   - Firefox: Options → Privacy → Clear Data → Cached Web Content
3. Đóng và mở lại browser hoàn toàn

### Vấn Đề 2: Thấy Log "handlePublishNow called!" Nhưng Không Thấy STEP 1
**Nguyên nhân:** Code bị dừng ở giữa

**Giải pháp:**
1. Kiểm tra có thông báo lỗi màu đỏ trong console không
2. Kiểm tra network tab → Filter "articles/save" → Xem request có được gửi không
3. Nếu request 401/403 → Token hết hạn, đăng nhập lại

### Vấn Đề 3: STEP 1 Thành Công Nhưng STEP 2 Bị Lỗi
**Nguyên nhân:** Có thể lỗi kết nối WordPress

**Giải pháp:**
1. Kiểm tra console có log "❌ Publish failed:" không
2. Kiểm tra network tab → Filter "websites" → Xem response error
3. Kiểm tra website WordPress có online không
4. Kiểm tra API token WordPress còn valid không

### Vấn Đề 4: Chỉ Thấy Code Cũ (Không Có Log "handlePublishNow called!")
**Nguyên nhân:** File build chưa được deploy hoặc browser cache

**Giải pháp:**
1. Check file build mới: `ls -lh dist/spa/assets/index-*.js`
   - Nếu thấy `index-CWVAaK2Z.js` → Build OK
2. Check server đang serve file nào:
   - Mở DevTools → Network → Reload
   - Tìm file `index-*.js` → Xem URL
3. Hard refresh như hướng dẫn ở trên
4. Hoặc mở Incognito/Private window để test

---

## 🧪 Test Scenarios

### Scenario 1: Đăng Lên Website (Chính)
**Input:**
- Chọn website: Da Nang Chill Ride
- Post Type: Posts
- Click: Đăng ngay

**Expected:**
- Console: ✅ STEP 1 + STEP 2 đều thành công
- Toast: "✅ Bài viết đã được lưu vào VolxAI và đăng lên website thành công!"
- Bài viết xuất hiện trong VolxAI
- Bài viết xuất hiện trên WordPress

### Scenario 2: Chỉ Lưu VolxAI
**Input:**
- Chọn: "Tạm lưu ở VolxAI.com"
- Click: Đăng ngay

**Expected:**
- Console: ✅ STEP 1 thành công, stop (không có STEP 2)
- Toast: "Bài viết đã được lưu vào VolxAI!"
- Bài viết chỉ có trong VolxAI, không có trên WordPress

### Scenario 3: Hẹn Giờ Đăng
**Input:**
- Chọn website + Post Type
- Toggle "Hẹn giờ đăng bài"
- Chọn ngày giờ
- Click: Hẹn giờ đăng

**Expected:**
- Console: ✅ STEP 1 (save) + STEP 2 (schedule) đều thành công
- Toast: "✅ Bài viết đã được lưu vào VolxAI và hẹn giờ đăng thành công!"

---

## 📸 Screenshots to Check

### 1. Console Tab (Before Click)
```
[] Filter: All levels
   (Empty - chưa có log)
```

### 2. Console Tab (After Click "Đăng ngay")
```
[✓] 🎯 handlePublishNow called!
[✓] 📝 STEP 1: Saving to VolxAI.com first...
[✓] ✅ STEP 1 SUCCESS - Saved to VolxAI.com!
[✓] 🚀 STEP 2: Publishing to WordPress...
[✓] ✅ STEP 2 SUCCESS - Published to WordPress!
```

### 3. Network Tab
```
Request URL: https://api.volxai.com/api/articles/save
Status: 200 OK
Method: POST

Request URL: https://api.volxai.com/api/websites/1/publish
Status: 200 OK
Method: POST
```

---

## 🔧 Manual Check: Verify Code is Loaded

### Method 1: Check Source Code
1. Open DevTools → Sources
2. Tìm file `index-CWVAaK2Z.js`
3. Search trong file: "handlePublishNow called"
4. Nếu thấy → Code mới đã load ✅

### Method 2: Check Bundle Hash
1. View page source (Ctrl+U)
2. Tìm dòng: `<script type="module" crossorigin src="/assets/index-....js"></script>`
3. Check hash: Nếu thấy `CWVAaK2Z` → Build mới ✅

### Method 3: Add Breakpoint
1. DevTools → Sources
2. Ctrl+P → Tìm "PublishModal.tsx"
3. Add breakpoint ở dòng `console.log("🎯 handlePublishNow called!")`
4. Click "Đăng ngay" → Code phải dừng ở breakpoint

---

## 📝 Checklist Cuối Cùng

Trước khi báo lỗi, confirm:

- [ ] Đã build: `npm run build:client` ✅
- [ ] Build thành công: thấy file `index-CWVAaK2Z.js` ✅
- [ ] Đã hard refresh browser (Cmd+Shift+R)
- [ ] Đã mở Developer Console (F12)
- [ ] Đã chọn website cụ thể (KHÔNG phải "Tạm lưu ở VolxAI.com")
- [ ] Đã click nút "Đăng ngay"
- [ ] Đã check Console tab có log không
- [ ] Đã check Network tab có request không

---

## 🚀 Next Steps

**Nếu mọi thứ hoạt động:**
✅ Code đã chạy đúng! Bài viết sẽ được lưu vào VolxAI trước khi đăng lên WordPress.

**Nếu vẫn không thấy log:**
1. Screenshot Console tab (rỗng)
2. Screenshot Network tab
3. Screenshot View Source (dòng script tag)
4. Gửi cho tôi để debug tiếp

---

**Ngày tạo:** 5/1/2026  
**Build hash:** index-CWVAaK2Z.js  
**Version:** 2.1.0
