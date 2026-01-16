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
    `SELECT prompt_template, available_variables
     FROM ai_prompts 
     WHERE feature_name = 'generate_article'`
  );
  
  const p = prompts[0];
  console.log('=== GENERATE_ARTICLE PROMPT TEMPLATE ===\n');
  console.log(p.prompt_template);
  console.log('\n=== AVAILABLE VARIABLES ===');
  console.log(p.available_variables);
  
  await connection.end();
}

check().catch(console.error);
