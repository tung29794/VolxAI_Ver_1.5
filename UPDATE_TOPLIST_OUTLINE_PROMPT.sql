-- Update prompt cho generate_toplist_outline để FORCE đúng số mục
UPDATE ai_prompts 
SET prompt_template = 'Create a detailed toplist outline for: "{keyword}"

CRITICAL REQUIREMENTS - MUST FOLLOW EXACTLY:
1. You MUST create EXACTLY {item_count} numbered items (not more, not less)
2. Each item MUST be numbered from 1 to {item_count}
3. If the keyword cannot support {item_count} items, create related sub-topics to reach exactly {item_count} items

ARTICLE STRUCTURE (MANDATORY):
- [intro] Introduction paragraph (no heading)
- [h2] 1. [First Item Title]
- [h3] [Subsection 1.1 if needed]
- [h3] [Subsection 1.2 if needed]
- [h2] 2. [Second Item Title]
- [h3] [Subsection 2.1 if needed]
- [h3] [Subsection 2.2 if needed]
- ... (CONTINUE UNTIL ITEM {item_count})
- [h2] {item_count}. [Last Item Title]
- [h3] [Subsection if needed]
- [h2] Kết luận / Conclusion

OUTLINE FORMAT RULES:
✅ Start with [intro] for introduction
✅ Use [h2] for each numbered item (1, 2, 3... up to {item_count})
✅ Use [h3] for subsections (each item can have {h3_per_h2} subsections)
✅ End with [h2] Kết luận

REQUIREMENTS:
- Language: {language}
- Tone: {tone}
- Number of items: {item_count} (EXACTLY - NO MORE, NO LESS)
- Each item should be a substantial point with descriptive title
- Items should follow a logical order or ranking
- Use engaging, click-worthy headings
- Each [h2] can have up to {h3_per_h2} [h3] subsections if needed

EXAMPLE for {item_count} = 5:
[intro] Brief introduction about the topic
[h2] 1. First Main Point
[h3] Detail about first point
[h2] 2. Second Main Point
[h3] Detail about second point
[h2] 3. Third Main Point
[h3] Detail about third point
[h2] 4. Fourth Main Point
[h3] Detail about fourth point
[h2] 5. Fifth Main Point
[h3] Detail about fifth point
[h2] Kết luận

REMEMBER: You MUST create EXACTLY {item_count} numbered items. Count them before submitting!',
updated_at = NOW()
WHERE feature_name = 'generate_toplist_outline';

-- Verify update
SELECT 
  id, 
  feature_name, 
  LEFT(prompt_template, 200) as preview,
  updated_at
FROM ai_prompts 
WHERE feature_name = 'generate_toplist_outline';
