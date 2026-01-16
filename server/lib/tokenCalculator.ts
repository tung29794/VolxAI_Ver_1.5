/**
 * Token Calculator - Calculate actual tokens based on word count
 * 
 * This module handles dynamic token calculation based on:
 * - Word count of generated content
 * - Token cost per 1000 words from database
 * 
 * Formula: actualTokens = (wordCount / 1000) * tokenCostPer1000Words
 */

import { queryOne } from "../db";

/**
 * Count words in text content (supports both plain text and HTML)
 */
export function countWords(content: string): number {
  if (!content) return 0;
  
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, ' ');
  
  // Remove extra whitespace and split by spaces
  const words = plainText
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);
  
  return words.length;
}

/**
 * Get token cost per 1000 words from database
 * @param featureKey - Feature identifier (e.g., 'generate_article', 'ai_rewrite_text')
 * @returns Token cost per 1000 words, or default value if not found
 */
export async function getTokenCostPer1000Words(featureKey: string): Promise<number> {
  try {
    const result = await queryOne<any>(
      `SELECT token_cost 
       FROM ai_feature_token_costs 
       WHERE feature_key = ? AND is_active = TRUE`,
      [featureKey]
    );
    
    if (result && result.token_cost) {
      return result.token_cost;
    }
    
    // Fallback defaults (tokens per 1000 words)
    const defaults: Record<string, number> = {
      'generate_article': 15,
      'generate_toplist': 18,
      'generate_news': 20,
      'continue_article': 5,
      'ai_rewrite_text': 10,
      'write_more': 8,
      // Fixed cost features (not word-based)
      'generate_seo_title': 500,
      'generate_article_title': 500,
      'generate_meta_description': 800,
      'find_image': 100,
    };
    
    return defaults[featureKey] || 10; // Default 10 tokens/1000 words
  } catch (error) {
    console.error(`Error fetching token cost for ${featureKey}:`, error);
    return 10; // Safe fallback
  }
}

/**
 * Get cost multiplier from AI model
 * @param modelId - Model ID from ai_models table (e.g., 'gpt-3.5-turbo', 'gemini-2.5-flash')
 * @returns Cost multiplier (default 1.0 if not found)
 */
export async function getCostMultiplier(modelId?: string): Promise<number> {
  if (!modelId) {
    return 1.0; // No multiplier if model not specified
  }

  try {
    const result = await queryOne<any>(
      `SELECT cost_multiplier 
       FROM ai_models 
       WHERE model_id = ? AND is_active = TRUE`,
      [modelId]
    );
    
    if (result && result.cost_multiplier) {
      return parseFloat(result.cost_multiplier);
    }
    
    console.log(`⚠️ Cost multiplier not found for model: ${modelId}, using 1.0`);
    return 1.0; // Default multiplier
  } catch (error) {
    console.error(`Error fetching cost multiplier for model ${modelId}:`, error);
    return 1.0; // Safe fallback
  }
}

/**
 * Calculate actual tokens based on word count and feature
 * 
 * @param content - The generated content (can be HTML or plain text)
 * @param featureKey - Feature identifier (e.g., 'generate_article')
 * @param isFixedCost - Whether this feature has fixed cost (not word-based)
 * @param modelId - Optional model ID to apply cost multiplier (e.g., 'gemini-2.5-flash')
 * @returns Actual tokens to deduct
 * 
 * @example
 * // Article with 2000 words, generate_article costs 15 tokens/1000 words, no model multiplier
 * const tokens = await calculateTokens(content, 'generate_article');
 * // Result: (2000 / 1000) * 15 * 1.0 = 30 tokens
 * 
 * @example
 * // Article with 2000 words, Gemini 2.5 Flash with 3.00x multiplier
 * const tokens = await calculateTokens(content, 'generate_article', false, 'gemini-2.5-flash');
 * // Result: (2000 / 1000) * 15 * 3.00 = 90 tokens
 * 
 * @example
 * // SEO title generation (fixed cost)
 * const tokens = await calculateTokens('', 'generate_seo_title', true);
 * // Result: 500 tokens (fixed, no multiplier for fixed costs)
 */
export async function calculateTokens(
  content: string,
  featureKey: string,
  isFixedCost: boolean = false,
  modelId?: string
): Promise<number> {
  // Get token cost from database
  const tokenCostPer1000Words = await getTokenCostPer1000Words(featureKey);
  
  // If fixed cost (SEO title, find image, etc.), return as-is (NO multiplier for fixed costs)
  if (isFixedCost) {
    console.log(`📊 Token Calculation for ${featureKey} (FIXED COST):`);
    console.log(`   - Fixed Cost: ${tokenCostPer1000Words} tokens`);
    return tokenCostPer1000Words;
  }
  
  // Get cost multiplier from model (if specified)
  const costMultiplier = await getCostMultiplier(modelId);
  
  // Calculate based on word count
  const wordCount = countWords(content);
  const baseTokens = (wordCount / 1000) * tokenCostPer1000Words;
  const actualTokens = Math.ceil(baseTokens * costMultiplier);
  
  console.log(`📊 Token Calculation for ${featureKey}:`);
  console.log(`   - Word Count: ${wordCount}`);
  console.log(`   - Token Cost: ${tokenCostPer1000Words} tokens/1000 words`);
  console.log(`   - Model: ${modelId || 'default'}`);
  console.log(`   - Cost Multiplier: ${costMultiplier}x`);
  console.log(`   - Base Tokens: ${Math.ceil(baseTokens)}`);
  console.log(`   - Actual Tokens (with multiplier): ${actualTokens}`);
  
  return actualTokens;
}

/**
 * Calculate tokens for multiple contents (e.g., outline + paragraphs)
 * 
 * @param contents - Array of content strings
 * @param featureKey - Feature identifier
 * @param modelId - Optional model ID to apply cost multiplier
 * @returns Total tokens for all contents
 */
export async function calculateTokensForMultipleContents(
  contents: string[],
  featureKey: string,
  modelId?: string
): Promise<number> {
  const tokenCostPer1000Words = await getTokenCostPer1000Words(featureKey);
  const costMultiplier = await getCostMultiplier(modelId);
  
  const totalWordCount = contents.reduce((sum, content) => {
    return sum + countWords(content);
  }, 0);
  
  const baseTokens = (totalWordCount / 1000) * tokenCostPer1000Words;
  const actualTokens = Math.ceil(baseTokens * costMultiplier);
  
  console.log(`📊 Multi-Content Token Calculation for ${featureKey}:`);
  console.log(`   - Total Word Count: ${totalWordCount}`);
  console.log(`   - Token Cost: ${tokenCostPer1000Words} tokens/1000 words`);
  console.log(`   - Model: ${modelId || 'default'}`);
  console.log(`   - Cost Multiplier: ${costMultiplier}x`);
  console.log(`   - Actual Tokens: ${actualTokens}`);
  
  return actualTokens;
}

/**
 * Estimate tokens before generation (for pre-check)
 * Based on expected word count
 * 
 * @param expectedWords - Estimated number of words to generate
 * @param featureKey - Feature identifier
 * @param modelId - Optional model ID to apply cost multiplier
 * @returns Estimated tokens
 */
export async function estimateTokens(
  expectedWords: number,
  featureKey: string,
  modelId?: string
): Promise<number> {
  const tokenCostPer1000Words = await getTokenCostPer1000Words(featureKey);
  const costMultiplier = await getCostMultiplier(modelId);
  return Math.ceil((expectedWords / 1000) * tokenCostPer1000Words * costMultiplier);
}

/**
 * Features that use fixed token cost (not word-based)
 */
export const FIXED_COST_FEATURES = [
  'generate_seo_title',
  'generate_article_title', 
  'generate_meta_description',
  'find_image'
];

/**
 * Check if a feature uses fixed token cost
 */
export function isFixedCostFeature(featureKey: string): boolean {
  return FIXED_COST_FEATURES.includes(featureKey);
}
