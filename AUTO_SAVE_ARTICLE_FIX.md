# 🔧 Auto-Save Article After Generation

## 🐛 Vấn Đề

Khi generate article với Google Search (Gemini API):
- ✅ Streaming works OK
- ✅ Content được hiển thị
- ❌ **Article không được lưu vào database**
- ❌ **Nút "Tiếp tục chỉnh sửa" disabled**
- ❌ Console chỉ hiện "Streaming completed" và không có logs tiếp theo

## 🔍 Root Cause Analysis

### 1. Code Flow Expected
```
Streaming Completed
    ↓
Continuation Loop Check
    ↓
Generate Title
    ↓
Generate Slug
    ↓
Apply SEO Options
    ↓
Insert Images
    ↓
Calculate Tokens
    ↓
Deduct Tokens
    ↓
💾 SAVE TO DATABASE  ← Should happen here!
    ↓
Send Complete Event
    ↓
Close SSE Connection
```

### 2. Actual Behavior
```
Streaming Completed
    ↓
    X  ← Code stops here!
[No further logs]
[Article not saved]
[Complete event not sent]
```

### 3. Possible Causes

#### A. Exception trong continuation loop
```typescript
// Continuation loop may throw exception
while (attemptCount < maxAttempts) {
  // If checkOutlineCompletion() throws error
  const isOutlineComplete = checkOutlineCompletion(content, outlineToCheck);
  
  // If Gemini API call fails
  const geminiContinuationResponse = await fetch(...);
  
  // ❌ Any error here stops entire flow
}
```

#### B. Early return trong validation
```typescript
// If validation fails, might return early
if (!content) {
  sendSSE('error', { ... });
  res.end();
  return;  ← Early exit, no save!
}
```

#### C. Network timeout
- Gemini API with Google Search có thể mất nhiều thời gian
- Request timeout → connection closed
- Code không reach đến save section

## ✅ Solutions Implemented

### 1. **Comprehensive Logging** (để debug)

Added detailed logs at every step:

```typescript
// After Gemini streaming
console.log(`✅ [${requestId}] Gemini pseudo-streaming completed`);
console.log(`📊 [${requestId}] Content length: ${content.length} chars, finishReason: ${finishReason}`);

// Before continuation loop
console.log(`\n🔄 [${requestId}] Starting continuation check...`);
console.log(`📊 [${requestId}] Initial state: content=${content.length} chars, finishReason="${finishReason}"`);

// Inside continuation loop
console.log(`\n🔍 [${requestId}] Continuation loop iteration ${attemptCount + 1}/${maxAttempts}`);
console.log(`📋 [${requestId}] Outline complete: ${isOutlineComplete}, finishReason: "${finishReason}"`);

// After continuation loop
console.log(`\n📝 [${requestId}] Starting post-generation processing...`);
console.log(`📊 [${requestId}] Current content length: ${content.length} characters`);

// Title generation
console.log(`🏷️ [${requestId}] Generating article title...`);
console.log(`✅ [${requestId}] Title generated: "${title}"`);

// Slug generation
console.log(`🔗 [${requestId}] Generating slug...`);
console.log(`✅ [${requestId}] Slug generated: ${slug}`);

// SEO options
console.log(`🎨 [${requestId}] Applying SEO options...`);
console.log(`✅ [${requestId}] SEO options applied successfully`);

// Image insertion
console.log(`🖼️ [${requestId}] Starting auto image insertion...`);

// Token calculation
console.log(`🧮 [${requestId}] Calculating tokens used...`);

// Token deduction
console.log(`💰 [${requestId}] Deducting tokens from user account...`);
console.log(`✅ [${requestId}] Tokens deducted. Remaining: ${deductResult.remainingTokens}`);

// Database save
console.log(`💾 [${requestId}] Saving article to database...`);
console.log(`✅ [${requestId}] Article saved with ID: ${articleId}`);

// Complete event
console.log(`📤 [${requestId}] Sending complete event to client...`);
console.log(`✅ [${requestId}] Complete event sent successfully`);
console.log(`✅ [${requestId}] SSE connection closed`);
```

### 2. **Fixed SSE Error Handling**

Changed all error responses to use SSE format:

```typescript
// Before (❌ Breaks SSE connection)
} catch (error) {
  res.status(500).json({ error: "..." });
  return;
}

// After (✅ Proper SSE error)
} catch (error) {
  sendSSE('error', { 
    error: "...",
    details: errorMessage,
    timestamp: new Date().toISOString()
  });
  res.end();
  return;
}
```

### 3. **Moved sendSSE Outside Try Block**

Fixed scope issue where `sendSSE` wasn't available in catch block:

```typescript
const handleGenerateArticle: RequestHandler = async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // ✅ Define sendSSE BEFORE try block (available everywhere)
  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    // ... all logic here
  } catch (error) {
    // ✅ Now sendSSE is available!
    sendSSE('error', { ... });
    res.end();
  }
};
```

## 🧪 Testing Guide

### Test với Full Logging

1. **Start server in development mode:**
   ```bash
   npm run dev
   ```

2. **Generate article với Google Search enabled**

3. **Check backend console logs:**
   ```
   Expected flow:
   ========== 📝 GENERATE ARTICLE REQUEST [req_xxx] ==========
   📥 Received request body: { useGoogleSearch: true, ... }
   ✅ Outline generated successfully
   🔴 Status: Bắt đầu tạo bài viết...
   🔍 Adding Google Search tool to Gemini request
   ✅ Gemini response received, length: ~1234 words
   📤 Sending Gemini content via pseudo-streaming (5000 chars)
   ✅ Gemini pseudo-streaming completed
   📊 Content length after Gemini: 5000 chars, finishReason: stop
   
   🔄 Starting continuation check...
   📊 Initial state: content=5000 chars, finishReason="stop"
   🔍 Continuation loop iteration 1/10
   📋 Outline complete: true, finishReason: "stop"
   ✅ Article is complete, stopping continuation
   
   📝 Starting post-generation processing...
   📊 Current content length: 5000 characters
   🏷️ Generating article title...
   ✅ Title generated: "..."
   🔗 Generating slug...
   ✅ Slug generated: ...
   🎨 Applying SEO options...
   ✅ SEO options applied successfully
   🖼️ Starting auto image insertion...
   🧮 Calculating tokens used...
   💰 Deducting tokens from user account...
   ✅ Tokens deducted. Remaining: 9500
   💾 Saving article to database...
   ✅ Article saved with ID: 123
   📤 Sending complete event to client...
   ✅ Complete event sent successfully
   ✅ SSE connection closed
   ```

4. **If logs stop at "Streaming completed":**
   - Check if there's an exception in continuation loop
   - Check if Gemini API call is timing out
   - Check network logs for failed requests

5. **Check frontend console:**
   ```javascript
   Expected:
   ✅ Outline generated successfully
   🔴 Status: Bắt đầu tạo bài viết...
   ✅ Streaming completed
   ✅ Complete event received  ← Should see this!
   { articleId: 123, title: "...", slug: "..." }
   ```

### Debug Commands

```bash
# Check if article was saved
mysql> SELECT id, title, created_at FROM articles ORDER BY id DESC LIMIT 5;

# Check user tokens
mysql> SELECT id, tokens_remaining FROM users WHERE id = ?;

# Check token history
mysql> SELECT * FROM token_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;
```

## 📊 Expected vs Actual

| Step | Expected | Actual (Bug) | Fixed? |
|------|----------|--------------|--------|
| Streaming | ✅ Works | ✅ Works | N/A |
| Continuation loop | ✅ Enters | ❓ Unknown | 🔍 Added logs |
| Title generation | ✅ Generates | ❌ Not reached | 🔍 Added logs |
| Save to DB | ✅ Saves | ❌ Not reached | 🔍 Added logs |
| Complete event | ✅ Sent | ❌ Not sent | 🔍 Added logs |
| Button enabled | ✅ Enabled | ❌ Disabled | ⏳ Pending fix |

## 🎯 Next Steps

1. **Test with new logging** - Run and share backend console output
2. **Identify exact failure point** - Where does code stop?
3. **Fix root cause** - Based on logs
4. **Verify complete event** - Check frontend receives it
5. **Test button** - Confirm "Tiếp tục chỉnh sửa" works

## 📝 Notes

- All SSE error handling now consistent (uses `sendSSE()` not `res.json()`)
- `sendSSE` function now accessible in catch blocks
- Comprehensive logging at every step
- RequestId tracking for easy debugging
- Ready for production testing

---

**Status:** ⏳ **Waiting for test results with full logging**  
**Date:** 2026-01-12  
**Build:** ✅ Success (`dist/server/node-build.mjs 254.39 kB`)
