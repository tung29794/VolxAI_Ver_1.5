# AI Rewrite Article Title Feature

## Overview
Added "AI Rewrite" button for article title field in the Article Editor, allowing users to generate compelling article titles from their main keyword using AI.

## Changes Made

### 1. Frontend Changes (`client/pages/ArticleEditor.tsx`)

#### Added State Variable
```typescript
const [isGeneratingArticleTitle, setIsGeneratingArticleTitle] = useState(false);
```

#### Updated UI Layout (Lines 1270-1305)
- Wrapped title input in a flex container
- Added "AI Rewrite" button next to title input
- Button includes:
  - Loading state with spinner
  - Zap icon for visual consistency
  - Disabled state during generation

#### Added Handler Function (`handleGenerateArticleTitle`)
```typescript
const handleGenerateArticleTitle = async () => {
  // Validates keyword exists
  // Calls /api/ai/generate-article-title endpoint
  // Handles token validation (402 response)
  // Updates title state with generated result
  // Shows success/error toast with token info
}
```

**Features:**
- ✅ Requires keyword input (uses `keywords[0]`)
- ✅ Token validation and deduction
- ✅ Error handling with toast notifications
- ✅ Updates token balance after generation
- ✅ Loading state during API call

### 2. Backend Changes (`server/routes/ai.ts`)

#### Added Handler Function (`handleGenerateArticleTitle`)
Location: After `handleGenerateMetaDescription` (around line 3652)

**Features:**
- ✅ User authentication verification
- ✅ Token checking (300 tokens - same as SEO title)
- ✅ OpenAI API integration (GPT-3.5-turbo)
- ✅ Multi-language support (10 languages)
- ✅ Token deduction with actual usage tracking
- ✅ Error handling

**Prompt Strategy:**
```
System: "You are a professional content writer specializing in creating 
         engaging, natural article titles."

User:   "Create a compelling article title based on the keyword: {keyword}
         - Natural and engaging
         - Include keyword naturally
         - Length: 40-70 characters
         - Click-worthy and interesting"
```

**Configuration:**
- Model: `gpt-3.5-turbo`
- Temperature: `0.8` (higher for creativity)
- Max Tokens: `100`

#### Added Route
```typescript
router.post("/generate-article-title", handleGenerateArticleTitle);
```

## Token Cost
- **Cost per generation:** 300 tokens (same as SEO Title)
- **Feature code:** `GENERATE_ARTICLE_TITLE`

## API Endpoint

### POST `/api/ai/generate-article-title`

**Request Body:**
```json
{
  "keyword": "string (required)",
  "language": "string (optional, default: 'vi')"
}
```

**Success Response (200):**
```json
{
  "title": "Generated article title",
  "tokensUsed": 300,
  "remainingTokens": 9700
}
```

**Error Responses:**
- `400`: Missing keyword
- `402`: Insufficient tokens
  ```json
  {
    "success": false,
    "error": "Insufficient tokens",
    "requiredTokens": 300,
    "remainingTokens": 50,
    "featureName": "Generate Article Title"
  }
  ```
- `503`: API key not configured
- `500`: Internal server error

## Supported Languages
1. Vietnamese (vi)
2. English (en)
3. Spanish (es)
4. French (fr)
5. German (de)
6. Italian (it)
7. Portuguese (pt)
8. Russian (ru)
9. Japanese (ja)
10. Chinese (zh)

## User Flow

1. **User enters keyword(s)** in the WriteByKeyword or Toplist form
2. **Clicks "AI Rewrite" button** next to title input field
3. **System validates:**
   - Keyword exists
   - User has enough tokens (300)
4. **AI generates title** from keyword
5. **Title updates automatically** in input field
6. **Toast notification shows:**
   - Success message
   - Tokens used (300)
   - Remaining tokens

## Testing Checklist

### Frontend
- [ ] Button appears next to title input
- [ ] Button disabled when no keywords
- [ ] Loading spinner shows during generation
- [ ] Title updates with generated result
- [ ] Toast notifications work correctly
- [ ] Token modal shows when insufficient tokens

### Backend
- [ ] Endpoint responds correctly
- [ ] Token validation works
- [ ] Token deduction successful
- [ ] Multi-language support works
- [ ] Error handling catches edge cases
- [ ] API key validation works

### Integration
- [ ] Frontend calls correct endpoint
- [ ] Token balance updates in UI
- [ ] Generated titles are relevant to keywords
- [ ] All languages generate correct titles
- [ ] Token modal workflow functions

## Example Usage

**Keyword:** `Du lịch Đà Nẵng`

**Generated Title (Vietnamese):**
```
Khám Phá Du Lịch Đà Nẵng: Hành Trình Đáng Nhớ Bên Bờ Biển Xanh
```

**Keyword:** `Best AI Tools 2024`

**Generated Title (English):**
```
The Ultimate Guide to Best AI Tools 2024: Transform Your Workflow
```

## Technical Details

### Token Cost Calculation
```typescript
const actualTokens = calculateActualTokens(data);
const tokensToDeduct = actualTokens > 0 ? actualTokens : requiredTokens;
```

### Quote Removal
```typescript
const generatedTitle = (data.choices[0]?.message?.content?.trim() || "")
  .replace(/^["']|["']$/g, ''); // Remove quotes from start and end
```

## Build Output
```
Frontend: dist/spa/assets/index-Bd0PsULn.js (965.98 kB)
Backend:  dist/server/node-build.mjs (302.07 kB)
Status:   ✅ Built successfully
```

## Related Features
- **AI Rewrite SEO Title** - Generate SEO-optimized title for SERP
- **AI Rewrite Meta Description** - Generate meta description
- **AI Rewrite (Content)** - Rewrite selected text in editor

## Future Enhancements
1. Add prompt customization in database (`ai_prompts` table)
2. Support multiple title variations to choose from
3. Add title A/B testing suggestions
4. Integrate with content calendar for title optimization
5. Add title performance analytics

## Notes
- Uses same token cost as SEO Title generation (300 tokens)
- Higher temperature (0.8) for more creative titles
- Can be used independently from SEO Title (different purposes)
- Generated title can be manually edited after generation
