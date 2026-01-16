# Enhanced Continuation Logic - Complete Outline Writing

## Vấn đề

Khi sử dụng Gemini API với Google Search, AI chỉ viết được một phần outline rồi dừng lại, mặc dù outline chưa hoàn thành.

**Ví dụ:**
- Outline có 10 sections (H2)
- AI chỉ viết được 3-4 sections đầu
- finishReason = "STOP" nhưng bài viết chưa đủ

## Nguyên nhân

### 1. Logic cũ chỉ check finishReason
```typescript
// CŨ: Chỉ tiếp tục khi bị cắt bởi token limit
while (finishReason === "length" && attemptCount < maxAttempts) {
  // Continue...
}
```

**Vấn đề:** Gemini thường trả về `finishReason = "STOP"` ngay cả khi chưa viết xong outline, vì nó nghĩ đã viết đủ rồi.

### 2. Không verify outline completion
- Code có function `checkOutlineCompletion()` nhưng chỉ check TRƯỚC khi tiếp tục
- Nếu finishReason = "stop" thì không bao giờ vào loop continuation

## Giải pháp

### 1. Thay đổi logic continuation - Check cả outline completion

**TRƯỚC:**
```typescript
while (finishReason === "length" && attemptCount < maxAttempts) {
  if (outlineToCheck && checkOutlineCompletion(content, outlineToCheck)) {
    break; // Stop if outline complete
  }
  // Continue...
}
```

**SAU:**
```typescript
// Continue if EITHER:
// 1. Article was cut off (finishReason = "length"), OR
// 2. Outline is incomplete (regardless of finishReason)

while (attemptCount < maxAttempts) {
  const isOutlineComplete = outlineToCheck ? checkOutlineCompletion(content, outlineToCheck) : true;
  
  // Stop only if BOTH conditions are met:
  // 1. Outline is complete (or no outline to check)
  // 2. AND finish reason is "stop" (not cut off)
  if (isOutlineComplete && finishReason === "stop") {
    console.log(`✅ Article is complete, stopping continuation`);
    break;
  }
  
  // Otherwise, continue writing
  attemptCount++;
  // ...
}
```

**Logic mới:**
- ✅ Tiếp tục nếu outline chưa hoàn thành (kể cả finishReason = "stop")
- ✅ Tiếp tục nếu bị cắt bởi token limit (finishReason = "length")
- ✅ Chỉ dừng khi CẢ HAI: outline complete VÀ finishReason = "stop"

### 2. Cải thiện continuation prompt - Chi tiết missing sections

**TRƯỚC:**
```typescript
let continuationPrompt = `Continue writing the article from where it stopped. `;

if (outlineToCheck) {
  continuationPrompt += `Make sure to complete ALL sections from the outline...`;
}
```

**SAU:**
```typescript
// Extract missing sections
const missingSections = outlineH2s.filter(oh2 => 
  !contentH2s.some(ch2 => ch2.includes(oh2) || oh2.includes(ch2))
);

if (missingSections.length > 0) {
  console.log(`📋 Missing sections: ${missingSections.join(', ')}`);
  
  continuationPrompt = `You must continue writing the article. The following sections from the outline are still MISSING and MUST be written:

- Section 1 name
- Section 2 name
...

Full outline for reference:
${outlineToCheck}

Write the missing sections with 2-3 detailed paragraphs (100+ words each) per H2 section.`;
}
```

**Lợi ích:**
- 🎯 AI biết chính xác sections nào còn thiếu
- 📋 Liệt kê cụ thể từng section chưa viết
- ✅ Giảm risk AI bỏ qua sections hoặc viết lại sections đã có

### 3. Improved Gemini finishReason logging

**TRƯỚC:**
```typescript
finishReason = geminiData.candidates?.[0]?.finishReason === "MAX_TOKENS" ? "length" : "stop";
console.log(`✅ Gemini response received`);
```

**SAU:**
```typescript
const rawFinishReason = geminiData.candidates?.[0]?.finishReason;
// Gemini returns: STOP, MAX_TOKENS, SAFETY, RECITATION, OTHER
finishReason = (rawFinishReason === "MAX_TOKENS") ? "length" : "stop";

console.log(`✅ Gemini response received, length: ~${content.length / 4} words, finishReason: ${rawFinishReason} → ${finishReason}`);
```

**Lợi ích:**
- 📊 Biết chính xác Gemini trả về finishReason gì
- 🐛 Dễ debug khi có vấn đề
- 📈 Monitor được behavior của Gemini

### 4. Enhanced completion tracking

**Thêm log chi tiết:**
```typescript
if (continuationText) {
  content += "\n\n" + continuationText;
  const totalWords = Math.round(content.length / 4);
  console.log(`📊 Article total length: ~${totalWords} words (target: ${lengthConfig.minWords}-${lengthConfig.maxWords})`);
  
  // Re-check outline completion
  if (outlineToCheck) {
    const isNowComplete = checkOutlineCompletion(content, outlineToCheck);
    if (isNowComplete) {
      console.log(`✅ All outline sections now complete!`);
    }
  }
}
```

**Final summary:**
```typescript
if (attemptCount >= maxAttempts) {
  console.log(`⚠️ Reached maximum continuation attempts (${maxAttempts}), article may be incomplete`);
  
  if (outlineToCheck && !checkOutlineCompletion(content, outlineToCheck)) {
    console.log(`⚠️ WARNING: Outline is still incomplete after ${maxAttempts} attempts`);
  }
} else {
  console.log(`✅ Article generation completed in ${attemptCount} attempt(s)`);
}
```

## Testing Scenarios

### Scenario 1: Outline với 10 sections
1. AI viết 4 sections đầu
2. finishReason = "STOP"
3. ❌ CŨ: Dừng lại (vì finishReason != "length")
4. ✅ MỚI: Tiếp tục viết (vì outline chưa complete)

### Scenario 2: Bị cắt bởi token limit
1. AI viết đến giữa chừng
2. finishReason = "MAX_TOKENS" → "length"
3. ✅ CŨ: Tiếp tục (vì finishReason = "length")
4. ✅ MỚI: Tiếp tục (vì cả 2 điều kiện)

### Scenario 3: Outline hoàn thành
1. AI viết xong tất cả sections
2. finishReason = "STOP"
3. checkOutlineCompletion() = true
4. ✅ Dừng lại (đã hoàn thành)

## Expected Logs

```
🔍 Using Gemini API with Google Search knowledge
✅ Gemini response received, length: ~500 words, finishReason: STOP → stop
📊 Outline check: 4/10 H2 sections completed
⚠️ 6 sections still missing from outline
⚠️ Outline incomplete, forcing continuation (Attempt 2/10)
📋 Missing sections: Section 5, Section 6, Section 7...

📝 Gemini continuation received: +600 words, finishReason: STOP → stop
📊 Article total length: ~1100 words (target: 2000-3000)
📊 Outline check: 7/10 H2 sections completed
⚠️ 3 sections still missing from outline
⚠️ Outline incomplete, forcing continuation (Attempt 3/10)
📋 Missing sections: Section 8, Section 9, Section 10

📝 Gemini continuation received: +500 words, finishReason: STOP → stop
📊 Article total length: ~1600 words (target: 2000-3000)
📊 Outline check: 10/10 H2 sections completed
✅ All outline sections now complete!
✅ Article is complete, stopping continuation
✅ Article generation completed in 3 attempt(s)
```

## Code Location

**File:** `server/routes/ai.ts`
**Function:** `handleGenerateArticle`
**Lines:** ~1555-1770

## Key Changes Summary

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| **Continuation condition** | Only if `finishReason = "length"` | If incomplete outline OR cut off | ✅ Completes full outline |
| **Prompt specificity** | Generic "continue writing" | Lists exact missing sections | ✅ Better targeting |
| **Logging** | Basic finishReason | Raw + mapped finishReason | ✅ Better debugging |
| **Completion tracking** | Word count only | Word count + outline status | ✅ Clear progress |

## Benefits

1. ✅ **Always completes outline** - Không bỏ sót sections
2. 📊 **Better visibility** - Logs chi tiết từng bước
3. 🎯 **Smarter continuation** - Biết chính xác cần viết gì
4. 🐛 **Easier debugging** - Raw finishReason helps identify issues
5. 🚀 **Works with both providers** - OpenAI and Gemini

## Build Status

✅ Build successful
- Client: ✓ (940.10 kB)
- Server: ✓ (222.11 kB)

## Deployment

Ready to deploy:
1. Upload `dist/server/node-build.mjs`
2. Restart Node.js application
3. Test with long outlines (8-10 sections)
4. Monitor logs for completion tracking

**Date:** January 9, 2026
**Status:** ✅ ENHANCED & READY
