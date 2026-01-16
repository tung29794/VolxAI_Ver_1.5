# Website Knowledge Feature - Complete Guide

## 📋 Overview

Tính năng mới cho phép lưu trữ kiến thức và bối cảnh riêng cho mỗi website. AI sẽ sử dụng thông tin này để tạo nội dung phù hợp với phong cách và mục đích của từng website.

**Date**: 2026-01-14  
**Feature**: Website Knowledge Management  
**Status**: ✅ Complete - Ready for deployment

---

## 🎯 Changes Made

### 1. **UI Changes**

#### Removed
- ❌ Menu "Kiến thức" trong sidebar Cấu hình

#### Added
- ✅ Nút "Kiến thức" trên mỗi website card (bên dưới nút Đồng bộ và Xóa)
- ✅ Popup modal để nhập/chỉnh sửa kiến thức website
- ✅ Textarea lớn với placeholder hướng dẫn chi tiết

### 2. **Database Changes**

#### New Column
```sql
ALTER TABLE websites
ADD COLUMN knowledge TEXT NULL AFTER api_token
COMMENT 'Website knowledge and context for AI content generation';
```

**Column Details:**
- **Name**: `knowledge`
- **Type**: `TEXT` (lên đến ~65KB text)
- **Nullable**: YES (không bắt buộc)
- **Position**: Sau cột `api_token`
- **Purpose**: Lưu trữ kiến thức và bối cảnh về website

### 3. **Backend Changes**

#### New API Endpoint
```
PUT /api/websites/:id/knowledge
```

**Request:**
```json
{
  "knowledge": "Website: Chuyên về ẩm thực Việt Nam\nLĩnh vực: ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Website knowledge updated successfully"
}
```

**Features:**
- ✅ User authentication required
- ✅ Verify website belongs to user
- ✅ Update knowledge field
- ✅ Auto-update `updated_at` timestamp

#### Updated Queries
- GET `/api/websites` now includes `knowledge` column

### 4. **Frontend Components**

#### WebsiteManagement.tsx Updates

**New State:**
```typescript
const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
const [selectedWebsiteForKnowledge, setSelectedWebsiteForKnowledge] = useState<Website | null>(null);
const [knowledgeContent, setKnowledgeContent] = useState("");
const [savingKnowledge, setSavingKnowledge] = useState(false);
```

**New Functions:**
- `handleOpenKnowledgeModal(website)` - Mở popup với nội dung hiện tại
- `handleSaveKnowledge()` - Lưu kiến thức qua API

**Updated Interface:**
```typescript
interface Website {
  id: number;
  name: string;
  url: string;
  api_token: string;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  knowledge?: string | null; // NEW
}
```

---

## 📝 Knowledge Format

### Recommended Structure

```text
Website: [Tên/mô tả ngắn gọn về website]
Lĩnh vực: [Chủ đề chính, ngành nghề]
Đối tượng: [Đối tượng khách hàng mục tiêu]
Phong cách: [Phong cách viết, tone of voice]

Đặc điểm nội dung:
- [Điểm đặc trưng 1]
- [Điểm đặc trưng 2]
- [Điểm đặc trưng 3]
- [...]

Điều cần tránh:
- [Điều không nên làm 1]
- [Điều không nên làm 2]
- [...]
```

### Example 1: Food Blog

```text
Website: Chuyên về ẩm thực Việt Nam
Lĩnh vực: Chia sẻ công thức nấu ăn, đánh giá nhà hàng, văn hóa ẩm thực
Đối tượng: Người yêu thích nấu ăn, thích khám phá món ngon
Phong cách: Thân thiện, gần gũi, đời thường

Đặc điểm nội dung:
- Luôn có phần nguyên liệu chi tiết
- Hướng dẫn từng bước cụ thể
- Có mẹo nấu ăn hay
- Thêm câu chuyện về món ăn
- Dùng nhiều từ ngữ địa phương

Điều cần tránh:
- Không dùng từ ngữ quá học thuật
- Không viết theo kiểu sách giáo khoa
- Tránh câu văn quá dài, khó hiểu
```

### Example 2: Tech Blog

```text
Website: Tech News & Reviews
Lĩnh vực: Công nghệ, đánh giá sản phẩm, tin tức tech
Đối tượng: Tech enthusiasts, developers, người quan tâm công nghệ
Phong cách: Chuyên nghiệp nhưng dễ hiểu, có chiều sâu

Đặc điểm nội dung:
- Phân tích kỹ thuật chi tiết
- So sánh với đối thủ cạnh tranh
- Đề cập specs cụ thể
- Có pros/cons rõ ràng
- Kết luận và đánh giá cuối bài

Từ vựng thường dùng:
- Performance, benchmark, optimization
- User experience (UX), interface (UI)
- Features, specifications, compatibility

Điều cần tránh:
- Không quá technical với người mới
- Tránh bias quá nhiều về một thương hiệu
- Không clickbait titles
```

### Example 3: E-commerce Store

```text
Website: Cửa hàng thời trang nữ
Lĩnh vực: Bán quần áo, phụ kiện thời trang nữ
Đối tượng: Phụ nữ 20-35 tuổi, yêu thích thời trang
Phong cách: Trẻ trung, năng động, thời thượng

Đặc điểm nội dung:
- Mô tả sản phẩm chi tiết (chất liệu, size, màu sắc)
- Gợi ý cách phối đồ
- Highlight điểm nổi bật của sản phẩm
- Call-to-action rõ ràng (Mua ngay, Thêm vào giỏ)
- Đề cập chính sách đổi trả, bảo hành

SEO Focus:
- Long-tail keywords về sản phẩm cụ thể
- Từ khóa xu hướng thời trang hiện tại
- Địa phương: "Hà Nội", "Sài Gòn", "ship toàn quốc"

Điều cần tránh:
- Không dùng từ ngữ khó hiểu
- Tránh mô tả quá chung chung
- Không copy content từ nguồn khác
```

---

## 🚀 Deployment Guide

### Step 1: Update Database

**Option A: Via phpMyAdmin**
1. Mở phpMyAdmin
2. Chọn database `jybcaorr_lisacontentdbapi`
3. Vào tab "SQL"
4. Paste nội dung từ file `ADD_WEBSITE_KNOWLEDGE_COLUMN.sql`
5. Click "Go"

**Option B: Via MySQL CLI**
```bash
mysql -u username -p jybcaorr_lisacontentdbapi < ADD_WEBSITE_KNOWLEDGE_COLUMN.sql
```

**Verify:**
```sql
DESCRIBE websites;
-- Should show 'knowledge' column with type TEXT
```

### Step 2: Deploy Backend

Backend code đã được build trong `dist/server/node-build.mjs`.

**If using PM2:**
```bash
pm2 restart all
```

**If using manual:**
```bash
# Stop current server
# Deploy new dist/server/node-build.mjs
# Start server
node dist/server/node-build.mjs
```

### Step 3: Deploy Frontend

Frontend đã được build trong `dist/spa/`.

**Upload files:**
- `dist/spa/index.html`
- `dist/spa/assets/*`
- `dist/spa/.htaccess`

### Step 4: Test

1. **Login** vào VolxAI
2. **Vào** Cấu hình > Website
3. **Verify**:
   - ✅ Không còn menu "Kiến thức" trong sidebar
   - ✅ Mỗi website card có nút "Kiến thức"
4. **Click** nút "Kiến thức" trên một website
5. **Verify popup** hiển thị:
   - ✅ Title: "Kiến thức Website: [Tên website]"
   - ✅ Textarea lớn với placeholder
   - ✅ Nút "Hủy" và "Lưu kiến thức"
6. **Nhập** nội dung kiến thức (có thể copy từ examples trên)
7. **Click** "Lưu kiến thức"
8. **Verify**:
   - ✅ Toast success: "Đã lưu kiến thức website thành công"
   - ✅ Popup đóng lại
9. **Click** lại nút "Kiến thức"
10. **Verify**:
    - ✅ Nội dung đã lưu hiển thị trong textarea

---

## 🔧 Technical Details

### Database Schema

```sql
CREATE TABLE websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  api_token VARCHAR(255) NOT NULL,
  knowledge TEXT NULL,  -- NEW COLUMN
  is_active TINYINT(1) DEFAULT 1,
  last_sync DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_url_user (user_id, url),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### API Endpoints

#### GET /api/websites
Returns all websites with knowledge field:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "My Food Blog",
      "url": "https://example.com",
      "api_token": "xxx",
      "knowledge": "Website: Chuyên về ẩm thực...",
      "is_active": true,
      "last_sync": "2026-01-14T10:00:00.000Z",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-14T10:05:00.000Z"
    }
  ]
}
```

#### PUT /api/websites/:id/knowledge
Update knowledge for specific website:

**Request:**
```json
{
  "knowledge": "Website description and guidelines..."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Website knowledge updated successfully"
}
```

**Error Responses:**
```json
// Website not found or not owned by user
{
  "success": false,
  "message": "Website not found"
}

// Server error
{
  "success": false,
  "message": "Failed to update website knowledge"
}
```

### Frontend Components

**File:** `client/components/WebsiteManagement.tsx`

**New Imports:**
```typescript
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";
```

**Updated Interface:**
```typescript
interface Website {
  // ... existing fields
  knowledge?: string | null;
}
```

**Layout Structure:**
```tsx
<Card> {/* Website Card */}
  <CardContent>
    <div className="flex gap-2">
      <Button>Đồng bộ</Button>
      <Button>Xóa</Button>
    </div>
    <div className="pt-2">
      <Button>Kiến thức</Button> {/* NEW */}
    </div>
  </CardContent>
</Card>

<Dialog> {/* Knowledge Modal */}
  <DialogContent>
    <Textarea
      placeholder="..."
      value={knowledgeContent}
      onChange={(e) => setKnowledgeContent(e.target.value)}
      className="min-h-[400px]"
    />
  </DialogContent>
</Dialog>
```

---

## 🎯 Future Enhancements

### Phase 2: AI Integration (Coming Soon)

Khi AI viết bài, sẽ tự động:
1. **Load knowledge** của website được chọn
2. **Inject vào prompt**: "Based on this website context: {knowledge}"
3. **AI sử dụng** để điều chỉnh:
   - Tone of voice
   - Terminology
   - Content structure
   - Writing style
   - Target audience

**Example Prompt Integration:**
```typescript
const websiteKnowledge = selectedWebsite.knowledge;

const systemPrompt = `You are an expert content writer.

${websiteKnowledge ? `
WEBSITE CONTEXT:
${websiteKnowledge}

Please write content that aligns with this website's style, tone, and guidelines.
` : ''}

Write an article about: ${keyword}
...
`;
```

### Possible Future Features

1. **Knowledge Templates**
   - Pre-built templates for common niches
   - One-click apply template

2. **Knowledge Validation**
   - Check if knowledge is detailed enough
   - Suggest improvements

3. **Multi-language Support**
   - Store knowledge in multiple languages
   - Auto-switch based on article language

4. **Knowledge History**
   - Version control for knowledge changes
   - Restore previous versions

5. **Knowledge Analytics**
   - Track how knowledge affects content quality
   - A/B testing different knowledge versions

---

## ✅ Checklist

### Pre-Deployment
- [x] Database migration script created
- [x] Backend API endpoint implemented
- [x] Frontend UI updated
- [x] Build successful (Client: 961.30 kB, Server: 288.09 kB)
- [x] Documentation created

### Deployment
- [ ] Run SQL migration in production database
- [ ] Deploy backend (PM2 restart or manual)
- [ ] Deploy frontend (upload dist/spa/)
- [ ] Verify menu "Kiến thức" removed from sidebar
- [ ] Verify "Kiến thức" button on each website card

### Post-Deployment Testing
- [ ] Login and navigate to Cấu hình > Website
- [ ] Click "Kiến thức" button on a website
- [ ] Popup opens with textarea
- [ ] Enter knowledge content and save
- [ ] Success toast appears
- [ ] Reopen popup and verify content persists
- [ ] Test with multiple websites
- [ ] Test empty knowledge (should save as NULL)

### Future Work
- [ ] Integrate knowledge into AI article generation
- [ ] Add knowledge to bulk publishing
- [ ] Add knowledge to auto-blog feature
- [ ] Create knowledge templates library

---

## 📞 Support

### Common Issues

**Issue 1: Column already exists**
```
Error: Duplicate column name 'knowledge'
```
**Solution:** Column đã được thêm rồi, skip migration step.

**Issue 2: Button không hiển thị**
**Solution:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R hoặc Cmd+Shift+R)
- Verify frontend deployment

**Issue 3: 404 error khi save**
**Solution:**
- Verify backend deployment
- Check API route registered correctly
- Check server logs

**Issue 4: Textarea không lưu được**
**Solution:**
- Check browser console for errors
- Verify API token in localStorage
- Check network tab for failed requests

---

## 📊 Files Changed

### Created
1. `ADD_WEBSITE_KNOWLEDGE_COLUMN.sql` - Database migration
2. `WEBSITE_KNOWLEDGE_FEATURE.md` - This documentation

### Modified
1. `client/pages/Account.tsx`
   - Removed "knowledge" from AccountTab type
   - Removed "Kiến thức" menu item
   - Removed knowledge tab content section

2. `client/components/WebsiteManagement.tsx`
   - Added Textarea import
   - Added BookOpen icon
   - Updated Website interface with knowledge field
   - Added knowledge modal state
   - Added handleOpenKnowledgeModal function
   - Added handleSaveKnowledge function
   - Added "Kiến thức" button to each website card
   - Added Knowledge modal dialog

3. `server/routes/websites.ts`
   - Added knowledge to SELECT query
   - Created handleUpdateWebsiteKnowledge function
   - Registered PUT /:id/knowledge route

### Build Output
- `dist/spa/assets/index-BArl1g3p.js` (961.30 kB)
- `dist/server/node-build.mjs` (288.09 kB)

---

**Created**: 2026-01-14  
**Author**: AI Assistant  
**Status**: ✅ Ready for production deployment
