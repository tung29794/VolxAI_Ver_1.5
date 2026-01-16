require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkJob() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [jobs] = await connection.execute(
    'SELECT * FROM batch_jobs WHERE id = 5'
  );
  
  const job = jobs[0];
  console.log('=== BATCH JOB #5 RESULT ===');
  console.log(`Status: ${job.status}`);
  console.log(`Completed: ${job.completed_items}/${job.total_items}`);
  console.log(`Failed: ${job.failed_items}`);
  console.log(`Tokens Used: ${job.tokens_used}`);
  console.log(`Article IDs: ${job.article_ids || 'none'}`);
  
  if (job.error_message) {
    console.log(`\n❌ Error: ${job.error_message}`);
  }
  
  if (job.article_ids) {
    const articleIds = JSON.parse(job.article_ids);
    if (articleIds.length > 0) {
      const [articles] = await connection.execute(
        `SELECT id, title, LENGTH(content) as content_length 
         FROM articles WHERE id IN (${articleIds.join(',')})`
      );
      console.log('\n=== ARTICLES CREATED ===');
      articles.forEach(a => {
        console.log(`\nArticle #${a.id}:`);
        console.log(`  Title: ${a.title}`);
        console.log(`  Content Length: ${a.content_length} chars`);
      });
    }
  }
  
  await connection.end();
}

checkJob().catch(console.error);
