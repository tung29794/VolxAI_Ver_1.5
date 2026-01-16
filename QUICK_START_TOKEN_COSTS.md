# Quick Start: Token Costs & Article Limits

## 🚀 Deploy Nhanh

### 1. Chạy Migration
```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
```

### 2. Build & Deploy
```bash
npm run build
# Deploy dist/spa và dist/server
```

### 3. Verify
- Vào `/admin` → Click "Token Costs" menu
- Check xem có 10 features với token costs không

## 📋 Tóm Tắt Tính Năng

### ✅ Đã Hoàn Thành

1. **Database**
   - ✅ Bảng `ai_feature_token_costs` - Lưu chi phí token
   - ✅ Cột `articles_used_this_month` - Đếm bài viết
   - ✅ Cột `last_article_reset_date` - Ngày reset
   - ✅ Stored procedures & functions
   - ✅ Trigger tự động tăng counter

2. **Backend API**
   - ✅ `GET /api/admin/token-costs` - Lấy tất cả
   - ✅ `GET /api/admin/token-costs/:id` - Lấy một
   - ✅ `PUT /api/admin/token-costs/:id` - Cập nhật
   - ✅ `PATCH /api/admin/token-costs/:id/toggle` - Toggle
   - ✅ `GET /api/admin/token-costs/feature/:key` - Public endpoint

3. **Frontend**
   - ✅ Component `AdminTokenCosts` - Giao diện quản lý
   - ✅ Menu item trong AdminDashboard
   - ✅ Helper functions trong `lib/tokenCosts.ts`

4. **Logic**
   - ✅ Giới hạn số bài viết theo gói/tháng
   - ✅ Reset tự động sau 30 ngày
   - ✅ Editor features không bị giới hạn
   - ✅ Admin có thể thay đổi token costs

## 🎯 Cách Dùng Admin

1. Login as admin → `/admin`
2. Click "Token Costs" trong sidebar
3. Xem danh sách tính năng:
   - **Tạo bài viết**: 15k-20k tokens
   - **SEO**: 500-800 tokens
   - **Editor**: 100-1000 tokens
4. Click "Sửa" để thay đổi
5. Click icon ✓/✗ để bật/tắt

## 📊 Token Costs Mặc Định

| Tính năng | Token Cost |
|-----------|------------|
| Viết bài theo từ khóa | 15,000 |
| Viết bài Toplist | 18,000 |
| Viết tin tức | 20,000 |
| Tiếp tục viết bài | 5,000 |
| AI Rewrite SEO Title | 500 |
| AI Rewrite Tiêu đề | 500 |
| AI Rewrite Giới thiệu | 800 |
| AI Rewrite Text | 300 |
| Find Image | 100 |
| Write More | 1,000 |

## 🔒 Giới Hạn Bài Viết Theo Gói

| Gói | Bài viết/tháng | Tokens/tháng |
|-----|----------------|--------------|
| Free | 2 | 10,000 |
| Starter | 60 | 400,000 |
| Grow | 150 | 1,000,000 |
| Pro | 300 | 2,000,000 |
| Corp | 600 | 4,000,000 |
| Premium | 1,000 | 6,500,000 |

## ⚡ Logic Hoạt Động

### Tạo Bài Mới
```
1. Check articles_used < articles_limit
2. Nếu NO → Show "Hết quota, nâng cấp gói"
3. Nếu YES → Check token balance
4. Create article → Auto tăng counter
```

### Dùng Editor Features (Rewrite, Find Image, etc.)
```
1. KHÔNG check articles_used
2. CHỈ check token balance
3. Nếu đủ token → Execute
4. Không ảnh hưởng article count
```

### Reset Hàng Tháng
```
1. Mỗi lần tạo bài, check ngày reset
2. Nếu > 30 ngày → Auto reset counter về 0
3. Update last_article_reset_date
```

## 📁 Files Đã Tạo/Sửa

### Mới
- `ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql`
- `client/components/admin/AdminTokenCosts.tsx`
- `client/lib/tokenCosts.ts`
- `TOKEN_COSTS_AND_ARTICLE_LIMITS.md`
- `QUICK_START_TOKEN_COSTS.md` (file này)

### Đã Sửa
- `server/routes/admin.ts` - Thêm 5 endpoints mới
- `client/pages/AdminDashboard.tsx` - Thêm menu Token Costs

## ✅ Testing Checklist

- [ ] Migration SQL chạy thành công
- [ ] 10 features có trong database
- [ ] Admin page hiển thị đúng
- [ ] Edit token cost work
- [ ] Toggle active/inactive work
- [ ] API endpoints trả về đúng data
- [ ] Frontend build không lỗi

## 🐛 Troubleshooting

### Lỗi: Cannot find table ai_feature_token_costs
```bash
# Chạy lại migration
mysql -h... -u... -p... database < ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
```

### Lỗi: AdminTokenCosts not found
```bash
# Rebuild frontend
npm run build
```

### Lỗi: 403 Access Denied
```bash
# Check role admin trong database
SELECT id, username, role FROM users WHERE role='admin';
```

## 📖 Docs Đầy Đủ

Xem file `TOKEN_COSTS_AND_ARTICLE_LIMITS.md` để biết chi tiết.
