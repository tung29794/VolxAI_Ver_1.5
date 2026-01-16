<?php
/**
 * Settings Page Class
 * Cài đặt plugin
 */

class Article_Writer_Settings_Page {
    
    public static function render() {
        ?>
        <div class="wrap">
            <h1>Article Writer Publisher - Cài Đặt</h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('article_writer_publisher_settings');
                do_settings_sections('article_writer_publisher_settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
}

// Register settings
add_action('admin_init', function() {
    register_setting('article_writer_publisher_settings', 'article_writer_publisher_options');
    
    add_settings_section(
        'article_writer_publisher_main',
        'Cài Đặt Chính',
        function() {
            echo '<p>Cấu hình cài đặt chính cho plugin.</p>';
        },
        'article_writer_publisher_settings'
    );
    
    add_settings_field(
        'default_post_status',
        'Trạng Thái Bài Mặc Định',
        function() {
            $options = get_option('article_writer_publisher_options');
            $value = $options['default_post_status'] ?? 'draft';
            ?>
            <select name="article_writer_publisher_options[default_post_status]">
                <option value="draft" <?php selected($value, 'draft'); ?>>Draft</option>
                <option value="pending" <?php selected($value, 'pending'); ?>>Pending Review</option>
                <option value="publish" <?php selected($value, 'publish'); ?>>Publish</option>
            </select>
            <p class="description">Trạng thái mặc định cho các bài viết được đăng qua API.</p>
            <?php
        },
        'article_writer_publisher_settings',
        'article_writer_publisher_main'
    );
    
    add_settings_field(
        'default_author_id',
        'Tác Giả Mặc Định',
        function() {
            $options = get_option('article_writer_publisher_options');
            $value = $options['default_author_id'] ?? 1;
            wp_dropdown_users(['selected' => $value, 'name' => 'article_writer_publisher_options[default_author_id]']);
            echo '<p class="description">Tác giả mặc định cho các bài viết được đăng qua API.</p>';
        },
        'article_writer_publisher_settings',
        'article_writer_publisher_main'
    );
    
    add_settings_field(
        'log_retention_days',
        'Lưu Logs (Ngày)',
        function() {
            $options = get_option('article_writer_publisher_options');
            $value = $options['log_retention_days'] ?? 30;
            ?>
            <input type="number" name="article_writer_publisher_options[log_retention_days]" 
                   value="<?php echo esc_attr($value); ?>" min="1" max="365">
            <p class="description">Số ngày lưu giữ logs trước khi xóa.</p>
            <?php
        },
        'article_writer_publisher_settings',
        'article_writer_publisher_main'
    );
});
