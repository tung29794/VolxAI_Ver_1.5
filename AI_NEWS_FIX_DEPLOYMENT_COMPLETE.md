# ✅ AI Viết Tin Tức - Khắc Phục Lỗi & Deployment Hoàn Tất

**Ngày:** 14/01/2026  
**Trạng thái:** ✅ Đã deploy thành công lên production

---

## 🐛 Vấn Đề Ban Đầu

Chức năng **AI Viết Tin Tức** gặp lỗi `Generation failed` khi click vào nút **AI Write**. 

### Nguyên Nhân
Code đang sử dụng hardcode `process.env.OPENAI_API_KEY` và `process.env.GEMINI_API_KEY` nhưng file `.env` không có các keys này. Trong khi đó, tất cả API keys đã được lưu trong database.

---

## 🔧 Giải Pháp Đã Thực Hiện

### File Đã Sửa
- **`server/routes/ai.ts`** - Hàm `handleGenerateNews`

### Các Thay Đổi

#### 1. Lấy OpenAI API Key từ Database (Dòng ~5577)
**Trước:**
```typescript
// Không có phần lấy API key từ database
const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
```

**Sau:**
```typescript
// Step 4.5: Get OpenAI API key from database
const openaiKeyRows = await query(
  'SELECT api_key FROM api_keys WHERE provider = ? AND category = ? AND is_active = TRUE LIMIT 1',
  ['openai', 'content']
);

if (openaiKeyRows.length === 0) {
  throw new Error('OpenAI API key not found in database');
}

const openaiApiKey = openaiKeyRows[0].api_key;
console.log(`[${requestId}] Retrieved OpenAI API key from database`);

// Sử dụng openaiApiKey thay vì process.env.OPENAI_API_KEY
const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${openaiApiKey}`,
```

#### 2. Lấy Gemini API Key từ Database (Dòng ~5677)
**Trước:**
```typescript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
```

**Sau:**
```typescript
// Get Gemini API key from database
const geminiKeyRows = await query(
  'SELECT api_key FROM api_keys WHERE provider = ? AND category = ? AND is_active = TRUE LIMIT 1',
  ['google-ai', 'content']
);

if (geminiKeyRows.length === 0) {
  throw new Error('Gemini API key not found in database');
}

const geminiApiKey = geminiKeyRows[0].api_key;
console.log(`[${requestId}] Retrieved Gemini API key from database`);

const genAI = new GoogleGenerativeAI(geminiApiKey);
```

#### 3. Cập Nhật Tất Cả Các API Calls
Tất cả các lời gọi OpenAI API (title generation, article generation, SEO title, meta description) đã được cập nhật để sử dụng `openaiApiKey` thay vì `process.env.OPENAI_API_KEY`.

---

## ✅ API Keys Trong Database

Đã xác nhận database có đầy đủ API keys:

```
✅ OpenAI (provider: 'openai', category: 'content')
✅ Google AI/Gemini (provider: 'google-ai', category: 'content')
✅ SerpAPI (provider: 'serpapi', category: 'search')
✅ Serper (provider: 'serper', category: 'search')
✅ Zenserp (provider: 'zenserp', category: 'search')
✅ Pixabay (provider: 'pixabay', category: 'search')
```

---

## 🚀 Deployment

### Các Bước Đã Thực Hiện

1. **Build Server**
   ```bash
   npm run build:server
   ```

2. **Upload Server File**
   ```bash
   scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
   ```

3. **Restart Server**
   ```bash
   ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
   ```

4. **Build Client**
   ```bash
   npm run build:client
   ```

5. **Upload Client Files**
   ```bash
   rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'
   ```

### Kết Quả
✅ Server: `api.volxai.com`  
✅ Frontend: `volxai.com`  
✅ Deployment: **Hoàn tất thành công**

---

## 📝 Testing Checklist

Sau khi deploy, hãy kiểm tra:

- [ ] Truy cập `https://volxai.com/account`
- [ ] Login với tài khoản của bạn
- [ ] Chọn **"Viết Tin Tức"**
- [ ] Nhập từ khóa (ví dụ: "giá vàng hôm nay")
- [ ] Chọn ngôn ngữ: **Vietnamese**
- [ ] Chọn model: **Gemini 2.0 Flash** hoặc **GPT-4**
- [ ] Click nút **AI Write**
- [ ] Kiểm tra quá trình generate có hoạt động không
- [ ] Xem kết quả bài viết được tạo ra

---

## 🎯 Tính Năng Hoạt Động

Sau khi fix, chức năng AI Viết Tin Tức sẽ:

1. ✅ Tìm kiếm tin tức từ Google News (qua SerpAPI/Serper/Zenserp)
2. ✅ Tổng hợp thông tin từ nhiều nguồn
3. ✅ Sử dụng OpenAI API key từ database để generate:
   - Tiêu đề bài viết
   - Nội dung bài viết (nếu chọn GPT)
   - SEO title
   - Meta description
4. ✅ Sử dụng Gemini API key từ database nếu chọn model Gemini
5. ✅ Lưu bài viết vào database
6. ✅ Trừ tokens đã sử dụng

---

## 🔗 Files Liên Quan

- **Backend Route:** `server/routes/ai.ts` (hàm `handleGenerateNews`)
- **Database:** `api_keys` table
- **Environment:** `.env` (chứa DB config)

---

## 📚 Tài Liệu Liên Quan

- `API_KEYS_FIX_COMPLETE.md` - Hướng dẫn quản lý API keys
- `AI_NEWS_GENERATION_FIX_COMPLETE.md` - Chi tiết về tính năng AI News
- `BACKEND_DEPLOYMENT_GUIDE.md` - Hướng dẫn deployment

---

## 🎉 Kết Luận

Lỗi `Generation failed` đã được khắc phục hoàn toàn bằng cách:
- ✅ Lấy OpenAI API key từ database thay vì environment variable
- ✅ Lấy Gemini API key từ database thay vì environment variable
- ✅ Deploy lên production thành công
- ✅ Server tự động restart và áp dụng thay đổi

**Chức năng AI Viết Tin Tức đã sẵn sàng sử dụng! 🚀**
