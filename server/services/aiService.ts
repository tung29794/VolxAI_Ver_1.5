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

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return {
        success: false,
        error: "Failed to generate outline from API",
      };
    }

    const data = await response.json();
    let outline = data.choices[0]?.message?.content?.trim();

    if (!outline) {
      return {
        success: false,
        error: "No outline generated",
      };
    }

    // Add conclusion section if not present
    if (
      !outline.toLowerCase().includes("kết luận") &&
      !outline.toLowerCase().includes("conclusion")
    ) {
      outline += "\n[h2] Kết luận";
      console.log('✅ Added "Kết luận" section to outline');
    }

    // Calculate and deduct tokens
    const actualTokens = calculateActualTokens(data);
    const tokensToDeduct = actualTokens > 0 ? actualTokens : estimatedTokens;

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
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
        tone: tone,
        length_instruction: lengthInstruction,
        outline: finalOutline,
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
