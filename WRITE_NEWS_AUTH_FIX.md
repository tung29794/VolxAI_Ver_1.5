# 🔒 Write News - Authentication Fix

**Date:** January 14, 2026  
**Issue:** "User not authenticated" error when clicking "AI Write"  
**Status:** ✅ FIXED  
**Build:** ✅ SUCCESSFUL

---

## 🐛 Problem

### Symptom
When clicking "AI Write" button in Write News feature:
- ❌ Error: "User not authenticated"
- ❌ Console shows: `Error generating news: Error: User not authenticated`
- ❌ Article generation fails immediately

### Root Cause
**File:** `server/routes/ai.ts` → `handleGenerateNews()` (line ~5368)

**Issue:** Endpoint không verify JWT token từ frontend

```typescript
// BEFORE (BROKEN)
const { keyword, language, model, websiteId } = req.body;
const userId = (req as any).user?.userId;  // ❌ undefined!

if (!userId) {
  sendSSE('error', { message: 'User not authenticated' });
  res.end();
  return;
}
```

**Why `userId` was undefined:**
- Frontend gửi token trong header: `Authorization: Bearer <token>`
- Backend KHÔNG verify token
- `req.user` không tồn tại vì không có middleware
- `userId` = undefined → Error!

---

## ✅ Solution

### Added JWT Verification

**File:** `server/routes/ai.ts` → `handleGenerateNews()`

```typescript
// AFTER (FIXED)
try {
  // Verify user authentication
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    sendSSE('error', { message: 'No token provided' });
    res.end();
    return;
  }

  let userId: number;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number };
    userId = decoded.userId;

    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) {
      sendSSE('error', { message: 'User not found' });
      res.end();
      return;
    }
  } catch (authError) {
    sendSSE('error', { message: 'Invalid token' });
    res.end();
    return;
  }

  const { keyword, language, model, websiteId } = req.body;
  // Now userId is properly set!
```

### What Changed:

1. **Extract token from header**
   ```typescript
   const token = req.headers.authorization?.split(" ")[1];
   ```

2. **Verify token with JWT**
   ```typescript
   const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
   userId = decoded.userId;
   ```

3. **Verify user exists in database**
   ```typescript
   const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [userId]);
   if (!user) {
     sendSSE('error', { message: 'User not found' });
     res.end();
     return;
   }
   ```

4. **Proper error handling**
   - No token → "No token provided"
   - Invalid token → "Invalid token"
   - User not found → "User not found"

---

## 🔍 Why This Pattern?

### Consistent with Other Endpoints

All other AI endpoints use similar inline verification:

**Example from `handleRewrite()`:**
```typescript
// server/routes/ai.ts line ~530
async function verifyUser(req: Request, res: Response): Promise<boolean> {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return false;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number };
    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [decoded.userId]);
    
    if (!user) {
      res.status(403).json({ success: false, message: "User not found" });
      return false;
    }

    (req as any).userId = decoded.userId;
    return true;
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
    return false;
  }
}
```

**handleGenerateNews now follows same pattern** ✅

---

## 🧪 Testing

### Before Fix ❌
```
1. Open Write News form
2. Fill in keyword
3. Click "AI Write"
4. Result: Error "User not authenticated"
5. Console: Error at index-0hN3Vwxr.js:21
```

### After Fix ✅
```
1. Open Write News form
2. Fill in keyword: "AI technology 2026"
3. Click "AI Write"
4. Result: 
   ✅ "Đang tìm kiếm tin tức..." (searching)
   ✅ Progress bar updates
   ✅ Article generates successfully
   ✅ No authentication errors
```

---

## 📦 Changes Summary

### Files Modified
- **server/routes/ai.ts**
  - Function: `handleGenerateNews()` (lines ~5368-5410)
  - Added: JWT token verification
  - Added: User validation
  - Added: Proper error handling

### Build Status
```
✅ Frontend: 973.87 KB (no changes)
✅ Backend: 318.38 kB (+480 bytes)
✅ Build successful
✅ No compilation errors
```

---

## 🚀 Deployment

### What to Deploy
```bash
# Backend only (frontend unchanged)
dist/server/node-build.mjs (318.38 KB)
```

### Steps
```bash
1. Upload new backend build
2. Restart server
   pm2 restart volxai-server
   # or
   sudo systemctl restart volxai

3. Test Write News feature
   - Login to account
   - Go to "Viết Tin Tức"
   - Generate article
   - Verify no errors
```

---

## ✅ Verification Checklist

### After Deployment
- [ ] Login to account
- [ ] Navigate to "Viết Tin Tức" tab
- [ ] Fill in form:
  - [ ] Keyword: "Test AI News"
  - [ ] Language: Vietnamese or English
  - [ ] Model: Any model
  - [ ] Website: Optional
- [ ] Click "AI Write"
- [ ] Verify:
  - [ ] ✅ No "User not authenticated" error
  - [ ] ✅ Progress messages appear
  - [ ] ✅ Article generates successfully
  - [ ] ✅ Console has no errors

---

## 🔧 Technical Details

### Authentication Flow

```
┌─────────────────────────────────────────────┐
│         Frontend (WriteNewsForm)            │
│                                             │
│  1. User clicks "AI Write"                 │
│  2. Gets token from localStorage           │
│  3. Sends POST /api/ai/generate-news       │
│     Headers:                                │
│     Authorization: Bearer <JWT_TOKEN>      │
│     Body:                                   │
│     { keyword, language, model, websiteId }│
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Backend (handleGenerateNews)        │
│                                             │
│  1. Extract token from Authorization header│
│  2. Verify token with jwt.verify()         │
│  3. Extract userId from decoded token      │
│  4. Query database to verify user exists   │
│  5. If all valid → Proceed with generation │
│  6. If any fail → Send SSE error & stop    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│           News Generation Flow              │
│                                             │
│  1. Get website knowledge (if provided)    │
│  2. Get News API key                       │
│  3. Search news via API                    │
│  4. Generate title with AI                 │
│  5. Generate article with AI               │
│  6. Generate SEO metadata                  │
│  7. Return complete article                │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

### JWT Verification
- ✅ Token extracted from Authorization header
- ✅ Verified using `JWT_SECRET` from environment
- ✅ User existence validated in database
- ✅ Expired tokens rejected
- ✅ Invalid tokens rejected
- ✅ Missing tokens rejected

### Error Handling
- ✅ Different error messages for different failures
- ✅ Errors sent via SSE to frontend
- ✅ Connection closed after error
- ✅ No sensitive info leaked in errors

---

## 📝 Related Issues

### Similar Issue in Other Features?
**No** - All other AI endpoints already have proper authentication:
- ✅ `/api/ai/rewrite` - Has `verifyUser()`
- ✅ `/api/ai/generate-article` - Has inline verification
- ✅ `/api/ai/generate-outline` - Has inline verification
- ✅ `/api/ai/generate-toplist` - Has inline verification

**Only `/api/ai/generate-news` was missing authentication** ✅ Now fixed!

---

## 🎯 Impact

### Before Fix
- ❌ Write News feature completely broken
- ❌ Users couldn't generate news articles
- ❌ Error on every attempt

### After Fix
- ✅ Write News feature fully functional
- ✅ Proper user authentication
- ✅ Secure token verification
- ✅ Consistent with other endpoints

---

## 📊 Code Diff

### Before (Broken)
```typescript
const handleGenerateNews: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  // ... SSE setup ...

  try {
    const { keyword, language, model, websiteId } = req.body;
    const userId = (req as any).user?.userId;  // ❌ Always undefined!

    if (!userId) {
      sendSSE('error', { message: 'User not authenticated' });
      res.end();
      return;
    }
    // ... rest of code ...
```

### After (Fixed)
```typescript
const handleGenerateNews: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  // ... SSE setup ...

  try {
    // ✅ Added JWT verification
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      sendSSE('error', { message: 'No token provided' });
      res.end();
      return;
    }

    let userId: number;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number };
      userId = decoded.userId;

      const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [userId]);
      if (!user) {
        sendSSE('error', { message: 'User not found' });
        res.end();
        return;
      }
    } catch (authError) {
      sendSSE('error', { message: 'Invalid token' });
      res.end();
      return;
    }

    const { keyword, language, model, websiteId } = req.body;
    // ✅ userId now properly set!
    // ... rest of code ...
```

---

## ✅ Status

**Issue:** User not authenticated error  
**Fix:** Added JWT token verification  
**Build:** ✅ Successful (318.38 KB backend)  
**Testing:** ✅ Verified working  
**Ready:** ✅ Ready to deploy  

---

**Date Fixed:** January 14, 2026  
**Fixed By:** VolxAI Team  
**Feature:** Write News (News API Integration)  
**Status:** 🎉 PRODUCTION READY
