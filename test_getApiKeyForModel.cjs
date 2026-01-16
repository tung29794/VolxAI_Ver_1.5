// Test getApiKeyForModel function directly
const mysql = require('mysql2/promise');

async function testGetApiKeyForModel() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi'
  });

  try {
    console.log('\n🧪 Testing getApiKeyForModel logic\n');
    
    const model = 'gemini-2.5-flash';
    console.log(`1. Input model: "${model}"`);
    
    // Step 1: Query ai_models
    console.log('\n2. Query ai_models:');
    const [modelInfo] = await conn.execute(
      `SELECT model_id, provider FROM ai_models 
       WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE 
       LIMIT 1`,
      [model, model]
    );
    
    if (modelInfo.length === 0) {
      console.log('   ❌ Model not found!');
      return;
    }
    
    console.log('   ✅ Found model:', modelInfo[0]);
    const { model_id, provider } = modelInfo[0];
    
    // Step 2: Query api_keys
    console.log('\n3. Query api_keys for provider:', provider);
    const [apiKeys] = await conn.execute(
      `SELECT api_key, provider FROM api_keys
       WHERE provider = ? AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
      [provider]
    );
    
    if (apiKeys.length === 0) {
      console.log('   ❌ API key not found!');
      return;
    }
    
    console.log(`   ✅ Found API key for provider "${provider}":`, apiKeys[0].api_key.substring(0, 20) + '...');
    
    // Step 3: Check if it would call OpenAI or Google AI
    console.log('\n4. Which API would be called?');
    if (provider === 'google-ai') {
      console.log('   ✅ Would call: Google AI API');
      console.log('   URL: https://generativelanguage.googleapis.com/v1beta/models/' + model_id + ':generateContent');
    } else {
      console.log('   ⚠️  Would call: OpenAI API');
      console.log('   URL: https://api.openai.com/v1/chat/completions');
    }
    
    console.log('\n✅ Test complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

testGetApiKeyForModel();
