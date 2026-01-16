require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPrompts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Get ALL prompts to see what we have
  const [prompts] = await connection.execute(
    `SELECT id, feature_name, display_name 
     FROM ai_prompts 
     WHERE is_active = 1
     ORDER BY feature_name`
  );
  
  console.log('=== ALL ACTIVE AI PROMPTS ===');
  prompts.forEach(p => {
    console.log(`${p.id}: ${p.feature_name} (${p.display_name})`);
  });
  
  await connection.end();
}

checkPrompts().catch(console.error);
