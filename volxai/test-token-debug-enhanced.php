<?php
/**
 * Enhanced Token Creation Debug Script
 * Place this file in your WordPress root directory and access it at:
 * https://yoursite.com/test-token-debug-enhanced.php
 */

// Load WordPress
require_once(dirname(__FILE__) . '/wp-load.php');

echo "<!DOCTYPE html>";
echo "<html><head><title>Token Debug - Enhanced</title>";
echo "<style>
body { font-family: monospace; margin: 20px; background: #f5f5f5; }
.test { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ccc; }
.pass { border-color: green; background: #f0fff0; }
.fail { border-color: red; background: #fff0f0; }
.info { border-color: blue; background: #f0f8ff; }
.code { background: #f1f1f1; padding: 10px; overflow-x: auto; margin: 5px 0; }
h1 { color: #333; }
h2 { color: #666; margin-top: 30px; }
.result { font-weight: bold; }
.timestamp { color: #999; font-size: 0.9em; }
</style></head><body>";

echo "<h1>🔧 Enhanced Token Creation Debug</h1>";
echo "<p class='timestamp'>Generated: " . date('Y-m-d H:i:s') . "</p>";

// Test 1: WordPress Environment
echo "<div class='test info'>";
echo "<h2>Test 1: WordPress Environment</h2>";
echo "<p><strong>WordPress Version:</strong> " . get_bloginfo('version') . "</p>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>WordPress Debug:</strong> " . (defined('WP_DEBUG') && WP_DEBUG ? 'ENABLED ✅' : 'DISABLED ⚠️') . "</p>";
echo "<p><strong>Debug Log Location:</strong> " . (defined('WP_DEBUG_LOG') ? WP_DEBUG_LOG : WP_CONTENT_DIR . '/debug.log') . "</p>";
echo "</div>";

// Test 2: Plugin Activation
echo "<div class='test " . (is_plugin_active('lisa-content-app-plugin/article-writer-publisher.php') || is_plugin_active('lisa-content-app-plugin/article-writer-publisher.php') ? 'pass' : 'fail') . "'>";
echo "<h2>Test 2: Plugin Status</h2>";

$plugin_file = 'lisa-content-app-plugin/article-writer-publisher.php';
$is_active = is_plugin_active($plugin_file);
$plugin_dir = WP_PLUGIN_DIR . '/lisa-content-app-plugin';
$plugin_dir_exists = is_dir($plugin_dir);

echo "<p><strong>Plugin Directory:</strong> " . ($plugin_dir_exists ? '✅ EXISTS' : '❌ NOT FOUND') . "</p>";
if ($plugin_dir_exists) {
    echo "<p class='code'>$plugin_dir</p>";
}

echo "<p><strong>Plugin Activated:</strong> " . ($is_active ? '✅ YES' : '❌ NO') . "</p>";

// List plugin files
if ($plugin_dir_exists) {
    echo "<p><strong>Plugin Files:</strong></p>";
    $files = scandir($plugin_dir);
    echo "<div class='code'>";
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo htmlspecialchars($file) . "\n";
        }
    }
    echo "</div>";
}
echo "</div>";

// Test 3: Database Table
echo "<div class='test info'>";
echo "<h2>Test 3: Database Table</h2>";

global $wpdb;
$table_name = $wpdb->prefix . 'article_writer_tokens';
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");

echo "<p><strong>Table Name:</strong> " . $table_name . "</p>";
echo "<p><strong>Table Exists:</strong> " . ($table_exists ? '✅ YES' : '❌ NO') . "</p>";

if ($table_exists) {
    // Check table structure
    echo "<p><strong>Table Structure:</strong></p>";
    $columns = $wpdb->get_results("DESCRIBE $table_name");
    echo "<div class='code'>";
    foreach ($columns as $col) {
        echo htmlspecialchars($col->Field) . " (" . $col->Type . ")\n";
    }
    echo "</div>";
    
    // Count tokens
    $token_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    echo "<p><strong>Total Tokens in DB:</strong> " . $token_count . "</p>";
    
    // List all tokens
    echo "<p><strong>Token List:</strong></p>";
    $tokens = $wpdb->get_results("SELECT id, token, token_name, is_active, created_at FROM $table_name ORDER BY created_at DESC");
    
    if ($tokens) {
        echo "<div class='code'>";
        echo "ID | Token | Name | Active | Created\n";
        echo "---|-------|------|--------|--------\n";
        foreach ($tokens as $token) {
            echo $token->id . " | " . substr($token->token, 0, 10) . "... | " . $token->token_name . " | " . ($token->is_active ? 'YES' : 'NO') . " | " . $token->created_at . "\n";
        }
        echo "</div>";
    } else {
        echo "<p>No tokens found</p>";
    }
}
echo "</div>";

// Test 4: Class Loading
echo "<div class='test info'>";
echo "<h2>Test 4: Class Loading</h2>";

$classes = [
    'Article_Writer_Token_Manager',
    'Article_Writer_API_Handler',
    'Article_Writer_Logger',
    'Article_Writer_Settings_Page'
];

foreach ($classes as $class) {
    $exists = class_exists($class);
    echo "<p><strong>" . $class . ":</strong> " . ($exists ? '✅ LOADED' : '❌ NOT FOUND') . "</p>";
}
echo "</div>";

// Test 5: Manual Token Generation
echo "<div class='test info'>";
echo "<h2>Test 5: Manual Token Generation</h2>";

if (class_exists('Article_Writer_Token_Manager')) {
    echo "<p>Attempting to create a test token...</p>";
    
    $test_token_name = 'TEST-' . time();
    $result = Article_Writer_Token_Manager::generate_token($test_token_name);
    
    if ($result) {
        echo "<div class='pass'>";
        echo "<p class='result'>✅ TOKEN CREATED SUCCESSFULLY</p>";
        echo "<p><strong>Token:</strong></p>";
        echo "<div class='code'>" . htmlspecialchars($result) . "</div>";
        echo "<p><strong>Token Name:</strong> " . $test_token_name . "</p>";
        echo "</div>";
    } else {
        echo "<div class='fail'>";
        echo "<p class='result'>❌ TOKEN CREATION FAILED</p>";
        echo "<p><strong>Database Error:</strong></p>";
        echo "<div class='code'>" . htmlspecialchars($wpdb->last_error) . "</div>";
        echo "</div>";
    }
} else {
    echo "<div class='fail'>";
    echo "<p>Cannot test - Article_Writer_Token_Manager class not found</p>";
    echo "</div>";
}
echo "</div>";

// Test 6: WordPress Error Log
echo "<div class='test info'>";
echo "<h2>Test 6: Recent Error Log</h2>";

$debug_log = WP_CONTENT_DIR . '/debug.log';
if (file_exists($debug_log)) {
    echo "<p><strong>Log File:</strong> " . $debug_log . "</p>";
    
    $lines = file($debug_log);
    $last_lines = array_slice($lines, -50); // Last 50 lines
    
    echo "<p><strong>Last 50 Log Entries (Token-related):</strong></p>";
    echo "<div class='code'>";
    foreach ($last_lines as $line) {
        if (strpos(strtolower($line), 'token') !== false || strpos(strtolower($line), 'article') !== false) {
            echo htmlspecialchars(trim($line)) . "\n";
        }
    }
    echo "</div>";
} else {
    echo "<div class='fail'>";
    echo "<p>⚠️ Debug log not found at expected location</p>";
    echo "<p>Make sure WP_DEBUG is enabled in wp-config.php</p>";
    echo "</div>";
}
echo "</div>";

// Test 7: Form Submission Simulation
echo "<div class='test info'>";
echo "<h2>Test 7: Form Submission Test</h2>";

if (isset($_POST['simulate_form'])) {
    echo "<p>Simulating form submission...</p>";
    
    // Simulate the POST request that the form would send
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_POST['token_name'] = 'FORM-TEST-' . time();
    $_POST['article_writer_nonce'] = wp_create_nonce('article_writer_generate_token');
    
    // Include the plugin's token rendering function to test
    echo "<p>Form simulation would test the actual form handler logic</p>";
    echo "<p><strong>Simulated Token Name:</strong> " . $_POST['token_name'] . "</p>";
    echo "<p><strong>Simulated Nonce:</strong> " . substr($_POST['article_writer_nonce'], 0, 20) . "...</p>";
} else {
    echo "<p><a href='?simulate_form=1'>Click here to simulate form submission</a></p>";
}
echo "</div>";

// Summary
echo "<div class='test'>";
echo "<h2>Summary & Next Steps</h2>";
echo "<ol>";
echo "<li><strong>If Plugin Status is ❌:</strong> Go to WordPress Admin → Plugins and activate the Article Writer Publisher plugin</li>";
echo "<li><strong>If Table Exists is ❌:</strong> Try deactivating and reactivating the plugin to trigger table creation</li>";
echo "<li><strong>If Manual Token Generation passes ✅:</strong> The database and code are working - the issue is in the form submission</li>";
echo "<li><strong>If Manual Token Generation fails ❌:</strong> Check the Database Error message for SQL issues</li>";
echo "<li><strong>Check Error Log:</strong> Look for '[article' or 'token' entries in the log above</li>";
echo "</ol>";
echo "</div>";

echo "</body></html>";
?>
