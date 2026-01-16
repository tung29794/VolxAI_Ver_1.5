const mysql = require('mysql2/promise');

async function checkJob() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'jybcaorr_lisacontentdbapi',
    password: 'TN123321@tn',
    database: 'jybcaorr_lisacontentdbapi'
  });

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
    console.log('Keywords:', jobData.keywords);
    
    if (job.article_ids) {
      console.log('Articles:', job.article_ids);
    } else {
      console.log('No articles created');
    }
    
    // Check for errors
    if (job.error_log) {
      console.log('\n=== ERRORS ===');
      console.log(job.error_log);
    }
  }
  
  await conn.end();
}

checkJob().catch(console.error);
