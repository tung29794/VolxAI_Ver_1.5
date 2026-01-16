# Toplist Continuation - Database Prompts Refactor (Option 2)

## 📋 Summary

**Đã thực hiện:** Refactor TOPLIST continuation để sử dụng database prompts thay vì hardcoded prompts (Option 2 - Proper fix).

**Phạm vi:** CHỈ ảnh hưởng đến **TOPLIST** generation, KHÔNG đụng vào các chức năng khác (generate article, rewrite, etc.)

---

## 🔍 Vấn Đề Ban Đầu

### 1. Code Fence Markers (```html)
**Hiện tượng:** Lần viết đầu tiên có ký tự ```html ở đầu và ``` ở cuối
**Nguyên nhân:** Không có code fence removal cho generate article
**Đã fix:** ✅ Added code fence removal (lines ~1938, ~2421)

### 2. Continuation Prompts Hardcoded
**Hiện tượng:** 
- Load database prompt nhưng chỉ dùng cho instruction/rules
- Format requirements vẫn bị HARDCODED lại sau đó
- Duplicate code, khó maintain

**Ví dụ code CŨ:**
```typescript
// Load database prompt
const continuePrompt = await loadPrompt('continue_toplist');
continuationPrompt = interpolatePrompt(continuePrompt.prompt_template, {...});

// NHƯNG lại hardcode lại format requirements!
const geminiPrompt = `${content}\n\n${continuationPrompt}\n\n
⚠️ CRITICAL FORMAT REQUIREMENTS:
... 30+ dòng hardcoded rules ...
`;
```

### 3. Paragraph Count Issues
**Hiện tượng:** Continuation viết 3 đoạn thay vì 2 đoạn (theo config)
**Nguyên nhân:** 
- Hardcoded format requirements không đủ rõ ràng
- AI tự ý viết nhiều hơn
- Instruction bị conflict giữa database prompt và hardcoded rules

---

## ✅ Giải Pháp (Option 2 - Proper Fix)

### 1. Database Prompt Template

**File:** `ADD_CONTINUE_TOPLIST_PROMPT.sql`

```sql
INSERT INTO ai_prompts (
  feature_name,
  display_name,
  prompt_template,
  system_prompt,
  available_variables
) VALUES (
  'continue_toplist',
  'Continue Toplist Generation',
  '[Full prompt template with ALL format requirements]',
  'You are a professional toplist content writer...',
  '["previous_content", "continuation_rules", "next_item_number", 
    "total_items", "current_item_count", "paragraphs_per_item", 
    "paragraph_words", "length_key", "outline_reference"]'
);
```

**Available Variables:**
- `{previous_content}` - Content đã viết (để AI tiếp nối)
- `{continuation_rules}` - Rules về việc tiếp tục (không rewrite, etc.)
- `{next_item_number}` - Item number tiếp theo (e.g., "8")
- `{total_items}` - Tổng số items cần viết (e.g., "10")
- `{current_item_count}` - Số items đã viết (e.g., "7")
- `{paragraphs_per_item}` - Số paragraphs mỗi item (e.g., "2")
- `{paragraph_words}` - Số words mỗi paragraph (e.g., "100")
- `{length_key}` - Length type (short/medium/long)
- `{outline_reference}` - Outline để follow

### 2. Code Refactor

**TRƯỚC (Hardcoded):**
```typescript
const geminiPrompt = `${content}\n\n${continuationPrompt}\n\n
⚠️ CRITICAL FORMAT REQUIREMENTS:
1. HTML STRUCTURE (MANDATORY):
   - Use <h2>#. Title</h2>
   - Use <p>...</p>
   - Each item: EXACTLY ${paragraphs} paragraphs
   ... 25+ more hardcoded lines ...
`;
```

**SAU (Database Prompt):**
```typescript
// Load prompt from database
const continuePromptTemplate = await loadPrompt('continue_toplist');

if (continuePromptTemplate) {
  console.log('✅ Using database prompt for continue_toplist');
  continuationPrompt = interpolatePrompt(continuePromptTemplate.prompt_template, {
    previous_content: content,
    continuation_rules: continuationRules,
    next_item_number: (currentItemCount + 1).toString(),
    total_items: itemCount.toString(),
    current_item_count: currentItemCount.toString(),
    paragraphs_per_item: actualParagraphsPerItem.toString(),
    paragraph_words: lengthConfig.paragraphWords.toString(),
    length_key: lengthKey,
    outline_reference: outlineToCheck || 'No outline provided'
  });
} else {
  // Fallback to hardcoded if database not available
  console.log('⚠️ Using fallback hardcoded prompt');
  continuationPrompt = `[fallback prompt]`;
}

// Use the prompt directly (no more duplicate hardcoded rules!)
const geminiRequestBody = {
  contents: [{ parts: [{ text: continuationPrompt }] }],
  // ...
};
```

### 3. Key Improvements

#### ✅ No More Duplicate Code
- Format requirements chỉ có MỘT chỗ (database)
- Không còn hardcoded rules sau khi load database prompt
- Code gọn hơn, dễ maintain hơn

#### ✅ Centralized Prompt Management
- Admin có thể edit prompt qua UI
- Update prompt không cần deploy code
- A/B test prompts dễ dàng

#### ✅ Backward Compatible
- Vẫn có fallback nếu database prompt chưa có
- Không break existing functionality
- Safe to deploy

#### ✅ Explicit Paragraph Count Enforcement
Database prompt có section rõ ràng:
```
2. PARAGRAPH COUNT ENFORCEMENT:
   - This is {length_key} length toplist
   - MUST write EXACTLY {paragraphs_per_item} paragraphs per item
   - FORBIDDEN: Writing 3 paragraphs when config says 2
   - FORBIDDEN: Writing 1 paragraph when config says 2
```

---

## 📊 Impact Analysis

### Affected Components
✅ **ONLY Toplist Continuation** - handleGenerateToplist continuation logic (lines ~4200-4350)

### NOT Affected
❌ Generate Article - No changes
❌ AI Outline - No changes  
❌ AI Rewrite - No changes
❌ AI Continue (regular article) - No changes (separate feature)
❌ Any other features - No changes

### Code Changes
- ✅ `server/routes/ai.ts` - Lines ~4205-4310 (toplist continuation only)
- ✅ `ADD_CONTINUE_TOPLIST_PROMPT.sql` - New database prompt
- ✅ Build size: 281.22 kB (slight increase due to fallback prompt)

---

## 🚀 Deployment

### Step 1: Database Migration
```bash
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_CONTINUE_TOPLIST_PROMPT.sql
```

**Verify:**
```sql
SELECT feature_name, display_name, description 
FROM ai_prompts 
WHERE feature_name = 'continue_toplist';
```

### Step 2: Deploy Server Build
```bash
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/api.volxai.com/
```

### Step 3: Restart Server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/api.volxai.com/.lsphp_restart.txt"
```

### Step 4: Verify
1. Create a toplist (long, 10+ items)
2. Check console logs for: `✅ Using database prompt for continue_toplist`
3. Verify continuation writes EXACTLY 2 paragraphs per item (for medium/short)
4. Check no ```html markers in output

---

## 🎯 Expected Behavior After Fix

### Paragraph Count Rules (CORRECTED)

**No Outline Mode (tuỳ theo độ dài):**
- Short: 1 đoạn mỗi item
- Medium: 2 đoạn mỗi item  
- Long: 3 đoạn mỗi item

**AI Outline Mode (cố định):**
- Short/Medium/Long: LUÔN 2 đoạn mỗi item (giống medium no-outline)

### Before
❌ ```html markers appear in output
❌ Continuation may write wrong paragraph count
❌ Config was: No-Outline Short=2, Medium=3, Long=5 (SAI!)
❌ Hardcoded format requirements duplicate database prompt
❌ Hard to update continuation logic (need code deploy)

### After
✅ No ```html markers (removed immediately after AI response)
✅ Continuation writes EXACTLY as configured:
   - No-Outline: 1/2/3 paragraphs (short/medium/long)
   - AI-Outline: 2 paragraphs (always, same as medium)
✅ Config fixed: No-Outline Short=1, Medium=2, Long=3 ✅
✅ Single source of truth for prompts (database)
✅ Easy to update prompts (just edit in database/Admin UI)
✅ Fallback available if database prompt missing

---

## 📝 Testing Checklist

### Test Case 1: Short Toplist (5 items, No Outline)
- [ ] All 5 items generated
- [ ] Each item has EXACTLY 1 paragraph
- [ ] No ```html markers
- [ ] No repeated items
- [ ] Console shows "Using database prompt"

### Test Case 2: Short Toplist (5 items, AI Outline)
- [ ] All 5 items generated
- [ ] Each item has EXACTLY 2 paragraphs (AI outline always 2)
- [ ] No ```html markers
- [ ] Console shows "Using database prompt"

### Test Case 3: Medium Toplist (10 items, No Outline)  
- [ ] All 10 items generated
- [ ] Each item has EXACTLY 2 paragraphs
- [ ] No ```html markers
- [ ] Items 1-10 numbered correctly
- [ ] Console shows "Using database prompt"

### Test Case 4: Medium Toplist (10 items, AI Outline)
- [ ] All 10 items generated
- [ ] Each item has EXACTLY 2 paragraphs (same as no-outline medium)
- [ ] No ```html markers
- [ ] Console shows "Using database prompt"

### Test Case 5: Long Toplist (15 items, No Outline)
- [ ] All 15 items generated
- [ ] Each item has EXACTLY 3 paragraphs
- [ ] Continuation triggered multiple times
- [ ] No rewrites of completed items
- [ ] Console shows "Using database prompt"

### Test Case 6: Long Toplist (15 items, AI Outline)
- [ ] All 15 items generated
- [ ] Each item has EXACTLY 2 paragraphs (AI outline always 2, not 3)
- [ ] Continuation triggered multiple times
- [ ] Console shows "Using database prompt"

### Test Case 7: Fallback Test (Database prompt not available)
- [ ] Remove prompt from database temporarily
- [ ] Generate toplist
- [ ] Console shows "Using fallback hardcoded prompt"
- [ ] Still generates correctly
- [ ] Add prompt back, verify switches to database

---

## 🐛 Troubleshooting

### Issue: Still seeing wrong paragraph count
**Example:** No-Outline Short writing 2 paragraphs instead of 1

**Check:**
1. Database prompt uploaded correctly
2. Console shows "Using database prompt" (not fallback)
3. Variable `{paragraphs_per_item}` is correct in logs
4. Config is correct:
   - No-Outline: Short=1, Medium=2, Long=3
   - AI-Outline: Always 2 (for all lengths)
5. No conflicting instructions in database prompt

**Solution:**
```sql
-- Check prompt content
SELECT prompt_template FROM ai_prompts WHERE feature_name = 'continue_toplist';

-- Verify variables
SELECT available_variables FROM ai_prompts WHERE feature_name = 'continue_toplist';

-- Check lengthConfig in code
-- Should be: short=1, medium=2, long=3 for No-Outline
-- Should be: always 2 for AI-Outline
```

### Issue: ```html markers still appearing
**Check:**
1. Server build deployed (lines ~1938, ~2421 have code fence removal)
2. Check if using Gemini (code fence removal only for Gemini)

**Solution:**
```bash
# Verify server build timestamp
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "ls -lh ~/api.volxai.com/node-build.mjs"

# Should show recent timestamp after deployment
```

### Issue: "Database prompt not found" in logs
**Check:**
1. SQL migration ran successfully
2. Feature name is 'continue_toplist' (not 'continue_article')

**Solution:**
```sql
-- Check if prompt exists
SELECT * FROM ai_prompts WHERE feature_name = 'continue_toplist';

-- Re-run migration if needed
SOURCE ADD_CONTINUE_TOPLIST_PROMPT.sql;
```

---

## ✅ Success Criteria

- [x] Build successful (281.22 kB)
- [x] No compile errors
- [x] Code fence removal added
- [x] Database prompt created
- [x] Hardcoded duplicate removed
- [x] Fallback logic preserved
- [ ] Database migration deployed
- [ ] Server build deployed
- [ ] Tested in production
- [ ] Console shows "Using database prompt"
- [ ] Paragraph count correct (2 for AI outline)
- [ ] No ```html markers

---

## 📚 Related Files

- `ADD_CONTINUE_TOPLIST_PROMPT.sql` - Database migration
- `server/routes/ai.ts` (lines ~4205-4350) - Implementation
- `ARTICLE_CONTINUATION_DATABASE_PROMPTS.md` - Regular article continuation (separate)
- `TOPLIST_FIXES_COMPREHENSIVE.md` - Previous toplist fixes

---

**Status:** Ready for deployment  
**Risk Level:** LOW (only affects toplist continuation, has fallback)  
**Deployment Time:** ~5 minutes  
**Rollback:** Easy (remove database prompt, fallback will be used)
