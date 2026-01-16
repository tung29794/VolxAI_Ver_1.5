# Cập nhật Cấu hình Số Đoạn (Paragraph Configuration)

## Tổng quan thay đổi
Đã cập nhật số lượng đoạn văn cho mỗi heading để tạo ra bài viết chi tiết và đầy đủ hơn.

## Cấu hình mới

### AI Outline (Có sử dụng outline)
**Tất cả độ dài: 3-4 đoạn cho mỗi heading**

- Short (~1500 từ): **3-4 đoạn** cho mỗi H2 và H3
- Medium (~2000 từ): **3-4 đoạn** cho mỗi H2 và H3
- Long (~3000 từ): **3-4 đoạn** cho mỗi H2 và H3

### No Outline (Không sử dụng outline)
**Số đoạn tăng dần theo độ dài bài viết:**

| Độ dài | Số từ | Số đoạn/heading | H2 Paragraphs | H3 Paragraphs |
|--------|-------|-----------------|---------------|---------------|
| Short  | ~1500-2000 | **2-3 đoạn** | 2 | 2 |
| Medium | ~2000-2500 | **3-4 đoạn** | 3 | 3 |
| Long   | ~3000-4000 | **5-6 đoạn** | 5 | 5 |

## So sánh với cấu hình cũ

### Cấu hình CŨ:
```typescript
short: {
  h2Paragraphs: 2,              // AI outline: 2-3 đoạn
  h2ParagraphsNoOutline: 1,     // No outline: 1-2 đoạn
}
medium: {
  h2Paragraphs: 2,              // 2-3 đoạn
  h2ParagraphsNoOutline: 2,     // 2-3 đoạn
}
long: {
  h2Paragraphs: 3,              // 3-4 đoạn
  h2ParagraphsNoOutline: 3,     // 3-4 đoạn
}
```

### Cấu hình MỚI:
```typescript
short: {
  h2Paragraphs: 3,              // AI outline: 3-4 đoạn
  h2ParagraphsNoOutline: 2,     // No outline: 2-3 đoạn
}
medium: {
  h2Paragraphs: 3,              // AI outline: 3-4 đoạn
  h2ParagraphsNoOutline: 3,     // No outline: 3-4 đoạn
}
long: {
  h2Paragraphs: 3,              // AI outline: 3-4 đoạn
  h2ParagraphsNoOutline: 5,     // No outline: 5-6 đoạn
}
```

## Thay đổi chính

### AI Outline
- **Short**: 2-3 đoạn → **3-4 đoạn** (+1 đoạn)
- **Medium**: 2-3 đoạn → **3-4 đoạn** (+1 đoạn)
- **Long**: Giữ nguyên **3-4 đoạn**

### No Outline
- **Short**: 1-2 đoạn → **2-3 đoạn** (+1 đoạn)
- **Medium**: Giữ nguyên **3-4 đoạn**
- **Long**: 3-4 đoạn → **5-6 đoạn** (+2 đoạn)

## Lý do thay đổi

1. **AI Outline cần nhất quán**: Tất cả độ dài đều dùng 3-4 đoạn để đảm bảo chất lượng nội dung đồng đều
2. **No Outline cần linh hoạt**: Bài dài hơn cần nhiều đoạn hơn để phát triển nội dung đầy đủ
3. **Tránh bài viết quá ngắn**: Cấu hình cũ (1-2 đoạn cho Short) tạo ra nội dung quá ngắn gọn

## Ví dụ cụ thể

### AI Outline - Short (1500 từ)
```html
<h2>Giới thiệu về chỉ báo RSI</h2>
<p>Đoạn 1: Giải thích cơ bản về RSI (100+ từ)...</p>
<p>Đoạn 2: Lịch sử phát triển và tầm quan trọng (100+ từ)...</p>
<p>Đoạn 3: Ứng dụng trong thực tế (100+ từ)...</p>

<h3>Khái niệm RSI</h3>
<p>Đoạn 1: Định nghĩa chi tiết (100+ từ)...</p>
<p>Đoạn 2: Công thức tính và ý nghĩa (100+ từ)...</p>
<p>Đoạn 3: Ví dụ minh họa (100+ từ)...</p>
```

### No Outline - Long (3000 từ)
```html
<h2>Phương pháp giao dịch với RSI</h2>
<p>Đoạn 1: Tổng quan về phương pháp (120+ từ)...</p>
<p>Đoạn 2: Chiến lược cơ bản (120+ từ)...</p>
<p>Đoạn 3: Chiến lược nâng cao (120+ từ)...</p>
<p>Đoạn 4: Kết hợp với chỉ báo khác (120+ từ)...</p>
<p>Đoạn 5: Case study thực tế (120+ từ)...</p>

<h3>Chiến lược mua vào</h3>
<p>Đoạn 1: Điều kiện entry (120+ từ)...</p>
<p>Đoạn 2: Xác nhận tín hiệu (120+ từ)...</p>
<p>Đoạn 3: Quản lý rủi ro (120+ từ)...</p>
<p>Đoạn 4: Stop loss và take profit (120+ từ)...</p>
<p>Đoạn 5: Ví dụ thực chiến (120+ từ)...</p>
```

## Code Implementation

### File: server/routes/ai.ts (~Line 1177)

```typescript
const lengthMap: Record<string, { 
  instruction: string, 
  minWords: number, 
  maxWords: number, 
  h2Paragraphs: number,      // For AI outline
  h3Paragraphs: number,      // For AI outline
  h2ParagraphsNoOutline: number,  // For No outline
  h3ParagraphsNoOutline: number,  // For No outline
  paragraphWords: number 
}> = {
  short: { 
    instruction: "Write approximately 1,500–2,000 words (Short article)", 
    minWords: 1500, 
    maxWords: 2000,
    h2Paragraphs: 3,              // AI outline: 3-4 đoạn
    h3Paragraphs: 3,              // AI outline: 3-4 đoạn
    h2ParagraphsNoOutline: 2,     // No outline: 2-3 đoạn
    h3ParagraphsNoOutline: 2,     // No outline: 2-3 đoạn
    paragraphWords: 100
  },
  medium: { 
    instruction: "Write approximately 2,000–2,500 words (Medium article)", 
    minWords: 2000, 
    maxWords: 2500,
    h2Paragraphs: 3,              // AI outline: 3-4 đoạn
    h3Paragraphs: 3,              // AI outline: 3-4 đoạn
    h2ParagraphsNoOutline: 3,     // No outline: 3-4 đoạn
    h3ParagraphsNoOutline: 3,     // No outline: 3-4 đoạn
    paragraphWords: 100
  },
  long: { 
    instruction: "Write approximately 3,000–4,000 words (Long article)", 
    minWords: 3000, 
    maxWords: 4000,
    h2Paragraphs: 3,              // AI outline: 3-4 đoạn
    h3Paragraphs: 3,              // AI outline: 3-4 đoạn
    h2ParagraphsNoOutline: 5,     // No outline: 5-6 đoạn
    h3ParagraphsNoOutline: 5,     // No outline: 5-6 đoạn
    paragraphWords: 120
  }
};
```

## Áp dụng cho cả OpenAI và Gemini

Cấu hình này được áp dụng thống nhất cho:
- ✅ **OpenAI GPT-3.5 Turbo**
- ✅ **OpenAI GPT-4 Turbo**
- ✅ **Google Gemini 2.0 Flash** (khi bật Google Search)

Tất cả các model đều sử dụng `actualH2Paragraphs` và `actualH3Paragraphs` được tính động dựa trên:
1. Outline type (AI Outline vs No Outline)
2. Article length (Short/Medium/Long)

## Testing Checklist

### AI Outline Tests
- [ ] **Short + AI Outline**: Kiểm tra mỗi H2 và H3 có 3-4 đoạn
- [ ] **Medium + AI Outline**: Kiểm tra mỗi H2 và H3 có 3-4 đoạn
- [ ] **Long + AI Outline**: Kiểm tra mỗi H2 và H3 có 3-4 đoạn
- [ ] Kiểm tra với OpenAI GPT-3.5
- [ ] Kiểm tra với OpenAI GPT-4
- [ ] Kiểm tra với Gemini + Google Search

### No Outline Tests
- [ ] **Short + No Outline**: Kiểm tra mỗi H2 và H3 có 2-3 đoạn
- [ ] **Medium + No Outline**: Kiểm tra mỗi H2 và H3 có 3-4 đoạn
- [ ] **Long + No Outline**: Kiểm tra mỗi H2 và H3 có 5-6 đoạn
- [ ] Kiểm tra với OpenAI GPT-3.5
- [ ] Kiểm tra với OpenAI GPT-4
- [ ] Kiểm tra với Gemini + Google Search

### Quality Checks
- [ ] Bài viết đạt tối thiểu số từ yêu cầu
- [ ] Mỗi đoạn có đủ 100-120+ từ
- [ ] Không có heading nào bị bỏ qua (đặc biệt H3)
- [ ] Nội dung không bị lặp lại
- [ ] Continuation logic hoạt động tốt

## Lợi ích

1. **Nội dung chi tiết hơn**: Nhiều đoạn văn = nhiều thông tin và phân tích sâu hơn
2. **Cấu trúc rõ ràng**: AI Outline có số đoạn nhất quán, dễ kiểm soát chất lượng
3. **Linh hoạt theo độ dài**: No Outline điều chỉnh số đoạn phù hợp với độ dài bài viết
4. **Đạt word count**: Nhiều đoạn hơn giúp đảm bảo đạt được số từ tối thiểu
5. **Chất lượng đồng đều**: Áp dụng cho cả OpenAI và Gemini

## Build Status
✅ Build completed successfully
- Client: 940.10 kB
- Server: 231.55 kB
- No errors

## Next Steps
1. Deploy build mới lên production
2. Test với các scenario khác nhau
3. Monitor chất lượng bài viết
4. Thu thập feedback từ người dùng
5. Điều chỉnh nếu cần thiết

## Notes
- Các giá trị `h2Paragraphs` và `h3Paragraphs` là số MINIMUM paragraphs
- AI có thể viết nhiều hơn nếu cần thiết để đạt word count
- Mỗi paragraph phải có ít nhất 100-120 từ tùy theo độ dài bài
- Cấu hình này cân bằng giữa chất lượng và thời gian generate
