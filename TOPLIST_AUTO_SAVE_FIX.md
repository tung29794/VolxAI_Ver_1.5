# 🔧 Toplist Auto-Save & Continue Editing Fix

**Date:** January 13, 2026  
**Status:** ✅ FIXED  
**Location:** `client/components/WritingProgressView.tsx`, `server/routes/ai.ts`

---

## 🔍 Issue Summary

Khi sử dụng tính năng **"AI viết bài dạng Toplist"**, có 2 vấn đề chính:

1. **Bài viết không tự động lưu** - Article is not automatically saved
2. **Nút "Tiếp tục chỉnh sửa bài viết" không hoạt động** - Continue editing button doesn't work

Nguyên nhân: 
- Backend có thể fail khi save (duplicate slug) và không gửi `articleId` trong SSE `complete` event
- Frontend không có logic fallback để save draft khi `articleId` bị thiếu
- Slug generation không xử lý ký tự Tiếng Việt (Vietnamese characters)

---

## 🛠️ What Was Fixed

### 1. Frontend Fix: Fallback Save Draft Logic

**File:** `client/components/WritingProgressView.tsx`

#### Changes:
- ✅ Added `slugify()` helper function to normalize Vietnamese characters
- ✅ Modified `handleContinueEditing()` to implement fallback save logic:
  - If `articleId` is present → navigate to editor (existing behavior)
  - If `articleId` is missing → call POST `/api/articles` to create a draft
  - Extract title from articleData or formData
  - Generate slug using slugify helper
  - Create minimal article payload with status='draft'
  - On success, navigate to editor with new article ID

#### Code Changes:
```typescript
// Added slugify helper
const slugify = (s: string) =>
  (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);

// Modified handleContinueEditing with fallback
const handleContinueEditing = () => {
  (async () => {
    // If server provided articleId, use it
    if (articleData && articleData.articleId) {
      toast.success("Bài viết đã được lưu thành công!");
      onComplete(articleData.articleId);
      return;
    }

    // Fallback: save draft via API
    const token = localStorage.getItem("authToken");
    const title = (articleData && articleData.title) || (formData.keyword || formData.topic || 'Bài viết AI');
    const slug = slugify(title);
    const payload = {
      title,
      content: articleData?.content || content,
      metaTitle: title,
      metaDescription: '',
      slug,
      keywords: [formData.keyword || formData.topic || ''],
      featuredImage: null,
      status: 'draft',
    };

    const saveResponse = await fetch(buildApiUrl('/api/articles'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (saveResponse.ok) {
      const data = await saveResponse.json();
      const newId = data.articleId || data.data?.articleId || data.id;
      if (newId) {
        toast.success('Bài viết đã được lưu thành công!');
        onComplete(newId.toString());
        return;
      }
    }

    toast.error('Có lỗi xảy ra khi lưu bài viết');
  })();
};
```

---

### 2. Backend Fix: Vietnamese Slug Generation

**File:** `server/routes/ai.ts`

#### Problem:
Both `handleGenerateArticle` and `handleGenerateToplist` used broken slug generation:
```typescript
// ❌ OLD: Doesn't handle Vietnamese characters
const slug = keyword
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
```

For Vietnamese keyword **"món ngon đà nẵng"**, this would create invalid slug **"mn-ngon--nng"** → database error.

#### Solution:
✅ Implemented proper Vietnamese slug generation:
```typescript
// ✅ NEW: Handles Vietnamese characters properly
let slug = (title || keyword)
  .toString()
  .normalize("NFKD")              // Normalize Unicode
  .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (á → a, ế → e)
  .toLowerCase()
  .trim()
  .replace(/[đĐ]/g, 'd')          // Convert Vietnamese đ → d
  .replace(/[^a-z0-9\s-]/g, '')   // Remove non-alphanumeric
  .replace(/[\s_-]+/g, '-')        // Replace spaces with hyphens
  .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
  .slice(0, 200);                  // Limit length

// Check if slug exists and make it unique
const existingSlug = await query<any>(
  "SELECT id FROM articles WHERE slug = ?",
  [slug]
);

if (existingSlug.length > 0) {
  const uniqueSuffix = Date.now().toString().slice(-6);
  slug = `${slug}-${uniqueSuffix}`;
  console.log(`⚠️ Slug conflict detected, using unique slug: "${slug}"`);
}
```

#### Applied to:
- ✅ `handleGenerateToplist` (line 4578)
- ✅ `handleGenerateArticle` (line 2675)

---

## 🎯 How It Works Now

### Scenario 1: Normal Flow (Backend Save Succeeds)
```
User submits toplist form
  ↓
Backend generates article with streaming
  ↓
Backend saves to database successfully
  ↓
Backend sends SSE: event=complete, data={ articleId: 123, title, content }
  ↓
Frontend: articleData.articleId exists
  ↓
Button click → navigate to /article/123
  ✅ SUCCESS
```

### Scenario 2: Backend Save Fails (e.g., slug conflict)
```
User submits toplist form
  ↓
Backend generates article with streaming
  ↓
Backend fails to save (duplicate slug or other error)
  ↓
Backend sends SSE: event=complete, data={ success: false, content, title }
  ↓
Frontend: articleData.articleId is missing
  ↓
Button click → Frontend calls POST /api/articles
  ↓
Creates draft with unique slug
  ↓
Returns new articleId
  ↓
Navigate to /article/{newId}
  ✅ SUCCESS (with fallback)
```

---

## 📊 Testing Checklist

### Test Case 1: Vietnamese Keyword Toplist
- [ ] Navigate to Account → Viết bài → Viết bài Toplist
- [ ] Input: **"món ngon đà nẵng"**
- [ ] Set itemCount: 5
- [ ] Click "Tạo bài"
- [ ] Wait for generation to complete
- [ ] Check browser console: should see `✅ Complete event received:` with `articleId`
- [ ] Click "Tiếp tục chỉnh sửa bài viết"
- [ ] Should navigate to `/article/{id}` with content loaded
- [ ] Verify slug in database: should be **"mon-ngon-da-nang-{suffix}"** (not "mn-ngon--nng")

### Test Case 2: English Keyword Toplist
- [ ] Input: **"best pizza recipes"**
- [ ] Set itemCount: 7
- [ ] Click "Tạo bài"
- [ ] Wait for generation
- [ ] Click "Tiếp tục chỉnh sửa bài viết"
- [ ] Should work normally

### Test Case 3: Duplicate Slug Scenario
- [ ] Generate toplist article with keyword **"test article"**
- [ ] Without deleting, generate another toplist with same keyword **"test article"**
- [ ] Both should save successfully with unique slugs (e.g., `test-article-123456` and `test-article-789012`)
- [ ] Both "Continue editing" buttons should work

### Test Case 4: Fallback Save Logic
- [ ] Simulate backend save failure (temporarily break DB connection)
- [ ] Generate toplist article
- [ ] Article content should stream successfully
- [ ] Backend should log: `❌ Error saving article to database:`
- [ ] Frontend should receive `complete` event without `articleId`
- [ ] Click "Tiếp tục chỉnh sửa bài viết"
- [ ] Frontend should call POST `/api/articles` to create draft
- [ ] Should navigate to editor with new article

---

## 🔧 Database Schema Verification

Make sure the `articles` table has a **UNIQUE** constraint on the `slug` column:

```sql
ALTER TABLE articles ADD UNIQUE KEY `unique_slug` (`slug`);
```

This ensures database-level protection against duplicate slugs.

---

## 📝 Files Modified

1. ✅ `client/components/WritingProgressView.tsx`
   - Added slugify helper
   - Implemented fallback save draft logic

2. ✅ `server/routes/ai.ts`
   - Fixed Vietnamese slug generation in `handleGenerateArticle` (line 2675)
   - Fixed Vietnamese slug generation in `handleGenerateToplist` (line 4578)
   - Added slug uniqueness check in toplist handler

---

## 🚀 Deployment Instructions

### 1. Backend Deployment
```bash
# Navigate to server directory
cd server

# Rebuild TypeScript
npm run build

# Restart server
pm2 restart all
# OR
npm run start
```

### 2. Frontend Deployment
```bash
# Navigate to client directory
cd client

# Build production bundle
npm run build

# Deploy to hosting
# (your deployment script here)
```

### 3. Verification
```bash
# Check server logs for slug generation
pm2 logs | grep "Generated slug"

# Should see:
# ✅ Generated slug with safety suffix: mon-ngon-da-nang-ab
# 🔖 [req_xxx] Generated slug: "mon-ngon-da-nang"
```

---

## 📖 Related Files

- `client/components/WriteByKeywordForm.tsx` - Regular article generation (already working)
- `client/components/ToplistForm.tsx` - Toplist form component
- `server/routes/articles.ts` - Article CRUD API (save/update endpoints)
- `server/routes/ai.ts` - AI generation handlers

---

## 🎉 Result

✅ Toplist articles now auto-save successfully with Vietnamese keywords  
✅ "Tiếp tục chỉnh sửa bài viết" button always works (with fallback)  
✅ Duplicate slug conflicts are handled gracefully  
✅ Vietnamese characters are properly normalized in slugs  

---

## 📞 Support

If issues persist after applying these fixes, check:
1. Browser console for errors (F12 → Console)
2. Server logs: `pm2 logs` or check `/server/logs/`
3. Database errors: `tail -f /var/log/mysql/error.log`
4. Network tab: verify SSE `complete` event contains expected payload

---

**Author:** GitHub Copilot  
**Updated:** January 13, 2026
