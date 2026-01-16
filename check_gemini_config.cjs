const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'ghf57-22175.azdigihost.com',
    port: 3306,
    user: 'jybcaorr_lisacontentdbapi',
    password: 'TN123321@tn',
    database: 'jybcaorr_lisacontentdbapi'
  });

  // Check models
  const [models] = await conn.execute(
    "SELECT * FROM ai_models WHERE model_name LIKE '%gemini%'"
  );
  
  console.log('\n=== GEMINI MODELS ===');
  models.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`Name: ${m.model_name}`);
    console.log(`Provider: ${m.provider}`);
    console.log(`Active: ${m.is_active ? 'YES' : 'NO'}`);
    console.log('---');
  });

  // Check API keys
  const [keys] = await conn.execute(
    "SELECT * FROM api_keys WHERE provider = 'google-ai'"
  );
  
  console.log('\n=== GOOGLE AI API KEYS ===');
  keys.forEach(k => {
    console.log(`ID: ${k.id}`);
    console.log(`Category: ${k.category}`);
    console.log(`Active: ${k.is_active ? 'YES' : 'NO'}`);
    console.log(`Key: ${k.api_key.substring(0, 15)}...`);
    console.log('---');
  });

  // Check job #17
  const [jobs] = await conn.execute(
    'SELECT * FROM batch_jobs WHERE id = 17'
  );
  
  if (jobs.length > 0) {
    const job = jobs[0];
    console.log('\n=== BATCH JOB #17 ===');
    console.log('Status:', job.status);
    console.log('Progress:', job.completed_items + '/' + job.total_items);
    console.log('Failed:', job.failed_items);
    console.log('Tokens used:', job.tokens_used);
    
    const jobData = JSON.parse(job.job_data);
    console.log('Model:', jobData.model);
    
    if (job.error_log) {
      console.log('\n=== ERROR LOG ===');
      console.log(job.error_log);
    }
  }
  
  await conn.end();
}

check().catch(console.error);
