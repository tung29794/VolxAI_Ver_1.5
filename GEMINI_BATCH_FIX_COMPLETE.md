# ✅ Fix Gemini 2.5 Flash Batch Jobs - COMPLETE

## 🔍 Vấn đề gốc

Khi sử dụng **Gemini 2.5 Flash** trong chức năng **Viết bài hàng loạt (Batch Jobs)**, hệ thống báo lỗi:
- ❌ "Incorrect API key provided: AIzaSy..." 
- ❌ Batch jobs fail với message "Failed to generate outline from API"

## 🐛 Nguyên nhân

### 1. Frontend gửi Display Name thay vì Model ID
```tsx
// ❌ SAI - Trong BatchWriteByKeywords.tsx
model: formData.useGoogleSearch ? "Gemini 2.5 Flash" : formData.model
//                                  ^^^^^^^^^^^^^^^^
//                                  Display name, không phải model ID
```

### 2. Backend query sai cột database
```typescript
// ❌ SAI - Trong aiService.ts
const modelInfo = await query<any>(
  `SELECT model_name, provider FROM ai_models 
   WHERE model_name = ? AND is_active = TRUE`,
  [model]
);
//      ^^^^^^^^^^
//      Database không có cột model_name, chỉ có model_id
```

### 3. File deployment sai
- Upload `node-build.mjs` nhưng server chạy `server.mjs`
- Cần copy sang đúng file

## ✅ Giải pháp đã áp dụng

### Fix 1: Frontend - Gửi Model ID đúng
**File:** `client/components/BatchWriteByKeywords.tsx`

```tsx
// ✅ ĐÃ SỬA - Line 199
settings: {
  model: formData.useGoogleSearch ? "gemini-2.5-flash" : formData.model,
  //                                 ^^^^^^^^^^^^^^^^^^
  //                                 Model ID chính xác
  // ...
}

// ✅ ĐÃ SỬA - Line 574  
onChange={(e) => setFormData({
  ...formData,
  useGoogleSearch: e.target.checked,
  model: e.target.checked ? "gemini-2.5-flash" : formData.model
  //                         ^^^^^^^^^^^^^^^^^^
})}
```

### Fix 2: Backend - Query đúng cột database và hỗ trợ cả display_name
**File:** `server/services/aiService.ts`

```typescript
// ✅ ĐÃ SỬA - Hỗ trợ lookup cả model_id và display_name
const modelInfo = await query<any>(
  `SELECT model_id, provider FROM ai_models 
   WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE 
   LIMIT 1`,
  [model, model]
);

// ✅ Sử dụng model_id thay vì model_name
const { model_id, provider } = modelInfo[0];

return {
  apiKey: apiKeys[0].api_key,
  provider: provider,
  actualModel: model_id,  // ✅ Trả về model_id
};
```

### Fix 3: Deployment đúng file
```bash
# ✅ Copy file mới
cp ~/api.volxai.com/node-build.mjs ~/api.volxai.com/server.mjs

# ✅ Restart server
touch ~/api.volxai.com/restart.txt
```

## 📊 Database Schema

```sql
-- Bảng ai_models
CREATE TABLE ai_models (
  id INT PRIMARY KEY AUTO_INCREMENT,
  display_name VARCHAR(100) NOT NULL,  -- "Gemini 2.5 Flash"
  model_id VARCHAR(100) NOT NULL,      -- "gemini-2.5-flash" 
  provider ENUM('openai','google-ai',...),  -- "google-ai"
  is_active TINYINT(1) DEFAULT 1,
  cost_multiplier DECIMAL(10,2) DEFAULT 1.00
);

-- Data hiện tại
INSERT INTO ai_models VALUES
  (3, 'Gemini 2.5 Flash', 'gemini-2.5-flash', 'google-ai', 1, 3.00);
```

## 🎯 Luồng xử lý đúng

### 1. User chọn model trong UI
```
User clicks checkbox "Google Search"
  → Frontend tự động set model = "gemini-2.5-flash" (model_id)
```

### 2. Tạo Batch Job
```javascript
POST /api/batch-jobs
Body: {
  job_type: "batch_keywords",
  keywords: [...],
  settings: {
    model: "gemini-2.5-flash",  // ✅ Model ID
    useGoogleSearch: true
  }
}
```

### 3. Backend xử lý
```typescript
// batchJobProcessor.ts
await generateCompleteArticle({
  model: "gemini-2.5-flash",  // ✅ Từ job settings
  // ...
})

// articleGenerationService.ts  
const titleResult = await generateArticleTitle(
  keyword, userId, language, tone, "gemini-2.5-flash"
)

// aiService.ts → getApiKeyForModel()
const modelInfo = await query(
  `SELECT model_id, provider FROM ai_models 
   WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE`,
  ["gemini-2.5-flash", "gemini-2.5-flash"]
)
// → Returns: { model_id: "gemini-2.5-flash", provider: "google-ai" }

// aiService.ts → getApiKeyForModel()
const apiKeys = await query(
  `SELECT api_key FROM api_keys 
   WHERE provider = 'google-ai' AND is_active = TRUE`
)
// → Returns Google AI API key (AIzaSy...)

// aiService.ts → callAI()
if (provider === "google-ai") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  // ✅ Gọi đúng Google AI API với đúng key
}
```

## 🧪 Cách test

### 1. Test trên UI
1. Đăng nhập vào https://volxai.com
2. Vào **Account → Viết bài hàng loạt**
3. Nhập keywords (VD: "test gemini 1", "test gemini 2")
4. **Chọn model:** Gemini 2.5 Flash HOẶC bật checkbox "Google Search"
5. Click **Tạo batch job**
6. Vào tab **Batch Jobs** → Xem progress
7. ✅ Nên thấy: "Hoàn thành" với 0 failed items

### 2. Test bằng API
```bash
# Get auth token
TOKEN="your_auth_token"

# Create batch job
curl -X POST https://api.volxai.com/api/batch-jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "batch_keywords",
    "keywords": ["test keyword 1", "test keyword 2"],
    "settings": {
      "model": "gemini-2.5-flash",
      "language": "vi",
      "tone": "SEO Basic: Tập trung vào từ khóa",
      "length": "medium",
      "outlineOption": "no-outline",
      "useGoogleSearch": false
    }
  }'

# Check job status
JOB_ID=<id_from_response>
curl https://api.volxai.com/api/batch-jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Check logs
```bash
ssh jybcaorr@ghf57-22175.azdigihost.com -p 2210
tail -f ~/api.volxai.com/stderr.log | grep "BatchWorker\|getApiKeyForModel"
```

**Logs mong đợi:**
```
🔍 [getApiKeyForModel] Looking up model: "gemini-2.5-flash"
   Found model in DB: model_id="gemini-2.5-flash", provider="google-ai"
✅ [getApiKeyForModel] Found API key for provider "google-ai"
🟢 [callAI] Calling Google AI API...
✅ [callAI] Google AI success!
```

## 📝 Files đã sửa

1. ✅ `client/components/BatchWriteByKeywords.tsx` - Fixed 2 chỗ gửi model ID
2. ✅ `server/services/aiService.ts` - Fixed query database với đúng cột
3. ✅ Deployed cả frontend và backend

## 🚀 Deployment Checklist

- [x] Build project: `npm run build`
- [x] Upload frontend: `dist/spa/*` → `~/public_html/`
- [x] Upload backend: `dist/server/node-build.mjs` → `~/api.volxai.com/`
- [x] Copy to active file: `cp node-build.mjs server.mjs`
- [x] Restart server: `touch restart.txt`
- [x] Verify deployment: Check file timestamps
- [x] Test batch job with Gemini 2.5 Flash

## ✅ Kết quả

- ✅ Gemini 2.5 Flash model hoạt động bình thường trong Batch Jobs
- ✅ Backend query database đúng cột `model_id` và `display_name`
- ✅ API key được load đúng cho provider `google-ai`
- ✅ Không còn lỗi "Incorrect API key provided"
- ✅ Batch jobs complete thành công với 0 failed items

## 🔧 Maintenance Notes

### Nếu thêm model mới:
1. Insert vào `ai_models` với đầy đủ `model_id`, `display_name`, `provider`
2. Ensure `model_id` matches actual API model name
3. Frontend có thể gửi `model_id` HOẶC `display_name` - backend hỗ trợ cả 2

### Nếu batch job fail:
1. Check logs: `tail -f ~/api.volxai.com/stderr.log`
2. Verify model exists: `SELECT * FROM ai_models WHERE model_id = '...'`
3. Verify API key: `SELECT * FROM api_keys WHERE provider = '...'`
4. Check file version: `ls -lh ~/api.volxai.com/server.mjs`

---
**Fixed by:** AI Assistant  
**Date:** January 16, 2026  
**Status:** ✅ COMPLETE & DEPLOYED
