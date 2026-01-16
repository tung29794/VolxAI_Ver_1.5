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

  const [prompts] = await connection.execute(
    `SELECT system_prompt FROM ai_prompts WHERE feature_name = 'generate_article'`
  );
  
  console.log('=== GENERATE_ARTICLE SYSTEM PROMPT ===\n');
  console.log(prompts[0].system_prompt);
  
  await connection.end();
}

check().catch(console.error);
