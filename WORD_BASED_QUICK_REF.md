# 🚀 QUICK REFERENCE - Word-Based Token Calculation

## ✅ Tất cả tính năng đã chuyển sang WORD-BASED

| Tính năng | Formula | Example |
|-----------|---------|---------|
| **AI Rewrite SEO Title** | `(words/1000) * 500` | 10 words = **5 tokens** |
| **AI Rewrite Tiêu đề** | `(words/1000) * 500` | 10 words = **5 tokens** |
| **AI Rewrite Giới thiệu ngắn** | `(words/1000) * 800` | 30 words = **24 tokens** |
| **AI Rewrite Text** | `(words/1000) * 10` | 300 words = **3 tokens** |
| **Write More** | `(words/1000) * 10` | 500 words = **5 tokens** |
| **Viết bài (GPT default)** | `(words/1000) * 15 * 1.0` | 2000 words = **30 tokens** |
| **Viết bài (Gemini 2.5)** | `(words/1000) * 15 * 3.0` | 2000 words = **90 tokens** |
| **Tiếp tục viết bài** | Same as Viết bài | Same calculation |

---

## 💾 Database Config

```sql
-- Check current costs
SELECT feature_key, token_cost_per_1000_words, is_fixed_cost 
FROM ai_feature_token_costs 
WHERE is_active = TRUE;

-- Check model multipliers
SELECT display_name, model_id, cost_multiplier 
FROM ai_models 
WHERE is_active = TRUE;
```

---

## 🧮 Formula

```javascript
// Fixed features (SEO, titles):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words)

// Variable features (articles with model selection):
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words * costMultiplier)
```

---

## 📊 Savings Example

**Starter Plan: 400,000 tokens**

### Before (Fixed Cost):
- SEO titles: 300 tokens each → 1,333 titles
- Rewrite: 1000 tokens each → 400 rewrites
- Articles: 30 tokens each → 13,333 articles

### After (Word-Based):
- SEO titles: 5 tokens each → **80,000 titles** (60x more!)
- Rewrite: 3 tokens each → **133,333 rewrites** (333x more!)
- Articles: 30 tokens each → **13,333 articles** (same)

---

## 🎯 Testing

```bash
# 1. Deploy
pm2 restart volxai-server

# 2. Test each feature
# - Generate SEO title → Check tokens = ~5
# - Rewrite text → Check tokens = ~3
# - Write more → Check tokens = ~5
# - Generate article → Check tokens = (words/1000)*15*multiplier

# 3. Monitor logs
pm2 logs volxai-server | grep "tokens"
```

---

**Status**: ✅ COMPLETE

**Build**: ✅ SUCCESS

**Ready**: ✅ DEPLOY NOW
