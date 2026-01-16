<?php
/**
 * Logger Class
 * Ghi lại lịch sử API requests
 */

class Article_Writer_Logger {
    
    private static $log_dir = '';
    
    public static function init() {
        self::$log_dir = ARTICLE_WRITER_PUBLISHER_PLUGIN_DIR . 'logs';
        if (!is_dir(self::$log_dir)) {
            wp_mkdir_p(self::$log_dir);
        }
    }
    
    /**
     * Log API request
     */
    public static function log_request($status, $token, $data, $message, $post_id = null) {
        if (empty(self::$log_dir)) {
            self::init();
        }
        
        $log_entry = [
            'timestamp' => current_time('c'),
            'status' => $status,
            'token' => substr($token, 0, 10) . '...' . substr($token, -10),
            'message' => $message,
            'post_id' => $post_id,
            'title' => isset($data['title']) ? substr($data['title'], 0, 50) : 'N/A',
            'ip' => self::get_client_ip(),
        ];
        
        $log_file = self::$log_dir . '/api-requests-' . date('Y-m-d') . '.json';
        
        if (file_exists($log_file)) {
            $existing = json_decode(file_get_contents($log_file), true) ?? [];
        } else {
            $existing = [];
        }
        
        $existing[] = $log_entry;
        
        file_put_contents($log_file, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    /**
     * Get client IP
     */
    private static function get_client_ip() {
        $ip = '';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        }
        
        return sanitize_text_field($ip);
    }
    
    /**
     * Get recent logs
     */
    public static function get_recent_logs($days = 7) {
        if (empty(self::$log_dir)) {
            self::init();
        }
        
        $logs = [];
        
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $log_file = self::$log_dir . "/api-requests-$date.json";
            
            if (file_exists($log_file)) {
                $file_logs = json_decode(file_get_contents($log_file), true) ?? [];
                $logs = array_merge($logs, $file_logs);
            }
        }
        
        // Sort by timestamp descending
        usort($logs, function($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });
        
        return array_slice($logs, 0, 100); // Return last 100 logs
    }
    
    /**
     * Render logs table
     */
    public static function render_logs_table() {
        $logs = self::get_recent_logs();
        
        if (empty($logs)) {
            echo '<p>Không có logs nào.</p>';
            return;
        }
        
        ?>
        <table class="wp-list-table widefat striped">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Title</th>
                    <th>Post ID</th>
                    <th>IP Address</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($logs as $log): ?>
                <tr>
                    <td><?php echo esc_html($log['timestamp']); ?></td>
                    <td>
                        <?php
                        $status_color = [
                            'success' => '#00a32a',
                            'validation_error' => '#d63638',
                            'invalid_token' => '#d63638',
                            'post_creation_error' => '#d63638',
                            'exception' => '#d63638',
                            'fetch_drafts' => '#0073aa',
                        ];
                        
                        $bg_color = $status_color[$log['status']] ?? '#999';
                        ?>
                        <span style="background-color: <?php echo esc_attr($bg_color); ?>; 
                                     color: white; padding: 3px 8px; border-radius: 3px;">
                            <?php echo esc_html($log['status']); ?>
                        </span>
                    </td>
                    <td><?php echo esc_html($log['message']); ?></td>
                    <td><?php echo esc_html($log['title']); ?></td>
                    <td><?php echo $log['post_id'] ? esc_html($log['post_id']) : '—'; ?></td>
                    <td><?php echo esc_html($log['ip']); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php
    }
}

// Initialize logger
add_action('plugins_loaded', function() {
    Article_Writer_Logger::init();
});
