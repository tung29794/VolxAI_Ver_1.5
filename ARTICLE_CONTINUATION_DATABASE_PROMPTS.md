# Article Continuation - Database Prompts Integration

## 📋 Tổng Quan

Trước đây, khi viết tiếp bài (article continuation) - tức là khi viết 1 lượt mà chưa hết outline, hệ thống sẽ viết tiếp cho đến khi hoàn thành outline - **tất cả đều sử dụng HARDCODED prompts**, không load từ database.

**VẤN ĐỀ:**
- Lần viết đầu tiên: Sử dụng database prompt ✅
- Lần viết tiếp (continuation): Sử dụng hardcoded prompt ❌
- Khó quản lý và cập nhật prompts cho continuation
- Không nhất quán với chiến lược sử dụng database prompts

**GIẢI PHÁP:**
Đã refactor code để continuation cũng sử dụng database prompts, đồng thời giữ fallback logic nếu database prompt không có.

---

## 🔧 Chi Tiết Thay Đổi

### 1. Database Prompt Template

**File:** `ADD_CONTINUE_ARTICLE_PROMPT.sql`

```sql
INSERT INTO ai_prompts (
  feature_name,
  prompt_name,
  prompt_template,
  system_prompt,
  available_variables,
  description
) VALUES (
  'generate_article',
  'continue_article',
  '{continuation_instruction}

⚠️ IMPORTANT RULES (MUST FOLLOW):
{continuation_rules}

{outline_reference}

Continue writing with multiple paragraphs per heading:',
  'You are a professional SEO content writer continuing an article. Follow the writing style and format of the previous content.',
  '["continuation_instruction", "continuation_rules", "outline_reference", "writing_style", "min_words", "max_words", "h2_paragraphs", "h3_paragraphs", "paragraph_words"]',
  'Prompt template for continuing article generation when outline is incomplete or article was cut off'
);
```

**Available Variables:**
- `{continuation_instruction}` - Instruction chính cho continuation (complete section, write missing sections, etc.)
- `{continuation_rules}` - Các rules cụ thể phải follow
- `{outline_reference}` - Reference đến full outline
- `{writing_style}` - Phong cách viết (từ lengthConfig)
- `{min_words}` - Minimum word count target
- `{max_words}` - Maximum word count target
- `{h2_paragraphs}` - Số paragraphs tối thiểu cho mỗi H2
- `{h3_paragraphs}` - Số paragraphs tối thiểu cho mỗi H3
- `{paragraph_words}` - Số words tối thiểu cho mỗi paragraph

### 2. Code Changes

**File:** `server/routes/ai.ts`

**TRƯỚC ĐÂY** (Hardcoded prompts):
```typescript
attemptCount++;

// Build detailed continuation prompt
let continuationPrompt = ``;

if (outlineToCheck) {
  // ... hardcoded logic to build continuation prompt
  continuationPrompt = `⚠️ CRITICAL INSTRUCTION - Complete the current section...
  
⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

... hardcoded rules ...`;
}
```

**BÂY GIỜ** (Database prompts với fallback):
```typescript
attemptCount++;

// ========== Load continuation prompt from database ==========
const continuePromptTemplate = await loadPrompt('continue_article');

// Build continuation components
let continuationInstruction = '';
let continuationRules = '';
let outlineReference = '';

// ... logic xây dựng các components dựa trên outline status ...

// Use database prompt if available, otherwise fallback
if (continuePromptTemplate) {
  console.log('✅ Using database prompt for continue_article');
  continuationPrompt = interpolatePrompt(continuePromptTemplate.prompt_template, {
    continuation_instruction: continuationInstruction,
    continuation_rules: continuationRules,
    outline_reference: outlineReference,
    writing_style: lengthConfig.writingStyle,
    min_words: lengthConfig.minWords.toString(),
    max_words: lengthConfig.maxWords.toString(),
    h2_paragraphs: actualH2Paragraphs.toString(),
    h3_paragraphs: actualH3Paragraphs.toString(),
    paragraph_words: lengthConfig.paragraphWords.toString(),
  });
} else {
  console.log('⚠️ Database prompt not found for continue_article, using fallback');
  continuationPrompt = `${continuationInstruction}

⚠️ IMPORTANT RULES (MUST FOLLOW):
${continuationRules}

${outlineReference}`;
}
```

### 3. Continuation Logic Scenarios

Code xử lý **3 trường hợp** khi cần continuation:

#### Scenario 1: Last Section Incomplete
Section cuối bị cắt ngang giữa chừng (chưa đủ số paragraphs).

```typescript
continuationInstruction = `⚠️ CRITICAL INSTRUCTION - Complete the current section that was cut off:

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

CURRENT SECTION (INCOMPLETE):
"${lastSectionName}"`;

continuationRules = `1. FIRST: Complete the section "${lastSectionName}" that was cut off in the middle
2. The article ended mid-section - continue writing from where it stopped
3. DO NOT start a new section or repeat existing content
...`;
```

#### Scenario 2: Missing Sections
Có sections trong outline chưa được viết.

```typescript
continuationInstruction = `⚠️ CRITICAL INSTRUCTION - Continue writing the article:

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

MISSING H2 SECTIONS:
- Section 1
- Section 2

MISSING H3 SECTIONS:
- Subsection 1
...`;

continuationRules = `1. Write the missing sections listed above
2. DO NOT repeat any content that was already written
...`;
```

#### Scenario 3: Need More Length
Outline hoàn thành nhưng chưa đủ độ dài yêu cầu.

```typescript
continuationInstruction = `Continue writing the article to reach the required length of ${lengthConfig.minWords}-${lengthConfig.maxWords} words.

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}`;

continuationRules = `- Each <h2>: ${actualH2Paragraphs} paragraphs minimum
- Each <h3>: ${actualH3Paragraphs} paragraphs minimum
- Add more detail and depth WITHOUT repeating content already written`;
```

---

## 📊 Benefits

### Trước Khi Refactor
❌ Hardcoded prompts khó maintain  
❌ Phải sửa code mỗi khi muốn thay đổi continuation logic  
❌ Không nhất quán với strategy database prompts  
❌ Không thể A/B test continuation prompts  

### Sau Khi Refactor
✅ Centralized prompt management trong database  
✅ Dễ dàng update continuation prompts qua Admin UI  
✅ Consistent với toàn bộ hệ thống prompts  
✅ Có thể A/B test và optimize prompts  
✅ Vẫn có fallback nếu database prompt chưa có  

---

## 🚀 Deployment Steps

### Step 1: Update Database
```bash
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_CONTINUE_ARTICLE_PROMPT.sql
```

### Step 2: Upload Server Build
```bash
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/api.volxai.com/
```

### Step 3: Restart Server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/api.volxai.com/.lsphp_restart.txt"
```

### Step 4: Verify
1. Tạo bài viết mới với outline dài (long article, many sections)
2. Theo dõi console logs xem có message "✅ Using database prompt for continue_article"
3. Kiểm tra xem continuation có hoạt động đúng không (complete missing sections)

---

## 🔍 Troubleshooting

### Nếu Continuation Không Hoạt Động
1. **Check database:** Verify prompt đã được insert vào `ai_prompts` table
   ```sql
   SELECT * FROM ai_prompts WHERE prompt_name = 'continue_article';
   ```

2. **Check console logs:** Xem có message nào về loading prompt không
   - ✅ "Using database prompt for continue_article" → OK
   - ⚠️ "Database prompt not found for continue_article, using fallback" → Database chưa có prompt

3. **Check variables:** Đảm bảo tất cả variables trong template đều có giá trị
   - Xem console log để debug values được pass vào `interpolatePrompt()`

### Nếu Continuation Viết Sai Format
1. **Check database prompt template:** Đảm bảo template có đầy đủ instructions về:
   - HTML structure requirements
   - Paragraph count requirements  
   - Writing style maintenance

2. **Update template nếu cần:** Có thể update trực tiếp trong database hoặc qua Admin UI

---

## 📝 Notes

- **Backward Compatible:** Code vẫn có fallback logic nếu database prompt chưa có
- **Flexible:** Có thể customize prompt template trong database mà không cần deploy code mới
- **Maintainable:** Tất cả prompts đều centralized trong database
- **Consistent:** Cùng strategy với các features khác (generate_article, generate_outline, etc.)

---

## ✅ Status

- [x] Create database prompt template SQL
- [x] Refactor continuation logic to use database prompts
- [x] Add fallback logic for backward compatibility
- [x] Test build successfully (280.05 kB server)
- [x] Documentation complete
- [ ] Deploy database update
- [ ] Deploy server build
- [ ] Test in production

---

## 📚 Related Documentation

- `AI_PROMPTS_DATABASE_INTEGRATION_COMPLETE.md` - Overview of database prompts system
- `AI_PROMPTS_MIGRATION_SUMMARY.md` - Migration from hardcoded to database prompts
- `ADD_CONTINUE_ARTICLE_PROMPT.sql` - Database migration file
- `server/routes/ai.ts` - Implementation code (lines ~2155-2300)
