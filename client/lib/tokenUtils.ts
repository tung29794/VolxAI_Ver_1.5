/**
 * Token Utility
 * Estimate and track token usage for AI features
 */

// Token cost estimates for different AI features
export const TOKEN_COSTS = {
  // Text generation features (OpenAI)
  AI_REWRITE_SHORT: 500,        // Rewrite < 100 words
  AI_REWRITE_MEDIUM: 1000,      // Rewrite 100-300 words
  AI_REWRITE_LONG: 2000,        // Rewrite > 300 words
  GENERATE_SEO_TITLE: 300,      // Generate SEO title
  GENERATE_META_DESC: 400,      // Generate meta description
  WRITE_MORE: 1500,             // Write more content
  
  // Image search features (Serp APIs)
  FIND_IMAGE_SERP: 100,         // Find image using SerpAPI
  FIND_IMAGE_SERPER: 100,       // Find image using Serper
  FIND_IMAGE_ZENSERP: 100,      // Find image using Zenserp
  
  // Article generation features
  WRITE_ARTICLE_SHORT: 5000,    // < 500 words
  WRITE_ARTICLE_MEDIUM: 10000,  // 500-1500 words
  WRITE_ARTICLE_LONG: 20000,    // > 1500 words
};

/**
 * Estimate tokens required for text rewrite based on text length
 */
export function estimateRewriteTokens(text: string, style: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  
  // Styles that expand text require more tokens
  const expandingStyles = ['longer', 'creative', 'professional'];
  const expandMultiplier = expandingStyles.includes(style) ? 1.5 : 1;
  
  if (wordCount < 100) {
    return Math.ceil(TOKEN_COSTS.AI_REWRITE_SHORT * expandMultiplier);
  } else if (wordCount < 300) {
    return Math.ceil(TOKEN_COSTS.AI_REWRITE_MEDIUM * expandMultiplier);
  } else {
    return Math.ceil(TOKEN_COSTS.AI_REWRITE_LONG * expandMultiplier);
  }
}

/**
 * Estimate tokens for article generation based on target length
 */
export function estimateArticleTokens(targetWords: number): number {
  if (targetWords < 500) {
    return TOKEN_COSTS.WRITE_ARTICLE_SHORT;
  } else if (targetWords < 1500) {
    return TOKEN_COSTS.WRITE_ARTICLE_MEDIUM;
  } else {
    return TOKEN_COSTS.WRITE_ARTICLE_LONG;
  }
}

/**
 * Get token cost for a specific feature
 */
export function getFeatureTokenCost(featureName: string, context?: any): number {
  switch (featureName) {
    case 'GENERATE_SEO_TITLE':
      return TOKEN_COSTS.GENERATE_SEO_TITLE;
    case 'GENERATE_META_DESC':
      return TOKEN_COSTS.GENERATE_META_DESC;
    case 'WRITE_MORE':
      return TOKEN_COSTS.WRITE_MORE;
    case 'FIND_IMAGE':
      return TOKEN_COSTS.FIND_IMAGE_SERP; // Default to SerpAPI cost
    case 'AI_REWRITE':
      if (context?.text && context?.style) {
        return estimateRewriteTokens(context.text, context.style);
      }
      return TOKEN_COSTS.AI_REWRITE_MEDIUM;
    case 'WRITE_ARTICLE':
      if (context?.targetWords) {
        return estimateArticleTokens(context.targetWords);
      }
      return TOKEN_COSTS.WRITE_ARTICLE_MEDIUM;
    default:
      return 1000; // Default fallback
  }
}

/**
 * Feature name mapping for display
 */
export const FEATURE_NAMES: Record<string, string> = {
  AI_REWRITE: 'AI Rewrite',
  GENERATE_SEO_TITLE: 'AI Rewrite Tiêu đề (SEO Title)',
  GENERATE_META_DESC: 'AI Rewrite Giới thiệu ngắn',
  WRITE_MORE: 'Write More',
  FIND_IMAGE: 'Find Image',
  WRITE_ARTICLE: 'Viết bài mới',
};

/**
 * Check if user has enough tokens for a feature
 */
export function hasEnoughTokens(
  currentTokens: number,
  requiredTokens: number
): boolean {
  return currentTokens >= requiredTokens;
}

/**
 * Calculate actual tokens used from API response
 * This should be called after receiving response from OpenAI
 */
export function calculateActualTokens(apiResponse: any): number {
  // OpenAI returns usage in response
  if (apiResponse?.usage) {
    const { prompt_tokens = 0, completion_tokens = 0 } = apiResponse.usage;
    return prompt_tokens + completion_tokens;
  }
  
  // Fallback: estimate from response text length
  if (apiResponse?.choices?.[0]?.message?.content) {
    const content = apiResponse.choices[0].message.content;
    const words = content.split(/\s+/).length;
    return Math.ceil(words * 1.3); // Rough estimate: 1 word ≈ 1.3 tokens
  }
  
  return 0;
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
