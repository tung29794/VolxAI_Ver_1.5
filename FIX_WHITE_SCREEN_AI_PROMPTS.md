# 🔧 FIX: Màn hình trắng khi click AI Prompts

## ❌ Vấn đề
Khi click vào tab "AI Prompts" trong Admin, màn hình hiển thị trắng.

## 🔍 Nguyên nhân
Table `ai_prompts` chưa được tạo trong database hoặc backend chưa restart.

## ✅ Giải pháp

### Bước 1: Setup Database (QUAN TRỌNG!)

**Chạy script tự động:**
```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
./setup-database.sh
```

Script này sẽ:
1. ✅ Tạo table `ai_prompts` 
2. ✅ Import 5 default prompts

**Hoặc chạy manual:**
```bash
# 1. Tạo table
mysql -h 103.221.221.67 -P 3306 \
  -u jybcaorr_lisacontentdbapi \
  -p jybcaorr_lisacontentdbapi \
  < CREATE_AI_PROMPTS_TABLE_IF_NOT_EXISTS.sql

# 2. Import prompts
mysql -h 103.221.221.67 -P 3306 \
  -u jybcaorr_lisacontentdbapi \
  -p jybcaorr_lisacontentdbapi \
  < IMPORT_ALL_AI_PROMPTS.sql
```

### Bước 2: Restart Backend

```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

### Bước 3: Clear Cache & Test

1. Mở trình duyệt
2. Nhấn **Ctrl+Shift+R** (hoặc Cmd+Shift+R trên Mac) để hard refresh
3. Login lại vào Admin
4. Click tab "AI Prompts"
5. Bạn sẽ thấy 5 prompts:
   - ✅ Expand Content
   - ✅ Rewrite Content
   - ✅ Generate Article
   - ✅ Generate SEO Title
   - ✅ Generate Meta Description

---

## 🔎 Verify Database

Kiểm tra table đã tạo chưa:
```sql
mysql> SHOW TABLES LIKE 'ai_prompts';
-- Should return: ai_prompts

mysql> SELECT COUNT(*) FROM ai_prompts;
-- Should return: 5

mysql> SELECT feature_name, display_name FROM ai_prompts;
-- Should list 5 prompts
```

---

## 📊 Files đã deploy

### ✅ Frontend
- **Build:** ✅ dist/spa/ (924.08 kB)
- **Deploy:** ✅ public_html/
- **Status:** ✅ Live at volxai.com

### ✅ Backend
- **Build:** ✅ dist/server/node-build.mjs (150.79 kB)
- **Deploy:** ✅ api.volxai.com/
- **Status:** ✅ Running

### ⚠️ Database
- **Table:** ⚠️ Cần tạo với script
- **Prompts:** ⚠️ Cần import với script
- **Status:** ⚠️ RUN SETUP SCRIPT!

---

## 🚨 Nếu vẫn lỗi

### Check 1: Console Errors
1. Mở DevTools (F12)
2. Tab "Console"
3. Xem có lỗi gì?

**Nếu thấy:** `404` hoặc `500` error
→ Backend chưa restart hoặc table chưa có

**Nếu thấy:** `401 Unauthorized`
→ Login lại admin

### Check 2: Network Tab
1. DevTools → Network
2. Reload page
3. Tìm request: `/api/admin/prompts`
4. Xem response:
   - 200 OK + `{"success": true, "prompts": [...]}` → ✅ OK
   - 500 Error → ❌ Table chưa có
   - 401 Error → ❌ Auth token hết hạn

### Check 3: Backend Logs
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
tail -f /home/jybcaorr/api.volxai.com/logs/error.log
# Ctrl+C to exit
```

Nếu thấy: `Table 'ai_prompts' doesn't exist`
→ Chạy setup-database.sh

---

## 📝 Summary

**Root cause:** Table `ai_prompts` chưa được tạo trong database

**Solution:** Run `./setup-database.sh` để tạo table và import prompts

**Verify:** Vào Admin → AI Prompts → Thấy 5 prompts

---

**Status:** ✅ Frontend deployed | ✅ Backend deployed | ⚠️ Database setup required
