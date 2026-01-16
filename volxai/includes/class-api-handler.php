<?php
/**
 * API Handler Class
 * Xử lý REST API requests và publish posts
 */

class Article_Writer_API_Handler {
    
    /**
     * Register REST API routes
     */
    public static function register_routes() {
        register_rest_route(
            'article-writer/v1',
            '/publish',
            [
                'methods' => 'POST',
                'callback' => [self::class, 'handle_publish_request'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        register_rest_route(
            'article-writer/v1',
            '/update/(?P<id>\d+)',
            [
                'methods' => 'POST',
                'callback' => [self::class, 'handle_update_request'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        register_rest_route(
            'article-writer/v1',
            '/drafts',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'handle_get_drafts'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // Get all posts endpoint for syncing
        register_rest_route(
            'article-writer/v1',
            '/posts',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'handle_get_posts'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // Get available post types
        register_rest_route(
            'article-writer/v1',
            '/post-types',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'handle_get_post_types'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // Get taxonomies for a specific post type
        register_rest_route(
            'article-writer/v1',
            '/taxonomies',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'handle_get_taxonomies'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // New endpoint for uploading images
        register_rest_route(
            'article-writer/v1',
            '/upload-image',
            [
                'methods' => 'POST',
                'callback' => [self::class, 'handle_upload_image'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // Check if slug exists
        register_rest_route(
            'article-writer/v1',
            '/check-slug',
            [
                'methods' => 'GET',
                'callback' => [self::class, 'handle_check_slug'],
                'permission_callback' => [self::class, 'check_api_token'],
            ]
        );
        
        // Delete post by ID
        register_rest_route(
            'article-writer/v1',
            '/delete/(?P<id>\d+)',
            [
                'methods' => 'POST',
                'callback' => [self::class, 'handle_delete_post'],
                'permission_callback' => [self::class, 'check_api_token'],
                'args' => [
                    'id' => [
                        'validate_callback' => function($param) {
                            return is_numeric($param);
                        }
                    ],
                ],
            ]
        );
    }
    
    /**
     * Check API Token from request header
     */
    public static function check_api_token($request) {
        $token = $request->get_header('X-Article-Writer-Token');
        
        if (empty($token)) {
            return new WP_Error(
                'missing_token',
                'API Token is missing. Please provide X-Article-Writer-Token header.',
                ['status' => 401]
            );
        }
        
        if (!Article_Writer_Token_Manager::validate_token($token)) {
            Article_Writer_Logger::log_request(
                'invalid_token',
                $token,
                [],
                'Invalid or expired token'
            );
            
            return new WP_Error(
                'invalid_token',
                'Invalid or expired API Token.',
                ['status' => 403]
            );
        }
        
        return true;
    }
    
    /**
     * Handle publish post request
     */
    public static function handle_publish_request($request) {
        try {
            $params = $request->get_json_params();
            $token = $request->get_header('X-Article-Writer-Token');
            
            // ===== DEBUG LOGGING =====
            // Log incoming request details
            error_log("\n" . str_repeat("=", 60));
            error_log("📨 ARTICLE WRITER API REQUEST RECEIVED");
            error_log(str_repeat("=", 60));
            error_log("Timestamp: " . current_time('Y-m-d H:i:s'));
            error_log("Method: " . $request->get_method());
            error_log("Route: " . $request->get_route());
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            
            // Log all received parameters
            error_log("\n📦 RECEIVED PARAMETERS:");
            error_log("Full Payload: " . json_encode($params, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            
            // Log critical SEO fields
            error_log("\n🔍 CRITICAL SEO FIELDS CHECK:");
            error_log("├─ post_type: " . (isset($params['post_type']) && !empty($params['post_type']) ? "✓ YES: " . $params['post_type'] : "✗ NO or EMPTY (will default to 'post')"));
            error_log("├─ seo_title: " . (isset($params['seo_title']) && !empty($params['seo_title']) ? "✓ YES: " . $params['seo_title'] : "✗ NO or EMPTY"));
            error_log("├─ meta_description: " . (isset($params['meta_description']) && !empty($params['meta_description']) ? "✓ YES: " . $params['meta_description'] : "✗ NO or EMPTY"));
            error_log("├─ primary_keyword: " . (isset($params['primary_keyword']) && !empty($params['primary_keyword']) ? "✓ YES: " . $params['primary_keyword'] : "✗ NO or EMPTY"));
            error_log("├─ seo_score: " . (isset($params['seo_score']) && !empty($params['seo_score']) ? "✓ YES: " . $params['seo_score'] : "✗ NO or EMPTY"));
            error_log("├─ taxonomies: " . (isset($params['taxonomies']) && !empty($params['taxonomies']) ? "✓ YES: " . json_encode($params['taxonomies']) : "✗ NO or EMPTY"));
            error_log("└─ permalink: " . (isset($params['permalink']) && !empty($params['permalink']) ? "✓ YES: " . $params['permalink'] : "✗ NO or EMPTY"));
            
            // Log other fields
            error_log("\n📝 OTHER FIELDS:");
            error_log("├─ title: " . (isset($params['title']) ? "✓ YES: " . substr($params['title'], 0, 50) . "..." : "✗ NO"));
            error_log("├─ content length: " . (isset($params['content']) ? strlen($params['content']) . " chars" : "✗ NO"));
            error_log("└─ status: " . ($params['status'] ?? 'draft'));
            error_log(str_repeat("=", 60) . "\n");
            // ===== END DEBUG LOGGING =====
            
            // Validate required fields
            $validation = self::validate_request_data($params);
            if (!$validation['valid']) {
                Article_Writer_Logger::log_request(
                    'validation_error',
                    $token,
                    $params,
                    $validation['error']
                );
                
                return new WP_Error(
                    'validation_error',
                    $validation['error'],
                    ['status' => 400]
                );
            }
            
            // Prepare post data
            $post_data = self::prepare_post_data($params);
            
            // Insert post
            $post_id = wp_insert_post($post_data, true);
            
            if (is_wp_error($post_id)) {
                Article_Writer_Logger::log_request(
                    'post_creation_error',
                    $token,
                    $params,
                    $post_id->get_error_message()
                );
                
                return new WP_Error(
                    'post_creation_error',
                    $post_id->get_error_message(),
                    ['status' => 500]
                );
            }
            
            // Add post meta - RankMath SEO fields
            if (!empty($params['primary_keyword'])) {
                update_post_meta($post_id, '_primary_keyword', $params['primary_keyword']);
                // Also add to RankMath field
                update_post_meta($post_id, 'rank_math_focus_keyword', $params['primary_keyword']);
                error_log("✅ Saved primary_keyword: " . $params['primary_keyword']);
            }
            
            // Add RankMath SEO Title
            if (!empty($params['seo_title'])) {
                update_post_meta($post_id, 'rank_math_title', $params['seo_title']);
                error_log("✅ Saved rank_math_title: " . $params['seo_title']);
            } else {
                error_log("⚠️  seo_title is empty, not saved");
            }
            
            // Add RankMath Meta Description
            if (!empty($params['meta_description'])) {
                update_post_meta($post_id, 'rank_math_description', $params['meta_description']);
                error_log("✅ Saved rank_math_description: " . $params['meta_description']);
            } else {
                error_log("⚠️  meta_description is empty, not saved");
            }
            
            // Add RankMath SEO Score
            if (!empty($params['seo_score'])) {
                update_post_meta($post_id, 'rank_math_seo_score', $params['seo_score']);
                error_log("✅ Saved rank_math_seo_score: " . $params['seo_score']);
            }
            
            if (!empty($params['secondary_keywords']) && is_array($params['secondary_keywords'])) {
                $secondary_keywords = array_map('sanitize_text_field', $params['secondary_keywords']);
                update_post_meta($post_id, '_secondary_keywords', $secondary_keywords);
            }
            
            // Add taxonomies if provided
            if (!empty($params['taxonomies']) && is_array($params['taxonomies'])) {
                error_log("📋 Processing taxonomies: " . json_encode($params['taxonomies']));
                foreach ($params['taxonomies'] as $taxonomy => $term_id) {
                    if (!empty($term_id) && $term_id > 0) {
                        $result = wp_set_post_terms($post_id, intval($term_id), $taxonomy);
                        if (is_wp_error($result)) {
                            error_log("❌ Failed to set taxonomy {$taxonomy}: " . $result->get_error_message());
                        } else {
                            error_log("✅ Set taxonomy {$taxonomy} to term ID: {$term_id}");
                        }
                    }
                }
            }
            
            // Add category if provided (legacy support)
            if (!empty($params['category_id'])) {
                wp_set_post_terms($post_id, intval($params['category_id']), 'category');
            }
            
            // Add tags if provided
            if (!empty($params['tags']) && is_array($params['tags'])) {
                wp_set_post_terms($post_id, $params['tags'], 'post_tag');
            }
            
            // Set featured image if provided
            if (!empty($params['featured_media']) && is_numeric($params['featured_media'])) {
                $featured_image_id = intval($params['featured_media']);
                set_post_thumbnail($post_id, $featured_image_id);
                error_log("✅ Saved featured image (featured_media): " . $featured_image_id);
            } else {
                error_log("⚠️  featured_media is empty, featured image not set");
            }
            
            $post = get_post($post_id);
            $post_url = get_permalink($post_id);
            
            // Log successful response
            error_log("\n✅ POST CREATION SUCCESS");
            error_log("Post ID: " . $post_id);
            error_log("Post URL: " . $post_url);
            error_log("Title: " . $post->post_title);
            error_log("Status: " . $post->post_status);
            error_log("Timestamp: " . current_time('Y-m-d H:i:s'));
            
            Article_Writer_Logger::log_request(
                'success',
                $token,
                $params,
                "Post published successfully",
                $post_id
            );
            
            return new WP_REST_Response([
                'success' => true,
                'post_id' => intval($post_id),
                'post_url' => $post_url,
                'title' => $post->post_title,
                'status' => $post->post_status,
                'message' => 'Bài viết đã được đăng thành công',
                'timestamp' => current_time('c')
            ], 201);
            
        } catch (Exception $e) {
            Article_Writer_Logger::log_request(
                'exception',
                $token ?? 'unknown',
                $params ?? [],
                $e->getMessage()
            );
            
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Handle get drafts request
     * Returns list of draft posts for connection testing
     */
    public static function handle_get_drafts($request) {
        try {
            $token = $request->get_header('X-Article-Writer-Token');
            
            // Log request
            error_log("\n📋 GET DRAFTS REQUEST");
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            error_log("Timestamp: " . current_time('Y-m-d H:i:s'));
            
            // Query draft posts
            $args = array(
                'post_type'      => 'post',
                'post_status'    => 'draft',
                'posts_per_page' => 10,
                'orderby'        => 'date',
                'order'          => 'DESC'
            );
            
            $drafts = get_posts($args);
            $draft_list = array();
            
            foreach ($drafts as $draft) {
                $draft_list[] = array(
                    'id'      => $draft->ID,
                    'title'   => $draft->post_title,
                    'date'    => $draft->post_date,
                    'excerpt' => wp_trim_words($draft->post_content, 20)
                );
            }
            
            error_log("✅ Found " . count($draft_list) . " drafts");
            
            return new WP_REST_Response([
                'success' => true,
                'count'   => count($draft_list),
                'drafts'  => $draft_list,
                'message' => 'Connection successful',
                'timestamp' => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            error_log("❌ Error getting drafts: " . $e->getMessage());
            return new WP_Error(
                'get_drafts_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Handle get posts request
     * Returns all published and draft posts for syncing
     */
    public static function handle_get_posts($request) {
        try {
            $token = $request->get_header('X-Article-Writer-Token');
            
            // Get parameters
            $per_page = $request->get_param('per_page') ?: 50;
            $page = $request->get_param('page') ?: 1;
            $status = $request->get_param('status') ?: 'any'; // publish, draft, or any
            $post_type = $request->get_param('post_type') ?: 'post'; // Support custom post types
            
            error_log("\n📚 GET POSTS REQUEST");
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            error_log("Per Page: " . $per_page);
            error_log("Page: " . $page);
            error_log("Status: " . $status);
            error_log("Post Type: " . $post_type);
            
            // Query posts with cache-busting
            $args = array(
                'post_type'      => $post_type,
                'post_status'    => $status,
                'posts_per_page' => $per_page,
                'paged'          => $page,
                'orderby'        => 'date',
                'order'          => 'DESC',
                // Disable caching to ensure fresh results on every sync
                'cache_results'  => false,
                'no_found_rows'  => false, // We need total count
                'update_post_meta_cache' => false,
                'update_post_term_cache' => false,
                'suppress_filters' => true, // Bypass any query filters that might cache
            );
            
            $query = new \WP_Query($args);
            $posts_list = array();
            
            if ($query->have_posts()) {
                while ($query->have_posts()) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    
                    // Get featured image
                    $featured_image_url = get_the_post_thumbnail_url($post_id, 'large');
                    
                    // Get categories
                    $categories = get_the_category($post_id);
                    $category_names = array();
                    foreach ($categories as $cat) {
                        $category_names[] = $cat->name;
                    }
                    
                    // Get tags
                    $tags = get_the_tags($post_id);
                    $tag_names = array();
                    if ($tags) {
                        foreach ($tags as $tag) {
                            $tag_names[] = $tag->name;
                        }
                    }
                    
                    // Get SEO meta from RankMath
                    $seo_title = get_post_meta($post_id, 'rank_math_title', true);
                    $meta_description = get_post_meta($post_id, 'rank_math_description', true);
                    $primary_keyword = get_post_meta($post_id, 'rank_math_focus_keyword', true);
                    
                    $posts_list[] = array(
                        'id'               => $post_id,
                        'title'            => get_the_title(),
                        'content'          => get_the_content(),
                        'excerpt'          => get_the_excerpt(),
                        'status'           => get_post_status(),
                        'slug'             => get_post_field('post_name', $post_id),
                        'date'             => get_the_date('c'),
                        'modified'         => get_the_modified_date('c'),
                        'url'              => get_permalink(),
                        'featured_image'   => $featured_image_url ?: '',
                        'categories'       => $category_names,
                        'tags'             => $tag_names,
                        'seo_title'        => $seo_title ?: get_the_title(),
                        'meta_description' => $meta_description ?: '',
                        'primary_keyword'  => $primary_keyword ?: ''
                    );
                }
                wp_reset_postdata();
            }
            
            error_log("✅ Found " . count($posts_list) . " posts (Total: " . $query->found_posts . ")");
            
            return new WP_REST_Response([
                'success'     => true,
                'count'       => count($posts_list),
                'total'       => $query->found_posts,
                'total_pages' => $query->max_num_pages,
                'current_page'=> $page,
                'posts'       => $posts_list,
                'message'     => 'Posts retrieved successfully',
                'timestamp'   => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            error_log("❌ Error getting posts: " . $e->getMessage());
            return new WP_Error(
                'get_posts_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Handle get post types request
     * Returns all available post types
     */
    public static function handle_get_post_types($request) {
        try {
            $token = $request->get_header('X-Article-Writer-Token');
            
            error_log("\n📋 GET POST TYPES REQUEST");
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            
            // Get all public post types
            $post_types = get_post_types([
                'public' => true,
            ], 'objects');
            
            $post_types_list = array();
            
            foreach ($post_types as $post_type) {
                // Skip attachments
                if ($post_type->name === 'attachment') {
                    continue;
                }
                
                // Count posts
                $count = wp_count_posts($post_type->name);
                $total = 0;
                foreach ($count as $status => $num) {
                    if ($status !== 'trash' && $status !== 'auto-draft') {
                        $total += $num;
                    }
                }
                
                $post_types_list[] = array(
                    'name'        => $post_type->name,
                    'label'       => $post_type->label,
                    'singular'    => $post_type->labels->singular_name,
                    'description' => $post_type->description,
                    'count'       => $total,
                    'hierarchical'=> $post_type->hierarchical,
                    'has_archive' => $post_type->has_archive
                );
            }
            
            error_log("✅ Found " . count($post_types_list) . " post types");
            
            return new WP_REST_Response([
                'success'    => true,
                'count'      => count($post_types_list),
                'post_types' => $post_types_list,
                'message'    => 'Post types retrieved successfully',
                'timestamp'  => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            error_log("❌ Error getting post types: " . $e->getMessage());
            return new WP_Error(
                'get_post_types_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Handle get taxonomies request
     * Get all terms for taxonomies associated with a post type
     * GET /api/websites/:id/taxonomies?post_type=post
     */
    public static function handle_get_taxonomies($request) {
        try {
            $token = $request->get_header('X-Article-Writer-Token');
            $post_type = $request->get_param('post_type') ?: 'post';
            
            error_log("\n📋 GET TAXONOMIES REQUEST");
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            error_log("Post Type: " . $post_type);
            
            // Get taxonomies associated with this post type
            $taxonomies = get_object_taxonomies($post_type, 'objects');
            $taxonomies_list = array();
            
            foreach ($taxonomies as $taxonomy) {
                // Skip post_format
                if ($taxonomy->name === 'post_format') {
                    continue;
                }
                
                // Get terms for this taxonomy
                $terms = get_terms(array(
                    'taxonomy'   => $taxonomy->name,
                    'hide_empty' => false,
                    'orderby'    => 'name',
                    'order'      => 'ASC'
                ));
                
                if (!is_wp_error($terms)) {
                    $terms_list = array();
                    foreach ($terms as $term) {
                        $terms_list[] = array(
                            'id'    => $term->term_id,
                            'name'  => $term->name,
                            'slug'  => $term->slug,
                            'count' => $term->count,
                            'parent' => $term->parent
                        );
                    }
                    
                    $taxonomies_list[] = array(
                        'name'         => $taxonomy->name,
                        'label'        => $taxonomy->label,
                        'singular'     => $taxonomy->labels->singular_name,
                        'hierarchical' => $taxonomy->hierarchical,
                        'public'       => $taxonomy->public,
                        'terms'        => $terms_list,
                        'count'        => count($terms_list)
                    );
                }
            }
            
            error_log("✅ Found " . count($taxonomies_list) . " taxonomies for post type: " . $post_type);
            
            return new WP_REST_Response([
                'success'     => true,
                'post_type'   => $post_type,
                'count'       => count($taxonomies_list),
                'taxonomies'  => $taxonomies_list,
                'message'     => 'Taxonomies retrieved successfully',
                'timestamp'   => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            error_log("❌ Error getting taxonomies: " . $e->getMessage());
            return new WP_Error(
                'get_taxonomies_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Handle update post request
     */
    public static function handle_update_request($request) {
        try {
            $params = $request->get_json_params();
            $token = $request->get_header('X-Article-Writer-Token');
            $post_id = intval($request->get_param('id'));
            
            // Debug logging
            error_log("\n" . str_repeat("=", 60));
            error_log("📝 UPDATE POST REQUEST");
            error_log(str_repeat("=", 60));
            error_log("Post ID: " . $post_id);
            error_log("Token: " . substr($token, 0, 10) . "..." . substr($token, -10));
            error_log("Update Params: " . json_encode($params, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            
            // Verify post exists
            $post = get_post($post_id);
            if (!$post) {
                return new WP_Error(
                    'post_not_found',
                    'Bài viết không tồn tại',
                    ['status' => 404]
                );
            }
            
            // Prepare update data
            $update_data = [
                'ID' => $post_id,
            ];
            
            // Update title if provided
            if (!empty($params['title'])) {
                $update_data['post_title'] = sanitize_text_field($params['title']);
                error_log("✓ Updating title: " . $update_data['post_title']);
            }
            
            // Update content if provided
            if (!empty($params['content'])) {
                $update_data['post_content'] = wp_kses_post($params['content']);
                error_log("✓ Updating content: " . strlen($update_data['post_content']) . " chars");
            }
            
            // Update status if provided
            if (!empty($params['status'])) {
                $update_data['post_status'] = sanitize_text_field($params['status']);
                error_log("✓ Updating status: " . $update_data['post_status']);
            }
            
            // Update post
            $result = wp_update_post($update_data, true);
            
            if (is_wp_error($result)) {
                error_log("✗ Error updating post: " . $result->get_error_message());
                return new WP_Error(
                    'update_error',
                    $result->get_error_message(),
                    ['status' => 500]
                );
            }
            
            // Update SEO fields if provided
            if (!empty($params['seo_title'])) {
                update_post_meta($post_id, 'rank_math_title', sanitize_text_field($params['seo_title']));
                error_log("✓ Saved rank_math_title: " . $params['seo_title']);
            }
            
            if (!empty($params['meta_description'])) {
                update_post_meta($post_id, 'rank_math_description', sanitize_text_field($params['meta_description']));
                error_log("✓ Saved rank_math_description: " . $params['meta_description']);
            }
            
            if (!empty($params['primary_keyword'])) {
                update_post_meta($post_id, 'rank_math_focus_keyword', sanitize_text_field($params['primary_keyword']));
                error_log("✓ Saved rank_math_focus_keyword: " . $params['primary_keyword']);
            }
            
            // Update taxonomies if provided
            if (!empty($params['taxonomies']) && is_array($params['taxonomies'])) {
                error_log("📋 Updating taxonomies: " . json_encode($params['taxonomies']));
                foreach ($params['taxonomies'] as $taxonomy => $term_id) {
                    if (!empty($term_id) && $term_id > 0) {
                        $result = wp_set_post_terms($post_id, intval($term_id), $taxonomy);
                        if (is_wp_error($result)) {
                            error_log("❌ Failed to set taxonomy {$taxonomy}: " . $result->get_error_message());
                        } else {
                            error_log("✅ Set taxonomy {$taxonomy} to term ID: {$term_id}");
                        }
                    }
                }
            }
            
            // Update featured image if provided
            if (!empty($params['featured_media']) && is_numeric($params['featured_media'])) {
                $featured_image_id = intval($params['featured_media']);
                set_post_thumbnail($post_id, $featured_image_id);
                error_log("✓ Updated featured image (featured_media): " . $featured_image_id);
            }
            
            error_log("✅ Post updated successfully!");
            error_log(str_repeat("=", 60) . "\n");
            
            $post = get_post($post_id);
            
            return new WP_REST_Response([
                'success' => true,
                'post_id' => intval($post_id),
                'title' => $post->post_title,
                'status' => $post->post_status,
                'message' => 'Bài viết đã được cập nhật thành công',
                'timestamp' => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            error_log("✗ Exception in update_request: " . $e->getMessage());
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
        try {
            $token = $request->get_header('X-Article-Writer-Token');
            
            $args = [
                'post_type' => 'post',
                'post_status' => 'draft',
                'posts_per_page' => -1,
                'orderby' => 'modified',
                'order' => 'DESC',
            ];
            
            $drafts = get_posts($args);
            $draft_list = [];
            
            foreach ($drafts as $draft) {
                $draft_list[] = [
                    'id' => $draft->ID,
                    'title' => $draft->post_title,
                    'excerpt' => $draft->post_excerpt,
                    'modified' => $draft->post_modified,
                    'url' => get_edit_post_link($draft->ID, 'raw'),
                ];
            }
            
            Article_Writer_Logger::log_request(
                'fetch_drafts',
                $token,
                [],
                "Retrieved " . count($draft_list) . " drafts"
            );
            
            return new WP_REST_Response([
                'success' => true,
                'count' => count($draft_list),
                'drafts' => $draft_list,
                'timestamp' => current_time('c')
            ], 200);
            
        } catch (Exception $e) {
            return new WP_Error(
                'fetch_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Validate request data
     */
    private static function validate_request_data($params) {
        if (empty($params['title'])) {
            return [
                'valid' => false,
                'error' => 'Title is required'
            ];
        }
        
        if (empty($params['content'])) {
            return [
                'valid' => false,
                'error' => 'Content is required'
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Prepare post data for insertion
     */
    private static function prepare_post_data($params) {
        $status = !empty($params['status']) ? sanitize_text_field($params['status']) : 'draft';
        
        // Ensure status is valid
        $allowed_status = ['draft', 'pending', 'publish'];
        if (!in_array($status, $allowed_status)) {
            $status = 'draft';
        }
        
        // Extract and clean content - remove YAML metadata header
        $content = isset($params['content']) ? $params['content'] : '';
        $content = self::extract_content_without_metadata($content);
        
        // Set post slug from permalink if provided
        $post_name = '';
        if (!empty($params['permalink'])) {
            $post_name = sanitize_title($params['permalink']);
        }
        
        // Get post type from params, default to 'post'
        $post_type = !empty($params['post_type']) ? sanitize_text_field($params['post_type']) : 'post';
        
        // Validate post type exists
        if (!post_type_exists($post_type)) {
            error_log("⚠️  Invalid post type '{$post_type}', defaulting to 'post'");
            $post_type = 'post';
        }
        
        $post_data = [
            'post_title' => sanitize_text_field($params['title']),
            'post_content' => wp_kses_post($content),
            'post_excerpt' => !empty($params['excerpt']) ? sanitize_text_field($params['excerpt']) : '',
            'post_status' => $status,
            'post_type' => $post_type,
            'post_author' => get_current_user_id() ?: 1,
        ];
        
        // Add post slug/name if provided
        if (!empty($post_name)) {
            $post_data['post_name'] = $post_name;
        }
        
        // Add schedule time if provided
        if (!empty($params['scheduled_time'])) {
            $post_date = date_create_from_format(DateTime::ISO8601, $params['scheduled_time']);
            if ($post_date) {
                $post_data['post_date'] = $post_date->format('Y-m-d H:i:s');
                $post_data['post_date_gmt'] = get_gmt_from_date($post_data['post_date']);
                if ($status === 'publish') {
                    $post_data['post_status'] = 'future';
                }
            }
        }
        
        return $post_data;
    }
    
    /**
     * Extract content without YAML metadata header
     * Removes the ---metadata--- section at the beginning of content
     */
    private static function extract_content_without_metadata($content) {
        // Check if content starts with YAML header marker
        if (strpos(trim($content), '---') === 0) {
            // Find the second occurrence of --- to mark end of metadata
            $lines = explode("\n", $content);
            $found_first_marker = false;
            $metadata_end_index = 0;
            
            foreach ($lines as $index => $line) {
                $line = trim($line);
                if ($line === '---') {
                    if (!$found_first_marker) {
                        $found_first_marker = true;
                    } else {
                        // Found the closing --- marker
                        $metadata_end_index = $index;
                        break;
                    }
                }
            }
            
            // Extract content after metadata header
            if ($metadata_end_index > 0) {
                $content_lines = array_slice($lines, $metadata_end_index + 1);
                $content = implode("\n", $content_lines);
                $content = trim($content);
            }
        }
        
        return $content;
    }
    
    /**
     * Handle image upload request
     * Nhận image URL từ external source, download và upload lên WordPress Media Library
     */
    public static function handle_upload_image($request) {
        try {
            error_log('🚀 handle_upload_image called');
            
            $params = $request->get_json_params();
            $image_url = isset($params['image_url']) ? $params['image_url'] : '';
            $post_title = isset($params['post_title']) ? $params['post_title'] : 'image';
            
            if (empty($image_url)) {
                error_log('❌ No image_url provided');
                return new WP_Error(
                    'missing_image_url',
                    'image_url parameter is required',
                    ['status' => 400]
                );
            }
            
            error_log('🖼️ Processing image: ' . $image_url);
            error_log('📊 Post title: ' . $post_title);
            
            // Validate image URL format
            if (!filter_var($image_url, FILTER_VALIDATE_URL)) {
                error_log('❌ Invalid URL format: ' . $image_url);
                return rest_ensure_response([
                    'success' => false,
                    'url' => $image_url,
                    'message' => 'Invalid image URL format'
                ]);
            }
            
            error_log('🔗 URL is valid, attempting download...');
            
            // Detect if this is a Pixabay URL and use special handling
            $is_pixabay = strpos($image_url, 'pixabay.com') !== false;
            if ($is_pixabay) {
                error_log('🖼️ Pixabay URL detected - using special handling');
            }
            
            // Download image using wp_safe_remote_get with optimized settings
            $args = array(
                'timeout' => 45,  // Longer timeout for Pixabay
                'redirection' => 10,  // More redirects for Pixabay
                'sslverify' => false,
                'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'httpversion' => '1.1'
            );
            
            // Add special headers for Pixabay
            if ($is_pixabay) {
                $args['headers'] = array(
                    'Referer' => 'https://pixabay.com/',
                    'Accept' => 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Encoding' => 'gzip, deflate, br',
                    'Accept-Language' => 'en-US,en;q=0.9'
                );
            }
            
            error_log('📥 Making request with args: ' . json_encode($args));
            $response = wp_safe_remote_get($image_url, $args);
            
            if (is_wp_error($response)) {
                error_log('❌ Download failed: ' . $response->get_error_message());
                error_log('❌ Image URL: ' . $image_url);
                // Fallback: return original URL instead of failing
                error_log('⚠️  Returning original URL as fallback');
                return rest_ensure_response([
                    'success' => false,
                    'url' => $image_url,
                    'source_url' => $image_url,
                    'message' => 'Could not download image, using original URL',
                    'error' => $response->get_error_message()
                ]);
            }
            
            $image_data = wp_remote_retrieve_body($response);
            $response_code = wp_remote_retrieve_response_code($response);
            $response_headers = wp_remote_retrieve_headers($response);
            $content_type = $response_headers['content-type'] ?? 'unknown';
            
            error_log('📥 DOWNLOAD RESULT:');
            error_log('   Response Code: ' . $response_code);
            error_log('   Content-Type: ' . $content_type);
            error_log('   Downloaded Size: ' . strlen($image_data) . ' bytes');
            error_log('   First 100 chars: ' . substr($image_data, 0, 100));
            error_log('   Is JSON: ' . (strpos($image_data, '{') === 0 ? 'YES' : 'NO'));
            error_log('   Is HTML: ' . (strpos($image_data, '<') === 0 ? 'YES' : 'NO'));
            
            if ($response_code != 200 || empty($image_data)) {
                error_log('❌ Invalid response: Code=' . $response_code . ', Content-Type=' . $content_type);
                error_log('📝 Response body first 200 chars: ' . substr($image_data, 0, 200));
                // Fallback: return original URL
                return rest_ensure_response([
                    'success' => false,
                    'url' => $image_url,
                    'source_url' => $image_url,
                    'message' => 'Invalid response from server (code: ' . $response_code . ')',
                    'response_code' => $response_code
                ]);
            }
            
            // Verify content is actually an image
            if (strpos($content_type, 'image/') === false) {
                error_log('❌ Not an image - Content-Type: ' . $content_type);
                error_log('📝 Response body first 200 chars: ' . substr($image_data, 0, 200));
                return rest_ensure_response([
                    'success' => false,
                    'url' => $image_url,
                    'source_url' => $image_url,
                    'message' => 'Downloaded content is not an image (Content-Type: ' . $content_type . ')',
                    'content_type' => $content_type
                ]);
            }
            
            error_log('✅ Image downloaded: ' . strlen($image_data) . ' bytes, Type: ' . $content_type);
            
            // Check file size is valid
            if (strlen($image_data) < 100) {
                error_log('❌ File too small: ' . strlen($image_data) . ' bytes');
                return rest_ensure_response([
                    'success' => false,
                    'url' => $image_url,
                    'source_url' => $image_url,
                    'message' => 'Downloaded file is too small'
                ]);
            }
            
            // Get file extension (like aiktp.php)
            // Priority: Use content-type first, then filename
            $extension = 'jpg'; // default
            
            // Try to get extension from content-type first
            if (strpos($content_type, 'image/') === 0) {
                $type_map = [
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp',
                    'image/svg+xml' => 'svg'
                ];
                
                foreach ($type_map as $type => $ext) {
                    if (strpos($content_type, $type) === 0) {
                        $extension = $ext;
                        break;
                    }
                }
            }
            
            // If no match from content-type, try filename
            if ($extension === 'jpg') {
                $filetype = wp_check_filetype(basename($image_url));
                if ($filetype['ext']) {
                    $extension = $filetype['ext'];
                }
            }
            
            error_log('📝 Detected extension: ' . $extension . ' (from Content-Type: ' . $content_type . ')');
            
            // Create unique filename (like aiktp.php)
            $upload_dir = wp_upload_dir();
            $sanitized_title = self::sanitize_filename($post_title);
            $unique_file_name = $sanitized_title . '-' . uniqid() . '.' . $extension;
            $file_path = $upload_dir['path'] . '/' . $unique_file_name;
            $file_url = $upload_dir['url'] . $upload_dir['subdir'] . '/' . $unique_file_name;
            
            error_log('📝 Filename: ' . $unique_file_name);
            error_log('📁 Path: ' . $file_path);
            
            // Save file
            $saved = file_put_contents($file_path, $image_data);
            
            if ($saved === false || !file_exists($file_path)) {
                error_log('❌ Failed to write file to: ' . $file_path);
                return new WP_Error(
                    'write_failed',
                    'Failed to save image file',
                    ['status' => 500]
                );
            }
            
            error_log('✅ File written: ' . filesize($file_path) . ' bytes');
            
            // Verify file was saved correctly
            $saved_size = filesize($file_path);
            if ($saved_size === false || $saved_size < 100) {
                error_log('❌ Saved file is invalid: ' . $saved_size . ' bytes');
                @unlink($file_path);
                return new WP_Error(
                    'invalid_file',
                    'Saved file is corrupted (size: ' . $saved_size . ' bytes)',
                    ['status' => 500]
                );
            }
            
            // Extra validation: Verify it's actually an image using getimagesize
            $image_info = @getimagesize($file_path);
            if (!$image_info) {
                error_log('❌ File is not a valid image - getimagesize failed');
                error_log('📝 File first 200 bytes: ' . bin2hex(substr($image_data, 0, 200)));
                @unlink($file_path);
                return new WP_Error(
                    'invalid_image',
                    'Saved file is not a valid image format',
                    ['status' => 500]
                );
            }
            
            error_log('✅ Image validation passed: ' . $image_info[0] . 'x' . $image_info[1] . ' (' . $image_info['mime'] . ')');
            error_log('✅ File saved successfully: ' . filesize($file_path) . ' bytes');
            error_log('🔗 File URL: ' . $file_url);
            
            // Register attachment in WordPress Media Library
            error_log('📚 Registering attachment in Media Library...');
            
            $attachment = array(
                'post_mime_type' => $image_info['mime'],
                'post_title' => preg_replace('/\.[^.]+$/', '', $unique_file_name),
                'post_content' => '',
                'post_status' => 'inherit',
                'post_name' => sanitize_file_name($unique_file_name)
            );
            
            $attach_id = wp_insert_attachment($attachment, $file_path);
            
            if (is_wp_error($attach_id)) {
                error_log('❌ Failed to register attachment: ' . $attach_id->get_error_message());
                return new WP_Error(
                    'attachment_failed',
                    'Failed to register image in Media Library: ' . $attach_id->get_error_message(),
                    ['status' => 500]
                );
            }
            
            error_log('✅ Attachment registered: ID=' . $attach_id);
            
            // Generate attachment metadata (for thumbnails, etc.)
            require_once(ABSPATH . 'wp-admin/includes/image.php');
            $attach_data = wp_generate_attachment_metadata($attach_id, $file_path);
            
            if ($attach_data === false) {
                error_log('⚠️  Failed to generate attachment metadata');
            } else {
                wp_update_attachment_metadata($attach_id, $attach_data);
                error_log('✅ Attachment metadata generated');
            }
            
            return rest_ensure_response([
                'success' => true,
                'url' => $file_url,
                'source_url' => $file_url,
                'attachment_id' => $attach_id,
                'file_name' => $unique_file_name,
                'file_path' => $file_path,
                'file_size' => filesize($file_path),
                'message' => 'Image uploaded successfully and registered in Media Library'
            ]);
            
        } catch (Exception $e) {
            error_log('❌ Exception: ' . $e->getMessage());
            error_log('❌ Trace: ' . $e->getTraceAsString());
            return new WP_Error(
                'exception',
                'Upload failed: ' . $e->getMessage(),
                ['status' => 500]
            );
        }
    }
    
    /**
     * Sanitize filename like aiktp.php does
     */
    public static function sanitize_filename($title) {
        $replacement = '-';
        $map = array(
            '/[^\s\p{Ll}\p{Lm}\p{Lo}\p{Lt}\p{Lu}\p{Nd}]/mu' => ' ',
            '/\\s+/' => $replacement,
            sprintf('/^[%s]+|[%s]+$/', preg_quote($replacement), preg_quote($replacement)) => '',
        );
        $title = urldecode($title);
        return strtolower(preg_replace(array_keys($map), array_values($map), $title));
    }
    
    /**
     * Check if a slug already exists for a specific post type
     * GET /wp-json/article-writer/v1/check-slug?slug=xxx&post_type=post
     */
    public static function handle_check_slug($request) {
        $slug = $request->get_param('slug');
        $post_type = $request->get_param('post_type') ?: 'post';
        
        if (empty($slug)) {
            return new WP_Error(
                'missing_slug',
                'Slug parameter is required',
                ['status' => 400]
            );
        }
        
        Article_Writer_Logger::log_request(
            'check_slug',
            $request->get_header('X-Article-Writer-Token'),
            ['slug' => $slug, 'post_type' => $post_type],
            'Checking if slug exists'
        );
        
        // Query WordPress for post with this slug
        $args = array(
            'name' => $slug,
            'post_type' => $post_type,
            'post_status' => array('publish', 'draft', 'pending', 'future'),
            'posts_per_page' => 1,
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        );
        
        $posts = get_posts($args);
        
        if (!empty($posts)) {
            $post = $posts[0];
            
            Article_Writer_Logger::log_request(
                'check_slug',
                $request->get_header('X-Article-Writer-Token'),
                ['slug' => $slug, 'found' => true, 'post_id' => $post->ID],
                'Slug exists'
            );
            
            return rest_ensure_response([
                'success' => true,
                'exists' => true,
                'post_id' => $post->ID,
                'post_title' => $post->post_title,
                'post_status' => $post->post_status,
                'post_url' => get_permalink($post->ID),
                'post_type' => $post->post_type
            ]);
        }
        
        Article_Writer_Logger::log_request(
            'check_slug',
            $request->get_header('X-Article-Writer-Token'),
            ['slug' => $slug, 'found' => false],
            'Slug available'
        );
        
        return rest_ensure_response([
            'success' => true,
            'exists' => false,
            'message' => 'Slug is available'
        ]);
    }
    
    /**
     * Delete a post by ID
     * POST /wp-json/article-writer/v1/delete/{id}
     */
    public static function handle_delete_post($request) {
        $post_id = $request->get_param('id');
        $force = $request->get_param('force') !== false; // Default to true (permanent delete)
        
        if (empty($post_id)) {
            return new WP_Error(
                'missing_post_id',
                'Post ID is required',
                ['status' => 400]
            );
        }
        
        Article_Writer_Logger::log_request(
            'delete_post',
            $request->get_header('X-Article-Writer-Token'),
            ['post_id' => $post_id, 'force' => $force],
            'Attempting to delete post'
        );
        
        // Check if post exists
        $post = get_post($post_id);
        
        if (!$post) {
            Article_Writer_Logger::log_request(
                'delete_post',
                $request->get_header('X-Article-Writer-Token'),
                ['post_id' => $post_id, 'error' => 'not_found'],
                'Post not found'
            );
            
            return new WP_Error(
                'post_not_found',
                'Post not found',
                ['status' => 404]
            );
        }
        
        // Store post info before deletion
        $post_title = $post->post_title;
        $post_slug = $post->post_name;
        $post_type = $post->post_type;
        
        // Delete the post
        $result = wp_delete_post($post_id, $force);
        
        if ($result) {
            Article_Writer_Logger::log_request(
                'delete_post',
                $request->get_header('X-Article-Writer-Token'),
                ['post_id' => $post_id, 'success' => true, 'title' => $post_title],
                'Post deleted successfully'
            );
            
            return rest_ensure_response([
                'success' => true,
                'message' => 'Post deleted successfully',
                'post_id' => $post_id,
                'post_title' => $post_title,
                'post_slug' => $post_slug,
                'post_type' => $post_type,
                'force_deleted' => $force
            ]);
        } else {
            Article_Writer_Logger::log_request(
                'delete_post',
                $request->get_header('X-Article-Writer-Token'),
                ['post_id' => $post_id, 'error' => 'delete_failed'],
                'Failed to delete post'
            );
            
            return new WP_Error(
                'delete_failed',
                'Failed to delete post',
                ['status' => 500]
            );
        }
    }
}
