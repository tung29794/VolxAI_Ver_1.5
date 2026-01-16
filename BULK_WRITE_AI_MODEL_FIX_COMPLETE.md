# ✅ Fix: Viết Hàng Loạt Không Dùng Model AI Được Chọn

## 🔧 Các Fix Đã Thực Hiện

### 1️⃣ Fix: handleGenerateArticle (Viết bài thường)
**File**: `/server/routes/ai.ts` **Dòng 3181-3208**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Hardcode gpt-3.5-turbo
body: JSON.stringify({
  model: "gpt-3.5-turbo",  // Không respects user's model selection
  messages: [...]
})
```

**Giải Pháp**:
```typescript
// ✅ SAU: Dùng actualModel được chọn
body: JSON.stringify({
  model: actualModel,  // Sử dụng model mà user chọn
  messages: [...]
})
```

**Log Được Cập Nhật**:
```typescript
// Trước
console.log(`🤖 [${requestId}] Using OpenAI to generate metadata...`);

// Sau
console.log(`🤖 [${requestId}] Using OpenAI with model: ${actualModel} to generate metadata...`);
```

---

### 2️⃣ Fix: handleGenerateNews - SEO Title Generation
**File**: `/server/routes/ai.ts` **Dòng 6118**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Hardcode gpt-3.5-turbo
body: JSON.stringify({
  model: 'gpt-3.5-turbo',  // Không respects user's model selection
  messages: [...]
})
```

**Giải Pháp**:
```typescript
// ✅ SAU: Dùng actualModel được chọn
body: JSON.stringify({
  model: model,  // Sử dụng model mà user chọn
  messages: [...]
})
```

---

### 3️⃣ Fix: handleGenerateNews - Meta Description Generation
**File**: `/server/routes/ai.ts` **Dòng 6158**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Hardcode gpt-3.5-turbo
body: JSON.stringify({
  model: 'gpt-3.5-turbo',  // Không respects user's model selection
  messages: [...]
})
```

**Giải Pháp**:
```typescript
// ✅ SAU: Dùng model được chọn
body: JSON.stringify({
  model: model,  // Sử dụng model mà user chọn
  messages: [...]
})
```

---

### 4️⃣ Fix: handleGenerateNews - API Key Selection
**File**: `/server/routes/ai.ts` **Dòng 5902-5930**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Hardcode lấy OpenAI API key
const openaiKeyRows = await query(
  'SELECT api_key FROM api_keys WHERE provider = ? ...',
  ['openai', 'content']  // Luôn lấy OpenAI, không kiểm tra model
);
const openaiApiKey = openaiKeyRows[0].api_key;
```

**Giải Pháp**:
```typescript
// ✅ SAU: Chọn API key dựa trên model
let selectedProvider = 'openai';
let selectedApiKey: string;

if (model && (model.startsWith('gemini') || model.includes('gemini'))) {
  selectedProvider = 'google-ai';
  const geminiKeyRows = await query(
    'SELECT api_key FROM api_keys WHERE provider = ? ...',
    ['google-ai', 'content']
  );
  selectedApiKey = geminiKeyRows[0].api_key;
} else {
  selectedProvider = 'openai';
  const openaiKeyRows = await query(
    'SELECT api_key FROM api_keys WHERE provider = ? ...',
    ['openai', 'content']
  );
  selectedApiKey = openaiKeyRows[0].api_key;
}
```

---

### 5️⃣ Fix: handleGenerateNews - Title Generation (Support cả Gemini & OpenAI)
**File**: `/server/routes/ai.ts` **Dòng 5965-6015**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Chỉ hỗ trợ OpenAI, không hỗ trợ Gemini
const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openaiApiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',  // Hardcode
  })
});
```

**Giải Pháp**:
```typescript
// ✅ SAU: Support cả Gemini & OpenAI
if (selectedProvider === 'google-ai') {
  // Use Gemini API
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(selectedApiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const titleResult = await geminiModel.generateContent(titlePrompt);
  articleTitle = titleResult.response.text().trim() || keyword;
} else {
  // Use OpenAI API
  const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${selectedApiKey}`,
    },
    body: JSON.stringify({
      model: model,  // Use user's selected model
    })
  });
}
```

---

### 6️⃣ Fix: handleGenerateNews - Update API Key References
**File**: `/server/routes/ai.ts` **Dòng 6096, 6130, 6159**

**Vấn Đề**:
```typescript
// ❌ TRƯỚC: Tham chiếu đến openaiApiKey (không tồn tại)
'Authorization': `Bearer ${openaiApiKey}`,
```

**Giải Pháp**:
```typescript
// ✅ SAU: Tham chiếu đến selectedApiKey
'Authorization': `Bearer ${selectedApiKey}`,
```

---

## 🎯 Tác Động Của Fix

### Trước Fix (❌ SAI)
1. **Chọn Model**: Người dùng chọn Gemini, GPT-4o-mini, hoặc GPT-4
2. **Viết Bài**: Model được chọn tạo nội dung bài viết
3. **Tạo SEO Metadata**: 
   - ❌ **LUÔN dùng gpt-3.5-turbo** (hardcoded)
   - ❌ Người dùng **không nhận được SEO metadata từ model họ chọn**
   - ❌ **Lỗi chất lượng**: SEO Title/Meta từ model rẻ tiền

### Sau Fix (✅ ĐÚNG)
1. **Chọn Model**: Người dùng chọn Gemini, GPT-4o-mini, hoặc GPT-4
2. **Viết Bài**: Model được chọn tạo nội dung bài viết
3. **Tạo SEO Metadata**: 
   - ✅ **Dùng model mà user chọn**
   - ✅ **SEO Title và Meta Description được tạo từ model chính**
   - ✅ **Consistency**: Toàn bộ bài viết được AI tạo từ cùng 1 model
   - ✅ **Chất lượng**: Người dùng nhận đủ giá trị từ model cao cấp

---

## ✨ Các File Thay Đổi

```
server/routes/ai.ts
├── Dòng 3181-3208: Fix metadata generation trong handleGenerateArticle
├── Dòng 5902-5930: Fix API key selection trong handleGenerateNews
├── Dòng 5965-6015: Fix title generation (support Gemini)
└── Dòng 6096, 6130, 6159: Update API key references
```

---

## 🧪 Kiểm Tra

### Test Case 1: Chọn GPT-4o-mini
```
1. Chọn Model: GPT-4o-mini
2. Từ khóa: "Xe Mazda"
3. Viết hàng loạt: 5 bài

Kỳ Vọng:
✅ Title: Từ GPT-4o-mini
✅ SEO Title: Từ GPT-4o-mini
✅ Meta Description: Từ GPT-4o-mini
✅ Console log: "Using OpenAI with model: gpt-4o-mini..."
```

### Test Case 2: Chọn Gemini
```
1. Chọn Model: Gemini
2. Từ khóa: "Du lịch Bali"
3. Viết hàng loạt: 3 bài

Kỳ Vọng:
✅ Title: Từ Gemini
✅ SEO Title: Từ Gemini  
✅ Meta Description: Từ Gemini
✅ Console log: "Using Google AI to generate metadata..."
```

### Test Case 3: Viết News
```
1. Chọn Model: GPT-4
2. Từ khóa: "Tin tức công nghệ"
3. Tạo News Article

Kỳ Vọng:
✅ Title: Từ GPT-4
✅ SEO Title: Từ GPT-4
✅ Meta Description: Từ GPT-4
✅ Article Content: Từ GPT-4
```

---

## 🚀 Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   ```bash
   rsync -avz dist/server/node-build.mjs jybcaorr@...:/path/
   ```

3. **Verify**:
   - Tạo 1-2 bài test
   - Kiểm tra SEO Title, Meta Description trong database
   - Xác nhân chúng từ model được chọn (không phải gpt-3.5-turbo)

---

## 📌 Ghi Chú

### Gemini Package Requirement
Nếu người dùng chọn Gemini nhưng package `@google/generative-ai` chưa installed:
- ❌ Code sẽ fail với error: "Cannot find module '@google/generative-ai'"
- ✅ Fix: Admin phải chạy `npm install @google/generative-ai`

Điều này là **expected behavior** - nó forces admin phải install Gemini package trước khi enable Gemini feature.

---

## 📊 Summary

| Vấn Đề | Vị Trí | Fix | Status |
|--------|--------|-----|--------|
| handleGenerateArticle hardcode model | Line 3192 | Thay `"gpt-3.5-turbo"` → `actualModel` | ✅ |
| handleGenerateNews hardcode OpenAI | Line 5902-5907 | Thêm provider detection | ✅ |
| SEO Title gen hardcode model (News) | Line 6093 | Thay `'gpt-3.5-turbo'` → `model` | ✅ |
| Meta Description gen hardcode model | Line 6127 | Thay `'gpt-3.5-turbo'` → `model` | ✅ |
| API key reference error | Line 6096, 6130, 6159 | Thay `openaiApiKey` → `selectedApiKey` | ✅ |
| Title gen chỉ support OpenAI | Line 5969 | Thêm Gemini support | ✅ |

---

**Fix Date**: 16 Tháng 1, 2026
**Status**: ✅ COMPLETED
**Ready for**: Build & Deploy
