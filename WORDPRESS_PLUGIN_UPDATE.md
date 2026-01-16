# WordPress Plugin Update Required

## Tính năng mới: Upload ảnh từ VolxAI lên WordPress

### 1. Thêm endpoint mới vào WordPress Plugin

Cập nhật file `article-writer-publisher.php` (hoặc file chính của plugin), thêm endpoint sau:

```php
/**
 * Upload image from external URL to WordPress Media Library
 * Method: WordPress downloads image from provided URL (NOT base64)
 */
add_action('rest_api_init', function () {
    register_rest_route('article-writer/v1', '/upload-image', array(
        'methods' => 'POST',
        'callback' => 'awp_upload_image_to_media',
        'permission_callback' => 'awp_verify_token'
    ));
});

function awp_upload_image_to_media($request) {
    $params = $request->get_json_params();
    
    // Get image URL from request
    if (!isset($params['image_url'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Missing image_url parameter'
        ), 400);
    }
    
    $image_url = esc_url_raw($params['image_url']);
    $post_title = isset($params['post_title']) ? sanitize_text_field($params['post_title']) : 'Image';
    
    // Download image from URL
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    
    $tmp = download_url($image_url);
    
    if (is_wp_error($tmp)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $tmp->get_error_message()
        ), 500);
    }
    
    // Get filename from URL
    $filename = basename(parse_url($image_url, PHP_URL_PATH));
    
    // Remove query parameters
    $filename = preg_replace('/\?.*/', '', $filename);
    
    // Ensure proper extension
    if (!preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $filename)) {
        $filename = $filename . '.jpg';
    }
    
    $file_array = array(
        'name'     => $filename,
        'tmp_name' => $tmp
    );
    
    // Upload to media library
    $attachment_id = media_handle_sideload($file_array, 0, $post_title);
    
    @unlink($tmp);
    
    if (is_wp_error($attachment_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $attachment_id->get_error_message()
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'attachment_id' => $attachment_id,
        'url' => wp_get_attachment_url($attachment_id)
    ), 200);
}
```

### 2. Request Format

**Endpoint:** `POST /wp-json/article-writer/v1/upload-image`

**Headers:**
```
Content-Type: application/json
X-Article-Writer-Token: your-api-token
```

**Body (JSON):**
```json
{
  "image_url": "https://serpapi.com/searches/abc123/images_results/image.jpg",
  "post_title": "Article Title"
}
```

**Response:**
```json
{
  "success": true,
  "attachment_id": 123,
  "url": "https://yoursite.com/wp-content/uploads/2026/01/image.jpg"
}
```

### 3. Kết quả mong đợi

**Trước khi upload:**
```html
<img src="https://serpapi.com/searches/abc123/images.jpg" alt="xe mazda" />
<img src="https://images.google.com/photo.jpg" alt="mazda 2" />
```

**Sau khi upload:**
```html
<img src="https://yoursite.com/wp-content/uploads/2026/01/images.jpg" alt="xe mazda" />
<img src="https://yoursite.com/wp-content/uploads/2026/01/photo.jpg" alt="mazda 2" />
```

### 4. Console Log mẫu

```
📸 Processing images in article content...
📸 Found 5 images to upload

   📤 Uploading image: https://serpapi.com/searches/abc123/images_results/xyz.jpg...
   ✅ Image uploaded: https://yoursite.com/wp-content/uploads/2026/01/xyz.jpg
   
   📤 Uploading image: https://images.google.com/abc.jpg...
   ✅ Image uploaded: https://yoursite.com/wp-content/uploads/2026/01/abc.jpg
   
   ⏭️  Skipping (already on WordPress): https://yoursite.com/wp-content/uploads/old.jpg
   
✅ Successfully uploaded 4/5 images

🚀 Publishing article to WordPress...
```

### 5. Lưu ý quan trọng

- ✅ **Method**: WordPress tự download ảnh từ URL (KHÔNG dùng base64)
- ✅ **Endpoint**: `/wp-json/article-writer/v1/upload-image`
- ✅ **JSON Body**: `{ "image_url": "...", "post_title": "..." }`
- ✅ **Auto cleanup**: Tự động xóa duplicate folder paths (vd: `/2025/12/2025/12/` → `/2025/12/`)
- ✅ **Skip logic**: Bỏ qua ảnh đã có trên WordPress và data URIs

### 6. Tham khảo từ Lisa Content App

Code được tham khảo từ `Lisa_Content_App/image_handler.py`:
- Sử dụng `image_url` trong JSON body thay vì base64
- WordPress plugin tự download và xử lý ảnh
- Đơn giản và reliable hơn

