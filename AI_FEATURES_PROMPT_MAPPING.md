# AI Features và Prompt Configuration - Hướng dẫn đầy đủ

## 📊 Tổng quan hiện trạng

### ✅ Chức năng ĐÃ sử dụng Prompt từ Database:

| Feature | Feature Name | Endpoint | Status |
|---------|--------------|----------|--------|
| **Write More / Expand Content** | `write_more` | `POST /api/ai/write-more` | ✅ **ĐÃ TÍCH HỢP** |

### ❌ Các chức năng CHƯA sử dụng Prompt từ Database:

| Feature | Feature Name (Đề xuất) | Endpoint | Status |
|---------|------------------------|----------|--------|
| **Rewrite Content** | `rewrite_content` | `POST /api/ai/rewrite` | ❌ Dùng hardcoded prompts |
| **Generate Article** | `generate_article` | `POST /api/ai/generate-article` | ❌ Dùng hardcoded prompts |
| **Generate SEO Title** | `generate_seo_title` | `POST /api/ai/generate-seo-title` | ❌ Dùng hardcoded prompts |
| **Generate Meta Description** | `generate_meta_description` | `POST /api/ai/generate-meta-description` | ❌ Dùng hardcoded prompts |
| **Find Image** | `find_image` | `POST /api/ai/find-image` | ❌ Dùng hardcoded prompts |

## 🔍 Chi tiết từng chức năng

### 1. ✅ Write More / Expand Content

**Feature Name:** `write_more`  
**Endpoint:** `POST /api/ai/write-more`  
**File:** `server/routes/ai.ts` (line 559)

**✅ ĐÃ TÍCH HỢP với database prompts:**

```typescript
const promptTemplate = await loadPrompt('write_more');

if (promptTemplate) {
  // Use database prompt
  systemPrompt = interpolatePrompt(promptTemplate.system_prompt, {
    language_instruction: languageInstruction,
  });
  
  prompt = interpolatePrompt(promptTemplate.prompt_template, {
    content: plainContent,
    language_instruction: languageInstruction,
  });
} else {
  // Fallback to hardcoded prompt
}
```

**Available Variables:**
- `{content}` - Nội dung cần mở rộng
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Prompt hiện tại trong database:**
```
Feature Name: expand_content
Display Name: Mở rộng nội dung
System Prompt: You are a content development specialist. Expand on ideas by adding relevant details, examples, and ...
Prompt Template: Expand and elaborate on this content: "{content}". {language_instruction} Add more details, examples...
```

---

### 2. ❌ Rewrite Content

**Feature Name (Đề xuất):** `rewrite_content`  
**Endpoint:** `POST /api/ai/rewrite`  
**File:** `server/routes/ai.ts` (line 140-350)

**Hiện trạng:** Dùng hardcoded `stylePrompts` object với 9 styles

**Styles:**
- `standard` - Viết lại chuẩn
- `shorter` - Ngắn gọn hơn
- `longer` - Dài hơn
- `easy` - Dễ hiểu hơn
- `creative` - Sáng tạo
- `funny` - Hài hước
- `casual` - Tự nhiên
- `friendly` - Thân thiện
- `professional` - Chuyên nghiệp

**Available Variables (Đề xuất):**
- `{text}` - Text cần rewrite
- `{style}` - Style (standard, shorter, longer, ...)
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Đề xuất prompt mẫu:**
```json
{
  "feature_name": "rewrite_content",
  "display_name": "Viết lại nội dung",
  "description": "Viết lại văn bản theo nhiều phong cách khác nhau",
  "system_prompt": "You are a professional content rewriter. Rewrite text according to the specified style while maintaining accuracy and clarity. {language_instruction}",
  "prompt_template": "Rewrite the following text in {style} style:\n\n\"{text}\"\n\n{language_instruction}",
  "available_variables": ["text", "style", "language_instruction"]
}
```

---

### 3. ❌ Generate Article

**Feature Name (Đề xuất):** `generate_article`  
**Endpoint:** `POST /api/ai/generate-article`  
**File:** `server/routes/ai.ts` (line 680-850)

**Hiện trạng:** Dùng hardcoded prompts

**Current Hardcoded Prompts:**
```typescript
systemPrompt = "You are a professional content writer. Write engaging, well-structured articles...";
prompt = `Write a comprehensive article about: "${keyword}"...`;
```

**Available Variables (Đề xuất):**
- `{keyword}` - Từ khóa chính
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Đề xuất prompt mẫu:**
```json
{
  "feature_name": "generate_article",
  "display_name": "Tạo bài viết hoàn chỉnh",
  "description": "Tạo một bài viết hoàn chỉnh từ từ khóa",
  "system_prompt": "You are a professional content writer. {language_instruction} Write engaging, well-structured articles with proper formatting.",
  "prompt_template": "Write a comprehensive article about: \"{keyword}\". {language_instruction}\n\nThe article should:\n- Be at least 800 words\n- Have a clear structure with introduction, body, and conclusion\n- Include relevant examples and details\n- Be engaging and informative\n- Be SEO-optimized",
  "available_variables": ["keyword", "language_instruction"]
}
```

---

### 4. ❌ Generate SEO Title

**Feature Name (Đề xuất):** `generate_seo_title`  
**Endpoint:** `POST /api/ai/generate-seo-title`  
**File:** `server/routes/ai.ts` (line 852-975)

**Hiện trạng:** Dùng hardcoded prompts

**Current Hardcoded Prompts:**
```typescript
systemPrompt = "You are an SEO expert...";
prompt = `Create an SEO-optimized title in ${languageNames[language]} for the keyword: "${keyword}"...`;
```

**Available Variables (Đề xuất):**
- `{keyword}` - Từ khóa chính
- `{content}` - Nội dung bài viết (optional)
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Đề xuất prompt mẫu:**
```json
{
  "feature_name": "generate_seo_title",
  "display_name": "Tạo tiêu đề SEO",
  "description": "Tạo tiêu đề tối ưu SEO từ từ khóa",
  "system_prompt": "You are an SEO expert specializing in creating compelling, click-worthy titles. {language_instruction}",
  "prompt_template": "Create an SEO-optimized title for the keyword: \"{keyword}\". {language_instruction}\n\nThe title should be:\n- Between 50-60 characters\n- Include the keyword naturally\n- Be compelling and click-worthy\n- Match search intent\n\nReturn ONLY the title, without quotes or extra text.",
  "available_variables": ["keyword", "language_instruction"]
}
```

---

### 5. ❌ Generate Meta Description

**Feature Name (Đề xuất):** `generate_meta_description`  
**Endpoint:** `POST /api/ai/generate-meta-description`  
**File:** `server/routes/ai.ts` (line 977-1095)

**Hiện trạng:** Dùng hardcoded prompts

**Current Hardcoded Prompts:**
```typescript
prompt = `Create an SEO-optimized meta description in ${languageNames[language]} for the keyword: "${keyword}"...`;
```

**Available Variables (Đề xuất):**
- `{keyword}` - Từ khóa chính
- `{content}` - Nội dung bài viết (optional)
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Đề xuất prompt mẫu:**
```json
{
  "feature_name": "generate_meta_description",
  "display_name": "Tạo Meta Description",
  "description": "Tạo meta description tối ưu SEO",
  "system_prompt": "You are an SEO expert specializing in meta descriptions. {language_instruction}",
  "prompt_template": "Create an SEO-optimized meta description for the keyword: \"{keyword}\". {language_instruction}\n\nThe meta description should be:\n- Between 150-160 characters\n- Engaging and informative\n- Include the keyword naturally\n- Encourage clicks with a call-to-action\n\nReturn ONLY the meta description, without quotes or extra text.",
  "available_variables": ["keyword", "language_instruction"]
}
```

---

### 6. ❌ Find Image

**Feature Name (Đề xuất):** `find_image`  
**Endpoint:** `POST /api/ai/find-image`  
**File:** `server/routes/ai.ts` (line 350-480)

**Hiện trạng:** Dùng hardcoded prompts

**Current Hardcoded Prompts:**
```typescript
systemPrompt = "You are an image search assistant...";
prompt = `Generate an optimal search query for finding images about: "${keyword}"...`;
```

**Available Variables (Đề xuất):**
- `{keyword}` - Từ khóa tìm kiếm
- `{language_instruction}` - Hướng dẫn ngôn ngữ

**Đề xuất prompt mẫu:**
```json
{
  "feature_name": "find_image",
  "display_name": "Tìm hình ảnh",
  "description": "Tạo truy vấn tìm kiếm hình ảnh tối ưu",
  "system_prompt": "You are an image search assistant. Generate optimal search queries for finding relevant images. {language_instruction}",
  "prompt_template": "Generate an optimal search query for finding images about: \"{keyword}\". {language_instruction}\n\nReturn only the search query, no additional text.",
  "available_variables": ["keyword", "language_instruction"]
}
```

---

## 🎯 Cách xác định Feature Name

### Convention:
1. **Lowercase với underscores:** `generate_article`, `write_more`
2. **Descriptive:** Mô tả chính xác chức năng
3. **Unique:** Không trùng trong database
4. **Match với endpoint:** Dễ nhớ và liên kết

### Mapping Feature Name → Endpoint:

| Feature Name | Endpoint Pattern |
|--------------|------------------|
| `write_more` | `/api/ai/write-more` |
| `rewrite_content` | `/api/ai/rewrite` |
| `generate_article` | `/api/ai/generate-article` |
| `generate_seo_title` | `/api/ai/generate-seo-title` |
| `generate_meta_description` | `/api/ai/generate-meta-description` |
| `find_image` | `/api/ai/find-image` |

---

## 📋 TODO: Tích hợp prompts cho các chức năng còn lại

### Bước 1: Tạo prompts trong Admin

Vào **https://volxai.com/admin** → **AI Prompts** → **Thêm Prompt Mới**

Tạo lần lượt:
1. ✅ `write_more` (đã có)
2. ❌ `rewrite_content`
3. ❌ `generate_article`
4. ❌ `generate_seo_title`
5. ❌ `generate_meta_description`
6. ❌ `find_image`

### Bước 2: Update code trong `server/routes/ai.ts`

Thay thế hardcoded prompts bằng:

```typescript
// Load prompt from database
const promptTemplate = await loadPrompt('feature_name_here');

if (promptTemplate) {
  // Use database prompt
  systemPrompt = interpolatePrompt(promptTemplate.system_prompt, variables);
  prompt = interpolatePrompt(promptTemplate.prompt_template, variables);
} else {
  // Fallback to hardcoded prompt
  systemPrompt = "...";
  prompt = "...";
}
```

---

## ✨ Lợi ích khi chuyển sang Database Prompts

### 1. **Quản lý tập trung**
- ✅ Tất cả prompts ở một nơi
- ✅ Dễ dàng update mà không cần deploy code

### 2. **A/B Testing**
- ✅ Toggle prompts để test versions khác nhau
- ✅ So sánh hiệu quả

### 3. **Đa ngôn ngữ**
- ✅ Tạo prompts riêng cho từng ngôn ngữ
- ✅ Customize theo market

### 4. **Version Control**
- ✅ Track changes qua database
- ✅ Rollback dễ dàng

### 5. **Non-technical Updates**
- ✅ Admin có thể update prompts
- ✅ Không cần developers

---

## 📝 Script tạo tất cả prompts mẫu

```sql
-- 1. Write More (đã có)
-- Đã tồn tại trong database

-- 2. Rewrite Content
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES (
  'rewrite_content',
  'Viết lại nội dung',
  'Viết lại văn bản theo nhiều phong cách khác nhau',
  'Rewrite the following text in {style} style:\n\n"{text}"\n\n{language_instruction}',
  'You are a professional content rewriter. Rewrite text according to the specified style while maintaining accuracy and clarity. {language_instruction}',
  '["text", "style", "language_instruction"]',
  TRUE
);

-- 3. Generate Article
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES (
  'generate_article',
  'Tạo bài viết hoàn chỉnh',
  'Tạo một bài viết hoàn chỉnh từ từ khóa',
  'Write a comprehensive article about: "{keyword}". {language_instruction}\n\nThe article should:\n- Be at least 800 words\n- Have a clear structure with introduction, body, and conclusion\n- Include relevant examples and details\n- Be engaging and informative\n- Be SEO-optimized',
  'You are a professional content writer. {language_instruction} Write engaging, well-structured articles with proper formatting.',
  '["keyword", "language_instruction"]',
  TRUE
);

-- 4. Generate SEO Title
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES (
  'generate_seo_title',
  'Tạo tiêu đề SEO',
  'Tạo tiêu đề tối ưu SEO từ từ khóa',
  'Create an SEO-optimized title for the keyword: "{keyword}". {language_instruction}\n\nThe title should be:\n- Between 50-60 characters\n- Include the keyword naturally\n- Be compelling and click-worthy\n- Match search intent\n\nReturn ONLY the title, without quotes or extra text.',
  'You are an SEO expert specializing in creating compelling, click-worthy titles. {language_instruction}',
  '["keyword", "language_instruction"]',
  TRUE
);

-- 5. Generate Meta Description
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES (
  'generate_meta_description',
  'Tạo Meta Description',
  'Tạo meta description tối ưu SEO',
  'Create an SEO-optimized meta description for the keyword: "{keyword}". {language_instruction}\n\nThe meta description should be:\n- Between 150-160 characters\n- Engaging and informative\n- Include the keyword naturally\n- Encourage clicks with a call-to-action\n\nReturn ONLY the meta description, without quotes or extra text.',
  'You are an SEO expert specializing in meta descriptions. {language_instruction}',
  '["keyword", "language_instruction"]',
  TRUE
);

-- 6. Find Image
INSERT INTO ai_prompts (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES (
  'find_image',
  'Tìm hình ảnh',
  'Tạo truy vấn tìm kiếm hình ảnh tối ưu',
  'Generate an optimal search query for finding images about: "{keyword}". {language_instruction}\n\nReturn only the search query, no additional text.',
  'You are an image search assistant. Generate optimal search queries for finding relevant images. {language_instruction}',
  '["keyword", "language_instruction"]',
  TRUE
);
```

---

**Tóm tắt:**
- ✅ **1/6 chức năng** đã dùng database prompts (`write_more`)
- ❌ **5/6 chức năng** còn lại đang dùng hardcoded prompts
- 📝 Đã có đề xuất feature names và prompt mẫu cho tất cả
- 🎯 Có thể tạo prompts ngay trong Admin UI hoặc chạy SQL script

