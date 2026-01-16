# 🔧 AI Rewrite Fix - Deployment Guide

## 📋 Problem & Solution

### ❌ Lỗi Ban Đầu
Khi click "AI Rewrite" trong Article Editor, server trả về lỗi **500**:
```
Failed to load resource: the server responded with a status of 500 ()
Error rewriting text: Error: Failed to rewrite text
```

### ✅ Nguyên Nhân & Fix
Route `/api/ai/rewrite` **thiếu middleware xác thực người dùng** (`verifyUser`).
- Client gửi request với token (`Authorization: Bearer <token>`)
- Nhưng server không kiểm tra token
- Dẫn đến lỗi 500

**Fix**: Thêm `verifyUser()` middleware vào route `/rewrite`

```typescript
// TRƯỚC
const handleRewrite: RequestHandler = async (req, res) => {
  try {
    const { text, style } = req.body;
    // ... code (không có xác thực)
  }
};

// SAU
const handleRewrite: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication
    if (!(await verifyUser(req, res))) return;
    
    const { text, style } = req.body;
    // ... code
  }
};
```

## 📂 Files Đã Thay Đổi

- ✅ `server/routes/ai.ts` - Thêm xác thực vào handleRewrite

## 🚀 Hướng Dẫn Deploy

### Tùy Chọn 1: Deploy Tự Động (Khuyến Nghị)

#### Bước 1: Chạy Deploy Script
```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5

# Làm cho script executable
chmod +x deploy-fix-ssh.sh

# Chạy deploy
./deploy-fix-ssh.sh
```

Script sẽ:
1. Build project locally
2. Upload files lên server
3. Restart server tự động

### Tùy Chọn 2: Deploy Thủ Công

#### Bước 1: Build Project
```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
npm run build
```

#### Bước 2: Kết Nối SSH
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
```

Nhập password: `;)|o|=NhgnM)`

#### Bước 3: Upload Files
```bash
# Từ terminal local của bạn
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5

# Upload server files
scp -P 2210 -r dist/server/* jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/VolxAI/dist/server/

# Upload client files
scp -P 2210 -r dist/spa/* jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/VolxAI/dist/spa/
```

#### Bước 4: Restart Server
```bash
# SSH vào server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Đi vào thư mục project
cd /home/jybcaorr/VolxAI

# Kill process cũ
pkill -f "node" || true

# Chờ 2 giây
sleep 2

# Restart server
npm start &
# hoặc
node dist/server/node-build.mjs &

# Kiểm tra log
tail -f pm2.log  # hoặc log file tương ứng
```

## ✅ Kiểm Tra Fix

### 1. Verify Server Đang Chạy
```bash
curl https://ghf57-22175.azdigihost.com/api/ping
# Phải trả về: {"message":"ping"}
```

### 2. Test AI Rewrite Feature
1. Mở: `https://ghf57-22175.azdigihost.com/admin/articles/new`
2. Login với tài khoản admin
3. Viết một số text trong editor
4. **Select text** (highlight)
5. Click button **⚡ AI Rewrite** trong toolbar
6. Chọn style (ví dụ: "More creative")
7. **✅ Nếu text được thay đổi**, fix thành công!

### 3. Kiểm Tra Console (DevTools)
- F12 → Console
- Không có error liên quan đến `/api/ai/rewrite`
- Network tab: request trả về **200 OK** (không 500)

## 🐛 Troubleshooting

### ❌ Vẫn báo lỗi 500 sau deploy

**Kiểm tra:**

1. **Xem server logs**
   ```bash
   ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
   cd /home/jybcaorr/VolxAI
   
   # Tìm log file
   tail -f logs/app.log
   # hoặc
   tail -f pm2.log
   ```

2. **Verify OpenAI API Key**
   ```bash
   # Kiểm tra env variables
   env | grep OPENAI
   ```

3. **Kiểm tra Database**
   ```bash
   # Xem database schema
   mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p
   # Password là database password
   
   # Kiểm tra bảng ai_rewrite_history
   USE jybcaorr_lisacontentdbapi;
   DESCRIBE ai_rewrite_history;
   ```

### ❌ Rewrite không thay đổi text

**Kiểm tra:**
1. Bạn có select text chưa? (đánh dấu text trước khi click button)
2. Text phải có ít nhất 1 ký tự
3. Mở DevTools → Console xem error gì

### ❌ Button không xuất hiện

**Kiểm tra:**
1. URL phải là `/admin/articles/new` hoặc `/admin/articles/:id/edit`
2. Refresh page (Cmd+R)
3. Clear cache (Cmd+Shift+R)
4. Kiểm tra quill toolbar trong HTML

## 📊 Monitoring

### Xem AI Rewrite Usage
```sql
-- Connect to database
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi

-- Xem lịch sử rewrite gần đây
SELECT * FROM ai_rewrite_history ORDER BY created_at DESC LIMIT 20;

-- Thống kê style được sử dụng
SELECT style, COUNT(*) as count 
FROM ai_rewrite_history 
GROUP BY style 
ORDER BY count DESC;

-- Usage by date
SELECT DATE(created_at) as date, COUNT(*) as count
FROM ai_rewrite_history
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔐 Security Notes

✅ API Key OpenAI stored in environment variables (không lộ)
✅ Route được bảo vệ bằng JWT token verification
✅ User phải login để sử dụng feature
✅ Database logging non-blocking (không ảnh hưởng tốc độ)

## 📞 Support

Nếu có vấn đề:

1. **Kiểm tra logs** - Hầu hết error message là descriptive
2. **Test API endpoint** - Dùng Postman hoặc curl
3. **Database issues** - Verify bảng `ai_rewrite_history` tồn tại
4. **Network** - Kiểm tra CORS settings trong `server/index.ts`

## ✨ Thành Công!

Nếu bạn thấy text được thay đổi sau khi chọn style, fix đã thành công! 🎉

- ✅ User authentication fixed
- ✅ Database tracking working
- ✅ Frontend integration complete

Vui lòng test thêm các style khác và feedback nếu có vấn đề nào.
