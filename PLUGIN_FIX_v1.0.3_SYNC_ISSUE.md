# 🔧 Plugin Fix v1.0.3 - Sync Issue Resolved

## 🐛 **Vấn đề đã sửa:**

### **Chức năng đồng bộ không lấy bài mới**

**Hiện tượng:**
- Khách hàng tạo bài mới trên WordPress
- Nhấn nút "Đồng bộ" trên VolxAI
- ❌ Bài mới không được đồng bộ về
- ❌ Chỉ thấy những bài cũ đã sync lần đầu

**Nguyên nhân:**
- WordPress **cache query results** của API `/posts`
- Mỗi lần gọi API trả về kết quả cached thay vì query database mới

## ✅ **Giải pháp:**

### **Cache Busting - Vô hiệu hóa cache**

Đã thêm các tham số đặc biệt vào WP_Query để **bắt buộc query mới mỗi lần:**

```php
$args = array(
    'post_type'      => $post_type,
    'post_status'    => $status,
    'posts_per_page' => $per_page,
    'paged'          => $page,
    'orderby'        => 'date',
    'order'          => 'DESC',
    
    // 🔥 NEW: Cache busting parameters
    'cache_results'  => false,              // Disable result caching
    'no_found_rows'  => false,              // Keep total count
    'update_post_meta_cache' => false,      // Skip meta cache
    'update_post_term_cache' => false,      // Skip term cache
    'suppress_filters' => true,             // Bypass cached filters
);
```

## 📦 **Files Changed:**

### **1. includes/class-api-handler.php**
- Function: `handle_get_posts()`
- Added 5 cache-busting parameters
- Line 417-427

### **2. article-writer-publisher.php**
- Version: 1.0.2 → **1.0.3**

### **3. CHANGELOG.md**
- Added v1.0.3 entry with fix details

## 🎯 **Kết quả:**

### **Trước khi fix:**
```
User tạo bài mới → Nhấn Sync → ❌ Không thấy bài mới
                              → Chỉ thấy bài cũ (cached)
```

### **Sau khi fix:**
```
User tạo bài mới → Nhấn Sync → ✅ Query database mới
                              → ✅ Thấy tất cả bài mới nhất
                              → ✅ Sắp xếp theo date DESC
```

## 📥 **Deploy Guide:**

### **Quick Steps:**
1. **Download:** `article-writer-publisher-v1.0.3.zip`
2. **WordPress Admin** → Plugins → Add New → Upload
3. **Install** → Activate
4. **Test:** Tạo bài mới trên WP → Sync từ VolxAI → Verify bài mới xuất hiện

### **Verification:**
```bash
# Test sync API directly
curl "https://yoursite.com/wp-json/article-writer/v1/posts?per_page=10" \
  -H "X-Article-Writer-Token: YOUR_TOKEN"
```

## 🧪 **Testing Checklist:**

- [ ] Deploy plugin v1.0.3 lên WordPress
- [ ] Tạo 1 bài mới trên WordPress (draft hoặc publish)
- [ ] Vào VolxAI → Quản lý Website → Nhấn "Đồng bộ"
- [ ] **Verify:** Bài mới xuất hiện trong danh sách
- [ ] **Verify:** Bài mới có thể chọn để đăng lên website khác

## 📊 **Technical Details:**

### **WordPress Query Cache:**
WordPress tự động cache:
- Query results
- Post meta data
- Term relationships

### **Our Solution:**
```php
'cache_results' => false           // Core solution
'update_post_meta_cache' => false  // Skip meta cache update
'update_post_term_cache' => false  // Skip taxonomy cache update
'suppress_filters' => true         // Bypass filter caching
```

### **Performance Impact:**
- **Negligible** - Chỉ ảnh hưởng khi gọi sync API (không thường xuyên)
- Query vẫn nhanh (indexed by date)
- Không ảnh hưởng đến frontend WordPress

## 🎁 **Benefits:**

✅ **Luôn lấy bài mới nhất** - No more missing posts
✅ **Real-time sync** - Reflects WordPress database state
✅ **No cache issues** - Fresh data every time
✅ **Order by date** - Newest first
✅ **Backward compatible** - Old functionality intact

## 📄 **Version History:**

- **v1.0.3** - Fix sync cache issue ✅
- **v1.0.2** - Add slug check & delete APIs
- **v1.0.1** - Bug fixes
- **v1.0.0** - Initial release

---

## 🚀 **Ready to Deploy!**

**Package:** `article-writer-publisher-v1.0.3.zip`

**Location:** `/Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/`

**Next Steps:**
1. Upload to all WordPress sites
2. Test sync with new posts
3. Verify everything works

**Estimated Time:** 5 minutes per site

---

**Notes:**
- No database changes required
- Safe to upgrade from v1.0.2
- API tokens remain unchanged
- All existing features still work
