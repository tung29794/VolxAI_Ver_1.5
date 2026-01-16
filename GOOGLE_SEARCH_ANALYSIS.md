# Phân Tích: Google Search trong AI Viết Bài Theo Từ Khóa vs AI Viết Tin Tức

## 📊 So Sánh Hai Chức Năng

### 🔵 AI Viết Tin Tức (News Writing)
**Cách hoạt động:**
1. ✅ **Tìm kiếm News API** - Dùng SerpAPI/Serper/Zenserp để tìm tin tức
2. ✅ **Tổng hợp nội dung** - Aggregate thông tin từ nhiều nguồn tin tức
3. ✅ **Viết bài dựa trên context** - AI viết bài dựa trên news context đã tổng hợp
4. ✅ **Sử dụng OpenAI hoặc Gemini** - Cả hai đều có thể dùng

**Code flow:**
```typescript
// Step 1-3: Search news using SerpAPI/Serper/Zenserp
const newsResults = await searchNewsAPI(keyword);

// Step 4: Aggregate news information
const newsContext = newsResults.map((item, idx) => 
  `[${idx + 1}] ${item.title}\n${item.snippet}\nNguồn: ${item.source}`
).join('\n\n');

// Step 5-6: Generate article using newsContext
const articlePrompt = `Write article based on these news sources:
${newsContext}
...`;

// AI writes article with full context
const article = await generateWithAI(articlePrompt);
```

---

### 🟢 AI Viết Bài Theo Từ Khóa (Keyword Writing) với Google Search
**Cách hoạt động hiện tại:**
1. ⚠️ **KHÔNG tìm kiếm trước** - Không có bước fetch Google results
2. ⚠️ **KHÔNG tổng hợp nội dung** - Không có aggregation step
3. ✅ **Chỉ enable Gemini tool** - Khi `useGoogleSearch=true`, chỉ thêm `google_search` tool vào Gemini request
4. ⚠️ **Gemini tự quyết định** - Gemini tự động search khi cần (hoặc không)

**Code flow:**
```typescript
// Không có search step

// Chỉ enable Google Search tool cho Gemini
if (useGoogleSearch) {
  geminiRequestBody.tools = [
    {
      google_search: {}  // Gemini tự quyết định khi nào search
    }
  ];
}

// AI viết bài với khả năng search (nhưng không được cung cấp context sẵn)
const article = await generateWithGemini(prompt, tools);
```

---

## ❌ Vấn Đề Hiện Tại

### 1. **Không Tìm Kiếm & Tổng Hợp Trước**
- ❌ Không fetch Google search results trước khi viết
- ❌ Không aggregate thông tin từ nhiều nguồn
- ❌ Không cung cấp context phong phú cho AI

### 2. **Phụ Thuộc Hoàn Toàn Vào Gemini**
- ⚠️ Gemini **có thể** search, nhưng không bắt buộc
- ⚠️ Gemini **có thể** bỏ qua search nếu nó cho rằng không cần
- ⚠️ Kết quả không nhất quán

### 3. **Không Xử Lý Outline Per-Heading**
- ❌ Không có logic "nếu heading thiếu thông tin thì search riêng cho heading đó"
- ❌ Không có step-by-step outline filling
- ❌ Chỉ viết toàn bộ bài một lúc

---

## ✅ Yêu Cầu Của Bạn

Bạn muốn chức năng "AI Viết Bài Theo Từ Khóa" với Google Search hoạt động như sau:

### Bước 1: Tìm Kiếm & Tổng Hợp
```
1. Fetch Google search results (NOT news, just regular search)
2. Aggregate content from multiple search results
3. Create searchContext similar to newsContext
```

### Bước 2: Viết Bài Theo Outline
```
1. Use Gemini to write article based on:
   - searchContext (aggregated Google results)
   - outline structure
   
2. For each heading in outline:
   - If heading has enough info from searchContext → write
   - If heading lacks info → search Google for that specific heading
   - Aggregate results for that heading
   - Write that section
   
3. Continue until entire outline is complete
```

---

## 🔧 Cần Implement

### Feature 1: Google Search Integration (như News API)
```typescript
// Similar to news search, but for general web search
async function searchGoogleWeb(keyword: string, language: string) {
  // Use SerpAPI/Serper for web search (not news)
  // Return: { title, snippet, link, source }[]
}

// Aggregate results into context
const searchContext = results.map((item, idx) => 
  `[${idx + 1}] ${item.title}\n${item.snippet}\nLink: ${item.link}`
).join('\n\n');
```

### Feature 2: Per-Heading Search & Writing
```typescript
// For each heading in outline
for (const heading of outline.sections) {
  // Check if searchContext has enough info for this heading
  const hasEnoughInfo = checkContextForHeading(searchContext, heading);
  
  if (!hasEnoughInfo) {
    // Search specifically for this heading
    const headingResults = await searchGoogleWeb(heading.title, language);
    const headingContext = aggregateResults(headingResults);
    
    // Merge into main context
    searchContext += `\n\n[Info for "${heading.title}"]\n${headingContext}`;
  }
  
  // Write this section with available context
  const sectionContent = await writeSection(heading, searchContext);
  fullArticle += sectionContent;
}
```

---

## 📋 Implementation Plan

### Phase 1: Add Google Web Search
- [ ] Add `searchGoogleWeb()` function (similar to news search)
- [ ] Support SerpAPI/Serper/Zenserp for web search
- [ ] Aggregate results into `searchContext`

### Phase 2: Modify Article Generation Flow
- [ ] When `useGoogleSearch=true`, fetch Google results first
- [ ] Pass `searchContext` to article generation prompt
- [ ] Update prompt to use context

### Phase 3: Per-Heading Search (Advanced)
- [ ] Parse outline into sections
- [ ] For each section, check if context is sufficient
- [ ] Search specifically for headings that need more info
- [ ] Write section by section instead of all at once

---

## 🎯 Expected Result

**Before:**
```
useGoogleSearch=true
→ Gemini may or may not search
→ Inconsistent results
→ No guarantee of external knowledge
```

**After:**
```
useGoogleSearch=true
→ Fetch Google search results (10+ sources)
→ Aggregate into rich context
→ For each outline heading:
    - Check if enough info
    - If not, search for that heading specifically
    - Write section with full context
→ Consistent, well-researched articles
```

---

## 💡 Recommendation

Implement **Phase 1 & 2 first** (basic Google search integration):
- Easy to implement (copy news search logic)
- Provides immediate value
- Ensures consistent use of external knowledge

Then add **Phase 3** (per-heading search) later:
- More complex logic
- Requires outline parsing
- Requires heading-specific search strategy
- Higher API costs (more search calls)

---

## ❓ Câu Hỏi Cho Bạn

1. Bạn có muốn implement đầy đủ 3 phases không?
2. Hay chỉ cần Phase 1+2 (search + aggregate) là đủ?
3. Có giới hạn số lượng search calls cho per-heading search không?
4. Có muốn user chọn được "search for entire article" vs "search per heading" không?
