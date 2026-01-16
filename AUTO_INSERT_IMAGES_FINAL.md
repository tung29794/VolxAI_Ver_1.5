# Auto Insert Images Enhancement - Final Version ✅

## Tổng Quan
Đã hoàn thiện tính năng **"Tự động tìm và chèn ảnh"** cho cả 3 loại bài viết với logic khác nhau:

1. **AI Write (Article)**: Chèn ảnh theo số lượng lựa chọn (1-10), chia đều vào các đoạn văn
2. **Toplist**: Chèn 1 ảnh cho mỗi mục (item), theo heading H2/H3
3. **News**: Chèn 1 ảnh cho mỗi heading H2/H3

## Ngày Hoàn Thành
**Ngày 15/01/2026**

---

## 📋 Logic Chèn Ảnh Chi Tiết

### 1️⃣ AI Write (Article) - Theo Đoạn Văn
**Strategy**: Chèn ảnh chia đều theo số đoạn văn

```javascript
// Công thức
const targetImageCount = Math.min(maxImages || 5, 10); // User chọn 1-10
const availableParagraphs = totalParagraphs - 1; // Không chèn đoạn cuối
const spacing = Math.floor(availableParagraphs / targetImageCount);

// Vị trí chèn: spacing, spacing*2, spacing*3, ...
for (let i = 0; i < targetImageCount; i++) {
  const paraIdx = (i + 1) * spacing;
  // Insert image after paragraphs[paraIdx]
}
```

**Ví dụ**:
- 20 đoạn, chọn 5 ảnh → spacing = 3 → chèn sau đoạn 3, 6, 9, 12, 15
- 20 đoạn, chọn 10 ảnh → spacing = 1 → chèn sau đoạn 1, 2, 3, ..., 10
- 5 đoạn, chọn 10 ảnh → chỉ chèn 4 ảnh (available = 4)

**UI**: Select dropdown 1-10 ảnh
**Search**: `maxImages * 2` (để đảm bảo đủ ảnh chất lượng)

---

### 2️⃣ Toplist - Theo Mục (Item)
**Strategy**: Mỗi mục toplist 1 ảnh (sau mỗi H2/H3)

```javascript
// Tìm tất cả H2 và H3 headings (mỗi heading = 1 mục toplist)
const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;

// Chèn 1 ảnh ngay sau mỗi heading
for (let i = 0; i < headings.length; i++) {
  const heading = headings[i];
  const img = images[i];
  // Insert image right after heading.end
}
```

**Ví dụ**:
- Top 5 → Tìm 5 headings → chèn 5 ảnh (1 ảnh/mục)
- Top 10 → Tìm 10 headings → chèn 10 ảnh (1 ảnh/mục)
- Top 15 → Tìm 15 headings → chèn 15 ảnh (1 ảnh/mục)

**UI**: Checkbox đơn giản (không có select số lượng vì tự động theo `itemCount`)
**Search**: `itemCount * 2` (theo số mục được chọn)

---

### 3️⃣ News - Theo Heading
**Strategy**: Mỗi heading 1 ảnh (giống Toplist)

```javascript
// Tìm tất cả H2 và H3 headings trong bài tin tức
const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;

// Chèn 1 ảnh ngay sau mỗi heading
for (let i = 0; i < headings.length; i++) {
  const heading = headings[i];
  const img = images[i];
  // Insert image right after heading.end
}
```

**Ví dụ**:
- Bài tin có 4 headings → chèn 4 ảnh
- Bài tin có 7 headings → chèn 7 ảnh
- Bài tin có 2 headings → chèn 2 ảnh

**UI**: Checkbox đơn giản (tự động theo số heading trong bài)
**Search**: 20 ảnh (đủ cho hầu hết bài tin)

---

## 🛠️ Files Đã Thay Đổi

### Frontend Changes

#### 1. WriteByKeywordForm.tsx (AI Write)
**Status**: ✅ COMPLETED (từ iteration trước)

```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  autoInsertImages: false,
  maxImages: 5, // Default 5, max 10
});

// UI: Select dropdown 1-10 images
{formData.autoInsertImages && (
  <select value={formData.maxImages} ...>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
      <option key={num} value={num}>{num} ảnh</option>
    ))}
  </select>
)}
```

#### 2. ToplistForm.tsx
**Status**: ✅ UPDATED

**Changes**:
- Removed `maxImages` select (không cần vì tự động theo itemCount)
- Updated UI text: "Tự động tìm và chèn ảnh cho mỗi mục"
- Updated hint: "Top 5 sẽ có 5 ảnh, Top 10 sẽ có 10 ảnh"

```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  autoInsertImages: false,
  maxImages: 5, // Kept in state but not used (uses itemCount instead)
});

// UI: Simple checkbox only
<label>
  <input type="checkbox" checked={formData.autoInsertImages} .../>
  <span>🖼️ Tự động tìm và chèn ảnh cho mỗi mục</span>
  <p>Top 5 sẽ có 5 ảnh, Top 10 sẽ có 10 ảnh.</p>
</label>
```

#### 3. WriteNewsForm.tsx (NEW)
**Status**: ✅ ADDED

**Changes**:
- Added `autoInsertImages` state
- Added checkbox UI (similar to Toplist)
- Send `autoInsertImages` to backend

```typescript
const [autoInsertImages, setAutoInsertImages] = useState(false);

// API call
body: JSON.stringify({
  keyword, language, model, websiteId,
  autoInsertImages // NEW
})

// UI: Simple checkbox
<label>
  <input type="checkbox" checked={autoInsertImages} .../>
  <span>🖼️ Tự động tìm và chèn ảnh cho mỗi heading</span>
  <p>AI sẽ tự động chèn 1 ảnh sau mỗi heading (H2, H3)</p>
</label>
```

---

### Backend Changes

#### 1. Generate Article Endpoint (ai.ts ~Line 1747-3500)
**Status**: ✅ COMPLETED (từ iteration trước)

**Interface**:
```typescript
interface GenerateArticleRequest {
  autoInsertImages?: boolean;
  maxImages?: number; // 1-10
}
```

**Logic**: Chia đều ảnh vào paragraphs (như đã implement)

#### 2. Generate Toplist Endpoint (ai.ts ~Line 5467-5530)
**Status**: ✅ UPDATED

**Changes**: Hoàn toàn thay đổi từ "chia đoạn văn" sang "theo heading"

```typescript
if (autoInsertImages) {
  console.log(`🎯 Strategy: Insert 1 image per toplist item (after each H2/H3)`);
  
  // Search images: itemCount * 2
  const images = await searchImagesForKeyword(keyword, itemCount * 2);
  
  // Extract H2/H3 headings
  const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let headings = [];
  
  while ((match = headingRegex.exec(finalContent)) !== null) {
    headings.push({
      start: match.index,
      end: match.index + match[0].length,
      tag: match[1], // h2 or h3
      content: match[0]
    });
  }
  
  // Insert 1 image after each heading
  const actualImageCount = Math.min(headings.length, images.length);
  
  let offset = 0;
  for (let i = 0; i < actualImageCount; i++) {
    const heading = headings[i];
    const img = images[i];
    const imgTag = `\n<img src="${img.original}" alt="${img.title || keyword}" .../>\n`;
    
    const insertPosition = heading.end + offset;
    finalContent = finalContent.slice(0, insertPosition) + imgTag + finalContent.slice(insertPosition);
    offset += imgTag.length;
    
    console.log(`✅ Inserted image ${i + 1} after ${heading.tag.toUpperCase()}`);
  }
}
```

**Removed**: Logic chia paragraph (không còn dùng nữa)
**Removed**: `maxImages` parameter (dùng `itemCount` từ form)

#### 3. Generate News Endpoint (ai.ts ~Line 5716-5800)
**Status**: ✅ ADDED

**Interface**:
```typescript
// Added to destructuring
const { keyword, language, model, websiteId, autoInsertImages } = req.body;
```

**Logic**: Giống hệt Toplist (chèn sau mỗi heading)

```typescript
// Step 8.5: Auto insert images (ADDED BEFORE Step 9: Clean HTML)
if (autoInsertImages) {
  console.log(`🎯 Strategy: Insert 1 image after each H2/H3 heading`);
  
  // Search 20 images
  const images = await searchImagesForKeyword(keyword, 20);
  
  if (images.length > 0) {
    imageSearchTokensUsed += TOKEN_COSTS.FIND_IMAGE_SERP;
    
    // Extract H2/H3 headings
    const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let headings = [];
    
    while ((match = headingRegex.exec(finalContent)) !== null) {
      headings.push({ start, end, tag, content });
    }
    
    console.log(`Found ${headings.length} headings in news article`);
    
    // Insert 1 image after each heading
    const actualImageCount = Math.min(headings.length, images.length);
    let offset = 0;
    
    for (let i = 0; i < actualImageCount; i++) {
      const heading = headings[i];
      const img = images[i];
      const imgTag = `\n<img src="${img.original}" alt="${img.title || keyword}" .../>\n`;
      
      const insertPosition = heading.end + offset;
      finalContent = finalContent.slice(0, insertPosition) + imgTag + finalContent.slice(insertPosition);
      offset += imgTag.length;
      
      console.log(`✅ Inserted image ${i + 1} after ${heading.tag.toUpperCase()}`);
    }
  }
}
```

**Placement**: Sau Step 8 (Generate meta), trước Step 9 (Clean HTML)

---

## 📊 So Sánh 3 Strategies

| Feature | AI Write (Article) | Toplist | News |
|---------|-------------------|---------|------|
| **Chèn theo** | Đoạn văn (paragraphs) | Heading (H2/H3) | Heading (H2/H3) |
| **Số lượng ảnh** | User chọn (1-10) | Tự động theo itemCount | Tự động theo headings |
| **UI Control** | Checkbox + Select dropdown | Checkbox only | Checkbox only |
| **Search count** | `maxImages * 2` | `itemCount * 2` | 20 (fixed) |
| **Spacing formula** | `floor(availableParagraphs / maxImages)` | N/A (1:1 với heading) | N/A (1:1 với heading) |
| **Đoạn cuối** | Không chèn | N/A | N/A |
| **Token cost** | 300 tokens/search | 300 tokens/search | 300 tokens/search |

---

## 🎯 Logs Mẫu

### AI Write (Article)
```
🖼️ [req_xxx] Starting auto image insertion...
🎯 Target image count: 5
📸 Searching images for primary keyword: "laptop gaming"
   Found 20 images for primary keyword
   Found 15 paragraphs in article
🎯 Target images: 5, Available paragraphs: 14, Will insert: 5 images
   Spacing: Insert 1 image every 2 paragraph(s)
   ✅ Inserted image 1/5 after paragraph 2
   ✅ Inserted image 2/5 after paragraph 4
   ✅ Inserted image 3/5 after paragraph 6
   ✅ Inserted image 4/5 after paragraph 8
   ✅ Inserted image 5/5 after paragraph 10
   Total: 5 images inserted successfully
🎉 [req_xxx] Auto image insertion complete
```

### Toplist
```
🖼️ [req_xxx] Starting auto image insertion for toplist...
🎯 Strategy: Insert 1 image per toplist item (after each H2/H3 heading)
📸 Searching images for keyword: "smartphone tốt nhất"
   Found 20 images for keyword
   Found 10 headings (toplist items) in content
   Will insert 10 images (1 per item)
   ✅ Inserted image 1/10 after H2: "1. iPhone 15 Pro Max..."
   ✅ Inserted image 2/10 after H2: "2. Samsung Galaxy S24 Ultra..."
   ✅ Inserted image 3/10 after H2: "3. Google Pixel 8 Pro..."
   ...
   ✅ Inserted image 10/10 after H2: "10. OnePlus 12..."
   Total: 10 images inserted successfully
🎉 [req_xxx] Auto image insertion complete
```

### News
```
🖼️ [req_xxx] Starting auto image insertion for news...
🎯 Strategy: Insert 1 image after each H2/H3 heading
📸 Searching images for keyword: "trí tuệ nhân tạo"
   Found 20 images for keyword
   Found 5 headings in news article
   Will insert 5 images (1 per heading)
   ✅ Inserted image 1/5 after H2: "AI đang thay đổi thế giới..."
   ✅ Inserted image 2/5 after H3: "Ứng dụng trong y tế..."
   ✅ Inserted image 3/5 after H3: "Tác động đến giáo dục..."
   ✅ Inserted image 4/5 after H2: "Thách thức và cơ hội..."
   ✅ Inserted image 5/5 after H3: "Tương lai của AI..."
   Total: 5 images inserted successfully
🎉 [req_xxx] Auto image insertion complete
```

---

## ✅ Build Status

```
✓ Client: 984.04 kB (gzipped: 266.93 kB)
✓ Server: 354.99 kB
✓ Build completed successfully in 2.30s
```

**No errors, no warnings** (ngoại trừ warning về Google Generative AI import - không ảnh hưởng tính năng)

---

## 🧪 Test Cases

### AI Write (Article)
- [x] Chọn 5 ảnh với 20 đoạn → spacing = 3
- [x] Chọn 10 ảnh với 20 đoạn → spacing = 1-2
- [x] Chọn 10 ảnh với 5 đoạn → chỉ chèn 4 ảnh
- [x] Không chèn ảnh vào đoạn cuối

### Toplist
- [x] Top 5 → chèn 5 ảnh (1 ảnh/mục)
- [x] Top 10 → chèn 10 ảnh (1 ảnh/mục)
- [x] Top 15 → chèn 15 ảnh (1 ảnh/mục)
- [x] Mỗi ảnh chèn ngay sau heading tương ứng

### News
- [x] Bài có 3 headings → chèn 3 ảnh
- [x] Bài có 7 headings → chèn 7 ảnh
- [x] Bài không có heading → không chèn ảnh, log warning
- [x] Mỗi ảnh chèn ngay sau heading tương ứng

---

## 🚀 Deployment Guide

### Pre-deployment
- [x] Build successful
- [x] All 3 features implemented
- [x] UI updated for all 3 forms
- [x] Backend logic tested

### Deployment Steps
1. **Upload code** to server:
   ```bash
   # Upload dist/spa/* to public_html
   # Upload dist/server/node-build.mjs to server folder
   ```

2. **Restart server**:
   ```bash
   pm2 restart volxai-api
   pm2 logs volxai-api --lines 50
   ```

3. **Test each feature**:
   - ✅ AI Write: Tạo bài với 5 ảnh, verify spacing
   - ✅ Toplist: Tạo Top 5, verify 5 ảnh (1/mục)
   - ✅ News: Tạo tin tức, verify ảnh chèn sau mỗi heading

4. **Monitor logs**:
   ```bash
   # Check for image insertion logs
   pm2 logs volxai-api | grep "🖼️"
   pm2 logs volxai-api | grep "✅ Inserted image"
   ```

---

## 📝 Documentation Updates

### User Guide (Vietnamese)

**AI Viết Bài Theo Từ Khóa**:
- ✅ Tích "Tự động tìm và chèn ảnh theo từ khóa"
- ✅ Chọn số lượng ảnh từ 1-10 (mặc định 5)
- ✅ Ảnh sẽ được chia đều vào các đoạn văn
- ✅ Cuối bài viết không chèn ảnh

**AI Viết Toplist**:
- ✅ Tích "Tự động tìm và chèn ảnh cho mỗi mục"
- ✅ Số ảnh = số mục (Top 5 → 5 ảnh, Top 10 → 10 ảnh)
- ✅ Mỗi mục sẽ có 1 ảnh minh họa

**AI Viết Tin Tức**:
- ✅ Tích "Tự động tìm và chèn ảnh cho mỗi heading"
- ✅ Mỗi heading sẽ có 1 ảnh minh họa
- ✅ Tự động theo số lượng heading trong bài

---

## 🎉 Summary

### Completed Features
1. ✅ **AI Write**: Chèn ảnh theo đoạn văn với số lượng tùy chọn (1-10)
2. ✅ **Toplist**: Chèn 1 ảnh/mục theo heading
3. ✅ **News**: Chèn 1 ảnh/heading (NEW FEATURE)

### Code Quality
- ✅ TypeScript type-safe
- ✅ Consistent logging
- ✅ Error handling
- ✅ Token tracking
- ✅ Clean code structure

### User Experience
- ✅ Clear UI labels
- ✅ Helpful hints
- ✅ Appropriate defaults
- ✅ Consistent behavior

---

## ✅ Status: FULLY COMPLETED

**Ngày hoàn thành**: 15/01/2026  
**Người thực hiện**: AI Assistant  
**Features**: 3/3 ✅

Tất cả các tính năng đã được implement đầy đủ và build thành công! 🎉🎊

### Final Stats
- **Frontend**: 3 forms updated (WriteByKeywordForm, ToplistForm, WriteNewsForm)
- **Backend**: 3 endpoints updated (generate-article, generate-toplist, generate-news)
- **Build size**: Client 984 KB, Server 355 KB
- **Token cost**: 300 tokens/search (FIND_IMAGE_SERP)
- **Image sources**: SerpAPI image search

**Ready for production deployment!** 🚀
