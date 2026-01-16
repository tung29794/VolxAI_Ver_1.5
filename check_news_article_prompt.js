import mysql from 'mysql2/promise';

async function checkNewsArticlePrompt() {
  const connection = await mysql.createConnection({
    host: '103.221.221.67',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi',
    port: 3306
  });

  console.log('✅ Connected to database');
  
  try {
    // Get the actual news article prompt
    const [rows] = await connection.execute(
      'SELECT * FROM ai_prompts WHERE feature_name = ?',
      ['generate_news_article']
    );
    
    if (rows.length > 0) {
      const prompt = rows[0];
      console.log('\n📋 generate_news_article Prompt Details:');
      console.log('='.repeat(80));
      console.log(`ID: ${prompt.id}`);
      console.log(`Feature: ${prompt.feature_name}`);
      console.log(`Display Name: ${prompt.display_name}`);
      console.log(`Active: ${prompt.is_active}`);
      console.log(`Updated: ${prompt.updated_at}`);
      console.log('\n🔍 PROMPT TEMPLATE:');
      console.log('='.repeat(80));
      console.log(prompt.prompt_template);
      console.log('\n🔍 SYSTEM PROMPT:');
      console.log('='.repeat(80));
      console.log(prompt.system_prompt);
      console.log('\n🔍 AVAILABLE VARIABLES:');
      console.log('='.repeat(80));
      console.log(prompt.available_variables);
    } else {
      console.log('❌ Prompt not found');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  await connection.end();
}

checkNewsArticlePrompt().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
