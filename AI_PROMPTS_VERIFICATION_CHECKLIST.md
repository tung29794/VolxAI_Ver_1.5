# ✅ CHECKLIST XÁC NHẬN - AI PROMPTS DATABASE MIGRATION

## 🎯 Mục Đích

Checklist này giúp bạn xác nhận rằng tất cả AI prompts đã được chuyển sang database và hoạt động đúng.

---

## 📋 PRE-VERIFICATION

### ☐ 1. Kiểm Tra Database Connection

```bash
ssh jybcaorr@ghf57-22175.azdigihost.com -p 2210
# Password: ;)|o|=NhgnM)

mysql -h localhost -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' jybcaorr_lisacontentdbapi
```

**Expected:** Kết nối thành công vào database

---

### ☐ 2. Kiểm Tra Bảng ai_prompts Tồn Tại

```sql
SHOW TABLES LIKE 'ai_prompts';
```

**Expected:** 
```
+-------------------------------------+
| Tables_in_jybcaorr_lisacontentdbapi |
+-------------------------------------+
| ai_prompts                          |
+-------------------------------------+
```

---

### ☐ 3. Đếm Số Prompts trong Database

```sql
SELECT 
  COUNT(*) as total_prompts,
  SUM(is_active = 1) as active_prompts,
  SUM(is_active = 0) as inactive_prompts
FROM ai_prompts;
```

**Expected:**
```
+---------------+----------------+------------------+
| total_prompts | active_prompts | inactive_prompts |
+---------------+----------------+------------------+
|             9 |              6 |                3 |
+---------------+----------------+------------------+
```

---

## 📊 VERIFY PROMPTS

### ☐ 4. Kiểm Tra Tất Cả Prompts Active

```sql
SELECT feature_name, display_name, is_active 
FROM ai_prompts 
WHERE is_active = 1 
ORDER BY feature_name;
```

**Expected:**
```
+---------------------------+-------------------------+-----------+
| feature_name              | display_name            | is_active |
+---------------------------+-------------------------+-----------+
| expand_content            | Mở rộng nội dung        |         1 |
| generate_article          | Tạo bài viết hoàn chỉnh |         1 |
| generate_meta_description | Tạo Meta Description    |         1 |
| generate_outline          | Tạo dàn ý bài viết      |         1 |
| generate_seo_title        | Tạo tiêu đề SEO         |         1 |
| rewrite_content           | Viết lại nội dung       |         1 |
+---------------------------+-------------------------+-----------+
```

✅ **6 prompts active** là đúng!

---

### ☐ 5. Kiểm Tra Prompt generate_outline (Mới Thêm)

```sql
SELECT 
  id, 
  feature_name, 
  display_name,
  LENGTH(prompt_template) as prompt_len,
  LENGTH(system_prompt) as sys_len,
  is_active
FROM ai_prompts 
WHERE feature_name = 'generate_outline';
```

**Expected:**
```
+----+------------------+--------------------+------------+---------+-----------+
| id | feature_name     | display_name       | prompt_len | sys_len | is_active |
+----+------------------+--------------------+------------+---------+-----------+
| 21 | generate_outline | Tạo dàn ý bài viết |       ~900 |    ~150 |         1 |
+----+------------------+--------------------+------------+---------+-----------+
```

✅ Prompt ID: 21 đã được thêm thành công!

---

### ☐ 6. Xem Chi Tiết Prompt generate_outline

```sql
SELECT 
  feature_name,
  available_variables,
  LEFT(prompt_template, 100) as prompt_preview
FROM ai_prompts 
WHERE feature_name = 'generate_outline';
```

**Expected:**
```
available_variables: ["keyword", "language", "length_description", "tone", "h2_count", "h3_per_h2"]
prompt_preview: Create a detailed article outline about: "{keyword}"...
```

---

## 🖥️ VERIFY CODE

### ☐ 7. Kiểm Tra Function loadPrompt Tồn Tại

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
grep -n "async function loadPrompt" server/routes/ai.ts
```

**Expected:**
```
26:async function loadPrompt(featureName: string): Promise<AIPromptTemplate | null> {
```

✅ Function tồn tại ở dòng 26

---

### ☐ 8. Kiểm Tra Generate Outline Load từ Database

```bash
grep -A 5 "const promptTemplate = await loadPrompt('generate_outline')" server/routes/ai.ts | head -20
```

**Expected:** Thấy code load prompt từ database trong `handleGenerateOutline`

---

### ☐ 9. Kiểm Tra Expand Content Feature Name Đã Sửa

```bash
grep "loadPrompt('expand_content')" server/routes/ai.ts
```

**Expected:**
```
    const promptTemplate = await loadPrompt('expand_content');
```

✅ Đã sửa từ `write_more` → `expand_content`

---

### ☐ 10. Đếm Số Lần Gọi loadPrompt

```bash
grep -c "await loadPrompt(" server/routes/ai.ts
```

**Expected:** 
```
6
```

✅ 6 lần (1 cho mỗi feature: rewrite, expand, generate_article, seo_title, meta_desc, generate_outline)

---

## 🧪 FUNCTIONAL TESTING

### ☐ 11. Build Project Thành Công

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
npm run build
```

**Expected:**
```
✓ Frontend built in ~2s
✓ Backend built in ~200ms
```

✅ Build không có lỗi

---

### ☐ 12. Kiểm Tra Admin Dashboard

1. Truy cập: https://volxai.com/admin
2. Login với admin account
3. Click tab **"AI Prompts"**

**Expected:**
- ✅ Thấy danh sách 9 prompts
- ✅ Có 6 prompts active (màu xanh)
- ✅ Có 3 prompts inactive (màu xám)
- ✅ Thấy prompt "Tạo dàn ý bài viết" (generate_outline)

---

### ☐ 13. Test Edit Prompt

1. Click **"Edit"** trên prompt bất kỳ (ví dụ: generate_outline)
2. Thay đổi description
3. Click **"Save"**

**Expected:**
- ✅ Hiển thị thông báo "Cập nhật prompt thành công"
- ✅ Thay đổi xuất hiện ngay lập tức
- ✅ Không cần restart server

---

### ☐ 14. Test Generate Outline Feature

1. Truy cập: https://volxai.com/editor
2. Click **"Tạo dàn ý"** hoặc **"Generate Outline"**
3. Nhập:
   - Keyword: "AI Technology"
   - Language: Vietnamese
   - Length: Medium
   - Tone: Professional
4. Click **"Generate"**

**Expected:**
- ✅ Outline được tạo thành công
- ✅ Format đúng: `[h2]` và `[h3]`
- ✅ Nội dung liên quan đến keyword
- ✅ Không có lỗi console

---

### ☐ 15. Test Generate Article với Auto-Outline

1. Truy cập: https://volxai.com/editor
2. Click **"Tạo bài viết"**
3. Chọn **"Không cần dàn ý"** (No outline)
4. Nhập keyword
5. Click **"Generate"**

**Expected:**
- ✅ Bài viết được tạo thành công
- ✅ Có cấu trúc H2/H3 (auto-generated outline)
- ✅ Nội dung đầy đủ
- ✅ Console log: "📝 Auto-generating outline..."

---

### ☐ 16. Test Rewrite Content

1. Viết một đoạn text
2. Select text
3. Click **"Rewrite"**
4. Chọn style (professional, casual, v.v.)

**Expected:**
- ✅ Text được viết lại thành công
- ✅ Style đúng như chọn
- ✅ Không có lỗi

---

### ☐ 17. Test Expand Content

1. Viết một đoạn text ngắn
2. Click **"Write More"** hoặc **"Expand"**

**Expected:**
- ✅ Nội dung được mở rộng
- ✅ Tiếp nối tự nhiên
- ✅ Không bị lặp lại

---

### ☐ 18. Test SEO Title Generation

1. Trong editor, có content
2. Click **"Generate SEO Title"**

**Expected:**
- ✅ Tiêu đề SEO được tạo
- ✅ Độ dài phù hợp (50-60 ký tự)
- ✅ Có từ khóa

---

### ☐ 19. Test Meta Description Generation

1. Trong editor, có content
2. Click **"Generate Meta Description"**

**Expected:**
- ✅ Meta description được tạo
- ✅ Độ dài phù hợp (150-160 ký tự)
- ✅ Tóm tắt content

---

## 🔍 ERROR CHECKING

### ☐ 20. Kiểm Tra Console Logs (Browser)

Mở DevTools Console khi test các features

**Expected:** Không có errors màu đỏ

**Acceptable warnings:**
- ⚠️ Third-party library warnings (OK)
- ⚠️ React warnings (OK nếu không ảnh hưởng)

**Unacceptable errors:**
- ❌ "Failed to load prompt"
- ❌ "Database connection error"
- ❌ "Prompt not found"

---

### ☐ 21. Kiểm Tra Server Logs

```bash
ssh jybcaorr@ghf57-22175.azdigihost.com -p 2210
pm2 logs volxai-api --lines 50
```

**Expected khi test features:**
```
✅ Generate Outline success - Deducting XXX tokens
✅ AI Rewrite success - Deducting XXX tokens
✅ Auto-generated outline successfully
```

**Watch for:**
- ❌ "Error loading prompt for..."
- ❌ "Failed to fetch prompt"
- ❌ Database errors

---

## 🎯 FINAL VERIFICATION

### ☐ 22. Verify Fallback Mechanism

**Test:** Tạm thời vô hiệu hóa 1 prompt

```sql
UPDATE ai_prompts SET is_active = 0 WHERE feature_name = 'generate_outline';
```

**Test feature:** Generate Outline vẫn hoạt động (dùng fallback)

**Restore:**
```sql
UPDATE ai_prompts SET is_active = 1 WHERE feature_name = 'generate_outline';
```

**Expected:**
- ✅ Feature vẫn hoạt động với fallback prompt
- ✅ Console warning: "Prompt not found, using fallback"

---

### ☐ 23. Performance Check

Test thời gian response của các AI features:

**Acceptable:**
- Generate Outline: 5-15 giây
- Generate Article: 20-60 giây (tùy length)
- Rewrite: 3-10 giây
- SEO Title: 2-5 giây
- Meta Description: 2-5 giây

**Note:** Thời gian load prompt từ database negligible (<100ms)

---

## ✅ COMPLETION CHECKLIST

Đánh dấu ✅ khi hoàn thành:

- [ ] Database connection OK
- [ ] Bảng ai_prompts tồn tại
- [ ] Có 6 prompts active
- [ ] Prompt generate_outline tồn tại (ID: 21)
- [ ] Function loadPrompt có trong code
- [ ] Generate Outline load từ DB
- [ ] Expand Content feature name đã sửa
- [ ] Build project thành công
- [ ] Admin Dashboard hiển thị prompts
- [ ] Test edit prompt thành công
- [ ] Test Generate Outline thành công
- [ ] Test Auto-outline thành công
- [ ] Test Rewrite thành công
- [ ] Test Expand Content thành công
- [ ] Test SEO Title thành công
- [ ] Test Meta Description thành công
- [ ] Không có errors trong console
- [ ] Server logs OK
- [ ] Fallback mechanism hoạt động
- [ ] Performance acceptable

---

## 🎉 KẾT QUẢ CUỐI CÙNG

Nếu tất cả checkboxes được đánh dấu ✅:

**✅ CHUYỂN ĐỔI AI PROMPTS SANG DATABASE HOÀN TẤT!**

**Lợi ích đã đạt được:**
1. ✅ Zero downtime updates
2. ✅ Non-technical admin access
3. ✅ Instant prompt changes
4. ✅ Centralized management
5. ✅ Fallback safety

---

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. `AI_PROMPTS_DATABASE_MIGRATION_REPORT.md` - Báo cáo chi tiết
2. `AI_PROMPTS_MIGRATION_SUMMARY.md` - Tóm tắt
3. `AI_PROMPTS_BEFORE_AFTER_COMPARISON.md` - So sánh trước/sau

---

**Ngày kiểm tra:** _______________________  
**Người kiểm tra:** _______________________  
**Kết quả:** [ ] Pass  [ ] Fail  [ ] Needs Review
