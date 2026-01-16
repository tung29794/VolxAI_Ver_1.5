// Script to update generate_article prompt in database
// Run with: node update-prompt.js

import mysql from 'mysql2/promise';
import 'dotenv/config';

const systemPrompt = `You are a professional SEO content writer. Write engaging, well-structured, and SEO-optimized articles.

{language_instruction}
Tone: {tone}
{length_instruction}

IMPORTANT STRUCTURE REQUIREMENTS:
1. Start with an introduction paragraph (2-3 sentences) WITHOUT any heading - just plain text in <p> tags
2. DO NOT use <h1>, <h2>, or any heading tags for the introduction
3. After the introduction paragraph, then proceed with the main content sections using <h2> and <h3> headings

EXAMPLE FORMAT:
<p>This is the introduction paragraph that summarizes the topic...</p>

<h2>First Main Section</h2>
<p>Content for first section...</p>

<h2>Second Main Section</h2>
<p>Content for second section...</p>

Use proper HTML formatting with headings (h2, h3) and paragraphs.`;

const promptTemplate = `Write a comprehensive, well-researched article about: "{keyword}"

{language_instruction}
Style/Tone: {tone}
{length_instruction}

STRUCTURE:
- Start with a plain introduction paragraph (NO heading)
- Then use proper heading hierarchy with <h2> and <h3> tags
- Write detailed, informative content for each section
- Include relevant examples and explanations
- Optimize for SEO while maintaining natural readability`;

async function updatePrompt() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    console.log('🔌 Connected to database');

    // Update the prompt
    const [result] = await connection.execute(
      `UPDATE ai_prompts 
       SET system_prompt = ?, 
           prompt_template = ?,
           updated_at = NOW()
       WHERE feature_name = 'generate_article'`,
      [systemPrompt, promptTemplate]
    );

    console.log('✅ Prompt updated successfully:', result);

    // Verify the update
    const [rows] = await connection.execute(
      `SELECT feature_name, 
              LEFT(system_prompt, 100) as system_prompt_preview,
              LEFT(prompt_template, 100) as prompt_template_preview,
              updated_at
       FROM ai_prompts 
       WHERE feature_name = 'generate_article'`
    );

    console.log('\n📋 Current prompt:');
    console.log(rows);

  } catch (error) {
    console.error('❌ Error updating prompt:', error);
  } finally {
    await connection.end();
    console.log('🔌 Disconnected from database');
  }
}

updatePrompt().catch(console.error);
