# 🔄 WORD-BASED TOKEN CALCULATION UPDATE

## 📋 Tổng quan

**Cập nhật**: Hệ thống tính token đã được thay đổi từ **"cố định mỗi bài"** sang **"tokens per 1000 từ"**

### Lý do thay đổi

❌ **Trước đây (SAI)**:
- `generate_article` = 15,000 tokens (cố định)
- Bài viết 500 từ → 15,000 tokens
- Bài viết 5,000 từ → 15,000 tokens
- **Không công bằng!**

✅ **Bây giờ (ĐÚNG)**:
- `generate_article` = 15 tokens/1000 từ
- Bài viết 500 từ → `(500/1000) * 15 = 7.5 = 8 tokens`
- Bài viết 5,000 từ → `(5000/1000) * 15 = 75 tokens`
- **Tính chính xác theo nội dung!**

---

## 🎯 Token Cost mới (tokens/1000 từ)

### Chức năng viết bài (word-based)

| Feature Key | Tên chức năng | Token/1000 từ | Mô tả |
|------------|--------------|---------------|--------|
| `generate_article` | Viết bài theo từ khóa | **15** | Tạo bài viết hoàn chỉnh |
| `generate_toplist` | Viết bài Toplist | **18** | Tạo bài viết dạng toplist |
| `generate_news` | Viết tin tức | **20** | Tìm kiếm và viết tin tức |
| `continue_article` | Tiếp tục viết bài | **5** | Tiếp tục viết phần còn lại |
| `ai_rewrite_text` | AI Rewrite Text | **10** | Viết lại đoạn văn bản |
| `write_more` | Write More | **8** | Viết thêm nội dung |

### Chức năng SEO & Tiện ích (fixed cost)

| Feature Key | Tên chức năng | Tokens | Mô tả |
|------------|--------------|--------|--------|
| `generate_seo_title` | AI Rewrite SEO Title | **500** | Fixed cost |
| `generate_article_title` | AI Rewrite Tiêu đề | **500** | Fixed cost |
| `generate_meta_description` | AI Rewrite Giới thiệu ngắn | **800** | Fixed cost |
| `find_image` | Find Image | **100** | Fixed cost |

---

## 📊 Ví dụ tính toán

### Ví dụ 1: Gói Starter
**Plan**: 60 bài/tháng, 400,000 tokens/tháng

**Viết bài 2000 từ với generate_article**:
```
Token cost = (2000 / 1000) * 15 = 30 tokens
Còn lại: 400,000 - 30 = 399,970 tokens
Số bài: 60 - 1 = 59 bài
```

**Viết bài 5000 từ với generate_article**:
```
Token cost = (5000 / 1000) * 15 = 75 tokens
Còn lại: 399,970 - 75 = 399,895 tokens
Số bài: 59 - 1 = 58 bài
```

**Sử dụng AI Rewrite (300 từ)**:
```
Token cost = (300 / 1000) * 10 = 3 tokens
Còn lại: 399,895 - 3 = 399,892 tokens
Số bài: Không đổi (58 bài) ← Chỉ trừ tokens, không trừ số bài
```

### Ví dụ 2: Hết quota bài viết nhưng còn tokens

**Trạng thái**: 0 bài còn lại, 50,000 tokens còn lại

✅ **Được phép sử dụng**:
- ✅ AI Rewrite SEO Title (500 tokens)
- ✅ AI Rewrite Text (10 tokens/1000 từ)
- ✅ Write More (8 tokens/1000 từ)
- ✅ Find Image (100 tokens)
- ✅ Generate Meta Description (800 tokens)

❌ **Không được phép**:
- ❌ Generate Article (tạo bài mới)
- ❌ Generate Toplist (tạo bài mới)
- ❌ Generate News (tạo bài mới)

---

## 🗄️ Database Changes

### 1. Bảng `ai_feature_token_costs`

**Thay đổi COMMENT**:
```sql
token_cost INT NOT NULL DEFAULT 0 COMMENT 'Number of tokens per 1000 words (not per operation)'
```

**Giá trị cập nhật**:
```sql
-- Old values (SAI):
generate_article: 15000
ai_rewrite_text: 300
write_more: 1000

-- New values (ĐÚNG):
generate_article: 15   -- tokens/1000 words
ai_rewrite_text: 10    -- tokens/1000 words
write_more: 8          -- tokens/1000 words
```

### 2. Bảng `articles` - Thêm 2 cột mới

```sql
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS word_count INT DEFAULT 0 COMMENT 'Number of words in article content',
ADD COLUMN IF NOT EXISTS tokens_used INT DEFAULT 0 COMMENT 'Actual tokens consumed for this article';
```

**Mục đích**:
- `word_count`: Lưu số từ của bài viết
- `tokens_used`: Lưu số token thực tế đã tiêu hao

---

## 💻 Code Changes

### 1. Module mới: `tokenCalculator.ts`

**Location**: `/server/lib/tokenCalculator.ts`

**Functions**:

```typescript
// Đếm số từ trong content (hỗ trợ HTML)
function countWords(content: string): number

// Lấy token cost từ database
async function getTokenCostPer1000Words(featureKey: string): Promise<number>

// Tính token thực tế dựa trên word count
async function calculateTokens(
  content: string,
  featureKey: string,
  isFixedCost: boolean = false
): Promise<number>

// Check xem feature có phải fixed cost không
function isFixedCostFeature(featureKey: string): boolean
```

**Ví dụ sử dụng**:

```typescript
// Word-based calculation
const tokens = await calculateTokens(content, 'generate_article', false);
// Result: (wordCount / 1000) * 15

// Fixed cost
const tokens = await calculateTokens('', 'find_image', true);
// Result: 100 (fixed)
```

### 2. Cập nhật `server/routes/ai.ts`

**Import mới**:
```typescript
import {
  calculateTokens,
  countWords,
  isFixedCostFeature,
} from "../lib/tokenCalculator";
```

**Thay đổi trong `/generate-article-write`**:

❌ **Before**:
```typescript
const estimatedTokens = Math.ceil(content.length / 4);
const totalTokens = estimatedTokens + titleTokens;
```

✅ **After**:
```typescript
const articleTokens = await calculateTokens(finalContent, 'generate_article', false);
const titleTokens = await calculateTokens(title, 'generate_article', false);
const totalTokens = articleTokens + titleTokens;
const wordCount = countWords(finalContent);

// Save to database
INSERT INTO articles (..., word_count, tokens_used, ...)
VALUES (..., wordCount, totalTokens, ...)
```

**Thay đổi trong `/generate-toplist-write`**:

❌ **Before**:
```typescript
const estimatedTokens = Math.ceil(content.length / 4);
```

✅ **After**:
```typescript
const articleTokens = await calculateTokens(cleanedContent, 'generate_toplist', false);
const wordCount = countWords(cleanedContent);

INSERT INTO articles (..., word_count, tokens_used, ...)
VALUES (..., wordCount, articleTokens + imageTokens, ...)
```

**Thay đổi trong `/rewrite` (AI Rewrite)**:

❌ **Before**:
```typescript
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : estimatedTokens;
```

✅ **After**:
```typescript
const rewrittenWordCount = countWords(rewrittenText);
const actualTokens = await calculateTokens(rewrittenText, 'ai_rewrite_text', false);
console.log(`✅ AI Rewrite success - ${rewrittenWordCount} words, ${actualTokens} tokens`);
```

**Thay đổi trong `/write-more`**:

❌ **Before**:
```typescript
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

✅ **After**:
```typescript
const writtenWordCount = countWords(writtenContent);
const actualTokens = await calculateTokens(writtenContent, 'write_more', false);
console.log(`✅ Write More success - ${writtenWordCount} words, ${actualTokens} tokens`);
```

---

## 🚀 Deployment Steps

### Step 1: Run database migration

```bash
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
```

**Verify**:
```sql
-- Check token costs updated
SELECT feature_key, feature_name, token_cost, description 
FROM ai_feature_token_costs 
ORDER BY token_cost DESC;

-- Expected results:
-- generate_news: 20 (was 20000)
-- generate_toplist: 18 (was 18000)
-- generate_article: 15 (was 15000)
-- ai_rewrite_text: 10 (was 300)
-- write_more: 8 (was 1000)
-- continue_article: 5 (was 5000)

-- Check new columns
DESC articles;
-- Should show: word_count INT, tokens_used INT
```

### Step 2: Deploy backend code

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
npm run build
pm2 restart volxai-server
```

### Step 3: Verify logs

```bash
pm2 logs volxai-server --lines 100
```

**Look for**:
```
📊 Token Calculation for generate_article:
   - Word Count: 2000
   - Token Cost: 15 tokens/1000 words
   - Actual Tokens: 30
```

---

## ✅ Testing Checklist

### Test 1: Generate Article (2000 words)

1. Viết bài mới với keyword
2. Bài viết tạo ra ~2000 từ
3. **Expected**: 
   - Token deducted: `(2000/1000) * 15 = 30 tokens`
   - Log: `Word Count: 2000, Actual Tokens: 30`
   - Database: `word_count = 2000, tokens_used = 30`

### Test 2: AI Rewrite (300 words)

1. Chọn đoạn văn 300 từ
2. Click "AI Rewrite"
3. **Expected**:
   - Token deducted: `(300/1000) * 10 = 3 tokens`
   - Log: `Word Count: 300, Actual Tokens: 3`

### Test 3: Write More (500 words generated)

1. Click "Write More"
2. AI tạo thêm 500 từ
3. **Expected**:
   - Token deducted: `(500/1000) * 8 = 4 tokens`
   - Log: `Word Count: 500, Actual Tokens: 4`

### Test 4: Fixed Cost Features

**Generate SEO Title**:
- **Expected**: 500 tokens (fixed)

**Find Image**:
- **Expected**: 100 tokens (fixed)

**Generate Meta Description**:
- **Expected**: 800 tokens (fixed)

### Test 5: Article Limit Reached (tokens remain)

1. Tạo bài viết đến hết quota (ví dụ: 60/60 bài)
2. Try to generate new article
3. **Expected**: ❌ Blocked (article limit reached)
4. Try AI Rewrite / Write More
5. **Expected**: ✅ Allowed (only uses tokens, not article quota)

---

## 📈 Impact Analysis

### Trước đây (Fixed cost):

**Gói Starter**: 60 bài, 400,000 tokens
- Nếu mỗi bài 15,000 tokens → chỉ tạo được `400,000 / 15,000 = 26 bài`
- Còn lại 34 bài không dùng được (tokens hết)

### Bây giờ (Word-based):

**Gói Starter**: 60 bài, 400,000 tokens
- Bài viết trung bình 2000 từ → `(2000/1000) * 15 = 30 tokens/bài`
- Có thể tạo: `400,000 / 30 = 13,333 bài` (tokens)
- Giới hạn thực tế: **60 bài** (article limit)
- **Tokens còn lại**: `400,000 - (60 * 30) = 398,200 tokens` → dùng cho editor features!

### Lợi ích:

✅ Công bằng hơn (tính theo nội dung thực tế)
✅ Tiết kiệm tokens cho bài ngắn
✅ Tokens dư được dùng cho editor features
✅ User experience tốt hơn

---

## 🔍 Admin UI

Token costs có thể được quản lý tại:

**URL**: `/admin` → Tab "Token Costs"

**Chức năng**:
- Xem tất cả token costs
- Edit token cost (ví dụ: đổi từ 15 → 20 tokens/1000 words)
- Toggle active/inactive
- View description

**Note**: 
- Values là "tokens per 1000 words" (trừ fixed cost features)
- Thay đổi áp dụng ngay lập tức (không cần restart server)

---

## 🐛 Troubleshooting

### Issue: Token cost quá cao

**Check**:
```sql
SELECT * FROM ai_feature_token_costs WHERE feature_key = 'generate_article';
```

**Fix**:
- Nếu thấy `token_cost = 15000` → phải chạy lại migration
- Giá trị đúng: `token_cost = 15`

### Issue: word_count = 0 trong database

**Cause**: Bài viết cũ (trước khi update)

**Fix**: Cập nhật lại word_count cho bài cũ:
```sql
UPDATE articles 
SET word_count = (
  LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
)
WHERE word_count = 0 OR word_count IS NULL;
```

### Issue: Log không hiển thị word count

**Check**: Xem log có dòng này không:
```
📊 Token Calculation for generate_article:
   - Word Count: xxxx
```

**Fix**: 
- Restart server: `pm2 restart volxai-server`
- Check import: `import { calculateTokens } from "../lib/tokenCalculator"`

---

## 📚 Related Files

### SQL Migration
- `ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql`

### TypeScript Modules
- `server/lib/tokenCalculator.ts` (NEW)
- `server/lib/tokenManager.ts` (existing)
- `server/routes/ai.ts` (updated)

### Documentation
- `TOKEN_COSTS_AND_ARTICLE_LIMITS.md`
- `WORD_BASED_TOKEN_CALCULATION.md` (this file)

---

## 🎓 Formula Reference

### Word-based calculation

```
actualTokens = CEIL((wordCount / 1000) * tokenCostPer1000Words)
```

**Examples**:

| Feature | Words | Cost/1000 | Calculation | Result |
|---------|-------|-----------|-------------|--------|
| generate_article | 2000 | 15 | (2000/1000)*15 | 30 tokens |
| generate_article | 500 | 15 | (500/1000)*15 | 8 tokens |
| ai_rewrite_text | 300 | 10 | (300/1000)*10 | 3 tokens |
| write_more | 1500 | 8 | (1500/1000)*8 | 12 tokens |

### Fixed cost (không tính theo từ)

```
actualTokens = tokenCost (directly from database)
```

**Examples**:

| Feature | Cost | Note |
|---------|------|------|
| find_image | 100 | Fixed |
| generate_seo_title | 500 | Fixed |
| generate_meta_description | 800 | Fixed |

---

## ✨ Summary

**What changed**:
1. ✅ Token costs now based on word count (fair pricing)
2. ✅ New columns: `word_count`, `tokens_used` in articles table
3. ✅ New module: `tokenCalculator.ts` for accurate calculation
4. ✅ Updated all AI endpoints to use dynamic calculation
5. ✅ Editor features can work when article quota exhausted

**Benefits**:
- 💰 Save tokens on short articles
- 📊 Accurate tracking of token usage
- ✅ Fair pricing based on actual content
- 🎯 Better user experience

**Next steps**:
- Run database migration
- Deploy backend code
- Test all AI features
- Monitor logs for word count calculations
