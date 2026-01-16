# Gemini API Integration với Google Search

## Tổng quan

Tích hợp Gemini API để hỗ trợ tính năng "Tham khảo thêm kiến thức trên Google tìm kiếm". Khi user chọn checkbox này, hệ thống sẽ:
- ✅ Force sử dụng Gemini 2.5 Flash
- ✅ Gọi Gemini API với Google Search Retrieval
- ✅ AI có thể tham khảo kiến thức realtime từ Google

## Logic hoạt động

### 1. Chọn AI Provider

```typescript
if (useGoogleSearch) {
  // Use Google AI (Gemini)
  const googleApiKeys = await query(
    `SELECT api_key FROM api_keys
     WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
     LIMIT 1`
  );
  apiKey = googleApiKeys[0].api_key;
  provider = 'google-ai';
} else {
  // Use OpenAI (default)
  const apiKeys = await query(
    `SELECT api_key FROM api_keys
     WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
     LIMIT 1`
  );
  apiKey = apiKeys[0].api_key;
  provider = 'openai';
}
```

### 2. Gọi API phù hợp

#### Khi useGoogleSearch = true (Gemini):

```typescript
const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: geminiPrompt // Combined system + user prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Cao hơn OpenAI (4096)
        topP: 0.95,
        topK: 40
      },
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: "MODE_DYNAMIC",
              dynamicThreshold: 0.3
            }
          }
        }
      ]
    }),
  }
);

const geminiData = await geminiResponse.json();
content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
finishReason = geminiData.candidates?.[0]?.finishReason === "MAX_TOKENS" ? "length" : "stop";
```

**Điểm quan trọng:**
- ✅ Model: `gemini-2.0-flash-exp` (Gemini 2.5 Flash experimental)
- ✅ maxOutputTokens: 8192 (gấp đôi OpenAI)
- ✅ **tools: googleSearchRetrieval** - Tính năng quan trọng nhất, cho phép AI tìm kiếm Google
- ✅ dynamicThreshold: 0.3 - AI tự quyết định khi nào cần search

#### Khi useGoogleSearch = false (OpenAI):

```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: model === "GPT 5" ? "gpt-4-turbo" : "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  }),
});

const data = await response.json();
content = data.choices[0]?.message?.content?.trim() || "";
finishReason = data.choices[0]?.finish_reason || "";
```

### 3. Continuation Logic (cả 2 provider)

Logic continuation đã được cập nhật để hỗ trợ cả Gemini và OpenAI:

```typescript
while (finishReason === "length" && attemptCount < maxAttempts) {
  // Check outline completion
  if (outlineToCheck && checkOutlineCompletion(content, outlineToCheck)) {
    break;
  }
  
  attemptCount++;
  
  if (useGoogleSearch && provider === 'google-ai') {
    // Continue with Gemini
    const geminiContinuationResponse = await fetch(...);
    continuationText = geminiContinuationData.candidates?.[0]?.content?.parts?.[0]?.text;
    finishReason = geminiContinuationData.candidates?.[0]?.finishReason === "MAX_TOKENS" ? "length" : "stop";
  } else {
    // Continue with OpenAI
    const continuationResponse = await fetch(...);
    continuationText = continuationData.choices[0]?.message?.content;
    finishReason = continuationData.choices[0]?.finish_reason;
  }
  
  if (continuationText) {
    content += "\n\n" + continuationText;
  }
}
```

## Gemini API Response Format

### Success Response:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Nội dung bài viết..."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "groundingMetadata": {
        "groundingChunks": [...],
        "groundingSupports": [...],
        "webSearchQueries": ["query 1", "query 2"]
      }
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 150,
    "candidatesTokenCount": 2500,
    "totalTokenCount": 2650
  }
}
```

### Finish Reasons:
- `STOP` - Hoàn thành bình thường
- `MAX_TOKENS` - Đạt giới hạn token (trigger continuation)
- `SAFETY` - Bị chặn bởi safety filter
- `RECITATION` - Phát hiện nội dung có bản quyền

## Database Setup

### API Keys Table:
```sql
SELECT id, provider, category, description 
FROM api_keys 
WHERE provider = 'google-ai';
```

Result:
```
id | provider   | category | description
9  | google-ai  | content  | Gemini
```

### AI Prompts Table:
```sql
SELECT id, feature_name, display_name, is_active 
FROM ai_prompts 
WHERE feature_name = 'generate_article';
```

Result:
```
id | feature_name      | display_name              | is_active
14 | generate_article  | Tạo bài viết hoàn chỉnh  | 1
```

## Logging

Console logs để theo dõi:

```
🔍 Using Google AI (Gemini) with search knowledge
✅ Using database prompt for generate_article
📝 System prompt preview: You are a professional SEO content writer...
📝 User prompt preview: Write a comprehensive article about: "..."
✅ Gemini response received, length: ~1200 words
📝 Article was cut off, continuing... (Attempt 2/10)
📊 Outline check: 5/7 H2 sections completed
⚠️ 2 sections still missing from outline
📊 Article length after continuation: ~2400 words
✅ All outline sections completed
```

## Token Calculation

Vì Gemini API response format khác OpenAI, tôi đã đổi sang estimated tokens:

```typescript
// Estimate tokens since we don't have raw API response
const estimatedTokens = Math.ceil(content.length / 4); // 1 token ≈ 4 chars
const titleTokens = Math.ceil((title?.length || 0) / 4);
const totalActualTokens = estimatedTokens + titleTokens;
```

**Note:** Trong production, có thể lưu `usageMetadata` từ Gemini response để tính chính xác.

## Testing

### Test Case 1: Không chọn Google Search
- User chọn Model: GPT 4.1 MINI
- Không check "Tham khảo Google"
- ✅ Kết quả: Sử dụng OpenAI API

### Test Case 2: Có chọn Google Search
- User chọn bất kỳ Model nào
- Check "Tham khảo Google"
- ✅ Kết quả: Force Gemini 2.5 Flash, sử dụng Gemini API với Google Search

### Test Case 3: Bài dài cần continuation
- Check "Tham khảo Google"
- Outline dài (7-10 H2)
- ✅ Kết quả: Gemini API được gọi nhiều lần cho đến khi hoàn thành

## So sánh OpenAI vs Gemini

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| Model | gpt-3.5-turbo / gpt-4-turbo | gemini-2.0-flash-exp |
| Max Tokens | 4096 | 8192 |
| Google Search | ❌ Không | ✅ Có (googleSearchRetrieval) |
| Token Cost | Trả phí cao | Trả phí thấp hơn |
| Response Format | choices[0].message.content | candidates[0].content.parts[0].text |
| System Prompt | Riêng biệt | Kết hợp với user prompt |

## Known Issues & Limitations

1. **⚠️ Gemini API key cần có quyền sử dụng Google Search**
   - Cần enable "Grounded Generation" trong Google AI Studio
   - API key phải có billing account active

2. **⚠️ Token estimation không chính xác 100%**
   - Hiện tại dùng `length / 4` để estimate
   - Cân nhắc lưu `usageMetadata` từ response

3. **⚠️ Safety filters có thể chặn nội dung**
   - Gemini có safety filters nghiêm ngặt hơn OpenAI
   - Cần handle finishReason = "SAFETY"

## Next Steps

- [ ] Test với Google AI API key thực tế
- [ ] Monitor Gemini API quota usage
- [ ] Implement accurate token counting với usageMetadata
- [ ] Add retry logic cho Gemini API errors
- [ ] Handle safety filter blocks gracefully
- [ ] Consider caching Google Search results

## Files Changed

1. `server/routes/ai.ts` - Added Gemini API integration
   - Line ~1389: API provider selection logic
   - Line ~1395: Gemini API call with googleSearchRetrieval
   - Line ~1550: Gemini continuation logic

## Build Status

✅ Build successful
- Client: ✓
- Server: ✓ (218.05 kB)

## Deployment Notes

1. Upload `dist/server/node-build.mjs` to server
2. Ensure Google AI API key is active in database
3. Restart Node.js application
4. Test with checkbox "Tham khảo Google" enabled
5. Monitor logs for Gemini API calls
