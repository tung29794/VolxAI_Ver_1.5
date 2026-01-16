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

  // Check article 2054 (latest)
  const [articles] = await connection.execute(
    'SELECT id, title, seo_title, meta_description, content, LENGTH(content) as len FROM articles WHERE id = 2054'
  );
  
  const a = articles[0];
  console.log('=== ARTICLE #2054 (Job #9) ===\n');
  console.log('Title:', a.title);
  console.log('SEO Title:', a.seo_title || 'null');
  console.log('Meta Desc:', a.meta_description || 'null');
  console.log('Content Length:', a.len, 'chars\n');
  
  console.log('📄 CONTENT PREVIEW (first 500 chars):');
  console.log('---');
  console.log(a.content.substring(0, 500));
  console.log('...');
  console.log('---');
  
  await connection.end();
}

check().catch(console.error);
