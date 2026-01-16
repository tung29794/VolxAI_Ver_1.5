require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Check latest 3 jobs
  const [jobs] = await connection.execute(
    'SELECT id, status, completed_items, total_items, failed_items, tokens_used, article_ids FROM batch_jobs WHERE id >= 7 ORDER BY id DESC LIMIT 3'
  );
  
  console.log('=== LATEST BATCH JOBS ===\n');
  for (const job of jobs) {
    console.log(`Job #${job.id}:`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Progress: ${job.completed_items}/${job.total_items} (${job.failed_items} failed)`);
    console.log(`  Tokens: ${job.tokens_used}`);
    console.log(`  Articles: ${job.article_ids || 'none'}\n`);
  }
  
  await connection.end();
}

check().catch(console.error);
