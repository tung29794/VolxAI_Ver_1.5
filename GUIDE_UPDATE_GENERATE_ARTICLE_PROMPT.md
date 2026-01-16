# ✅ Hướng Dẫn: Update Prompt "Generate Article" - Output HTML cho Quill Editor

## 📋 Tóm Tắt

**Vấn đề:** AI viết bài theo từ khóa output ra Markdown (`## Heading`, `**bold**`, `- bullet`), khi paste vào Quill Editor nó hiển thị literal text thay vì format đẹp.

**Giải pháp:** Update prompt để AI output **Clean HTML** (`<h2>`, `<strong>`, `<ul><li>`) - format mà Quill Editor hiểu được.

---

## 🎯 Sự Khác Biệt

### ❌ Trước (Markdown - SAI)

AI output:
```markdown
## Giới Thiệu

Đây là **nội dung quan trọng** về topic.

- Điểm thứ nhất
- Điểm thứ hai
```

Khi paste vào Quill Editor → Hiển thị:
```
## Giới Thiệu

Đây là **nội dung quan trọng** về topic.

- Điểm thứ nhất
- Điểm thứ hai
```
👆 Xấu! User thấy raw Markdown text!

### ✅ Sau (HTML - ĐÚNG)

AI output:
```html
<h2>Giới Thiệu</h2>

<p>Đây là <strong>nội dung quan trọng</strong> về topic.</p>

<ul>
<li>Điểm thứ nhất</li>
<li>Điểm thứ hai</li>
</ul>
```

Khi paste vào Quill Editor → Hiển thị:

# **Giới Thiệu** (heading lớn)
Đây là **nội dung quan trọng** về topic.
• Điểm thứ nhất  
• Điểm thứ hai

👆 Đẹp! Format được render đúng!

---

## 🔧 Cách Update

### Bước 1: Chạy SQL Command

**Option A - Dùng phpMyAdmin:**
1. Vào phpMyAdmin
2. Chọn database: `jybcaorr_lisacontentdbapi`
3. Click tab "SQL"
4. Copy toàn bộ nội dung từ file `UPDATE_PROMPT_GENERATE_ARTICLE.sql`
5. Paste và click "Go"

**Option B - Dùng MySQL Command Line:**
```bash
mysql -h 103.221.221.67 -P 3306 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < UPDATE_PROMPT_GENERATE_ARTICLE.sql
```

### Bước 2: Verify Update

Chạy query kiểm tra:
```sql
SELECT 
  prompt_key,
  feature_name,
  LEFT(system_prompt, 100) as system_prompt_preview,
  updated_at
FROM ai_prompts 
WHERE prompt_key = 'generate_article';
```

Expected result:
```
prompt_key: generate_article
feature_name: Generate Article (HTML)
system_prompt_preview: You are a professional SEO content writer specializing in creating well-structured...
updated_at: 2026-01-05 ... (ngày hôm nay)
```

---

## 🧪 Test

### Test Request

```bash
curl -X POST https://api.volxai.com/api/ai/generate-article \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keyword": "Khóa học Forex tại Đà Nẵng",
    "language": "vi",
    "tone": "SEO Basic: Tập trung vào từ khóa",
    "model": "GPT 4.1 MINI"
  }'
```

### Expected Response

```json
{
  "success": true,
  "content": "<h2>Giới Thiệu Về Khóa Học Forex Tại Đà Nẵng</h2>\n\n<p>Forex là thị trường tài chính lớn nhất thế giới...</p>\n\n<h3>Lợi ích</h3>\n<ul>\n<li>Điểm thứ nhất</li>\n<li>Điểm thứ hai</li>\n</ul>",
  "articleId": 1234,
  ...
}
```

### Kiểm Tra Trong UI

1. Vào **Viết bài** → **Viết theo từ khóa**
2. Nhập keyword: "Khóa học Forex tại Đà Nẵng"
3. Chọn tone: "SEO Basic"
4. Click "Tạo bài viết"
5. Đợi AI viết xong

**Kết quả mong đợi:**
- ✅ Heading hiển thị to và đậm (không có dấu ##)
- ✅ Chữ bold hiển thị đậm (không có dấu **)
- ✅ Bullet list hiển thị dấu chấm tròn (không có dấu -)
- ✅ Content format đẹp, dễ đọc

**Nếu vẫn thấy Markdown:**
- ❌ Có dấu `##`, `**`, `-` → Prompt chưa update, check lại database
- ❌ Clear cache browser và test lại

---

## 📊 HTML Tags Được Hỗ Trợ

| Tag | Mục Đích | Example |
|-----|----------|---------|
| `<h2>` | Heading chính | `<h2>Section Title</h2>` |
| `<h3>` | Heading phụ | `<h3>Subsection</h3>` |
| `<p>` | Đoạn văn | `<p>Text content here</p>` |
| `<strong>` | Chữ đậm | `<strong>important</strong>` |
| `<em>` | Chữ nghiêng | `<em>emphasis</em>` |
| `<ul><li>` | Bullet list | `<ul><li>Item</li></ul>` |
| `<ol><li>` | Numbered list | `<ol><li>First</li></ol>` |
| `<blockquote>` | Quote | `<blockquote>Quote text</blockquote>` |
| `<a href>` | Link | `<a href="url">text</a>` |
| `<img>` | Hình ảnh | `<img src="url" alt="desc">` |
| `<table>` | Bảng | `<table><tr><td>Data</td></tr></table>` |

---

## ❓ FAQ

### Q: Tại sao không dùng Markdown?
**A:** Quill Editor không tự động convert Markdown → HTML. Nếu AI output `## Heading`, user sẽ thấy literal text `## Heading` thay vì heading thực sự.

### Q: Tại sao không có `<h1>`?
**A:** 
- `<h1>` dành cho page title (được set trong title field riêng)
- Article content nên bắt đầu từ `<h2>` (SEO best practice)
- Tránh duplicate `<h1>` trên cùng một page

### Q: Có cần restart server sau khi update?
**A:** KHÔNG cần. Backend tự động load prompt từ database mỗi lần request.

### Q: Output có bao gồm `<!DOCTYPE html>` không?
**A:** KHÔNG. Output chỉ là clean HTML content (bắt đầu từ `<h2>` hoặc `<p>`), không có document structure tags.

### Q: WordPress có hiểu HTML này không?
**A:** CÓ. WordPress hoàn toàn hiểu HTML, còn dễ hơn cả Markdown.

### Q: Có ảnh hưởng đến bài viết cũ không?
**A:** KHÔNG. Chỉ ảnh hưởng đến bài viết MỚI tạo sau khi update prompt.

---

## 📁 Files Liên Quan

1. `/PROMPT_GENERATE_ARTICLE_HTML.md` - Documentation đầy đủ
2. `/UPDATE_PROMPT_GENERATE_ARTICLE.sql` - SQL command để update
3. `/server/routes/ai.ts` - Backend code (line 716: `handleGenerateArticle`)
4. `/client/components/WritingProgressView.tsx` - Frontend component
5. `/client/components/WriteByKeywordForm.tsx` - Form input

---

## ✅ Checklist

- [ ] Đã chạy SQL update command
- [ ] Đã verify trong database (`SELECT * FROM ai_prompts WHERE prompt_key = 'generate_article'`)
- [ ] Đã test tạo bài viết mới với keyword
- [ ] Content hiển thị đúng format trong Quill Editor (không có Markdown syntax)
- [ ] Headings, bold, lists render đúng
- [ ] Content có thể publish lên WordPress thành công

---

**Created:** 5/1/2026  
**Author:** Tung Nguyen  
**Status:** ✅ Ready to Deploy
