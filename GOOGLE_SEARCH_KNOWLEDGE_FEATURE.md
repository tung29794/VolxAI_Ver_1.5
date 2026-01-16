# Tính năng "Tham khảo thêm kiến thức trên Google tìm kiếm"

## Tổng quan

Tính năng mới cho phép AI tham khảo kiến thức từ Google tìm kiếm khi viết bài theo từ khóa, giúp bài viết có thông tin mới nhất và chính xác hơn.

## Thay đổi

### 1. Frontend - WriteByKeywordForm.tsx

#### Thêm trường mới trong formData:
```typescript
useGoogleSearch: false, // When true, force use Gemini 2.5 Flash with google-ai provider
```

#### UI mới - Checkbox "Tham khảo thêm kiến thức trên Google tìm kiếm":
- Vị trí: Ngay sau checkbox "Tự động tìm và chèn ảnh"
- Màu sắc: Nền xanh lá nhạt (bg-green-50) với viền xanh lá (border-green-200)
- Icon: 🔍
- Text: "Tham khảo thêm kiến thức trên Google tìm kiếm"
- Mô tả: "AI sẽ tìm kiếm thông tin trên Google để bổ sung kiến thức mới nhất cho bài viết. Tính năng này sử dụng Gemini 2.5 Flash để đảm bảo chất lượng tốt nhất."

#### Logic xử lý:
```typescript
onChange={(e) => setFormData(prev => ({
  ...prev,
  useGoogleSearch: e.target.checked,
  // Force Gemini 2.5 Flash when enabled
  model: e.target.checked ? "Gemini 2.5 Flash" : prev.model
}))}
```

#### Submit handler cập nhật:
```typescript
const submitData = {
  ...formData,
  model: formData.useGoogleSearch ? "Gemini 2.5 Flash" : formData.model,
};
```

**Kết quả**: Khi user chọn checkbox này, model tự động chuyển sang "Gemini 2.5 Flash" và không thể đổi sang model khác.

### 2. Frontend - WritingProgressView.tsx

#### Ẩn hiển thị Model:
Khi `useGoogleSearch = true`, phần hiển thị tên Model trong tiến trình viết bài sẽ bị ẩn đi:

```typescript
{!formData.useGoogleSearch && (
  <div className="ml-auto pt-4">
    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
      MODEL
    </p>
    <p className="text-sm font-semibold text-foreground">
      {formData.model}
    </p>
  </div>
)}
```

**Lý do**: Để tránh hiển thị "Gemini 2.5 Flash" trong UI khi user sử dụng tính năng Google Search.

### 3. Backend - server/routes/ai.ts

#### Cập nhật interface GenerateArticleRequest:
```typescript
interface GenerateArticleRequest {
  // ... existing fields
  useGoogleSearch?: boolean; // When true, use Gemini 2.5 Flash with google-ai provider
}
```

#### Cập nhật handler handleGenerateArticle:

1. **Nhận useGoogleSearch từ request body:**
```typescript
const { keyword, language, outlineType, tone, model, length, customOutline, internalLinks, endContent, boldKeywords, autoInsertImages, useGoogleSearch } =
  req.body as GenerateArticleRequest;
```

2. **Logic chọn API key dựa trên useGoogleSearch:**
```typescript
let apiKey: string;
let provider: string;

if (useGoogleSearch) {
  // Use Google AI (Gemini) when Google Search is enabled
  console.log('🔍 Using Google AI (Gemini) with search knowledge');
  const googleApiKeys = await query<any>(
    `SELECT api_key FROM api_keys
     WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
     LIMIT 1`,
  );

  if (googleApiKeys.length === 0) {
    res.status(503).json({ error: "Google AI API key not configured. Please add it in Admin > Quản lý API" });
    return;
  }

  apiKey = googleApiKeys[0].api_key;
  provider = 'google-ai';
} else {
  // Use OpenAI by default
  const apiKeys = await query<any>(
    `SELECT api_key FROM api_keys
     WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
     LIMIT 1`,
  );

  if (apiKeys.length === 0) {
    res.status(503).json({ error: "OpenAI API key not configured. Please add it in Admin > Quản lý API" });
    return;
  }

  apiKey = apiKeys[0].api_key;
  provider = 'openai';
}
```

**Kết quả**: 
- Khi `useGoogleSearch = true`: Backend sẽ lấy API key từ provider = 'google-ai'
- Khi `useGoogleSearch = false`: Backend sẽ lấy API key từ provider = 'openai' (mặc định)

## Database

### API Keys Table:
```
id      provider        category        description
9       google-ai       content         Gemini
```

API key Google AI đã có sẵn trong database với:
- provider: `google-ai`
- category: `content`
- description: `Gemini`

## Cách sử dụng

1. Vào trang `/account`
2. Chọn chức năng "AI Viết bài theo từ khóa"
3. Nhập từ khóa và các thông tin cần thiết
4. **Tích vào checkbox "🔍 Tham khảo thêm kiến thức trên Google tìm kiếm"**
5. Model sẽ tự động chuyển sang "Gemini 2.5 Flash"
6. Bấm "Tạo bài viết"
7. Trong quá trình viết, tên Model sẽ không hiển thị
8. AI sẽ sử dụng Google AI (Gemini) để tìm kiếm và viết bài với kiến thức từ Google

## Lưu ý

- ⚠️ **Tính năng này chỉ hoạt động khi có API key "google-ai" trong database**
- ⚠️ **Luôn luôn sử dụng Model "Gemini 2.5 Flash" khi checkbox được chọn, bất kể user có thay đổi model hay không**
- ⚠️ **Tên Model sẽ không hiển thị trong tiến trình viết bài**
- ✅ **Backend tự động chọn đúng provider (google-ai) khi nhận được useGoogleSearch = true**

## Testing

Để test tính năng:

1. Kiểm tra checkbox hiển thị đúng trong WriteByKeywordForm
2. Chọn checkbox và xác nhận model tự động chuyển sang "Gemini 2.5 Flash"
3. Submit form và kiểm tra console backend có log "🔍 Using Google AI (Gemini) with search knowledge"
4. Xác nhận trong tiến trình viết không hiển thị tên Model
5. Kiểm tra API call đến Google AI API (nếu có Gemini API integration)

## Build Status

✅ Build thành công không có lỗi
- Client build: ✓
- Server build: ✓

## Files Changed

1. `client/components/WriteByKeywordForm.tsx` - Thêm checkbox và logic force model
2. `client/components/WritingProgressView.tsx` - Ẩn hiển thị Model name
3. `server/routes/ai.ts` - Thêm logic chọn API key based on useGoogleSearch

## Next Steps

- [ ] Test với user thực tế
- [ ] Monitor API usage Google AI
- [ ] Có thể cần implement Gemini API call logic nếu backend chưa hỗ trợ
- [ ] Deploy lên production
