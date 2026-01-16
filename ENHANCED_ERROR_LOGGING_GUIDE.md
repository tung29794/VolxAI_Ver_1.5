# Enhanced Error Logging & Debugging Guide

## Vấn đề

User báo lỗi 500 khi sử dụng "AI Outline" + "Tham khảo Google", nhưng không biết lỗi cụ thể là gì vì:
- Console chỉ hiển thị "500 ()" không có error message
- Server logs không đủ chi tiết
- Không biết lỗi xảy ra ở đâu trong flow

## Giải pháp: Comprehensive Error Logging

### 1. Request Tracking với Unique ID

**TRƯỚC:**
```typescript
const handleGenerateArticle: RequestHandler = async (req, res) => {
  try {
    console.log('📥 Received request body:', { ... });
    // ...
  } catch (error) {
    console.error("Error generating article:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

**SAU:**
```typescript
const handleGenerateArticle: RequestHandler = async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n========== 📝 GENERATE ARTICLE REQUEST [${requestId}] ==========`);
  
  try {
    if (!(await verifyUser(req, res))) {
      console.log(`❌ [${requestId}] User verification failed`);
      return;
    }
    
    console.log(`📥 [${requestId}] Received request body:`, {
      keyword,
      language,
      outlineType,
      hasCustomOutline: !!customOutline,
      customOutlineLength: customOutline?.length || 0,
      useGoogleSearch: useGoogleSearch || false
    });
    
    // ... rest of code with [${requestId}] prefix
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating article:`, error);
    // ...
  }
};
```

**Lợi ích:**
- ✅ Mỗi request có unique ID để track qua toàn bộ flow
- ✅ Dễ filter logs khi có nhiều requests đồng thời
- ✅ Timestamp included trong ID để biết thời gian request

### 2. Detailed Error Response

**TRƯỚC:**
```typescript
} catch (error) {
  console.error("Error generating article:", error);
  res.status(500).json({ error: "Internal server error" });
}
```

**SAU:**
```typescript
} catch (error) {
  console.error("❌ Error generating article:", error);
  
  // Log detailed error information
  if (error instanceof Error) {
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
  
  // Return more specific error message
  const errorMessage = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ 
    error: "Failed to generate article",
    details: errorMessage,
    timestamp: new Date().toISOString()
  });
}
```

**Response Example:**
```json
{
  "error": "Failed to generate article",
  "details": "Gemini API key not configured",
  "timestamp": "2026-01-09T10:30:45.123Z"
}
```

**Lợi ích:**
- ✅ Frontend nhận được error message cụ thể
- ✅ User thấy được vấn đề (API key, network, etc.)
- ✅ Timestamp giúp track logs

### 3. Gemini API Error Handling

**TRƯỚC:**
```typescript
if (!geminiResponse.ok) {
  const errorData = await geminiResponse.json();
  console.error("Gemini API error:", errorData);
  res.status(500).json({ error: "Failed to call Gemini API" });
  return;
}

const geminiData = await geminiResponse.json();
content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

if (!content) {
  res.status(500).json({ error: "No response from Gemini API" });
  return;
}
```

**SAU:**
```typescript
if (!geminiResponse.ok) {
  const errorData = await geminiResponse.json().catch(() => ({}));
  console.error("❌ Gemini API error response:", {
    status: geminiResponse.status,
    statusText: geminiResponse.statusText,
    errorData
  });
  res.status(500).json({ 
    error: "Failed to call Gemini API",
    details: errorData?.error?.message || geminiResponse.statusText,
    status: geminiResponse.status
  });
  return;
}

const geminiData = await geminiResponse.json();

// Check for safety blocks or other issues
if (!geminiData.candidates || geminiData.candidates.length === 0) {
  console.error("❌ Gemini returned no candidates:", geminiData);
  res.status(500).json({ 
    error: "Gemini API returned no content",
    details: "Content may have been blocked by safety filters or other restrictions",
    rawResponse: geminiData
  });
  return;
}

content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

if (!content) {
  console.error("❌ Gemini response has no text content");
  res.status(500).json({ 
    error: "No response from Gemini API",
    details: "Gemini returned empty content",
    finishReason: rawFinishReason
  });
  return;
}
```

**Improved Error Messages:**

| Scenario | Old | New |
|----------|-----|-----|
| API returns 403 | "Failed to call Gemini API" | "Failed to call Gemini API<br>Details: API key invalid or expired<br>Status: 403" |
| Safety filter blocks | "No response from Gemini API" | "Gemini API returned no content<br>Details: Content blocked by safety filters" |
| Empty content | "No response from Gemini API" | "No response from Gemini API<br>Details: Gemini returned empty content<br>Finish reason: STOP" |
| Network error | "Failed to call Gemini API" | "Failed to call Gemini API<br>Details: fetch failed<br>Type: TypeError" |

### 4. Outline Generation Tracking

**TRƯỚC:**
```typescript
if ((outlineType === "no-outline" || outlineType === "ai-outline") && 
    (!customOutline || !customOutline.trim())) {
  console.log(`📝 Auto-generating outline for '${outlineType}' option...`);
  // ...
}
```

**SAU:**
```typescript
if ((outlineType === "no-outline" || outlineType === "ai-outline") && 
    (!customOutline || !customOutline.trim())) {
  console.log(`📝 [${requestId}] Auto-generating outline for '${outlineType}' option...`);
  console.log(`   Keyword: "${primaryKeyword}", Length: ${length}, Secondary: [${secondaryKeywords.join(', ')}]`);
  // ...
}
```

**Log Output:**
```
📝 [req_1704786645123_abc123def] Auto-generating outline for 'ai-outline' option...
   Keyword: "chỉ báo RSI", Length: medium, Secondary: []
✅ Auto-generated outline successfully
📋 Using auto-generated outline (ai-outline) with 2 paragraphs per H2
```

## Expected Logs After Deployment

### Successful Request:
```
========== 📝 GENERATE ARTICLE REQUEST [req_1704786645123_abc123def] ==========
📥 [req_1704786645123_abc123def] Received request body: {
  keyword: 'chỉ báo RSI',
  language: 'vi',
  outlineType: 'ai-outline',
  hasCustomOutline: true,
  customOutlineLength: 450,
  useGoogleSearch: true
}
🔑 Keywords parsed: { primary: 'chỉ báo RSI', secondary: [] }
🔍 Using Google AI (Gemini) with search knowledge
📋 Using custom outline (ai-outline)
🔍 Using Gemini API with Google Search knowledge
✅ Gemini response received, length: ~1200 words, finishReason: STOP → stop
✅ Content format validated successfully
📊 Outline check: 10/10 H2 sections completed
✅ All outline sections now complete!
✅ Article generation completed in 1 attempt(s)
✅ Article generated successfully - Deducting 1500 tokens
```

### Error: API Key Invalid:
```
========== 📝 GENERATE ARTICLE REQUEST [req_1704786650456_xyz789abc] ==========
📥 [req_1704786650456_xyz789abc] Received request body: { ... }
🔍 Using Google AI (Gemini) with search knowledge
❌ Gemini API error response: {
  status: 403,
  statusText: 'Forbidden',
  errorData: {
    error: {
      code: 403,
      message: 'API key not valid. Please pass a valid API key.',
      status: 'PERMISSION_DENIED'
    }
  }
}

Response to client:
{
  "error": "Failed to call Gemini API",
  "details": "API key not valid. Please pass a valid API key.",
  "status": 403
}
```

### Error: Safety Filter:
```
========== 📝 GENERATE ARTICLE REQUEST [req_1704786655789_mno456pqr] ==========
📥 [req_1704786655789_mno456pqr] Received request body: { ... }
🔍 Using Gemini API with Google Search knowledge
❌ Gemini returned no candidates: {
  candidates: [],
  promptFeedback: {
    blockReason: 'SAFETY',
    safetyRatings: [...]
  }
}

Response to client:
{
  "error": "Gemini API returned no content",
  "details": "Content may have been blocked by safety filters or other restrictions",
  "rawResponse": { ... }
}
```

### Error: Network Timeout:
```
========== 📝 GENERATE ARTICLE REQUEST [req_1704786660123_stu901vwx] ==========
📥 [req_1704786660123_stu901vwx] Received request body: { ... }
🔍 Using Gemini API with Google Search knowledge
❌ Gemini API exception: TypeError: fetch failed
Error name: TypeError
Error message: fetch failed
Error stack: TypeError: fetch failed
    at node:internal/deps/undici/undici:...

Response to client:
{
  "error": "Failed to call Gemini API",
  "details": "fetch failed",
  "type": "TypeError"
}
```

## Debugging Workflow

### Step 1: Check Server Logs
```bash
# SSH vào server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Tail logs (adjust path theo hosting setup)
pm2 logs volxai --lines 100
# hoặc
tail -f /path/to/app/logs/error.log
```

### Step 2: Find Request ID
```
# Tìm request gần nhất có lỗi
grep "❌" logs/error.log | tail -20

# Tìm request theo keyword
grep "chỉ báo RSI" logs/error.log
```

### Step 3: Track Full Flow
```
# Get all logs cho một request ID cụ thể
grep "req_1704786645123_abc123def" logs/app.log
```

### Step 4: Identify Error Type

| Error Pattern | Likely Cause | Solution |
|---------------|--------------|----------|
| `API key not valid` | Google AI API key sai/hết hạn | Check Admin > Quản lý API > Google AI key |
| `SAFETY` block | Content vi phạm policy | Thay đổi keyword hoặc outline |
| `fetch failed` | Network timeout | Check internet connection, retry |
| `No candidates` | Gemini không generate | Check prompt, try again |
| `Empty content` | Response parsing issue | Check Gemini API version |

## Testing Checklist

- [ ] Test với "AI Outline" + "Tham khảo Google"
- [ ] Test với invalid API key → Check error message
- [ ] Test với sensitive keyword → Check safety block handling
- [ ] Test với network disconnect → Check timeout error
- [ ] Check server logs có requestId
- [ ] Check frontend console hiển thị error details
- [ ] Verify error messages user-friendly

## Build Status

✅ Build successful
- Client: ✓ (940.10 kB)
- Server: ✓ (227.13 kB)

## Deployment

1. Upload `dist/server/node-build.mjs`
2. Restart Node.js application
3. Test "AI Outline" + "Tham khảo Google" lại
4. Check logs với requestId
5. Nếu vẫn lỗi 500, xem server logs để biết lỗi cụ thể

**Date:** January 9, 2026
**Status:** ✅ ENHANCED ERROR LOGGING
