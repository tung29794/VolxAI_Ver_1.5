# WordPress Plugin Update Required

## New API Endpoints Needed

Để tránh duplicate posts với slug-2, slug-3, cần thêm 2 endpoints vào WordPress plugin `Article Writer`:

### 1. Check Slug Exists
**Endpoint:** `GET /wp-json/article-writer/v1/check-slug`

**Parameters:**
- `slug` (string, required): The slug to check
- `post_type` (string, optional, default: 'post'): The post type

**Response:**
```json
{
  "success": true,
  "exists": true,
  "post_id": 123,
  "post_title": "Example Post",
  "post_status": "publish"
}
```

**WordPress Plugin Code:**
```php
// Add to your plugin's REST API registration
register_rest_route('article-writer/v1', '/check-slug', array(
    'methods' => 'GET',
    'callback' => 'aw_check_slug_exists',
    'permission_callback' => 'aw_verify_token',
));

function aw_check_slug_exists($request) {
    $slug = $request->get_param('slug');
    $post_type = $request->get_param('post_type') ?: 'post';
    
    if (empty($slug)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Slug is required'
        ), 400);
    }
    
    // Query post by slug
    $args = array(
        'name' => $slug,
        'post_type' => $post_type,
        'post_status' => array('publish', 'draft', 'pending'),
        'posts_per_page' => 1
    );
    
    $posts = get_posts($args);
    
    if (!empty($posts)) {
        $post = $posts[0];
        return new WP_REST_Response(array(
            'success' => true,
            'exists' => true,
            'post_id' => $post->ID,
            'post_title' => $post->post_title,
            'post_status' => $post->post_status,
            'post_url' => get_permalink($post->ID)
        ), 200);
    } else {
        return new WP_REST_Response(array(
            'success' => true,
            'exists' => false
        ), 200);
    }
}
```

### 2. Delete Post
**Endpoint:** `POST /wp-json/article-writer/v1/delete/{post_id}`

**Parameters:**
- `post_id` (int, required): The post ID to delete (in URL path)
- `force` (bool, optional, default: true): Bypass trash and force deletion

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully",
  "post_id": 123
}
```

**WordPress Plugin Code:**
```php
// Add to your plugin's REST API registration
register_rest_route('article-writer/v1', '/delete/(?P<id>\d+)', array(
    'methods' => 'POST',
    'callback' => 'aw_delete_post',
    'permission_callback' => 'aw_verify_token',
    'args' => array(
        'id' => array(
            'validate_callback' => function($param) {
                return is_numeric($param);
            }
        ),
    ),
));

function aw_delete_post($request) {
    $post_id = $request->get_param('id');
    $force = $request->get_param('force') !== false; // Default true
    
    if (empty($post_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Post ID is required'
        ), 400);
    }
    
    // Check if post exists
    $post = get_post($post_id);
    if (!$post) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Post not found'
        ), 404);
    }
    
    // Delete the post
    $result = wp_delete_post($post_id, $force);
    
    if ($result) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Post deleted successfully',
            'post_id' => $post_id,
            'post_title' => $post->post_title
        ), 200);
    } else {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to delete post'
        ), 500);
    }
}
```

## Installation Steps

1. Open your WordPress plugin file (usually `article-writer.php` or similar)
2. Find the section where REST API routes are registered (look for `register_rest_route`)
3. Add the two new endpoint handlers above
4. Save and upload the updated plugin to your WordPress site
5. Test the endpoints using Postman or curl

## Testing

### Test Check Slug:
```bash
curl -X GET "https://yoursite.com/wp-json/article-writer/v1/check-slug?slug=test-post&post_type=post" \
  -H "X-Article-Writer-Token: your-api-token"
```

### Test Delete Post:
```bash
curl -X POST "https://yoursite.com/wp-json/article-writer/v1/delete/123" \
  -H "X-Article-Writer-Token: your-api-token"
```

## Benefits

✅ **No more duplicate posts** - Automatically deletes old post with same slug
✅ **Clean URLs** - Keeps original slug instead of slug-2, slug-3
✅ **Better content management** - Update existing content by slug
✅ **Backward compatible** - Existing functionality still works

## Notes

- The delete operation is **permanent** by default (force=true)
- Only posts with matching slug and post_type will be deleted
- The VolxAI system will only delete and recreate when creating NEW posts (not when updating tracked posts)
- Make sure your API token has proper permissions
