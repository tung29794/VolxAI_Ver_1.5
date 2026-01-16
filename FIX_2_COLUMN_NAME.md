# 🔧 Fix #2 - Column Name Error

## ❌ Lỗi Mới Phát Hiện

```
Error: Unknown column 'api_name' in 'SELECT'
at (index-D8ZFGYst.js:21:376)
```

**Root Cause:** Backend code query sai tên column!

### Code Lỗi:
```typescript
const apiKeysRows = await query(
  'SELECT id, api_name as provider, api_key, quota_remaining FROM api_keys ...',
  //          ^^^^^^^^ ❌ Column này KHÔNG TỒN TẠI!
  ['search']
);
```

### Database Schema:
```sql
Table: api_keys
Columns:
  - id
  - provider          ✅ Đúng
  - category
  - api_key
  - is_active
  - NOT api_name ❌
```

## ✅ Fix Applied

### Sửa Query:
```typescript
const apiKeysRows = await query(
  'SELECT id, provider, api_key, quota_remaining FROM api_keys WHERE category = ? AND is_active = TRUE ORDER BY RAND()',
  //          ^^^^^^^^ ✅ Sử dụng đúng tên column
  ['search']
);
```

### Changes:
- ❌ `api_name as provider` → ✅ `provider`
- ✅ Thêm debug logging để track query results

## 🚀 Deployment

```bash
npm run build:server
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

**Status:** ✅ Deployed

## 🧪 Test Again

Refresh page và test lại:
1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Viết Tin Tức → "giá vàng hôm nay"
3. Click "AI Write"

**Expected:** Bây giờ sẽ pass qua step 2 (fetch search API keys) và tiếp tục các steps sau!

---

**Fix #:** 2/2  
**Date:** 14/01/2026  
**Status:** ✅ Deployed & Ready for Testing
