# Backend Integration Guide - Tích hợp Database Prompts

## 🎯 Mục tiêu

Tích hợp 4 chức năng AI còn lại để sử dụng prompts từ database thay vì hardcoded prompts.

## 📋 Các chức năng cần tích hợp

1. ✅ **expand_content** (write_more) - ĐÃ TÍCH HỢP
2. ❌ **rewrite_content** - CẦN TÍCH HỢP
3. ❌ **generate_article** - CẦN TÍCH HỢP  
4. ❌ **generate_seo_title** - CẦN TÍCH HỢP
5. ❌ **generate_meta_description** - CẦN TÍCH HỢP

## 🔧 Template code để tích hợp

### Pattern chung:

```typescript
// Load prompt from database
const promptTemplate = await loadPrompt('feature_name');

let systemPrompt = "";
let prompt = "";

if (promptTemplate) {
  // Use database prompt with variable interpolation
  systemPrompt = interpolatePrompt(promptTemplate.system_prompt, {
    language_instruction: languageInstruction,
    // ... other variables
  });
  
  prompt = interpolatePrompt(promptTemplate.prompt_template, {
    text: text,
    style: style,
    // ... other variables
  });
} else {
  // FALLBACK: Use existing hardcoded prompts
  systemPrompt = "... existing hardcoded ...";
  prompt = "... existing hardcoded ...";
}
```

---

## 1. Rewrite Content Integration

**File:** `server/routes/ai.ts` (handleRewrite, line ~140-280)

**Feature Name:** `rewrite_content`

**Variables:**
- `{text}` - Text cần rewrite
- `{style}` - Style (standard, shorter, longer, etc.)
- `{language_instruction}` - Hướng dẫn ngôn ngữ

### Code to add (after line 210):

```typescript
const handleRewrite: RequestHandler = async (req, res) => {
  try {
    // ... existing verification code ...
    
    const { text, style, language = "en" } = req.body as RewriteRequest;
    
    // ... existing validation and token check ...
    
    // Language instruction
    const languageName = languageNames[language] || "English";
    const languageInstruction = language !== "en" 
      ? `Rewrite this text in ${languageName}. The original text is in ${languageName}, so maintain the language.`
      : "Write in English.";

    // ========== NEW: Load prompt from database ==========
    const promptTemplate = await loadPrompt('rewrite_content');
    
    let systemPrompt = "";
    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt
      systemPrompt = interpolatePrompt(promptTemplate.system_prompt, {
        language_instruction: languageInstruction,
      });
      
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        text: text,
        style: style,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK: Use existing hardcoded prompts
      systemPrompt = "You are a professional content editor. Rewrite text as requested while maintaining accuracy and quality. Only return the rewritten text without any additional commentary or explanation.";
      userPrompt = `${stylePrompts[style]}\n\n${languageInstruction}\n\nText to rewrite:\n${text}`;
    }
    // ====================================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,  // Use dynamic prompt
          },
          {
            role: "user",
            content: userPrompt,  // Use dynamic prompt
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    
    // ... rest of the code ...
  }
};
```

---

## 2. Generate Article Integration

**File:** `server/routes/ai.ts` (handleGenerateArticle, line ~680-850)

**Feature Name:** `generate_article`

**Variables:**
- `{keyword}` - Từ khóa chính
- `{language_instruction}` - Hướng dẫn ngôn ngữ

### Code to add:

```typescript
const handleGenerateArticle: RequestHandler = async (req, res) => {
  try {
    // ... existing code ...
    
    const { keyword, language = "vi" } = req.body;
    
    // ... validation and token check ...
    
    const languageInstruction = language === "vi" 
      ? "Write in Vietnamese (Tiếng Việt)." 
      : language === "en" 
      ? "Write in English." 
      : `Write in ${language}.`;

    // ========== NEW: Load prompt from database ==========
    const promptTemplate = await loadPrompt('generate_article');
    
    let systemPrompt = "";
    let userPrompt = "";

    if (promptTemplate) {
      systemPrompt = interpolatePrompt(promptTemplate.system_prompt, {
        language_instruction: languageInstruction,
      });
      
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK
      systemPrompt = "You are a professional content writer. Write engaging, well-structured articles...";
      userPrompt = `Write a comprehensive article about: "${keyword}". ${languageInstruction}...`;
    }
    // ====================================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // ... use systemPrompt and userPrompt ...
    });
    
    // ... rest ...
  }
};
```

---

## 3. Generate SEO Title Integration

**File:** `server/routes/ai.ts` (handleGenerateSeoTitle, line ~852-975)

**Feature Name:** `generate_seo_title`

**Variables:**
- `{keyword}` - Từ khóa chính
- `{language_instruction}` - Hướng dẫn ngôn ngữ

### Code to add:

```typescript
const handleGenerateSeoTitle: RequestHandler = async (req, res) => {
  try {
    // ... existing code ...
    
    const { keyword, language = "vi" } = req.body;
    
    // ... validation ...
    
    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      // ... others
    };
    
    const languageInstruction = `Create in ${languageNames[language] || "Vietnamese"}`;

    // ========== NEW: Load prompt from database ==========
    const promptTemplate = await loadPrompt('generate_seo_title');
    
    let systemPrompt = "";
    let userPrompt = "";

    if (promptTemplate) {
      systemPrompt = interpolatePrompt(promptTemplate.system_prompt, {
        language_instruction: languageInstruction,
      });
      
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK
      systemPrompt = "You are an SEO expert...";
      userPrompt = `Create an SEO-optimized title in ${languageNames[language]} for the keyword: "${keyword}"...`;
    }
    // ====================================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // ... use systemPrompt and userPrompt ...
    });
    
    // ... rest ...
  }
};
```

---

## 4. Generate Meta Description Integration

**File:** `server/routes/ai.ts` (handleGenerateMetaDescription, line ~977-1095)

**Feature Name:** `generate_meta_description`

**Variables:**
- `{keyword}` - Từ khóa chính
- `{language_instruction}` - Hướng dẫn ngôn ngữ

### Code to add:

```typescript
const handleGenerateMetaDescription: RequestHandler = async (req, res) => {
  try {
    // ... existing code ...
    
    const { keyword, content = "", language = "vi" } = req.body;
    
    // ... validation ...
    
    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      // ... others
    };
    
    const languageInstruction = `Create in ${languageNames[language] || "Vietnamese"}`;

    // ========== NEW: Load prompt from database ==========
    const promptTemplate = await loadPrompt('generate_meta_description');
    
    let prompt = "";

    if (promptTemplate) {
      prompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK
      const contentContext = content ? `\n\nContent preview: ${content.substring(0, 300)}` : "";
      prompt = `Create an SEO-optimized meta description in ${languageNames[language]} for the keyword: "${keyword}".${contentContext}...`;
    }
    // ====================================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // ... use prompt ...
    });
    
    // ... rest ...
  }
};
```

---

## 📝 Checklist để tích hợp

### Bước 1: Import prompts vào database
```bash
# Run SQL script
mysql -u user -p database < IMPORT_ALL_AI_PROMPTS.sql
```

### Bước 2: Update code từng chức năng

- [ ] Rewrite Content (handleRewrite)
- [ ] Generate Article (handleGenerateArticle)
- [ ] Generate SEO Title (handleGenerateSeoTitle)
- [ ] Generate Meta Description (handleGenerateMetaDescription)

### Bước 3: Testing

Test từng chức năng:
```bash
# Rewrite
curl -X POST https://api.volxai.com/api/ai/rewrite \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"...", "style":"standard", "language":"vi"}'

# Generate Article
curl -X POST https://api.volxai.com/api/ai/generate-article \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"...", "language":"vi"}'

# Generate SEO Title
curl -X POST https://api.volxai.com/api/ai/generate-seo-title \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"...", "language":"vi"}'

# Generate Meta Description
curl -X POST https://api.volxai.com/api/ai/generate-meta-description \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"...", "language":"vi"}'
```

### Bước 4: Deploy

```bash
# Build server
npm run build:server

# Deploy
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# Restart
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

---

## ✨ Lợi ích sau khi tích hợp

1. ✅ **Quản lý tập trung** - Tất cả prompts ở Admin UI
2. ✅ **A/B Testing** - Toggle on/off để test versions khác nhau
3. ✅ **Update nhanh** - Không cần deploy code khi thay đổi prompts
4. ✅ **Consistent** - Tất cả chức năng đều dùng cùng pattern
5. ✅ **Fallback** - Vẫn hoạt động nếu database prompt không có

---

**Note:** File này là hướng dẫn chi tiết. Actual implementation sẽ được thực hiện trực tiếp trong `server/routes/ai.ts`.
