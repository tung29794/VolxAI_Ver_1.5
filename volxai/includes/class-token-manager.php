<?php
/**
 * Token Manager Class
 * Quản lý API tokens
 */

class Article_Writer_Token_Manager {
    
    private static $table_name = 'article_writer_tokens';
    
    /**
     * Create database tables
     */
    public static function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . self::$table_name;
        $charset_collate = $wpdb->get_charset_collate();
        
        // Check if table already exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");
        if ($table_exists) {
            return; // Table already exists
        }
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            token varchar(255) NOT NULL UNIQUE,
            token_name varchar(100) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            last_used datetime DEFAULT NULL,
            is_active tinyint(1) DEFAULT 1,
            created_by bigint(20) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY token (token)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Generate new API token - Save to wp_options
     */
    public static function generate_token($token_name) {
        // Generate random token - with fallback for systems without random_bytes
        try {
            $token = 'aw-' . bin2hex(random_bytes(32));
        } catch (Exception $e) {
            // Fallback for older PHP versions
            $token = 'aw-' . wp_generate_uuid4();
        }
        
        // Get existing tokens from options
        $tokens = get_option('article_writer_tokens', array());
        if (!is_array($tokens)) {
            $tokens = array();
        }
        
        // Create new token record
        $token_data = array(
            'id' => count($tokens) + 1,
            'token' => $token,
            'token_name' => sanitize_text_field($token_name),
            'created_at' => current_time('mysql'),
            'last_used' => null,
            'is_active' => 1,
            'created_by' => get_current_user_id(),
        );
        
        // Add to tokens array
        $tokens[$token] = $token_data;
        
        // Save to wp_options
        $result = update_option('article_writer_tokens', $tokens);
        
        if (!$result && get_option('article_writer_tokens') !== $tokens) {
            // If update failed and token wasn't already there
            return false;
        }
        
        return $token;
    }
    
    /**
     * Validate token - from wp_options
     */
    public static function validate_token($token) {
        $tokens = get_option('article_writer_tokens', array());
        
        if (!isset($tokens[$token])) {
            return false;
        }
        
        $token_data = $tokens[$token];
        
        if (!$token_data['is_active']) {
            return false;
        }
        
        // Update last used time
        $token_data['last_used'] = current_time('mysql');
        $tokens[$token] = $token_data;
        update_option('article_writer_tokens', $tokens);
        
        return true;
    }
    
    /**
     * Get default token
     */
    public static function get_default_token() {
        $tokens = get_option('article_writer_tokens', array());
        
        if (empty($tokens)) {
            return null;
        }
        
        foreach ($tokens as $token_data) {
            if ($token_data['is_active']) {
                return $token_data['token'];
            }
        }
        
        return null;
    }
    
    /**
     * Get all tokens
     */
    public static function get_all_tokens() {
        $tokens = get_option('article_writer_tokens', array());
        
        // Convert to array of objects for compatibility
        $result = array();
        foreach ($tokens as $token_key => $token_data) {
            $obj = (object) $token_data;
            $result[] = $obj;
        }
        
        // Sort by created_at DESC
        usort($result, function($a, $b) {
            return strtotime($b->created_at) - strtotime($a->created_at);
        });
        
        return $result;
    }
    
    /**
     * Deactivate token
     */
    public static function deactivate_token($token) {
        $tokens = get_option('article_writer_tokens', array());
        
        if (!isset($tokens[$token])) {
            return false;
        }
        
        $tokens[$token]['is_active'] = 0;
        return update_option('article_writer_tokens', $tokens);
    }
    
    /**
     * Delete token
     */
    public static function delete_token($token) {
        $tokens = get_option('article_writer_tokens', array());
        
        if (!isset($tokens[$token])) {
            return false;
        }
        
        unset($tokens[$token]);
        return update_option('article_writer_tokens', $tokens);
    }
    
    /**
     * Render tokens table
     */
    public static function render_tokens_table() {
        $tokens = self::get_all_tokens();
        
        if (empty($tokens)) {
            echo '<p>Không có token nào.</p>';
            return;
        }
        
        ?>
        <table class="wp-list-table widefat striped">
            <thead>
                <tr>
                    <th>Token Name</th>
                    <th>Token</th>
                    <th>Created At</th>
                    <th>Last Used</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($tokens as $token_obj): ?>
                <tr>
                    <td><?php echo esc_html($token_obj->token_name); ?></td>
                    <td>
                        <code style="word-break: break-all; display: block; padding: 5px;">
                            <?php echo esc_html($token_obj->token); ?>
                        </code>
                    </td>
                    <td><?php echo esc_html($token_obj->created_at); ?></td>
                    <td><?php echo $token_obj->last_used ? esc_html($token_obj->last_used) : '—'; ?></td>
                    <td>
                        <span class="dashicons dashicons-<?php echo $token_obj->is_active ? 'yes-alt' : 'dismiss'; ?>" 
                              style="color: <?php echo $token_obj->is_active ? 'green' : 'red'; ?>;"></span>
                        <?php echo $token_obj->is_active ? 'Active' : 'Inactive'; ?>
                    </td>
                    <td>
                        <form method="post" style="display: inline;">
                            <?php wp_nonce_field('article_writer_deactivate_token_' . $token_obj->id); ?>
                            <input type="hidden" name="action" value="deactivate_token">
                            <input type="hidden" name="token_id" value="<?php echo esc_attr($token_obj->id); ?>">
                            <button type="submit" class="button button-small" 
                                    onclick="return confirm('Bạn chắc chứ?');">
                                <?php echo $token_obj->is_active ? 'Deactivate' : 'Activate'; ?>
                            </button>
                        </form>
                        
                        <form method="post" style="display: inline;">
                            <?php wp_nonce_field('article_writer_delete_token_' . $token_obj->id); ?>
                            <input type="hidden" name="action" value="delete_token">
                            <input type="hidden" name="token_id" value="<?php echo esc_attr($token_obj->id); ?>">
                            <button type="submit" class="button button-small button-link-delete" 
                                    onclick="return confirm('Xóa token này? Hành động này không thể hoàn tác.');">
                                Delete
                            </button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php
    }
}

// Handle token actions
add_action('admin_init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
        if (current_user_can('manage_options')) {
            $action = sanitize_text_field($_POST['action']);
            $token_id = intval($_POST['token_id'] ?? 0);
            
            if ($action === 'deactivate_token') {
                if (wp_verify_nonce($_POST['_wpnonce'], 'article_writer_deactivate_token_' . $token_id)) {
                    global $wpdb;
                    $table_name = $wpdb->prefix . 'article_writer_tokens';
                    
                    $token_obj = $wpdb->get_row(
                        $wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $token_id)
                    );
                    
                    if ($token_obj) {
                        $new_status = $token_obj->is_active ? 0 : 1;
                        Article_Writer_Token_Manager::deactivate_token($token_obj->token);
                        
                        // Redirect to avoid form resubmission
                        wp_safe_remote_post(admin_url('admin.php?page=article-writer-publisher-tokens'));
                    }
                }
            }
            
            if ($action === 'delete_token') {
                if (wp_verify_nonce($_POST['_wpnonce'], 'article_writer_delete_token_' . $token_id)) {
                    global $wpdb;
                    $table_name = $wpdb->prefix . 'article_writer_tokens';
                    
                    $token_obj = $wpdb->get_row(
                        $wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $token_id)
                    );
                    
                    if ($token_obj) {
                        Article_Writer_Token_Manager::delete_token($token_obj->token);
                    }
                }
            }
        }
    }
});
