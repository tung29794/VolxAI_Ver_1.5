# ⚡ QUICK DEPLOYMENT - Word-Based Token Calculation

## 🎯 Objective

Update token calculation from **fixed cost per article** to **dynamic cost based on word count**.

---

## 📋 Pre-Deployment Checklist

- [x] Code built successfully (`npm run build`)
- [x] Database migration files ready
- [x] Backup database (recommended)

---

## 🚀 Deployment Steps

### Step 1: Database Migration (CRITICAL)

```bash
# Connect to MySQL
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p

# Enter password when prompted
```

**Run migrations in order**:

```sql
-- Use the correct database
USE jybcaorr_lisacontentdbapi;

-- Check current token costs (should be high values like 15000)
SELECT feature_key, token_cost FROM ai_feature_token_costs;

-- Run migration 1: Add table and columns
SOURCE /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql;

-- Run migration 2: Update token costs to word-based
SOURCE /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/UPDATE_TOKEN_COSTS_TO_WORD_BASED.sql;

-- Verify new values
SELECT feature_key, feature_name, token_cost, description 
FROM ai_feature_token_costs 
ORDER BY token_cost DESC;
```

**Expected results**:
```
generate_news: 20
generate_toplist: 18  
generate_article: 15
ai_rewrite_text: 10
write_more: 8
continue_article: 5
generate_meta_description: 800
generate_seo_title: 500
generate_article_title: 500
find_image: 100
```

**Verify new columns**:
```sql
DESC articles;
-- Should show: word_count INT, tokens_used INT
```

### Step 2: Deploy Backend Code

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5

# Build already done, just restart
pm2 restart volxai-server

# OR if not using PM2
npm run preview
```

### Step 3: Verify Deployment

```bash
# Check logs
pm2 logs volxai-server --lines 50

# Look for these patterns:
# ✅ "📊 Token Calculation for generate_article:"
# ✅ "   - Word Count: xxxx"
# ✅ "   - Token Cost: 15 tokens/1000 words"
# ✅ "   - Actual Tokens: xx"
```

---

## 🧪 Testing

### Test Case 1: Generate Article (~2000 words)

**Steps**:
1. Login to account
2. Go to "Viết bài" → "Viết bài theo từ khóa"
3. Enter keyword: "Cách làm bánh mì"
4. Click "Viết bài với AI"
5. Wait for completion

**Expected Results**:
- Article generated successfully
- Check database:
  ```sql
  SELECT id, title, word_count, tokens_used 
  FROM articles 
  ORDER BY id DESC LIMIT 1;
  
  -- Expected:
  -- word_count: ~2000
  -- tokens_used: ~30 (calculated as: 2000/1000 * 15)
  ```
- Check server logs:
  ```
  📊 Token Calculation for generate_article:
     - Word Count: 2000
     - Token Cost: 15 tokens/1000 words
     - Actual Tokens: 30
  ```

### Test Case 2: AI Rewrite (~300 words)

**Steps**:
1. Open an article in editor
2. Select ~300 words of text
3. Click "AI Rewrite"
4. Choose style (e.g., "Professional")

**Expected Results**:
- Text rewritten successfully
- Token deduction: `(300/1000) * 10 = 3 tokens`
- Check logs:
  ```
  ✅ AI Rewrite success - 300 words, 3 tokens
  ```

### Test Case 3: Write More (~500 words)

**Steps**:
1. Open article editor
2. Place cursor at end of content
3. Click "Write More"

**Expected Results**:
- New content generated (~500 words)
- Token deduction: `(500/1000) * 8 = 4 tokens`
- Check logs:
  ```
  ✅ Write More success - 500 words, 4 tokens
  ```

### Test Case 4: Fixed Cost Feature

**Generate SEO Title**:
- Token deduction: **500 tokens** (fixed, regardless of length)

**Find Image**:
- Token deduction: **100 tokens** (fixed)

---

## 📊 Monitoring

### Key Metrics to Watch

```sql
-- Check token costs are correct
SELECT * FROM ai_feature_token_costs;

-- Check recent articles have word_count populated
SELECT id, title, word_count, tokens_used, created_at
FROM articles 
WHERE created_at >= NOW() - INTERVAL 1 HOUR
ORDER BY id DESC;

-- Monitor token usage patterns
SELECT 
    action,
    COUNT(*) as usage_count,
    AVG(tokens_used) as avg_tokens,
    SUM(tokens_used) as total_tokens
FROM token_usage_history
WHERE created_at >= NOW() - INTERVAL 1 DAY
GROUP BY action;
```

### Expected Behavior Changes

**Before** (Fixed cost):
- Every article: 15,000 tokens
- Short article (500 words): 15,000 tokens ❌
- Long article (5000 words): 15,000 tokens ❌

**After** (Word-based):
- Short article (500 words): 8 tokens ✅
- Medium article (2000 words): 30 tokens ✅
- Long article (5000 words): 75 tokens ✅

---

## 🐛 Troubleshooting

### Issue 1: Token costs still showing old values

**Symptoms**:
- Database shows `generate_article = 15000` (not 15)
- Logs show huge token deductions

**Fix**:
```sql
-- Force update token costs
UPDATE ai_feature_token_costs 
SET token_cost = 15 
WHERE feature_key = 'generate_article';

-- Verify
SELECT feature_key, token_cost FROM ai_feature_token_costs;
```

### Issue 2: word_count = 0 in new articles

**Symptoms**:
- New articles have `word_count = 0`

**Check**:
```bash
# Check server logs
pm2 logs volxai-server | grep "Token Calculation"

# Should see:
# 📊 Token Calculation for generate_article:
#    - Word Count: xxxx
```

**Fix**:
- Restart server: `pm2 restart volxai-server`
- Check import in `ai.ts`: `import { calculateTokens, countWords } from "../lib/tokenCalculator"`

### Issue 3: Module not found error

**Symptoms**:
```
Error: Cannot find module '../lib/tokenCalculator'
```

**Fix**:
```bash
# Rebuild
npm run build

# Restart
pm2 restart volxai-server
```

### Issue 4: SQL syntax errors during migration

**Symptoms**:
- Migration fails with MySQL syntax errors

**Possible Causes**:
- Using wrong MySQL client (SQL Server syntax)
- File encoding issues

**Fix**:
```bash
# Ensure using MySQL client (not MSSQL)
which mysql
# Should show: /usr/local/bin/mysql or similar

# Re-run migration
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
```

---

## ✅ Rollback Plan (If Needed)

If something goes wrong and you need to rollback:

```sql
-- 1. Restore token costs to old values
UPDATE ai_feature_token_costs SET token_cost = 15000 WHERE feature_key = 'generate_article';
UPDATE ai_feature_token_costs SET token_cost = 18000 WHERE feature_key = 'generate_toplist';
UPDATE ai_feature_token_costs SET token_cost = 20000 WHERE feature_key = 'generate_news';
UPDATE ai_feature_token_costs SET token_cost = 300 WHERE feature_key = 'ai_rewrite_text';
UPDATE ai_feature_token_costs SET token_cost = 1000 WHERE feature_key = 'write_more';
UPDATE ai_feature_token_costs SET token_cost = 5000 WHERE feature_key = 'continue_article';

-- 2. Remove new columns (optional, may lose data)
-- ALTER TABLE articles DROP COLUMN word_count;
-- ALTER TABLE articles DROP COLUMN tokens_used;
```

Then revert code:
```bash
git checkout HEAD~1 server/lib/tokenCalculator.ts server/routes/ai.ts
npm run build
pm2 restart volxai-server
```

---

## 📞 Support

If issues persist:

1. **Check logs**: `pm2 logs volxai-server --lines 200`
2. **Check database**: Run queries in monitoring section
3. **Verify files**: 
   - `server/lib/tokenCalculator.ts` exists
   - `server/routes/ai.ts` has import statement
4. **Rebuild**: `npm run build`
5. **Restart**: `pm2 restart volxai-server`

---

## 🎓 Understanding the Change

### Formula

**Old (Fixed)**:
```
tokens = 15000  // Always the same
```

**New (Word-based)**:
```
tokens = CEIL((wordCount / 1000) * tokenCostPer1000Words)
```

### Examples

| Article Length | Old Cost | New Cost | Savings |
|---------------|----------|----------|---------|
| 500 words | 15,000 | 8 | 99.95% |
| 1000 words | 15,000 | 15 | 99.90% |
| 2000 words | 15,000 | 30 | 99.80% |
| 5000 words | 15,000 | 75 | 99.50% |

**Note**: Giờ user có thể viết NHIỀU bài hơn với cùng số tokens!

---

## ✨ Success Criteria

Deployment is successful when:

- [x] Database migration completed without errors
- [x] Server logs show word count calculations
- [x] New articles have `word_count > 0`
- [x] Token deductions match formula: `(words/1000) * cost`
- [x] Admin UI shows new token costs (15, not 15000)
- [x] Editor features work when article quota exhausted

---

## 📚 Related Documentation

- `WORD_BASED_TOKEN_CALCULATION.md` - Detailed explanation
- `TOKEN_COSTS_AND_ARTICLE_LIMITS.md` - Original feature doc
- `ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql` - Full migration
- `UPDATE_TOKEN_COSTS_TO_WORD_BASED.sql` - Token cost updates

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Status**: ⬜ Success  ⬜ Failed  ⬜ Rollback

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
