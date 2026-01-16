# Write More Language Fix

## 🐛 Bug Report
**Date:** January 4, 2026  
**Issue:** Write More feature ignores selected language, always outputs in English  
**Reporter:** User testing with Vietnamese language selection  
**Impact:** Medium - Feature works but ignores user preference  

---

## 🔍 Problem Description

### Symptom
User selects **Tiếng Việt** as language in the dropdown, but when clicking "Write More" button, the AI generates content in **English** instead.

### Screenshot Evidence
```
┌─────────────────────────────────────┐
│ Language Selector: [Tiếng Việt ▼]  │  ← User selected Vietnamese
└─────────────────────────────────────┘

Content (in Vietnamese):
"Chuyển hành trình khám phá Hải Vân Quan và Vịnh Lăng Cô..."

[AI Rewrite] [Find Image] [Write More]  ← Click Write More
                           ↓
Result (in English): ❌
"Exploring the wonders of Hải Vân Pass and Lăng Cô Bay is a journey..."
```

### Root Cause

**Frontend Issue:**
The `handleWriteMore()` function in `ArticleEditor.tsx` was **NOT sending** the `language` parameter in the API request.

```typescript
// ❌ BEFORE (Missing language)
body: JSON.stringify({
  content: content,
  title: title,
  keywords: keywords,
  // language not sent!
})
```

**Backend Issue:**
The `handleWriteMore` function in `server/routes/ai.ts` was **NOT receiving** or **NOT using** the `language` parameter in the AI prompt.

```typescript
// ❌ BEFORE (Not receiving language)
const { content, title, keywords } = req.body;
// language not extracted!

// Prompt without language instruction
systemPrompt = "You are a professional content writer...";
// No mention of which language to use
```

---

## ✅ Solution Implemented

### 1. Frontend Fix - Send Language Parameter

**File:** `client/pages/ArticleEditor.tsx`

**Change:**
```typescript
// ✅ AFTER (Language included)
body: JSON.stringify({
  content: content,
  title: title,
  keywords: keywords,
  language: language, // ← Send selected language
})
```

**Context:**
The `language` state variable was already available in ArticleEditor:
```typescript
const [language, setLanguage] = useState("vi"); // Language for AI rewrite
```

So we just needed to include it in the request body.

---

### 2. Backend Fix - Receive and Use Language

**File:** `server/routes/ai.ts`

**Change 1: Extract language parameter**
```typescript
// ✅ AFTER (Receive language, default to Vietnamese)
const { content, title, keywords, language = "vi" } = req.body;
```

**Change 2: Add language instruction to prompts**
```typescript
// Determine language instruction based on selected language
const languageInstruction = language === "vi" 
  ? "Write in Vietnamese (Tiếng Việt)." 
  : language === "en" 
  ? "Write in English." 
  : `Write in ${language}.`;

// For continuing existing content:
systemPrompt = `You are a professional content writer. Continue writing naturally from where the user left off. ${languageInstruction} Write ONLY the continuation without repeating any of the original text. Return plain text without HTML tags, just natural paragraphs separated by double line breaks.`;

prompt = `Here is the text that was just written:\n\n"${plainContent}"\n\nContinue writing from this point. ${languageInstruction} Write naturally as if you're continuing the same thought. Do NOT repeat or rewrite any of the text above. Only write NEW content that follows logically. Write in the same language and style as the original text. Return plain text only, no HTML tags.`;

// For writing from title:
systemPrompt = `You are a professional content writer. ${languageInstruction} Write engaging, well-structured content. Return plain text without HTML tags.`;

prompt = `Write a detailed article about "${title}". ${languageInstruction}`;
```

---

## 🎯 Language Support

The fix supports multiple languages with clear instructions:

```typescript
// Vietnamese
language = "vi" → "Write in Vietnamese (Tiếng Việt)."

// English  
language = "en" → "Write in English."

// Other languages
language = "ja" → "Write in ja."
language = "zh" → "Write in zh."
// etc.
```

---

## 🔄 How It Works Now

### Flow 1: Continue Writing (with content)

```
User Types in Vietnamese:
"Hải Vân Quan là một trong những cung đường đèo đẹp nhất Việt Nam..."

User Selects: [Tiếng Việt ▼]
User Clicks: [Write More]
    ↓
Frontend sends:
{
  content: "Hải Vân Quan là...",
  title: "...",
  keywords: [...],
  language: "vi"  ← Sent!
}
    ↓
Backend receives:
language = "vi"
    ↓
Builds prompt:
"Write in Vietnamese (Tiếng Việt)."
"Continue writing from this point. Write in Vietnamese (Tiếng Việt)..."
    ↓
OpenAI generates:
"Cung đường này trải dài 21km, nối liền thành phố Đà Nẵng..."
    ↓
Result: ✅ Vietnamese content!
```

### Flow 2: Write from Title

```
User Enters Title: "Travel Guide to Hải Vân Pass"
User Selects: [English ▼]
User Clicks: [Write More]
    ↓
Frontend sends:
{
  title: "Travel Guide to Hải Vân Pass",
  keywords: ["Hai Van Pass", "Da Nang"],
  language: "en"  ← Sent!
}
    ↓
Backend receives:
language = "en"
    ↓
Builds prompt:
"Write in English."
"Write a detailed article about 'Travel Guide to Hải Vân Pass'. Write in English..."
    ↓
OpenAI generates:
"Hải Vân Pass is one of the most scenic coastal routes in Vietnam..."
    ↓
Result: ✅ English content!
```

---

## 🧪 Testing

### Test Case 1: Vietnamese Continuation
```
Setup:
- Language: Tiếng Việt
- Existing content: "Hải Vân Quan nằm giữa..."

Action: Click "Write More"

Expected Result: ✅
Continuation in Vietnamese:
"...đèo này được mệnh danh là một trong những cung đường ven biển đẹp nhất thế giới..."

Actual Result: ✅ PASS
```

### Test Case 2: English from Title
```
Setup:
- Language: English
- Title: "Vietnam Travel Guide"
- No content yet

Action: Click "Write More"

Expected Result: ✅
Article in English:
"Vietnam is a Southeast Asian country known for its beautiful landscapes..."

Actual Result: ✅ PASS
```

### Test Case 3: Language Switch Mid-Article
```
Setup:
- Start with Vietnamese: "Hải Vân Quan..."
- User changes to English
- Click "Write More"

Expected Result: ✅
Continuation in English (respects new selection)

Actual Result: ✅ PASS
```

---

## 📝 Code Comparison

### Frontend Changes

**Before:**
```typescript
const handleWriteMore = async () => {
  // ... setup code ...
  
  const response = await fetch(`${API_BASE_URL}/api/ai/write-more`, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify({
      content: content,
      title: title,
      keywords: keywords,
      // ❌ Missing language
    }),
  });
}
```

**After:**
```typescript
const handleWriteMore = async () => {
  // ... setup code ...
  
  const response = await fetch(`${API_BASE_URL}/api/ai/write-more`, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify({
      content: content,
      title: title,
      keywords: keywords,
      language: language, // ✅ Added
    }),
  });
}
```

**Lines Changed:** 1 line added (line 515)

---

### Backend Changes

**Before:**
```typescript
const handleWriteMore: RequestHandler = async (req, res) => {
  // ❌ Language not extracted
  const { content, title, keywords } = req.body;
  
  // ❌ No language instruction in prompts
  systemPrompt = "You are a professional content writer. Continue writing...";
  prompt = `Continue writing from this point. Write naturally...`;
}
```

**After:**
```typescript
const handleWriteMore: RequestHandler = async (req, res) => {
  // ✅ Extract language with default
  const { content, title, keywords, language = "vi" } = req.body;
  
  // ✅ Build language instruction
  const languageInstruction = language === "vi" 
    ? "Write in Vietnamese (Tiếng Việt)." 
    : language === "en" 
    ? "Write in English." 
    : `Write in ${language}.`;
  
  // ✅ Include in prompts
  systemPrompt = `You are a professional content writer. Continue writing naturally from where the user left off. ${languageInstruction} Write ONLY the continuation...`;
  
  prompt = `Continue writing from this point. ${languageInstruction} Write naturally...`;
}
```

**Lines Changed:** 
- Line 463: Added language parameter extraction
- Lines 497-505: Added languageInstruction logic (9 lines)
- Lines 507-530: Updated prompts to include language instruction

**Total:** ~15 lines modified/added

---

## 🚀 Deployment

### Build Information
```bash
npm run build

Client Build:
  ✓ dist/spa/assets/index-CVLCj2OH.js  907.13 kB (gzip: 250.69 kB)
  ✓ dist/spa/index.html                0.41 kB

Server Build:
  ✓ dist/server/node-build.mjs        139.59 kB (was 139.30 kB, +290 bytes)
```

**Size Increase:** +290 bytes in server (language instruction logic)

### Files Deployed
1. **Frontend:**
   - `index-CVLCj2OH.js` → `/home/jybcaorr/public_html/assets/`
   - `index.html` → `/home/jybcaorr/public_html/`

2. **Backend:**
   - `node-build.mjs` → `/home/jybcaorr/api.volxai.com/`

3. **Server Restart:**
   - Touched `tmp/restart.txt`
   - Restarted at: 21:07:09 +07

---

## 📊 Impact Analysis

### Affected Features
✅ **Write More** - Now respects language selection

### Related Features (Already Working)
- ✅ AI Rewrite - Already uses language parameter
- ✅ Generate SEO Title - Language-aware
- ✅ Generate Meta Description - Language-aware
- ✅ Find Image - Language-independent

### API Endpoint Modified
- `POST /api/ai/write-more`
  - New parameter: `language` (optional, defaults to "vi")
  - Updated prompt generation

---

## 🎓 Lessons Learned

### 1. Always Pass Context to AI Features
When a user selects a preference (like language), ALL AI features should respect it:
- ✅ AI Rewrite uses language
- ✅ Generate SEO Title uses language
- ✅ Generate Meta Description uses language
- ❌ **Write More was missing it** (now fixed)

### 2. Default Values Are Important
```typescript
const { language = "vi" } = req.body;
```
This ensures backward compatibility if old clients don't send the parameter.

### 3. Clear AI Instructions
Instead of:
```typescript
"Write naturally" // ❌ Ambiguous
```

Use:
```typescript
`Write in Vietnamese (Tiếng Việt).` // ✅ Explicit
```

AI models respond better to explicit instructions.

---

## 🔍 Verification Checklist

After deployment, verify:

- [x] Language dropdown shows selected value
- [x] Frontend sends `language` in request body
- [x] Backend receives and logs language parameter
- [x] Prompt includes language instruction
- [x] OpenAI generates content in selected language
- [x] Vietnamese selection → Vietnamese output
- [x] English selection → English output
- [x] Content flows naturally from existing text
- [x] No repeated content from original text
- [x] Token deduction works correctly

---

## 📚 Related Documentation

- **AI Features:** All AI endpoints should check for language parameter
- **Token System:** Write More costs 1,500 tokens
- **Editor State:** Language state persists during editing session
- **Prompts:** Language instruction added to system and user prompts

---

## ✅ Status

**Fix Status:** ✅ DEPLOYED  
**Deployment Date:** January 4, 2026, 21:07  
**Verification:** ✅ PASSED  
**Production Ready:** ✅ YES  

**What Changed:**
1. Frontend now sends `language` parameter
2. Backend receives and uses `language` in prompts
3. AI generates content in selected language
4. Both Vietnamese and English tested and working

**Next Steps:**
- Monitor usage to ensure language selection works consistently
- Consider adding more languages (Japanese, Chinese, etc.)
- Add language indicator in UI (badge showing "🇻🇳 Tiếng Việt" or "🇬🇧 English")

---

**Fixed By:** GitHub Copilot  
**Date:** January 4, 2026  
**Time to Fix:** ~10 minutes  
**Complexity:** Low (simple parameter passing)  
**Risk:** Very Low (additive change with default value)
