require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const userId = 5;
  const jobData = {
    keywords: ["cách nấu phở bò ngon"],
    settings: {
      model: "GPT 4",
      language: "vi",
      tone: "professional",
      length: "short",
      outlineOption: "no-outline",
      customOutline: null,
      autoInsertImages: false,
      maxImages: 5,
      websiteId: null,
      useGoogleSearch: false
    }
  };

  const [result] = await conn.execute(
    `INSERT INTO batch_jobs (
      user_id, job_type, status, total_items, completed_items, failed_items,
      job_data, current_item_index, tokens_at_start, articles_limit_at_start,
      created_at, updated_at
    ) VALUES (?, 'batch_keywords', 'pending', ?, 0, 0, ?, 0, 
              (SELECT tokens_remaining FROM users WHERE id = ?),
              (SELECT article_limit FROM users WHERE id = ?),
              NOW(), NOW())`,
    [userId, 1, JSON.stringify(jobData), userId, userId]
  );

  console.log(`✅ Job #${result.insertId} created with safe keyword: "cách nấu phở bò ngon"`);
  console.log(`Waiting 25 seconds...`);
  
  await new Promise(r => setTimeout(r, 25000));
  
  const [jobs] = await conn.execute('SELECT * FROM batch_jobs WHERE id = ?', [result.insertId]);
  const job = jobs[0];
  
  console.log(`\nJob Status: ${job.status}, Tokens: ${job.tokens_used}`);
  
  if (job.article_ids) {
    const ids = JSON.parse(job.article_ids);
    const [arts] = await conn.execute(
      'SELECT LEFT(content, 600) as preview, LENGTH(content) as len FROM articles WHERE id = ?',
      [ids[0]]
    );
    console.log(`\nArticle Length: ${arts[0].len} chars`);
    console.log('\nPreview:');
    console.log(arts[0].preview);
  }
  
  await conn.end();
}

test().catch(console.error);
