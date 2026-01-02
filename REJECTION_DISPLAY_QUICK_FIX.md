# ✅ Account Page Rejection Reason Display - QUICK FIX SUMMARY

## 📋 Tổng Quan
Fix để hiển thị lý do từ chối (rejection reason) khi user nhìn vào "Lịch sử nâng cấp" trong trang Account.

## 🔧 3 Thay Đổi Chính

### 1️⃣ Backend - Update When Rejecting
**File:** `server/routes/admin.ts`

Khi admin từ chối, cập nhật CÁCH bảng:
```typescript
// Update payment_approvals (đã có)
await execute("UPDATE payment_approvals SET status = 'rejected', rejection_reason = ? ...");

// 🆕 Update subscription_history (mới thêm)
await execute("UPDATE subscription_history SET status = 'rejected', rejection_reason = ? ...");
```

### 2️⃣ Backend - Return Rejection Reason
**File:** `server/routes/auth.ts`

Endpoint `/upgrade-history` bây giờ trả về `rejectionReason`:
```typescript
const history = await query<any>(
  "SELECT ... rejection_reason, created_at FROM subscription_history ..." // ✅ Thêm rejection_reason
);

const formattedHistory = history.map((item) => ({
  // ... existing fields ...
  rejectionReason: item.rejection_reason || null,  // ✅ Mới thêm
}));
```

### 3️⃣ Frontend - Display Rejection Reason
**File:** `client/pages/Account.tsx`

Hiển thị trạng thái và lý do từ chối với styling màu đỏ:
```tsx
{isRejected && history.rejectionReason && (
  <div className="mt-2 pt-2 border-t border-red-200">
    <p className="text-xs text-red-700 font-medium">Lý do từ chối:</p>
    <p className="text-sm text-red-600 mt-1">{history.rejectionReason}</p>
  </div>
)}
```

## 📊 Database

**New Column in subscription_history:**
```sql
ALTER TABLE subscription_history
ADD COLUMN rejection_reason TEXT AFTER notes;

-- Also add 'rejected' to status enum
ALTER TABLE subscription_history
MODIFY COLUMN status ENUM(..., 'rejected');
```

## 🎯 User Experience

**Before (❌ Broken):**
```
Lịch sử nâng cấp
├─ Nâng cấp từ Miễn phí → Grow (29/12/2025)
│  300.000₫
│  ⏳ Chờ duyệt  ← Still shows pending even after rejection!
└─ No reason shown
```

**After (✅ Fixed):**
```
Lịch sử nâng cấp
├─ Nâng cấp từ Miễn phí → Grow (29/12/2025)
│  300.000₫
│  🔴 Từ chối  ← Shows rejected status
│  
│  Lý do từ chối:
│  Giao dịch không hợp lệ  ← Shows reason!
└─ ...
```

## ✅ Build & Deploy

```bash
# Build
npm run build

# Deploy (after DB migration)
# - First: Run migration 005_add_rejection_reason.sql on database
# - Then: Deploy code to production
```

## 🧪 Quick Test

1. **As Admin:**
   - Go to https://volxai.com/admin → Quản lý thanh toán
   - Click "Từ chối" on any pending payment
   - Enter reason: "Test reason"
   - ✅ Toast shows success

2. **As User:**
   - Go to https://volxai.com/account
   - Scroll to "Lịch sử nâng cấp"
   - ✅ See "Từ chối" status with reason displayed

## 📁 Files Changed

- ✏️ `server/routes/admin.ts` - Reject endpoint
- ✏️ `server/routes/auth.ts` - Upgrade history endpoint  
- ✏️ `client/pages/Account.tsx` - Display rejection
- ✅ `database/migrations/005_add_rejection_reason.sql` - NEW migration

## 🔗 Related Docs

- Full details: `REJECTION_REASON_FIX.md`
- Admin fix: `PAYMENT_APPROVAL_FIX.md`
- Testing guide: See testing checklist in REJECTION_REASON_FIX.md

---

**Status**: ✅ Ready to Deploy  
**Commits**: 2 commits (feature + docs)  
**Build**: ✅ Passes
