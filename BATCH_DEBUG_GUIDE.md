# 🔍 LOG MONITORING GUIDE

## Sau khi tạo batch job mới, chạy lệnh này để xem log real-time:

```bash
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com 'tail -f ~/api.volxai.com/stderr.log'
```

## Hoặc xem log đã thêm màu:

```bash
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com 'tail -f ~/api.volxai.com/stderr.log' | grep --color=always -E "━━━|🔵|🔑|✅|❌|⚠️|Provider|google-ai|openai|AIzaSy|sk-"
```

## Log cần kiểm tra:

### 1. Khi generateOutline() được gọi:
```
🔑 [generateOutline] Getting API key for model: "gemini-2.5-flash"
✅ [generateOutline] Got config: provider="google-ai", actualModel="gemini-2.5-flash"
```

### 2. Khi callAI() được gọi:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 [callAI] STARTING AI CALL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🏢 Provider: "google-ai" (type: string)
   🤖 Model: "gemini-2.5-flash"
   🔑 API Key: AIzaSy...
```

### 3. Check provider condition:
```
🔍 [callAI] Checking provider condition...
   provider === "google-ai": true     ← PHẢI LÀ true
   provider === "openai": false
```

### 4. Nếu gọi đúng Google AI:
```
✅ [callAI] Provider matched "google-ai" - Will call Google AI API
🟢 [callAI] Calling Google AI API...
   URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### 5. Nếu SAI - gọi OpenAI:
```
⚠️  [callAI] Provider did NOT match "google-ai" - Falling back to OpenAI
🟡 [callAI] Calling OpenAI API...
   ⚠️  WARNING: API Key starts with: AIzaSy...  ← LỖI!
   ⚠️  If this is a Google key (AIzaSy...), this will FAIL!
```

## Các lỗi có thể gặp:

### ❌ Lỗi 1: Provider sai
```
OpenAI API error: {
  message: 'Incorrect API key provided: AIzaSy...'
}
```
→ Nghĩa là: Provider bị set sai, đang gửi Google key tới OpenAI

### ❌ Lỗi 2: Query database fail
```
❌ [generateOutline] Failed to get API key for model: "gemini-2.5-flash"
```
→ Nghĩa là: Model không tìm thấy trong database

### ❌ Lỗi 3: Column không tồn tại
```
❌ [ArticleGenService] Unexpected error: Error: Unknown column 'keyword' in 'INSERT INTO'
```
→ ĐÃ SỬA: Đổi từ `keyword` thành `primary_keyword`

## ✅ Test Steps:

1. **Tạo batch job MỚI** với:
   - Model: Gemini 2.5 Flash
   - Keywords: ["test gemini debug"]
   - 1 keyword thôi để test nhanh

2. **Mở terminal và chạy**:
   ```bash
   chmod +x monitor_batch.sh && ./monitor_batch.sh
   ```

3. **Quan sát log** - Phải thấy:
   - ✅ Provider = "google-ai"
   - ✅ Calling Google AI API
   - ✅ Google AI success
   - ✅ Article created

4. **Nếu thấy lỗi**, screenshot và báo ngay!
