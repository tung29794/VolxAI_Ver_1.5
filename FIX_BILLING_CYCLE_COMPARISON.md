# Fix: Billing Cycle Not Considered in Plan Comparison

**Commit:** `727a2db`

## 🔴 Problem

When user opens the plan upgrade modal, if they:
1. Currently have: **Starter Monthly**
2. Switch to: **Annual** tab
3. See: "Gói hiện tại" (Current Plan) for Starter Annual ❌

**Expected:** Should show **"Nâng cấp" button** since they don't have Starter Annual yet.

## 🔍 Root Cause

The modal was only comparing **plan name**, not **billing cycle**:

```typescript
// OLD (❌ Wrong)
const isCurrentPlan = currentPlan === plan.plan_key;
// Matches "starter" == "starter" regardless of billing cycle
```

## ✅ Solution

Now compare **both plan name AND billing cycle**:

```typescript
// NEW (✅ Correct)
const isCurrentPlan = currentPlan === plan.plan_key && 
  (currentBillingCycle === billingPeriod);
```

### Changes Made:

1. **PlanSelectionModal.tsx**:
   - Added `currentBillingCycle?: "monthly" | "annual"` to interface
   - Updated logic to check both plan and billing cycle

2. **Account.tsx**:
   - Pass `currentBillingCycle={subscription?.billing_cycle || "monthly"}` to modal
   - Modal now receives billing cycle info from subscription data

## 📊 Comparison Logic

```
User: Starter Monthly

Tab: Monthly
├─ Starter Monthly → isCurrentPlan = true ✅ → Show "Gói hiện tại"
└─ Grow Monthly → isCurrentPlan = false → Show "Nâng cấp"

Tab: Annual (NEW)
├─ Starter Annual → isCurrentPlan = false ✅ → Show "Nâng cấp"
└─ Grow Annual → isCurrentPlan = false → Show "Nâng cấp"
```

## 🔧 Files Modified

- `client/components/PlanSelectionModal.tsx`:
  - Line 42: Added `currentBillingCycle?: "monthly" | "annual";`
  - Line 148: Added parameter to function signature
  - Line 378-380: Updated `isCurrentPlan` logic

- `client/pages/Account.tsx`:
  - Line 882: Added `currentBillingCycle={subscription?.billing_cycle || "monthly"}`

## ✅ Testing Steps

1. User with **Starter Monthly** opens upgrade modal
2. Click on **"Hàng năm"** tab
3. **Result:** Starter card shows "Nâng cấp" button (not "Gói hiện tại")
4. Click monthly tab
5. **Result:** Starter card shows "Gói hiện tại" button again

## 🚀 Deployment

```bash
git pull origin main
npm run build
# Restart Node.js
pkill -f "node.*node-build.mjs"
node dist/server/node-build.mjs &
```
