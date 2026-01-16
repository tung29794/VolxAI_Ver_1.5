# FIX: Batch Write - Load Models & Websites từ Database ✅

## 📋 Vấn đề
Trong tính năng **Viết bài hàng loạt** (Batch Write by Keywords):
- ❌ Dropdown **Chọn Model AI** không load dữ liệu từ database
- ❌ Dropdown **Kiến thức Website** không load dữ liệu từ database
- ❌ Frontend gọi sai API endpoint

## 🔍 Nguyên nhân
1. Frontend gọi `/api/ai-models` nhưng endpoint thực tế là `/api/models`
2. Frontend parse response sai:
   - Với models: Đúng là `data.models` ✅
   - Với websites: Dùng `data.websites` nhưng API trả về `result.data` ❌

## ✅ Các thay đổi đã thực hiện

### 1. Fix Frontend - `client/components/BatchWriteByKeywords.tsx`

#### a) Sửa API endpoint cho models
```typescript
// BEFORE (SAI)
const response = await fetch(buildApiUrl("/api/ai-models"), {

// AFTER (ĐÚNG)
const response = await fetch(buildApiUrl("/api/models"), {
```

#### b) Sửa parse response cho websites
```typescript
// BEFORE (SAI)
const data = await response.json();
setWebsites(data.websites || []);

// AFTER (ĐÚNG)
const result = await response.json();
// API trả về { success: true, data: [...] }
setWebsites(result.data || []);
```

#### c) Thêm logging để debug
```typescript
console.log("✅ AI Models loaded:", data);
console.log("✅ Websites loaded:", result);
```

### 2. Thêm Logging cho Backend

#### a) `server/routes/models.ts`
```typescript
console.log("[Models API] GET /api/models - Fetching active models");
console.log(`[Models API] Found ${models.length} active models:`, models.map(m => m.display_name));
```

#### b) `server/routes/websites.ts`
```typescript
console.log(`[Websites API] GET /api/websites - User ID: ${userId}`);
console.log(`[Websites API] Found ${websites.length} websites for user ${userId}`);
```

## 📊 Dữ liệu trong Database

### Bảng `ai_models`
```
| id | display_name      | provider   | model_id           | is_active |
|----|-------------------|------------|-------------------|-----------|
| 1  | GPT 4.1 MINI      | openai     | gpt-3.5-turbo     | 1         |
| 3  | Gemini 2.5 Flash  | google-ai  | gemini-2.5-flash  | 1         |
| 4  | GPT 4o MINI       | openai     | gpt-4o-mini       | 1         |
```

### Bảng `websites`
```
| id | name                | url                              | user_id | has_knowledge |
|----|---------------------|----------------------------------|---------|---------------|
| 1  | Da Nang Chill Ride  | https://danangchillride.com/     | 5       | 1             |
| 2  | Giá Xe 24h          | https://giaxe24h.com.vn          | 9       | 0             |
| 3  | Master Trading Wave | https://mastertradingwave.com/   | 5       | 0             |
```

## 🔌 API Endpoints

### 1. GET `/api/models`
- **Auth**: Không cần (public endpoint)
- **Response**:
```json
{
  "success": true,
  "models": [
    {
      "id": 1,
      "display_name": "GPT 4.1 MINI",
      "provider": "openai",
      "model_id": "gpt-3.5-turbo",
      "description": null,
      "is_active": 1,
      "display_order": 0,
      "max_tokens": 4000,
      "cost_multiplier": 1.0
    }
  ]
}
```

### 2. GET `/api/websites`
- **Auth**: Required (Bearer token)
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Da Nang Chill Ride",
      "url": "https://danangchillride.com/",
      "api_token": "...",
      "knowledge": "Website về tour du lịch Đà Nẵng...",
      "is_active": 1,
      "last_sync": null,
      "created_at": "2026-01-10T...",
      "updated_at": "2026-01-10T..."
    }
  ]
}
```

## 🧪 Testing

### Test trên Development
1. Start dev server:
   ```bash
   npm run dev
   ```

2. Mở trang Account → Tab "Viết bài hàng loạt"

3. Kiểm tra Browser Console:
   - Xem có log `✅ AI Models loaded:` không
   - Xem có log `✅ Websites loaded:` không
   - Kiểm tra dropdown có hiển thị options không

4. Kiểm tra Server Console:
   - Xem có log `[Models API] Found X active models` không
   - Xem có log `[Websites API] Found X websites` không

### Test trên Production
1. Build và deploy:
   ```bash
   npm run build
   npm start
   ```

2. Kiểm tra tương tự như Development

## 📁 Files đã sửa

1. ✅ `client/components/BatchWriteByKeywords.tsx`
   - Sửa API endpoint: `/api/ai-models` → `/api/models`
   - Sửa parse response websites: `data.websites` → `result.data`
   - Thêm console.log để debug
   - Thêm error handling

2. ✅ `server/routes/models.ts`
   - Thêm logging chi tiết cho endpoint GET /api/models

3. ✅ `server/routes/websites.ts`
   - Thêm logging chi tiết cho endpoint GET /api/websites

## 🎯 Kết quả mong đợi

Sau khi fix:
- ✅ Dropdown "Chọn Model AI" hiển thị:
  - GPT 4.1 MINI (openai) - 1x cost
  - Gemini 2.5 Flash (google-ai) - 1x cost
  - GPT 4o MINI (openai) - 1x cost

- ✅ Dropdown "Kiến thức Website" hiển thị:
  - Không sử dụng kiến thức website
  - Da Nang Chill Ride ✨ (có knowledge)
  - Giá Xe 24h
  - Master Trading Wave

- ✅ Khi chọn website có ✨, phần "👁️ Xem kiến thức website" hiển thị nội dung knowledge

## 🔧 Troubleshooting

### Nếu vẫn không load được models:
1. Check server logs: `[Models API] Found X active models`
2. Check browser console: `✅ AI Models loaded:`
3. Check network tab: Request đến `/api/models` status 200
4. Verify database: `SELECT * FROM ai_models WHERE is_active = TRUE`

### Nếu vẫn không load được websites:
1. Check authorization token có đúng không
2. Check user_id trong database
3. Check server logs: `[Websites API] Found X websites`
4. Verify database: `SELECT * FROM websites WHERE user_id = ?`

## 📌 Notes

- API `/api/models` là **public endpoint**, không cần authentication
- API `/api/websites` cần **Bearer token** trong header
- Frontend sử dụng `localStorage.getItem("authToken")` để lấy token
- Backend verify token qua JWT với secret từ `process.env.JWT_SECRET`

---

**Status**: ✅ COMPLETED
**Date**: 2026-01-16
**Tested**: Pending (cần test sau khi restart server)
