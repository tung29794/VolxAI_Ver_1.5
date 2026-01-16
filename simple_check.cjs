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

  // Check latest jobs
  const [jobs] = await conn.execute(
    'SELECT id, status, completed_items, failed_items, tokens_used, article_ids FROM batch_jobs WHERE id >= 12 ORDER BY id DESC LIMIT 3'
  );
  
  console.log('Latest jobs:');
  jobs.forEach(j => {
    console.log(`#${j.id}: ${j.status}, ${j.completed_items}/${j.completed_items + j.failed_items}, tokens: ${j.tokens_used}, articles: ${j.article_ids || 'none'}`);
  });
  
  await conn.end();
}

check().catch(console.error);
