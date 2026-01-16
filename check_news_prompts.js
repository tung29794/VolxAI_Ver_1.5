import mysql from 'mysql2/promise';

async function checkNewsPrompts() {
  const connection = await mysql.createConnection({
    host: '103.221.221.67',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi',
    port: 3306
  });

  console.log('✅ Connected to database');
  
  // Check if ai_prompts table exists
  try {
    const [tables] = await connection.execute("SHOW TABLES LIKE 'ai_prompts'");
    
    if (tables.length === 0) {
      console.log('\n❌ Table "ai_prompts" does NOT exist in database!');
      console.log('\nThis is why the code uses fallback hardcoded prompts.');
      await connection.end();
      return;
    }
    
    console.log('\n✅ Table "ai_prompts" exists');
    
    // First check table structure
    const [columns] = await connection.execute('DESCRIBE ai_prompts');
    console.log('\n🔍 Table structure:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field} - ${col.Type}`);
    });
    
    // Check all prompts in table
    console.log('\n📋 All prompts in ai_prompts table:');
    console.log('='.repeat(80));
    const [allPrompts] = await connection.execute('SELECT * FROM ai_prompts LIMIT 20');
    
    if (allPrompts.length > 0) {
      allPrompts.forEach(p => {
        console.log(`ID: ${p.id}`);
        Object.keys(p).forEach(key => {
          if (key !== 'id') {
            const value = p[key];
            if (typeof value === 'string' && value.length > 100) {
              console.log(`  ${key}: ${value.substring(0, 100)}...`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }
        });
        console.log('-'.repeat(80));
      });
    } else {
      console.log('No prompts found in table');
    }
    
  } catch (err) {
    console.error('❌ Error querying database:', err.message);
  }
  
  await connection.end();
}

checkNewsPrompts().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
