# Hệ Thống Quản Lý Token Costs và Giới Hạn Bài Viết

## 📋 Tổng Quan

Hệ thống mới được triển khai để:
1. **Quản lý chi phí token** cho từng tính năng AI
2. **Giới hạn số lượng bài viết** theo gói dịch vụ hàng tháng
3. **Cho phép sử dụng token cho các tính năng nhỏ** ngay cả khi đã hết quota bài viết

## 🎯 Yêu Cầu

### 1. Giới Hạn Bài Viết Theo Gói
- ✅ Mỗi gói có giới hạn số lượng bài viết/tháng
- ✅ Chu kỳ tính từ ngày nâng cấp được duyệt (30 ngày)
- ✅ Hết quota → không tạo bài mới được
- ✅ Nâng cấp gói mới → reset số lượng theo gói mới

### 2. Token Vẫn Sử Dụng Được Cho Các Tính Năng Nhỏ
Khi đã hết quota bài viết nhưng còn token, vẫn dùng được:
- ✅ AI Rewrite SEO Title
- ✅ AI Rewrite Tiêu đề bài viết
- ✅ AI Rewrite Giới thiệu ngắn (Meta Description)
- ✅ Find Image
- ✅ Write More
- ✅ AI Rewrite (chọn text và rewrite)

### 3. Admin Quản Lý Token Costs
- ✅ Trang quản lý trong `/admin`
- ✅ Xem danh sách tất cả tính năng và chi phí token
- ✅ Chỉnh sửa chi phí token cho từng tính năng
- ✅ Bật/tắt tính năng

## 🗄️ Database Schema

### Bảng: `ai_feature_token_costs`
```sql
CREATE TABLE ai_feature_token_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    feature_name VARCHAR(255) NOT NULL,
    token_cost INT NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Dữ liệu mặc định:**
| Feature Key | Feature Name | Token Cost | Category |
|-------------|--------------|------------|----------|
| `generate_article` | Viết bài theo từ khóa | 15,000 | Tạo bài viết |
| `generate_toplist` | Viết bài Toplist | 18,000 | Tạo bài viết |
| `generate_news` | Viết tin tức | 20,000 | Tạo bài viết |
| `continue_article` | Tiếp tục viết bài | 5,000 | Tạo bài viết |
| `generate_seo_title` | AI Rewrite SEO Title | 500 | SEO |
| `generate_article_title` | AI Rewrite Tiêu đề | 500 | SEO |
| `generate_meta_description` | AI Rewrite Giới thiệu ngắn | 800 | SEO |
| `ai_rewrite_text` | AI Rewrite Text | 300 | Editor |
| `find_image` | Find Image | 100 | Editor |
| `write_more` | Write More | 1,000 | Editor |

### Cột mới trong `user_subscriptions`
```sql
ALTER TABLE user_subscriptions 
ADD COLUMN articles_used_this_month INT DEFAULT 0,
ADD COLUMN last_article_reset_date TIMESTAMP NULL;
```

- `articles_used_this_month`: Số bài đã tạo trong chu kỳ hiện tại
- `last_article_reset_date`: Ngày reset lần cuối (30 ngày/chu kỳ)

## 📊 Stored Procedures & Functions

### 1. `check_and_reset_article_count(user_id)`
Kiểm tra và reset số lượng bài viết nếu đã quá 30 ngày.

### 2. `can_user_create_article(user_id)`
Function trả về `TRUE/FALSE` để kiểm tra user có thể tạo bài mới không.

### 3. Trigger `after_article_insert`
Tự động tăng `articles_used_this_month` khi insert bài mới.

### 4. View `v_user_article_usage`
Xem thống kê usage của user:
```sql
SELECT * FROM v_user_article_usage;
```

## 🛠️ API Endpoints

### Admin - Quản Lý Token Costs

#### 1. Lấy tất cả token costs
```
GET /api/admin/token-costs
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "feature_key": "generate_article",
      "feature_name": "Viết bài theo từ khóa",
      "token_cost": 15000,
      "description": "Tạo bài viết hoàn chỉnh từ từ khóa",
      "is_active": true,
      "created_at": "2026-01-15T...",
      "updated_at": "2026-01-15T..."
    }
  ]
}
```

#### 2. Lấy một token cost
```
GET /api/admin/token-costs/:id
Authorization: Bearer {admin_token}
```

#### 3. Cập nhật token cost
```
PUT /api/admin/token-costs/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "token_cost": 20000,
  "feature_name": "Viết bài nâng cao",
  "description": "Chi phí mới",
  "is_active": true
}
```

#### 4. Toggle active/inactive
```
PATCH /api/admin/token-costs/:id/toggle
Authorization: Bearer {admin_token}
```

#### 5. Lấy token cost theo feature key (Public)
```
GET /api/admin/token-costs/feature/:featureKey
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token_cost": 15000
  }
}
```

## 💻 Frontend Components

### 1. AdminTokenCosts Component
**Location:** `client/components/admin/AdminTokenCosts.tsx`

**Features:**
- Hiển thị danh sách tất cả token costs
- Phân loại theo category (Tạo bài viết, SEO, Editor)
- Chỉnh sửa token cost inline
- Toggle active/inactive
- UI thân thiện với màu sắc phân biệt

### 2. Token Costs Helper
**Location:** `client/lib/tokenCosts.ts`

**Exports:**
```typescript
// Get token cost từ database
export async function getTokenCost(featureKey: string): Promise<number>

// Check xem user có thể tạo bài mới không
export async function canUserCreateArticle(authToken: string): Promise<{
  canCreate: boolean;
  articlesUsed: number;
  articlesLimit: number;
  message?: string;
}>

// Feature keys constants
export const FEATURE_KEYS = {
  GENERATE_ARTICLE: "generate_article",
  GENERATE_TOPLIST: "generate_toplist",
  // ...
}
```

## 🔧 Cách Sử Dụng

### 1. Admin Thay Đổi Token Cost

```typescript
// 1. Vào trang Admin → Token Costs
// 2. Click "Sửa" trên tính năng muốn thay đổi
// 3. Nhập số token mới
// 4. Click "Lưu thay đổi"
```

### 2. Check Article Limit Trong Code

```typescript
import { canUserCreateArticle } from "@/lib/tokenCosts";

// Trước khi tạo bài
const authToken = localStorage.getItem("authToken");
const check = await canUserCreateArticle(authToken);

if (!check.canCreate) {
  toast.error(check.message);
  // Show upgrade modal
  return;
}

// Proceed to create article
```

### 3. Get Token Cost Động

```typescript
import { getTokenCost, FEATURE_KEYS } from "@/lib/tokenCosts";

// Get cost cho tính năng generate article
const cost = await getTokenCost(FEATURE_KEYS.GENERATE_ARTICLE);
console.log(`Cost: ${cost} tokens`);
```

## 📈 Quy Trình Hoạt Động

### Kịch bản 1: User tạo bài mới

```
1. User click "Tạo bài viết"
   ↓
2. Frontend check: canUserCreateArticle()
   ↓
3. Nếu canCreate = false:
   - Hiển thị thông báo: "Đã hết quota bài viết"
   - Show upgrade modal
   - STOP
   ↓
4. Nếu canCreate = true:
   - Check token balance
   - Gọi API generate article
   ↓
5. Backend:
   - Trigger after_article_insert tự động tăng articles_used_this_month
   - Trừ token từ user balance
   ↓
6. Frontend:
   - Navigate to editor
   - Update token balance display
```

### Kịch bản 2: Đã hết quota bài nhưng dùng AI Rewrite

```
1. User select text và click "AI Rewrite"
   ↓
2. Check token balance (không check article limit!)
   ↓
3. Nếu đủ token:
   - Gọi API rewrite
   - Trừ token (300 tokens)
   - Không ảnh hưởng article count
   ↓
4. Nếu không đủ token:
   - Show token upgrade modal
```

### Kịch bản 3: Nâng cấp gói mới

```
1. User payment được admin approve
   ↓
2. Backend update:
   - articles_limit = new_plan_limit
   - articles_used_this_month = 0 (reset)
   - last_article_reset_date = NOW()
   ↓
3. User có thể tạo bài mới theo limit gói mới
```

### Kịch bản 4: Sau 30 ngày

```
1. User tạo bài mới
   ↓
2. Trigger after_article_insert chạy
   ↓
3. Gọi check_and_reset_article_count()
   ↓
4. Nếu > 30 ngày:
   - articles_used_this_month = 0
   - last_article_reset_date = NOW()
   ↓
5. Tăng counter lên 1
```

## 🎨 UI/UX Flow

### Trang Admin Token Costs

```
┌─────────────────────────────────────────────────────┐
│  🔥 Quản lý Token Costs                              │
│  Cấu hình số token tiêu hao cho từng tính năng AI   │
├─────────────────────────────────────────────────────┤
│  [Tạo bài viết] [SEO] [Editor]  ← Info cards        │
├─────────────────────────────────────────────────────┤
│  Status │ Loại │ Tên tính năng │ Token Cost │ Action│
│  ───────┼───────┼───────────────┼────────────┼───────│
│    ✓    │ Tạo BV│ Viết bài ...  │   15,000   │  Sửa  │
│    ✓    │ Tạo BV│ Toplist       │   18,000   │  Sửa  │
│    ✓    │ SEO   │ AI Rewrite... │      500   │  Sửa  │
│    ✓    │ Editor│ Find Image    │      100   │  Sửa  │
└─────────────────────────────────────────────────────┘
```

## 🔒 Bảo Mật

1. **Admin Only:** Chỉ admin mới truy cập `/api/admin/token-costs`
2. **Validation:** Token cost phải >= 0
3. **Public Endpoint:** `/token-costs/feature/:key` không cần auth (để AI endpoints dùng)

## ⚠️ Lưu Ý Quan Trọng

### 1. Phân Biệt Features

**Tính năng TẠO BÀI (bị giới hạn số lượng):**
- Viết bài theo từ khóa
- Viết bài Toplist
- Viết tin tức
- Tiếp tục viết bài

**Tính năng EDITOR (không bị giới hạn, chỉ cần token):**
- AI Rewrite SEO Title
- AI Rewrite Tiêu đề
- AI Rewrite Giới thiệu ngắn
- Find Image
- Write More
- AI Rewrite Text

### 2. Migration Database

Trước khi deploy, phải chạy migration:

```bash
mysql -u username -p database_name < ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql
```

### 3. Fallback Values

Nếu database lỗi, hệ thống sử dụng giá trị fallback hardcoded trong `tokenCosts.ts`

## 📝 Checklist Deploy

- [ ] Run migration SQL
- [ ] Verify data: `SELECT * FROM ai_feature_token_costs;`
- [ ] Test admin page: Navigate to `/admin` → Token Costs
- [ ] Test edit token cost
- [ ] Test toggle active/inactive
- [ ] Build frontend: `npm run build`
- [ ] Deploy to production
- [ ] Verify API endpoints working
- [ ] Test article creation with limit
- [ ] Test editor features without limit

## 🎉 Kết Quả

Sau khi triển khai:

✅ Admin có thể dễ dàng thay đổi token costs
✅ User bị giới hạn số bài viết theo gói
✅ User vẫn dùng được token cho các tính năng nhỏ
✅ Tự động reset sau 30 ngày
✅ Clear separation giữa "tạo bài" và "editor features"
✅ Code clean, maintainable, extensible

## 🔗 Files Liên Quan

### Backend
- `ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql` - Database migration
- `server/routes/admin.ts` - API endpoints (lines ~1200+)

### Frontend
- `client/components/admin/AdminTokenCosts.tsx` - Admin UI
- `client/pages/AdminDashboard.tsx` - Add menu item
- `client/lib/tokenCosts.ts` - Helper functions

### Documentation
- `TOKEN_COSTS_AND_ARTICLE_LIMITS.md` - This file

## 📞 Support

Nếu có vấn đề:
1. Check database: `SELECT * FROM ai_feature_token_costs;`
2. Check logs: Console errors
3. Test API với curl/Postman
4. Verify token trong localStorage
