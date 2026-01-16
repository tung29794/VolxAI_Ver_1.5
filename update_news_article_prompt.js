import mysql from 'mysql2/promise';

async function updateNewsArticlePrompt() {
  const connection = await mysql.createConnection({
    host: '103.221.221.67',
    user: 'jybcaorr_lisaaccountcontentapi',
    password: 'ISlc)_+hKk+g2.m^',
    database: 'jybcaorr_lisacontentdbapi',
    port: 3306
  });

  console.log('✅ Connected to database');
  
  try {
    const newPromptTemplate = `You are a professional news writer. Write a comprehensive news article based on the following sources about "{keyword}".

News sources to aggregate:
{news_context}

Requirements:
1. Write in {language}
2. Combine information from multiple sources
3. Use journalistic inverted pyramid style (most important info first)
4. Include key facts: who, what, when, where, why, how
5. Attribute information to sources when relevant
6. Be objective and factual
7. Use proper HTML formatting: <h2> for sections, <p> for paragraphs, <strong> for emphasis
8. Each paragraph must be wrapped in <p></p> tags with proper spacing
9. Minimum 800 words
10. Do NOT copy directly - rewrite and synthesize information
11. CRITICAL: Do NOT include the article title "{article_title}" in the content body
12. Do NOT use <h1> tags anywhere. Only use <h2> and <h3> for section headings
13. Ensure proper spacing between paragraphs and sections
14. Each <p> tag should contain complete sentences with proper punctuation
{website_knowledge}

Article title: {article_title}

Write the complete article content now (WITHOUT repeating the title at the beginning):`;

    const newSystemPrompt = `You are a professional news writer with expertise in creating objective, well-researched, and engaging news articles. 

CRITICAL RULES:
- You NEVER include the article title in the content body
- You NEVER use <h1> tags (title is separate from content)
- You ALWAYS wrap each paragraph in proper <p></p> tags
- You ALWAYS ensure proper spacing between elements
- You prioritize accuracy, clarity, and journalistic standards
- You excel at synthesizing information from multiple sources into cohesive narratives

Your content must be properly formatted HTML that can be directly inserted into an article editor.`;

    // Update the prompt
    const [result] = await connection.execute(
      `UPDATE ai_prompts 
       SET prompt_template = ?, 
           system_prompt = ?,
           updated_at = NOW()
       WHERE feature_name = ?`,
      [newPromptTemplate, newSystemPrompt, 'generate_news_article']
    );
    
    console.log('\n✅ Successfully updated generate_news_article prompt');
    console.log(`Rows affected: ${result.affectedRows}`);
    
    // Verify the update
    const [verify] = await connection.execute(
      'SELECT feature_name, updated_at FROM ai_prompts WHERE feature_name = ?',
      ['generate_news_article']
    );
    
    console.log('\n🔍 Verification:');
    console.log(`Feature: ${verify[0].feature_name}`);
    console.log(`Updated at: ${verify[0].updated_at}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  await connection.end();
}

updateNewsArticlePrompt().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
