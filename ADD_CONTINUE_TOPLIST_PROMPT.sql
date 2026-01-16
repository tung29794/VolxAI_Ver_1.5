-- =====================================================
-- ADD CONTINUE TOPLIST PROMPT TO DATABASE
-- Purpose: Add prompt template for toplist continuation
-- =====================================================

INSERT INTO ai_prompts (
  feature_name,
  display_name,
  description,
  prompt_template,
  system_prompt,
  available_variables,
  is_active,
  created_at,
  updated_at
) VALUES (
  'continue_toplist',
  'Continue Toplist Generation',
  'Prompt template for continuing toplist generation when items are incomplete or article was cut off',
  'You are continuing to write a toplist article. Here is what has been written so far:

{previous_content}

{continuation_rules}

⚠️ CRITICAL FORMAT REQUIREMENTS:

1. HTML STRUCTURE (MANDATORY):
   - Use <h2>#. Title</h2> for each numbered item (e.g., <h2>{next_item_number}. Title Here</h2>)
   - Use <p>...</p> for EVERY paragraph
   - Each item: EXACTLY {paragraphs_per_item} paragraphs (NOT MORE, NOT LESS)
   - Each paragraph: {paragraph_words}+ words
   - Line breaks between paragraphs

2. PARAGRAPH COUNT ENFORCEMENT:
   - This is {length_key} length toplist
   - MUST write EXACTLY {paragraphs_per_item} paragraphs per item
   - FORBIDDEN: Writing 3 paragraphs when config says 2
   - FORBIDDEN: Writing 1 paragraph when config says 2

3. TOPLIST CONTINUATION RULES:
   - DO NOT REWRITE items 1-{current_item_count} (they are already done)
   - ONLY write items #{next_item_number} through #{total_items}
   - Start immediately with <h2>{next_item_number}. [Item Title]</h2>
   - Maintain same style and paragraph count as previous items

4. FORBIDDEN:
   - NO Markdown (##, **, -)
   - NO code fences (```html or ```)
   - NO repeating completed items
   - NO changing paragraph count mid-article

NOW write ONLY items #{next_item_number} through #{total_items} with EXACTLY {paragraphs_per_item} paragraphs each:',
  'You are a professional toplist content writer. Continue writing the toplist article following the exact same format and paragraph count as the previous items.',
  '["previous_content", "continuation_rules", "next_item_number", "total_items", "current_item_count", "paragraphs_per_item", "paragraph_words", "length_key", "outline_reference"]',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  prompt_template = VALUES(prompt_template),
  system_prompt = VALUES(system_prompt),
  available_variables = VALUES(available_variables),
  updated_at = NOW();
