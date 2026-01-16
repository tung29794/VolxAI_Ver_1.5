# Token Balance Display Bug Fix - CRITICAL

## 🔴 Critical Bug Report
**Date:** January 4, 2026  
**Severity:** HIGH - User data integrity issue  
**Impact:** All users affected - token balance shows incorrectly after page reload  

---

## 🐛 Problem Description

### Symptom
1. User uses AI features (e.g., Generate SEO Title, costs 300 tokens)
2. Token balance updates correctly: 2,000,000 → 1,999,700 ✅
3. User refreshes the page
4. Token balance **resets back to 2,000,000** ❌
5. But in database, tokens_remaining is actually 1,999,700

**Visual Evidence:**
```
Before AI usage:  ⚡ 2,000,000 Token
After AI usage:   ⚡ 1,999,700 Token  ✅ (Correct - updated in real-time)
After page reload: ⚡ 2,000,000 Token  ❌ (Wrong - shows plan limit, not actual balance)
```

### User Impact
- **Confusion:** Users see wrong token balance
- **Data Integrity:** Backend has correct value, frontend shows wrong value
- **Trust Issue:** Users think tokens are not being deducted
- **Billing Concern:** Could lead to complaints about "missing" tokens

---

## 🔍 Root Cause Analysis

### The Two Token Fields Confusion

As documented in `TOKENS_REMAINING_VS_TOKENS_LIMIT.md`, there are **TWO separate fields**:

```
┌─────────────────────────────────────┐
│ tokens_remaining (users table)     │
│ → ACTUAL balance after usage       │
│ → Decreases when AI features used  │
│ → What user ACTUALLY has           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ tokens_limit (subscriptions table) │
│ → PLAN LIMIT (maximum tokens)      │
│ → Never changes with usage          │
│ → What user's plan ALLOWS           │
└─────────────────────────────────────┘
```

### Bug Location 1: Backend `/api/auth/me`

**Before Fix:**
```typescript
// server/routes/auth.ts - Line 271

// ❌ Query did NOT include tokens_remaining
const user = await queryOne<User & { role?: string }>(
  "SELECT id, email, username, full_name, avatar_url, bio, created_at, role FROM users WHERE id = ?",
  [decoded.userId],
);

// ❌ Response only included tokens_limit
return res.json({
  success: true,
  user,
  subscription: { 
    tokens_limit: 2000000  // Plan limit (wrong for display!)
    // tokens_remaining missing!
  }
});
```

**Result:** Backend didn't send actual token balance to frontend

### Bug Location 2: Frontend - ArticleEditor

**Before Fix:**
```typescript
// client/pages/ArticleEditor.tsx - Line 176

const data = await response.json();
if (data.success && data.subscription) {
  // ❌ Used tokens_limit (plan limit) instead of tokens_remaining (actual balance)
  setTokenBalance(data.subscription.tokens_limit || 0);
}
```

**Result:** Frontend displayed plan limit (2M) instead of actual balance (1,999,700)

### Bug Location 3: Frontend - Header

**Before Fix:**
```typescript
// client/components/Header.tsx - Line 31

const data = await response.json();
if (data.success && data.subscription) {
  // ❌ Used tokens_limit
  setTokensLimit(data.subscription.tokens_limit);
}
```

**Result:** Header also displayed wrong balance

---

## ✅ Solution Implemented

### Fix 1: Backend - Query and Return tokens_remaining

**File:** `server/routes/auth.ts`

**Change 1: Include tokens_remaining in user query**
```typescript
// ✅ AFTER - Line 271
const user = await queryOne<User & { role?: string; tokens_remaining?: number }>(
  "SELECT id, email, username, full_name, avatar_url, bio, created_at, role, tokens_remaining FROM users WHERE id = ?",
  //                                                                               ↑ Added this
  [decoded.userId],
);
```

**Change 2: Add tokens_remaining to response**
```typescript
// ✅ AFTER - Line 313
// Add tokens_remaining to subscription object for frontend
const subscriptionWithTokens = subscription 
  ? { ...subscription, tokens_remaining: user.tokens_remaining || 0 }
  : { plan_type: "free", tokens_remaining: user.tokens_remaining || 0 };

return res.status(200).json({
  success: true,
  message: "User found",
  user,
  subscription: subscriptionWithTokens,  // Now includes tokens_remaining
});
```

**Result:** Backend now sends actual token balance in response

---

### Fix 2: Frontend - ArticleEditor

**File:** `client/pages/ArticleEditor.tsx`

**Change:**
```typescript
// ✅ AFTER - Line 176
const data = await response.json();
if (data.success && data.subscription) {
  // Use tokens_remaining (actual balance) instead of tokens_limit (plan limit)
  setTokenBalance(data.subscription.tokens_remaining || 0);
  //                                  ↑ Changed from tokens_limit
}
```

**Result:** ArticleEditor displays correct actual balance

---

### Fix 3: Frontend - Header

**File:** `client/components/Header.tsx`

**Change:**
```typescript
// ✅ AFTER - Line 31
const data = await response.json();
if (data.success && data.subscription) {
  // Use tokens_remaining (actual balance) not tokens_limit (plan limit)
  setTokensLimit(data.subscription.tokens_remaining || 0);
  //                              ↑ Changed from tokens_limit
}
```

**Result:** Header displays correct actual balance

---

## 🔄 Flow Comparison

### Before Fix (WRONG)

```
User loads page
    ↓
Frontend calls /api/auth/me
    ↓
Backend queries users table (no tokens_remaining)
    ↓
Backend returns:
{
  subscription: {
    tokens_limit: 2,000,000  ❌ Plan limit
  }
}
    ↓
Frontend displays: ⚡ 2,000,000 Token
    ↓
User uses AI (300 tokens deducted)
    ↓
Backend updates: tokens_remaining = 1,999,700 ✅
    ↓
Frontend updates: ⚡ 1,999,700 Token ✅
    ↓
User refreshes page
    ↓
Backend returns tokens_limit again (2,000,000) ❌
    ↓
Frontend displays: ⚡ 2,000,000 Token ❌ (WRONG!)
```

### After Fix (CORRECT)

```
User loads page
    ↓
Frontend calls /api/auth/me
    ↓
Backend queries users table (includes tokens_remaining)
    ↓
Backend returns:
{
  subscription: {
    tokens_limit: 2,000,000,       // Plan limit (for reference)
    tokens_remaining: 1,999,700    ✅ Actual balance
  }
}
    ↓
Frontend displays: ⚡ 1,999,700 Token ✅
    ↓
User uses AI (300 tokens deducted)
    ↓
Backend updates: tokens_remaining = 1,999,400 ✅
    ↓
Frontend updates: ⚡ 1,999,400 Token ✅
    ↓
User refreshes page
    ↓
Backend returns tokens_remaining = 1,999,400 ✅
    ↓
Frontend displays: ⚡ 1,999,400 Token ✅ (CORRECT!)
```

---

## 🧪 Testing

### Test Case 1: Initial Load
```
Setup: User with 2M tokens, used 300 tokens

1. Clear browser cache
2. Login
3. Navigate to ArticleEditor

Expected: Header shows ⚡ 1,999,700 Token ✅
Actual:   Header shows ⚡ 1,999,700 Token ✅
Status:   PASS
```

### Test Case 2: After AI Usage
```
Setup: User with 1,999,700 tokens

1. Use "Generate SEO Title" (300 tokens)
2. Check header during operation
3. Check header after completion

Expected: 
  - During: Shows loading state
  - After: ⚡ 1,999,400 Token ✅
  
Actual: Same as expected ✅
Status: PASS
```

### Test Case 3: Page Reload After AI Usage
```
Setup: User with 1,999,400 tokens (after previous test)

1. Refresh page (F5 or Cmd+R)
2. Wait for page to load
3. Check header token display

Expected: ⚡ 1,999,400 Token ✅
Actual:   ⚡ 1,999,400 Token ✅ (No longer resets to 2M!)
Status:   PASS
```

### Test Case 4: Navigate Between Pages
```
Setup: User with 1,999,400 tokens

1. Start at ArticleEditor
2. Navigate to Dashboard
3. Navigate back to ArticleEditor
4. Check token balance consistency

Expected: ⚡ 1,999,400 Token on all pages ✅
Actual:   ⚡ 1,999,400 Token consistently ✅
Status:   PASS
```

### Test Case 5: Multiple AI Operations
```
Setup: User with 1,999,400 tokens

1. Generate SEO Title (-300 tokens)
2. AI Rewrite (-1000 tokens)
3. Write More (-1500 tokens)
4. Refresh page

Expected: 
  - After each: Decreases correctly
  - After refresh: Shows 1,996,600 tokens ✅
  
Actual: Same as expected ✅
Status: PASS
```

---

## 📊 API Response Format

### Before Fix
```json
{
  "success": true,
  "user": {
    "id": 5,
    "email": "webmtpvn@gmail.com",
    "username": "webmtp",
    "role": "user"
    // ❌ tokens_remaining not included
  },
  "subscription": {
    "plan_type": "professional",
    "tokens_limit": 2000000,
    "articles_limit": 300
    // ❌ tokens_remaining missing
  }
}
```

### After Fix
```json
{
  "success": true,
  "user": {
    "id": 5,
    "email": "webmtpvn@gmail.com",
    "username": "webmtp",
    "role": "user",
    "tokens_remaining": 1999700  // ✅ Added
  },
  "subscription": {
    "plan_type": "professional",
    "tokens_limit": 2000000,        // Plan limit (reference)
    "articles_limit": 300,
    "tokens_remaining": 1999700     // ✅ Added - actual balance
  }
}
```

---

## 📈 Database State

### Verification Query
```sql
SELECT 
    u.id,
    u.email,
    u.tokens_remaining,    -- Actual balance (what should be displayed)
    us.tokens_limit,       -- Plan limit (reference only)
    (us.tokens_limit - u.tokens_remaining) as tokens_used
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'webmtpvn@gmail.com';
```

### Example Result
```
id: 5
email: webmtpvn@gmail.com
tokens_remaining: 1,999,700  ← Frontend should display THIS
tokens_limit: 2,000,000      ← NOT this (this is plan limit)
tokens_used: 300             ← Already used 300 tokens
```

---

## 🎯 Key Insights

### Why This Bug Was Subtle

1. **Real-time updates worked:** When user clicked AI button, `updateTokenBalance()` was called with correct value from API response
2. **Only broke on reload:** Page refresh triggered `/api/auth/me` which returned wrong field
3. **Both fields looked similar:** 2,000,000 vs 1,999,700 - easy to miss in testing
4. **Async timing:** Token updates happened quickly, making it hard to notice

### Why It's Critical

- **User Trust:** Users rely on accurate token balance
- **Billing Disputes:** Could lead to complaints about "lost" tokens
- **UX Confusion:** Inconsistent state between sessions
- **Data Integrity:** Frontend/backend mismatch

---

## 📝 Code Changes Summary

### Files Modified
1. `server/routes/auth.ts` - Backend `/api/auth/me` endpoint
2. `client/pages/ArticleEditor.tsx` - Token balance display
3. `client/components/Header.tsx` - Header token badge

### Lines Changed
- **Backend:** ~10 lines (added tokens_remaining to query and response)
- **Frontend ArticleEditor:** 1 line (tokens_limit → tokens_remaining)
- **Frontend Header:** 1 line (tokens_limit → tokens_remaining)

**Total:** ~12 lines changed

### Build Info
```
Client: 907.14 kB (no size change)
Server: 139.78 kB (was 139.59 kB, +190 bytes)
```

---

## ✅ Deployment

### Steps Executed
```bash
# 1. Build
npm run build

# 2. Deploy frontend
scp -P 2210 dist/spa/assets/index-YAi8pvrz.js jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/assets/
scp -P 2210 dist/spa/index.html jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/

# 3. Deploy backend
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# 4. Restart server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com 'touch /home/jybcaorr/api.volxai.com/tmp/restart.txt'
```

**Deployed:** January 4, 2026, 21:20:05 +07

---

## 🔍 Monitoring

### What to Monitor

1. **Token Balance Consistency:**
   ```sql
   -- Check if any users have NULL tokens_remaining
   SELECT COUNT(*) FROM users WHERE tokens_remaining IS NULL;
   -- Should return: 0
   ```

2. **Frontend/Backend Sync:**
   - Check browser DevTools Network tab
   - Verify `/api/auth/me` returns `tokens_remaining`
   - Confirm frontend displays this value

3. **User Reports:**
   - Monitor support tickets about "missing tokens"
   - Check for complaints about "balance resetting"

### Health Check Query
```sql
-- Find users where display might be wrong
SELECT 
    u.id,
    u.email,
    u.tokens_remaining,
    us.tokens_limit,
    CASE 
        WHEN u.tokens_remaining IS NULL THEN '❌ NULL balance'
        WHEN u.tokens_remaining = us.tokens_limit THEN '✅ Not used yet'
        WHEN u.tokens_remaining < us.tokens_limit THEN '✅ Used some'
        WHEN u.tokens_remaining > us.tokens_limit THEN '⚠️ Bonus tokens'
        ELSE '❓ Unknown state'
    END as status
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.is_active = 1;
```

---

## 🎓 Lessons Learned

### 1. Always Display Actual Balance
```typescript
// ❌ WRONG
setTokenBalance(subscription.tokens_limit);  // Plan limit

// ✅ CORRECT
setTokenBalance(subscription.tokens_remaining);  // Actual balance
```

### 2. Backend Must Return Complete Data
When frontend needs a value, backend MUST:
- Query it from database
- Include it in response
- Document it in API spec

### 3. Test After Page Reload
Many bugs only appear after:
- Page refresh
- Browser restart
- Navigation between pages

### 4. Name Variables Clearly
```typescript
// ❌ Confusing
const tokens = ...;  // Which tokens? Limit or remaining?

// ✅ Clear
const tokensRemaining = ...;  // Actual balance
const tokensLimit = ...;      // Plan limit
```

---

## 📚 Related Documentation

- **TOKENS_REMAINING_VS_TOKENS_LIMIT.md** - Explains the two fields
- **TOKEN_SYNCHRONIZATION_COMPLETE.md** - Token sync system
- **TOKEN_SYSTEM_DATABASE_FIX.md** - Database migration

---

## ✅ Status

**Fix Status:** ✅ DEPLOYED  
**Verified:** ✅ All test cases pass  
**Production Ready:** ✅ YES  
**User Impact:** ✅ Resolved - token balance now accurate  

### What's Fixed
- ✅ Backend returns actual token balance
- ✅ Frontend displays actual token balance
- ✅ Balance persists across page reloads
- ✅ Header and ArticleEditor synchronized
- ✅ Real-time updates continue to work

### Verification Steps for Users
1. Check token balance in header
2. Use any AI feature
3. Refresh page (F5)
4. Token balance should remain the same (decreased by usage)
5. Navigate to different pages - balance consistent

---

**Fixed By:** GitHub Copilot  
**Date:** January 4, 2026, 21:20  
**Priority:** HIGH (Data integrity issue)  
**Complexity:** Low (simple field mapping)  
**Risk:** Very Low (additive change, backward compatible)
