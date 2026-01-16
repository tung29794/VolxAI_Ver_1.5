const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'ghf57-22175.azdigihost.com',
    port: 3306,
    user: 'jybcaorr_lisacontentdbapi',
    password: 'TN123321@tn',
    database: 'jybcaorr_lisacontentdbapi'
  });

  const [jobs] = await conn.execute(
    'SELECT * FROM batch_jobs WHERE id = 19'
  );
  
  if (jobs.length > 0) {
    const job = jobs[0];
    console.log('\n=== BATCH JOB #19 ===');
    console.log('Status:', job.status);
    console.log('Progress:', job.completed_items + '/' + job.total_items);
    console.log('Failed:', job.failed_items);
    console.log('Tokens used:', job.tokens_used);
    
    const jobData = JSON.parse(job.job_data);
    console.log('Model:', jobData.model);
    console.log('Keywords:', jobData.keywords);
    
    if (job.error_log) {
      console.log('\n=== ERROR LOG ===');
      console.log(job.error_log);
    }
  }
  
  await conn.end();
}

check().catch(console.error);
