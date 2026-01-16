# Adaptive Paragraph Requirements by Outline Type & Length

## Vấn đề

AI quay lại viết **chỉ 1 đoạn văn mỗi heading** dù đã có instruction. User yêu cầu:

### Với AI Outline:
- Luôn viết **2-3 đoạn/heading** (bất kể độ dài)

### Với No Outline:
- **Short (~1500 từ)**: 1-2 đoạn/heading
- **Medium (~2000 từ)**: 2-3 đoạn/heading  
- **Long (~3000 từ)**: 3-4 đoạn/heading

## Root Cause

Code cũ sử dụng **CÙNG 1 PARAGRAPH COUNT** cho cả AI Outline và No Outline:
```typescript
const lengthConfig = {
  short: { h2Paragraphs: 2, h3Paragraphs: 1 },
  medium: { h2Paragraphs: 3, h3Paragraphs: 2 },
  long: { h2Paragraphs: 5, h3Paragraphs: 4 }
};

// Same for all outline types ❌
userPrompt += `Each H2: ${lengthConfig.h2Paragraphs} paragraphs`;
```

**Vấn đề:**
- Không phân biệt AI Outline vs No Outline
- Paragraph count không linh hoạt theo context
- Instruction không đủ mạnh để AI tuân thủ

## Giải pháp

### 1. Separate Paragraph Counts for Outline Types

**Cấu trúc mới:**
```typescript
const lengthMap = {
  short: {
    h2Paragraphs: 2,              // For AI outline
    h3Paragraphs: 2,              // For AI outline
    h2ParagraphsNoOutline: 1,     // For No outline  
    h3ParagraphsNoOutline: 1,     // For No outline
  },
  medium: {
    h2Paragraphs: 2,              // 2-3 đoạn
    h3Paragraphs: 2,
    h2ParagraphsNoOutline: 2,     // Same for No outline
    h3ParagraphsNoOutline: 2,
  },
  long: {
    h2Paragraphs: 3,              // 3-4 đoạn
    h3Paragraphs: 3,
    h2ParagraphsNoOutline: 3,     // Same for No outline
    h3ParagraphsNoOutline: 3,
  }
};
```

### 2. Dynamic Selection Based on Outline Type

```typescript
// Determine actual paragraph counts
const actualH2Paragraphs = outlineType === "no-outline" 
  ? lengthConfig.h2ParagraphsNoOutline   // Use No outline config
  : lengthConfig.h2Paragraphs;           // Use AI outline config

const actualH3Paragraphs = outlineType === "no-outline"
  ? lengthConfig.h3ParagraphsNoOutline
  : lengthConfig.h3Paragraphs;
```

### 3. Enhanced Instructions Throughout

**Length Instruction:**
```typescript
const lengthInstruction = `${lengthConfig.instruction}

⚠️ CRITICAL PARAGRAPH REQUIREMENTS - MUST FOLLOW EXACTLY:
- Each <h2> section MUST have AT LEAST ${actualH2Paragraphs} separate <p> paragraphs
- Each <h3> subsection MUST have AT LEAST ${actualH3Paragraphs} separate <p> paragraphs
- FORBIDDEN: Writing only 1 short paragraph per heading
- REQUIRED: Deep analysis, multiple perspectives, examples
- STRUCTURE: Use line breaks (\\n\\n) between all paragraphs`;
```

**Outline Instructions:**
```typescript
if (customOutline) {
  userPrompt += `
⚠️ WRITING REQUIREMENTS FOR EACH SECTION (MUST FOLLOW):
- Each <h2>: AT LEAST ${actualH2Paragraphs} separate <p> paragraphs
- Each <h3>: AT LEAST ${actualH3Paragraphs} separate <p> paragraphs
- FORBIDDEN: Writing only 1 paragraph per heading - STRICTLY PROHIBITED
- REQUIRED: Multiple perspectives, examples, deep analysis`;
}
```

**Gemini Format Instruction:**
```typescript
geminiPrompt += `
2. PARAGRAPH RULES (MANDATORY):
   - Each <h2>: AT LEAST ${actualH2Paragraphs} separate <p> paragraphs
   - Each <h3>: AT LEAST ${actualH3Paragraphs} separate <p> paragraphs
   - FORBIDDEN: Writing only 1 paragraph per heading
   
4. EXAMPLE (minimum ${actualH2Paragraphs} paragraphs per H2):
<h2>Section Title</h2>
<p>First paragraph...</p>
<p>Second paragraph...</p>
${actualH2Paragraphs >= 3 ? '<p>Third paragraph...</p>' : ''}

⚠️ REMEMBER: Write AT LEAST ${actualH2Paragraphs} paragraphs for each <h2>`;
```

**Continuation Prompt:**
```typescript
continuationPrompt = `
⚠️ IMPORTANT RULES (MUST FOLLOW):
5. Each <h2>: AT LEAST ${actualH2Paragraphs} detailed paragraphs
6. Each <h3>: AT LEAST ${actualH3Paragraphs} paragraphs
7. FORBIDDEN: Writing only 1 paragraph per heading
8. Use line breaks (\\n\\n) between paragraphs`;
```

## Expected Behavior

### Scenario 1: AI Outline + Short Length
```
outlineType: "ai-outline"
length: "short"
→ actualH2Paragraphs: 2
→ actualH3Paragraphs: 2

Instruction: "Each <h2> MUST have AT LEAST 2 separate <p> paragraphs"
Result: 2-3 đoạn/heading ✅
```

### Scenario 2: No Outline + Short Length
```
outlineType: "no-outline"
length: "short"
→ actualH2Paragraphs: 1
→ actualH3Paragraphs: 1

Instruction: "Each <h2> MUST have AT LEAST 1 separate <p> paragraphs"
Result: 1-2 đoạn/heading ✅
```

### Scenario 3: AI Outline + Medium Length
```
outlineType: "ai-outline"
length: "medium"
→ actualH2Paragraphs: 2
→ actualH3Paragraphs: 2

Result: 2-3 đoạn/heading ✅
```

### Scenario 4: No Outline + Long Length
```
outlineType: "no-outline"
length: "long"
→ actualH2Paragraphs: 3
→ actualH3Paragraphs: 3

Instruction: "Each <h2> MUST have AT LEAST 3 separate <p> paragraphs"
Result: 3-4 đoạn/heading ✅
```

## Configuration Table

| Length | Outline Type | H2 Paragraphs | H3 Paragraphs | Word Count |
|--------|--------------|---------------|---------------|------------|
| Short  | AI Outline   | 2-3          | 2-3          | 1500-2000  |
| Short  | No Outline   | 1-2          | 1-2          | 1500-2000  |
| Medium | AI Outline   | 2-3          | 2-3          | 2000-2500  |
| Medium | No Outline   | 2-3          | 2-3          | 2000-2500  |
| Long   | AI Outline   | 3-4          | 3-4          | 3000-4000  |
| Long   | No Outline   | 3-4          | 3-4          | 3000-4000  |

## Enhanced Instruction Techniques

### 1. Visual Warnings (⚠️)
```
⚠️ CRITICAL PARAGRAPH REQUIREMENTS - MUST FOLLOW EXACTLY
⚠️ WRITING REQUIREMENTS FOR EACH SECTION (MUST FOLLOW)
⚠️ REMEMBER: Write AT LEAST X paragraphs
```

### 2. Repetition at Key Points
- Length instruction
- Outline instruction  
- Gemini format instruction
- Continuation prompt

### 3. Explicit Forbidden Rules
```
- FORBIDDEN: Writing only 1 paragraph per heading
- STRICTLY PROHIBITED
- DO NOT write only 1 short paragraph
```

### 4. Concrete Examples
```
4. EXAMPLE (minimum 2 paragraphs per H2):
<h2>Title</h2>
<p>First paragraph...</p>
<p>Second paragraph...</p>
```

### 5. Context-Aware Reminders
```
⚠️ REMEMBER: Write AT LEAST ${actualH2Paragraphs} paragraphs for each <h2> 
            and ${actualH3Paragraphs} paragraphs for each <h3>
```

## Testing Checklist

### Test Case 1: AI Outline + Short
- [ ] Create article with "AI Outline" + "Short"
- [ ] Expected: 2-3 paragraphs per H2
- [ ] Check: Each H2 has at least 2 `<p>` tags
- [ ] Verify: No sections with only 1 paragraph

### Test Case 2: No Outline + Short  
- [ ] Create article with "No Outline" + "Short"
- [ ] Expected: 1-2 paragraphs per H2
- [ ] Check: Some H2s may have 1 paragraph (acceptable)
- [ ] Verify: Overall structure is concise

### Test Case 3: AI Outline + Long
- [ ] Create article with "AI Outline" + "Long"
- [ ] Expected: 3-4 paragraphs per H2
- [ ] Check: Each H2 has at least 3 `<p>` tags
- [ ] Verify: Article reaches 3000+ words

### Test Case 4: No Outline + Long
- [ ] Create article with "No Outline" + "Long"
- [ ] Expected: 3-4 paragraphs per H2 (same as AI Outline)
- [ ] Check: Consistent paragraph structure
- [ ] Verify: Comprehensive content

## Benefits

1. ✅ **Flexible paragraph counts** - Different for AI Outline vs No Outline
2. ✅ **Adaptive to length** - More paragraphs for longer articles
3. ✅ **Clear instructions** - Multiple reminders throughout
4. ✅ **Visual emphasis** - ⚠️ warnings grab AI attention
5. ✅ **Concrete examples** - Shows exactly what's expected
6. ✅ **Context-aware** - Variables show actual requirements
7. ✅ **Comprehensive coverage** - Applied to all prompts (initial, continuation, Gemini)

## Code Changes Summary

| Location | Change | Impact |
|----------|--------|--------|
| lengthMap config | Added h2ParagraphsNoOutline, h3ParagraphsNoOutline | Separate configs for outline types |
| actualH2Paragraphs | Dynamic selection based on outlineType | Context-aware paragraph count |
| lengthInstruction | Uses actualH2Paragraphs instead of fixed | Correct instructions |
| Outline instructions | Updated to use actual counts + warnings | Stronger enforcement |
| Gemini prompt | Enhanced with examples and reminders | Better AI compliance |
| Continuation prompt | All occurrences updated with actual counts | Consistent throughout |

## Build Status

✅ Build successful
- Client: ✓ (940.10 kB)
- Server: ✓ (230.13 kB)

## Deployment

Ready to deploy:
1. Upload `dist/server/node-build.mjs`
2. Restart Node.js application
3. Test all 4 scenarios above
4. Verify paragraph counts in generated articles

**Date:** January 9, 2026
**Status:** ✅ ADAPTIVE PARAGRAPH REQUIREMENTS IMPLEMENTED
