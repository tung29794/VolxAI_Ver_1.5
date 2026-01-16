<?php
// Check OpenAI API Keys in Database

$host = 'localhost';
$port = '3306';
$dbname = 'jybcaorr_lisacontentdbapi';
$username = 'jybcaorr_lisaaccountcontentapi';
$password = 'ISlc)_+hKk+g2.m^';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Database connected successfully\n\n";
    
    // Check OpenAI API keys
    echo "=== OpenAI API Keys ===\n";
    $stmt = $pdo->query("
        SELECT id, provider, category, is_active, 
               SUBSTRING(api_key, 1, 10) as key_preview,
               LENGTH(api_key) as key_length,
               created_at
        FROM api_keys 
        WHERE provider = 'openai'
    ");
    
    $keys = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($keys)) {
        echo "❌ NO OpenAI API keys found in database!\n";
        echo "\nYou need to add an OpenAI API key:\n";
        echo "INSERT INTO api_keys (provider, category, api_key, is_active) \n";
        echo "VALUES ('openai', 'content', 'sk-...', TRUE);\n";
    } else {
        foreach ($keys as $key) {
            $status = $key['is_active'] ? '✅ Active' : '❌ Inactive';
            echo "ID: {$key['id']}\n";
            echo "Provider: {$key['provider']}\n";
            echo "Category: {$key['category']}\n";
            echo "Status: $status\n";
            echo "Key Preview: {$key['key_preview']}...\n";
            echo "Key Length: {$key['key_length']} characters\n";
            echo "Created: {$key['created_at']}\n";
            echo "---\n";
        }
    }
    
    // Check for active content keys specifically
    echo "\n=== Active OpenAI Content Keys ===\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as count
        FROM api_keys 
        WHERE provider = 'openai' 
        AND category = 'content' 
        AND is_active = TRUE
    ");
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $count = $result['count'];
    
    if ($count > 0) {
        echo "✅ Found $count active OpenAI content key(s)\n";
    } else {
        echo "❌ No active OpenAI content keys found!\n";
        echo "\nThis is why the API returns 503 error.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
}
?>
