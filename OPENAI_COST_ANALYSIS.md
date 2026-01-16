# OpenAI Cost Analysis - VolxAI System

## 📊 Current Model Usage

### Models in Use
- **Primary:** GPT-3.5-turbo (90% of requests)
- **Optional:** GPT-4-turbo (only when user selects "GPT 5" option)

---

## 💰 OpenAI Pricing (Updated January 2026)

### GPT-3.5-turbo Pricing
```
Input Tokens:  $0.50 / 1M tokens  = $0.0000005 per token
Output Tokens: $1.50 / 1M tokens  = $0.0000015 per token
```

### GPT-4-turbo Pricing
```
Input Tokens:  $10.00 / 1M tokens = $0.00001 per token
Output Tokens: $30.00 / 1M tokens = $0.00003 per token
```

---

## 🧮 Cost Per 100 Tokens

### GPT-3.5-turbo (Main Model)

#### Input (Prompt) - 100 tokens
```
Cost = 100 × $0.0000005
     = $0.00005
     = 0.05 cents
     ≈ 1.25 VNĐ (@ 25,000 VNĐ/USD)
```

#### Output (Response) - 100 tokens
```
Cost = 100 × $0.0000015
     = $0.00015
     = 0.15 cents
     ≈ 3.75 VNĐ (@ 25,000 VNĐ/USD)
```

#### Total (100 input + 100 output)
```
Total = $0.00005 + $0.00015
      = $0.0002
      = 0.2 cents
      ≈ 5 VNĐ
```

---

### GPT-4-turbo (Premium Option)

#### Input (Prompt) - 100 tokens
```
Cost = 100 × $0.00001
     = $0.001
     = 0.1 cents
     ≈ 25 VNĐ (@ 25,000 VNĐ/USD)
```

#### Output (Response) - 100 tokens
```
Cost = 100 × $0.00003
     = $0.003
     = 0.3 cents
     ≈ 75 VNĐ (@ 25,000 VNĐ/USD)
```

#### Total (100 input + 100 output)
```
Total = $0.001 + $0.003
      = $0.004
      = 0.4 cents
      ≈ 100 VNĐ
```

---

## 📈 VolxAI Features Cost Analysis

### 1. AI Rewrite (500-2000 tokens)

**Estimated Distribution:**
- Input: 50% (user's content + instructions)
- Output: 50% (rewritten content)

**Average Case (1000 tokens):**
```
GPT-3.5-turbo:
- Input:  500 tokens × $0.0000005 = $0.00025
- Output: 500 tokens × $0.0000015 = $0.00075
- Total:                            $0.001
- VNĐ:                              ≈ 25 VNĐ

User charged: 1000 VolxAI tokens
Actual cost:  $0.001 (25 VNĐ)
```

**Cost per 100 VolxAI tokens:**
```
$0.001 / 1000 × 100 = $0.0001 = 2.5 VNĐ
```

---

### 2. Generate SEO Title (300 tokens)

**Typical Distribution:**
- Input:  100 tokens (article content + instructions)
- Output: 200 tokens (multiple title options)

```
GPT-3.5-turbo:
- Input:  100 tokens × $0.0000005 = $0.00005
- Output: 200 tokens × $0.0000015 = $0.0003
- Total:                            $0.00035
- VNĐ:                              ≈ 8.75 VNĐ

User charged: 300 VolxAI tokens
Actual cost:  $0.00035 (8.75 VNĐ)
```

**Cost per 100 VolxAI tokens:**
```
$0.00035 / 300 × 100 = $0.000117 = 2.9 VNĐ
```

---

### 3. Generate Meta Description (400 tokens)

**Typical Distribution:**
- Input:  150 tokens (article content + instructions)
- Output: 250 tokens (description)

```
GPT-3.5-turbo:
- Input:  150 tokens × $0.0000005 = $0.000075
- Output: 250 tokens × $0.0000015 = $0.000375
- Total:                            $0.00045
- VNĐ:                              ≈ 11.25 VNĐ

User charged: 400 VolxAI tokens
Actual cost:  $0.00045 (11.25 VNĐ)
```

**Cost per 100 VolxAI tokens:**
```
$0.00045 / 400 × 100 = $0.0001125 = 2.8 VNĐ
```

---

### 4. Write More (1500 tokens)

**Typical Distribution:**
- Input:  300 tokens (existing content + instructions)
- Output: 1200 tokens (continuation)

```
GPT-3.5-turbo:
- Input:  300 tokens × $0.0000005 = $0.00015
- Output: 1200 tokens × $0.0000015 = $0.0018
- Total:                             $0.00195
- VNĐ:                               ≈ 48.75 VNĐ

User charged: 1500 VolxAI tokens
Actual cost:  $0.00195 (48.75 VNĐ)
```

**Cost per 100 VolxAI tokens:**
```
$0.00195 / 1500 × 100 = $0.00013 = 3.25 VNĐ
```

---

### 5. Find Image (100 tokens)

**Typical Distribution:**
- Input:  50 tokens (keyword + instructions)
- Output: 50 tokens (Unsplash API call, minimal AI usage)

```
GPT-3.5-turbo:
- Input:  50 tokens × $0.0000005 = $0.000025
- Output: 50 tokens × $0.0000015 = $0.000075
- Total:                           $0.0001
- VNĐ:                             ≈ 2.5 VNĐ

User charged: 100 VolxAI tokens
Actual cost:  $0.0001 (2.5 VNĐ)
```

**Cost per 100 VolxAI tokens:**
```
$0.0001 / 100 × 100 = $0.0001 = 2.5 VNĐ
```

---

## 📊 Summary: Cost per 100 VolxAI Tokens

| Feature | VolxAI Tokens | OpenAI Cost (USD) | OpenAI Cost (VNĐ) | Cost per 100 Tokens |
|---------|---------------|-------------------|-------------------|---------------------|
| **AI Rewrite** | 500-2000 | $0.0005-$0.002 | 12.5-50 VNĐ | **2.5 VNĐ** |
| **SEO Title** | 300 | $0.00035 | 8.75 VNĐ | **2.9 VNĐ** |
| **Meta Description** | 400 | $0.00045 | 11.25 VNĐ | **2.8 VNĐ** |
| **Write More** | 1500 | $0.00195 | 48.75 VNĐ | **3.25 VNĐ** |
| **Find Image** | 100 | $0.0001 | 2.5 VNĐ | **2.5 VNĐ** |

### Average Cost per 100 VolxAI Tokens
```
Average = (2.5 + 2.9 + 2.8 + 3.25 + 2.5) / 5
        = 13.95 / 5
        = 2.79 VNĐ
        ≈ 3 VNĐ per 100 tokens
```

**In USD:**
```
$0.00012 per 100 VolxAI tokens
= $1.20 per 1 million VolxAI tokens
```

---

## 💡 Profit Analysis

### User Plans vs OpenAI Cost

#### Free Plan (10,000 tokens)
```
User pays:     $0 (free)
OpenAI cost:   10,000 × $0.0000012 = $0.012 = 0.3 USD
Loss per user: $0.012 (300 VNĐ)
```

#### Starter Plan (400,000 tokens) - $10/month
```
User pays:     $10
OpenAI cost:   400,000 × $0.0000012 = $0.48
Gross profit:  $10 - $0.48 = $9.52
Margin:        95.2%
```

#### Grow Plan (1,000,000 tokens) - $20/month
```
User pays:     $20
OpenAI cost:   1,000,000 × $0.0000012 = $1.20
Gross profit:  $20 - $1.20 = $18.80
Margin:        94%
```

#### Professional Plan (2,000,000 tokens) - $50/month
```
User pays:     $50
OpenAI cost:   2,000,000 × $0.0000012 = $2.40
Gross profit:  $50 - $2.40 = $47.60
Margin:        95.2%
```

#### Business Plan (4,000,000 tokens) - $100/month
```
User pays:     $100
OpenAI cost:   4,000,000 × $0.0000012 = $4.80
Gross profit:  $100 - $4.80 = $95.20
Margin:        95.2%
```

#### Enterprise Plan (6,500,000 tokens) - $200/month
```
User pays:     $200
OpenAI cost:   6,500,000 × $0.0000012 = $7.80
Gross profit:  $200 - $7.80 = $192.20
Margin:        96.1%
```

---

## 📉 Break-Even Analysis

### Cost Structure
```
OpenAI API Cost:   ~$0.0000012 per VolxAI token
Server Cost:       ~$20/month (shared hosting)
Domain:            ~$15/year = $1.25/month
Total Fixed:       ~$21.25/month
```

### Break-Even Point
```
Need to cover $21.25 in fixed costs:
$21.25 / $0.0000012 per token = 17,708,333 tokens/month

With average user using 50,000 tokens/month:
17,708,333 / 50,000 = ~355 free users
OR
2-3 paying customers (Starter/Grow plans)
```

---

## 🎯 Recommendations

### 1. Current Pricing is Very Profitable ✅
- Average margin: **95%+**
- OpenAI costs are minimal compared to revenue
- Free tier is sustainable with paid users

### 2. Token Estimation is Conservative ✅
Your system charges:
- AI Rewrite: 500-2000 tokens
- Actual cost: ~1000 tokens average

This is fair and covers variability.

### 3. Consider GPT-4 Premium Tier
```
GPT-4 is 20x more expensive:
- Current: $0.0000012 per token
- GPT-4:   $0.000024 per token

Could offer:
- "Premium AI" upgrade
- Charge 20x tokens (e.g., 6000 instead of 300)
- Or flat $5/month add-on
```

### 4. Monitor Usage Patterns
Track:
- Average tokens per user per month
- Most used features (probably AI Rewrite)
- Peak usage times
- Free tier abuse (users creating multiple accounts)

### 5. Optimize for Cost
```typescript
// Current code is already optimized:
- Uses GPT-3.5-turbo (cheapest)
- Limits max_tokens to prevent overuse
- Estimates tokens accurately
- Deducts exact usage from OpenAI response
```

---

## 📝 Technical Details

### Token Counting (from code)

```typescript
// Server tracks actual OpenAI usage:
function calculateActualTokens(data: any): number {
  return data.usage?.total_tokens || 0;
}

// Falls back to estimate if not available:
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

### Example OpenAI Response
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1704398400,
  "model": "gpt-3.5-turbo-0125",
  "usage": {
    "prompt_tokens": 150,      // Input
    "completion_tokens": 250,  // Output
    "total_tokens": 400        // Total charged by OpenAI
  },
  "choices": [...]
}
```

VolxAI charges users based on `total_tokens` from OpenAI.

---

## 🔍 Real-World Example

### User Journey: Professional Plan ($50/month)

**Month 1 Usage:**
```
Day 1-5:   Heavy usage (onboarding, testing all features)
  - 50 AI Rewrites      = 50,000 tokens
  - 100 SEO Titles      = 30,000 tokens
  - 100 Meta Descs      = 40,000 tokens
  - 20 Write More       = 30,000 tokens
  Total:                = 150,000 tokens

Day 6-30:  Normal usage (2-3 articles/day)
  - 60 articles × ~2000 tokens = 120,000 tokens

Monthly Total: 270,000 tokens (13.5% of plan limit)
```

**Cost Analysis:**
```
User paid:     $50
OpenAI cost:   270,000 × $0.0000012 = $0.324
Server share:  $50 / 100 users = $0.50
Total cost:    $0.824
Profit:        $50 - $0.824 = $49.18
ROI:           5,965%
```

**This user could use:**
- 2,000,000 tokens (plan limit)
- OpenAI cost: $2.40
- Still profitable: $50 - $2.40 = $47.60

---

## ✅ Conclusion

### Per 100 VolxAI Tokens Cost:

**OpenAI API Cost (GPT-3.5-turbo):**
- **$0.00012** (USD)
- **3 VNĐ** (at 25,000 VNĐ/USD)
- **0.12 cents**

**This means:**
- **1,000 tokens** costs **$0.0012** (30 VNĐ / 1.2 cents)
- **10,000 tokens** costs **$0.012** (300 VNĐ / 12 cents)
- **100,000 tokens** costs **$0.12** (3,000 VNĐ / 12 cents)
- **1,000,000 tokens** costs **$1.20** (30,000 VNĐ / 120 cents)

**Your pricing is extremely profitable!** 🎉

### Quick Reference Card
```
┌────────────────────────────────────────┐
│   COST PER 100 VOLXAI TOKENS          │
├────────────────────────────────────────┤
│   OpenAI Cost:    $0.00012            │
│   Vietnamese:     3 VNĐ                │
│   Cents:          0.12 cents           │
│                                        │
│   Model:          GPT-3.5-turbo       │
│   Updated:        January 2026         │
└────────────────────────────────────────┘
```

---

**Generated:** January 4, 2026  
**Model Pricing:** OpenAI GPT-3.5-turbo (Jan 2026)  
**Exchange Rate:** 25,000 VNĐ/USD  
**Status:** Production Analysis ✅
