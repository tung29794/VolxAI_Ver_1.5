# 📝 Continue Article Prompt - Enhanced Version

**Date:** January 13, 2026  
**Feature:** `continue_article` prompt update  
**Status:** ✅ READY FOR DEPLOYMENT

---

## 🎯 Purpose

Update the article continuation prompt to support:
- ✅ More granular control over content structure
- ✅ HTML table support (not Markdown)
- ✅ Detailed writing style instructions
- ✅ Precise paragraph count per section
- ✅ Word count guidelines

---

## 📋 Available Variables

```json
[
  "continuation_instruction",  // What needs to be continued
  "continuation_rules",         // Rules for continuation
  "outline_reference",          // Full outline for reference
  "writing_style",              // How to write
  "min_words",                  // Minimum total words
  "max_words",                  // Maximum total words
  "h2_paragraphs",             // Paragraphs per H2 section
  "h3_paragraphs",             // Paragraphs per H3 section
  "paragraph_words"            // Words per paragraph
]
```

---

## 🔧 Key Features

### 1. HTML Format Enforcement

**Problem:** AI sometimes outputs Markdown instead of HTML

**Solution:** Explicit HTML format examples and rules

```html
<!-- Headings -->
<h2>Main Section Title</h2>
<h3>Subsection Title</h3>

<!-- Paragraphs -->
<p>Regular paragraph content...</p>

<!-- Text formatting -->
<strong>Bold text</strong>
<em>Italic text</em>

<!-- Lists -->
<ul>
  <li>Unordered item 1</li>
  <li>Unordered item 2</li>
</ul>

<ol>
  <li>Ordered item 1</li>
  <li>Ordered item 2</li>
</ol>

<!-- Tables -->
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

### 2. Table Support

**Before:** No table formatting guidance → AI uses Markdown tables

**After:** Explicit HTML table structure with examples

**HTML Table Structure:**
```html
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Row 1, Col 1</td>
      <td>Row 1, Col 2</td>
      <td>Row 1, Col 3</td>
    </tr>
    <tr>
      <td>Row 2, Col 1</td>
      <td>Row 2, Col 2</td>
      <td>Row 2, Col 3</td>
    </tr>
  </tbody>
</table>
```

**Use Cases:**
- Comparison tables (Product A vs B)
- Pricing tables
- Feature lists
- Technical specifications
- Statistics/data

### 3. Granular Structure Control

**H2 Section Structure:**
```
<h2>Section Title</h2>
<p>Paragraph 1 (80+ words)...</p>
<p>Paragraph 2 (80+ words)...</p>
<p>Paragraph 3 (80+ words)...</p>  // If h2_paragraphs = 3
```

**H3 Section Structure:**
```
<h3>Subsection Title</h3>
<p>Paragraph 1 (80+ words)...</p>
<p>Paragraph 2 (80+ words)...</p>  // If h3_paragraphs = 2
```

### 4. Writing Style Guidance

**Variable:** `{writing_style}`

**Examples:**
```
"Detailed, informative, engaging. Use examples and explanations."
"Concise and professional. Focus on key points."
"Conversational and friendly. Use analogies and stories."
"Technical and precise. Include specifications and data."
```

### 5. Word Count Control

**Total Length:**
- `{min_words}` = Minimum total words for continuation
- `{max_words}` = Maximum total words for continuation

**Paragraph Length:**
- `{paragraph_words}` = Minimum words per paragraph (e.g., 80)

---

## 📊 Prompt Structure

### System Prompt

**Purpose:** Set AI's role and global rules

**Key Points:**
- ✅ Professional SEO content writer
- ✅ Continue seamlessly (no repetition)
- ✅ Follow outline precisely
- ✅ HTML format only
- ✅ Include table formatting rules

### User Prompt

**Purpose:** Specific continuation instructions

**Sections:**
1. **Continuation Instruction** - What to write next
2. **Continuation Rules** - Specific requirements
3. **Outline Reference** - Full structure
4. **Writing Style** - How to write
5. **Length Requirements** - Word/paragraph counts
6. **HTML Format Guide** - Examples
7. **Table Format** - HTML table structure
8. **Critical Rules** - Must-follow checklist

---

## 🧪 Usage Example

### Backend Code

```typescript
const continuePromptTemplate = await loadPrompt('continue_article');

const continuationPrompt = interpolatePrompt(continuePromptTemplate.prompt_template, {
  continuation_instruction: `Continue writing from where it was cut off.
Current section: <h2>Benefits of SEO</h2>
Next sections to complete:
- <h2>SEO Best Practices</h2>
- <h2>Common SEO Mistakes</h2>
- <h2>Conclusion</h2>`,
  
  continuation_rules: `CRITICAL RULES:
1. Do NOT repeat the content already written
2. Start EXACTLY where it was cut off
3. Complete ALL remaining outline sections
4. Follow the writing style consistently
5. Use HTML tags only (no Markdown)`,
  
  outline_reference: `[intro] Introduction to SEO
[h2] What is SEO?
[h3] On-Page SEO
[h3] Off-Page SEO
[h2] Benefits of SEO  ← CURRENTLY HERE
[h3] Increased Traffic
[h3] Better User Experience
[h2] SEO Best Practices  ← NEED TO WRITE
[h3] Keyword Research
[h3] Content Optimization
[h2] Common SEO Mistakes  ← NEED TO WRITE
[h2] Conclusion  ← NEED TO WRITE`,
  
  writing_style: `Write in a professional yet accessible tone. 
Use real-world examples and analogies. 
Explain technical concepts in simple terms. 
Include actionable tips and best practices.
Make it engaging and informative.`,
  
  min_words: "1500",
  max_words: "2500",
  h2_paragraphs: "3",
  h3_paragraphs: "2",
  paragraph_words: "80"
});

const systemPrompt = interpolatePrompt(continuePromptTemplate.system_prompt, {
  writing_style: "Professional, engaging, informative",
  h2_paragraphs: "3",
  h3_paragraphs: "2",
  paragraph_words: "80"
});
```

---

## 📝 Before/After Comparison

### Before (Old Prompt)

**Problems:**
- ❌ Vague continuation instructions
- ❌ No table format guidance → Markdown tables
- ❌ No paragraph count control
- ❌ Weak HTML format enforcement

**Example Output:**
```markdown
## Next Section

Here's a comparison:

| Feature | Plan A | Plan B |
|---------|--------|--------|
| Price   | $10    | $20    |

❌ Markdown table, not HTML!
```

### After (New Prompt)

**Improvements:**
- ✅ Detailed continuation instructions
- ✅ Explicit HTML table examples
- ✅ Precise paragraph counts per section
- ✅ Strong HTML format rules

**Example Output:**
```html
<h2>Next Section</h2>

<p>Here's a comprehensive comparison of the two plans...</p>

<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Plan A</th>
      <th>Plan B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Price</td>
      <td>$10</td>
      <td>$20</td>
    </tr>
  </tbody>
</table>

✅ Proper HTML table!
```

---

## 🚀 Deployment

### 1. Run SQL Update

```bash
# Connect to database and run:
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < UPDATE_CONTINUE_ARTICLE_PROMPT.sql

# Or via phpMyAdmin:
# Copy-paste SQL statements
```

### 2. Verify Update

```sql
SELECT 
  feature_name,
  available_variables,
  SUBSTRING(prompt_template, 1, 300) as preview
FROM ai_prompts
WHERE feature_name = 'continue_article';
```

**Check for:**
- ✅ `available_variables` has all 9 variables
- ✅ `prompt_template` contains `<table>` examples
- ✅ `system_prompt` mentions HTML format

### 3. No Code Changes Needed

The backend already uses `loadPrompt()` and `interpolatePrompt()`:
```typescript
const continuePromptTemplate = await loadPrompt('continue_article');
// ✅ Automatically loads new prompt from database
```

### 4. Test

Generate a long article that requires continuation:
- ✅ Check continuation follows outline
- ✅ Check no content repetition
- ✅ Check HTML format (no Markdown)
- ✅ Check tables use `<table>` tags
- ✅ Check paragraph counts match settings

---

## 🎯 Expected Results

### Article Continuation Should:

1. **Start Correctly**
   - ✅ Continues exactly where cut off
   - ✅ No repeated content
   - ✅ Smooth transition

2. **Follow Structure**
   - ✅ Completes remaining outline sections
   - ✅ H2 sections have 3 paragraphs (configurable)
   - ✅ H3 sections have 2 paragraphs (configurable)

3. **Use Proper HTML**
   - ✅ Headings: `<h2>`, `<h3>`
   - ✅ Paragraphs: `<p>`
   - ✅ Lists: `<ul>`, `<ol>`, `<li>`
   - ✅ Tables: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
   - ❌ NO Markdown syntax

4. **Meet Length Requirements**
   - ✅ Total words between min/max
   - ✅ Each paragraph 80+ words
   - ✅ Comprehensive content

---

## 📊 Variable Usage Matrix

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `continuation_instruction` | User Prompt | What to continue | "Continue from H2: Benefits" |
| `continuation_rules` | User Prompt | Specific requirements | "Do NOT repeat content" |
| `outline_reference` | User Prompt | Structure guide | Full outline text |
| `writing_style` | Both | Writing approach | "Detailed, engaging" |
| `min_words` | User Prompt | Minimum length | "1500" |
| `max_words` | User Prompt | Maximum length | "2500" |
| `h2_paragraphs` | Both | Paragraphs per H2 | "3" |
| `h3_paragraphs` | Both | Paragraphs per H3 | "2" |
| `paragraph_words` | Both | Words per paragraph | "80" |

---

## 🔗 Related Files

- `UPDATE_CONTINUE_ARTICLE_PROMPT.sql` - SQL update script
- `server/routes/ai.ts` - Backend usage (already compatible)
- `CONTINUE_ARTICLE_PROMPT_GUIDE.md` - This documentation

---

## 📝 Summary

**What Changed:**
- ✅ Added 9 comprehensive variables
- ✅ Added HTML table format examples
- ✅ Added granular paragraph control
- ✅ Enhanced HTML format enforcement

**Benefits:**
- ✅ Better article continuation quality
- ✅ Proper HTML tables (not Markdown)
- ✅ Consistent paragraph structure
- ✅ More control over output

**Migration:**
- ✅ Database update only
- ✅ No code changes needed
- ✅ Backward compatible

---

**Status:** ✅ Ready for deployment  
**SQL File:** `UPDATE_CONTINUE_ARTICLE_PROMPT.sql`  
**Next Step:** Run SQL update, test article continuation

