# 🧪 Testing Guide: Bulk Write AI Model Fix

## 📋 Test Cases

### Test 1: Viết Hàng Loạt với GPT-4o-mini
**Mục Đích**: Xác nhân SEO Title & Meta Description được tạo từ GPT-4o-mini (không phải gpt-3.5-turbo)

**Bước Thực Hiện**:
1. Login vào VolxAI
2. Vào Tab "Viết Bài"
3. Chọn Model: **GPT-4o-mini**
4. Nhập từ khóa: "Xe Mazda CX-5"
5. Chọn "Viết Hàng Loạt"
6. Nhập 5 từ khóa (mỗi dòng 1 keyword)
7. Click "Tạo Bài"
8. Đợi hoàn thành

**Kiểm Tra Kết Quả**:
```
1. Bài viết được lưu thành công
2. Vào Articles page, mở bài viết vừa tạo
3. Kiểm tra trong Editor:
   ✅ Title: Phải có ý nghĩa (từ GPT-4o-mini)
   ✅ Meta Title/SEO Title: Phải khác, tối ưu hóa SEO (từ GPT-4o-mini)
   ✅ Meta Description: Phải là description kỹ lưỡng (từ GPT-4o-mini)
4. Database verify:
   SELECT title, meta_title, meta_description 
   FROM articles 
   WHERE keyword LIKE '%Mazda%' 
   ORDER BY created_at DESC LIMIT 1;
```

**Expected Output**:
```
Title: "Xe Mazda CX-5: Tích Hợp Công Nghệ Và Hiệu Năng Vượt Trội"
Meta Title: "Mazda CX-5 2024 - Crossover Cao Cấp | Giá & Thông Số"
Meta Description: "Khám phá Mazda CX-5 mới nhất với thiết kế hiện đại, công nghệ an toàn tiên tiến và hiệu năng vượt trội. Giá cạnh tranh, giao xe nhanh chóng."
```

---

### Test 2: Viết News với Gemini
**Mục Đích**: Xác nhân News Article tạo từ Gemini (không phải hardcoded OpenAI)

**Bước Thực Hiện**:
1. Login vào VolxAI
2. Vào Tab "Viết News"
3. Chọn Model: **Gemini**
4. Nhập từ khóa: "Công nghệ AI 2025"
5. Click "Tạo Bài"
6. Đợi hoàn thành

**Kiểm Tra Kết Quả**:
```
1. Bài viết được lưu thành công
2. Vào Articles page, mở bài viết vừa tạo
3. Kiểm tra:
   ✅ Title: Từ Gemini (newsjack style)
   ✅ Meta Title: Từ Gemini
   ✅ Meta Description: Từ Gemini
   ✅ Content: Từ Gemini (có thể khác format vs OpenAI)
4. Browser console (F12):
   - Kiếm "Using Gemini to generate title..."
   - Kiếm "Using Google AI to generate metadata..."
   - Kiếm "Retrieved Google AI API key from database"
```

**Expected Console Logs**:
```
🔍 Using Gemini to generate title...
✅ Generated title via Gemini: "Những Bước Tiến Đột Phá Trong AI Năm 2025"
...
🤖 Using Google AI to generate metadata...
✅ Using Google AI with model: gemini-2.0-flash-exp to generate metadata...
```

---

### Test 3: Viết Hàng Loạt - Mixed Models
**Mục Đích**: Xác nhân switching giữa các model

**Bước Thực Hiện**:
1. Tạo bài với GPT-3.5-turbo (nếu có option này)
2. Tạo bài với GPT-4
3. Tạo bài với Gemini
4. Kiểm tra mỗi bài có metadata từ model tương ứng

**Kiểm Tra Kết Quả**:
```
Database Query:
SELECT id, title, meta_title, model_used, created_at 
FROM articles 
WHERE created_at > NOW() - INTERVAL 1 HOUR
ORDER BY created_at DESC;

Expected: 3 rows với 3 model khác nhau
```

---

### Test 4: Console Logging Verification
**Mục Đích**: Xác nhân logging đúng

**Bước Thực Hiện**:
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Tạo bài viết hàng loạt với model = "gpt-4o-mini"
4. Theo dõi logs

**Expected Logs** (cho /api/ai/generate-article):
```
📝 [req_123...] Starting post-generation processing...
🏷️ [req_123...] Generating article metadata...
✅ Using hardcoded system prompt for generate_article_title
🤖 [req_123...] Using OpenAI with model: gpt-4o-mini to generate metadata...
📋 [req_123...] Generated metadata:
   Title: "..."
   SEO Title: "..."
   Meta Description: "..."
✅ [req_123...] Article saved to database with ID: 2088
📤 [req_123...] Sending complete event to client...
```

**Expected Logs** (cho /api/ai/generate-news):
```
🔍 [1705...] Using Gemini to generate title...
✅ [1705...] Generated title via Gemini: "..."
...
📝 Step 7: Generate SEO title
🤖 [1705...] Using Google AI with model: gemini-2.0-flash-exp to generate metadata...
✅ [1705...] Generated SEO title via Google AI
...
📝 Step 8: Generate meta description
✅ [1705...] Generated meta description via Google AI
```

---

## 🔍 Database Verification Queries

### Check Recent Articles Meta
```sql
-- Kiểm tra metadata của bài viết vừa tạo
SELECT 
  id, 
  title, 
  meta_title, 
  meta_description,
  word_count,
  tokens_used,
  created_at 
FROM articles 
WHERE user_id = [YOUR_USER_ID] 
AND created_at > NOW() - INTERVAL 24 HOUR
ORDER BY created_at DESC 
LIMIT 10;
```

### Verify Metadata Not Null
```sql
-- Kiểm tra metadata không bị null hoặc empty
SELECT id, title 
FROM articles 
WHERE meta_title IS NULL OR meta_title = ''
OR meta_description IS NULL OR meta_description = ''
LIMIT 10;

-- Expected: Should return 0 rows (vì metadata phải được tạo)
```

---

## 📊 Manual Inspection Checklist

| Aspect | Status | Notes |
|--------|--------|-------|
| Title được tạo từ selected model | [ ] | Không phải fallback |
| Meta Title khác Title | [ ] | SEO optimized |
| Meta Description logic | [ ] | 150-160 chars, engaging |
| Gemini support hoạt động | [ ] | Có log "Using Gemini..." |
| OpenAI models khác hoạt động | [ ] | GPT-3.5, GPT-4, GPT-4o-mini |
| Database lưu đúng metadata | [ ] | meta_title và meta_description populated |
| Không còn lỗi hardcoded | [ ] | Logs hiển thị model được chọn |
| No console errors | [ ] | F12 → Console không có error |

---

## 🚨 Troubleshooting

### Issue 1: "SEO Title = Title"
**Nguyên Nhân**: SEO Title generation fail, fallback về Title

**Giải Pháp**:
1. Kiểm tra API key có hợp lệ không
2. Kiểm tra model có tồn tại không (gpt-3.5-turbo, gpt-4, gemini)
3. Kiểm tra quota/rate limit
4. Xem server logs: `/var/log/api.volxai.com/error.log`

**Fix Check**:
```bash
# SSH vào server
ssh user@server

# Kiểm tra error logs
tail -f ~/api.volxai.com/error.log | grep "metadata\|SEO\|gpt\|gemini"

# Kiểm tra API keys có valid không
mysql> SELECT provider, is_active, api_key FROM api_keys LIMIT 10;
```

---

### Issue 2: "Cannot find module '@google/generative-ai'"
**Nguyên Nhân**: Gemini package chưa install

**Giải Pháp**:
```bash
# SSH vào server
ssh user@server

# Install Gemini package
cd ~/api.volxai.com
npm install @google/generative-ai

# Rebuild
npm run build

# Restart
touch restart.txt
```

---

### Issue 3: "Model not found in response"
**Nguyên Nhân**: API response format khác dự kiến

**Giải Pháp**:
1. Kiểm tra API response format
2. Log chi tiết hơn
3. Xem API documentation của provider

```bash
# Thêm debug log
console.log('Full API response:', JSON.stringify(response, null, 2));

# Rebuild và test
npm run build
```

---

## ✅ Sign-Off Checklist

- [ ] All test cases passed
- [ ] No compilation errors
- [ ] No runtime errors in logs
- [ ] Database has correct metadata
- [ ] Console logs show correct model usage
- [ ] Both Gemini and OpenAI models work
- [ ] Metadata quality acceptable
- [ ] Ready for production deployment

---

## 📝 Test Execution Log

**Date**: ___________
**Tester**: ___________

### Test 1: GPT-4o-mini
- [ ] Passed
- Notes: ___________

### Test 2: Gemini
- [ ] Passed
- Notes: ___________

### Test 3: Mixed Models
- [ ] Passed
- Notes: ___________

### Test 4: Console Logging
- [ ] Passed
- Notes: ___________

### Database Verification
- [ ] Passed
- Notes: ___________

---

**Overall Result**: ___________
**Approved for Deployment**: [ ] Yes [ ] No

