# ✅ ARTICLE LIMITS DISPLAY FEATURE

## 🎯 Tính năng mới

**Hiển thị số lượng bài viết đã dùng/giới hạn** cho user (không áp dụng cho admin)

---

## 📊 Vị trí hiển thị

### 1. **Trang viết bài mới** (`/write-article`)
- Hiển thị ở header, bên trái Token
- Format: `📝 X/Y bài`

### 2. **Trang chỉnh sửa bài viết** (`/article/:id`)
- Hiển thị ở header, bên trái Token
- Format: `📝 X/Y bài`

### 3. **Các trang còn lại** (Header component)
- Hiển thị trên header chung
- Bên trái Token
- Format: `📝 X/Y bài`

---

## 🚫 Điều kiện hiển thị

**KHÔNG hiển thị cho**:
- User có `role = 'admin'`

**CHỈ hiển thị cho**:
- User thường (role = 'user')
- Có đăng nhập

---

## 🗄️ Database

### API Endpoint: `/api/auth/me`

**Updated query**:
```sql
SELECT 
  id, 
  plan_type, 
  tokens_limit, 
  articles_limit, 
  articles_used_this_month,  -- ← NEW
  is_active, 
  expires_at 
FROM user_subscriptions 
WHERE user_id = ?
```

**Response format**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "subscription": {
    "plan_type": "free",
    "tokens_remaining": 10000,
    "articles_limit": 2,
    "articles_used_this_month": 1  // ← NEW
  }
}
```

---

## 💻 Code Changes

### 1. Backend: `server/routes/auth.ts`

#### Updated SQL query:
```typescript
// Get user subscription
let subscription = await queryOne<any>(
  "SELECT id, plan_type, tokens_limit, articles_limit, articles_used_this_month, is_active, expires_at FROM user_subscriptions WHERE user_id = ?",
  [decoded.userId],
);
```

**Change**: Added `articles_used_this_month` to SELECT

---

### 2. Frontend: `client/pages/ArticleEditor.tsx`

#### A. Added state:
```typescript
// Article limits tracking
const [articleLimits, setArticleLimits] = useState<{
  used: number;
  limit: number;
} | null>(null);
```

#### B. Updated fetch logic:
```typescript
const data = await response.json();
if (data.success && data.subscription) {
  setTokenBalance(data.subscription.tokens_remaining || 0);
  
  // Set article limits (only for non-admin users)
  if (data.user?.role !== "admin") {
    setArticleLimits({
      used: data.subscription.articles_used_this_month || 0,
      limit: data.subscription.articles_limit || 0,
    });
  }
}
```

#### C. Updated JSX (header display):
```tsx
<div className="flex items-center gap-3">
  {/* Article Limits Display (only for non-admin users) */}
  {!isAdmin && articleLimits !== null && (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/10 border border-secondary/20 rounded-lg">
      <span className="text-sm font-medium text-foreground">
        📝 {articleLimits.used}/{articleLimits.limit} bài
      </span>
    </div>
  )}
  
  {/* Token Balance Display */}
  {tokenBalance !== null && (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <Zap className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {tokenBalance.toLocaleString("vi-VN")} Token
      </span>
    </div>
  )}
</div>
```

---

### 3. Frontend: `client/components/Header.tsx`

#### A. Added state:
```typescript
const [articleLimits, setArticleLimits] = useState<{
  used: number;
  limit: number;
} | null>(null);
```

#### B. Updated fetch logic:
```typescript
const data = await response.json();
if (data.success && data.subscription) {
  setTokensLimit(data.subscription.tokens_remaining || 0);
  
  // Set article limits (only for non-admin users)
  if (data.user?.role !== "admin") {
    setArticleLimits({
      used: data.subscription.articles_used_this_month || 0,
      limit: data.subscription.articles_limit || 0,
    });
  }
}
```

#### C. Updated JSX:
```tsx
{/* Article Limits Display (only for non-admin users) */}
{user?.role !== "admin" && articleLimits !== null && (
  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/10 border border-secondary/20 rounded-lg">
    <span className="text-sm font-medium text-foreground">
      📝 {articleLimits.used}/{articleLimits.limit} bài
    </span>
  </div>
)}

{/* Token Balance Display */}
{tokensLimit !== null && (
  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
    <Zap className="w-4 h-4 text-primary" />
    <span className="text-sm font-medium text-foreground">
      {tokensLimit.toLocaleString("vi-VN")} Token
    </span>
  </div>
)}
```

---

## 🎨 UI Design

### Visual Layout:

```
┌─────────────────────────────────────────────────────┐
│ Header                                               │
│                                                       │
│  [Logo]    [Nav Links...]     [📝 1/2 bài] [⚡ 10,000 Token] [Tài khoản] [Đăng xuất] │
└─────────────────────────────────────────────────────┘
```

### Styling:

**Article Limits Box**:
- Background: `bg-secondary/10`
- Border: `border-secondary/20`
- Icon: 📝 emoji
- Text color: `text-foreground`
- Font: `text-sm font-medium`

**Token Box**:
- Background: `bg-primary/5`
- Border: `border-primary/20`
- Icon: ⚡ Zap (Lucide icon)
- Text color: `text-foreground`
- Font: `text-sm font-medium`

---

## 📋 Example Scenarios

### Scenario 1: Free Plan User

**Database**:
```sql
plan_type: 'free'
articles_limit: 2
articles_used_this_month: 1
```

**Display**:
```
📝 1/2 bài    ⚡ 10,000 Token
```

---

### Scenario 2: Starter Plan User

**Database**:
```sql
plan_type: 'starter'
articles_limit: 60
articles_used_this_month: 45
```

**Display**:
```
📝 45/60 bài    ⚡ 400,000 Token
```

---

### Scenario 3: Admin User

**Database**:
```sql
role: 'admin'
articles_limit: 2
articles_used_this_month: 100
```

**Display**:
```
⚡ 10,000 Token
```

**Note**: Article limits KHÔNG hiển thị cho admin.

---

### Scenario 4: New User (No Articles)

**Database**:
```sql
plan_type: 'free'
articles_limit: 2
articles_used_this_month: 0
```

**Display**:
```
📝 0/2 bài    ⚡ 10,000 Token
```

---

## 🔄 Auto-Update Logic

### When does the display update?

1. **On Page Load**: Fetch từ `/api/auth/me`
2. **After Creating Article**: Backend tự động tăng `articles_used_this_month` qua trigger
3. **Monthly Reset**: Backend trigger tự động reset về 0 vào đầu tháng

### Trigger (Database):

```sql
CREATE TRIGGER increment_article_count_after_insert
AFTER INSERT ON articles
FOR EACH ROW
BEGIN
    -- Increment article count
    UPDATE user_subscriptions
    SET articles_used_this_month = articles_used_this_month + 1
    WHERE user_id = NEW.user_id;
END;
```

---

## 🧪 Testing Checklist

### Test 1: Normal User Display

- [ ] Login as normal user (role = 'user')
- [ ] Navigate to `/write-article`
- [ ] Verify article limits display: `📝 X/Y bài`
- [ ] Verify position: Left of Token display

### Test 2: Admin User - No Display

- [ ] Login as admin (role = 'admin')
- [ ] Navigate to `/write-article`
- [ ] Verify article limits **NOT displayed**
- [ ] Verify only Token display shows

### Test 3: Header Display

- [ ] Login as normal user
- [ ] Navigate to any page (`/`, `/features`, `/upgrade`, etc.)
- [ ] Verify article limits in header
- [ ] Verify responsive design (mobile/desktop)

### Test 4: Article Creation

- [ ] Note current article count (e.g., `1/2`)
- [ ] Create and publish a new article
- [ ] **Refresh page** (or wait for auto-refresh)
- [ ] Verify count increased (`2/2`)

### Test 5: Edge Cases

- [ ] Test with `articles_used_this_month = 0` → Display `0/2`
- [ ] Test with `articles_used_this_month = articles_limit` → Display `2/2`
- [ ] Test with no subscription → No display

---

## 🚀 Build Status

```bash
✅ Client: 981.00 kB (gzipped: 266.22 kB)
✅ Server: 344.60 kB
✅ Exit Code: 0
✅ Build time: 2.57s
```

---

## 📝 Files Changed

### Backend:
1. `server/routes/auth.ts` - Added `articles_used_this_month` to SQL query

### Frontend:
1. `client/pages/ArticleEditor.tsx` - Added article limits state & display
2. `client/components/Header.tsx` - Added article limits state & display

---

## 🎉 Summary

### What Changed

1. ✅ Backend API `/me` now returns `articles_used_this_month`
2. ✅ ArticleEditor page shows article limits (non-admin only)
3. ✅ Header component shows article limits (non-admin only)
4. ✅ Display format: `📝 X/Y bài` (left of Token)
5. ✅ Admin users do NOT see article limits

### Formula

```
Display: 📝 {used}/{limit} bài
Where:
  used = articles_used_this_month
  limit = articles_limit
```

### User Experience

**Before**:
```
⚡ 10,000 Token
```

**After** (for normal users):
```
📝 1/2 bài    ⚡ 10,000 Token
```

**After** (for admin):
```
⚡ 10,000 Token  (no change)
```

---

**Status**: ✅ COMPLETE

**Build**: ✅ SUCCESS

**Ready**: ✅ DEPLOY NOW

**Date**: January 15, 2026
