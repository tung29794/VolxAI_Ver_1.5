# Hướng dẫn Tích hợp WordPress với VolxAI

## Tổng quan
Hệ thống quản lý website cho phép user kết nối nhiều website WordPress với VolxAI thông qua plugin **Article Writer**.

## Kiến trúc

### Database Schema
```sql
CREATE TABLE websites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  api_token VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_url (user_id, url),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Backend API Endpoints

#### 1. GET /api/websites
**Mục đích**: Lấy danh sách website của user
**Auth**: JWT Required
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "name": "Blog Cá Nhân",
      "url": "https://example.com",
      "api_token": "aw-xxxxxxxxxxxx",
      "is_active": true,
      "last_sync": "2024-01-26T10:30:00Z",
      "created_at": "2024-01-26T10:00:00Z"
    }
  ]
}
```

#### 2. POST /api/websites
**Mục đích**: Thêm website mới
**Auth**: JWT Required
**Request Body**:
```json
{
  "name": "Blog Cá Nhân",
  "url": "https://example.com",
  "apiToken": "aw-xxxxxxxxxxxx"
}
```
**Validation**: Tự động kiểm tra kết nối WordPress API trước khi lưu
**Response**:
```json
{
  "success": true,
  "message": "Website added successfully",
  "data": { "id": 1, ... }
}
```

#### 3. POST /api/websites/test
**Mục đích**: Test kết nối trước khi thêm
**Auth**: JWT Required
**Request Body**:
```json
{
  "url": "https://example.com",
  "apiToken": "aw-xxxxxxxxxxxx"
}
```
**Hoạt động**: Gọi endpoint `/wp-json/article-writer/v1/drafts` để verify
**Response**:
```json
{
  "success": true,
  "message": "Connection successful"
}
```

#### 4. PUT /api/websites/:id
**Mục đích**: Cập nhật thông tin website
**Auth**: JWT Required (chỉ owner)
**Request Body**:
```json
{
  "name": "Blog Mới",
  "url": "https://newexample.com",
  "apiToken": "aw-yyyyyyyy",
  "is_active": true
}
```

#### 5. DELETE /api/websites/:id
**Mục đích**: Xóa website
**Auth**: JWT Required (chỉ owner)
**Response**:
```json
{
  "success": true,
  "message": "Website deleted successfully"
}
```

## Frontend Components

### WebsiteManagement.tsx
**Location**: `client/components/WebsiteManagement.tsx`

**Features**:
- ✅ Danh sách website dạng cards
- ✅ Add website modal với validation
- ✅ Test connection trước khi add
- ✅ Delete website với confirmation
- ✅ Display status (Hoạt động/Tạm dừng)
- ✅ Empty state với hướng dẫn
- ✅ Loading states cho tất cả actions

**Key Functions**:
```typescript
fetchWebsites()        // Lấy danh sách từ API
handleTestConnection() // Test kết nối WordPress
handleAddWebsite()     // Thêm website mới
handleDeleteWebsite()  // Xóa website
```

### Account.tsx Integration
**Location**: `client/pages/Account.tsx`

**Changes**:
- Import WebsiteManagement component
- Replace placeholder trong website tab
- Navigate: `/account` → Tab "Website" → WebsiteManagement component

## WordPress Plugin Integration

### Plugin: lisa-content-app-plugin

**API Endpoints**:
1. `/wp-json/article-writer/v1/publish` - Đăng bài mới
2. `/wp-json/article-writer/v1/drafts` - Lấy danh sách nháp
3. `/wp-json/article-writer/v1/upload-image` - Upload hình ảnh

**Authentication**:
- Header: `X-Article-Writer-Token: aw-xxxxxxxxxxxx`
- Token được tạo tự động và lưu trong wp_options

**Setup trên WordPress**:
1. Upload plugin vào `/wp-content/plugins/`
2. Activate plugin trong WordPress Admin
3. Vào Settings → Article Writer
4. Copy API Token

## User Flow

### 1. Kết nối Website
```
User → /account → Tab "Website" → Click "Thêm Website"
↓
Nhập thông tin:
- Tên website: "Blog Cá Nhân"
- URL: "https://example.com"
- API Token: "aw-xxxxxxxxxxxx"
↓
Click "Kiểm tra kết nối" (optional)
↓
Hệ thống gọi WordPress API để verify
↓
Click "Thêm Website"
↓
Website được lưu vào database
↓
Hiển thị trong danh sách
```

### 2. Đăng bài lên WordPress (Future)
```
User viết bài trên VolxAI
↓
Click "Đăng bài lên WordPress"
↓
Chọn website từ danh sách
↓
VolxAI gọi API:
POST https://example.com/wp-json/article-writer/v1/publish
Headers: X-Article-Writer-Token: aw-xxx
Body: { title, content, featured_image }
↓
Bài viết xuất hiện trên WordPress
```

## Security

### Backend Security
- ✅ JWT authentication cho tất cả endpoints
- ✅ User chỉ thấy website của mình (user_id filter)
- ✅ User chỉ edit/delete website của mình
- ✅ API token được mã hóa khi lưu (future: encryption)
- ✅ UNIQUE constraint ngăn duplicate URL per user

### WordPress Plugin Security
- ✅ Token-based authentication
- ✅ Nonce verification
- ✅ Capability checks (admin only)
- ✅ Sanitize/escape input

## Database Migration

**File**: `WEBSITES_TABLE.sql`

**Chạy migration**:
```bash
# SSH vào server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Vào MySQL
mysql -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi

# Chạy SQL
source /home/jybcaorr/WEBSITES_TABLE.sql
# Hoặc copy/paste nội dung file
```

**Verify**:
```sql
DESCRIBE websites;
SELECT * FROM websites;
```

## Testing

### Test Backend API
```bash
# 1. Test Get Websites (cần token)
curl -X GET https://api.volxai.com/api/websites \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Test Connection
curl -X POST https://api.volxai.com/api/websites/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "apiToken": "aw-xxxxxxxxxxxx"
  }'

# 3. Add Website
curl -X POST https://api.volxai.com/api/websites \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Blog",
    "url": "https://example.com",
    "apiToken": "aw-xxxxxxxxxxxx"
  }'
```

### Test Frontend
1. Login vào https://volxai.com
2. Vào `/account`
3. Click tab "Website"
4. Click "Thêm Website"
5. Nhập thông tin và test connection
6. Add website và verify trong list

### Test WordPress Plugin
1. Install plugin trên WordPress test site
2. Activate plugin
3. Vào Settings → Article Writer
4. Copy API Token
5. Test với curl:
```bash
curl https://your-wp-site.com/wp-json/article-writer/v1/drafts \
  -H "X-Article-Writer-Token: YOUR_TOKEN"
```

## Deployment

### Backend Deployment
```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5

# Build
npm run build:server

# Deploy
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/

# Restart
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

### Frontend Deployment
```bash
# Build
npm run build:client

# Deploy
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess' --exclude='upload'
```

### Database Migration
```bash
# SSH vào server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Chạy SQL từ WEBSITES_TABLE.sql
mysql -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < WEBSITES_TABLE.sql
```

## File Structure

```
server/
├── routes/
│   └── websites.ts          # API routes cho website management
└── index.ts                  # App config (đã thêm websites router)

client/
├── components/
│   └── WebsiteManagement.tsx # UI component chính
└── pages/
    └── Account.tsx           # Tích hợp WebsiteManagement

WEBSITES_TABLE.sql            # Database schema
```

## Future Enhancements

### Phase 2: Publishing to WordPress
- [ ] Nút "Đăng lên WordPress" trong ArticleEditor
- [ ] Chọn website target
- [ ] Upload featured image lên WordPress
- [ ] Publish content qua API
- [ ] Sync status về VolxAI

### Phase 3: Sync & Monitoring
- [ ] Cron job đồng bộ last_sync
- [ ] Dashboard hiển thị số bài đã đăng per website
- [ ] Error logging cho failed publishes
- [ ] Retry mechanism

### Phase 4: Advanced Features
- [ ] Auto-publish schedule
- [ ] Category/tag mapping
- [ ] Custom fields support
- [ ] Bulk publish

## Troubleshooting

### Lỗi "Cannot connect to WordPress"
**Nguyên nhân**:
- Plugin chưa được activate
- API Token sai
- WordPress REST API bị disable
- URL không đúng format

**Giải quyết**:
1. Verify plugin đã activate
2. Copy lại API Token từ WordPress
3. Test với curl trước
4. Check WordPress REST API: `https://example.com/wp-json`

### Lỗi "Website already exists"
**Nguyên nhân**: UNIQUE constraint (user_id, url)
**Giải quyết**: Xóa website cũ hoặc update thay vì add mới

### Lỗi "Unauthorized"
**Nguyên nhân**: JWT token expired hoặc invalid
**Giải quyết**: Logout và login lại

## Support

**Documentation**: `/WORDPRESS_INTEGRATION_GUIDE.md`
**Plugin Files**: Được đính kèm trong conversation
**API Docs**: Xem phần Backend API Endpoints ở trên
