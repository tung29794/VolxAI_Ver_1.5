require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Get job details
  const [jobs] = await conn.execute(
    'SELECT * FROM batch_jobs WHERE id = 16'
  );
  
  const job = jobs[0];
  console.log('=== BATCH JOB #16 ===');
  console.log(`Status: ${job.status}`);
  console.log(`Progress: ${job.completed_items}/${job.total_items}`);
  console.log(`Failed: ${job.failed_items}`);
  console.log(`Tokens used: ${job.tokens_used}`);
  console.log(`Error message: ${job.error_message || 'none'}`);
  console.log(`\nJob Data:`);
  const jobData = JSON.parse(job.job_data);
  console.log(`  Model: ${jobData.settings.model}`);
  console.log(`  Keywords: ${jobData.keywords.join(', ')}`);
  console.log(`  Language: ${jobData.settings.language}`);
  console.log(`  Length: ${jobData.settings.length}`);
  
  // Check if any articles were created
  if (job.article_ids) {
    const ids = JSON.parse(job.article_ids);
    console.log(`\nArticle IDs: ${ids.join(', ')}`);
    
    if (ids.length > 0) {
      const [articles] = await conn.execute(
        'SELECT id, title, LENGTH(content) as len FROM articles WHERE id IN (?)',
        [ids]
      );
      console.log('\nArticles:');
      articles.forEach(a => {
        console.log(`  #${a.id}: "${a.title}" (${a.len} chars)`);
      });
    }
  } else {
    console.log('\nNo articles created');
  }
  
  await conn.end();
}

check().catch(console.error);
