const mysql = require('mysql2/promise');

async function testGemini() {
  const conn = await mysql.createConnection({
    host: 'ghf57-22175.azdigihost.com',
    port: 3306,
    user: 'jybcaorr_lisacontentdbapi',
    password: 'TN123321@tn',
    database: 'jybcaorr_lisacontentdbapi'
  });

  console.log('\n=== CHECKING GEMINI CONFIGURATION ===\n');

  // 1. Check ai_models table
  const [models] = await conn.execute(
    "SELECT * FROM ai_models WHERE model_name LIKE '%gemini%' AND is_active = TRUE"
  );
  
  console.log('📊 ACTIVE GEMINI MODELS:');
  if (models.length === 0) {
    console.log('   ❌ NO GEMINI MODELS FOUND IN DATABASE!');
  } else {
    models.forEach(m => {
      console.log(`   ✅ ID: ${m.id}`);
      console.log(`      Name: ${m.model_name}`);
      console.log(`      Provider: ${m.provider}`);
      console.log(`      Display: ${m.display_name}`);
      console.log('      ---');
    });
  }

  // 2. Check api_keys table
  const [keys] = await conn.execute(
    "SELECT * FROM api_keys WHERE provider = 'google-ai' AND is_active = TRUE"
  );
  
  console.log('\n🔑 GOOGLE AI API KEYS:');
  if (keys.length === 0) {
    console.log('   ❌ NO GOOGLE AI API KEYS FOUND!');
  } else {
    keys.forEach(k => {
      console.log(`   ✅ ID: ${k.id}`);
      console.log(`      Category: ${k.category}`);
      console.log(`      Key: ${k.api_key.substring(0, 20)}...`);
      console.log('      ---');
    });
  }

  // 3. Check latest batch job
  const [jobs] = await conn.execute(
    'SELECT * FROM batch_jobs ORDER BY id DESC LIMIT 1'
  );
  
  if (jobs.length > 0) {
    const job = jobs[0];
    console.log('\n📝 LATEST BATCH JOB:');
    console.log(`   Job ID: #${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Progress: ${job.completed_items}/${job.total_items}`);
    console.log(`   Failed: ${job.failed_items}`);
    console.log(`   Tokens used: ${job.tokens_used}`);
    
    const jobData = JSON.parse(job.job_data);
    console.log(`   Model: ${jobData.model}`);
    
    if (job.error_log) {
      console.log('\n   ❌ ERROR LOG:');
      console.log('   ' + job.error_log.split('\n').join('\n   '));
    }
  }

  await conn.end();
  
  console.log('\n=== DIAGNOSIS ===');
  if (models.length === 0) {
    console.log('❌ PROBLEM: No Gemini models in ai_models table!');
    console.log('   Solution: Add Gemini model to database');
  } else if (keys.length === 0) {
    console.log('❌ PROBLEM: No Google AI API keys!');
    console.log('   Solution: Add API key to api_keys table');
  } else {
    console.log('✅ Configuration looks good!');
    console.log('   - Gemini models exist in database');
    console.log('   - Google AI API key exists');
    console.log('\nIf batch job still fails, check server logs for detailed error messages.');
    console.log('The new debug logs will show:');
    console.log('   🔍 [getApiKeyForModel] - Model lookup');
    console.log('   🔵 [callAI] - API call details');
    console.log('   ✅ or ❌ - Success/failure messages');
  }
}

testGemini().catch(console.error);
