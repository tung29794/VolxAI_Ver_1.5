# 📊 BÁO CÁO CHUYỂN ĐỔI AI PROMPTS SANG DATABASE

**Ngày thực hiện:** 8 Tháng 1, 2026  
**Người thực hiện:** AI Assistant  
**Trạng thái:** ✅ Hoàn thành

---

## 🎯 Mục Tiêu

Kiểm tra và chuyển đổi tất cả AI prompts từ hardcode sang database để dễ dàng quản lý và chỉnh sửa thông qua Admin Dashboard.

---

## 📋 Tình Trạng AI Features

### ✅ Đã Load từ Database

| Feature Name | Display Name | Endpoint | Status |
|-------------|--------------|----------|---------|
| `rewrite_content` | Viết lại nội dung | `/api/ai/rewrite` | ✅ Active |
| `expand_content` | Mở rộng nội dung | `/api/ai/write-more` | ✅ Active |
| `generate_article` | Tạo bài viết hoàn chỉnh | `/api/ai/generate-article` | ✅ Active |
| `generate_seo_title` | Tạo tiêu đề SEO | `/api/ai/generate-seo-title` | ✅ Active |
| `generate_meta_description` | Tạo Meta Description | `/api/ai/generate-meta-description` | ✅ Active |
| `generate_outline` | Tạo dàn ý bài viết | `/api/ai/generate-outline` | ✅ Active (Mới thêm) |

### 🔧 Features Không Cần Prompt từ Database

| Feature Name | Endpoint | Lý do |
|-------------|----------|-------|
| `find_image` | `/api/ai/find-image` | Sử dụng API bên thứ 3 (SerpAPI, Serper, Pixabay), không cần OpenAI |

### 📦 Prompts Inactive trong Database

| Feature Name | Display Name | Lý do Inactive |
|-------------|--------------|----------------|
| `write_short_article` | Viết bài ngắn gọn | Chưa triển khai trong code |
| `generate_short_outline` | Tạo dàn ý ngắn gọn | Chưa triển khai trong code |
| `auto_short_outline` | Tự động tạo dàn ý ngắn | Chưa triển khai trong code |

---

## 🔨 Thay Đổi Đã Thực Hiện

### 1. ✅ Thêm Prompt `generate_outline` vào Database

**File SQL:** Đã thực thi trực tiếp vào database

```sql
INSERT INTO ai_prompts 
(feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
VALUES 
(
  'generate_outline',
  'Tạo dàn ý bài viết',
  'Tạo dàn ý chi tiết cho bài viết với cấu trúc H2/H3',
  'Create a detailed article outline about: "{keyword}" ...',
  'You are an expert SEO content strategist...',
  '["keyword", "language", "length_description", "tone", "h2_count", "h3_per_h2"]',
  1
);
```

**Kết quả:** ✅ Prompt ID: 21 đã được thêm vào bảng `ai_prompts`

---

### 2. ✅ Cập Nhật Code `handleGenerateOutline`

**File:** `server/routes/ai.ts` (dòng ~890-970)

**Thay đổi:**
- ❌ **Trước:** Sử dụng hardcoded prompt string
- ✅ **Sau:** Load prompt từ database bằng `loadPrompt('generate_outline')`
- ✅ Thêm fallback mechanism nếu database không có prompt
- ✅ Sử dụng `interpolatePrompt()` để thay thế variables động

**Variables được sử dụng:**
- `{keyword}` - Từ khóa chính
- `{language}` - Ngôn ngữ (Vietnamese, English, v.v.)
- `{length_description}` - Mô tả độ dài bài viết
- `{tone}` - Giọng điệu (professional, casual, v.v.)
- `{h2_count}` - Số lượng H2 sections
- `{h3_per_h2}` - Số lượng H3 per H2

---

### 3. ✅ Cập Nhật Auto-Generate Outline trong `handleGenerateArticle`

**File:** `server/routes/ai.ts` (dòng ~1220-1310)

**Thay đổi:**
- ✅ Load prompt `generate_outline` từ database cho auto-generation
- ✅ Tái sử dụng cùng prompt template khi user chọn "no-outline"
- ✅ Thêm fallback mechanism

**Lợi ích:**
- Giữ consistency giữa manual và auto outline generation
- Dễ dàng chỉnh sửa behavior thông qua Admin Dashboard

---

### 4. ✅ Sửa Lỗi Feature Name `write_more` → `expand_content`

**File:** `server/routes/ai.ts` (dòng ~708)

**Vấn đề:**
- Code đang load `loadPrompt('write_more')` nhưng trong database là `expand_content`

**Sửa:**
```typescript
// ❌ Trước
const promptTemplate = await loadPrompt('write_more');

// ✅ Sau
const promptTemplate = await loadPrompt('expand_content');
```

---

## 🗂️ Cấu Trúc Database

### Bảng `ai_prompts`

```sql
CREATE TABLE ai_prompts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  available_variables JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Prompts Hiện Tại (9 records)

| ID | Feature Name | Active | Prompt Length | System Length |
|----|--------------|--------|---------------|---------------|
| 12 | expand_content | ✅ | 162 chars | 168 chars |
| 13 | rewrite_content | ✅ | 178 chars | 208 chars |
| 14 | generate_article | ✅ | 415 chars | 766 chars |
| 15 | generate_seo_title | ✅ | 316 chars | 151 chars |
| 16 | generate_meta_description | ✅ | 363 chars | 170 chars |
| 18 | write_short_article | ❌ | 1697 chars | 640 chars |
| 19 | generate_short_outline | ❌ | 1222 chars | 513 chars |
| 20 | auto_short_outline | ❌ | 676 chars | 314 chars |
| 21 | generate_outline | ✅ | ~900 chars | ~150 chars |

---

## 🔍 Kiểm Tra Code Implementation

### Function `loadPrompt()`

**Location:** `server/routes/ai.ts` (dòng 26-49)

```typescript
async function loadPrompt(featureName: string): Promise<AIPromptTemplate | null> {
  try {
    const prompt = await queryOne<any>(
      `SELECT prompt_template, system_prompt, available_variables
       FROM ai_prompts
       WHERE feature_name = ? AND is_active = TRUE`,
      [featureName]
    );

    if (prompt) {
      return {
        prompt_template: prompt.prompt_template,
        system_prompt: prompt.system_prompt,
        available_variables: prompt.available_variables
          ? JSON.parse(prompt.available_variables)
          : [],
      };
    }

    return null;
  } catch (error) {
    console.error(`Error loading prompt for ${featureName}:`, error);
    return null;
  }
}
```

**Features:**
- ✅ Load từ database
- ✅ Chỉ load prompts active (`is_active = TRUE`)
- ✅ Parse JSON cho `available_variables`
- ✅ Error handling

---

### Function `interpolatePrompt()`

**Location:** `server/routes/ai.ts` (dòng 55-62)

```typescript
function interpolatePrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}
```

**Features:**
- ✅ Thay thế `{variable}` bằng giá trị thực
- ✅ Hỗ trợ multiple occurrences
- ✅ Handle empty values

---

## 🎉 Kết Quả

### ✅ Đã Hoàn Thành

1. ✅ Tất cả AI features đã load prompts từ database
2. ✅ Không còn hardcoded prompts (chỉ còn fallback)
3. ✅ Admin có thể chỉnh sửa prompts qua Dashboard
4. ✅ Code có fallback mechanism nếu database fail
5. ✅ Thêm prompt `generate_outline` thành công
6. ✅ Sửa lỗi feature name mismatch

---

## 🛠️ Hướng Dẫn Sử Dụng

### Chỉnh Sửa Prompts qua Admin Dashboard

1. **Đăng nhập Admin:** https://volxai.com/admin
2. **Chọn tab:** "AI Prompts"
3. **Chọn prompt muốn sửa** → Click "Edit"
4. **Chỉnh sửa:**
   - Display Name
   - Description
   - Prompt Template
   - System Prompt
   - Available Variables
5. **Save** → Thay đổi có hiệu lực ngay lập tức

### Thêm Prompt Mới

1. **Click "Create New Prompt"**
2. **Điền thông tin:**
   - Feature Name (unique, snake_case)
   - Display Name
   - Description
   - Prompt Template (với `{variables}`)
   - System Prompt
   - Available Variables (JSON array)
3. **Save** → Prompt sẵn sàng sử dụng

### Sử Dụng Variables trong Prompt

**Ví dụ:**
```
Prompt Template: "Write an article about {keyword} in {language}"
Available Variables: ["keyword", "language"]
```

**Trong code:**
```typescript
const prompt = interpolatePrompt(template, {
  keyword: "AI Technology",
  language: "Vietnamese"
});
// Result: "Write an article about AI Technology in Vietnamese"
```

---

## 🔒 Database Connection Info

**Database:** jybcaorr_lisacontentdbapi  
**User:** jybcaorr_lisaaccountcontentapi  
**Host:** localhost  
**Table:** `ai_prompts`

**SSH Access:**
- Host: ghf57-22175.azdigihost.com
- Port: 2210
- User: jybcaorr

---

## 📝 Notes

1. **Fallback Mechanism:** Nếu database không có prompt hoặc bị lỗi, system sẽ tự động dùng hardcoded prompts để đảm bảo service không bị gián đoạn.

2. **Performance:** Load prompts từ database không ảnh hưởng đáng kể đến performance vì:
   - Queries đơn giản (indexed on `feature_name`)
   - Cached trong memory của database
   - Chỉ load 1 lần mỗi request

3. **Future Improvements:**
   - Có thể implement caching layer (Redis) cho prompts
   - Version control cho prompts
   - A/B testing cho different prompt variations

---

## ✅ Checklist Hoàn Thành

- [x] Kiểm tra tất cả AI features
- [x] Xác định features đang hardcode
- [x] Thêm prompt `generate_outline` vào database
- [x] Cập nhật code `handleGenerateOutline` load từ database
- [x] Cập nhật auto-generate outline trong `handleGenerateArticle`
- [x] Sửa lỗi feature name `write_more` → `expand_content`
- [x] Verify tất cả prompts load thành công
- [x] Tạo báo cáo chi tiết

---

**🎊 TẤT CẢ AI PROMPTS ĐÃ ĐƯỢC CHUYỂN SANG DATABASE THÀNH CÔNG! 🎊**
