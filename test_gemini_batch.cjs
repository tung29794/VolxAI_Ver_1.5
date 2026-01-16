const mysql = require('mysql2/promise');

async function testGeminiBatch() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi'
  });

  try {
    console.log('\n🧪 Testing Gemini Batch Job Configuration\n');
    
    // Check ai_models table
    console.log('1. Checking ai_models table for Gemini 2.5 Flash:');
    const [models] = await connection.execute(
      `SELECT model_id, display_name, provider, is_active 
       FROM ai_models 
       WHERE model_id = 'gemini-2.5-flash' OR display_name = 'Gemini 2.5 Flash'`
    );
    console.log('   Models found:', models);
    
    // Check api_keys
    console.log('\n2. Checking api_keys for google-ai provider:');
    const [keys] = await connection.execute(
      `SELECT provider, category, is_active, 
       SUBSTRING(api_key, 1, 15) as api_key_preview 
       FROM api_keys 
       WHERE provider = 'google-ai' AND category = 'content'`
    );
    console.log('   API Keys:', keys);
    
    // Check latest batch job
    console.log('\n3. Checking latest batch job:');
    const [jobs] = await connection.execute(
      `SELECT id, user_id, status, 
       JSON_EXTRACT(job_data, '$.settings.model') as model,
       JSON_EXTRACT(job_data, '$.settings.useGoogleSearch') as useGoogleSearch,
       failed_items, error_message
       FROM batch_jobs 
       ORDER BY id DESC 
       LIMIT 1`
    );
    console.log('   Latest job:', jobs);
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testGeminiBatch();
