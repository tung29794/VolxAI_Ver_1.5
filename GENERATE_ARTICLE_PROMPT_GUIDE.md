# Generate Article Prompt - Complete Guide

## 📋 Overview

Updated prompt for `generate_article` feature (AI viết bài theo từ khóa) với logic số đoạn văn linh hoạt theo loại dàn ý.

**Date**: 2026-01-13  
**Feature**: `generate_article`  
**Purpose**: Viết bài mới từ từ khóa với kiểm soát số đoạn văn theo dàn ý

---

## 🎯 Paragraph Count Logic

### **NO OUTLINE Mode** (Không có dàn ý)
Số đoạn văn phụ thuộc vào độ dài bài viết:

| Length | Paragraphs per Heading | Description |
|--------|----------------------|-------------|
| **Short** | 1 paragraph | Mỗi heading viết 1 đoạn |
| **Medium** | 2 paragraphs | Mỗi heading viết 2 đoạn |
| **Long** | 3 paragraphs | Mỗi heading viết 3 đoạn |

### **YOUR OUTLINE & AI OUTLINE Mode** (Có dàn ý)
Luôn cố định:

| Outline Type | Paragraphs per Heading | Description |
|-------------|----------------------|-------------|
| **Your Outline** | 2 paragraphs | Như Medium, cố định 2 đoạn |
| **AI Outline** | 2 paragraphs | Như Medium, cố định 2 đoạn |

---

## 📝 Available Variables

### Core Variables
```json
[
  "keyword",              // Từ khóa chính
  "language",            // Ngôn ngữ (Vietnamese, English, etc.)
  "tone",                // Phong cách viết
  "length_instruction",  // Mô tả độ dài bài viết
  "outline_instruction", // Cấu trúc dàn ý
  "writing_style",       // Hướng dẫn phong cách chi tiết
  "min_words",           // Số từ tối thiểu
  "max_words",           // Số từ tối đa
  "paragraphs_per_heading", // Số đoạn mỗi heading (1, 2, hoặc 3)
  "paragraph_words",     // Số từ mỗi đoạn
  "outline_mode"         // Logic đoạn văn (chi tiết bên dưới)
]
```

### `outline_mode` Variable - CRITICAL

Biến này điều khiển logic số đoạn văn. Backend cần truyền text mô tả chi tiết:

#### **For NO OUTLINE (Short)**
```typescript
outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 1 paragraph for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 1 paragraph
- Each H3 heading: 1 paragraph  
- Each paragraph: {paragraph_words}+ words minimum

This is SHORT length mode - keep content concise but informative.`
```

#### **For NO OUTLINE (Medium)**
```typescript
outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

This is MEDIUM length mode - balanced depth and breadth.`
```

#### **For NO OUTLINE (Long)**
```typescript
outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 3 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 3 paragraphs
- Each H3 heading: 3 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

This is LONG length mode - comprehensive, detailed coverage.`
```

#### **For YOUR OUTLINE or AI OUTLINE**
```typescript
outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

Follow the provided outline structure exactly.`
```

### `paragraphs_per_heading` Variable

Số đoạn văn cố định cho mỗi heading (dùng trong prompt template):

```typescript
// NO OUTLINE
if (length === 'short') {
  paragraphs_per_heading = "1";
} else if (length === 'medium') {
  paragraphs_per_heading = "2";
} else if (length === 'long') {
  paragraphs_per_heading = "3";
}

// YOUR OUTLINE or AI OUTLINE
paragraphs_per_heading = "2"; // Always 2
```

---

## 💻 Backend Usage Example

### Example 1: No Outline - Short Length

```typescript
const articlePromptTemplate = await loadPrompt('generate_article');

const variables = {
  keyword: "cách nấu phở bò",
  language: "Vietnamese",
  tone: "Friendly and informative",
  length_instruction: "Write a short article of 800-1200 words",
  outline_instruction: `[intro] Introduction to beef pho
[h2] Nguyên liệu cần chuẩn bị
[h3] Nguyên liệu phần nước dùng
[h3] Nguyên liệu phần gia vị
[h2] Cách nấu nước dùng phở
[h2] Cách làm phở hoàn chỉnh
[h2] Mẹo nấu phở ngon
[conclusion] Kết luận`,
  writing_style: "Write in a warm, friendly tone. Use simple Vietnamese. Include practical cooking tips.",
  min_words: "800",
  max_words: "1200",
  paragraphs_per_heading: "1", // SHORT = 1 paragraph per heading
  paragraph_words: "80",
  outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 1 paragraph for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 1 paragraph
- Each H3 heading: 1 paragraph  
- Each paragraph: 80+ words minimum

This is SHORT length mode - keep content concise but informative.`
};

const systemPrompt = interpolatePrompt(articlePromptTemplate.system_prompt, variables);
const userPrompt = interpolatePrompt(articlePromptTemplate.prompt_template, variables);
```

**Expected Output Structure:**
```html
<p>Introduction about beef pho (80+ words)...</p>

<h2>Nguyên liệu cần chuẩn bị</h2>
<p>One detailed paragraph (80+ words)...</p>

<h3>Nguyên liệu phần nước dùng</h3>
<p>One detailed paragraph (80+ words)...</p>

<h3>Nguyên liệu phần gia vị</h3>
<p>One detailed paragraph (80+ words)...</p>

<h2>Cách nấu nước dùng phở</h2>
<p>One detailed paragraph (80+ words)...</p>

<h2>Cách làm phở hoàn chỉnh</h2>
<p>One detailed paragraph (80+ words)...</p>

<h2>Mẹo nấu phở ngon</h2>
<p>One detailed paragraph (80+ words)...</p>

<h2>Kết luận</h2>
<p>Conclusion paragraph 1 (80+ words)...</p>
<p>Conclusion paragraph 2 (80+ words)...</p>
```

---

### Example 2: No Outline - Medium Length

```typescript
const variables = {
  keyword: "cách nấu phở bò",
  language: "Vietnamese",
  tone: "Professional and engaging",
  length_instruction: "Write a medium article of 1500-2000 words",
  outline_instruction: `[intro] Introduction to beef pho
[h2] Nguyên liệu cần chuẩn bị
[h3] Nguyên liệu phần nước dùng
[h3] Nguyên liệu phần gia vị
[h2] Cách nấu nước dùng phở
[h2] Cách làm phở hoàn chỉnh
[h2] Mẹo nấu phở ngon
[conclusion] Kết luận`,
  writing_style: "Detailed, informative, with practical examples",
  min_words: "1500",
  max_words: "2000",
  paragraphs_per_heading: "2", // MEDIUM = 2 paragraphs per heading
  paragraph_words: "80",
  outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: 80+ words minimum

This is MEDIUM length mode - balanced depth and breadth.`
};
```

**Expected Output Structure:**
```html
<p>Introduction paragraph (80+ words)...</p>

<h2>Nguyên liệu cần chuẩn bị</h2>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<h3>Nguyên liệu phần nước dùng</h3>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<h3>Nguyên liệu phần gia vị</h3>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<!-- Continue pattern with 2 paragraphs per heading -->
```

---

### Example 3: No Outline - Long Length

```typescript
const variables = {
  keyword: "cách nấu phở bò",
  language: "Vietnamese",
  tone: "Expert and comprehensive",
  length_instruction: "Write a long, comprehensive article of 2500-3500 words",
  outline_instruction: `[intro] Introduction to beef pho
[h2] Nguyên liệu cần chuẩn bị
[h3] Nguyên liệu phần nước dùng
[h3] Nguyên liệu phần gia vị
[h2] Cách nấu nước dùng phở
[h2] Cách làm phở hoàn chỉnh
[h2] Mẹo nấu phở ngon
[conclusion] Kết luận`,
  writing_style: "Very detailed with step-by-step instructions and expert tips",
  min_words: "2500",
  max_words: "3500",
  paragraphs_per_heading: "3", // LONG = 3 paragraphs per heading
  paragraph_words: "80",
  outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 3 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 3 paragraphs
- Each H3 heading: 3 paragraphs
- Each paragraph: 80+ words minimum

This is LONG length mode - comprehensive, detailed coverage.`
};
```

**Expected Output Structure:**
```html
<p>Introduction paragraph (80+ words)...</p>

<h2>Nguyên liệu cần chuẩn bị</h2>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>
<p>Third paragraph (80+ words)...</p>

<h3>Nguyên liệu phần nước dùng</h3>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>
<p>Third paragraph (80+ words)...</p>

<!-- Continue pattern with 3 paragraphs per heading -->
```

---

### Example 4: Your Outline or AI Outline

```typescript
const variables = {
  keyword: "digital marketing strategies 2026",
  language: "English",
  tone: "Professional and authoritative",
  length_instruction: "Write a comprehensive article of 2000-2500 words",
  outline_instruction: `[intro] Introduction to digital marketing in 2026
[h2] Content Marketing Trends
[h3] Video Content Dominance
[h3] AI-Generated Content
[h2] Social Media Marketing
[h3] Short-Form Video Platforms
[h3] Community Building
[h2] SEO Best Practices
[h3] User Intent Optimization
[h3] Technical SEO
[conclusion] Conclusion`,
  writing_style: "Professional, data-driven, with industry examples and statistics",
  min_words: "2000",
  max_words: "2500",
  paragraphs_per_heading: "2", // WITH OUTLINE = Always 2 paragraphs
  paragraph_words: "80",
  outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: 80+ words minimum

Follow the provided outline structure exactly.`
};
```

**Expected Output Structure:**
```html
<p>Introduction to digital marketing (80+ words)...</p>

<h2>Content Marketing Trends</h2>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<h3>Video Content Dominance</h3>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<h3>AI-Generated Content</h3>
<p>First paragraph (80+ words)...</p>
<p>Second paragraph (80+ words)...</p>

<!-- All headings have exactly 2 paragraphs -->
```

---

## 🔧 Backend Implementation Guide

### Step 1: Determine Outline Mode

```typescript
function determineOutlineMode(
  outlineType: 'no_outline' | 'your_outline' | 'ai_outline',
  length: 'short' | 'medium' | 'long'
): { paragraphs_per_heading: string; outline_mode: string } {
  
  // WITH OUTLINE: Always 2 paragraphs
  if (outlineType === 'your_outline' || outlineType === 'ai_outline') {
    return {
      paragraphs_per_heading: "2",
      outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

Follow the provided outline structure exactly.`
    };
  }
  
  // NO OUTLINE: Depends on length
  switch (length) {
    case 'short':
      return {
        paragraphs_per_heading: "1",
        outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 1 paragraph for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 1 paragraph
- Each H3 heading: 1 paragraph  
- Each paragraph: {paragraph_words}+ words minimum

This is SHORT length mode - keep content concise but informative.`
      };
      
    case 'medium':
      return {
        paragraphs_per_heading: "2",
        outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 2 paragraphs
- Each H3 heading: 2 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

This is MEDIUM length mode - balanced depth and breadth.`
      };
      
    case 'long':
      return {
        paragraphs_per_heading: "3",
        outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 3 paragraphs for each heading (H2 or H3).

STRUCTURE:
- Each H2 heading: 3 paragraphs
- Each H3 heading: 3 paragraphs
- Each paragraph: {paragraph_words}+ words minimum

This is LONG length mode - comprehensive, detailed coverage.`
      };
      
    default:
      return {
        paragraphs_per_heading: "2",
        outline_mode: `🔢 PARAGRAPH COUNT RULE:
Write exactly 2 paragraphs for each heading (H2 or H3).`
      };
  }
}
```

### Step 2: Build Prompt Variables

```typescript
// Example trong route handler
router.post('/generate-article', async (req, res) => {
  const { keyword, language, tone, length, outlineType, outline, writingStyle } = req.body;
  
  // Determine paragraph logic
  const { paragraphs_per_heading, outline_mode } = determineOutlineMode(
    outlineType, // 'no_outline' | 'your_outline' | 'ai_outline'
    length       // 'short' | 'medium' | 'long'
  );
  
  // Load prompt template
  const articlePromptTemplate = await loadPrompt('generate_article');
  
  // Build variables
  const variables = {
    keyword,
    language: language || 'Vietnamese',
    tone: tone || 'Professional',
    length_instruction: getLengthInstruction(length),
    outline_instruction: outline,
    writing_style: writingStyle || 'Detailed and informative',
    min_words: getMinWords(length),
    max_words: getMaxWords(length),
    paragraphs_per_heading,  // "1", "2", or "3"
    paragraph_words: "80",
    outline_mode              // Detailed text description
  };
  
  // Interpolate prompts
  const systemPrompt = interpolatePrompt(articlePromptTemplate.system_prompt, variables);
  const userPrompt = interpolatePrompt(articlePromptTemplate.prompt_template, variables);
  
  // Generate article...
});
```

---

## 📊 Paragraph Count Summary Table

| Outline Type | Length | Paragraphs per Heading | Notes |
|-------------|--------|----------------------|-------|
| **No Outline** | Short | 1 | Concise, focused content |
| **No Outline** | Medium | 2 | Balanced depth |
| **No Outline** | Long | 3 | Comprehensive coverage |
| **Your Outline** | Any | 2 | Fixed, like Medium |
| **AI Outline** | Any | 2 | Fixed, like Medium |

---

## 🚀 Deployment Instructions

### Step 1: Update Database

```bash
# Connect to database and run the SQL script
mysql -u username -p database_name < UPDATE_GENERATE_ARTICLE_PROMPT.sql
```

Or via phpMyAdmin:
1. Open phpMyAdmin
2. Select database `jybcaorr_lisacontentdbapi`
3. Go to SQL tab
4. Paste content from `UPDATE_GENERATE_ARTICLE_PROMPT.sql`
5. Click "Go"

### Step 2: Update Backend Code

Add the `determineOutlineMode()` function to your backend route handler (như ví dụ ở Step 2 trên).

### Step 3: Verify

Run verification queries from SQL script:

```sql
SELECT feature_name, available_variables 
FROM ai_prompts 
WHERE feature_name = 'generate_article';
```

Should show all 11 variables including `paragraphs_per_heading` and `outline_mode`.

### Step 4: Test

Test với các trường hợp:
1. ✅ No Outline - Short (expect 1 paragraph per heading)
2. ✅ No Outline - Medium (expect 2 paragraphs per heading)
3. ✅ No Outline - Long (expect 3 paragraphs per heading)
4. ✅ Your Outline (expect 2 paragraphs per heading)
5. ✅ AI Outline (expect 2 paragraphs per heading)

---

## ✅ Expected Results

### Quality Checklist

After generation, articles should have:

- ✅ Introduction: 1-2 paragraphs (no heading)
- ✅ Each H2/H3: Exactly specified number of paragraphs (1, 2, or 3)
- ✅ Each paragraph: 80+ words minimum
- ✅ HTML format only (no Markdown)
- ✅ Tables use `<table>` tags if present
- ✅ No code fences around content
- ✅ Proper semantic structure
- ✅ Natural keyword usage
- ✅ Engaging, informative content

---

## 🎯 Key Features

1. **Flexible Paragraph Control**
   - No Outline: 1-3 paragraphs based on length
   - With Outline: Fixed 2 paragraphs (consistent quality)

2. **HTML Table Support**
   - Proper `<table>`, `<thead>`, `<tbody>` structure
   - No Markdown tables

3. **Clear Instructions**
   - `outline_mode` provides explicit guidance to AI
   - Reduces ambiguity, improves consistency

4. **Quality Assurance**
   - Minimum word count per paragraph (80+)
   - Structured writing guidelines
   - SEO optimization built-in

---

## 📞 Questions?

For issues or questions:
- Check verification queries in SQL script
- Review backend implementation in `server/routes/ai.ts`
- Test with sample data before production use

**Created**: 2026-01-13  
**Author**: AI Assistant  
**Status**: ✅ Ready for deployment
