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
    keywords: ["học forex hiệu quả cho người mới"],
    settings: {
      model: "GPT 4",
      language: "vi",
      tone: "professional",
      length: "short", // Test với short: 1-2 paragraphs/heading, 80+ words each
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
  console.log(`   Length: SHORT (1-2 paragraphs/heading, 80+ words/paragraph)`);
  console.log(`\n⏳ Waiting 30 seconds...\n`);
  
  await new Promise(r => setTimeout(r, 30000));
  
  const [jobs] = await connection.execute('SELECT * FROM batch_jobs WHERE id = ?', [jobId]);
  const job = jobs[0];
  
  console.log('=== RESULT ===');
  console.log(`Status: ${job.status}`);
  console.log(`Progress: ${job.completed_items}/${job.total_items} (${job.failed_items} failed)`);
  console.log(`Tokens: ${job.tokens_used}`);
  
  if (job.article_ids) {
    const ids = JSON.parse(job.article_ids);
    if (ids.length > 0) {
      const [articles] = await connection.execute(
        'SELECT id, title, LEFT(content, 500) as preview, LENGTH(content) as len FROM articles WHERE id = ?',
        [ids[0]]
      );
      const a = articles[0];
      console.log('\n✅ ARTICLE:');
      console.log(`ID: ${a.id}`);
      console.log(`Title: ${a.title}`);
      console.log(`Length: ${a.len} chars\n`);
      console.log('First 500 chars:');
      console.log('---');
      console.log(a.preview);
      console.log('...\n---');
      
      // Check if starts with meta text
      if (a.preview.toLowerCase().includes('as an expert') || 
          a.preview.toLowerCase().includes('i will write') ||
          a.preview.toLowerCase().includes('i will craft')) {
        console.log('\n⚠️  WARNING: Article starts with meta-text!');
      } else {
        console.log('\n✅ Good! Article starts directly with content.');
      }
    }
  }
  
  await connection.end();
}

test().catch(console.error);
