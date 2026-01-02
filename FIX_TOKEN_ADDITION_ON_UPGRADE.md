# Fix: Token Addition on Plan Upgrade

**Commit:** `08430b6`

## 🔴 Problem

When user upgrades their plan, tokens were being **reset** to the new plan amount instead of **adding** the full amount.

**Example:**
- User has: Starter plan (400K tokens)
- User upgrades to: Grow plan (1M tokens)
- **WRONG:** Tokens reset to 1M (lost 400K)
- **CORRECT:** Should be 400K + 1M = **1.4M tokens**

## ✅ Solution

Instead of calculating the difference, simply **add the full new plan token amount** to current tokens:

```typescript
// OLD CODE (❌ Wrong - calculates difference)
const oldPlanInfo = planDetails[currentPlan];
const tokenAddition = planInfo.tokens - oldPlanInfo.tokens;
const newTokensLimit = currentTokens + tokenAddition;  // May be less than new plan!

// NEW CODE (✅ Correct - adds full amount)
const newTokensLimit = currentTokens + planInfo.tokens;  // Add full new plan amount
```

## 📊 Token Flow

```
Before upgrade:
┌─────────────────────────────┐
│ User Subscription (Starter) │
│ tokens_limit: 400,000       │
│ articles_limit: 60          │
└─────────────────────────────┘

Admin approves upgrade to Grow:
┌─────────────────────────────┐
│ User Subscription (Grow)     │
│ tokens_limit: 1,400,000 ✅   │ (400k + 1M)
│ articles_limit: 210 ✅       │ (60 + 150)
└─────────────────────────────┘
```

## 🔧 Files Modified

- `server/routes/admin.ts` - Approve payment endpoint (lines 340-352)
  - Removed plan type lookup and calculation
  - Simplified to: `currentTokens + planInfo.tokens`

## ✅ Testing Steps

1. Admin approves user upgrade from Starter → Grow
2. Check database:
   ```sql
   SELECT user_id, plan_type, tokens_limit, articles_limit 
   FROM user_subscriptions 
   WHERE user_id = 5;
   ```
   Expected:
   - `plan_type: "grow"`
   - `tokens_limit: 1400000` (400k + 1M)
   - `articles_limit: 210` (60 + 150)

3. User checks Account page → sees correct token balance

## 🚀 Deployment

Push to production and restart Node.js server:
```bash
git pull origin main
npm run build
pkill -f "node.*node-build.mjs"
node dist/server/node-build.mjs &
```
