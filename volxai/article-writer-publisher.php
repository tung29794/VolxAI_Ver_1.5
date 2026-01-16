<?php
/**
 * Plugin Name: VolxAI - Your AI specialist
 * Plugin URI: https://sitemeta.net/
 * Description: Custom REST API endpoint để đăng và chỉnh sửa bài viết từ VolxAI
 * Version: 1.0.3
 * Author: Tung Nguyen
 * Author URI: https://sitemeta.net/
 * License: GPL v2 or later
 * Text Domain: volxai
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ARTICLE_WRITER_PUBLISHER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ARTICLE_WRITER_PUBLISHER_VERSION', '1.0.3');

// Load required files
require_once ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'includes/class-api-handler.php';
require_once ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'includes/class-token-manager.php';
require_once ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'includes/class-settings-page.php';
require_once ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'includes/class-logger.php';

// Plugin activation
register_activation_hook(__FILE__, 'article_writer_publisher_activate');

function article_writer_publisher_activate() {
    // Create database tables
    Article_Writer_Token_Manager::create_tables();
    
    // Generate default API token
    if (!Article_Writer_Token_Manager::get_default_token()) {
        Article_Writer_Token_Manager::generate_token('Default Token');
    }
    
    // Create logs directory
    $log_dir = ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
}

// Plugin deactivation
register_deactivation_hook(__FILE__, 'article_writer_publisher_deactivate');

function article_writer_publisher_deactivate() {
    // Cleanup if needed
}

// Initialize plugin
add_action('plugins_loaded', 'article_writer_publisher_init');

function article_writer_publisher_init() {
    // Register REST API routes
    add_action('rest_api_init', 'article_writer_publisher_register_routes');
    
    // Add admin menu
    add_action('admin_menu', 'article_writer_publisher_add_admin_menu');
    
    // Add settings link to plugin list
    add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'article_writer_publisher_settings_link');
}

// Register REST API routes
function article_writer_publisher_register_routes() {
    Article_Writer_API_Handler::register_routes();
}

// Add admin menu
function article_writer_publisher_add_admin_menu() {
    add_menu_page(
        'Article Writer Publisher',
        'Article Writer',
        'manage_options',
        'article-writer-publisher',
        'article_writer_publisher_render_admin_page',
        'dashicons-edit',
        80
    );
    
    add_submenu_page(
        'article-writer-publisher',
        'Settings',
        'Settings',
        'manage_options',
        'article-writer-publisher-settings',
        'article_writer_publisher_render_settings_page'
    );
    
    add_submenu_page(
        'article-writer-publisher',
        'API Tokens',
        'API Tokens',
        'manage_options',
        'article-writer-publisher-tokens',
        'article_writer_publisher_render_tokens_page'
    );
    
    add_submenu_page(
        'article-writer-publisher',
        'Logs',
        'Logs',
        'manage_options',
        'article-writer-publisher-logs',
        'article_writer_publisher_render_logs_page'
    );
}

// Render main admin page
function article_writer_publisher_render_admin_page() {
    ?>
    <div class="wrap">
        <h1>Article Writer Publisher</h1>
        <p>Plugin này cung cấp REST API endpoint để đăng bài viết từ ứng dụng Python Article Writer.</p>
        
        <h2>Thông tin API</h2>
        <table class="form-table">
            <tr>
                <th scope="row">Endpoint</th>
                <td><code><?php echo rest_url('article-writer/v1/publish'); ?></code></td>
            </tr>
            <tr>
                <th scope="row">Method</th>
                <td>POST</td>
            </tr>
            <tr>
                <th scope="row">Authentication</th>
                <td>API Token (Custom Header: X-Article-Writer-Token)</td>
            </tr>
        </table>
        
        <h2>Hướng dẫn sử dụng</h2>
        <ol>
            <li>Tạo API Token trong tab "API Tokens"</li>
            <li>Copy token và thêm vào cấu hình ứng dụng Python</li>
            <li>Gửi POST request tới endpoint với dữ liệu bài viết</li>
            <li>Kiểm tra kết quả trong tab "Logs"</li>
        </ol>
        
        <h2>Ví dụ Request</h2>
        <pre><code class="language-json">{
  "title": "Tiêu đề bài viết",
  "content": "Nội dung bài viết...",
  "excerpt": "Mô tả ngắn",
  "primary_keyword": "Từ khóa chính",
  "secondary_keywords": ["kw1", "kw2"],
  "status": "draft",
  "category_id": 1
}</code></pre>
    </div>
    <?php
}

// Render settings page
function article_writer_publisher_render_settings_page() {
    Article_Writer_Settings_Page::render();
}

// Render tokens page
function article_writer_publisher_render_tokens_page() {
    $debug_messages = array();
    $debug_errors = array();
    
    // Handle token generation FIRST
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['article_writer_nonce'])) {
        $debug_messages[] = '🔍 Form submitted - Nonce field found';
        
        $nonce_check = wp_verify_nonce($_POST['article_writer_nonce'], 'article_writer_generate_token');
        $debug_messages[] = 'Nonce verification: ' . ($nonce_check ? '✅ VALID' : '❌ INVALID');
        
        if ($nonce_check) {
            $has_perm = current_user_can('manage_options');
            $debug_messages[] = 'Admin permission: ' . ($has_perm ? '✅ YES' : '❌ NO');
            $debug_messages[] = 'Token name: ' . (isset($_POST['token_name']) && !empty($_POST['token_name']) ? $_POST['token_name'] : '❌ EMPTY');
            
            if ($has_perm && !empty($_POST['token_name'])) {
                $token_name = sanitize_text_field($_POST['token_name']);
                $debug_messages[] = '📝 Generating token: ' . $token_name;
                
                $new_token = Article_Writer_Token_Manager::generate_token($token_name);
                
                if ($new_token) {
                    $debug_messages[] = '✅ Token created: ' . substr($new_token, 0, 20) . '...';
                    ?>
                    <div class="notice notice-success is-dismissible" style="margin: 20px 0;">
                        <p><strong>✅ Token tạo thành công!</strong></p>
                        <p>Sao chép token này đi nơi an toàn:</p>
                        <code style="display: block; background: #f1f1f1; padding: 10px; margin: 10px 0; word-break: break-all; border: 1px solid #ddd;">
                            <?php echo esc_html($new_token); ?>
                        </code>
                    </div>
                    <?php
                } else {
                    // Try to get database error if stored
                    $db_error = get_transient('article_writer_token_error');
                    if ($db_error) {
                        $debug_errors[] = 'Database error: ' . $db_error;
                        delete_transient('article_writer_token_error');
                    } else {
                        $debug_errors[] = 'Failed to create token in database';
                    }
                    ?>
                    <div class="notice notice-error is-dismissible"><p>
                        <strong>❌ Lỗi:</strong> Không thể tạo token. Kiểm tra chi tiết bên dưới.
                    </p></div>
                    <?php
                }
            } else {
                if (!$has_perm) {
                    $debug_errors[] = 'User does not have admin permissions';
                }
                if (empty($_POST['token_name'])) {
                    $debug_errors[] = 'Token name is empty';
                }
                ?>
                <div class="notice notice-error is-dismissible"><p>
                    <strong>❌ Lỗi:</strong> <?php echo empty($_POST['token_name']) ? 'Vui lòng nhập tên token' : 'Bạn không có quyền tạo token'; ?>
                </p></div>
                <?php
            }
        } else {
            $debug_errors[] = 'Nonce verification failed - security check did not pass';
            ?>
            <div class="notice notice-error is-dismissible"><p>
                <strong>❌ Lỗi:</strong> Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.
            </p></div>
            <?php
        }
    }
    
    // Display debug messages
    if (!empty($debug_messages)) {
        echo '<div class="notice notice-info" style="margin: 20px 0; padding: 15px; background: #f0f8ff; border-left: 4px solid #0073aa;">';
        echo '<p><strong>📊 Debug Information:</strong></p>';
        echo '<ul style="margin: 10px 0; padding-left: 20px;">';
        foreach ($debug_messages as $msg) {
            echo '<li>' . esc_html($msg) . '</li>';
        }
        echo '</ul>';
        echo '</div>';
    }
    
    // Display debug errors
    if (!empty($debug_errors)) {
        echo '<div class="notice notice-error" style="margin: 20px 0; padding: 15px; background: #fff0f0; border-left: 4px solid #dc3545;">';
        echo '<p><strong>⚠️ Errors:</strong></p>';
        echo '<ul style="margin: 10px 0; padding-left: 20px;">';
        foreach ($debug_errors as $err) {
            echo '<li>' . esc_html($err) . '</li>';
        }
        echo '</ul>';
        echo '</div>';
    }
    ?>
    <div class="wrap">
        <h1>API Tokens</h1>
        <p>Quản lý API tokens cho ứng dụng Python Article Writer.</p>
        
        <h2 style="margin-top: 30px;">Tạo Token Mới</h2>
        <form method="post" action="">
            <?php wp_nonce_field('article_writer_generate_token', 'article_writer_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="token_name">Tên Token</label></th>
                    <td>
                        <input type="text" id="token_name" name="token_name" value="" placeholder="vd: Python App Token" required size="40">
                        <p class="description">Nhập tên để nhận diện token này</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Tạo Token Mới', 'primary', 'submit', true); ?>
        </form>
        
        <h2>Các Token Hiện Có</h2>
        <?php Article_Writer_Token_Manager::render_tokens_table(); ?>
    </div>
    <?php
}

// Render logs page
function article_writer_publisher_render_logs_page() {
    ?>
    <div class="wrap">
        <h1>API Request Logs</h1>
        <p>Lịch sử các request đăng bài từ ứng dụng Python.</p>
        
        <?php Article_Writer_Logger::render_logs_table(); ?>
    </div>
    <?php
}

// Add settings link
function article_writer_publisher_settings_link($links) {
    $settings_link = '<a href="admin.php?page=article-writer-publisher-settings">Cài đặt</a>';
    array_unshift($links, $settings_link);
    return $links;
}

// Enqueue admin styles
add_action('admin_enqueue_scripts', 'article_writer_publisher_enqueue_admin_styles');

function article_writer_publisher_enqueue_admin_styles($hook) {
    if (strpos($hook, 'article-writer-publisher') !== false) {
        wp_enqueue_style(
            'article-writer-publisher-admin',
            ARTICLE_WRITER_PUBLISHER_PLUGIN_URL . 'assets/css/admin-style.css',
            [],
            ARTICLE_WRITER_PUBLISHER_VERSION
        );
    }
}

// Add CORS headers to REST API responses
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    
    add_filter('rest_pre_serve_request', function($value) {
        // Send CORS headers
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Article-Writer-Token, Accept');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
        
        // Handle preflight requests
        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            return true;
        }
        
        return $value;
    });
}, 15);

// Allow unauthenticated requests to REST API endpoints
add_filter('rest_authentication_errors', function($result) {
    // If authentication errors exist, allow them to pass through for public endpoints
    if (is_wp_error($result)) {
        // Check if this is an article-writer endpoint
        if (strpos($_SERVER['REQUEST_URI'] ?? '', '/article-writer/') !== false) {
            return null;
        }
    }
    return $result;
});

