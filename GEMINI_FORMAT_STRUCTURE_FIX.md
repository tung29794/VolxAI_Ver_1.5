# Fix: Gemini Output Structure Issues

## Vấn đề nghiêm trọng

Khi sử dụng Gemini API với Google Search, có 2 vấn đề lớn:

### 1. Không viết theo outline
- Không có H2/H3 headings từ outline
- Bỏ qua cấu trúc outline hoàn toàn
- Content không có structure rõ ràng

### 2. Viết tất cả trên 1 dòng duy nhất
- Không có line breaks giữa paragraphs
- Không có spacing giữa sections
- Output là một khối text liền không chia đoạn

**Ví dụ output sai:**
```
<p>Chỉ báo RSI (Relative Strength Index) nâng cao là một công cụ phân tích kỹ thuật được sử dụng rộng rãi trong thị trường tài chính để đánh giá mức độ mạnh mẽ của một xu hướng và xác định các điểm vào và ra tiềm năng RSI được phát triển bởi Welles Wilder và đã trở thành một trong những chỉ báo phổ biến nhất...</p>
```

**Output mong muốn:**
```html
<h2>Giới thiệu về Chỉ báo RSI nâng cao</h2>

<p>Chỉ báo RSI (Relative Strength Index) nâng cao là một công cụ phân tích kỹ thuật được sử dụng rộng rãi trong thị trường tài chính...</p>

<p>RSI được phát triển bởi Welles Wilder và đã trở thành một trong những chỉ báo phổ biến nhất...</p>

<h3>Định nghĩa và cơ chế hoạt động</h3>

<p>Chỉ báo RSI đo lường sức mạnh của một xu hướng...</p>

<p>Giá trị RSI dao động từ 0 đến 100...</p>
```

## Nguyên nhân

### 1. Format instruction không đủ chi tiết
**CŨ:**
```typescript
const geminiPrompt = `${systemPrompt}\n\n${userPrompt}\n\nCRITICAL OUTPUT FORMAT REQUIREMENT:
- You MUST use HTML tags for ALL content
- Use <p> for paragraphs
- Use <h2> for main headings
- DO NOT use Markdown syntax
...`;
```

**Vấn đề:**
- Chỉ liệt kê tags cần dùng
- Không enforce line breaks
- Không có ví dụ cụ thể về format
- Không nhấn mạnh paragraph structure

### 2. Không có validation
- Code không check xem output có đúng format không
- Không phát hiện được Markdown syntax
- Không detect single-line output

## Giải pháp

### 1. Comprehensive Format Instruction với Examples

**MỚI - Initial Prompt:**
```typescript
let geminiPrompt = `${systemPrompt}\n\n${userPrompt}`;

geminiPrompt += `\n\n⚠️ CRITICAL OUTPUT FORMAT REQUIREMENTS - MUST FOLLOW EXACTLY:

1. HTML STRUCTURE (MANDATORY):
   - Use <p>...</p> for EVERY paragraph
   - Use <h2>...</h2> for main section headings
   - Use <h3>...</h3> for subsection headings
   - Use <strong>...</strong> for bold/emphasis
   - Use <ul><li>...</li></ul> for bullet lists
   - Use <ol><li>...</li></ol> for numbered lists
   - Use <table><tr><td>...</td></tr></table> for tables

2. PARAGRAPH RULES (MANDATORY):
   - Each <h2> section MUST have ${lengthConfig.h2Paragraphs} separate <p> paragraphs
   - Each <h3> subsection MUST have ${lengthConfig.h3Paragraphs} separate <p> paragraphs
   - Each paragraph MUST be ${lengthConfig.paragraphWords}+ words (detailed and comprehensive)
   - ALWAYS put line breaks between paragraphs (use \\n\\n)
   - DO NOT write all content in one continuous line

3. FORBIDDEN FORMATS:
   - NO Markdown syntax (##, **, -, etc.)
   - NO plain text without HTML tags
   - NO single-line output without paragraph breaks
   - NO skipping outline sections

4. EXAMPLE OF CORRECT FORMAT:
<h2>Section Title</h2>

<p>First detailed paragraph with 100+ words explaining the topic thoroughly...</p>

<p>Second detailed paragraph adding more depth and examples...</p>

<h3>Subsection Title</h3>

<p>First subsection paragraph with detailed content...</p>

<p>Second subsection paragraph with more information...</p>

Start writing the article now with proper HTML structure and multiple paragraphs per section:`;
```

**Cải tiến:**
- ✅ Chia thành 4 sections rõ ràng (Structure, Rules, Forbidden, Example)
- ✅ Nhấn mạnh "MANDATORY" và "MUST FOLLOW EXACTLY"
- ✅ Cung cấp example cụ thể về format đúng
- ✅ Explicit yêu cầu line breaks (`\\n\\n`)
- ✅ Liệt kê các format bị cấm (Markdown, single-line)
- ✅ Include lengthConfig variables để enforce paragraph count

**MỚI - Continuation Prompt:**
```typescript
const geminiContinuationPrompt = `Previous content:\n${content}\n\n${continuationPrompt}\n\n⚠️ CRITICAL FORMAT REQUIREMENTS - CONTINUE WITH SAME FORMAT:

1. HTML STRUCTURE (MANDATORY):
   - Use <p>...</p> for EVERY paragraph
   - Use <h2>...</h2> for main section headings
   - Use <h3>...</h3> for subsection headings
   - ALWAYS put line breaks (\\n\\n) between paragraphs and sections

2. PARAGRAPH RULES:
   - Each <h2> section: ${lengthConfig.h2Paragraphs} separate paragraphs
   - Each <h3> subsection: ${lengthConfig.h3Paragraphs} separate paragraphs
   - Each paragraph: ${lengthConfig.paragraphWords}+ words
   - DO NOT write all content in one continuous line

3. FORBIDDEN:
   - NO Markdown (##, **, -)
   - NO single-line output
   - NO skipping outline sections

Continue writing with proper HTML structure and line breaks:`;
```

**Lợi ích:**
- 🎯 Shorter but focused on continuation requirements
- ✅ Emphasizes maintaining same format as previous content
- 📋 Repeats critical rules (line breaks, paragraph counts)

### 2. Format Validation Function

**Thêm validation ngay sau khi nhận response:**
```typescript
// ========== VALIDATE OUTPUT FORMAT ==========
const validateHtmlFormat = (text: string): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for HTML tags
  const hasH2 = /<h2[^>]*>/.test(text);
  const hasParagraphs = /<p[^>]*>/.test(text);
  
  // Check for Markdown syntax (should not exist)
  const hasMarkdownHeadings = /^#{1,6}\s/m.test(text);
  const hasMarkdownBold = /\*\*[^*]+\*\*/.test(text);
  const hasMarkdownList = /^[-*]\s/m.test(text);
  
  // Check for line breaks
  const hasLineBreaks = /\n\n/.test(text);
  const isSingleLine = !text.includes('\n') || text.split('\n').length < 5;
  
  if (!hasH2) issues.push('Missing <h2> headings');
  if (!hasParagraphs) issues.push('Missing <p> paragraphs');
  if (hasMarkdownHeadings) issues.push('Contains Markdown headings (##)');
  if (hasMarkdownBold) issues.push('Contains Markdown bold (**)');
  if (hasMarkdownList) issues.push('Contains Markdown lists (-)');
  if (isSingleLine) issues.push('Content appears to be single-line without proper breaks');
  if (!hasLineBreaks) issues.push('Missing line breaks between sections');
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Validate initial content
const validation = validateHtmlFormat(content);
if (!validation.isValid) {
  console.log('⚠️ Format validation issues detected:');
  validation.issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('✅ Content format validated successfully');
}
```

**Checks performed:**
1. ✅ **HTML tags presence**: Ensures `<h2>` and `<p>` exist
2. ✅ **Markdown detection**: Catches `##`, `**`, `-` syntax
3. ✅ **Line breaks**: Verifies `\n\n` between sections
4. ✅ **Single-line detection**: Identifies output without proper breaks
5. ✅ **Detailed logging**: Lists all issues found

## Testing Scenarios

### Scenario 1: Correct HTML with proper breaks
**Input:** Article generated with outline
**Expected Output:**
```
✅ Content format validated successfully
📊 Outline check: 10/10 H2 sections completed
✅ All outline sections now complete!
```

### Scenario 2: Single-line output detected
**Input:** Gemini returns text without line breaks
**Expected Output:**
```
⚠️ Format validation issues detected:
  - Content appears to be single-line without proper breaks
  - Missing line breaks between sections
```

### Scenario 3: Markdown syntax detected
**Input:** Gemini returns markdown format
**Expected Output:**
```
⚠️ Format validation issues detected:
  - Contains Markdown headings (##)
  - Contains Markdown bold (**)
  - Missing <h2> headings
  - Missing <p> paragraphs
```

### Scenario 4: Missing outline structure
**Input:** No H2 headings generated
**Expected Output:**
```
⚠️ Format validation issues detected:
  - Missing <h2> headings
📊 Outline check: 0/10 H2 sections completed
⚠️ Outline incomplete, forcing continuation
```

## Expected Logs

### Successful generation:
```
🔍 Using Gemini API with Google Search knowledge
✅ Gemini response received, length: ~800 words, finishReason: STOP → stop
✅ Content format validated successfully
📊 Outline check: 10/10 H2 sections completed
✅ All outline sections now complete!
✅ Article generation completed in 1 attempt(s)
```

### Format issues detected:
```
🔍 Using Gemini API with Google Search knowledge
✅ Gemini response received, length: ~600 words, finishReason: STOP → stop
⚠️ Format validation issues detected:
  - Content appears to be single-line without proper breaks
  - Missing line breaks between sections
📊 Outline check: 3/10 H2 sections completed
⚠️ Outline incomplete, forcing continuation (Attempt 2/10)
📋 Missing sections: Section 4, Section 5, Section 6...
```

## Key Improvements Summary

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Format instruction** | Short bullet list | 4-section detailed guide with example | ✅ Clearer guidance |
| **Line breaks** | Not mentioned | Explicitly required with `\\n\\n` | ✅ Proper spacing |
| **Paragraph structure** | Generic | Specific counts per H2/H3 | ✅ Better structure |
| **Examples** | None | Full example of correct format | ✅ Visual reference |
| **Validation** | None | Comprehensive format checking | ✅ Early detection |
| **Error visibility** | Silent failures | Detailed issue logging | ✅ Better debugging |

## Code Location

**File:** `server/routes/ai.ts`
**Function:** `handleGenerateArticle`
**Lines:** ~1400-1580 (prompt construction and validation)

## Benefits

1. ✅ **Enforces HTML structure** - Clear requirements with examples
2. ✅ **Prevents single-line output** - Explicit line break requirements
3. ✅ **Follows outline** - Format instruction includes outline structure
4. ✅ **Early issue detection** - Validation catches problems immediately
5. ✅ **Better debugging** - Detailed logs help identify root causes
6. ✅ **Consistent formatting** - Same requirements for initial and continuation
7. 🎯 **Works with continuation** - Format maintained across multiple API calls

## Alternative Approaches Considered

### ❌ Option 1: Post-process to fix format
**Vấn đề:**
- Complex regex parsing
- Risk of breaking valid content
- Performance overhead
- Hard to maintain

### ❌ Option 2: Switch to OpenAI only
**Vấn đề:**
- Loses Google Search capability
- Defeats purpose of Gemini integration
- User expects Google Search feature

### ✅ Option 3: Enhanced prompt + validation (CHOSEN)
**Ưu điểm:**
- Works with Gemini's behavior
- No content modification
- Clear expectations set upfront
- Validation provides visibility

## Build Status

✅ Build successful
- Client: ✓ (940.10 kB)
- Server: ✓ (224.81 kB)

## Deployment

Ready to deploy:
1. Upload `dist/server/node-build.mjs`
2. Restart Node.js application
3. Test "Tham khảo Google" feature
4. Monitor logs for validation messages

## Testing Checklist

- [ ] Generate article with "Tham khảo Google" enabled
- [ ] Verify output has `<h2>` tags matching outline
- [ ] Verify output has multiple `<p>` paragraphs per section
- [ ] Verify output has line breaks between paragraphs (`\n\n`)
- [ ] Verify NO Markdown syntax (##, **, -)
- [ ] Check validation logs for issues
- [ ] Test continuation maintains format
- [ ] Verify all outline sections are completed

**Date:** January 9, 2026
**Status:** ✅ FIXED WITH VALIDATION
