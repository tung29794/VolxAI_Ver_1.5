# Admin Prompts Fix - Quick Reference

## 🎯 Vấn đề
AI Prompts trong `/admin` bị lỗi 401 Unauthorized và 404

## ⚡ Fix nhanh
**2 lỗi đã sửa:**

1. File `AdminPrompts.tsx` không dùng `buildAdminApiUrl()` → requests sai domain
2. File `AdminPrompts.tsx` dùng sai localStorage key → Invalid token

## ✅ Đã sửa

**Fix #1: API URL**
```typescript
// Before
`${import.meta.env.VITE_API_URL}/api/admin/prompts`

// After  
buildAdminApiUrl("/api/admin/prompts")
```

**Fix #2: localStorage key**
```typescript
// Before
localStorage.getItem("token")  // ❌ Sai!

// After
localStorage.getItem("authToken")  // ✅ Đúng!
```

## 🚀 Deploy
```bash
npm run build:client
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'
```

## 🧪 Test
Vào https://volxai.com/admin → AI Prompts
- ✅ Danh sách prompts hiển thị
- ✅ Có thể edit, toggle, delete
- ✅ Không còn lỗi 401

## 📄 Full docs
Xem `ADMIN_PROMPTS_FIX.md` để biết chi tiết
