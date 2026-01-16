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

  // Check generate_article prompt
  const [prompts] = await connection.execute(
    `SELECT id, feature_name, display_name, LEFT(prompt_template, 300) as prompt_preview, LEFT(system_prompt, 200) as system_preview
     FROM ai_prompts 
     WHERE feature_name IN ('generate_article', 'generate_outline', 'generate_article_title')
     ORDER BY feature_name`
  );
  
  console.log('=== AI PROMPTS ===\n');
  for (const p of prompts) {
    console.log(`${p.feature_name} (#${p.id}):`);
    console.log(`Display: ${p.display_name}`);
    console.log(`\nSystem Prompt:`);
    console.log(p.system_preview + '...');
    console.log(`\nPrompt Template:`);
    console.log(p.prompt_preview + '...');
    console.log('\n---\n');
  }
  
  await connection.end();
}

check().catch(console.error);
