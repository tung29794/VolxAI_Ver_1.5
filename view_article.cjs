require('dotenv').config();
const mysql = require('mysql2/promise');

async function view() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [arts] = await conn.execute(
    'SELECT id, title, content, LENGTH(content) as len FROM articles WHERE id = 2057'
  );
  
  const a = arts[0];
  console.log(`Article #${a.id}: ${a.title}`);
  console.log(`Length: ${a.len} chars\n`);
  
  console.log('FIRST 700 chars:');
  console.log(a.content.substring(0, 700));
  console.log('\n...\n');
  
  console.log('LAST 500 chars:');
  console.log(a.content.substring(a.len - 500));
  
  await conn.end();
}

view().catch(console.error);
