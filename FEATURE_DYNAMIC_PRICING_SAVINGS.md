# Feature: Dynamic Pricing and Savings Calculation

## Overview

The Upgrade page (Bảng giá) now:
1. **Loads all plan prices from the database** - No hardcoded prices
2. **Auto-calculates savings percentage** - Shows dynamic discount % based on actual data
3. **Displays savings on both tabs** - Monthly and Annual billing periods

## What Changed

### 1. Plans Load from Database

**File**: `client/pages/Upgrade.tsx`

Before: Prices were hardcoded in the fallback plans:
```typescript
const fallbackPlans = [
  { plan_key: "free", monthly_price: 0, ... },
  { plan_key: "starter", monthly_price: 150000, ... },
  // etc
];
```

After: Plans are fetched from API:
```typescript
const response = await fetch(buildApiUrl("/api/auth/plans"));
const data = await response.json();
setPlans(data.data);  // Uses database prices
```

### 2. Savings Calculation

Added new function to calculate average savings percentage:

```typescript
const calculateAverageSavings = (plans: Plan[]): number => {
  const plansWithAnnualPrice = plans.filter(
    (plan) => plan.monthly_price > 0 && plan.annual_price && plan.annual_price > 0
  );

  if (plansWithAnnualPrice.length === 0) return 10;

  const totalSavings = plansWithAnnualPrice.reduce((sum, plan) => {
    const monthlyYearlyPrice = plan.monthly_price * 12;
    const savingsPercent = ((monthlyYearlyPrice - plan.annual_price) / monthlyYearlyPrice) * 100;
    return sum + savingsPercent;
  }, 0);

  return Math.round(totalSavings / plansWithAnnualPrice.length);
};
```

**Logic**:
1. Filter plans that have both monthly and annual prices
2. For each plan, calculate: `(monthly × 12 - annual) / (monthly × 12) × 100`
3. Average the percentages across all plans
4. Return rounded result

### 3. Dynamic Badge

The "Hàng năm" (Annual) tab now shows calculated savings:

```typescript
<span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
  Tiết kiệm {averageSavingsPercent}%
</span>
```

**Before**: `Tiết kiệm 10%` (hardcoded)
**After**: `Tiết kiệm X%` (dynamic, e.g., `Tiết kiệm 12%`)

### 4. Individual Plan Savings

Each pricing card now shows the correct savings percentage for that specific plan:

```typescript
{plan.monthly_price !== 0 &&
  billingPeriod === "annual" &&
  plan.annual_price && (
    <p className="text-xs font-medium text-accent">
      Tiết kiệm{" "}
      {Math.round(
        ((plan.monthly_price * 12 - plan.annual_price) /
          (plan.monthly_price * 12)) *
          100
      )}
      % so với hàng tháng
    </p>
  )}
```

**Before**: `Tiết kiệm 123K so với hàng tháng` (wrong calculation, showed in thousands)
**After**: `Tiết kiệm 12% so với hàng tháng` (correct percentage)

## Data Flow

```
1. Page loads
   ↓
2. API call: GET /api/auth/plans
   ↓
3. Database returns plans with monthly_price and annual_price
   ↓
4. calculateAverageSavings() computes average discount
   ↓
5. State updated: setAverageSavingsPercent()
   ↓
6. Components re-render with dynamic values
   ↓
7. User sees: Updated badge and card savings %
```

## Testing

### Test 1: Load Plans from Database
1. Go to https://volxai.com/upgrade
2. Verify prices match your database (not fallback prices)
3. Open Network tab (F12) → Filter by "plans"
4. Verify API call: `GET /api/auth/plans`
5. Verify response contains monthly_price and annual_price

### Test 2: Savings Calculation
1. Click "Hàng năm" (Annual tab)
2. Verify badge shows calculated percentage (e.g., "Tiết kiệm 12%")
3. Verify each plan card shows individual savings %
4. Example: 
   - Starter: `monthly_price: 150000`, `annual_price: 1500000`
   - Calculation: `(150000 × 12 - 1500000) / (150000 × 12) × 100 = 16.7%`

### Test 3: Different Billing Periods
1. Click "Hàng tháng" (Monthly)
   - Prices show as monthly (no savings line)
2. Click "Hàng năm" (Annual)
   - Prices show as annual
   - Savings line appears: "Tiết kiệm X% so với hàng tháng"

### Test 4: Fallback Behavior
If API fails to fetch plans:
1. Falls back to hardcoded fallbackPlans
2. Calculates savings based on fallback data
3. Still shows dynamic savings (if fallback plans have annual prices)

## Example Scenarios

### Scenario 1: No Annual Pricing
If some plans don't have annual_price set:
- Those plans are excluded from savings calculation
- Only plans with both monthly and annual prices are included
- If NO plans have annual pricing → defaults to 10%

### Scenario 2: All Plans with 10% Discount
- Starter: 150K/month → 1.5M/year (saves 10%)
- Grow: 300K/month → 3M/year (saves 10%)
- Pro: 475K/month → 4.75M/year (saves 10%)
- Average: 10%
- Badge shows: "Tiết kiệm 10%"

### Scenario 3: Mixed Discounts
- Starter: 150K/month → 1.5M/year (saves 10%)
- Grow: 300K/month → 2.7M/year (saves 25%)
- Average: (10 + 25) / 2 = 17.5% → rounds to 18%
- Badge shows: "Tiết kiệm 18%"

## Database Requirements

Ensure your subscription_plans table has these columns:
```sql
- id (INT, Primary Key)
- plan_key (VARCHAR, e.g., "starter")
- plan_name (VARCHAR, e.g., "Starter")
- monthly_price (INT, e.g., 150000)
- annual_price (INT, nullable, e.g., 1500000)
- tokens_limit (INT, e.g., 400000)
- articles_limit (INT, e.g., 60)
- is_active (BOOLEAN, default true)
- display_order (INT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Endpoint

**GET** `/api/auth/plans`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "plan_key": "starter",
      "plan_name": "Starter",
      "description": "Bắt đầu với VolxAI",
      "monthly_price": 150000,
      "annual_price": 1500000,
      "tokens_limit": 400000,
      "articles_limit": 60,
      "icon_name": "Sparkles",
      "display_order": 2,
      "is_active": true,
      "features": []
    },
    // ... more plans
  ]
}
```

## Files Modified

- `client/pages/Upgrade.tsx`
  - Added `averageSavingsPercent` state
  - Added `calculateAverageSavings()` function
  - Updated plans fetch to calculate and set savings
  - Updated badge to show dynamic percentage
  - Fixed individual plan savings calculation

## Performance Notes

- Savings calculation runs only once when plans are fetched
- No additional API calls for savings calculation
- Calculation is fast (O(n) where n = number of plans)
- Results cached in state to avoid recalculation

## Future Improvements

- [ ] Add savings calculation to admin plan management
- [ ] Show savings history/analytics
- [ ] Allow admin to set custom annual discounts
- [ ] A/B test different discount percentages
