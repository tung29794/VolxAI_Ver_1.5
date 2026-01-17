/**
 * Token Management Utilities for Backend
 * Handle token checking, deduction, and tracking
 */

import { query, execute, queryOne } from "../db";

// Token cost estimates (should match frontend)
export const TOKEN_COSTS = {
  AI_REWRITE_SHORT: 500,
  AI_REWRITE_MEDIUM: 1000,
  AI_REWRITE_LONG: 2000,
  GENERATE_SEO_TITLE: 300,
  GENERATE_META_DESC: 400,
  WRITE_MORE: 1500,
  FIND_IMAGE_SERP: 200, // Updated from 100 to 200
  WRITE_ARTICLE_SHORT: 5000,
  WRITE_ARTICLE_MEDIUM: 10000,
  WRITE_ARTICLE_LONG: 20000,
  GENERATE_OUTLINE: 1000, // Generate outline for articles
  GENERATE_TOPLIST_OUTLINE: 1000, // Generate toplist outline
  GENERATE_TOPLIST_SHORT: 5000, // Generate short toplist article
  GENERATE_TOPLIST_MEDIUM: 10000, // Generate medium toplist article
  GENERATE_TOPLIST_LONG: 20000, // Generate long toplist article
};

/**
 * Get user's current token balance
 */
export async function getUserTokenBalance(userId: number): Promise<number> {
  try {
    // Get user's actual remaining tokens and subscription limit
    const result = await queryOne<any>(
      `SELECT 
        u.tokens_remaining,
        COALESCE(
          (SELECT tokens_limit FROM user_subscriptions WHERE user_id = u.id AND is_active = 1 LIMIT 1),
          0
        ) as tokens_limit,
        (SELECT expires_at FROM user_subscriptions WHERE user_id = u.id AND is_active = 1 LIMIT 1) as expires_at
      FROM users u
      WHERE u.id = ?`,
      [userId]
    );
    
    if (!result) return 0;
    
    // Check if subscription has expired
    if (result.expires_at) {
      const expirationDate = new Date(result.expires_at);
      const now = new Date();
      
      if (now > expirationDate) {
        // Subscription expired - auto-downgrade to free plan
        // Reset to free plan limits
        await execute(
          "UPDATE user_subscriptions SET plan_type = ?, tokens_limit = ?, articles_limit = ?, expires_at = NULL WHERE user_id = ? AND is_active = 1",
          ["free", 10000, 2, userId]
        );
        
        // Also update users table
        await execute(
          "UPDATE users SET tokens_remaining = ?, article_limit = ? WHERE id = ?",
          [10000, 2, userId]
        );
        
        return 10000; // Return free plan tokens
      }
    }
    
    // If tokens_remaining is NULL or 0, use tokens_limit from subscription
    // This handles the case where user just upgraded and tokens_remaining hasn't been initialized
    if (result.tokens_remaining === null || result.tokens_remaining === 0) {
      // Initialize tokens_remaining with tokens_limit
      if (result.tokens_limit > 0) {
        await execute(
          "UPDATE users SET tokens_remaining = ? WHERE id = ?",
          [result.tokens_limit, userId]
        );
        return result.tokens_limit;
      }
      return 0;
    }
    
    return result.tokens_remaining || 0;
  } catch (error) {
    console.error("Error getting user token balance:", error);
    return 0;
  }
}

/**
 * Check if user has enough tokens
 */
export async function hasEnoughTokens(
  userId: number,
  requiredTokens: number
): Promise<boolean> {
  const balance = await getUserTokenBalance(userId);
  return balance >= requiredTokens;
}

/**
 * Deduct tokens from user account
 */
export async function deductTokens(
  userId: number,
  tokensUsed: number,
  featureName: string
): Promise<{ success: boolean; remainingTokens: number; error?: string }> {
  try {
    // First, check current balance
    const currentBalance = await getUserTokenBalance(userId);

    if (currentBalance < tokensUsed) {
      return {
        success: false,
        remainingTokens: currentBalance,
        error: "Insufficient tokens",
      };
    }

    // Deduct tokens
    await execute(
      "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
      [tokensUsed, userId]
    );

    // Log the usage
    await logTokenUsage(userId, tokensUsed, featureName);

    const newBalance = currentBalance - tokensUsed;

    return {
      success: true,
      remainingTokens: newBalance,
    };
  } catch (error) {
    console.error("Error deducting tokens:", error);
    return {
      success: false,
      remainingTokens: 0,
      error: "Failed to deduct tokens",
    };
  }
}

/**
 * Log token usage for analytics and tracking
 * Uses token_usage_history table with columns: id, user_id, article_id, tokens_used, action, created_at
 */
export async function logTokenUsage(
  userId: number,
  tokensUsed: number,
  featureName: string,
  articleId?: number
): Promise<void> {
  try {
    await execute(
      `INSERT INTO token_usage_history 
       (user_id, article_id, tokens_used, action, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, articleId || null, tokensUsed, featureName]
    );
  } catch (error) {
    // Don't throw - logging failure shouldn't stop the feature
    console.error("Error logging token usage:", error);
  }
}

/**
 * Estimate tokens for rewrite based on text length
 * Uses word-based calculation from database
 */
export async function estimateRewriteTokens(text: string, style: string): Promise<number> {
  const { calculateTokens } = await import('./tokenCalculator');
  
  // Expanding styles produce more output (multiply by 1.5x)
  const expandingStyles = ["longer", "creative", "professional"];
  const outputText = expandingStyles.includes(style) 
    ? text + " ".repeat(Math.floor(text.length * 0.5)) // Simulate 50% expansion
    : text;

  // Calculate using word-based system (no model, so default 1.0x multiplier)
  return calculateTokens(outputText, 'ai_rewrite_text', false);
}

/**
 * Calculate actual tokens used from OpenAI API response
 */
export function calculateActualTokens(apiResponse: any): number {
  if (apiResponse?.usage) {
    const { prompt_tokens = 0, completion_tokens = 0 } = apiResponse.usage;
    return prompt_tokens + completion_tokens;
  }

  // Fallback estimate
  if (apiResponse?.choices?.[0]?.message?.content) {
    const content = apiResponse.choices[0].message.content;
    const words = content.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  return 0;
}

/**
 * Token check middleware
 * Use before AI API calls to ensure user has enough tokens
 */
export async function checkTokensMiddleware(
  userId: number,
  requiredTokens: number,
  featureName: string
): Promise<{ allowed: boolean; remainingTokens: number; error?: string }> {
  try {
    const balance = await getUserTokenBalance(userId);

    if (balance < requiredTokens) {
      return {
        allowed: false,
        remainingTokens: balance,
        error: `Insufficient tokens. Required: ${requiredTokens}, Available: ${balance}`,
      };
    }

    return {
      allowed: true,
      remainingTokens: balance,
    };
  } catch (error) {
    console.error("Error in token check middleware:", error);
    return {
      allowed: false,
      remainingTokens: 0,
      error: "Failed to check token balance",
    };
  }
}
