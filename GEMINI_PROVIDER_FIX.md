# Tạo file tóm tắt vấn đề và giải pháp

## 🎯 VẤN ĐỀ THỰC SỰ: Provider bị nhầm

### ❌ Lỗi gốc:
```
OpenAI API error: {
  message: 'Incorrect API key provided: AIzaSyBU...'
}
```

**Google AI API key** (AIzaSy...) đang được gửi tới **OpenAI endpoint**!

### 🔍 Nguyên nhân:
File `server.mjs` trên server vẫn là **bản cũ** với query sai:

```typescript
// ❌ BẢN CŨ - Query cột không tồn tại
SELECT model_name, provider FROM ai_models 
WHERE model_name = ?
```

Database chỉ có cột `model_id`, không có `model_name`, nên query trả về rỗng → fallback về OpenAI provider → gửi sai API key.

### ✅ Giải pháp:
1. **Sửa query** để dùng đúng cột:
```typescript
// ✅ BẢN MỚI - Query đúng cột
SELECT model_id, provider FROM ai_models 
WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE
```

2. **Build lại và deploy đúng cách:**
```bash
# Build server
npm run build:server

# Upload
scp dist/server/node-build.mjs server:/api.volxai.com/

# Copy sang file đang chạy
cp node-build.mjs server.mjs

# Restart
touch restart.txt
```

### 📋 Checklist Deploy:
- [x] Sửa code trong `server/services/aiService.ts`
- [x] Build lại: `npm run build:server`
- [x] Upload file mới
- [x] Copy: `node-build.mjs` → `server.mjs`  
- [x] Restart server
- [ ] **TEST BATCH JOB MỚI VỚI GEMINI**

## 🧪 Cách test:
1. Tạo batch job mới với Gemini 2.5 Flash
2. Theo dõi log: `tail -f ~/api.volxai.com/stderr.log`
3. Mong đợi thấy:
```
✅ [getApiKeyForModel] Found model in DB: model_id="gemini-2.5-flash", provider="google-ai"
🟢 [callAI] Calling Google AI API...
✅ [callAI] Google AI success!
```

4. **KHÔNG được thấy:**
```
❌ OpenAI API error: Incorrect API key provided: AIzaSy...
```
