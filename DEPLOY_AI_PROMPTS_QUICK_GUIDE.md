# 🚀 Quick Deployment Guide - AI Prompt Management

## ✅ Đã Deploy

### Frontend (DONE ✅)
```bash
# Files deployed:
✅ index-WFjagSoY.js → /home/jybcaorr/public_html/assets/
✅ index-B4TuwAi_.css → /home/jybcaorr/public_html/assets/
✅ index.html → /home/jybcaorr/public_html/
```

### Backend (DONE ✅)
```bash
# File deployed:
✅ node-build.mjs → /home/jybcaorr/api.volxai.com/
✅ App restarted via Passenger
```

---

## 🗄️ Database Setup (CHƯA CHẠY - CẦN THỰC HIỆN)

### Option 1: Qua cPanel phpMyAdmin (RECOMMENDED)

1. **Truy cập cPanel:**
   - URL: https://ghf57-22175.azdigihost.com:2083
   - Login với tài khoản hosting

2. **Mở phpMyAdmin:**
   - Click vào icon **phpMyAdmin** trong cPanel
   - Chọn database: `jybcaorr_lisacontentdbapi`

3. **Run SQL Script:**
   - Click tab **SQL** ở trên
   - Mở file `CREATE_AI_PROMPTS_TABLE.sql` 
   - Copy toàn bộ nội dung
   - Paste vào SQL editor
   - Click **Go** để thực thi

4. **Verify:**
   - Click tab **Structure** 
   - Tìm table `ai_prompts` trong danh sách
   - Click table để xem data
   - Phải có **7 records** (default prompts)

---

### Option 2: Qua SSH Command Line

```bash
# 1. Connect to server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# 2. Upload SQL file
scp -P 2210 CREATE_AI_PROMPTS_TABLE.sql \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/

# 3. Login to MySQL
mysql -h 103.221.221.67 -P 3306 \
  -u jybcaorr_lisaaccountcontentapi \
  -p jybcaorr_lisacontentdbapi

# 4. Run SQL script
source /home/jybcaorr/CREATE_AI_PROMPTS_TABLE.sql

# 5. Verify
SELECT COUNT(*) FROM ai_prompts;
-- Should return 7

SELECT feature_name, display_name, is_active 
FROM ai_prompts 
ORDER BY display_name;
-- Should show all 7 prompts
```

---

## 🧪 Testing Steps

### 1. Verify Frontend
- ✅ Visit: https://volxai.com
- ✅ Should load without errors
- ✅ Check browser console for JS errors

### 2. Login as Admin
```
URL: https://volxai.com/admin
Username: admin
Password: [your admin password]
```

### 3. Access AI Prompts Menu
1. Click **Admin Dashboard** in header
2. Look at left sidebar
3. Find menu item: **AI Prompts** (MessageSquare icon)
4. Click it

**Expected Result:**
- Page loads with grid of prompt cards
- Shows 7 prompts:
  1. Viết tiếp nội dung (write_more)
  2. Tạo tiêu đề SEO (seo_title)
  3. Tạo mô tả meta (meta_description)
  4. Viết lại nội dung (ai_rewrite)
  5. Tạo bài viết hoàn chỉnh (generate_article)
  6. Mở rộng nội dung (expand_content)
  7. Tóm tắt nội dung (summarize)

### 4. Test Edit Prompt
1. Click **Chỉnh sửa** on any prompt card
2. Modal opens with editable fields
3. Change the **Display Name** (e.g., add "[TEST]")
4. Click **Save**
5. Should see success toast
6. Modal closes
7. Card should show updated name

### 5. Test Toggle Active
1. Find any prompt card
2. Click **Power button** (top right of card)
3. Icon should change color (green ↔ gray)
4. Success toast appears
5. Prompt card opacity changes

### 6. Test Write More Feature
1. Go to **Article Editor** (create new article)
2. Type some Vietnamese text
3. Highlight the text
4. Click **Write More** button
5. Wait for AI to generate content

**Expected:**
- Content generates successfully
- Uses Vietnamese language (from database prompt)
- Inserts after highlighted text
- Single line break spacing

---

## 🔍 Troubleshooting

### Issue: "ai_prompts" table not found
**Cause:** SQL script chưa chạy  
**Fix:** Run `CREATE_AI_PROMPTS_TABLE.sql` trong phpMyAdmin

### Issue: Admin Prompts menu shows empty
**Cause:** Database không có data  
**Fix:** Check INSERT statements trong SQL script đã chạy chưa

### Issue: Edit prompt không save được
**Cause:** Backend API lỗi hoặc permission  
**Fix:** 
1. Check browser console errors
2. Check Network tab → Response
3. Verify admin role in database

### Issue: Write More không dùng prompt từ DB
**Cause:** `loadPrompt()` function có thể fail  
**Fix:** 
1. Check server logs: `tail -f /home/jybcaorr/api.volxai.com/logs/app.log`
2. Verify table exists: `SHOW TABLES LIKE 'ai_prompts';`
3. Check is_active = TRUE for write_more prompt

---

## 📊 Verification Checklist

### Database ✅
- [ ] Table `ai_prompts` exists
- [ ] 7 records inserted
- [ ] All records have is_active = TRUE
- [ ] feature_name is unique
- [ ] No NULL values in required fields

### Backend API ✅
- [ ] GET /admin/prompts returns 200
- [ ] Returns array of 7 prompts
- [ ] Each prompt has all fields
- [ ] Only admin can access (test with non-admin)

### Frontend UI ✅
- [ ] AI Prompts menu visible in sidebar
- [ ] Prompts grid loads successfully
- [ ] Cards display correctly
- [ ] Edit modal opens
- [ ] Save button works
- [ ] Toggle button works

### Integration ✅
- [ ] Write More loads prompt from DB
- [ ] Language instruction interpolated
- [ ] Content variable replaced
- [ ] AI response uses correct prompt
- [ ] Fallback works if DB fails

---

## 📝 SQL Script Content (Quick Reference)

```sql
-- Create table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  available_variables JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert 7 default prompts
-- (See CREATE_AI_PROMPTS_TABLE.sql for full content)
```

---

## 🎯 Next Actions

### Priority 1 (URGENT): Database Setup
**Action:** Run SQL script để tạo table + seed data  
**Method:** phpMyAdmin (easiest) hoặc SSH  
**Time:** 2-5 phút  
**Status:** 🔴 CHƯA THỰC HIỆN

### Priority 2: Testing
**Action:** Test toàn bộ flow từ admin panel  
**Method:** Manual testing theo checklist trên  
**Time:** 10-15 phút  
**Status:** 🟡 PENDING database setup

### Priority 3: Monitor
**Action:** Theo dõi logs và user feedback  
**Method:** Check server logs, browser console  
**Time:** Ongoing  
**Status:** 🟡 PENDING deployment complete

---

## ✅ Current Status

**Code:** ✅ COMPLETE (100%)  
**Build:** ✅ SUCCESS  
**Frontend Deploy:** ✅ DONE  
**Backend Deploy:** ✅ DONE  
**Database Setup:** 🔴 **PENDING - CẦN THỰC HIỆN**  
**Testing:** 🟡 PENDING  

---

## 📞 Support

**Issue:** Cannot access phpMyAdmin  
**Solution:** Contact hosting support hoặc dùng SSH method

**Issue:** SQL script errors  
**Solution:** Check MySQL version compatibility (should be 5.7+)

**Issue:** Permission denied  
**Solution:** Verify database user có quyền CREATE TABLE

---

**Last Updated:** January 4, 2026  
**Deploy Time:** ~21:40  
**Status:** Awaiting database setup to complete feature
