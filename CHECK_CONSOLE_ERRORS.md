# Kiểm tra Console Errors

## Bước 1: Xem Console Log
1. Trong DevTools, click vào tab **Console** (bên cạnh Elements)
2. Tìm error messages màu đỏ
3. Chụp screenshot hoặc copy error message

## Bước 2: Kiểm tra Network Status
1. Quay lại tab **Network**
2. Xem request "publish" có **status code** là gì?
   - 200 = OK
   - 500 = Backend error
   - 502/503 = Backend crash
   - 404 = Route không tồn tại

## Bước 3: Xem Response Headers
1. Click vào request "publish" 
2. Xem tab **Headers**
3. Tìm "Status Code" ở đầu

---

**Cho tôi biết:**
- Status code là gì?
- Console có error gì không?
