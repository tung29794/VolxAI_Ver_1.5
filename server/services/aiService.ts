/**
 * AI Service - Shared business logic for AI operations
 * Used by both API routes (SSE) and batch job workers (direct calls)
 */

import { query, queryOne, execute } from "../db";
import { getSystemPrompt } from "../config/systemPrompts";
import {
  checkTokensMiddleware,
  deductTokens,
  calculateActualTokens,
  TOKEN_COSTS,
} from "../lib/tokenManager";

// ===== HELPER FUNCTIONS (copied from ai.ts) =====

interface AIPromptTemplate {
  prompt_template: string;
  system_prompt: string;
  available_variables?: string[];
}

/**
 * Load AI prompt from database by feature name
 */
async function loadPrompt(featureName: string): Promise<AIPromptTemplate | null> {
  try {
    const prompt = await queryOne<any>(
      `SELECT prompt_template, system_prompt, available_variables
       FROM ai_prompts
       WHERE feature_name = ? AND is_active = TRUE`,
      [featureName]
    );

    if (prompt) {
      return {
        prompt_template: prompt.prompt_template,
        system_prompt: prompt.system_prompt,
        available_variables: prompt.available_variables
          ? JSON.parse(prompt.available_variables)
          : [],
      };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error loading prompt for ${featureName}:`, error);
    return null;
  }
}

/**
 * Replace variables in prompt template
 */
function interpolatePrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * Inject website knowledge into system prompt
 */
function injectWebsiteKnowledge(basePrompt: string, knowledge: string): string {
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 WEBSITE KNOWLEDGE & GUIDELINES (ABSOLUTE TOP PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${basePrompt}`;
}

interface OutlineResult {
  success: boolean;
  outline?: string;
  tokensUsed?: number;
  error?: string;
}

interface ArticleResult {
  success: boolean;
  content?: string;
  tokensUsed?: number;
  error?: string;
}

interface GenerateOutlineOptions {
  keyword: string;
  language: string;
  length: string; // short, medium, long
  tone: string;
  model: string; // GPT 4, GPT 5, etc.
  userId: number;
}

/**
 * Universal AI API caller - supports both OpenAI and Google AI (Gemini)
 */
async function callAI(
  provider: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<{ success: boolean; content?: string; error?: string; tokensUsed?: number }> {
  try {
    console.log(`🔵 [callAI] Starting AI call...`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Model: ${model}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`   Max Tokens: ${maxTokens}`);
    console.log(`   Temperature: ${temperature}`);
    
    if (provider === "google-ai") {
      // Call Google AI (Gemini)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`🟢 [callAI] Calling Google AI API...`);
      console.log(`   URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
      
      const requestBody = {
        contents: [
          {
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      };
      console.log(`   Request body:`, JSON.stringify(requestBody, null, 2).substring(0, 500));
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(`   Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ [callAI] Google AI API error:", JSON.stringify(errorData, null, 2));
        return {
          success: false,
          error: `Google AI API error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      console.log(`   Response data:`, JSON.stringify(data, null, 2).substring(0, 500));
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!content) {
        console.error("❌ [callAI] No content generated from Google AI");
        console.error("   Full response:", JSON.stringify(data, null, 2));
        return {
          success: false,
          error: "No content generated from Google AI",
        };
      }

      // Gemini doesn't provide token usage in same format, estimate
      const tokensUsed = Math.ceil(content.length / 4);

      console.log(`✅ [callAI] Google AI success! Generated ${content.length} chars, ~${tokensUsed} tokens`);

      return {
        success: true,
        content: content.trim(),
        tokensUsed: tokensUsed,
      };
    } else {
      // Call OpenAI
      console.log(`🟡 [callAI] Calling OpenAI API...`);
      
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temperature,
            max_tokens: maxTokens,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`,
        };
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || "";

      if (!content) {
        return {
          success: false,
          error: "No content generated from OpenAI",
        };
      }

      const tokensUsed = calculateActualTokens(data);

      return {
        success: true,
        content: content,
        tokensUsed: tokensUsed,
      };
    }
  } catch (error: any) {
    console.error(`[callAI] Error calling ${provider}:`, error);
    return {
      success: false,
      error: error.message || "Internal error calling AI API",
    };
  }
}

interface GenerateArticleOptions {
  keyword: string;
  language: string;
  outlineType: string; // no-outline, ai-outline, your-outline
  customOutline?: string;
  tone: string;
  model: string;
  length: string;
  userId: number;
  // SEO Options
  internalLinks?: string;
  endContent?: string;
  boldKeywords?: {
    mainKeyword?: boolean;
    headings?: boolean;
  };
  // Auto insert images
  autoInsertImages?: boolean;
  maxImages?: number;
  // Google Search Knowledge
  useGoogleSearch?: boolean;
  // Website Knowledge
  websiteId?: string;
}

/**
 * Get API key and configuration for a specific model
 */
async function getApiKeyForModel(
  model: string,
  useGoogleSearch: boolean = false
): Promise<{ apiKey: string; provider: string; actualModel: string } | null> {
  console.log(`🔍 [getApiKeyForModel] Looking up model: "${model}", useGoogleSearch: ${useGoogleSearch}`);
  
  // If useGoogleSearch is true, force use Google AI (Gemini)
  if (useGoogleSearch) {
    console.log(`   Force using Google AI for search`);
    const googleKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`
    );

    if (googleKeys.length === 0) {
      console.error(`❌ [getApiKeyForModel] No Google AI API key found`);
      return null;
    }

    console.log(`✅ [getApiKeyForModel] Found Google AI key, using gemini-2.0-flash-exp`);
    return {
      apiKey: googleKeys[0].api_key,
      provider: "google-ai",
      actualModel: "gemini-2.0-flash-exp", // Use latest Gemini model with search
    };
  }

  // Query model info from database
  console.log(`   Querying ai_models table for model: "${model}"`);
  const modelInfo = await query<any>(
    `SELECT model_name, provider FROM ai_models WHERE model_name = ? AND is_active = TRUE LIMIT 1`,
    [model]
  );

  if (modelInfo.length === 0) {
    console.error(`❌ [getApiKeyForModel] Model "${model}" not found in database`);
    console.error(`   This model may not exist in ai_models table or is inactive`);
    return null;
  }

  const { model_name, provider } = modelInfo[0];
  console.log(`   Found model in DB: model_name="${model_name}", provider="${provider}"`);

  // Get API key for this provider
  console.log(`   Querying api_keys for provider: "${provider}"`);
  const apiKeys = await query<any>(
    `SELECT api_key FROM api_keys
     WHERE provider = ? AND category = 'content' AND is_active = TRUE
     LIMIT 1`,
    [provider]
  );

  if (apiKeys.length === 0) {
    console.error(`❌ [getApiKeyForModel] No API key found for provider "${provider}"`);
    console.error(`   Check api_keys table for active key with this provider`);
    return null;
  }

  console.log(`✅ [getApiKeyForModel] Found API key for provider "${provider}"`);
  console.log(`   Returning: provider="${provider}", actualModel="${model_name}", apiKey=${apiKeys[0].api_key.substring(0, 10)}...`);

  return {
    apiKey: apiKeys[0].api_key,
    provider: provider,
    actualModel: model_name,
  };
}

// Legacy function kept for backward compatibility - deprecated
async function getApiKeyForModelLegacy(
  model: string,
  useGoogleSearch: boolean = false
): Promise<{ apiKey: string; provider: string; actualModel: string } | null> {
  // If useGoogleSearch is true, force use Google AI (Gemini)
  if (useGoogleSearch) {
    const googleKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`
    );

    if (googleKeys.length === 0) {
      return null;
    }

    return {
      apiKey: googleKeys[0].api_key,
      provider: "google-ai",
      actualModel: "gemini-2.0-flash-exp", // Use latest Gemini model with search
    };
  }

  // Check if model is Gemini
  if (model.toLowerCase().includes("gemini")) {
    const googleKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`
    );

    if (googleKeys.length === 0) {
      return null;
    }

    let actualModel = "gemini-2.0-flash-exp"; // Default
    if (model.includes("1.5")) {
      actualModel = "gemini-1.5-flash";
    } else if (model.includes("2.0")) {
      actualModel = "gemini-2.0-flash-exp";
    }

    return {
      apiKey: googleKeys[0].api_key,
      provider: "google-ai",
      actualModel,
    };
  }

  // Otherwise use OpenAI
  const openaiKeys = await query<any>(
    `SELECT api_key FROM api_keys
     WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
     LIMIT 1`
  );

  if (openaiKeys.length === 0) {
    return null;
  }

  const actualModel = model === "GPT 5" ? "gpt-4-turbo" : "gpt-3.5-turbo";

  return {
    apiKey: openaiKeys[0].api_key,
    provider: "openai",
    actualModel,
  };
}

/**
 * Generate outline for a keyword
 * This is a simplified version without SSE - for batch job workers
 */
export async function generateOutline(
  options: GenerateOutlineOptions
): Promise<OutlineResult> {
  try {
    const { keyword, language, length, tone, model, userId } = options;

    console.log(`🎯 [AIService] Generating outline for: "${keyword}"`);

    // Estimate required tokens
    const estimatedTokens = 1000;

    // Check if user has enough tokens
    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "GENERATE_OUTLINE"
    );

    if (!tokenCheck.allowed) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${estimatedTokens}, Available: ${tokenCheck.remainingTokens || 0}`,
      };
    }

    // Get API key
    const modelConfig = await getApiKeyForModel(model, false);
    if (!modelConfig) {
      return {
        success: false,
        error: "API key not configured",
      };
    }

    const { apiKey, provider, actualModel } = modelConfig;

    // Determine outline config based on length
    const outlineConfig: Record<
      string,
      { h2Count: number; h3PerH2: number; description: string }
    > = {
      short: {
        h2Count: 4,
        h3PerH2: 2,
        description: "1,500-2,000 words - concise structure",
      },
      medium: {
        h2Count: 5,
        h3PerH2: 3,
        description: "2,000-2,500 words - balanced structure",
      },
      long: {
        h2Count: 7,
        h3PerH2: 4,
        description: "3,000-4,000 words - comprehensive structure",
      },
    };

    const config = outlineConfig[length.toLowerCase()] || outlineConfig.medium;
    const languageName = language === "vi" ? "Vietnamese" : language;

    // Get system and user prompts
    const systemPrompt = getSystemPrompt("generate_outline");
    const promptTemplate = await loadPrompt("generate_outline");

    let userPrompt = "";
    if (promptTemplate) {
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language: languageName,
        length_description: config.description,
        tone: tone,
        h2_count: config.h2Count.toString(),
        h3_per_h2: config.h3PerH2.toString(),
      });
    } else {
      // Fallback hardcoded prompt
      userPrompt = `Create a detailed article outline about: "${keyword}"

REQUIREMENTS:
- Language: ${languageName}
- Article length: ${config.description}
- Tone/Style: ${tone}
- Total H2 sections: ${config.h2Count}
- H3 subsections per H2: ${config.h3PerH2}

OUTPUT FORMAT (CRITICAL):
Output ONLY the outline structure in this exact format:
[h2] Main Section Title 1
[h3] Subsection 1.1
[h3] Subsection 1.2
[h2] Main Section Title 2
[h3] Subsection 2.1
... continue for all ${config.h2Count} H2 sections

Create the outline now:`;
    }

    // Call AI API (supports both OpenAI and Gemini)
    const aiResult = await callAI(
      provider,
      apiKey,
      actualModel,
      systemPrompt,
      userPrompt,
      1000,
      0.7
    );

    if (!aiResult.success || !aiResult.content) {
      return {
        success: false,
        error: aiResult.error || "Failed to generate outline",
      };
    }

    let outline = aiResult.content;

    // Add conclusion section if not present
    if (
      !outline.toLowerCase().includes("kết luận") &&
      !outline.toLowerCase().includes("conclusion")
    ) {
      outline += "\n[h2] Kết luận";
      console.log('✅ Added "Kết luận" section to outline');
    }

    // Calculate and deduct tokens
    const tokensToDeduct = aiResult.tokensUsed || estimatedTokens;

    const deductResult = await deductTokens(
      userId,
      tokensToDeduct,
      "GENERATE_OUTLINE"
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    console.log(
      `✅ [AIService] Outline generated successfully, tokens used: ${tokensToDeduct}`
    );

    return {
      success: true,
      outline: outline,
      tokensUsed: tokensToDeduct,
    };
  } catch (error: any) {
    console.error("[AIService] Error generating outline:", error);
    return {
      success: false,
      error: error.message || "Internal error",
    };
  }
}

/**
 * Generate article title for a keyword
 */
export async function generateArticleTitle(
  keyword: string,
  userId: number,
  language: string = "vi",
  tone: string = "professional",
  model: string = "GPT 4"
): Promise<{ success: boolean; title?: string; tokensUsed?: number; error?: string }> {
  try {
    console.log(`📝 [AIService] Generating title for: "${keyword}"`);

    const estimatedTokens = 200;

    // Check tokens
    const tokenCheck = await checkTokensMiddleware(userId, estimatedTokens, "GENERATE_TITLE");
    if (!tokenCheck.allowed) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${estimatedTokens}, Available: ${tokenCheck.remainingTokens || 0}`,
      };
    }

    // Get API key
    const modelConfig = await getApiKeyForModel(model, false);
    if (!modelConfig) {
      return { success: false, error: "API key not configured" };
    }

    const { apiKey, provider, actualModel } = modelConfig;
    const languageName = language === "vi" ? "Vietnamese" : language;

    // Get prompts
    const systemPrompt = getSystemPrompt("generate_article_title");
    const promptTemplate = await loadPrompt("generate_article_title");

    let userPrompt = "";
    if (promptTemplate) {
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language: languageName,
        tone: tone,
      });
    } else {
      // Fallback
      userPrompt = `Generate an engaging article title for the keyword: "${keyword}"

Requirements:
- Language: ${languageName}
- Tone: ${tone}
- Make it compelling and click-worthy
- Keep it concise (under 60 characters)

Output ONLY the title, nothing else.`;
    }

    // Call AI API (supports both OpenAI and Gemini)
    const aiResult = await callAI(
      provider,
      apiKey,
      actualModel,
      systemPrompt,
      userPrompt,
      100,
      0.7
    );

    if (!aiResult.success || !aiResult.content) {
      return { 
        success: false, 
        error: aiResult.error || "Failed to generate title"
      };
    }

    const title = aiResult.content;

    // Deduct tokens
    const tokensToDeduct = aiResult.tokensUsed || estimatedTokens;
    await deductTokens(userId, tokensToDeduct, "GENERATE_TITLE");

    console.log(`✅ [AIService] Title generated: "${title}" (${tokensToDeduct} tokens)`);

    return {
      success: true,
      title: title,
      tokensUsed: tokensToDeduct,
    };
  } catch (error: any) {
    console.error("[AIService] Error generating title:", error);
    return { success: false, error: error.message || "Internal error" };
  }
}

/**
 * Generate SEO title for an article
 */
export async function generateArticleSEOTitle(
  title: string,
  keyword: string,
  userId: number,
  language: string = "vi",
  model: string = "GPT 4"
): Promise<{ success: boolean; seoTitle?: string; tokensUsed?: number; error?: string }> {
  try {
    console.log(`🔍 [AIService] Generating SEO title for: "${title}"`);

    const estimatedTokens = 200;

    // Check tokens
    const tokenCheck = await checkTokensMiddleware(userId, estimatedTokens, "GENERATE_SEO_TITLE");
    if (!tokenCheck.allowed) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${estimatedTokens}, Available: ${tokenCheck.remainingTokens || 0}`,
      };
    }

    // Get API key
    const modelConfig = await getApiKeyForModel(model, false);
    if (!modelConfig) {
      return { success: false, error: "API key not configured" };
    }

    const { apiKey, provider, actualModel } = modelConfig;
    const languageName = language === "vi" ? "Vietnamese" : language;

    // Get prompts
    const systemPrompt = getSystemPrompt("generate_seo_title");
    const promptTemplate = await loadPrompt("generate_seo_title");

    let userPrompt = "";
    if (promptTemplate) {
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        title: title,
        keyword: keyword,
        language: languageName,
      });
    } else {
      // Fallback
      userPrompt = `Create an SEO-optimized title for:

Article Title: ${title}
Target Keyword: ${keyword}
Language: ${languageName}

Requirements:
- Include the target keyword naturally
- Keep it under 60 characters
- Make it search engine friendly

Output ONLY the SEO title, nothing else.`;
    }

    // Call AI API (supports both OpenAI and Gemini)
    const aiResult = await callAI(
      provider,
      apiKey,
      actualModel,
      systemPrompt,
      userPrompt,
      100,
      0.7
    );

    if (!aiResult.success || !aiResult.content) {
      return { 
        success: false, 
        error: aiResult.error || "Failed to generate SEO title"
      };
    }

    const seoTitle = aiResult.content;

    // Deduct tokens
    const tokensToDeduct = aiResult.tokensUsed || estimatedTokens;
    await deductTokens(userId, tokensToDeduct, "GENERATE_SEO_TITLE");

    console.log(`✅ [AIService] SEO title generated: "${seoTitle}" (${tokensToDeduct} tokens)`);

    return {
      success: true,
      seoTitle: seoTitle,
      tokensUsed: tokensToDeduct,
    };
  } catch (error: any) {
    console.error("[AIService] Error generating SEO title:", error);
    return { success: false, error: error.message || "Internal error" };
  }
}

/**
 * Generate meta description for an article
 */
export async function generateArticleMetaDescription(
  title: string,
  keyword: string,
  userId: number,
  language: string = "vi",
  model: string = "GPT 4"
): Promise<{ success: boolean; metaDesc?: string; tokensUsed?: number; error?: string }> {
  try {
    console.log(`📄 [AIService] Generating meta description for: "${title}"`);

    const estimatedTokens = 300;

    // Check tokens
    const tokenCheck = await checkTokensMiddleware(userId, estimatedTokens, "GENERATE_META_DESC");
    if (!tokenCheck.allowed) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${estimatedTokens}, Available: ${tokenCheck.remainingTokens || 0}`,
      };
    }

    // Get API key
    const modelConfig = await getApiKeyForModel(model, false);
    if (!modelConfig) {
      return { success: false, error: "API key not configured" };
    }

    const { apiKey, provider, actualModel } = modelConfig;
    const languageName = language === "vi" ? "Vietnamese" : language;

    // Get prompts
    const systemPrompt = getSystemPrompt("generate_meta_description");
    const promptTemplate = await loadPrompt("generate_meta_description");

    let userPrompt = "";
    if (promptTemplate) {
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        title: title,
        keyword: keyword,
        language: languageName,
      });
    } else {
      // Fallback
      userPrompt = `Create an SEO-optimized meta description for:

Article Title: ${title}
Target Keyword: ${keyword}
Language: ${languageName}

Requirements:
- Include the target keyword naturally
- Keep it between 150-160 characters
- Make it compelling and informative
- Encourage clicks from search results

Output ONLY the meta description, nothing else.`;
    }

    // Call AI API (supports both OpenAI and Gemini)
    const aiResult = await callAI(
      provider,
      apiKey,
      actualModel,
      systemPrompt,
      userPrompt,
      150,
      0.7
    );

    if (!aiResult.success || !aiResult.content) {
      return { 
        success: false, 
        error: aiResult.error || "Failed to generate meta description"
      };
    }

    const metaDesc = aiResult.content;

    // Deduct tokens
    const tokensToDeduct = aiResult.tokensUsed || estimatedTokens;
    await deductTokens(userId, tokensToDeduct, "GENERATE_META_DESC");

    console.log(`✅ [AIService] Meta description generated (${tokensToDeduct} tokens)`);

    return {
      success: true,
      metaDesc: metaDesc,
      tokensUsed: tokensToDeduct,
    };
  } catch (error: any) {
    console.error("[AIService] Error generating meta description:", error);
    return { success: false, error: error.message || "Internal error" };
  }
}

/**
 * Generate article content for a keyword
 * This is a simplified version without SSE - for batch job workers
 * Returns the full HTML content
 */
export async function generateArticleContent(
  options: GenerateArticleOptions
): Promise<ArticleResult> {
  try {
    const {
      keyword,
      language,
      outlineType,
      customOutline,
      tone,
      model,
      length,
      userId,
      useGoogleSearch,
      websiteId,
    } = options;

    console.log(`📝 [AIService] Generating article for: "${keyword}"`);
    console.log(`   Length: ${length}, Outline: ${outlineType}`);

    // Determine required tokens
    const lengthKey = length.toLowerCase();
    const tokenCostMap: Record<string, number> = {
      short: TOKEN_COSTS.WRITE_ARTICLE_SHORT,
      medium: TOKEN_COSTS.WRITE_ARTICLE_MEDIUM,
      long: TOKEN_COSTS.WRITE_ARTICLE_LONG,
    };
    const requiredTokens =
      tokenCostMap[lengthKey] || TOKEN_COSTS.WRITE_ARTICLE_MEDIUM;

    // Check if user has enough tokens
    const tokenCheck = await checkTokensMiddleware(
      userId,
      requiredTokens,
      "GENERATE_ARTICLE"
    );

    if (!tokenCheck.allowed) {
      return {
        success: false,
        error: `Insufficient tokens. Required: ${requiredTokens}, Available: ${tokenCheck.remainingTokens || 0}`,
      };
    }

    // Get API key
    const modelConfig = await getApiKeyForModel(model, useGoogleSearch);
    if (!modelConfig) {
      return {
        success: false,
        error: "API key not configured",
      };
    }

    const { apiKey, provider, actualModel } = modelConfig;
    console.log(`✅ Using ${provider} with model: ${actualModel}`);

    // Generate outline if needed
    let finalOutline = customOutline || "";
    
    if ((outlineType === "no-outline" || outlineType === "ai-outline") && !finalOutline.trim()) {
      console.log(`📋 Auto-generating outline for ${outlineType}...`);
      const outlineResult = await generateOutline({
        keyword,
        language,
        length,
        tone,
        model,
        userId,
      });

      if (!outlineResult.success || !outlineResult.outline) {
        return {
          success: false,
          error: `Failed to generate outline: ${outlineResult.error}`,
        };
      }

      finalOutline = outlineResult.outline;
      console.log(`✅ Auto-generated outline with ${finalOutline.split('\n').length} lines`);
    }

    // Build language instruction
    const languageInstruction =
      language === "vi"
        ? "Write in Vietnamese (Tiếng Việt)."
        : language === "en"
        ? "Write in English."
        : `Write in ${language}.`;

    // Length configuration
    const lengthConfigs: Record<
      string,
      { minWords: number; maxWords: number; style: string }
    > = {
      short: {
        minWords: 1500,
        maxWords: 2000,
        style: "Concise and focused content",
      },
      medium: {
        minWords: 2000,
        maxWords: 2500,
        style: "Balanced and comprehensive content",
      },
      long: {
        minWords: 3000,
        maxWords: 4000,
        style: "In-depth and detailed content",
      },
    };

    const lengthConfig = lengthConfigs[lengthKey] || lengthConfigs.medium;

    const lengthInstruction = `${lengthConfig.style}
- Target: ${lengthConfig.minWords}–${lengthConfig.maxWords} words total
- Write detailed, comprehensive paragraphs
- Each section should have multiple paragraphs`;

    // Get system prompt
    let systemPrompt = getSystemPrompt("generate_article");
    
    // Add critical instruction to avoid meta-text
    systemPrompt += `\n\nCRITICAL INSTRUCTIONS:
- Write DIRECTLY in the target language specified by the user
- DO NOT write explanations like "As an expert..." or "I will write..."
- DO NOT include meta-commentary about the article
- DO NOT write summaries at the end like "This article provides..."
- START immediately with the article content in HTML format
- END with the last paragraph of the conclusion
- Output ONLY the article HTML, nothing else`;

    // Inject website knowledge if provided
    if (websiteId && websiteId.trim()) {
      try {
        const website = await queryOne<any>(
          "SELECT id, name, knowledge FROM websites WHERE id = ? AND user_id = ?",
          [websiteId, userId]
        );

        if (website && website.knowledge) {
          console.log(
            `🌐 Injecting website knowledge: "${website.name}" (${website.knowledge.length} chars)`
          );
          systemPrompt = injectWebsiteKnowledge(systemPrompt, website.knowledge);
        }
      } catch (error) {
        console.error("Error loading website knowledge:", error);
        // Continue without knowledge
      }
    }

    // Get user prompt template
    const promptTemplate = await loadPrompt("generate_article");
    let userPrompt = "";

    if (promptTemplate) {
      // Build paragraph rules based on length and outline type
      let outlineMode = "";
      let paragraphWords = "100";
      
      if (outlineType === "no-outline" || outlineType === "ai-outline") {
        // Rules for No Outline mode
        if (lengthKey === "short") {
          outlineMode = "Write 1-2 paragraphs per H2 heading. Each paragraph MUST be at least 80 words.";
          paragraphWords = "80";
        } else if (lengthKey === "medium") {
          outlineMode = "Write 2-3 paragraphs per H2 heading. Each paragraph MUST be at least 100 words.";
          paragraphWords = "100";
        } else {
          // long
          outlineMode = "Write 3-4 paragraphs per H2 heading. Each paragraph MUST be at least 100 words.";
          paragraphWords = "100";
        }
      } else {
        // Your Outline mode - default to Medium rules
        outlineMode = "Write 2-3 paragraphs per heading in the outline. Each paragraph MUST be at least 100 words.";
        paragraphWords = "100";
      }

      const outlineInstruction = finalOutline
        ? `Follow this outline structure exactly:\n${finalOutline}`
        : "Create a comprehensive article structure with multiple H2 sections and H3 subsections.";

      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language: languageInstruction,
        tone: tone,
        length_instruction: lengthInstruction,
        min_words: lengthConfig.minWords.toString(),
        max_words: lengthConfig.maxWords.toString(),
        outline_instruction: outlineInstruction,
        writing_style: lengthConfig.style,
        outline_mode: outlineMode,
        paragraph_words: paragraphWords,
        outline: finalOutline || "",
      });
    } else {
      // Fallback
      userPrompt = `Write a comprehensive article about: "${keyword}"

${languageInstruction}
Tone: ${tone}
${lengthInstruction}

${finalOutline ? `Use this outline:\n${finalOutline}` : ""}

Write the complete article now in HTML format.`;
    }

    // Call API based on provider
    let articleContent = "";
    let tokensUsed = requiredTokens; // Default to estimated

    if (provider === "google-ai") {
      // Call Google AI API (Gemini)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + "\n\n" + userPrompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google AI API error:", errorData);
        return {
          success: false,
          error: "Failed to generate article from Google AI",
        };
      }

      const data = await response.json();
      articleContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Estimate tokens for Gemini (they don't provide usage in same format)
      tokensUsed = requiredTokens;
    } else {
      // Call OpenAI API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        return {
          success: false,
          error: "Failed to generate article from OpenAI",
        };
      }

      const data = await response.json();
      articleContent = data.choices[0]?.message?.content?.trim() || "";

      // Calculate actual tokens
      const actualTokens = calculateActualTokens(data);
      tokensUsed = actualTokens > 0 ? actualTokens : requiredTokens;
    }

    if (!articleContent) {
      return {
        success: false,
        error: "No content generated",
      };
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      userId,
      tokensUsed,
      "GENERATE_ARTICLE"
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    console.log(
      `✅ [AIService] Article generated successfully, tokens used: ${tokensUsed}`
    );
    console.log(`   Content length: ${articleContent.length} chars`);

    return {
      success: true,
      content: articleContent,
      tokensUsed: tokensUsed,
    };
  } catch (error: any) {
    console.error("[AIService] Error generating article:", error);
    return {
      success: false,
      error: error.message || "Internal error",
    };
  }
}

/**
 * Insert images into article content
 * This uses Pexels API to find and insert relevant images
 */
export async function insertImagesIntoArticle(
  articleId: number,
  keyword: string,
  maxImages: number = 5
): Promise<{ success: boolean; imagesInserted?: number; error?: string }> {
  try {
    console.log(
      `🖼️ [AIService] Inserting up to ${maxImages} images for article ${articleId}`
    );

    // Get Pexels API key
    const pexelsKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'pexels' AND category = 'image' AND is_active = TRUE
       LIMIT 1`
    );

    if (pexelsKeys.length === 0) {
      console.log("⚠️ No Pexels API key configured, skipping image insertion");
      return { success: true, imagesInserted: 0 };
    }

    const pexelsApiKey = pexelsKeys[0].api_key;

    // Search for images on Pexels
    const searchResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${maxImages}`,
      {
        headers: {
          Authorization: pexelsApiKey,
        },
      }
    );

    if (!searchResponse.ok) {
      console.error("Pexels API error:", await searchResponse.text());
      return { success: true, imagesInserted: 0 };
    }

    const searchData = await searchResponse.json();
    const photos = searchData.photos || [];

    if (photos.length === 0) {
      console.log(`⚠️ No images found for keyword: "${keyword}"`);
      return { success: true, imagesInserted: 0 };
    }

    // Get current article content
    const articles = await query<any>(
      "SELECT content FROM articles WHERE id = ?",
      [articleId]
    );

    if (articles.length === 0) {
      return { success: false, error: "Article not found" };
    }

    let content = articles[0].content || "";

    // Insert images after each H2 section
    const h2Matches = content.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
    let imagesInserted = 0;

    for (let i = 0; i < h2Matches.length && imagesInserted < maxImages; i++) {
      if (i >= photos.length) break;

      const photo = photos[i];
      const imageHtml = `<figure class="my-4">
  <img src="${photo.src.large}" alt="${photo.alt || keyword}" class="w-full rounded-lg" />
  <figcaption class="text-sm text-gray-600 mt-2">Photo by ${photo.photographer} on Pexels</figcaption>
</figure>`;

      // Insert after the H2
      const h2 = h2Matches[i];
      content = content.replace(h2, h2 + "\n" + imageHtml);
      imagesInserted++;
    }

    // Update article with images
    await execute("UPDATE articles SET content = ? WHERE id = ?", [
      content,
      articleId,
    ]);

    console.log(
      `✅ [AIService] Inserted ${imagesInserted} images into article ${articleId}`
    );

    return {
      success: true,
      imagesInserted,
    };
  } catch (error: any) {
    console.error("[AIService] Error inserting images:", error);
    return {
      success: false,
      error: error.message || "Internal error",
    };
  }
}
