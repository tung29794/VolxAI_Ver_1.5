# 🎯 Simple Test Plan - Tìm vấn đề Custom Post Type

## Mục tiêu
Xác định chính xác layer nào đang gây lỗi

## ✅ Đã verify
1. ✅ Backend code có `post_type: postType` (checked)
2. ✅ Backend file uploaded lúc 14:52 (checked)
3. ✅ Backend đã restart (checked)

## 🔍 Cần test ngay

### Test 1: Browser DevTools
**Mục đích:** Kiểm tra frontend có gửi `postType` không

1. Mở https://volxai.com/account
2. F12 → Network tab
3. Chọn 1 bài viết
4. Chọn website "Da Nang Chill Ride"
5. Chọn post type: "Tours" (hoặc custom post type bất kỳ)
6. Click "Đăng lên Website"
7. **Quan sát:**
   - Tìm request: `POST /api/websites/X/publish`
   - Click vào → Payload tab
   - **Kiểm tra:** Có thấy `"postType": "tour"` không?

**Expected:**
```json
{
  "articleId": 123,
  "postType": "tour",  // ← PHẢI CÓ field này
  "taxonomies": {...}
}
```

**If missing → Problem: Frontend**
**If exists → Continue to Test 2**

---

### Test 2: Backend Response
**Mục đích:** Kiểm tra backend có trả về đúng không

Trong DevTools, cùng request trên:
1. Click vào tab **Response**
2. **Kiểm tra:**
   ```json
   {
     "success": true,
     "data": {
       "wordpressPostId": 456,  // ← Post ID từ WordPress
       "wordpressUrl": "https://...",
       "action": "created"
     }
   }
   ```

**If success: false → Problem: Backend or WordPress**
**If success: true → Continue to Test 3**

---

### Test 3: WordPress Admin
**Mục đích:** Verify post có được tạo không

1. Login WordPress admin: https://danangchillride.com/wp-admin
2. Tìm custom post type menu (ví dụ: "Tours")
3. Click vào menu đó
4. **Kiểm tra:** 
   - Có thấy bài viết vừa đăng không?
   - Status: Draft hay Publish?
   - Post type đúng chưa?

**Scenarios:**

**A. Post KHÔNG xuất hiện ở đâu cả:**
- Problem: WordPress plugin không tạo được post
- Check: WordPress error logs

**B. Post xuất hiện ở "Posts" (default) thay vì Custom Type:**
- Problem: `post_type` không được gửi đến WordPress
- Check: Backend logs

**C. Post xuất hiện đúng Custom Type:**
- ✅ SUCCESS! Feature hoạt động!

---

### Test 4: Direct WordPress API (Nếu Test 3 fail)
**Mục đích:** Test trực tiếp WordPress plugin

```bash
# Get API token from WordPress Admin first
# Article Writer → API Tokens → Copy token

curl -X POST "https://danangchillride.com/wp-json/article-writer/v1/publish" \
  -H "Content-Type: application/json" \
  -H "X-Article-Writer-Token: YOUR_TOKEN_HERE" \
  -d '{
    "title": "Direct Test - Tour Post",
    "content": "Testing direct API call",
    "status": "draft",
    "post_type": "tour"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "post_id": 789,
  "post_url": "https://...",
  "message": "Bài viết đã được đăng thành công"
}
```

**Then check WordPress Admin:**
- Go to Tours → Drafts
- Should see "Direct Test - Tour Post"

**If this works:**
- Problem: Backend không forward đúng
- Check: Backend console logs

**If this fails:**
- Problem: WordPress plugin
- Check: WordPress debug.log

---

## Report Back Format

Sau khi test, cho tôi biết:

**Test 1 (Frontend):**
- [ ] ✅ postType field có trong request
- [ ] ❌ postType field KHÔNG có

**Test 2 (Backend Response):**
- [ ] ✅ success: true
- [ ] ❌ success: false
- [ ] Error message: _______________

**Test 3 (WordPress):**
- [ ] ✅ Post xuất hiện đúng custom type
- [ ] ❌ Post xuất hiện ở "Posts" (default)
- [ ] ❌ Post KHÔNG xuất hiện ở đâu cả

**Test 4 (Direct API - if needed):**
- [ ] ✅ Works - post created
- [ ] ❌ Failed - error: _______________

---

## Quick Diagnostic

| Test 1 | Test 2 | Test 3 | Problem Location |
|--------|--------|--------|------------------|
| ❌ | - | - | **Frontend không gửi postType** |
| ✅ | ❌ | - | **Backend xử lý sai hoặc không forward** |
| ✅ | ✅ | ❌ default | **Backend không gửi post_type đến WP** |
| ✅ | ✅ | ❌ không thấy | **WordPress plugin không tạo post** |
| ✅ | ✅ | ✅ | **SUCCESS!** |

---

## Files cần có để debug

1. **Browser Screenshot:** Network tab với request/response
2. **WordPress logs:** debug.log từ wp-content/
3. **Backend logs:** Nếu có access

---

Hãy chạy Test 1-3 và cho tôi biết kết quả!
