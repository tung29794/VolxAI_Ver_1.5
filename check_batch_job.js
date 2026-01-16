require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkBatchJob() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Get batch job #3
  const [jobs] = await connection.execute(
    'SELECT * FROM batch_jobs WHERE id = 3'
  );
  
  console.log('=== BATCH JOB #3 ===');
  console.log(JSON.stringify(jobs[0], null, 2));
  
  // Get articles created by this job
  const articleIds = jobs[0].article_ids ? JSON.parse(jobs[0].article_ids) : [];
  console.log('\n=== ARTICLE IDs ===');
  console.log('Article IDs:', articleIds);
  
  if (articleIds.length > 0) {
    const [articles] = await connection.execute(
      `SELECT id, title, LENGTH(content) as content_length, status, created_at 
       FROM articles WHERE id IN (${articleIds.join(',')})`
    );
    console.log('\n=== ARTICLES ===');
    console.log(JSON.stringify(articles, null, 2));
  }
  
  await connection.end();
}

checkBatchJob().catch(console.error);
