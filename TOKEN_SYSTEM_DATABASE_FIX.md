# Token System Database Fix - CRITICAL

## 🔴 Critical Issue Resolved
**Date:** January 4, 2026  
**Impact:** HIGH - All AI features were blocked for all users  
**Status:** ✅ FIXED

## Problem Description

### Symptom
Users with valid subscriptions (e.g., 2,000,000 tokens) were blocked from using AI features with error:
- Modal showed: "Token hiện tại: 0"
- API returned: 402 Insufficient Tokens
- Console error: `Failed to load resource: 402`

### Root Cause
The `users` table was **MISSING** the `tokens_remaining` column entirely!

**Database Schema Issue:**
```sql
-- BEFORE (Missing column):
DESCRIBE users;
-- Output: id, email, username, password, full_name, avatar_url, bio, 
--         is_active, is_verified, role, created_at, updated_at
-- ❌ NO tokens_remaining column!

-- Backend code expected:
SELECT tokens_remaining FROM users WHERE id = ?;
-- Result: ERROR 1054 (42S22): Unknown column 'tokens_remaining'
```

**Why This Happened:**
- Token system was designed to use `users.tokens_remaining` for balance tracking
- Database migration was never run to add the column
- Backend SQL queries failed silently or returned NULL
- All users appeared to have 0 tokens

## Solution Implemented

### Step 1: Add Missing Column
```sql
ALTER TABLE users 
ADD COLUMN tokens_remaining INT DEFAULT NULL 
AFTER role;
```

**Result:** Column created successfully

### Step 2: Initialize Token Balances
```sql
UPDATE users u 
JOIN user_subscriptions us ON u.id = us.user_id 
SET u.tokens_remaining = us.tokens_limit 
WHERE us.is_active = 1 
  AND (u.tokens_remaining IS NULL OR u.tokens_remaining = 0);
```

**Result:** All active users got their tokens initialized from their plan limits

### Step 3: Verification
```sql
SELECT u.id, u.email, u.tokens_remaining, us.tokens_limit, us.plan_type
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
WHERE u.email = 'webmtpvn@gmail.com';
```

**Result:**
```
id: 5
email: webmtpvn@gmail.com
tokens_remaining: 2,000,000 ✅
tokens_limit: 2,000,000
plan_type: professional
```

## Database Architecture

### Current Token Storage
```
┌─────────────────────────────────────────────────────┐
│ users                                                │
├─────────────────────────────────────────────────────┤
│ - tokens_remaining INT (NEW!)                       │
│   → Actual remaining balance after usage            │
│   → Decremented by AI operations                    │
│   → Can be NULL for new users (auto-initialized)    │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ user_subscriptions                                   │
├─────────────────────────────────────────────────────┤
│ - tokens_limit INT                                   │
│   → Maximum tokens per plan                         │
│   → Set when plan is upgraded                       │
│   → Source of truth for plan limits                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ token_usage_history                                  │
├─────────────────────────────────────────────────────┤
│ - user_id, article_id, tokens_used, action          │
│   → Logs every token deduction                      │
│   → Used for analytics and audit trail             │
└─────────────────────────────────────────────────────┘
```

### Token Flow
1. **Admin upgrades user plan** → `user_subscriptions.tokens_limit = 2,000,000`
2. **Backend checks tokens** → Queries `users.tokens_remaining`
3. **If NULL/0** → Auto-initialize from `tokens_limit`
4. **User uses AI** → Deduct from `tokens_remaining`
5. **Log usage** → Insert into `token_usage_history`

## Backend Code Impact

### tokenManager.ts - getUserTokenBalance()
The backend code now works correctly:

```typescript
// Query includes BOTH columns
const result = await queryOne(`
  SELECT 
    u.tokens_remaining,
    COALESCE(
      (SELECT tokens_limit FROM user_subscriptions 
       WHERE user_id = u.id AND is_active = 1 LIMIT 1),
      0
    ) as tokens_limit
  FROM users u
  WHERE u.id = ?
`, [userId]);

// Auto-initialize if needed
if (result.tokens_remaining === null || result.tokens_remaining === 0) {
  if (result.tokens_limit > 0) {
    await execute(
      "UPDATE users SET tokens_remaining = ? WHERE id = ?",
      [result.tokens_limit, userId]
    );
    return result.tokens_limit; // Return 2,000,000!
  }
}

return result.tokens_remaining || 0;
```

**Key Features:**
- ✅ Handles NULL `tokens_remaining` (new users)
- ✅ Auto-initializes from subscription limit
- ✅ Falls back to 0 if no active subscription
- ✅ Single query for efficiency

## Testing Results

### Before Fix
```bash
# User with plan_type: professional, tokens_limit: 2,000,000
curl /api/ai/generate-seo-title
→ Response: 402 Insufficient Tokens
→ Modal: "Token hiện tại: 0"
→ Backend: ERROR 1054 Unknown column 'tokens_remaining'
```

### After Fix
```bash
# Same user after column added and initialized
curl /api/ai/generate-seo-title
→ Response: 200 OK
→ Token balance: 1,999,700 (after 300 tokens deducted)
→ Backend: Query successful
```

## Deployment Steps Executed

1. **Add column to database:**
   ```bash
   ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
     "mysql -u jybcaorr_lisaaccountcontentapi -p'***' jybcaorr_lisacontentdbapi \
      -e \"ALTER TABLE users ADD COLUMN tokens_remaining INT DEFAULT NULL AFTER role;\""
   ```

2. **Initialize all active users:**
   ```bash
   ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
     "mysql -u jybcaorr_lisaaccountcontentapi -p'***' jybcaorr_lisacontentdbapi \
      -e \"UPDATE users u JOIN user_subscriptions us ON u.id = us.user_id 
           SET u.tokens_remaining = us.tokens_limit 
           WHERE us.is_active = 1 AND (u.tokens_remaining IS NULL OR u.tokens_remaining = 0);\""
   ```

3. **Verify fix:**
   - Refreshed browser
   - Tested AI features
   - All working! ✅

## Impact Analysis

### Users Affected
- **All users** with active subscriptions were unable to use AI features
- Affected features:
  - ❌ AI Rewrite (500-2000 tokens)
  - ❌ Generate SEO Title (300 tokens)
  - ❌ Generate Meta Description (400 tokens)
  - ❌ Write More (1500 tokens)
  - ❌ Find Image (100 tokens)

### Fix Impact
- ✅ All users can now use AI features immediately
- ✅ Token balances correctly initialized
- ✅ Backend auto-initialization works for future users
- ✅ No frontend changes required
- ✅ No code deployment needed (database-only fix)

## Monitoring

### Check Token Balances
```sql
-- All users with subscriptions
SELECT 
    u.id,
    u.email,
    u.tokens_remaining,
    us.tokens_limit,
    us.plan_type,
    CASE 
        WHEN u.tokens_remaining IS NULL THEN '⚠️ Needs Init'
        WHEN u.tokens_remaining = 0 THEN '❌ Empty'
        WHEN u.tokens_remaining < 1000 THEN '⚠️ Low'
        ELSE '✅ OK'
    END as status
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
WHERE us.is_active = 1
ORDER BY u.tokens_remaining ASC;
```

### Check Token Usage
```sql
-- Recent token usage
SELECT 
    tuh.user_id,
    u.email,
    tuh.action,
    tuh.tokens_used,
    tuh.created_at
FROM token_usage_history tuh
JOIN users u ON tuh.user_id = u.id
ORDER BY tuh.created_at DESC
LIMIT 20;
```

### Check Auto-Initialization Events
```sql
-- Users with tokens = tokens_limit (recently initialized)
SELECT 
    u.id,
    u.email,
    u.tokens_remaining,
    us.tokens_limit
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.tokens_remaining = us.tokens_limit
  AND us.is_active = 1;
```

## Prevention

### For Future Migrations
1. **Always run migrations before deployment**
2. **Test with real database schema**
3. **Add migration checks to deployment script**
4. **Document all schema changes**

### Migration Checklist
```bash
# Before deploying token system:
□ Run ADD_TOKENS_REMAINING_COLUMN.sql
□ Verify column exists: DESCRIBE users;
□ Initialize existing users
□ Test with real user account
□ Monitor error logs
□ Check token_usage_history
```

## Related Files
- `ADD_TOKENS_REMAINING_COLUMN.sql` - Migration script
- `server/lib/tokenManager.ts` - Token management logic
- `TOKEN_BALANCE_CRITICAL_FIX.md` - Backend fix documentation
- `TOKEN_TRACKING_IMPLEMENTATION_GUIDE.md` - Original implementation

## Lessons Learned

1. **Database migrations must be run** - Code alone is not enough
2. **Test with production-like data** - Development DB may differ
3. **Check schema before deploying** - Verify columns exist
4. **Handle NULL gracefully** - Auto-initialization saves the day
5. **Monitor production errors** - Catch issues early

## Status: RESOLVED ✅

**Fix Applied:** January 4, 2026, 20:55  
**Downtime:** ~15 minutes  
**Users Affected:** All users  
**Current Status:** All AI features operational  

---

**Next Steps:**
- Monitor token usage for next 24 hours
- Check for any remaining NULL tokens_remaining
- Verify token deduction is working correctly
- Update deployment documentation with migration steps
