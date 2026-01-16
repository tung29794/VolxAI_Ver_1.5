<?php
/**
 * Quick Database Check
 * Place in WordPress root and access via browser
 */

// Load WordPress
require_once(dirname(__FILE__) . '/wp-load.php');

global $wpdb;

echo "<h2>Database Token Table Check</h2>";

$table_name = $wpdb->prefix . 'article_writer_tokens';

// Check if table exists
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");

echo "<p><strong>Table Name:</strong> " . $table_name . "</p>";
echo "<p><strong>Table Exists:</strong> " . ($table_exists ? "✅ YES" : "❌ NO") . "</p>";

if ($table_exists) {
    echo "<p><strong>Table Structure:</strong></p>";
    $columns = $wpdb->get_results("DESCRIBE $table_name");
    echo "<pre>";
    foreach ($columns as $col) {
        echo $col->Field . " (" . $col->Type . ") " . ($col->Null == 'NO' ? 'NOT NULL' : 'NULL') . "\n";
    }
    echo "</pre>";
    
    echo "<p><strong>Tokens in Database:</strong></p>";
    $tokens = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 5");
    echo "<pre>";
    echo count($tokens) . " tokens found\n";
    if ($tokens) {
        foreach ($tokens as $token) {
            echo "ID: " . $token->id . ", Name: " . $token->token_name . ", Created: " . $token->created_at . "\n";
        }
    }
    echo "</pre>";
} else {
    echo "<p><strong style='color: red;'>⚠️ Table does not exist!</strong></p>";
    echo "<p>The plugin may not have been activated properly.</p>";
    echo "<p>Try:<br>1. Go to Admin > Plugins<br>2. Deactivate 'Article Writer Publisher'<br>3. Reactivate it</p>";
}

echo "<p><a href='javascript:location.reload()'>Refresh</a></p>";
?>
