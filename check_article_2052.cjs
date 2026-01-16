require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkArticle() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [articles] = await connection.execute(
    'SELECT id, title, seo_title, meta_description, content, status FROM articles WHERE id = 2052'
  );
  
  const article = articles[0];
  console.log('=== ARTICLE #2052 ===');
  console.log(`Title: ${article.title}`);
  console.log(`SEO Title: ${article.seo_title}`);
  console.log(`Meta Desc: ${article.meta_description}`);
  console.log(`Status: ${article.status}`);
  console.log(`\nContent (${article.content.length} chars):`);
  console.log('---');
  console.log(article.content);
  console.log('---');
  
  await connection.end();
}

checkArticle().catch(console.error);
