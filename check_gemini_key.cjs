require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Check for Google AI keys
  const [keys] = await conn.execute(
    `SELECT id, provider, category, description, is_active, 
            LEFT(api_key, 10) as key_preview
     FROM api_keys 
     WHERE provider IN ('google-ai', 'gemini', 'google') 
     ORDER BY is_active DESC, id DESC`
  );
  
  console.log('=== GOOGLE AI / GEMINI KEYS ===');
  if (keys.length === 0) {
    console.log('❌ NO KEYS FOUND!');
    console.log('\nSearching for any key with "google" or "gemini" in description...');
    
    const [allKeys] = await conn.execute(
      `SELECT id, provider, category, description, is_active
       FROM api_keys 
       WHERE description LIKE '%google%' OR description LIKE '%gemini%'`
    );
    
    if (allKeys.length > 0) {
      console.log('\nFound these keys:');
      allKeys.forEach(k => {
        console.log(`  #${k.id}: ${k.provider}/${k.category} - "${k.description}" (active: ${k.is_active})`);
      });
    } else {
      console.log('No keys found with "google" or "gemini" in description.');
    }
  } else {
    console.log(`Found ${keys.length} key(s):\n`);
    keys.forEach(k => {
      console.log(`ID: ${k.id}`);
      console.log(`Provider: ${k.provider}`);
      console.log(`Category: ${k.category}`);
      console.log(`Description: ${k.description || 'none'}`);
      console.log(`Active: ${k.is_active ? 'YES' : 'NO'}`);
      console.log(`Key preview: ${k.key_preview}...`);
      console.log('---');
    });
  }
  
  await conn.end();
}

check().catch(console.error);
