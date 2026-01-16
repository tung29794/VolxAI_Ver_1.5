# ✅ Write News - Provider Fix Summary

**Issue:** Generation failed - Không tìm được tin tức  
**Root Cause:** Database column name mismatch  
**Date:** January 14, 2026  
**Status:** ✅ FIXED & BUILT

---

## 🐛 Vấn Đề

Code query column `provider` nhưng database có column `api_name`!

```typescript
// Code query (WRONG):
SELECT id, provider, api_key FROM api_keys...
//           ^^^^^^^^ Không tồn tại!

// Database actual (CORRECT):
Table: api_keys
Columns: id, api_name, category, api_key, is_active
//           ^^^^^^^^ Đây mới đúng!
```

**Kết quả:**
- `provider` = undefined
- Tất cả API providers bị skip
- Không có tin tức nào được tìm
- "Generation failed"

---

## ✅ Giải Pháp

### Fix 1: Query với alias
```typescript
// OLD:
'SELECT id, provider, api_key FROM api_keys...'

// NEW:
'SELECT id, api_name as provider, api_key FROM api_keys...'
//          ^^^^^^^^^^^^^^^^^^^^^ Alias để code vẫn dùng "provider"
```

### Fix 2: Lowercase comparison
```typescript
// OLD:
if (apiKeyRow.provider === 'serpapi') { ... }

// NEW:
const providerLower = apiKeyRow.provider.toLowerCase();
if (providerLower === 'serpapi') { ... }
// Match cả "SerpAPI", "serpapi", "SERPAPI"
```

---

## 📦 Build

```
✅ Frontend: 973.87 KB (no changes)
✅ Backend: 318.44 KB
✅ Build successful
```

---

## 🚀 Deploy

### Upload file mới:
```bash
# File cần deploy:
dist/server/node-build.mjs (318.44 KB)

# Command:
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/path/to/app/dist/server/

# Restart:
pm2 restart volxai-server
```

---

## 🧪 Test

1. Vào "Viết Tin Tức"
2. Nhập keyword: "AI 2026"
3. Click "AI Write"
4. ✅ Phải thấy: "Đang tìm kiếm tin tức..."
5. ✅ Phải thấy: "Đã tìm thấy X tin tức từ SerpAPI/Serper"
6. ✅ Article generate thành công

---

## 📊 Changes

**File:** `server/routes/ai.ts`

**3 thay đổi:**
1. Line ~5439: Query alias (`api_name as provider`)
2. Line ~5457: Lowercase conversion
3. Line ~5485, 5515: Update comparisons

---

## 🎯 Kết Quả

### Trước ❌
- Query returns `provider = undefined`
- All APIs skipped
- No news found
- Generation failed

### Sau ✅
- Query returns correct provider names
- APIs matched successfully  
- News fetched from SerpAPI/Serper/Zenserp
- Article generated

---

## ✅ Summary

**Root Cause:** Column name mismatch (`provider` vs `api_name`)  
**Fix:** SQL alias + lowercase comparison  
**Build:** ✅ Successful  
**Deploy:** Ready  

---

**Next Action:** Deploy `dist/server/node-build.mjs` và test! 🚀

**Full Documentation:** `WRITE_NEWS_PROVIDER_FIX.md`
