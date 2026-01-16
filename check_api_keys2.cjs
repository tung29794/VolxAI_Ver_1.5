require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAPIKeys() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Check table structure first
  const [columns] = await connection.execute('SHOW COLUMNS FROM api_keys');
  console.log('=== API_KEYS TABLE STRUCTURE ===');
  columns.forEach(col => {
    console.log(`- ${col.Field} (${col.Type})`);
  });
  
  // Get all active keys
  const [keys] = await connection.execute(
    `SELECT * FROM api_keys WHERE is_active = 1 LIMIT 5`
  );
  
  console.log(`\n=== ACTIVE API KEYS ===`);
  console.log(`Found ${keys.length} active keys`);
  if (keys.length > 0) {
    keys.forEach((k, i) => {
      console.log(`\nKey #${i+1}:`);
      Object.keys(k).forEach(key => {
        if (key !== 'api_key') { // Don't show actual key
          console.log(`  ${key}: ${k[key]}`);
        }
      });
    });
  }
  
  await connection.end();
}

checkAPIKeys().catch(console.error);
