# ✅ COST MULTIPLIER IMPLEMENTATION - COMPLETE

## 🎯 Feature Đã Hoàn Thành

**Mục tiêu**: Nhân token cost với `cost_multiplier` từ bảng `ai_models`

**Công thức mới**:
```javascript
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)
```

---

## 📊 Ví dụ Tính Toán

### Scenario: Gemini 2.5 Flash (3.00x multiplier)

**Bài viết 2000 từ**:
```
Base calculation:
baseTokens = (2000 / 1000) * 15 = 30 tokens

With cost multiplier:
actualTokens = 30 * 3.00 = 90 tokens ✅
```

**Bài viết 500 từ**:
```
Base calculation:
baseTokens = (500 / 1000) * 15 = 7.5 tokens

With cost multiplier:
actualTokens = 7.5 * 3.00 = 22.5 → 23 tokens ✅
```

### Scenario: GPT 4.1 MINI (2.00x multiplier)

**Bài viết 2000 từ**:
```
Base calculation:
baseTokens = (2000 / 1000) * 15 = 30 tokens

With cost multiplier:
actualTokens = 30 * 2.00 = 60 tokens ✅
```

### Scenario: OpenAI default (1.00x multiplier)

**Bài viết 2000 từ**:
```
Base calculation:
baseTokens = (2000 / 1000) * 15 = 30 tokens

With cost multiplier:
actualTokens = 30 * 1.00 = 30 tokens ✅
```

---

## 🗄️ Database

### Table `ai_models`

Column `cost_multiplier`:
- Type: `DECIMAL(10,2)`
- Default: `1.00`
- Example values:
  - `1.00` = Normal cost (default)
  - `2.00` = Double cost (GPT 4.1 MINI)
  - `3.00` = Triple cost (Gemini 2.5 Flash)

**Query để check**:
```sql
SELECT display_name, model_id, cost_multiplier 
FROM ai_models 
WHERE is_active = TRUE
ORDER BY cost_multiplier DESC;
```

**Expected results**:
```
Gemini 2.5 Flash | gemini-2.5-flash | 3.00
GPT 4o MINI      | gpt-4o-mini      | 3.00
GPT 4.1 MINI     | gpt-3.5-turbo    | 2.00
```

---

## 💻 Code Changes

### 1. New Function: `getCostMultiplier()`

**File**: `server/lib/tokenCalculator.ts`

**Code**:
```typescript
export async function getCostMultiplier(modelId?: string): Promise<number> {
  if (!modelId) {
    return 1.0; // No multiplier if model not specified
  }

  try {
    const result = await queryOne<any>(
      `SELECT cost_multiplier 
       FROM ai_models 
       WHERE model_id = ? AND is_active = TRUE`,
      [modelId]
    );
    
    if (result && result.cost_multiplier) {
      return parseFloat(result.cost_multiplier);
    }
    
    console.log(`⚠️ Cost multiplier not found for model: ${modelId}, using 1.0`);
    return 1.0; // Default multiplier
  } catch (error) {
    console.error(`Error fetching cost multiplier for model ${modelId}:`, error);
    return 1.0; // Safe fallback
  }
}
```

### 2. Updated Function: `calculateTokens()`

**Signature changed**:
```typescript
// OLD:
export async function calculateTokens(
  content: string,
  featureKey: string,
  isFixedCost: boolean = false
): Promise<number>

// NEW:
export async function calculateTokens(
  content: string,
  featureKey: string,
  isFixedCost: boolean = false,
  modelId?: string  // ← NEW parameter
): Promise<number>
```

**Implementation**:
```typescript
export async function calculateTokens(
  content: string,
  featureKey: string,
  isFixedCost: boolean = false,
  modelId?: string
): Promise<number> {
  const tokenCostPer1000Words = await getTokenCostPer1000Words(featureKey);
  
  // Fixed cost features don't use multiplier
  if (isFixedCost) {
    return tokenCostPer1000Words;
  }
  
  // Get cost multiplier from model
  const costMultiplier = await getCostMultiplier(modelId);
  
  // Calculate with multiplier
  const wordCount = countWords(content);
  const baseTokens = (wordCount / 1000) * tokenCostPer1000Words;
  const actualTokens = Math.ceil(baseTokens * costMultiplier);
  
  console.log(`📊 Token Calculation for ${featureKey}:`);
  console.log(`   - Word Count: ${wordCount}`);
  console.log(`   - Token Cost: ${tokenCostPer1000Words} tokens/1000 words`);
  console.log(`   - Model: ${modelId || 'default'}`);
  console.log(`   - Cost Multiplier: ${costMultiplier}x`);
  console.log(`   - Base Tokens: ${Math.ceil(baseTokens)}`);
  console.log(`   - Actual Tokens (with multiplier): ${actualTokens}`);
  
  return actualTokens;
}
```

### 3. Updated Routes in `server/routes/ai.ts`

#### `/generate-article-write`

**Changed**:
```typescript
// OLD:
const articleTokens = await calculateTokens(finalContent, 'generate_article', false);
const titleTokens = await calculateTokens(title || '', 'generate_article', false);

// NEW:
const articleTokens = await calculateTokens(finalContent, 'generate_article', false, actualModel);
const titleTokens = await calculateTokens(title || '', 'generate_article', false, actualModel);
```

#### `/generate-toplist-write`

**Changed**:
```typescript
// OLD:
const articleTokens = await calculateTokens(cleanedContent, 'generate_toplist', false);

// NEW:
const articleTokens = await calculateTokens(cleanedContent, 'generate_toplist', false, actualModel);
```

#### `/rewrite` & `/write-more`

**No changes**: These endpoints don't have model selection, so they use default multiplier (1.0x).

---

## 🔍 How It Works

### Flow Diagram

```
User selects model: "Gemini 2.5 Flash"
        ↓
getApiKeyForModel(model)
        ↓
Returns: {
  actualModel: "gemini-2.5-flash",
  provider: "google-ai",
  apiKey: "..."
}
        ↓
AI generates article (2000 words)
        ↓
calculateTokens(content, 'generate_article', false, actualModel)
        ↓
    1. countWords(content) → 2000
    2. getTokenCostPer1000Words('generate_article') → 15
    3. getCostMultiplier('gemini-2.5-flash') → 3.00
    4. baseTokens = (2000 / 1000) * 15 = 30
    5. actualTokens = 30 * 3.00 = 90
        ↓
Deduct 90 tokens from user
```

---

## 📝 Server Logs Example

**Without multiplier** (old):
```
📊 Token Calculation for generate_article:
   - Word Count: 2000
   - Token Cost: 15 tokens/1000 words
   - Actual Tokens: 30
```

**With multiplier** (new):
```
📊 Token Calculation for generate_article:
   - Word Count: 2000
   - Token Cost: 15 tokens/1000 words
   - Model: gemini-2.5-flash
   - Cost Multiplier: 3.0x
   - Base Tokens: 30
   - Actual Tokens (with multiplier): 90
```

---

## ✅ Testing Checklist

### Test 1: Gemini 2.5 Flash (3.00x)

- [ ] Create 2000-word article with Gemini 2.5 Flash
- [ ] Expected token deduction: `(2000/1000) * 15 * 3.0 = 90 tokens`
- [ ] Check logs for "Cost Multiplier: 3.0x"
- [ ] Verify database: `tokens_used = 90`

### Test 2: GPT 4.1 MINI (2.00x)

- [ ] Create 2000-word article with GPT 4.1 MINI
- [ ] Expected token deduction: `(2000/1000) * 15 * 2.0 = 60 tokens`
- [ ] Check logs for "Cost Multiplier: 2.0x"
- [ ] Verify database: `tokens_used = 60`

### Test 3: Default model (1.00x)

- [ ] Create 2000-word article with default model
- [ ] Expected token deduction: `(2000/1000) * 15 * 1.0 = 30 tokens`
- [ ] Check logs for "Cost Multiplier: 1.0x"
- [ ] Verify database: `tokens_used = 30`

### Test 4: Fixed cost features (NO multiplier)

- [ ] Generate SEO Title
- [ ] Expected: 500 tokens (fixed, NO multiplier applied)
- [ ] Check logs: Should NOT show "Cost Multiplier"

---

## 🚨 Important Notes

### Fixed Cost Features

**These features do NOT use cost multiplier**:
- `generate_seo_title` - Always 500 tokens
- `generate_article_title` - Always 500 tokens
- `generate_meta_description` - Always 800 tokens
- `find_image` - Always 100 tokens

**Why?**: Fixed costs are already expensive. No need to multiply.

### Model ID Mapping

The `modelId` parameter should be the **actual model ID** from `ai_models` table, not the display name:

| Display Name | Model ID (use this) |
|--------------|---------------------|
| Gemini 2.5 Flash | `gemini-2.5-flash` |
| GPT 4.1 MINI | `gpt-3.5-turbo` |
| GPT 4o MINI | `gpt-4o-mini` |

---

## 🎓 Formula Reference

### Complete Formula

```javascript
// For word-based features (articles, rewrite, write more):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)

// For fixed-cost features (SEO, images):
actualTokens = tokenCost  // No multiplier!
```

### Example Calculations

| Words | Feature | Cost/1000 | Model | Multiplier | Calculation | Result |
|-------|---------|-----------|-------|------------|-------------|--------|
| 2000 | article | 15 | Gemini 2.5 | 3.0x | (2000/1000)*15*3.0 | 90 |
| 2000 | article | 15 | GPT 4.1 | 2.0x | (2000/1000)*15*2.0 | 60 |
| 2000 | article | 15 | Default | 1.0x | (2000/1000)*15*1.0 | 30 |
| 500 | article | 15 | Gemini 2.5 | 3.0x | (500/1000)*15*3.0 | 23 |
| 300 | rewrite | 10 | Default | 1.0x | (300/1000)*10*1.0 | 3 |
| N/A | SEO title | 500 | Any | N/A | Fixed | 500 |

---

## 🚀 Deployment

### Already Done

- [x] Code updated
- [x] Build successful
- [x] Functions exported

### Next Steps

1. **Deploy backend**:
   ```bash
   pm2 restart volxai-server
   ```

2. **Test with real models**:
   - Create article with Gemini 2.5 Flash
   - Verify token deduction is 3x base cost

3. **Monitor logs**:
   ```bash
   pm2 logs volxai-server | grep "Cost Multiplier"
   ```

---

## 📊 Impact Analysis

### Example: Starter Plan (400,000 tokens)

**Bài 2000 từ với các models**:

| Model | Multiplier | Tokens/bài | Số bài có thể viết |
|-------|------------|------------|-------------------|
| Default | 1.0x | 30 | 13,333 |
| GPT 4.1 MINI | 2.0x | 60 | 6,666 |
| Gemini 2.5 Flash | 3.0x | 90 | 4,444 |

**Insight**: Model đắt hơn → viết được ít bài hơn. User phải cân nhắc giữa chất lượng và số lượng.

---

## 🎉 Summary

### What Changed

1. ✅ Added `getCostMultiplier()` function
2. ✅ Updated `calculateTokens()` to accept `modelId` parameter
3. ✅ Updated `calculateTokensForMultipleContents()` with multiplier
4. ✅ Updated `estimateTokens()` with multiplier
5. ✅ Updated `/generate-article-write` to pass `actualModel`
6. ✅ Updated `/generate-toplist-write` to pass `actualModel`
7. ✅ Build successful (no errors)

### Formula

```
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)
```

### Example

```
2000 words + Gemini 2.5 Flash (3.0x) = 90 tokens
```

**Status**: ✅ COMPLETE - Ready for deployment

---

**Date**: January 15, 2026

**Build**: ✅ SUCCESS

**Next**: Deploy và test với models thực tế
