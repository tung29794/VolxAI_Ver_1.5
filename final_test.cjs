require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const userId = 5;
  const jobData = {
    keywords: ["cách giao dịch forex hiệu quả"],
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

  const jobId = result.insertId;
  console.log(`✅ Created batch job #${jobId}`);
  console.log(`   Keyword: "${jobData.keywords[0]}"`);
  console.log(`\n⏳ Waiting 30 seconds...`);
  
  await new Promise(r => setTimeout(r, 30000));
  
  const [jobs] = await connection.execute('SELECT * FROM batch_jobs WHERE id = ?', [jobId]);
  const job = jobs[0];
  
  console.log('\n=== RESULT ===');
  console.log(`Status: ${job.status}`);
  console.log(`Progress: ${job.completed_items}/${job.total_items} (${job.failed_items} failed)`);
  console.log(`Tokens: ${job.tokens_used}`);
  
  if (job.article_ids) {
    const ids = JSON.parse(job.article_ids);
    if (ids.length > 0) {
      const [articles] = await connection.execute(
        'SELECT id, title, seo_title, meta_description, LEFT(content, 400) as preview, LENGTH(content) as len FROM articles WHERE id = ?',
        [ids[0]]
      );
      const a = articles[0];
      console.log('\n✅ ARTICLE CREATED:');
      console.log(`ID: ${a.id}`);
      console.log(`Title: ${a.title}`);
      console.log(`SEO Title: ${a.seo_title || 'N/A'}`);
      console.log(`Meta Desc: ${a.meta_description || 'N/A'}`);
      console.log(`Content: ${a.len} chars\n`);
      console.log('Preview:');
      console.log(a.preview + '...');
    }
  }
  
  await connection.end();
}

test().catch(console.error);
