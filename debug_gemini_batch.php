<?php
$conn = new mysqli('localhost', 'jybcaorr_lisaaccountcontentapi', 'ISlc)_+hKk+g2.m^', 'jybcaorr_lisacontentdbapi');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "🔍 Debugging Gemini Batch Job Issue\n\n";

// Check batch job #24
echo "1. Batch Job #24 Details:\n";
$result = $conn->query("SELECT id, status, failed_items, error_message, job_data FROM batch_jobs WHERE id = 24");
if ($row = $result->fetch_assoc()) {
    echo "   Status: " . $row['status'] . "\n";
    echo "   Failed items: " . $row['failed_items'] . "\n";
    echo "   Error: " . $row['error_message'] . "\n";
    $jobData = json_decode($row['job_data'], true);
    echo "   Model: " . $jobData['settings']['model'] . "\n";
    echo "   Use Google Search: " . ($jobData['settings']['useGoogleSearch'] ? 'true' : 'false') . "\n\n";
}

// Check ai_models for gemini
echo "2. Gemini Model in Database:\n";
$result = $conn->query("SELECT model_id, display_name, provider, is_active FROM ai_models WHERE model_id = 'gemini-2.5-flash' OR display_name LIKE '%Gemini%'");
while ($row = $result->fetch_assoc()) {
    echo "   Model ID: " . $row['model_id'] . "\n";
    echo "   Display Name: " . $row['display_name'] . "\n";
    echo "   Provider: " . $row['provider'] . "\n";
    echo "   Active: " . ($row['is_active'] ? 'Yes' : 'No') . "\n\n";
}

// Check API keys
echo "3. Google AI API Key:\n";
$result = $conn->query("SELECT provider, category, is_active, LEFT(api_key, 20) as key_preview FROM api_keys WHERE provider = 'google-ai' AND category = 'content'");
if ($row = $result->fetch_assoc()) {
    echo "   Provider: " . $row['provider'] . "\n";
    echo "   Category: " . $row['category'] . "\n";
    echo "   Active: " . ($row['is_active'] ? 'Yes' : 'No') . "\n";
    echo "   Key: " . $row['key_preview'] . "...\n\n";
} else {
    echo "   ❌ No Google AI API key found!\n\n";
}

// Compare with OpenAI (working)
echo "4. OpenAI API Key (for comparison):\n";
$result = $conn->query("SELECT provider, category, is_active, LEFT(api_key, 20) as key_preview FROM api_keys WHERE provider = 'openai' AND category = 'content'");
if ($row = $result->fetch_assoc()) {
    echo "   Provider: " . $row['provider'] . "\n";
    echo "   Category: " . $row['category'] . "\n";
    echo "   Active: " . ($row['is_active'] ? 'Yes' : 'No') . "\n";
    echo "   Key: " . $row['key_preview'] . "...\n\n";
}

// Test query that backend uses
echo "5. Testing Backend Query:\n";
$model = 'gemini-2.5-flash';
$stmt = $conn->prepare("SELECT model_id, provider FROM ai_models WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE LIMIT 1");
$stmt->bind_param("ss", $model, $model);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    echo "   ✅ Query successful!\n";
    echo "   Found: model_id=" . $row['model_id'] . ", provider=" . $row['provider'] . "\n\n";
} else {
    echo "   ❌ Query returned no results!\n\n";
}

$conn->close();
echo "✅ Debug complete!\n";
?>
