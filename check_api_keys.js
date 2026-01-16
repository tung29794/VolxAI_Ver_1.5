import mysql from 'mysql2/promise';

async function checkApiKeys() {
  const connection = await mysql.createConnection({
    host: '103.221.221.67',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi',
    port: 3306
  });

  console.log('✅ Connected to database');
  
  // First, check table structure
  const [columns] = await connection.execute('DESCRIBE api_keys');
  console.log('\n🔍 Table structure:');
  console.log('='.repeat(80));
  columns.forEach(col => {
    console.log(`${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
  });
  
  const [rows] = await connection.execute('SELECT * FROM api_keys');
  
  console.log('\n📋 API Keys in database:');
  console.log('='.repeat(80));
  rows.forEach(row => {
    console.log(`ID: ${row.id}`);
    console.log(`Provider: ${row.provider}`);
    console.log(`Category: ${row.category || 'NULL'}`);
    console.log(`Key: ${row.api_key ? row.api_key.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`User ID: ${row.user_id}`);
    console.log(`Is Active: ${row.is_active}`);
    console.log(`Created: ${row.created_at}`);
    console.log('-'.repeat(80));
  });
  
  console.log(`\nTotal: ${rows.length} API keys found`);
  
  await connection.end();
}

checkApiKeys().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
