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

  // Create test batch job with OpenAI
  const userId = 5;
  const jobData = {
    keywords: ["học forex cơ bản"], // Vietnamese keyword
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

  console.log(`✅ Created test batch job #${result.insertId}`);
  console.log(`   Keyword: "học forex cơ bản"`);
  console.log(`   Model: GPT 4`);
  console.log(`\nWaiting 30 seconds for processing...`);
  
  // Wait and check result
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const [jobs] = await connection.execute(
    `SELECT * FROM batch_jobs WHERE id = ?`,
    [result.insertId]
  );
  
  const job = jobs[0];
  console.log('\n=== RESULT ===');
  console.log(`Status: ${job.status}`);
  console.log(`Completed: ${job.completed_items}/${job.total_items}`);
  console.log(`Failed: ${job.failed_items}`);
  console.log(`Tokens Used: ${job.tokens_used}`);
  
  if (job.article_ids) {
    const articleIds = JSON.parse(job.article_ids);
    if (articleIds.length > 0) {
      const [articles] = await connection.execute(
        `SELECT id, title, seo_title, meta_description, LENGTH(content) as content_length, status
         FROM articles WHERE id = ?`,
        [articleIds[0]]
      );
      
      const article = articles[0];
      console.log('\n✅ ARTICLE CREATED:');
      console.log(`   ID: ${article.id}`);
      console.log(`   Title: ${article.title}`);
      console.log(`   SEO Title: ${article.seo_title || 'null'}`);
      console.log(`   Meta Desc: ${article.meta_description || 'null'}`);
      console.log(`   Content: ${article.content_length} chars`);
      console.log(`   Status: ${article.status}`);
      
      // Show first 200 chars of content
      const [fullArticle] = await connection.execute(
        `SELECT content FROM articles WHERE id = ?`,
        [articleIds[0]]
      );
      console.log(`\n📄 Content Preview:`);
      console.log(fullArticle[0].content.substring(0, 200) + '...');
    }
  }
  
  await connection.end();
}

testBatch().catch(console.error);
