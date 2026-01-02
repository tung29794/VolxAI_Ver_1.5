# Quick Test Guide: Dynamic Pricing & Savings

## 🎯 What to Test

### 1. Pricing Page Loads from Database ✅

**Go to**: https://volxai.com/upgrade

**Check**:
- [ ] Prices display (Free, Starter: 150,000đ, Grow: 300,000đ, etc.)
- [ ] Prices match your database (not fallback/hardcoded values)
- [ ] All plans load correctly

**How to verify prices are from DB**:
1. Open Developer Tools → Network tab (F12)
2. Reload page
3. Look for request: `GET https://api.volxai.com/api/auth/plans`
4. Click it, go to Response tab
5. Verify monthly_price and annual_price values match what's displayed on page

---

### 2. Annual Savings Badge Shows Correct % ✅

**Location**: "Hàng năm" (Annual) tab button

**Before fix**: Always showed "Tiết kiệm 10%" (hardcoded)
**After fix**: Shows calculated %, e.g., "Tiết kiệm 12%"

**Test**:
1. Look at the "Hàng năm" button
2. Verify it shows a percentage badge
3. Example: `Hàng năm [Tiết kiệm 12%]`
4. If all plans have 10% discount → should show 10%
5. If mixed discounts → should show average

**How percentage is calculated**:
```
Average of all plans: ((monthly × 12 - annual) / (monthly × 12) × 100)
Round to nearest integer
```

---

### 3. Individual Plan Savings Show % (Not "K") ✅

**Location**: On each pricing card, annual tab

**Example - Before fix**:
```
Tiết kiệm 123K so với hàng tháng  ❌ (wrong - shows in thousands)
```

**Example - After fix**:
```
Tiết kiệm 16% so với hàng tháng  ✅ (correct - shows percentage)
```

**Test**:
1. Click "Hàng năm" (Annual) tab
2. Look at each plan card
3. Should see line: "Tiết kiệm X% so với hàng tháng"
4. X should be a percentage (10-30% typically)
5. Different plans can have different %, that's OK

---

### 4. Monthly vs Annual Switching ✅

**Test**:
1. Click "Hàng tháng" (Monthly)
   - Prices show monthly (e.g., 150,000đ/tháng)
   - NO savings line shown
2. Click "Hàng năm" (Annual)
   - Prices show annual (e.g., 1,500,000đ/năm)
   - Savings line appears: "Tiết kiệm X%"
   - Badge shows "Tiết kiệm X%"

---

## 🔍 Detailed Examples

### Example 1: Starter Plan
```
Monthly: 150,000đ × 12 = 1,800,000đ/year
Annual: 1,500,000đ
Savings: (1,800,000 - 1,500,000) / 1,800,000 × 100 = 16.67% → 17%

Card should show: "Tiết kiệm 17% so với hàng tháng"
```

### Example 2: Average Savings
```
Plan 1: 10% discount
Plan 2: 20% discount
Plan 3: 15% discount

Average: (10 + 20 + 15) / 3 = 15%
Badge should show: "Tiết kiệm 15%"
```

---

## ✅ Success Criteria

All of these should be ✓ true:

- [ ] Plans load from API (Network tab shows `/api/auth/plans` request)
- [ ] Prices match database
- [ ] "Hàng năm" badge shows dynamic % (not hardcoded 10%)
- [ ] Individual plan savings show as % (not "K")
- [ ] Different billing periods work correctly
- [ ] No console errors
- [ ] Savings % makes sense (10-30% typical range)

---

## 🐛 Common Issues & Fixes

### Issue: Still showing "Tiết kiệm 10%"
**Solution**: 
- Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+F5 on Windows)
- Make sure database has annual_price values
- Check API response has `annual_price` field

### Issue: Savings showing wrong % (e.g., way too high)
**Possible cause**: Database annual_price is too low
**Check**: 
- Query: `SELECT * FROM subscription_plans;`
- Verify annual_price is approximately monthly_price × 12

### Issue: Savings line not showing on annual plans
**Possible causes**:
1. Plan doesn't have annual_price set (NULL or 0)
2. Billing period not set to "annual"

**Check**:
1. Click "Hàng năm" tab
2. Look for "so với hàng tháng" line
3. If not there, check database has annual_price

### Issue: Different savings % on each plan
**This is correct!** Different plans can have different discounts.
- Starter: 150K × 12 = 1.8M, annual 1.5M → 17%
- Grow: 300K × 12 = 3.6M, annual 3.0M → 17%
- Both show same %, which is fine

---

## 📊 Sample Data for Testing

If you want to test with specific discounts:

```sql
-- 10% annual discount across all plans
UPDATE subscription_plans SET annual_price = monthly_price * 12 * 0.9;

-- Different discounts per plan
UPDATE subscription_plans SET annual_price = monthly_price * 12 * 0.85 WHERE plan_key = 'starter';   -- 15%
UPDATE subscription_plans SET annual_price = monthly_price * 12 * 0.80 WHERE plan_key = 'grow';      -- 20%
UPDATE subscription_plans SET annual_price = monthly_price * 12 * 0.75 WHERE plan_key = 'pro';       -- 25%
```

Then reload the page and verify savings % are calculated correctly.

---

## 🚀 What's Deployed

✅ Build: Success
✅ Deploy: 8 files transferred
✅ Code: Committed (9db55c8)

Ready to test on production!
