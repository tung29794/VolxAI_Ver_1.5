# 🔧 Fix: Payment Approval & Rejection Button Errors

## 🎯 Vấn đề
Khi click vào nút **"Duyệt"** hoặc **"Từ chối"** trong trang Quản lý thanh toán (Admin Dashboard), xảy ra lỗi:
- `SyntaxError: Unexpected token '<', '<!doctype ...' is not valid JSON`
- GET/POST endpoints trả về 500 Internal Server Error

## 📍 Nguyên Nhân
Trong component `AdminPayments.tsx`, hai hàm `handleApprovePayment()` và `handleRejectPayment()` sử dụng **URL tương đối** (`/api/admin/payments/...`) thay vì URL đầy đủ với base URL:

```typescript
// ❌ SAI - URL tương đối
const response = await fetch(`/api/admin/payments/${id}/approve`, {
  // ...
});

// ✅ ĐÚNG - URL đầy đủ
const response = await fetch(buildAdminApiUrl(`/api/admin/payments/${id}/approve`), {
  // ...
});
```

Khi sử dụng URL tương đối, request sẽ resolve thành sai domain/host, dẫn đến lỗi CORS hoặc routing sai, backend trả về HTML error page thay vì JSON response.

## 🔧 Giải Pháp
Cập nhật hai hàm để sử dụng `buildAdminApiUrl()` helper function:

### File: `client/components/admin/AdminPayments.tsx`

**Hàm 1: handleApprovePayment()**
```typescript
// Dòng 69: Thay đổi từ
const response = await fetch(`/api/admin/payments/${id}/approve`, {

// Thành
const response = await fetch(buildAdminApiUrl(`/api/admin/payments/${id}/approve`), {
```

**Hàm 2: handleRejectPayment()**
```typescript
// Dòng 100: Thay đổi từ
const response = await fetch(`/api/admin/payments/${id}/reject`, {

// Thành
const response = await fetch(buildAdminApiUrl(`/api/admin/payments/${id}/reject`), {
```

## ✅ Kết Quả
Sau khi fix:
- ✅ Nút "Duyệt" hoạt động chính xác
- ✅ Nút "Từ chối" hoạt động chính xác
- ✅ Backend nhận request và trả về JSON response đúng định dạng
- ✅ Frontend parse JSON thành công
- ✅ UI hiển thị toast thông báo thành công

## 📝 Git Commit
```
commit dcb89ec
Author: ...
Date: ...

Fix: Use buildAdminApiUrl for payment approval and rejection endpoints

- Updated handleApprovePayment() to use buildAdminApiUrl()
- Updated handleRejectPayment() to use buildAdminApiUrl()
- Ensures requests are sent to correct API base URL
```

## 🧪 Cách Kiểm Tra
1. Đăng nhập vào admin dashboard: https://volxai.com/admin
2. Nhấn vào "Quản lý thanh toán"
3. Chọn một thanh toán có trạng thái "Chờ duyệt"
4. Thử click nút "Duyệt" hoặc "Từ chối"
5. ✅ Nên thấy thông báo thành công "Đã duyệt thanh toán" hoặc "Đã từ chối thanh toán"

## 📌 Liên Quan
- `client/lib/api.ts` - Định nghĩa `buildAdminApiUrl()` helper
- `server/routes/admin.ts` - Backend endpoints xử lý approve/reject
- `database/migrations/002_add_admin_support.sql` - Migration tạo bảng `payment_approvals`
