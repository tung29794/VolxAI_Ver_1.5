# 🔧 FIXED: White Screen - JSON Parse Issue

## ❌ Vấn đề
Admin Prompts page hiển thị màn hình trắng với lỗi JavaScript:
```
TypeError: (intermediate value)(intermediate value).map is not a function
```

## 🔍 Root Cause
MySQL trả về `available_variables` dưới dạng **string** thay vì JSON:
```json
// Database stores:
"[\"content\", \"language_instruction\"]"  // string

// Frontend expects:
["content", "language_instruction"]  // array
```

Frontend code `.map()` on string → **TypeError**

## ✅ Giải pháp

### Backend Fix (server/routes/admin.ts)

**GET /api/admin/prompts:**
```typescript
// Parse available_variables from JSON string to array
const parsedPrompts = prompts.map((prompt: any) => ({
  ...prompt,
  available_variables: typeof prompt.available_variables === 'string' 
    ? JSON.parse(prompt.available_variables) 
    : prompt.available_variables,
}));

res.json({
  success: true,
  prompts: parsedPrompts,  // ← Now returns proper arrays
});
```

**GET /api/admin/prompts/:id:**
```typescript
const parsedPrompt = {
  ...prompt,
  available_variables: typeof prompt.available_variables === 'string' 
    ? JSON.parse(prompt.available_variables) 
    : prompt.available_variables,
};
```

### Why This Happens
MySQL JSON column type stores data as string. When queried:
- ✅ **Native MySQL JSON functions:** Returns proper JSON
- ❌ **Direct SELECT:** Returns string representation

Node.js mysql2 library doesn't auto-parse JSON columns by default.

---

## 🚀 Fix Applied

1. ✅ Updated backend to parse JSON strings
2. ✅ Built backend: 151.24 kB
3. ✅ Deployed to production
4. ✅ Server restarted

---

## 🧪 Verification

### Test API Response:
```bash
# Get auth token from browser localStorage
TOKEN="your_auth_token"

curl -H "Authorization: Bearer $TOKEN" \
  https://api.volxai.com/api/admin/prompts | jq '.prompts[0].available_variables'

# Should return array:
# ["content", "language_instruction"]
# NOT string: "[\"content\", \"language_instruction\"]"
```

### Test Admin UI:
1. Vào: https://volxai.com/admin
2. Hard refresh: **Cmd+Shift+R**
3. Login
4. Click **"AI Prompts"** tab
5. Should see 5 prompts ✅ (no more white screen!)

---

## 📊 Before vs After

### Before (❌ Broken):
```javascript
// Response from backend:
{
  "success": true,
  "prompts": [
    {
      "id": 12,
      "feature_name": "expand_content",
      "available_variables": "[\"content\", \"language_instruction\"]"  // string!
    }
  ]
}

// Frontend tries:
prompts.map(p => p.available_variables.map(...))  // ERROR! string.map() doesn't exist
```

### After (✅ Working):
```javascript
// Response from backend:
{
  "success": true,
  "prompts": [
    {
      "id": 12,
      "feature_name": "expand_content",
      "available_variables": ["content", "language_instruction"]  // array!
    }
  ]
}

// Frontend:
prompts.map(p => p.available_variables.map(...))  // ✅ Works!
```

---

## 🎯 Similar Issues to Watch

If you see similar errors with other JSON fields:
1. Check if field is JSON type in MySQL
2. Verify backend parses it before sending to frontend
3. Add similar parsing:
   ```typescript
   field: typeof data.field === 'string' ? JSON.parse(data.field) : data.field
   ```

Common JSON fields in database:
- `available_variables` (ai_prompts) ✅ FIXED
- `keywords` (articles) - May need similar fix
- `settings` - May need similar fix
- Any column with `JSON` type

---

## 📝 Code Changes

### File: `server/routes/admin.ts`

**Lines changed:** 2 endpoints
- Line ~900: GET /prompts
- Line ~945: GET /prompts/:id

**Impact:** 
- ✅ All AI Prompts API responses now properly formatted
- ✅ Frontend can render without errors
- ✅ No breaking changes (backward compatible)

---

## ✅ Status

- [x] Issue identified (JSON string vs array)
- [x] Backend fixed (parse JSON before response)
- [x] Build successful (151.24 kB)
- [x] Deployed to production
- [x] Server restarted
- [x] Ready for testing

---

**Next:** Vào https://volxai.com/admin → Hard refresh → Test AI Prompts tab! 🎉
