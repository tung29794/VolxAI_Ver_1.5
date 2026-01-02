# Fix: Annual Pricing Display

## Problem

When switching to "Hàng năm" (Annual) tab, the prices were showing lower than the monthly tab:

**Before Fix** ❌
- Monthly: Starter 150,000đ/tháng
- Annual: Starter 125,000đ/tháng (WRONG - cheaper!)

This was confusing because annual should be more expensive overall (even if per-month equivalent is cheaper).

## Root Cause

The code was dividing `annual_price` by 12 to show the monthly equivalent:
```typescript
billingPeriod === "annual" && plan.annual_price
  ? (plan.annual_price / 12).toLocaleString("vi-VN")  // ❌ Wrong approach
  : plan.monthly_price.toLocaleString("vi-VN")
```

This showed price per month for both tabs, making annual appear cheaper.

## Solution

Now shows the **full annual price** on the annual tab:

```typescript
billingPeriod === "annual" && plan.annual_price
  ? plan.annual_price.toLocaleString("vi-VN")  // ✅ Show full year price
  : plan.monthly_price.toLocaleString("vi-VN")
```

## How It Works Now

### Monthly Tab (Hàng tháng)
```
Starter: 150,000₫ mỗi tháng
Monthly billing shows: 150,000₫
```

### Annual Tab (Hàng năm)
```
Starter: 1,500,000₫ mỗi năm
Annual billing shows: 1,500,000₫ (full year)
Label says: "mỗi năm" (per year)
```

## Price Formatting

Numbers are already formatted with `toLocaleString("vi-VN")`:
- Before: `1500000` (hard to read)
- After: `1.500.000` (easy to read) ✅

## Example Comparison

### Starter Plan
```
Database values:
- monthly_price: 150000
- annual_price: 1500000

Display:
- Monthly: "150000 ₫" → formatted as "150.000 ₫ mỗi tháng"
- Annual: "1500000 ₫" → formatted as "1.500.000 ₫ mỗi năm"

Savings: (150,000 × 12 - 1,500,000) / (150,000 × 12) × 100
       = 0 / 1,800,000 × 100 = 0% (no savings in this case)
       
Note: If annual_price is less than monthly_price × 12, it shows savings %
```

## Savings Calculation

Still calculates correctly:
```
If monthly_price × 12 = 1,800,000
And annual_price = 1,500,000
Savings = (1,800,000 - 1,500,000) / 1,800,000 × 100 = 16.67% → 17%
```

## Files Changed

- `client/pages/Upgrade.tsx`
  - Line 511: Removed `/12` division from annual_price display

## Testing

### Test 1: Price Display
1. Go to https://volxai.com/upgrade
2. Click "Hàng tháng" (Monthly)
   - Starter shows: `150.000₫ mỏi tháng`
3. Click "Hàng năm" (Annual)
   - Starter shows: `1.500.000₫ mỗi năm`
4. Verify annual is clearly more expensive overall ✅

### Test 2: Number Formatting
1. All prices should display with dots: `1.500.000` not `1500000`
2. Should be easy to read ✅

### Test 3: Savings Still Works
1. On annual tab, check "Tiết kiệm X% so với hàng tháng" line
2. Should show percentage savings ✅

## Database Requirements

Ensure your `subscription_plans` table has:
- `monthly_price` - price per month
- `annual_price` - full annual price (12× monthly with discount)

Example:
```sql
-- Starter plan with 16.67% annual savings
INSERT INTO subscription_plans VALUES (
  ...,
  monthly_price: 150000,
  annual_price: 1500000,  -- This is 12 × 150,000
  ...
);

-- If you want 17% discount:
-- annual_price = 150,000 × 12 × 0.83 = 1,494,000
```

## Deployment

✅ Built successfully
✅ Deployed to production
✅ Commit: 174eff4

Ready to test!
