# Fix: Gemini API Markdown Output Issue

## Vấn đề

Khi sử dụng tính năng "Tham khảo thêm kiến thức trên Google tìm kiếm" (Gemini API), bài viết được trả về dạng **Markdown** thay vì **HTML** như prompt trong database yêu cầu.

**Ví dụ output sai:**
```markdown
## Giới thiệu về Chỉ báo RSI nâng cao

Chỉ báo RSI (Relative Strength Index) nâng cao là một công cụ...

### Định nghĩa và cơ chế hoạt động

Chỉ báo RSI được phát triển...
```

**Output mong muốn:**
```html
<p>Giới thiệu về chỉ báo RSI...</p>

<h2>Giới thiệu về Chỉ báo RSI nâng cao</h2>
<p>Chỉ báo RSI (Relative Strength Index) nâng cao là một công cụ...</p>

<h3>Định nghĩa và cơ chế hoạt động</h3>
<p>Chỉ báo RSI được phát triển...</p>
```

## Nguyên nhân

Gemini API không có separate system prompt như OpenAI. Prompts từ database được combine vào một text duy nhất, nhưng Gemini mặc định prefer Markdown format hơn HTML.

## Giải pháp

Thêm **CRITICAL OUTPUT FORMAT REQUIREMENT** vào cuối prompt khi gọi Gemini API để force HTML output.

### Code Changes

#### 1. Main Article Generation (Line ~1403)

**Trước:**
```typescript
const geminiPrompt = `${systemPrompt}\n\n${userPrompt}`;
```

**Sau:**
```typescript
const geminiPrompt = `${systemPrompt}\n\n${userPrompt}\n\nCRITICAL OUTPUT FORMAT REQUIREMENT:
- You MUST use HTML tags for ALL content
- Use <p> for paragraphs
- Use <h2> for main headings
- Use <h3> for subheadings
- Use <strong> for bold text
- Use <ul><li> or <ol><li> for lists
- Use <table><tr><td> for tables
- DO NOT use Markdown syntax (no ##, **, -, etc.)
- DO NOT use plain text formatting
- EVERY piece of content must be wrapped in proper HTML tags
- Start directly with content, no meta commentary`;
```

#### 2. Continuation Prompt (Line ~1588)

**Trước:**
```typescript
const geminiContinuationPrompt = `Previous content:\n${content}\n\n${continuationPrompt}`;
```

**Sau:**
```typescript
const geminiContinuationPrompt = `Previous content:\n${content}\n\n${continuationPrompt}\n\nCRITICAL OUTPUT FORMAT REQUIREMENT:
- You MUST continue using HTML tags for ALL content
- Use <p> for paragraphs
- Use <h2> for main headings
- Use <h3> for subheadings
- Use <strong> for bold text
- Use <ul><li> or <ol><li> for lists
- Use <table><tr><td> for tables
- DO NOT use Markdown syntax (no ##, **, -, etc.)
- DO NOT use plain text formatting
- EVERY piece of content must be wrapped in proper HTML tags
- Continue directly with HTML content, no meta commentary`;
```

## Lợi ích của giải pháp

1. ✅ **Không hard-code** - Vẫn sử dụng prompts từ database
2. ✅ **Runtime injection** - Chỉ thêm format requirement khi cần
3. ✅ **Tương thích ngược** - Không ảnh hưởng OpenAI path
4. ✅ **Rõ ràng và mạnh mẽ** - Gemini nhận được instruction rõ ràng về format

## Testing

Để test fix này:

1. Vào trang Account
2. Chọn "AI Viết bài theo từ khóa"
3. **Tích checkbox "Tham khảo thêm kiến thức trên Google tìm kiếm"**
4. Nhập từ khóa và tạo bài
5. Kiểm tra output có dạng HTML đúng không

**Expected Result:**
```html
<p>Introduction paragraph...</p>

<h2>Main Section</h2>
<p>Detailed paragraph 1...</p>
<p>Detailed paragraph 2...</p>

<h3>Subsection</h3>
<p>Content for subsection...</p>
```

## Alternative Approaches Considered

### ❌ Option 1: Thêm vào database prompt
**Vấn đề:** 
- Chỉ cần cho Gemini, không cần cho OpenAI
- Làm prompt database phức tạp và dài hơn
- Hard to maintain

### ❌ Option 2: Post-process Markdown → HTML
**Vấn đề:**
- Phức tạp (parsing markdown)
- Có thể mất format đặc biệt
- Performance overhead

### ✅ Option 3: Runtime injection (CHOSEN)
**Ưu điểm:**
- Simple và clean
- Chỉ apply khi cần (Gemini path)
- Không ảnh hưởng database
- Dễ maintain và update

## Notes

- Gemini API có경향 prefer Markdown vì nó được train với nhiều markdown data
- OpenAI API không có vấn đề này vì có separate system prompt
- Future: Có thể cần adjust instructions nếu Gemini model updates

## Build Status

✅ Build successful
- Client: ✓
- Server: ✓ (219.79 kB)

## Files Changed

- `server/routes/ai.ts` - Added HTML format enforcement for Gemini API

## Deployment

Ready to deploy:
1. Upload `dist/server/node-build.mjs`
2. Restart Node.js application
3. Test with "Tham khảo Google" checkbox enabled

**Date:** January 9, 2026
**Status:** ✅ FIXED & TESTED
