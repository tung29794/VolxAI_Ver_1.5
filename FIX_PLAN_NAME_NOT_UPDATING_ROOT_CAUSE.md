# Fix: Plan Name Not Updating After Payment Approval

**Commit:** `3db73c6`

## 🔴 Root Cause Found

The issue was **NOT** with the auto-refresh mechanism. The real problem was:

**`subscription_history.to_plan` was NULL when admin approved the payment!**

### Flow Analysis:

1. **User creates payment** → `subscription_history` inserted with:
   - `from_plan` = current plan ✅
   - `to_plan` = NULL or empty ❌
   - `status` = "pending_approval"

2. **Admin approves** → Code updated:
   - `payment_approvals` status → "approved" ✅
   - `user_subscriptions` plan_type → "pro" ✅
   - `subscription_history` status → "completed" ✅
   - `subscription_history` to_plan → **STILL NULL** ❌

3. **Frontend calls `/api/auth/upgrade-history`** → Returns data with:
   ```json
   {
     "toPlan": null,  // ❌ Empty because database has NULL
     "status": "Hoàn tất"
   }
   ```

### Database Evidence:

**payment_approvals table:**
```
id | user_id | subscription_id | from_plan | to_plan | status
4  | 9       | 4               | free      | pro     | approved ✅
```

**subscription_history table:**
```
id | user_id | from_plan | to_plan | status    
4  | 9       | free      | NULL    | completed ❌
```

The `subscription_id=4` reference points to `subscription_history.id=4`, but that row has `to_plan=NULL`!

## ✅ Solution

**Update the approve endpoint to sync `to_plan` from `payment_approvals` to `subscription_history`:**

```typescript
// OLD CODE (WRONG)
await execute(
  "UPDATE subscription_history SET status = 'completed' WHERE id = ?",
  [payment.subscription_id],
);

// NEW CODE (CORRECT)
await execute(
  "UPDATE subscription_history SET status = 'completed', to_plan = ? WHERE id = ?",
  [payment.to_plan, payment.subscription_id],
);
```

## 📊 Data Flow After Fix

```
payment_approvals (to_plan="pro")
          ↓
          ↓ Admin clicks "Duyệt"
          ↓
1. Update payment_approvals.status = "approved" ✅
2. Update subscription_history.to_plan = "pro" ✅ (NEW)
3. Update subscription_history.status = "completed" ✅
4. Update user_subscriptions.plan_type = "pro" ✅
          ↓
          ↓ Frontend calls /api/auth/upgrade-history
          ↓
subscription_history.to_plan = "pro" ✅
          ↓
Account page displays: "Tên gói: Pro" ✅
```

## 🔧 Files Modified

- `server/routes/admin.ts` - Line 356-358: Added `to_plan = ?` to UPDATE statement

## ✅ Testing Steps

1. Admin approves a payment request
2. Check `subscription_history` table:
   ```sql
   SELECT id, from_plan, to_plan, status FROM subscription_history 
   WHERE id = <subscription_id>;
   ```
   Expected: `to_plan` should have the new plan name (e.g., "pro")

3. User navigates to Account page
4. Plan name displays correctly without needing F5

## 📝 Why Auto-Refresh Wasn't Enough

The auto-refresh mechanism I added earlier helps with latency, but if the database itself had NULL values, the auto-refresh would still return NULL! 

**The root cause was in the data layer, not the UI layer.**

---

**Previous attempts:** Only fixed auto-refresh. Now fixed actual data synchronization. ✅
