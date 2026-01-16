import { buildApiUrl } from "./api";

/**
 * Get token cost for a specific AI feature
 */
export async function getTokenCost(featureKey: string): Promise<number> {
  try {
    const response = await fetch(
      buildApiUrl(`/api/admin/token-costs/feature/${featureKey}`)
    );
    
    if (!response.ok) {
      console.error(`Failed to get token cost for ${featureKey}`);
      return getDefaultTokenCost(featureKey);
    }

    const data = await response.json();
    return data.data?.token_cost || getDefaultTokenCost(featureKey);
  } catch (error) {
    console.error(`Error getting token cost for ${featureKey}:`, error);
    return getDefaultTokenCost(featureKey);
  }
}

/**
 * Default token costs (fallback)
 */
function getDefaultTokenCost(featureKey: string): number {
  const defaults: Record<string, number> = {
    generate_article: 15000,
    generate_toplist: 18000,
    generate_news: 20000,
    continue_article: 5000,
    generate_seo_title: 500,
    generate_article_title: 500,
    generate_meta_description: 800,
    ai_rewrite_text: 300,
    find_image: 100,
    write_more: 1000,
  };

  return defaults[featureKey] || 1000;
}

/**
 * Check if user can create a new article (based on monthly limit)
 */
export async function canUserCreateArticle(authToken: string): Promise<{
  canCreate: boolean;
  articlesUsed: number;
  articlesLimit: number;
  message?: string;
}> {
  try {
    const response = await fetch(buildApiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      return {
        canCreate: false,
        articlesUsed: 0,
        articlesLimit: 0,
        message: "Không thể xác thực người dùng",
      };
    }

    const data = await response.json();
    if (!data.success || !data.subscription) {
      return {
        canCreate: false,
        articlesUsed: 0,
        articlesLimit: 0,
        message: "Không tìm thấy thông tin gói dịch vụ",
      };
    }

    const subscription = data.subscription;
    const articlesUsed = subscription.articles_used_this_month || 0;
    const articlesLimit = subscription.articles_limit || 2;

    // Check if need to reset (more than 30 days since last reset)
    if (subscription.last_article_reset_date) {
      const lastReset = new Date(subscription.last_article_reset_date);
      const daysSinceReset = Math.floor(
        (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If more than 30 days, the count will be reset on next article creation
      if (daysSinceReset >= 30) {
        return {
          canCreate: true,
          articlesUsed: 0,
          articlesLimit,
          message: "Chu kỳ mới, số bài viết đã được reset",
        };
      }
    }

    if (articlesUsed >= articlesLimit) {
      return {
        canCreate: false,
        articlesUsed,
        articlesLimit,
        message: `Bạn đã sử dụng hết ${articlesLimit} bài viết trong tháng này. Vui lòng nâng cấp gói để tiếp tục tạo bài.`,
      };
    }

    return {
      canCreate: true,
      articlesUsed,
      articlesLimit,
    };
  } catch (error) {
    console.error("Error checking article limit:", error);
    return {
      canCreate: false,
      articlesUsed: 0,
      articlesLimit: 0,
      message: "Có lỗi xảy ra khi kiểm tra giới hạn bài viết",
    };
  }
}

/**
 * Feature keys for token cost lookup
 */
export const FEATURE_KEYS = {
  GENERATE_ARTICLE: "generate_article",
  GENERATE_TOPLIST: "generate_toplist",
  GENERATE_NEWS: "generate_news",
  CONTINUE_ARTICLE: "continue_article",
  GENERATE_SEO_TITLE: "generate_seo_title",
  GENERATE_ARTICLE_TITLE: "generate_article_title",
  GENERATE_META_DESCRIPTION: "generate_meta_description",
  AI_REWRITE_TEXT: "ai_rewrite_text",
  FIND_IMAGE: "find_image",
  WRITE_MORE: "write_more",
} as const;
