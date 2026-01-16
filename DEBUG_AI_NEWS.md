# 🐛 Debug Guide - AI Viết Tin Tức

## 📋 Thông Tin Deploy

**Date:** 14/01/2026  
**Status:** ✅ Deployed với debug logging chi tiết

## 🔧 Các Thay Đổi Đã Thực Hiện

### 1. Fix API Keys
- ✅ Lấy OpenAI API key từ database thay vì `process.env.OPENAI_API_KEY`
- ✅ Lấy Gemini API key từ database thay vì `process.env.GEMINI_API_KEY`
- ✅ Xác nhận API keys tồn tại trong database

### 2. Thêm Debug Logging Chi Tiết

**Các điểm log:**
- 🆕 Request header và body
- 🔐 Authentication validation
- 🔍 Database queries (API keys, prompts)
- 🌐 External API calls (OpenAI, Gemini)
- ✅ Success responses
- ❌ Error details với stack trace

**Format log:**
```
================================================================================
[timestamp] 🆕 NEW NEWS GENERATION REQUEST
[timestamp] Request body: {...}
[timestamp] 🔐 Step 1: Verifying authentication...
[timestamp] ✅ JWT valid, userId: 123
[timestamp] 🔑 Step 4.5: Getting OpenAI API key from database...
[timestamp] ✅ Retrieved OpenAI API key: sk-proj-...
[timestamp] 📝 Step 5.1: Generating article title...
================================================================================
```

## 🧪 Cách Test

### Option 1: Test trên Production (https://volxai.com)

1. Truy cập: https://volxai.com/account
2. Login với tài khoản của bạn
3. Vào tab "Viết bài"
4. Click "Viết Tin Tức"  
5. Nhập:
   - **Từ khóa:** "giá vàng hôm nay"
   - **Ngôn ngữ:** Vietnamese
   - **Model:** Gemini 2.0 Flash
6. Click "AI Write"
7. Mở DevTools Console (F12) để xem log phía client
8. Quan sát progress bar và kết quả

### Option 2: Xem Server Logs

```bash
# Watch logs real-time
./watch-logs.sh

# Hoặc SSH và check logs
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd /home/jybcaorr/api.volxai.com
# Tìm file logs
```

### Option 3: Test với cURL

```bash
# Get auth token first (thay YOUR_TOKEN)
TOKEN="YOUR_AUTH_TOKEN"

# Test generate news
curl -X POST https://api.volxai.com/api/ai/generate-news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "keyword": "giá vàng hôm nay",
    "language": "vi",
    "model": "gemini-2.0-flash"
  }'
```

## 🔍 Checklist Khi Gặp Lỗi

### Khi thấy "Generation failed"

#### 1. Kiểm tra Console (DevTools - F12)
```javascript
// Xem request payload
Network tab > Filter: generate-news > Request tab
{
  "keyword": "...",
  "language": "vi",
  "model": "..."
}

// Xem response
Network tab > Response tab
data: {"type":"error","message":"..."}
```

#### 2. Kiểm tra Server Logs
```bash
./watch-logs.sh
```

**Tìm các log pattern:**
- `❌ No token provided` → Lỗi authentication
- `❌ OpenAI API key not found` → Database không có API key
- `🌐 OpenAI title response status: 4XX` → OpenAI API key invalid
- `❌ FATAL ERROR` → Lỗi runtime

#### 3. Kiểm tra Database

```bash
# Check API keys trong database
node check_api_keys.js
```

**Cần có:**
- ✅ `provider='openai'`, `category='content'`, `is_active=1`
- ✅ `provider='google-ai'`, `category='content'`, `is_active=1`  
- ✅ `provider='serpapi'` hoặc `'serper'` hoặc `'zenserp'`, `category='search'`

#### 4. Test OpenAI API Key

```bash
# Test OpenAI key (thay YOUR_OPENAI_KEY)
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

#### 5. Test Gemini API Key

```bash
# Test Gemini key (thay YOUR_GEMINI_KEY)
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_GEMINI_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Say hello"}]
    }]
  }'
```

## 🛠️ Các Lỗi Thường Gặp

### Lỗi 1: "Generation failed" (không có details)
**Nguyên nhân:** Lỗi runtime trong server  
**Giải pháp:**
1. Check server logs: `./watch-logs.sh`
2. Tìm `❌ FATAL ERROR` trong logs
3. Xem stack trace để biết dòng code lỗi

### Lỗi 2: "No token provided"
**Nguyên nhân:** Không có authentication token  
**Giải pháp:**
1. Kiểm tra localStorage có `authToken` không
2. Thử logout và login lại
3. Check Network tab xem request có header `Authorization` không

### Lỗi 3: "OpenAI API key not found in database"
**Nguyên nhân:** Database thiếu OpenAI key hoặc `is_active=0`  
**Giải pháp:**
1. Chạy `node check_api_keys.js` để xem API keys
2. Vào Admin Panel → API Keys → Thêm/Activate OpenAI key
3. Ensure: `provider='openai'`, `category='content'`, `is_active=TRUE`

### Lỗi 4: OpenAI API returns 401 Unauthorized
**Nguyên nhân:** OpenAI API key không hợp lệ hoặc hết hạn  
**Giải pháp:**
1. Test API key bằng cURL (xem phần trên)
2. Nếu key invalid → Generate key mới từ https://platform.openai.com/api-keys
3. Update key trong database

### Lỗi 5: "All search APIs failed"
**Nguyên nhân:** Tất cả search API keys (SerpAPI/Serper/Zenserp) đều fail  
**Giải pháp:**
1. Check database có search API keys không
2. Test từng API key
3. Check quota còn lại của các keys

## 📊 Debug Output Examples

### Success Case
```
================================================================================
[1705234567890] 🆕 NEW NEWS GENERATION REQUEST
[1705234567890] Request body: {
  "keyword": "giá vàng hôm nay",
  "language": "vi",
  "model": "gemini-2.0-flash"
}
[1705234567891] 🔐 Step 1: Verifying authentication...
[1705234567892] ✅ JWT valid, userId: 5
[1705234567893] ✅ User exists in database
[1705234567894] 📝 Parsed request params: {keyword: "giá vàng...", ...}
[1705234567895] ✅ All validations passed
[1705234567950] 🔑 Step 4.5: Getting OpenAI API key from database...
[1705234567951] ✅ Retrieved OpenAI API key: sk-proj-0PW...
[1705234568000] 📝 Step 5.1: Generating article title...
[1705234568500] 🌐 OpenAI title response status: 200 OK
[1705234568501] ✅ Generated title: "Giá vàng hôm nay 14/1..."
...
[1705234570000] ✅ News generation complete
================================================================================
```

### Error Case
```
================================================================================
[1705234567890] 🆕 NEW NEWS GENERATION REQUEST
[1705234567891] ❌ No token provided
================================================================================

OR

================================================================================
[1705234567890] 🆕 NEW NEWS GENERATION REQUEST
...
[1705234567950] 🔑 Step 4.5: Getting OpenAI API key from database...
[1705234567951] 🔍 OpenAI API key query result: {rowsFound: 0, hasApiKey: false}
[1705234567952] ❌ OpenAI API key not found in database!
[1705234567953] 💡 Debug: Check if api_keys table has: provider='openai', category='content', is_active=TRUE
[1705234567954] ❌ FATAL ERROR in news generation
[1705234567955] Error message: OpenAI API key not found in database
================================================================================
```

## 📞 Support

Nếu vẫn gặp vấn đề sau khi check tất cả:
1. Capture screenshot của error trong Console
2. Copy server logs (nếu có access)
3. Mô tả các bước đã thử

## ✅ Final Checklist

Trước khi báo lỗi, hãy check:
- [ ] Đã login thành công
- [ ] Token còn hiệu lực (không expired)
- [ ] Database có OpenAI API key (`provider='openai'`, `is_active=TRUE`)
- [ ] Database có Search API key (SerpAPI/Serper/Zenserp)
- [ ] OpenAI API key valid (test bằng cURL)
- [ ] Server đã restart sau khi deploy
- [ ] Clear browser cache và reload page
- [ ] Check Console for errors (F12)
- [ ] Check Network tab for failed requests

---

**Last Updated:** 14/01/2026  
**Status:** Ready for testing with comprehensive debug logging
