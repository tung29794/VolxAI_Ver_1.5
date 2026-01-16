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

  // Create a test batch job with OpenAI (GPT 4)
  const userId = 5;
  const jobData = {
    keywords: ["forex trading basics"],
    settings: {
      model: "GPT 4", // Use OpenAI instead
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

  console.log(`✅ Created test batch job #${result.insertId} with OpenAI GPT-4`);
  console.log(`\nWait 15-20 seconds for processing...`);
  
  await connection.end();
}

testBatch().catch(console.error);
