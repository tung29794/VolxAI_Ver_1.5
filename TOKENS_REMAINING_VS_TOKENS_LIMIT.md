# tokens_remaining vs tokens_limit - Complete Guide

## 🎯 Quick Answer

### tokens_remaining (users table)
**"Số token còn lại trong ví"** - Actual wallet balance
- 💰 Current available tokens user can spend
- 📉 **DECREASES** when user uses AI features
- 🔄 Resets to tokens_limit when plan upgrades
- ⚠️ When reaches 0, user can't use AI
- 📍 Location: `users.tokens_remaining`

### tokens_limit (user_subscriptions table)
**"Giới hạn token theo gói"** - Plan's token limit
- 📦 Maximum tokens allocated by subscription plan
- ➡️ **NEVER CHANGES** when user uses AI
- 🔄 Only changes when plan is upgraded/downgraded
- 💎 Defines what user "bought" with their plan
- 📍 Location: `user_subscriptions.tokens_limit`

---

## 📊 Visual Comparison

```
┌─────────────────────────────────────────────────────────┐
│                    USER REGISTERS                       │
└─────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────────────────┐
              │    Free Plan (10K)      │
              └─────────────────────────┘
                            ↓
        tokens_limit = 10,000  ←─────┐ Plan limit
        tokens_remaining = 10,000 ←──┘ Wallet balance
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│              USER USES "Generate SEO Title"             │
│                    (costs 300 tokens)                   │
└─────────────────────────────────────────────────────────┘
                            ↓
        tokens_limit = 10,000  ←───── Unchanged
        tokens_remaining = 9,700 ←─── Decreased by 300
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│           USER UPGRADES TO PROFESSIONAL (2M)            │
└─────────────────────────────────────────────────────────┘
                            ↓
        tokens_limit = 2,000,000  ←─── New plan limit
        tokens_remaining = 2,000,000 ←─ Reset to limit
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│              USER USES "AI Rewrite" (1500)              │
└─────────────────────────────────────────────────────────┘
                            ↓
        tokens_limit = 2,000,000  ←─── Still unchanged
        tokens_remaining = 1,998,500 ←─ Decreased by 1500
```

---

## 🔍 Detailed Breakdown

### tokens_remaining (Wallet Balance)

#### Purpose
Tracks the **actual number of tokens** the user currently has available to spend.

#### Analogy
Like money in your bank account:
- You start with $10,000 (free plan)
- You spend $300 → Balance: $9,700
- You deposit $2,000,000 (upgrade) → Balance: $2,009,700
- You spend $1,500 → Balance: $2,008,200

#### When It Changes
```typescript
// ✅ DECREASES when user uses AI
UPDATE users 
SET tokens_remaining = tokens_remaining - 300 
WHERE id = ?;

// ✅ INCREASES/RESETS when plan upgrades
UPDATE users 
SET tokens_remaining = 2000000 
WHERE id = ?;

// ✅ Auto-initialized if NULL
if (tokens_remaining === null) {
  tokens_remaining = tokens_limit;
}
```

#### Database Schema
```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(255),
  tokens_remaining INT DEFAULT NULL,  -- Can be NULL initially
  ...
);
```

#### API Usage
```typescript
// Check before AI operation
const balance = await getUserTokenBalance(userId);
if (balance < requiredTokens) {
  throw new Error("Insufficient tokens");
}

// Deduct after AI operation
await deductTokens(userId, tokensUsed);
```

---

### tokens_limit (Plan Limit)

#### Purpose
Defines the **maximum tokens** allocated by the user's subscription plan.

#### Analogy
Like your credit card limit:
- Your card has a $10,000 limit (free plan)
- You spend $300 → Limit still $10,000
- You upgrade to Platinum card → Limit now $2,000,000
- You spend $1,500 → Limit still $2,000,000

#### When It Changes
```typescript
// ✅ ONLY changes when plan is upgraded/downgraded
UPDATE user_subscriptions 
SET tokens_limit = 2000000, plan_type = 'professional' 
WHERE user_id = ?;

// ❌ NEVER changes during AI usage
// tokens_limit stays constant while user uses AI
```

#### Database Schema
```sql
CREATE TABLE user_subscriptions (
  id INT PRIMARY KEY,
  user_id INT UNIQUE,
  plan_type ENUM('free','starter','grow','professional'),
  tokens_limit INT DEFAULT 10000,  -- Plan's token allocation
  ...
);
```

#### Plan Definitions
```typescript
const PLAN_TOKENS = {
  free: 10000,           // 10K tokens
  starter: 400000,       // 400K tokens
  grow: 1000000,         // 1M tokens
  professional: 2000000, // 2M tokens
  business: 4000000,     // 4M tokens
  enterprise: 6500000    // 6.5M tokens
};
```

---

## 🎮 Usage Scenarios

### Scenario 1: Fresh Registration
```javascript
// User: john@example.com registers

// Backend creates:
INSERT INTO users (email, tokens_remaining) 
VALUES ('john@example.com', 10000);

INSERT INTO user_subscriptions (user_id, plan_type, tokens_limit) 
VALUES (123, 'free', 10000);

// Result:
tokens_remaining = 10,000  ✅ (wallet balance)
tokens_limit = 10,000      ✅ (plan limit)

// Interpretation:
"John has 10,000 tokens in his wallet,
 which is the limit of his Free plan"
```

### Scenario 2: Using AI Features
```javascript
// John uses "Generate SEO Title" (300 tokens)

// Backend executes:
UPDATE users 
SET tokens_remaining = tokens_remaining - 300 
WHERE id = 123;

// Result:
tokens_remaining = 9,700   ✅ (decreased)
tokens_limit = 10,000      ✅ (unchanged)

// Interpretation:
"John spent 300 tokens, has 9,700 left.
 His plan still allows up to 10,000 tokens total."
```

### Scenario 3: Multiple AI Operations
```javascript
// John uses multiple AI features:
// 1. AI Rewrite (1500 tokens)
// 2. Generate Meta Desc (400 tokens)
// 3. Find Image (100 tokens)
// Total used: 2000 tokens

// After each operation:
UPDATE users 
SET tokens_remaining = tokens_remaining - 1500;  // 9700 → 8200
UPDATE users 
SET tokens_remaining = tokens_remaining - 400;   // 8200 → 7800
UPDATE users 
SET tokens_remaining = tokens_remaining - 100;   // 7800 → 7700

// Final result:
tokens_remaining = 7,700   ✅ (decreased by 2000 total)
tokens_limit = 10,000      ✅ (still unchanged)

// Interpretation:
"John has spent 2,300 tokens total (10,000 - 7,700),
 still within his 10,000 token plan limit."
```

### Scenario 4: Plan Upgrade
```javascript
// John upgrades to Professional plan (2M tokens)

// Backend executes:
UPDATE user_subscriptions 
SET plan_type = 'professional', tokens_limit = 2000000 
WHERE user_id = 123;

UPDATE users 
SET tokens_remaining = 2000000 
WHERE id = 123;

// Result:
tokens_remaining = 2,000,000  ✅ (reset to new limit)
tokens_limit = 2,000,000      ✅ (upgraded)

// Interpretation:
"John upgraded to Professional plan.
 His wallet is refilled to 2M tokens,
 matching his new plan limit."
```

### Scenario 5: Token Addition (Admin Bonus)
```javascript
// Admin gives John a 500K token bonus

// Backend could do:
const current = await getUserTokenBalance(123);  // 2,000,000
const newBalance = current + 500000;             // 2,500,000

UPDATE users 
SET tokens_remaining = 2500000 
WHERE id = 123;

// Result:
tokens_remaining = 2,500,000  ✅ (bonus added)
tokens_limit = 2,000,000      ✅ (plan limit unchanged)

// Interpretation:
"John still has Professional plan (2M limit),
 but got 500K bonus, so wallet has 2.5M tokens."
```

---

## 🚦 When Each Field Is Used

### tokens_remaining Usage

**1. AI Feature Validation**
```typescript
// Before executing any AI operation
async function checkTokensMiddleware(req, res, next) {
  const balance = await getUserTokenBalance(req.userId);
  const required = estimateTokenCost(req.body);
  
  if (balance < required) {
    return res.status(402).json({
      error: "Insufficient tokens",
      remaining: balance,      // ← Uses tokens_remaining
      required: required,
      missing: required - balance
    });
  }
  next();
}
```

**2. Token Deduction**
```typescript
// After successful AI operation
async function deductTokens(userId: number, amount: number) {
  await execute(
    "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
    [amount, userId]           // ← Updates tokens_remaining
  );
}
```

**3. Real-time Balance Display**
```typescript
// API endpoint: /api/auth/me
const user = await queryOne(`
  SELECT 
    u.id, 
    u.email,
    u.tokens_remaining,        // ← For showing current balance
    us.tokens_limit            // ← For showing plan limit
  FROM users u
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  WHERE u.id = ?
`, [userId]);

// Frontend shows:
// "Bạn còn 1,998,500 / 2,000,000 tokens"
//          ↑               ↑
//   tokens_remaining  tokens_limit
```

### tokens_limit Usage

**1. Plan Comparison Page**
```typescript
// Show what each plan offers
const plans = [
  { 
    name: "Free", 
    tokens_limit: 10000,      // ← Display plan limit
    price: 0 
  },
  { 
    name: "Professional", 
    tokens_limit: 2000000,    // ← Display plan limit
    price: 50 
  }
];
```

**2. Upgrade Calculation**
```typescript
// When user upgrades
async function upgradePlan(userId: number, newPlan: string) {
  const planTokens = PLAN_TOKENS[newPlan];  // e.g., 2,000,000
  
  // Set both to same value
  await execute(
    "UPDATE user_subscriptions SET tokens_limit = ? WHERE user_id = ?",
    [planTokens, userId]       // ← Update plan limit
  );
  
  await execute(
    "UPDATE users SET tokens_remaining = ? WHERE id = ?",
    [planTokens, userId]       // ← Reset wallet to limit
  );
}
```

**3. Auto-Initialization**
```typescript
// If tokens_remaining is NULL, use tokens_limit
async function getUserTokenBalance(userId: number) {
  const result = await queryOne(`
    SELECT tokens_remaining, tokens_limit FROM ...
  `);
  
  if (result.tokens_remaining === null) {
    // Initialize wallet from plan limit
    await execute(
      "UPDATE users SET tokens_remaining = ? WHERE id = ?",
      [result.tokens_limit, userId]  // ← Copy limit to wallet
    );
    return result.tokens_limit;
  }
  
  return result.tokens_remaining;
}
```

---

## 📐 Mathematical Relationship

### Normal State (After Usage)
```
tokens_remaining ≤ tokens_limit
```

Example:
```
tokens_remaining = 1,500,000
tokens_limit = 2,000,000
✅ Valid: User has used 500K tokens
```

### Fresh Upgrade State
```
tokens_remaining = tokens_limit
```

Example:
```
tokens_remaining = 2,000,000
tokens_limit = 2,000,000
✅ Valid: User just upgraded, hasn't used any tokens yet
```

### Invalid States (Should Never Happen)
```
❌ tokens_remaining > tokens_limit
   (User has more tokens than plan allows?)

❌ tokens_remaining = NULL AND tokens_limit > 0
   (Plan exists but wallet not initialized?)
   → Fixed by auto-initialization

❌ tokens_remaining < 0
   (Negative balance?)
   → Should be prevented by validation
```

---

## 🛠️ Code Patterns

### ✅ CORRECT: Always Sync Both Fields

```typescript
// When upgrading plan
async function upgradePlan(userId: number, newPlanTokens: number) {
  // Update plan limit
  await execute(
    "UPDATE user_subscriptions SET tokens_limit = ? WHERE user_id = ?",
    [newPlanTokens, userId]
  );
  
  // Update wallet balance (CRITICAL!)
  await execute(
    "UPDATE users SET tokens_remaining = ? WHERE id = ?",
    [newPlanTokens, userId]
  );
  
  // ✅ Both fields synchronized
}
```

### ❌ WRONG: Only Update One Field

```typescript
// When upgrading plan
async function upgradePlan(userId: number, newPlanTokens: number) {
  // Update plan limit
  await execute(
    "UPDATE user_subscriptions SET tokens_limit = ? WHERE user_id = ?",
    [newPlanTokens, userId]
  );
  
  // ❌ MISSING: tokens_remaining not updated!
  // Result: User can't use new tokens
}
```

### ✅ CORRECT: Deduct from Wallet Only

```typescript
// When using AI
async function useAI(userId: number, tokensUsed: number) {
  // Deduct from wallet
  await execute(
    "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
    [tokensUsed, userId]
  );
  
  // ✅ Don't touch tokens_limit (it's the plan limit, stays constant)
}
```

### ❌ WRONG: Deduct from Both

```typescript
// When using AI
async function useAI(userId: number, tokensUsed: number) {
  await execute(
    "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
    [tokensUsed, userId]
  );
  
  // ❌ WRONG: Don't decrease plan limit!
  await execute(
    "UPDATE user_subscriptions SET tokens_limit = tokens_limit - ? WHERE user_id = ?",
    [tokensUsed, userId]
  );
  
  // Result: Plan limit decreases with usage (wrong!)
}
```

---

## 📱 Frontend Display Examples

### Example 1: Header Badge
```tsx
// Shows current wallet balance
<div className="token-badge">
  ⚡ {user.tokens_remaining?.toLocaleString()} Token
</div>

// Display:
"⚡ 1,998,500 Token"  ← From tokens_remaining
```

### Example 2: Upgrade Modal
```tsx
// Shows both current and plan limit
<div className="token-info">
  <p>Bạn có: {user.tokens_remaining?.toLocaleString()} tokens</p>
  <p>Gói của bạn: {user.subscription.tokens_limit?.toLocaleString()} tokens</p>
  <p>Đã dùng: {(user.subscription.tokens_limit - user.tokens_remaining)?.toLocaleString()} tokens</p>
</div>

// Display:
"Bạn có: 1,998,500 tokens"       ← tokens_remaining
"Gói của bạn: 2,000,000 tokens"  ← tokens_limit
"Đã dùng: 1,500 tokens"          ← limit - remaining
```

### Example 3: Insufficient Tokens Modal
```tsx
// When user tries to use AI without enough tokens
<TokenUpgradeModal
  remainingTokens={0}              // ← tokens_remaining
  requiredTokens={300}
  planLimit={10000}                // ← tokens_limit
/>

// Display:
"Token hiện tại: 0"
"Token cần thiết: 300"
"Thiếu: 300"
"Gói hiện tại: Free (10,000 tokens)"
```

---

## 🔄 Synchronization Rules

### Rule 1: Always Initialize Both on Registration
```sql
-- ✅ CORRECT
INSERT INTO users (tokens_remaining) VALUES (10000);
INSERT INTO user_subscriptions (tokens_limit) VALUES (10000);

-- ❌ WRONG
INSERT INTO user_subscriptions (tokens_limit) VALUES (10000);
-- Missing users.tokens_remaining initialization!
```

### Rule 2: Always Update Both on Plan Change
```sql
-- ✅ CORRECT
UPDATE user_subscriptions SET tokens_limit = 2000000 WHERE user_id = ?;
UPDATE users SET tokens_remaining = 2000000 WHERE id = ?;

-- ❌ WRONG
UPDATE user_subscriptions SET tokens_limit = 2000000 WHERE user_id = ?;
-- Missing users.tokens_remaining update!
```

### Rule 3: Only Update Wallet on Usage
```sql
-- ✅ CORRECT
UPDATE users SET tokens_remaining = tokens_remaining - 300 WHERE id = ?;
-- Don't touch tokens_limit

-- ❌ WRONG
UPDATE users SET tokens_remaining = tokens_remaining - 300 WHERE id = ?;
UPDATE user_subscriptions SET tokens_limit = tokens_limit - 300 WHERE user_id = ?;
-- Plan limit should not decrease!
```

### Rule 4: Auto-Initialize as Safety Net
```typescript
// ✅ Always check and initialize if needed
if (tokens_remaining === null || tokens_remaining === 0) {
  if (tokens_limit > 0) {
    tokens_remaining = tokens_limit;
  }
}
```

---

## 📋 Summary Table

| Aspect | tokens_remaining | tokens_limit |
|--------|------------------|--------------|
| **Location** | `users` table | `user_subscriptions` table |
| **Purpose** | Current wallet balance | Plan's maximum tokens |
| **Initial Value** | Same as tokens_limit | Based on plan (10K, 400K, 1M, 2M, etc.) |
| **Changes When** | User uses AI features | User upgrades/downgrades plan |
| **Direction** | Decreases with usage | Only changes on plan change |
| **Can Be NULL?** | Yes (auto-initialized) | No (always set by plan) |
| **Used For** | Validation, deduction | Display, plan comparison |
| **Displayed As** | "Token còn lại" | "Giới hạn gói" |
| **Example** | 1,998,500 | 2,000,000 |
| **Analogy** | Bank account balance | Credit card limit |

---

## ✅ Checklist for Developers

When working with tokens, always ask:

- [ ] Am I changing the **wallet balance** (tokens_remaining)?
- [ ] Am I changing the **plan limit** (tokens_limit)?
- [ ] Do I need to update **both** or just one?
- [ ] Is this a **usage** operation? (update wallet only)
- [ ] Is this a **plan change** operation? (update both)
- [ ] Did I handle **NULL tokens_remaining**? (auto-initialize)
- [ ] Will the user be able to use AI **immediately** after this change?

---

**Last Updated:** January 4, 2026  
**Status:** Production Documentation ✅
