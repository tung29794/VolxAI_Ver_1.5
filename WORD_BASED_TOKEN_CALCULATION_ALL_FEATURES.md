# ✅ WORD-BASED TOKEN CALCULATION - ALL FEATURES UPDATED

## 🎯 Mục tiêu hoàn thành

**Chuyển TẤT CẢ tính năng từ FIXED COST sang WORD-BASED CALCULATION với COST MULTIPLIER**

---

## 📊 Tính năng đã Update

### ✅ Trước đây (FIXED COST):

| Tính năng | Cost cũ | Loại |
|-----------|---------|------|
| AI Rewrite SEO Title | 300 tokens | ❌ FIXED |
| AI Rewrite Tiêu đề | 300 tokens | ❌ FIXED |
| AI Rewrite Giới thiệu ngắn | 400 tokens | ❌ FIXED |
| AI Rewrite Text | 500-2000 tokens | ❌ FIXED (theo độ dài) |
| Write More | 1500 tokens | ❌ FIXED |
| Viết bài | N/A | ✅ Word-based (đã có) |
| Tiếp tục viết bài | N/A | ✅ Word-based (đã có) |

### ✅ Sau khi Update (WORD-BASED):

| Tính năng | Formula | Loại |
|-----------|---------|------|
| **AI Rewrite SEO Title** | `(words/1000) * tokenCost * 1.0` | ✅ **FIXED (word-based)** |
| **AI Rewrite Tiêu đề** | `(words/1000) * tokenCost * 1.0` | ✅ **FIXED (word-based)** |
| **AI Rewrite Giới thiệu ngắn** | `(words/1000) * tokenCost * 1.0` | ✅ **FIXED (word-based)** |
| **AI Rewrite Text** | `(words/1000) * tokenCost * 1.0` | ✅ **WORD-BASED** |
| **Write More** | `(words/1000) * tokenCost * 1.0` | ✅ **WORD-BASED** |
| **Viết bài** | `(words/1000) * tokenCost * multiplier` | ✅ **WORD-BASED + MULTIPLIER** |
| **Tiếp tục viết bài** | `(words/1000) * tokenCost * multiplier` | ✅ **WORD-BASED + MULTIPLIER** |

**Note**: 
- Fixed features (SEO Title, Article Title, Meta Description) vẫn dùng word-based calculation nhưng với `isFixedCost=true` để không apply cost multiplier
- Variable features (Rewrite, Write More, Article Generation) dùng `isFixedCost=false` để có thể apply cost multiplier khi chọn model

---

## 🔧 Code Changes

### 1. **AI Rewrite SEO Title** (`/generate-seo-title`)

#### Before:
```typescript
const requiredTokens = TOKEN_COSTS.GENERATE_SEO_TITLE; // 300 fixed
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

#### After:
```typescript
// Check phase (estimate)
const estimatedTokens = await calculateTokens(
  "Sample SEO Title Text Here", 
  'generate_seo_title', 
  true  // isFixedCost = true (no multiplier)
);

// Deduct phase (actual)
const actualTokens = await calculateTokens(
  generatedTitle, 
  'generate_seo_title', 
  true  // isFixedCost = true
);
```

---

### 2. **AI Rewrite Tiêu đề** (`/generate-article-title`)

#### Before:
```typescript
const requiredTokens = TOKEN_COSTS.GENERATE_SEO_TITLE; // 300 fixed
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

#### After:
```typescript
// Check phase
const estimatedTokens = await calculateTokens(
  "Sample Article Title Text Here", 
  'generate_article_title', 
  true
);

// Deduct phase
const actualTokens = await calculateTokens(
  generatedTitle, 
  'generate_article_title', 
  true
);
```

---

### 3. **AI Rewrite Giới thiệu ngắn** (`/generate-meta-description`)

#### Before:
```typescript
const requiredTokens = TOKEN_COSTS.GENERATE_META_DESC; // 400 fixed
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

#### After:
```typescript
// Check phase
const estimatedTokens = await calculateTokens(
  "Sample meta description text for estimation purposes here", 
  'generate_meta_description', 
  true
);

// Deduct phase
const actualTokens = await calculateTokens(
  generatedDescription, 
  'generate_meta_description', 
  true
);
```

---

### 4. **AI Rewrite Text** (`/rewrite`)

#### Before:
```typescript
// Estimate function used fixed TOKEN_COSTS
export function estimateRewriteTokens(text: string, style: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 100) return TOKEN_COSTS.AI_REWRITE_SHORT; // 500
  if (wordCount < 300) return TOKEN_COSTS.AI_REWRITE_MEDIUM; // 1000
  return TOKEN_COSTS.AI_REWRITE_LONG; // 2000
}
```

#### After:
```typescript
// Now uses word-based calculation
export async function estimateRewriteTokens(
  text: string, 
  style: string
): Promise<number> {
  const { calculateTokens } = await import('./tokenCalculator');
  
  // Expanding styles produce more output
  const expandingStyles = ["longer", "creative", "professional"];
  const outputText = expandingStyles.includes(style) 
    ? text + " ".repeat(Math.floor(text.length * 0.5)) // +50% expansion
    : text;

  // Word-based calculation (no model, default 1.0x multiplier)
  return calculateTokens(outputText, 'ai_rewrite_text', false);
}
```

**Usage in endpoint**:
```typescript
// Check phase
const estimatedTokens = await estimateRewriteTokens(text, style);

// Deduct phase
const actualTokens = await calculateTokens(
  rewrittenText, 
  'ai_rewrite_text', 
  false  // isFixedCost = false (can use multiplier if model selected)
);
```

---

### 5. **Write More** (`/write-more`)

#### Before:
```typescript
const requiredTokens = TOKEN_COSTS.WRITE_MORE; // 1500 fixed
```

#### After:
```typescript
// Check phase (estimate ~500 words output)
const estimatedTokens = await calculateTokens(
  "Lorem ipsum dolor sit amet ".repeat(70), // ~500 words
  'write_more', 
  false
);

// Deduct phase
const actualTokens = await calculateTokens(
  writtenContent, 
  'write_more', 
  false
);
```

---

### 6. **Viết bài & Tiếp tục viết bài** (`/generate-article-write`)

✅ **Already implemented** (đã có trong update trước):

```typescript
// With cost multiplier
const articleTokens = await calculateTokens(
  finalContent, 
  'generate_article', 
  false, 
  actualModel  // ← Model ID for multiplier
);

const titleTokens = await calculateTokens(
  title, 
  'generate_article', 
  false, 
  actualModel
);
```

---

## 📐 Formula Reference

### Complete Formula

```javascript
// For FIXED-COST features (no multiplier):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words)

// For VARIABLE features (with multiplier if model selected):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)
```

### Example Calculations

#### AI Rewrite SEO Title (10 words)

**Database**:
- `feature_key = 'generate_seo_title'`
- `token_cost_per_1000_words = 500`

**Calculation**:
```javascript
actualTokens = CEIL((10 / 1000) * 500)
            = CEIL(0.01 * 500)
            = CEIL(5)
            = 5 tokens ✅
```

**So sánh với cũ**: 300 tokens fixed → **5 tokens** (tiết kiệm **98.3%**!)

---

#### AI Rewrite Text (300 words)

**Database**:
- `feature_key = 'ai_rewrite_text'`
- `token_cost_per_1000_words = 10`

**Calculation**:
```javascript
actualTokens = CEIL((300 / 1000) * 10)
            = CEIL(0.3 * 10)
            = CEIL(3)
            = 3 tokens ✅
```

**So sánh với cũ**: 1000 tokens fixed → **3 tokens** (tiết kiệm **99.7%**!)

---

#### Write More (500 words)

**Database**:
- `feature_key = 'write_more'`
- `token_cost_per_1000_words = 10`

**Calculation**:
```javascript
actualTokens = CEIL((500 / 1000) * 10)
            = CEIL(0.5 * 10)
            = CEIL(5)
            = 5 tokens ✅
```

**So sánh với cũ**: 1500 tokens fixed → **5 tokens** (tiết kiệm **99.7%**!)

---

#### Viết bài 2000 từ với Gemini 2.5 Flash

**Database**:
- `feature_key = 'generate_article'`
- `token_cost_per_1000_words = 15`
- `ai_models.cost_multiplier = 3.00` (Gemini 2.5 Flash)

**Calculation**:
```javascript
actualTokens = CEIL((2000 / 1000) * 15 * 3.0)
            = CEIL(2.0 * 15 * 3.0)
            = CEIL(90)
            = 90 tokens ✅
```

---

## 🗄️ Database Configuration

### Table: `ai_feature_token_costs`

**Feature keys and their token costs**:

```sql
SELECT feature_key, token_cost_per_1000_words, is_fixed_cost 
FROM ai_feature_token_costs 
WHERE is_active = TRUE;
```

**Expected results**:
```
feature_key                  | token_cost | is_fixed_cost
----------------------------|------------|---------------
generate_seo_title          | 500        | TRUE
generate_article_title      | 500        | TRUE
generate_meta_description   | 800        | TRUE
ai_rewrite_text             | 10         | FALSE
write_more                  | 10         | FALSE
generate_article            | 15         | FALSE
generate_toplist            | 15         | FALSE
```

**Note**: 
- `is_fixed_cost = TRUE` → No cost multiplier applied
- `is_fixed_cost = FALSE` → Can apply cost multiplier if model selected

---

## 💡 Benefits

### 1. **Fairness** ✅
User chỉ trả đúng cho những gì họ nhận được:
- SEO title 10 từ = 5 tokens (thay vì 300)
- Rewrite 300 từ = 3 tokens (thay vì 1000)

### 2. **Cost Efficiency** ✅
Tiết kiệm token lên đến **99%** cho các features output ngắn.

### 3. **Consistency** ✅
Tất cả features giờ đều dùng cùng 1 hệ thống:
```
(wordCount / 1000) * tokenCost * multiplier
```

### 4. **Database-Driven** ✅
Admin có thể điều chỉnh costs trong database mà không cần code:
```sql
-- Adjust cost for AI Rewrite
UPDATE ai_feature_token_costs 
SET token_cost_per_1000_words = 12 
WHERE feature_key = 'ai_rewrite_text';
```

---

## 🧪 Testing Checklist

### Test 1: AI Rewrite SEO Title

- [ ] Generate SEO title (expect ~10 words)
- [ ] Expected tokens: `(10/1000) * 500 = 5 tokens`
- [ ] Check logs: `✅ Generate SEO Title success - Deducting 5 tokens (fixed cost)`
- [ ] Verify database: `tokens_used = 5`

### Test 2: AI Rewrite Text (300 words)

- [ ] Rewrite 300-word paragraph
- [ ] Expected tokens: `(300/1000) * 10 = 3 tokens`
- [ ] Check logs: `✅ AI Rewrite success - 300 words, 3 tokens`
- [ ] Verify database: Token deduction = 3

### Test 3: Write More (500 words)

- [ ] Generate 500 words continuation
- [ ] Expected tokens: `(500/1000) * 10 = 5 tokens`
- [ ] Check logs: `✅ Write More success - 500 words, 5 tokens`
- [ ] Verify database: Token deduction = 5

### Test 4: Viết bài với Gemini 2.5 Flash

- [ ] Create 2000-word article with Gemini 2.5 Flash
- [ ] Expected tokens: `(2000/1000) * 15 * 3.0 = 90 tokens`
- [ ] Check logs: `Cost Multiplier: 3.0x`
- [ ] Verify database: `tokens_used = 90`

---

## 📊 Impact Analysis

### Starter Plan (400,000 tokens)

**Before** (fixed costs):
- 1 SEO title = 300 tokens → **1,333 titles max**
- 1 Rewrite (300 words) = 1000 tokens → **400 rewrites max**
- 1 Write More = 1500 tokens → **266 continuations max**

**After** (word-based):
- 1 SEO title (10 words) = 5 tokens → **80,000 titles max** 🚀
- 1 Rewrite (300 words) = 3 tokens → **133,333 rewrites max** 🚀
- 1 Write More (500 words) = 5 tokens → **80,000 continuations max** 🚀

**Improvement**: **60-300x MORE usage** with same token budget! 🎉

---

## 🚀 Deployment

### Build Status

```bash
✅ Client: 980.19 kB (gzipped: 265.99 kB)
✅ Server: 344.08 kB
✅ Exit Code: 0
✅ Build time: 2.20s
```

### Deploy Command

```bash
# 1. Deploy backend
pm2 restart volxai-server

# 2. Monitor logs
pm2 logs volxai-server | grep "tokens"

# Look for:
# - "💰 Generate SEO Title - Estimated tokens: X"
# - "✅ Generate SEO Title success - Deducting X tokens (fixed cost)"
# - "✅ AI Rewrite success - X words, X tokens"
# - "✅ Write More success - X words, X tokens"
```

---

## 📝 Files Changed

### Backend

1. **`server/routes/ai.ts`**:
   - ✅ Updated `/generate-seo-title` → word-based (fixed)
   - ✅ Updated `/generate-article-title` → word-based (fixed)
   - ✅ Updated `/generate-meta-description` → word-based (fixed)
   - ✅ Updated `/rewrite` → async estimateRewriteTokens()
   - ✅ Updated `/write-more` → word-based estimation
   - ✅ Already done: `/generate-article-write` (with multiplier)
   - ✅ Already done: `/generate-toplist-write` (with multiplier)

2. **`server/lib/tokenManager.ts`**:
   - ✅ Updated `estimateRewriteTokens()` → word-based calculation

3. **`server/lib/tokenCalculator.ts`**:
   - ✅ Already has `calculateTokens()` with modelId parameter
   - ✅ Already has `getCostMultiplier()` function

---

## 🎉 Summary

### What Changed

1. ✅ **AI Rewrite SEO Title** → Word-based (fixed cost)
2. ✅ **AI Rewrite Tiêu đề** → Word-based (fixed cost)
3. ✅ **AI Rewrite Giới thiệu ngắn** → Word-based (fixed cost)
4. ✅ **AI Rewrite Text** → Word-based (variable)
5. ✅ **Write More** → Word-based (variable)
6. ✅ **Viết bài** → Word-based with multiplier (already done)
7. ✅ **Tiếp tục viết bài** → Word-based with multiplier (already done)

### Formula

```javascript
// Fixed features (no multiplier):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words)

// Variable features (with multiplier if model selected):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)
```

### Benefits

- 🚀 **60-300x more usage** with same token budget
- 💰 **99% cost reduction** for short-output features
- ✅ **Fairer pricing** based on actual output length
- 🎯 **Consistent system** across all features
- 🔧 **Database-driven** costs (easy to adjust)

---

**Status**: ✅ **COMPLETE** - Ready for deployment

**Build**: ✅ **SUCCESS** (Exit Code: 0)

**Date**: January 15, 2026

**Next**: Deploy và test với real data
