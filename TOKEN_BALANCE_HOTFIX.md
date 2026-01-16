# 🔧 Token Balance Display Fix - HOTFIX

## 🐛 Bug Report

**Issue:** Token balance hiển thị **0 Token** trong Article Editor mặc dù tài khoản có **2,000,000 Token**

**Reported:** January 4, 2026
**Status:** ✅ FIXED & DEPLOYED

---

## 🔍 Root Cause Analysis

### Problem:
Có **inconsistency** trong cách lấy data từ API `/api/auth/me`:

#### Header Component (✅ Correct):
```typescript
const data = await response.json();
if (data.success && data.subscription) {
  setTokensLimit(data.subscription.tokens_limit);  // ✅ Lấy từ subscription
}
```

#### Article Editor (❌ Wrong - Before Fix):
```typescript
const data = await response.json();
if (data.success && data.user) {
  setTokenBalance(data.user.tokens_remaining || 0);  // ❌ Lấy từ user
}
```

### Why it failed:
- API `/api/auth/me` trả về data structure có `data.subscription.tokens_limit`
- Article Editor đang tìm `data.user.tokens_remaining` (field không tồn tại)
- Result: `data.user.tokens_remaining` = `undefined`
- `undefined || 0` = `0` → Hiển thị **0 Token**

---

## ✅ Solution

### Fixed Code:
```typescript
// Load user token balance
useEffect(() => {
  const loadTokenBalance = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/auth/me"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.subscription) {
        // ✅ FIXED: Use tokens_limit from subscription, same as Header component
        setTokenBalance(data.subscription.tokens_limit || 0);
      }
    } catch (error) {
      console.error("Failed to fetch token balance:", error);
    }
  };

  loadTokenBalance();
}, []);
```

### Changes Made:
1. Changed `data.user.tokens_remaining` → `data.subscription.tokens_limit`
2. Changed condition from `data.user` → `data.subscription`
3. Added comment to prevent future confusion

---

## 📊 Data Structure from API

### `/api/auth/me` Response:
```json
{
  "success": true,
  "user": {
    "id": 123,
    "username": "tungna1157",
    "email": "webmtpvn@gmail.com",
    // ... other user fields
  },
  "subscription": {
    "tokens_limit": 2000000,  // ← Token balance ở đây
    "plan_name": "Premium",
    // ... other subscription fields
  }
}
```

### Correct Access:
```typescript
data.subscription.tokens_limit  // ✅ 2,000,000
data.user.tokens_remaining      // ❌ undefined (field không tồn tại)
```

---

## 🚀 Deployment

### Build:
```bash
npm run build
# ✓ Client: 907.12 kB (gzipped: 250.68 kB)
# ✓ Server: 138.40 kB
```

### Deploy:
```bash
rsync -avz -e 'ssh -p 2210' dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ \
  --exclude='.htaccess'
# ✓ 8 files synced (1.02 MB)
```

---

## ✅ Verification

### Before Fix:
```
Header:         [⚡ 2,000,000 Token]  ✅
Article Editor: [⚡ 0 Token]          ❌ BUG!
```

### After Fix:
```
Header:         [⚡ 2,000,000 Token]  ✅
Article Editor: [⚡ 2,000,000 Token]  ✅ FIXED!
```

---

## 🧪 Testing Instructions

### Test Case: Verify Token Balance Display

1. **Login** với account có 2,000,000 tokens
2. **Check Header:** Xem token badge → Expected: **2,000,000 Token** ✅
3. **Navigate** to Article Editor (write new or edit existing)
4. **Check Token Badge** in Article Editor header
5. **Expected:** Badge shows **2,000,000 Token** (same as Header)

### Test Case: Real-time Update Still Works

1. Use any AI feature (e.g., AI Rewrite - 1000 tokens)
2. **Expected:** 
   - Toast: "Rewrite thành công! Đã sử dụng 1,000 tokens. Còn lại: 1,999,000 tokens"
   - Badge updates to: **1,999,000 Token**

---

## 📝 Lessons Learned

### 1. **Always check data structure consistency**
- Khi copy code từ component khác, verify data structure match
- Header component đã hoạt động đúng → nên dùng cùng approach

### 2. **Add console.log for debugging**
```typescript
const data = await response.json();
console.log("API response:", data);  // Debug để thấy structure
```

### 3. **Add comments for clarity**
```typescript
// Use tokens_limit from subscription, same as Header component
setTokenBalance(data.subscription.tokens_limit || 0);
```

---

## 🔗 Related Files

- `/client/pages/ArticleEditor.tsx` - Fixed token balance loading
- `/client/components/Header.tsx` - Reference for correct implementation
- `/TOKEN_BALANCE_DISPLAY_UPDATE.md` - Original feature documentation

---

## 📊 Impact

- **Bug Severity:** Medium (UI bug, not affecting functionality)
- **User Impact:** Users thought they had 0 tokens (confusing)
- **Fix Time:** < 5 minutes
- **Deploy Time:** < 2 minutes
- **Status:** ✅ LIVE on production

---

## 🎉 Summary

### Problem:
❌ Token balance hiển thị **0 Token** trong Article Editor

### Root Cause:
❌ Sử dụng sai field: `data.user.tokens_remaining` thay vì `data.subscription.tokens_limit`

### Solution:
✅ Đổi sang `data.subscription.tokens_limit` (same as Header)

### Result:
✅ Token balance giờ hiển thị đúng **2,000,000 Token** trong Article Editor
✅ Consistent với Header component
✅ Real-time updates vẫn hoạt động bình thường

---

**🔥 HOTFIX deployed successfully! Token balance now displays correctly! 🔥**
