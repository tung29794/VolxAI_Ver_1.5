require('dotenv').config();
const mysql = require('mysql2/promise');

async function testBatch() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Create a test batch job with 1 keyword
  const userId = 5; // Same user from job #3
  const jobData = {
    keywords: ["test forex trading"],
    settings: {
      model: "gemini-2.5-flash",
      language: "vi",
      tone: "SEO Focus: Tối ưu SEO, có gắng đặt xếp hang SERP cao",
      length: "short",
      outlineOption: "no-outline",
      customOutline: null,
      autoInsertImages: false,
      maxImages: 5,
      websiteId: null,
      useGoogleSearch: false
    }
  };

  const [result] = await connection.execute(
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

  console.log(`✅ Created test batch job #${result.insertId}`);
  console.log(`\nWait 10-15 seconds for the worker to process it...`);
  console.log(`Then check: http://app.volxai.com/account?tab=batch-jobs`);
  
  await connection.end();
}

testBatch().catch(console.error);
