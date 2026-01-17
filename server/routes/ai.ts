import { Router, RequestHandler, Request, Response } from "express";
import { query, execute, queryOne } from "../db";
import jwt from "jsonwebtoken";
import {
  checkTokensMiddleware,
  deductTokens,
  estimateRewriteTokens,
  calculateActualTokens,
  TOKEN_COSTS,
} from "../lib/tokenManager";
import {
  calculateTokens,
  countWords,
  isFixedCostFeature,
  getCostMultiplier,
} from "../lib/tokenCalculator";
import { getSystemPrompt } from "../config/systemPrompts";

const router = Router();

// ===== PROMPT MANAGEMENT UTILITIES =====

interface AIPromptTemplate {
  prompt_template: string;
  system_prompt: string;
  available_variables?: string[];
}

/**
 * Load AI prompt from database by feature name
 * Falls back to default prompts if not found or inactive
 */
async function loadPrompt(
  featureName: string,
): Promise<AIPromptTemplate | null> {
  try {
    const prompt = await queryOne<any>(
      `SELECT prompt_template, system_prompt, available_variables
       FROM ai_prompts
       WHERE feature_name = ? AND is_active = TRUE`,
      [featureName],
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
 * Example: "{title}" -> "My Article Title"
 */
function interpolatePrompt(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

/**
 * Inject website knowledge into system prompt
 * Works for both OpenAI and Gemini models
 * @param basePrompt - Original system prompt
 * @param knowledge - Website knowledge/context
 * @returns Enhanced prompt with knowledge BEFORE base prompt (higher priority)
 */
function injectWebsiteKnowledge(basePrompt: string, knowledge: string): string {
  // ⚠️ STRATEGY: Place knowledge FIRST so AI reads it before other instructions
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 WEBSITE KNOWLEDGE & GUIDELINES (ABSOLUTE TOP PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL INSTRUCTIONS - THESE RULES OVERRIDE EVERYTHING BELOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST FOLLOW THE WEBSITE KNOWLEDGE ABOVE WITH 100% ACCURACY:

1. ✅ CLOSING STATEMENTS: If knowledge specifies a closing phrase, you MUST include it EXACTLY at the end of your article
2. ✅ TONE & STYLE: Use EXACTLY the tone specified (e.g., friendly, professional, casual)
3. ✅ TERMINOLOGY: Use ONLY the exact words and phrases mentioned in the knowledge
4. ✅ REQUIRED ELEMENTS: Include ALL mandatory elements (prices, addresses, specific phrases, disclaimers)
5. ✅ STRUCTURE: Follow the content patterns described in the knowledge
6. ✅ BRANDING: Maintain the website's voice and identity consistently
7. ✅ SPECIAL REQUIREMENTS: Pay attention to ANY specific instructions (e.g., "always mention X", "never use Y")

🚨 ABSOLUTE RULE: If there's ANY conflict between the instructions below and the website knowledge above, ALWAYS choose the website knowledge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${basePrompt}`;
}

/**
 * Clean HTML content by removing empty paragraphs and extra whitespace
 * Removes <p><br></p>, <p></p>, and normalizes spacing
 */
function cleanHTMLContent(html: string): string {
  let cleaned = html;

  // Fix spacing issues - ensure space after closing tags if text follows immediately
  // This fixes issues like: "mới</p>Hà Nội" -> "mới</p> Hà Nội"
  cleaned = cleaned.replace(
    /(<\/p>)([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/g,
    "$1 $2",
  );
  cleaned = cleaned.replace(
    /(<\/h[1-6]>)([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/g,
    "$1 $2",
  );
  cleaned = cleaned.replace(
    /(<\/strong>)([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/g,
    "$1 $2",
  );
  cleaned = cleaned.replace(
    /(<\/em>)([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ])/g,
    "$1 $2",
  );

  // Ensure proper spacing between closing and opening tags
  cleaned = cleaned.replace(/<\/p><p>/gi, "</p>\n\n<p>");
  cleaned = cleaned.replace(/<\/h([1-6])><p>/gi, "</h$1>\n\n<p>");
  cleaned = cleaned.replace(/<\/p><h([1-6])>/gi, "</p>\n\n<h$1>");

  // Remove <p><br></p> (empty paragraph with line break)
  cleaned = cleaned.replace(/<p><br><\/p>/gi, "");

  // Remove <p> </p> (paragraph with only whitespace)
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, "");

  // Remove multiple consecutive newlines (3 or more)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Remove empty paragraphs after headings (h2<p></p>, h3<p></p>, etc)
  cleaned = cleaned.replace(/(<\/h[1-6]>)\s*<p><br><\/p>/gi, "$1");
  cleaned = cleaned.replace(/(<\/h[1-6]>)\s*<p>\s*<\/p>/gi, "$1");

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Search Google Web (not news) and aggregate results
 * Similar to news search but for general web content
 * @param keyword - Search keyword
 * @param language - Language code (vi, en, etc.)
 * @param requestId - Request ID for logging
 * @returns Array of search results with title, snippet, link
 */
interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  source: string;
}

async function searchGoogleWeb(
  keyword: string,
  language: string,
  requestId: string = "unknown",
): Promise<{ results: GoogleSearchResult[]; provider: string }> {
  console.log(`[${requestId}] 🔍 Starting Google Web search for: "${keyword}"`);

  // Get all active search API keys from database
  const searchApiKeys = await query<any>(
    `SELECT id, provider, api_key, quota_remaining 
     FROM api_keys 
     WHERE category = 'search' AND is_active = TRUE 
     ORDER BY RAND()`,
  );

  if (searchApiKeys.length === 0) {
    throw new Error("No search API keys configured");
  }

  console.log(
    `[${requestId}] 📋 Found ${searchApiKeys.length} search API keys to try`,
  );

  let searchResults: GoogleSearchResult[] = [];
  let searchError = "";
  let usedProvider = "";

  // Try each API key until one works
  for (const apiKeyRow of searchApiKeys) {
    try {
      const providerLower = apiKeyRow.provider.toLowerCase();
      console.log(`[${requestId}] 🔄 Trying ${apiKeyRow.provider}...`);

      if (providerLower === "serpapi") {
        // SerpAPI Web Search
        const params = new URLSearchParams({
          api_key: apiKeyRow.api_key,
          q: keyword,
          location: language === "vi" ? "Vietnam" : "United States",
          hl: language === "vi" ? "vi" : "en",
          gl: language === "vi" ? "vn" : "us",
          num: "10",
        });

        const response = await fetch(
          `https://serpapi.com/search.json?${params}`,
        );
        if (!response.ok) {
          throw new Error(`SerpAPI returned ${response.status}`);
        }

        const data = await response.json();
        if (data.organic_results && data.organic_results.length > 0) {
          searchResults = data.organic_results.map((item: any) => ({
            title: item.title || "",
            snippet: item.snippet || "",
            link: item.link || "",
            source: item.source || new URL(item.link || "").hostname,
          }));
          usedProvider = "SerpAPI";
          break;
        }
      } else if (providerLower === "serper") {
        // Serper Web Search
        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": apiKeyRow.api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: keyword,
            gl: language === "vi" ? "vn" : "us",
            hl: language === "vi" ? "vi" : "en",
            num: 10,
          }),
        });

        if (!response.ok) {
          throw new Error(`Serper returned ${response.status}`);
        }

        const data = await response.json();
        if (data.organic && data.organic.length > 0) {
          searchResults = data.organic.map((item: any) => ({
            title: item.title || "",
            snippet: item.snippet || "",
            link: item.link || "",
            source: item.source || new URL(item.link || "").hostname,
          }));
          usedProvider = "Serper";
          break;
        }
      } else if (providerLower === "zenserp") {
        // Zenserp Web Search
        const params = new URLSearchParams({
          apikey: apiKeyRow.api_key,
          q: keyword,
          location: language === "vi" ? "Vietnam" : "United States",
          hl: language === "vi" ? "vi" : "en",
          num: "10",
        });

        const response = await fetch(
          `https://app.zenserp.com/api/v2/search?${params}`,
        );
        if (!response.ok) {
          throw new Error(`Zenserp returned ${response.status}`);
        }

        const data = await response.json();
        if (data.organic && data.organic.length > 0) {
          searchResults = data.organic.map((item: any) => ({
            title: item.title || "",
            snippet: item.snippet || "",
            link: item.url || "",
            source: item.source || new URL(item.url || "").hostname,
          }));
          usedProvider = "Zenserp";
          break;
        }
      }

      // Update last_used_at
      await execute("UPDATE api_keys SET last_used_at = NOW() WHERE id = ?", [
        apiKeyRow.id,
      ]);
    } catch (error) {
      searchError = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[${requestId}] ${apiKeyRow.provider} failed:`,
        searchError,
      );
      continue; // Try next API
    }
  }

  if (searchResults.length === 0) {
    throw new Error(`All search APIs failed. Last error: ${searchError}`);
  }

  console.log(
    `[${requestId}] ✅ Successfully fetched ${searchResults.length} web results using ${usedProvider}`,
  );

  return { results: searchResults, provider: usedProvider };
}

// ===== AI MODEL & STREAMING HELPERS =====

/**
 * Generate content writing rules based on article length and outline type
 *
 * RULES:
 * - No Outline:
 *   - Short: Mỗi heading ít nhất 1 đoạn, mỗi đoạn > 80 từ
 *   - Medium: Mỗi heading ít nhất 2 đoạn, mỗi đoạn > 100 từ
 *   - Long: Mỗi heading ít nhất 3 đoạn, mỗi đoạn > 100 từ
 * - With Outline (AI Outline / Your Outline): Luôn giống Medium (2 đoạn, >100 từ mỗi đoạn)
 */
function generateContentWritingRules(
  length: string,
  outlineType: string,
): {
  writingStyle: string;
  paragraphRules: string;
  openingRules: string;
  minWords: number;
  maxWords: number;
} {
  const normalized = (length || "medium").toLowerCase();

  // Define base configurations
  const configs = {
    short: {
      minWords: 1500,
      maxWords: 2000,
      writingStyle:
        "Write clearly and directly. Provide essential information with basic explanations.",
      noOutline: { minParagraphs: 1, minWordsPerParagraph: 80 },
      withOutline: { minParagraphs: 2, minWordsPerParagraph: 100 },
    },
    medium: {
      minWords: 2000,
      maxWords: 2500,
      writingStyle:
        "Write with moderate detail. Include explanations and some examples to clarify concepts.",
      noOutline: { minParagraphs: 2, minWordsPerParagraph: 100 },
      withOutline: { minParagraphs: 2, minWordsPerParagraph: 100 },
    },
    long: {
      minWords: 3000,
      maxWords: 4000,
      writingStyle:
        "Write comprehensive in-depth content. Explain every concept thoroughly with multiple concrete examples, practical applications, case studies, and real-world scenarios. Cover all aspects exhaustively with rich details.",
      noOutline: { minParagraphs: 3, minWordsPerParagraph: 100 },
      withOutline: { minParagraphs: 2, minWordsPerParagraph: 100 },
    },
  };

  const config = configs[normalized as keyof typeof configs] || configs.medium;
  const isNoOutline = outlineType === "no-outline";
  const rules = isNoOutline ? config.noOutline : config.withOutline;

  // Opening paragraph rules (CRITICAL: No heading in opening)
  const openingRules = `
🚨 OPENING PARAGRAPH RULES (CRITICAL - MUST FOLLOW):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Start with 1-2 introductory <p> paragraphs BEFORE any heading
2. DO NOT start with <h2> or any heading tag
3. Opening paragraphs should introduce the topic naturally
4. Each opening paragraph should be ${rules.minWordsPerParagraph}+ words
5. After opening paragraphs, then start with <h2> headings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  // Paragraph rules for headings
  const paragraphRules = `
⚠️ PARAGRAPH RULES FOR EACH HEADING (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Each <h2> heading MUST have AT LEAST ${rules.minParagraphs} separate <p> paragraphs
- Each <h3> heading MUST have AT LEAST ${rules.minParagraphs} separate <p> paragraphs
- Each paragraph MUST be ${rules.minWordsPerParagraph}+ words minimum
- FORBIDDEN: Writing only 1 short paragraph per heading
- REQUIRED: Deep analysis, multiple perspectives, examples
- Total article length: ${config.minWords}–${config.maxWords} words
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return {
    writingStyle: config.writingStyle,
    paragraphRules,
    openingRules,
    minWords: config.minWords,
    maxWords: config.maxWords,
  };
}

/**
 * Get API key and provider info based on model selection
 * Returns: { apiKey, provider, actualModel }
 */
interface ModelConfig {
  apiKey: string;
  provider: "openai" | "google-ai";
  actualModel: string;
}

async function getApiKeyForModel(
  model: string,
  useGoogleSearch: boolean = false,
): Promise<ModelConfig | null> {
  try {
    const isGeminiModel = model.toLowerCase().includes("gemini");

    if (useGoogleSearch || isGeminiModel) {
      // Use Google AI (Gemini)
      console.log(
        `🔍 Getting Google AI API key - Model: ${model}, useGoogleSearch: ${useGoogleSearch}`,
      );
      const googleApiKeys = await query<any>(
        `SELECT api_key FROM api_keys
         WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
         LIMIT 1`,
      );

      if (googleApiKeys.length === 0) {
        console.error("❌ Google AI API key not found");
        return null;
      }

      return {
        apiKey: googleApiKeys[0].api_key,
        provider: "google-ai",
        actualModel: model, // Use the model parameter directly (e.g., 'gemini-2.5-flash')
      };
    } else {
      // Use OpenAI
      console.log(`🤖 Getting OpenAI API key - Model: ${model}`);
      const apiKeys = await query<any>(
        `SELECT api_key FROM api_keys
         WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
         LIMIT 1`,
      );

      if (apiKeys.length === 0) {
        console.error("❌ OpenAI API key not found");
        return null;
      }

      // Model is already model_id from frontend (e.g., 'gpt-3.5-turbo', 'gpt-4o-mini')
      // No need for mapping, just use it directly
      return {
        apiKey: apiKeys[0].api_key,
        provider: "openai",
        actualModel: model, // Use model_id directly
      };
    }
  } catch (error) {
    console.error("❌ Error getting API key:", error);
    return null;
  }
}

/**
 * Stream OpenAI response with SSE
 * @param apiKey - OpenAI API key
 * @param model - OpenAI model name
 * @param systemPrompt - System prompt
 * @param userPrompt - User prompt
 * @param maxTokens - Max tokens for response
 * @param sendSSE - Function to send SSE events
 * @param requestId - Request ID for logging
 * @returns Generated content and finish reason
 */
async function streamOpenAIResponse(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  sendSSE: (event: string, data: any) => void,
  requestId: string = "unknown",
): Promise<{ content: string; finishReason: string } | null> {
  try {
    console.log(
      `🤖 [${requestId}] Streaming OpenAI response with model: ${model}`,
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] OpenAI API error: ${response.status}`);
      const errorData = await response.json();
      console.error(`[${requestId}] Error details:`, errorData);
      sendSSE("error", {
        message: "Failed to call OpenAI API",
        details: errorData,
        status: response.status,
      });
      return null;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      console.error(`❌ [${requestId}] No response stream from OpenAI`);
      sendSSE("error", { message: "No response stream from OpenAI" });
      return null;
    }

    let content = "";
    let finishReason = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(
          `✅ [${requestId}] OpenAI streaming completed (${content.length} chars)`,
        );
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

        if (trimmedLine.startsWith("data: ")) {
          try {
            const jsonData = JSON.parse(trimmedLine.substring(6));
            const delta = jsonData.choices?.[0]?.delta?.content;
            finishReason = jsonData.choices?.[0]?.finish_reason || finishReason;

            if (delta) {
              content += delta;
              sendSSE("content", { chunk: delta, total: content });
            }
          } catch (e) {
            console.error(`[${requestId}] Error parsing SSE line:`, e);
          }
        }
      }
    }

    if (!content) {
      console.error(`❌ [${requestId}] No content received from OpenAI`);
      sendSSE("error", { message: "No response from OpenAI" });
      return null;
    }

    return { content, finishReason };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in streamOpenAIResponse:`, error);
    sendSSE("error", {
      message: "Error streaming OpenAI response",
      details: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Stream Gemini response with SSE (using Google Generative AI)
 * Similar to streamOpenAIResponse but for Gemini models
 * NOTE: Requires @google/generative-ai package to be installed
 */
async function streamGeminiResponse(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  sendSSE: (event: string, data: any) => void,
  requestId: string = "unknown",
): Promise<{ content: string; finishReason: string } | null> {
  try {
    console.log(`🔍 [${requestId}] Streaming Gemini response`);

    // TODO: Install @google/generative-ai package first
    // const { GoogleGenerativeAI } = await import("@google/generative-ai");
    // const genAI = new GoogleGenerativeAI(apiKey);
    // const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    // const result = await geminiModel.generateContentStream(fullPrompt);

    // let content = '';
    // for await (const chunk of result.stream) {
    //   const chunkText = chunk.text();
    //   content += chunkText;
    //   sendSSE('content', { chunk: chunkText, total: content });
    // }

    // console.log(`✅ [${requestId}] Gemini streaming completed (${content.length} chars)`);
    // return { content, finishReason: 'stop' };

    console.error(`❌ [${requestId}] Gemini streaming not yet implemented`);
    sendSSE("error", {
      message: "Gemini streaming requires @google/generative-ai package",
      details: "Please install the package or use OpenAI models",
    });
    return null;
  } catch (error) {
    console.error(`❌ [${requestId}] Error in streamGeminiResponse:`, error);
    sendSSE("error", {
      message: "Error streaming Gemini response",
      details: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ===== CONTENT PROCESSING HELPERS =====

/**
 * Split long paragraphs (> maxWords) into smaller chunks at sentence boundaries
 * Improves readability by keeping paragraphs concise
 */
function splitLongParagraphs(html: string, maxWords: number = 100): string {
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let splitCount = 0;

  const result = html.replace(paragraphRegex, (match, innerContent) => {
    // Remove HTML tags to count words
    const plainText = innerContent.replace(/<[^>]+>/g, "");
    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length <= maxWords) {
      return match; // Keep as is if under limit
    }

    console.log(`📏 Found long paragraph: ${words.length} words, splitting...`);

    // Split into chunks at sentence boundaries
    // Match: period/exclamation/question mark followed by space OR end of string
    const sentenceRegex = /([^.!?]+[.!?]+(?:\s+|$))/g;
    const sentences: string[] = [];
    let sentenceMatch;

    while ((sentenceMatch = sentenceRegex.exec(innerContent)) !== null) {
      sentences.push(sentenceMatch[1]);
    }

    // If no sentences found (no punctuation), split by word count
    if (sentences.length === 0) {
      console.log(`⚠️ No sentence boundaries found, splitting by word count`);
      const wordArray = innerContent.trim().split(/\s+/);
      const chunkSize = Math.ceil(maxWords);
      const chunks: string[] = [];

      for (let i = 0; i < wordArray.length; i += chunkSize) {
        chunks.push(wordArray.slice(i, i + chunkSize).join(" "));
      }

      splitCount++;
      return chunks.map((chunk) => `<p>${chunk}</p>`).join("\n");
    }

    // Accumulate sentences into chunks
    const chunks: string[] = [];
    let currentChunk = "";
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence
        .replace(/<[^>]+>/g, "")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      if (currentWordCount + sentenceWords > maxWords && currentChunk.trim()) {
        // Save current chunk and start new one
        chunks.push(currentChunk.trim());
        console.log(`  ✂️ Created chunk: ${currentWordCount} words`);
        currentChunk = sentence;
        currentWordCount = sentenceWords;
      } else {
        currentChunk += sentence;
        currentWordCount += sentenceWords;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      console.log(`  ✂️ Created final chunk: ${currentWordCount} words`);
    }

    splitCount++;
    console.log(`✅ Split into ${chunks.length} paragraphs`);

    // Wrap each chunk in <p> tags
    return chunks.map((chunk) => `<p>${chunk.trim()}</p>`).join("\n");
  });

  if (splitCount > 0) {
    console.log(`📊 Total paragraphs split: ${splitCount}`);
  }

  return result;
}

/**
 * Remove markdown code fence markers from HTML content
 * Removes: ```html, ```vietnamese, ```, etc.
 */
function removeCodeFenceMarkers(content: string): string {
  return content
    .replace(/^```[a-z]*\s*/i, "") // Remove opening fence
    .replace(/\s*```$/i, "") // Remove closing fence
    .trim();
}

// ===== END HELPERS =====

/**
 * Convert Markdown tables to HTML tables
 * Supports standard Markdown table format:
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 */
function convertMarkdownTablesToHtml(content: string): string {
  // Match Markdown tables (lines starting with |)
  const tableRegex = /(?:^\|.+\|$\n)+/gm;

  return content.replace(tableRegex, (tableMatch) => {
    const lines = tableMatch.trim().split("\n");
    if (lines.length < 2) return tableMatch; // Need at least header + separator

    // Parse table rows
    const parseRow = (line: string): string[] => {
      return line
        .split("|")
        .slice(1, -1) // Remove empty first and last elements from split
        .map((cell) => cell.trim());
    };

    const headerCells = parseRow(lines[0]);
    const separatorLine = lines[1];

    // Check if second line is a separator (contains dashes)
    if (!/^[\s|:-]+$/.test(separatorLine)) {
      return tableMatch; // Not a valid table
    }

    // Build HTML table
    let html = "<table>\n";

    // Header row
    html += "  <thead>\n    <tr>\n";
    headerCells.forEach((cell) => {
      html += `      <th>${cell}</th>\n`;
    });
    html += "    </tr>\n  </thead>\n";

    // Body rows
    if (lines.length > 2) {
      html += "  <tbody>\n";
      for (let i = 2; i < lines.length; i++) {
        const cells = parseRow(lines[i]);
        html += "    <tr>\n";
        cells.forEach((cell) => {
          html += `      <td>${cell}</td>\n`;
        });
        html += "    </tr>\n";
      }
      html += "  </tbody>\n";
    }

    html += "</table>";
    return html;
  });
}

// Middleware to verify user token
async function verifyUser(req: Request, res: Response): Promise<boolean> {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "No token provided",
      });
      return false;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [
      decoded.userId,
    ]);

    if (!user) {
      res.status(403).json({
        success: false,
        message: "User not found",
      });
      return false;
    }

    (req as any).userId = decoded.userId;
    return true;
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return false;
  }
}

interface RewriteRequest {
  text: string;
  style:
    | "standard"
    | "shorter"
    | "longer"
    | "easy"
    | "creative"
    | "funny"
    | "casual"
    | "friendly"
    | "professional";
  language?: string; // Language code: vi, en, es, fr, etc.
}

const stylePrompts: Record<RewriteRequest["style"], string> = {
  standard:
    "Rewrite the following text in a standard, professional manner while maintaining its original meaning.",
  shorter:
    "Rewrite the following text to be much shorter and more concise, removing unnecessary details.",
  longer:
    "Expand the following text with more details, examples, and explanations while maintaining clarity.",
  easy: "Rewrite the following text to be easier to read and understand for a general audience. Use simpler words and shorter sentences.",
  creative:
    "Rewrite the following text in a creative and engaging way that captures attention.",
  funny: "Rewrite the following text in a humorous and entertaining way.",
  casual:
    "Rewrite the following text in a casual, conversational tone as if talking to a friend.",
  friendly:
    "Rewrite the following text in a warm, friendly, and approachable tone.",
  professional:
    "Rewrite the following text in a highly professional and formal tone suitable for business.",
};

const handleRewrite: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { text, style, language = "en" } = req.body as RewriteRequest;

    if (!text || !style) {
      res.status(400).json({ error: "Text and style are required" });
      return;
    }

    if (!stylePrompts[style]) {
      res.status(400).json({ error: "Invalid style provided" });
      return;
    }

    // Use gpt-3.5-turbo as default model for rewrite
    const rewriteModel = "gpt-3.5-turbo";

    // STEP 1: Estimate tokens required (word-based calculation)
    const estimatedTokens = await estimateRewriteTokens(text, style);
    console.log(`💰 AI Rewrite - Estimated tokens: ${estimatedTokens}`);

    // STEP 2: Check if user has enough tokens
    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "AI_REWRITE",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${estimatedTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "AI Rewrite",
      });
    }

    // Get OpenAI API key from database
    const apiKeyRecord = await queryOne<any>(
      "SELECT api_key FROM api_keys WHERE provider = 'openai' AND category = 'content' AND is_active = 1 LIMIT 1",
      [],
    );

    if (!apiKeyRecord?.api_key) {
      res.status(500).json({
        error:
          "OpenAI API key not configured. Please add it in Admin > Quản lý API",
      });
      return;
    }

    const apiKey = apiKeyRecord.api_key;

    // Language names mapping
    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    const languageName = languageNames[language] || "English";
    const languageInstruction =
      language !== "en"
        ? `\n\nIMPORTANT: Rewrite this text in ${languageName}. The original text is in ${languageName}, so maintain the language.`
        : "";

    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("ai_rewrite");
    console.log("✅ Using hardcoded system prompt for rewrite_content");

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("rewrite_content");

    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt template with variable interpolation
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        text: text,
        style: style,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK: Use hardcoded user prompt
      userPrompt = `${stylePrompts[style]}${languageInstruction}\n\nText to rewrite:\n${text}`;
    }
    // ===============================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: rewriteModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      res.status(500).json({ error: "Failed to call OpenAI API" });
      return;
    }

    const data = await response.json();
    const rewrittenText = data.choices[0]?.message?.content?.trim();

    if (!rewrittenText) {
      res.status(500).json({ error: "No response from OpenAI" });
      return;
    }

    // STEP 3: Calculate actual tokens based on word count WITH cost multiplier
    const rewrittenWordCount = countWords(rewrittenText);
    const actualTokens = await calculateTokens(
      rewrittenText,
      "ai_rewrite_text",
      false,
      rewriteModel,
    );
    console.log(
      `✅ AI Rewrite success - ${rewrittenWordCount} words, ${actualTokens} tokens`,
    );

    // STEP 4: Deduct tokens from user account
    const deductResult = await deductTokens(userId, actualTokens, "AI_REWRITE");

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
      // Still return the result but log the error
    }

    // Save to database (optional - for tracking AI usage)
    try {
      await query(
        `INSERT INTO ai_rewrite_history (original_text, rewritten_text, style, created_at) VALUES (?, ?, ?, NOW())`,
        [text, rewrittenText, style],
      );
    } catch (dbError) {
      // Log but don't fail the request if database insert fails
      console.error("Failed to save AI rewrite to database:", dbError);
    }

    // STEP 5: Return response with token information
    res.json({
      rewrittenText,
      tokensUsed: actualTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error in rewrite endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Helper function to search images using available APIs
 * Returns array of images or empty array if failed
 */
async function searchImagesForKeyword(
  keyword: string,
  maxResults: number = 30,
): Promise<any[]> {
  try {
    // Get all active image search API keys
    const apiKeys = await query<any>(
      `SELECT id, provider, api_key FROM api_keys
       WHERE category = 'search' AND is_active = TRUE
       ORDER BY created_at ASC`,
    );

    if (apiKeys.length === 0) {
      console.log("⚠️ No active image search API keys available");
      return [];
    }

    let images: any[] = [];
    let usedKeyId = null;

    // Try each API key until one succeeds
    for (const { id: keyId, provider, api_key } of apiKeys) {
      try {
        if (provider === "serpapi") {
          const response = await fetch(
            `https://serpapi.com/search?q=${encodeURIComponent(keyword)}&tbm=isch&api_key=${api_key}`,
          );

          if (!response.ok) continue;
          const data = await response.json();
          if (data.error) continue;

          images = (data.images_results || [])
            .slice(0, maxResults)
            .map((img: any) => ({
              title: img.title,
              thumbnail: img.thumbnail,
              original: img.original,
              source: img.source,
            }));

          usedKeyId = keyId;
          break;
        } else if (provider === "serper") {
          const response = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": api_key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: keyword }),
          });

          if (!response.ok) continue;
          const data = await response.json();
          if (data.error) continue;

          images = (data.images || []).slice(0, maxResults).map((img: any) => ({
            title: img.title,
            thumbnail: img.imageUrl,
            original: img.imageUrl,
            source: img.source,
          }));

          usedKeyId = keyId;
          break;
        } else if (provider === "zenserp") {
          const response = await fetch(
            `https://api.zenserp.com/v1/search?q=${encodeURIComponent(keyword)}&tbm=isch&apikey=${api_key}`,
          );

          if (!response.ok) continue;
          const data = await response.json();
          if (data.error) continue;

          images = (data.images || []).slice(0, maxResults).map((img: any) => ({
            title: img.title,
            thumbnail: img.thumbnail,
            original: img.original,
            source: img.source,
          }));

          usedKeyId = keyId;
          break;
        } else if (provider === "pixabay") {
          const response = await fetch(
            `https://pixabay.com/api/?key=${api_key}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=${maxResults}`,
          );

          if (!response.ok) continue;
          const data = await response.json();
          if (data.error) continue;

          images = (data.hits || []).slice(0, maxResults).map((img: any) => ({
            title: img.tags,
            thumbnail: img.previewURL,
            original: img.largeImageURL || img.webformatURL,
            source: img.pageURL,
          }));

          usedKeyId = keyId;
          break;
        }
      } catch (apiError) {
        console.error(`Error with ${provider}:`, apiError);
        continue;
      }
    }

    // Update API key usage
    if (usedKeyId && images.length > 0) {
      await execute(`UPDATE api_keys SET last_used_at = NOW() WHERE id = ?`, [
        usedKeyId,
      ]);
    }

    return images;
  } catch (error) {
    console.error("Error searching images:", error);
    return [];
  }
}

const handleFindImage: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { keyword } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    // STEP 1: Check if user has enough tokens (100 tokens for find image)
    const requiredTokens = TOKEN_COSTS.FIND_IMAGE_SERP;
    console.log(`💰 Find Image - Required tokens: ${requiredTokens}`);

    const tokenCheck = await checkTokensMiddleware(
      userId,
      requiredTokens,
      "FIND_IMAGE_SERP",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${requiredTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "Find Image",
      });
    }

    // Get all active image search API keys ordered by creation
    const apiKeys = await query<any>(
      `SELECT id, provider, api_key FROM api_keys
       WHERE category = 'search' AND is_active = TRUE
       ORDER BY created_at ASC`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          "No available image search API keys. Please add API keys in Admin > Quản lý API",
      });
      return;
    }

    let images: any[] = [];
    let lastError = null;
    let usedProvider = null;
    let usedKeyId = null;

    // Try each API key until one succeeds
    for (const { id: keyId, provider, api_key } of apiKeys) {
      try {
        if (provider === "serpapi") {
          const response = await fetch(
            `https://serpapi.com/search?q=${encodeURIComponent(keyword)}&tbm=isch&api_key=${api_key}`,
          );

          if (!response.ok) {
            lastError = `SerpAPI returned status ${response.status}`;
            continue;
          }

          const data = await response.json();

          // Check if API returned quota exceeded error
          if (data.error) {
            lastError = `SerpAPI error: ${data.error}`;
            continue;
          }

          images = (data.images_results || []).slice(0, 30).map((img: any) => ({
            title: img.title,
            thumbnail: img.thumbnail,
            original: img.original,
            source: img.source,
          }));

          usedProvider = provider;
          usedKeyId = keyId;
          break; // Success, stop trying other APIs
        } else if (provider === "serper") {
          const response = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": api_key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: keyword }),
          });

          if (!response.ok) {
            lastError = `Serper returned status ${response.status}`;
            continue;
          }

          const data = await response.json();

          if (data.error) {
            lastError = `Serper error: ${data.error}`;
            continue;
          }

          images = (data.images || []).slice(0, 30).map((img: any) => ({
            title: img.title,
            thumbnail: img.imageUrl,
            original: img.imageUrl,
            source: img.source,
          }));

          usedProvider = provider;
          usedKeyId = keyId;
          break; // Success, stop trying other APIs
        } else if (provider === "zenserp") {
          const response = await fetch(
            `https://api.zenserp.com/v1/search?q=${encodeURIComponent(keyword)}&tbm=isch&apikey=${api_key}`,
          );

          if (!response.ok) {
            lastError = `ZenSERP returned status ${response.status}`;
            continue;
          }

          const data = await response.json();

          if (data.error) {
            lastError = `ZenSERP error: ${data.error}`;
            continue;
          }

          images = (data.images || []).slice(0, 30).map((img: any) => ({
            title: img.title,
            thumbnail: img.thumbnail,
            original: img.original,
            source: img.source,
          }));

          usedProvider = provider;
          usedKeyId = keyId;
          break; // Success, stop trying other APIs
        } else if (provider === "pixabay") {
          const response = await fetch(
            `https://pixabay.com/api/?key=${api_key}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=30`,
          );

          if (!response.ok) {
            lastError = `Pixabay returned status ${response.status}`;
            continue;
          }

          const data = await response.json();

          if (data.error) {
            lastError = `Pixabay error: ${data.error}`;
            continue;
          }

          images = (data.hits || []).slice(0, 30).map((img: any) => ({
            title: img.tags,
            thumbnail: img.previewURL,
            original: img.largeImageURL || img.webformatURL,
            source: img.pageURL,
          }));

          usedProvider = provider;
          usedKeyId = keyId;
          break; // Success, stop trying other APIs
        }
      } catch (apiError) {
        console.error(`Error with ${provider}:`, apiError);
        lastError = `${provider} error: ${apiError instanceof Error ? apiError.message : "Unknown error"}`;
        continue; // Try next API
      }
    }

    // If no images found from any API
    if (images.length === 0) {
      res.status(503).json({
        error: `Could not fetch images: ${lastError || "All APIs failed"}`,
        images: [],
        provider: null,
      });
      return;
    }

    // Update API key usage (track that we used this key)
    if (usedKeyId) {
      await execute(
        `UPDATE api_keys
         SET last_used_at = NOW()
         WHERE id = ?`,
        [usedKeyId],
      );
    }

    // STEP 2: Deduct tokens after success
    console.log(`✅ Find Image success - Deducting ${requiredTokens} tokens`);
    const deductResult = await deductTokens(
      userId,
      requiredTokens,
      "FIND_IMAGE_SERP",
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 3: Return response with token information
    res.json({
      images,
      provider: usedProvider,
      error: null,
      tokensUsed: requiredTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error finding images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleWriteMore: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { content, title, keywords, language = "vi" } = req.body;

    // Use gpt-3.5-turbo as default model for write more
    const writeMoreModel = "gpt-3.5-turbo";

    // STEP 1: Estimate tokens (based on typical write-more output ~500 words)
    const estimatedTokens = await calculateTokens(
      "Lorem ipsum dolor sit amet ".repeat(70),
      "write_more",
      false,
      writeMoreModel,
    ); // ~500 words estimate
    console.log(`💰 Write More - Estimated tokens: ${estimatedTokens}`);

    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "WRITE_MORE",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${estimatedTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "Write More",
      });
    }

    // Get OpenAI API key from database
    const apiKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          "OpenAI API key not configured. Please add it in Admin > Quản lý API",
      });
      return;
    }

    const apiKey = apiKeys[0].api_key;

    // Determine language instruction
    const languageInstruction =
      language === "vi"
        ? "Write in Vietnamese (Tiếng Việt)."
        : language === "en"
          ? "Write in English."
          : `Write in ${language}.`;

    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("write_more");
    console.log("✅ Using hardcoded system prompt for expand_content");

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("expand_content");

    let prompt = "";

    if (promptTemplate) {
      // Use database prompt template
      if (content && content.trim()) {
        // Remove HTML tags from content for better context
        const plainContent = content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Interpolate variables in user prompt template
        prompt = interpolatePrompt(promptTemplate.prompt_template, {
          content: plainContent,
          language_instruction: languageInstruction,
        });
      } else if (title) {
        // If no content, generate from title (fallback behavior)
        prompt = `Write a detailed article about "${title}". ${languageInstruction}`;
        if (keywords && Array.isArray(keywords) && keywords.length > 0) {
          prompt += ` Make sure to include and focus on these keywords: ${keywords.join(", ")}.`;
        }
        prompt += ` Return plain text only, no HTML tags.`;
      }
    } else {
      // FALLBACK: Use hardcoded prompts if database prompt not found
      if (content && content.trim()) {
        // Remove HTML tags from content for better context
        const plainContent = content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        prompt = `Here is the text that was just written:\n\n"${plainContent}"\n\nContinue writing from this point. ${languageInstruction} Write naturally as if you're continuing the same thought. Do NOT repeat or rewrite any of the text above. Only write NEW content that follows logically. Write in the same language and style as the original text. Return plain text only, no HTML tags.`;
      } else if (title) {
        prompt = `Write a detailed article about "${title}". ${languageInstruction}`;
        if (keywords && Array.isArray(keywords) && keywords.length > 0) {
          prompt += ` Make sure to include and focus on these keywords: ${keywords.join(", ")}.`;
        }
        prompt += ` Return plain text only, no HTML tags.`;
      } else {
        res.status(400).json({
          error: "Please provide content, title, or keywords",
        });
        return;
      }
    }

    // Validate we have prompts
    if (!prompt || !systemPrompt) {
      res.status(400).json({
        error: "Please provide content, title, or keywords",
      });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: writeMoreModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      res.status(500).json({ error: "Failed to call OpenAI API" });
      return;
    }

    const data = await response.json();
    const writtenContent = data.choices[0]?.message?.content?.trim();

    if (!writtenContent) {
      res.status(500).json({ error: "No response from OpenAI" });
      return;
    }

    // STEP 2: Calculate actual tokens based on word count WITH cost multiplier
    const writtenWordCount = countWords(writtenContent);
    const actualTokens = await calculateTokens(
      writtenContent,
      "write_more",
      false,
      writeMoreModel,
    );
    console.log(
      `✅ Write More success - ${writtenWordCount} words, ${actualTokens} tokens`,
    );

    // STEP 3: Deduct tokens from user account
    const deductResult = await deductTokens(userId, actualTokens, "WRITE_MORE");

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 4: Return response with token information
    res.json({
      writtenContent,
      tokensUsed: actualTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error writing more:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ========== GENERATE OUTLINE ==========
interface GenerateOutlineRequest {
  keyword: string;
  language: string;
  length: string; // short, medium, long
  tone: string;
  model: string;
  websiteId?: string;
}

const handleGenerateOutline: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const { keyword, language, length, tone, model, websiteId } =
      req.body as GenerateOutlineRequest;

    if (!keyword || !language || !length) {
      res
        .status(400)
        .json({ error: "keyword, language, and length are required" });
      return;
    }

    // Get userId for token management
    const userId = (req as any).userId;

    // Estimate required tokens (outline is relatively small)
    const estimatedTokens = 1000; // Outline generation is cheaper than full article
    console.log(`💰 Generate Outline - Estimated tokens: ${estimatedTokens}`);

    // STEP 1: Check if user has enough tokens BEFORE generating
    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "GENERATE_OUTLINE",
    );

    if (!tokenCheck.allowed) {
      return res.status(403).json({
        error: tokenCheck.error || "Insufficient tokens",
        requiredTokens: estimatedTokens,
        availableTokens: tokenCheck.remainingTokens || 0,
        featureName: "Generate Outline",
      });
    }

    // Optional: load website knowledge if websiteId is provided
    let websiteKnowledge: string | undefined;
    if (websiteId) {
      const websiteRows = await query<any>(
        `SELECT knowledge FROM websites WHERE id = ? AND user_id = ? LIMIT 1`,
        [websiteId, userId],
      );
      if (websiteRows && websiteRows.length > 0 && websiteRows[0].knowledge) {
        websiteKnowledge = websiteRows[0].knowledge as string;
      }
    }

    // Determine number of H2 and H3 sections based on length
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

    // Delegate to aiService.generateOutline so it can also inject website knowledge
    const outlineResult = await generateOutline({
      keyword,
      language,
      length,
      tone,
      model,
      userId,
      websiteKnowledge,
    });

    if (!outlineResult.success || !outlineResult.outline) {
      return res.status(500).json({ error: outlineResult.error || "Failed to generate outline" });
    }

    let outline = outlineResult.outline;

    if (!outline) {
      res.status(500).json({ error: "No outline generated" });
      return;
    }

    // Add "Kết luận" section if not present
    if (
      !outline.toLowerCase().includes("kết luận") &&
      !outline.toLowerCase().includes("conclusion")
    ) {
      outline += "\n[h2] Kết luận";
      console.log('✅ Added "Kết luận" section to outline');
    }

    res.status(200).json({
      success: true,
      outline: outline,
      config: config,
      tokensUsed: outlineResult.tokensUsed,
      remainingTokens: tokenCheck.remainingTokens,
    });
  } catch (error) {
    console.error("Error generating outline:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

interface GenerateArticleRequest {
  keyword: string;
  language: string;
  outlineType: string;
  outlineLength?: string;
  customOutline?: string;
  aiOutlineStyle?: string;
  tone: string;
  model: string;
  length?: string; // Short, Medium, Long
  // SEO Options
  internalLinks?: string; // Format: Keyword|Link\nKeyword2|Link2
  endContent?: string; // Content to append at end
  boldKeywords?: {
    mainKeyword?: boolean;
    headings?: boolean;
  };
  // Auto insert images
  autoInsertImages?: boolean;
  maxImages?: number; // Max number of images to insert (default 5, max 10)
  // Google Search Knowledge
  useGoogleSearch?: boolean; // When true, use Gemini 2.5 Flash with google-ai provider
  // Website Knowledge
  websiteId?: string; // Optional website ID to use knowledge from
}

const handleGenerateArticle: RequestHandler = async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(
    `\n========== 📝 GENERATE ARTICLE REQUEST [${requestId}] ==========`,
  );

  // Helper function to send SSE message (defined outside try-catch so it's available in catch)
  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!(await verifyUser(req, res))) {
      console.log(`❌ [${requestId}] User verification failed`);
      return;
    }

    const {
      keyword,
      language,
      outlineType,
      tone,
      model,
      length,
      customOutline,
      internalLinks,
      endContent,
      boldKeywords,
      autoInsertImages,
      maxImages,
      useGoogleSearch,
      websiteId,
    } = req.body as GenerateArticleRequest;

    // Debug: Log received data
    console.log(`📥 [${requestId}] Received request body:`, {
      keyword,
      language,
      outlineType,
      tone,
      model,
      length,
      hasCustomOutline: !!customOutline,
      customOutlineLength: customOutline?.length || 0,
      internalLinks: internalLinks || "NONE",
      endContent: endContent || "NONE",
      boldKeywords,
      useGoogleSearch: useGoogleSearch || false,
      websiteId: websiteId || "NONE",
    });

    // Parse keywords: "Xe Mazda, Xe Mazda 2, Xe Mazda 3"
    // → primaryKeyword: "Xe Mazda"
    // → secondaryKeywords: ["Xe Mazda 2", "Xe Mazda 3"]
    const keywordsArray = keyword
      .split(",")
      .map((kw: string) => kw.trim())
      .filter((kw: string) => kw.length > 0);
    const primaryKeyword = keywordsArray[0] || keyword;
    const secondaryKeywords = keywordsArray.slice(1);

    console.log("🔑 Keywords parsed:", {
      primary: primaryKeyword,
      secondary: secondaryKeywords,
      all: keywordsArray,
    });

    if (!keyword || !language || !tone || !model) {
      res.status(400).json({
        error: "keyword, language, tone, and model are required",
      });
      return;
    }

    // ========== GET API KEY USING HELPER ==========
    const modelConfig = await getApiKeyForModel(model, useGoogleSearch);

    if (!modelConfig) {
      const provider =
        model.toLowerCase().includes("gemini") || useGoogleSearch
          ? "Google AI"
          : "OpenAI";
      res.status(503).json({
        error: `${provider} API key not configured. Please add it in Admin > Quản lý API`,
      });
      return;
    }

    const { apiKey, provider, actualModel } = modelConfig;
    console.log(
      `✅ [${requestId}] Using ${provider} with model: ${actualModel}`,
    );

    // Get userId for token management
    const userId = (req as any).userId;

    // Determine required tokens based on article length
    const lengthKey = (length || "medium").toLowerCase();
    const tokenCostMap: Record<string, number> = {
      short: TOKEN_COSTS.WRITE_ARTICLE_SHORT,
      medium: TOKEN_COSTS.WRITE_ARTICLE_MEDIUM,
      long: TOKEN_COSTS.WRITE_ARTICLE_LONG,
    };
    const requiredTokens =
      tokenCostMap[lengthKey] || TOKEN_COSTS.WRITE_ARTICLE_MEDIUM;

    console.log(
      `💰 Generate Article - Required tokens: ${requiredTokens} for ${lengthKey} article`,
    );

    // STEP 1: Check if user has enough tokens BEFORE generating
    const tokenCheck = await checkTokensMiddleware(
      userId,
      requiredTokens,
      "GENERATE_ARTICLE",
    );

    if (!tokenCheck.allowed) {
      return res.status(403).json({
        error: tokenCheck.error || "Insufficient tokens",
        requiredTokens,
        availableTokens: tokenCheck.remainingTokens || 0,
        featureName: "Generate Article",
      });
    }

    // Language mapping for proper names
    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    // Build language instruction
    const languageInstruction =
      language === "vi"
        ? "Write in Vietnamese (Tiếng Việt)."
        : language === "en"
          ? "Write in English."
          : `Write in ${language}.`;

    // Normalize length value early for consistent use
    const normalizedLength = (length || "medium").toLowerCase().trim();
    console.log(
      `📏 [${requestId}] Article length: "${length}" → normalized: "${normalizedLength}"`,
    );

    // Generate content writing rules using helper function
    const contentRules = generateContentWritingRules(
      normalizedLength,
      outlineType,
    );
    console.log(
      `📋 [${requestId}] Using config for "${normalizedLength}" with "${outlineType}": ${contentRules.minWords}-${contentRules.maxWords} words`,
    );

    // Create lengthConfig object for backward compatibility with existing code
    const lengthConfig = {
      minWords: contentRules.minWords,
      maxWords: contentRules.maxWords,
      writingStyle: contentRules.writingStyle,
      h2Paragraphs: 2, // Default for compatibility
      h3Paragraphs: 2,
      paragraphWords: 100,
    };

    const actualH2Paragraphs = 2; // Default for compatibility
    const actualH3Paragraphs = 2;

    const lengthInstruction = `${contentRules.writingStyle}

${contentRules.openingRules}

${contentRules.paragraphRules}

⚠️ ARTICLE LENGTH TARGET:
- Target: ${contentRules.minWords}–${contentRules.maxWords} words total
- Make sure to reach this target by providing comprehensive, detailed content`;

    //  ========== Use HARDCODED System Prompt ==========
    // System prompts are now centralized in server/config/systemPrompts.ts
    let systemPrompt = getSystemPrompt("generate_article");
    console.log("✅ Using hardcoded system prompt for generate_article");

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("generate_article");

    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt template with variable interpolation
      console.log("✅ Using database prompt template for generate_article");

      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
        tone: tone,
        length_instruction: lengthInstruction,
      });

      console.log(
        "📝 User prompt preview:",
        userPrompt.substring(0, 150) + "...",
      );
    } else {
      // FALLBACK: Use hardcoded user prompt
      console.log(
        "⚠️ Database prompt not found, using fallback hardcoded user prompt",
      );
      userPrompt = `Write a comprehensive article about: "${keyword}"

REMEMBER: Each heading (h2, h3) must have MULTIPLE paragraphs (${lengthConfig.h2Paragraphs} for h2, ${lengthConfig.h3Paragraphs} for h3). 
DO NOT write just 1 paragraph per heading. Write detailed, in-depth content for each section.`;
    }
    // ===============================================

    // ========== INJECT WEBSITE KNOWLEDGE IF PROVIDED ==========
    if (websiteId && websiteId.trim()) {
      try {
        console.log(
          `🌐 [${requestId}] Querying website knowledge for websiteId: ${websiteId}`,
        );

        const website = await queryOne<any>(
          "SELECT id, name, knowledge FROM websites WHERE id = ? AND user_id = ?",
          [websiteId, userId],
        );

        if (website && website.knowledge) {
          console.log(
            `✅ [${requestId}] Found website: "${website.name}" with knowledge (${website.knowledge.length} chars)`,
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📋 [${requestId}] FULL KNOWLEDGE CONTENT:`);
          console.log(website.knowledge);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          // Inject knowledge into system prompt
          const originalPromptLength = systemPrompt.length;
          systemPrompt = injectWebsiteKnowledge(
            systemPrompt,
            website.knowledge,
          );
          const enhancedPromptLength = systemPrompt.length;

          console.log(
            `✅ [${requestId}] Website knowledge injected into system prompt`,
          );
          console.log(
            `📊 [${requestId}] Prompt size: ${originalPromptLength} → ${enhancedPromptLength} (+${enhancedPromptLength - originalPromptLength} chars)`,
          );
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(
            `📋 [${requestId}] ENHANCED SYSTEM PROMPT (showing full prompt for verification):`,
          );
          console.log(systemPrompt);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        } else if (website && !website.knowledge) {
          console.log(
            `⚠️ [${requestId}] Website "${website.name}" found but has no knowledge`,
          );
        } else {
          console.log(
            `⚠️ [${requestId}] Website not found or doesn't belong to user`,
          );
        }
      } catch (error) {
        console.error(
          `❌ [${requestId}] Error querying website knowledge:`,
          error,
        );
        // Continue without knowledge - don't fail the request
      }
    } else {
      console.log(
        `ℹ️ [${requestId}] No websiteId provided, skipping knowledge injection`,
      );
    }
    // ===============================================

    // ========== AUTO-GENERATE OUTLINE FOR "NO OUTLINE" AND "AI OUTLINE" OPTIONS ==========
    let autoGeneratedOutline = "";

    // Generate outline for both "no-outline" and "ai-outline" when customOutline is empty
    if (
      (outlineType === "no-outline" || outlineType === "ai-outline") &&
      (!customOutline || !customOutline.trim())
    ) {
      // Automatically generate an outline internally
      console.log(
        `📝 [${requestId}] Auto-generating outline for '${outlineType}' option...`,
      );
      console.log(
        `   Keyword: "${primaryKeyword}", Length: ${normalizedLength}, Secondary: [${secondaryKeywords.join(", ")}]`,
      );

      const outlineConfig: Record<
        string,
        { h2Count: number; h3PerH2: number }
      > = {
        short: { h2Count: 4, h3PerH2: 2 },
        medium: { h2Count: 5, h3PerH2: 3 },
        long: { h2Count: 7, h3PerH2: 4 }, // Restore về giá trị cũ
      };

      const config = outlineConfig[normalizedLength] || outlineConfig.medium;

      // Build secondary keywords instruction
      let secondaryKeywordsInstruction = "";
      if (secondaryKeywords.length > 0) {
        secondaryKeywordsInstruction = `\n- Secondary Keywords (incorporate naturally into H2/H3 headings): ${secondaryKeywords.join(", ")}`;
      }

      // ========== Load outline prompt from database ==========
      const outlinePromptTemplate = await loadPrompt("generate_outline");

      let outlineSystemPrompt = "";
      let outlineUserPrompt = "";

      if (outlinePromptTemplate) {
        // Use database prompt with variable interpolation
        const languageName = language === "vi" ? "Vietnamese" : language;
        const lengthDescription = `${length} - ${config.h2Count} H2 sections with ${config.h3PerH2} H3 subsections each`;

        outlineSystemPrompt = outlinePromptTemplate.system_prompt;

        outlineUserPrompt = interpolatePrompt(
          outlinePromptTemplate.prompt_template,
          {
            keyword: primaryKeyword,
            language: languageName,
            length_description: lengthDescription,
            tone: tone,
            h2_count: config.h2Count.toString(),
            h3_per_h2: config.h3PerH2.toString(),
          },
        );

        // Add secondary keywords instruction if needed
        if (secondaryKeywordsInstruction) {
          outlineUserPrompt += secondaryKeywordsInstruction;
        }
      } else {
        // FALLBACK: Use hardcoded prompts
        outlineSystemPrompt =
          "You are an expert SEO content strategist. Create well-structured article outlines.";

        outlineUserPrompt = `Create a detailed article outline about: "${primaryKeyword}"

REQUIREMENTS:
- Language: ${language === "vi" ? "Vietnamese" : language}
- Tone/Style: ${tone}
- Primary Keyword: ${primaryKeyword} (focus of the article)${secondaryKeywordsInstruction}
- Total H2 sections: ${config.h2Count}
- H3 subsections per H2: ${config.h3PerH2}
- Naturally incorporate secondary keywords into relevant H2 or H3 headings where appropriate

OUTPUT FORMAT:
[h2] Main Section Title 1
[h3] Subsection 1.1
[h3] Subsection 1.2
[h2] Main Section Title 2
[h3] Subsection 2.1
... continue for all ${config.h2Count} H2 sections

Create the outline now:`;
      }
      // ===============================================

      try {
        // Only auto-generate outline if using OpenAI
        // Gemini will generate outline inline with the article content
        if (provider === "openai") {
          console.log(
            `📝 [${requestId}] Auto-generating outline with OpenAI...`,
          );
          const outlineResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content: outlineSystemPrompt,
                  },
                  {
                    role: "user",
                    content: outlineUserPrompt,
                  },
                ],
                temperature: 0.7,
                max_tokens: 1000,
              }),
            },
          );

          if (outlineResponse.ok) {
            const outlineData = await outlineResponse.json();
            autoGeneratedOutline =
              outlineData.choices[0]?.message?.content?.trim() || "";

            // Add "Kết luận" section if not present
            if (
              autoGeneratedOutline &&
              !autoGeneratedOutline.toLowerCase().includes("kết luận") &&
              !autoGeneratedOutline.toLowerCase().includes("conclusion")
            ) {
              autoGeneratedOutline += "\n[h2] Kết luận";
              console.log(
                '✅ Added "Kết luận" section to auto-generated outline',
              );
            }

            console.log("✅ Auto-generated outline successfully");
          }
        } else {
          console.log(
            `📝 [${requestId}] Skipping outline generation for ${provider} - will generate inline`,
          );
        }
      } catch (error) {
        console.error(
          "⚠️ Failed to auto-generate outline, will proceed without it:",
          error,
        );
      }
    }
    // ====================================================================

    // Add outline instruction if provided
    if (customOutline && customOutline.trim()) {
      // User provided custom outline (from "your-outline" or "ai-outline" after clicking "Tạo outline")
      console.log(`📋 Using custom outline (${outlineType})`);
      userPrompt += `\n\n⚠️ CRITICAL - Follow this outline structure EXACTLY:\n${customOutline}\n\nWrite detailed content for each section in the outline.
      
⚠️ WRITING REQUIREMENTS FOR EACH SECTION (MUST FOLLOW):
- EVERY SINGLE HEADING (<h2> and <h3>) MUST HAVE ITS OWN CONTENT
- Each <h2> section MUST have AT LEAST ${actualH2Paragraphs} separate <p> paragraphs (minimum ${actualH2Paragraphs} paragraphs per H2)
- Each <h3> subsection MUST have AT LEAST ${actualH3Paragraphs} separate <p> paragraphs (minimum ${actualH3Paragraphs} paragraphs per H3)
- Each paragraph MUST be ${lengthConfig.paragraphWords}+ words (comprehensive and detailed)
- FORBIDDEN: Writing only 1 paragraph per heading - this is STRICTLY PROHIBITED
- FORBIDDEN: Skipping <h3> headings or not writing content for them
- REQUIRED: Write content for BOTH <h2> AND <h3> headings
- REQUIRED: Multiple perspectives, examples, deep analysis for each section
- Do not skip any headings in the outline`;
    } else if (autoGeneratedOutline) {
      // Use auto-generated outline for "no-outline" or "ai-outline" when no custom outline provided
      console.log(
        `📋 Using auto-generated outline (${outlineType}) with ${actualH2Paragraphs} paragraphs per H2, ${actualH3Paragraphs} paragraphs per H3`,
      );
      userPrompt += `\n\n⚠️ CRITICAL - Follow this outline structure EXACTLY:\n${autoGeneratedOutline}\n\nWrite detailed content for each section in the outline.

⚠️ WRITING REQUIREMENTS FOR EACH SECTION (MUST FOLLOW):
- EVERY SINGLE HEADING (<h2> and <h3>) MUST HAVE ITS OWN CONTENT
- Each <h2> section MUST have AT LEAST ${actualH2Paragraphs} separate <p> paragraphs (minimum ${actualH2Paragraphs} paragraphs per H2)
- Each <h3> subsection MUST have AT LEAST ${actualH3Paragraphs} separate <p> paragraphs (minimum ${actualH3Paragraphs} paragraphs per H3)
- Each paragraph MUST be ${lengthConfig.paragraphWords}+ words (comprehensive and detailed)
- FORBIDDEN: Writing only 1 paragraph per heading - this is STRICTLY PROHIBITED
- FORBIDDEN: Skipping <h3> headings or not writing content for them
- REQUIRED: Write content for BOTH <h2> AND <h3> headings
- REQUIRED: Multiple perspectives, examples, deep analysis for each section
- Do not skip any headings in the outline
- Ensure the article reaches ${lengthConfig.minWords}-${lengthConfig.maxWords} words total`;
    } else {
      // No outline at all - should not happen in practice
      console.log(
        `⚠️ No outline available for ${outlineType}, AI will create structure`,
      );
      userPrompt += `\nPlease structure the article with multiple detailed sections using <h2> and <h3> tags.`;
    }

    // ========== SETUP STREAMING RESPONSE ==========
    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    // ========== GENERATE ARTICLE USING AI WITH STREAMING ==========
    let content = "";
    let finishReason = "";

    // Adjust max_tokens based on article length (for both OpenAI and Gemini)
    // normalizedLength already declared above, just log the token limits
    // FIXED: GPT-3.5-turbo max_tokens limit is 4096, not higher
    const maxTokensMap: Record<string, number> = {
      short: 3000,
      medium: 4096,
      long: 4096,
    };
    const maxTokens = maxTokensMap[normalizedLength] || maxTokensMap.medium;

    const geminiMaxTokensMap: Record<string, number> = {
      short: 8192,
      medium: 12000,
      long: 16000,
    };
    const geminiMaxTokens =
      geminiMaxTokensMap[normalizedLength] || geminiMaxTokensMap.medium;

    console.log(
      `🎯 [${requestId}] Token limits - OpenAI: ${maxTokens}, Gemini: ${geminiMaxTokens}`,
    );
    console.log(
      `🔧 [${requestId}] Provider: ${provider}, Model: ${actualModel}, useGoogleSearch: ${useGoogleSearch}`,
    );

    // ========== GOOGLE WEB SEARCH INTEGRATION ==========
    let searchContext = "";
    let searchProvider = "";

    if (useGoogleSearch) {
      try {
        sendSSE("status", {
          message: "🔍 Đang tìm kiếm thông tin trên Google...",
          progress: 5,
        });
        console.log(
          `[${requestId}] 🌐 Starting Google Web Search for keyword: "${keyword}"`,
        );

        const searchData = await searchGoogleWeb(keyword, language, requestId);

        if (searchData.results.length > 0) {
          searchProvider = searchData.provider;
          console.log(
            `[${requestId}] ✅ Found ${searchData.results.length} web results from ${searchProvider}`,
          );

          // Aggregate search results into context
          searchContext = searchData.results
            .map(
              (item, idx) =>
                `[${idx + 1}] ${item.title}\n${item.snippet}\nSource: ${item.source}\nLink: ${item.link}`,
            )
            .join("\n\n");

          sendSSE("status", {
            message: `✅ Đã tìm thấy ${searchData.results.length} kết quả từ ${searchProvider}`,
            progress: 10,
          });

          console.log(
            `[${requestId}] 📝 Search context length: ${searchContext.length} characters`,
          );
          console.log(
            `[${requestId}] 📋 First 500 chars of context: ${searchContext.substring(0, 500)}...`,
          );
        } else {
          console.log(
            `[${requestId}] ⚠️ No search results found, proceeding without search context`,
          );
          sendSSE("status", {
            message: "⚠️ Không tìm thấy kết quả, tiếp tục viết bài...",
            progress: 10,
          });
        }
      } catch (searchError) {
        console.error(`[${requestId}] ❌ Google search failed:`, searchError);
        sendSSE("status", {
          message:
            "⚠️ Tìm kiếm thất bại, tiếp tục viết bài không có tham khảo...",
          progress: 10,
        });
        // Continue without search context - don't fail the entire request
      }
    }

    // Send initial status
    sendSSE("status", {
      message: "Bắt đầu tạo bài viết...",
      progress: useGoogleSearch ? 15 : 0,
    });

    // ========== INJECT GOOGLE SEARCH CONTEXT INTO USER PROMPT (FOR OPENAI) ==========
    if (searchContext) {
      console.log(
        `[${requestId}] 📚 Injecting Google search context into user prompt`,
      );
      userPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 GOOGLE SEARCH RESULTS - USE THIS INFORMATION AS REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following are real search results from ${searchProvider} about "${keyword}".
Use this information to write a comprehensive, well-researched article:

${searchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ INSTRUCTIONS FOR USING SEARCH RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ SYNTHESIZE - Combine information from multiple sources
2. ✅ REWRITE - Do NOT copy directly, rewrite in your own words  
3. ✅ FACT-CHECK - Ensure accuracy by cross-referencing sources
4. ✅ ADD VALUE - Include your analysis and insights
5. ✅ CITE NATURALLY - Mention sources when appropriate
6. ✅ FILL GAPS - Use this information to write comprehensive content for ALL outline sections

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      console.log(
        `[${requestId}] ✅ Search context added to user prompt (${searchContext.length} chars)`,
      );
    }
    // ===============================================

    if (provider === "google-ai") {
      // Use Gemini API (with or without Google Search grounding)
      console.log(
        `🔍 [${requestId}] Using Gemini API ${useGoogleSearch ? "WITH" : "WITHOUT"} Google Search knowledge`,
      );

      // Build comprehensive prompt for Gemini with outline
      let geminiPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Inject search context if available
      if (searchContext) {
        console.log(
          `[${requestId}] 📚 Injecting Google search context into prompt`,
        );
        geminiPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 GOOGLE SEARCH RESULTS - USE THIS INFORMATION AS REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following are real search results from ${searchProvider} about "${keyword}".
Use this information to write a comprehensive, well-researched article:

${searchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ INSTRUCTIONS FOR USING SEARCH RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ SYNTHESIZE - Combine information from multiple sources
2. ✅ REWRITE - Do NOT copy directly, rewrite in your own words
3. ✅ FACT-CHECK - Ensure accuracy by cross-referencing sources
4. ✅ ADD VALUE - Include your analysis and insights
5. ✅ CITE NATURALLY - Mention sources when appropriate (e.g., "According to [source]...")
6. ✅ FILL GAPS - Use this information to write comprehensive content for ALL outline sections

🚨 CRITICAL: If a heading in your outline lacks information from the search results above, 
you should still write content for it using your knowledge, but try to incorporate 
any relevant information from the search results when possible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      }

      // CRITICAL: Add HTML format requirements with detailed structure guidance
      geminiPrompt += `\n\n⚠️ CRITICAL OUTPUT FORMAT REQUIREMENTS - MUST FOLLOW EXACTLY:

0. WRITING STYLE REQUIREMENTS:
${lengthConfig.writingStyle}

1. HTML STRUCTURE (MANDATORY):
   - Use <p>...</p> for EVERY paragraph
   - Use <h2>...</h2> for main section headings
   - Use <h3>...</h3> for subsection headings
   - Use <strong>...</strong> for bold/emphasis
   - Use <ul><li>...</li></ul> for bullet lists
   - Use <ol><li>...</li></ol> for numbered lists
   - Use <table><tr><td>...</td></tr></table> for tables

2. PARAGRAPH RULES (MANDATORY):
   - EVERY SINGLE HEADING (<h2> and <h3>) MUST HAVE ITS OWN CONTENT
   - Each <h2> section MUST have AT LEAST ${actualH2Paragraphs} separate <p> paragraphs
   - Each <h3> subsection MUST have AT LEAST ${actualH3Paragraphs} separate <p> paragraphs
   - Each paragraph MUST be ${lengthConfig.paragraphWords}+ words (detailed and comprehensive)
   - FORBIDDEN: Writing only 1 paragraph per heading
   - FORBIDDEN: Skipping <h3> headings - MUST write content for ALL <h3> headings
   - ALWAYS put line breaks between paragraphs (use \\n\\n)
   - DO NOT write all content in one continuous line

3. FORBIDDEN FORMATS:
   - NO Markdown syntax (##, **, -, etc.)
   - NO plain text without HTML tags
   - NO single-line output without paragraph breaks
   - NO skipping outline sections (especially <h3> headings)
   - NO writing only 1 paragraph per heading

4. EXAMPLE OF CORRECT FORMAT:
<h2>Main Section Title</h2>

<p>First detailed paragraph for H2 with ${lengthConfig.paragraphWords}+ words explaining the topic thoroughly with examples and analysis...</p>

<p>Second detailed paragraph for H2 adding more depth, different perspectives, and practical information...</p>

${actualH2Paragraphs >= 3 ? "<p>Third paragraph for H2 providing additional insights, case studies, or expert opinions...</p>\n\n" : ""}
<h3>First Subsection Title</h3>

<p>First paragraph for this H3 with detailed content and comprehensive explanation...</p>

${actualH3Paragraphs >= 2 ? "<p>Second paragraph for this H3 with more information and additional details...</p>\n\n" : ""}${actualH3Paragraphs >= 3 ? "<p>Third paragraph for this H3 with even more depth and examples...</p>\n\n" : ""}
<h3>Second Subsection Title</h3>

<p>First paragraph for this H3 with detailed content...</p>

${actualH3Paragraphs >= 2 ? "<p>Second paragraph for this H3...</p>\n\n" : ""}${actualH3Paragraphs >= 3 ? "<p>Third paragraph for this H3...</p>\n\n" : ""}
⚠️ REMEMBER: 
- Write AT LEAST ${actualH2Paragraphs} paragraphs for EACH <h2>
- Write AT LEAST ${actualH3Paragraphs} paragraphs for EACH <h3>
- NEVER skip <h3> headings - they MUST have content too!

Start writing the article now with proper HTML structure and multiple paragraphs per section:`;

      console.log(
        `📊 Using Gemini maxOutputTokens: ${geminiMaxTokens} for length: ${length}`,
      );

      try {
        // Build request body for Gemini API
        const geminiRequestBody: any = {
          contents: [
            {
              parts: [
                {
                  text: geminiPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: geminiMaxTokens,
            topP: 0.95,
            topK: 40,
          },
        };

        // Only add google_search tool if useGoogleSearch is enabled
        if (useGoogleSearch) {
          console.log(
            `🔍 [${requestId}] Adding Google Search tool to Gemini request`,
          );
          geminiRequestBody.tools = [
            {
              google_search: {},
            },
          ];
        }

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(geminiRequestBody),
          },
        );

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.json().catch(() => ({}));
          console.error("❌ Gemini API error response:", {
            status: geminiResponse.status,
            statusText: geminiResponse.statusText,
            errorData,
          });
          sendSSE("error", {
            error: "Failed to call Gemini API",
            details: errorData?.error?.message || geminiResponse.statusText,
            status: geminiResponse.status,
          });
          res.end();
          return;
        }

        const geminiData = await geminiResponse.json();

        // Check for safety blocks or other issues
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
          console.error("❌ Gemini returned no candidates:", geminiData);
          sendSSE("error", {
            error: "Gemini API returned no content",
            details:
              "Content may have been blocked by safety filters or other restrictions",
            rawResponse: geminiData,
          });
          res.end();
          return;
        }

        content =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const rawFinishReason = geminiData.candidates?.[0]?.finishReason;

        // Gemini returns: STOP, MAX_TOKENS, SAFETY, RECITATION, OTHER
        // Map to our internal format: "stop" or "length"
        finishReason = rawFinishReason === "MAX_TOKENS" ? "length" : "stop";

        console.log(
          `✅ Gemini response received, length: ~${content.length / 4} words, finishReason: ${rawFinishReason} → ${finishReason}`,
        );

        if (!content) {
          console.error("❌ Gemini response has no text content");
          sendSSE("error", {
            message: "No response from Gemini API",
            details: "Gemini returned empty content",
            finishReason: rawFinishReason,
          });
          res.end();
          return;
        }

        // ✅ Remove code fence markers if present
        content = removeCodeFenceMarkers(content);
        console.log(`🧹 [${requestId}] Removed code fence markers if present`);

        // ✅ Check if Gemini returned Markdown instead of HTML and convert if needed
        const hasHtmlTags = /<h[23]>|<p>/.test(content);
        const hasMarkdown = /^#{1,6}\s/m.test(content);

        if (!hasHtmlTags || hasMarkdown) {
          console.log(
            `⚠️ [${requestId}] Gemini returned Markdown/plain text, converting to HTML...`,
          );

          // Convert Markdown to HTML
          content = content
            // Convert headings
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^# (.+)$/gm, "<h2>$1</h2>")
            // Convert bold
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.+?)__/g, "<strong>$1</strong>")
            // Convert italic
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/_(.+?)_/g, "<em>$1</em>")
            // Convert lists
            .replace(/^\* (.+)$/gm, "<li>$1</li>")
            .replace(/^- (.+)$/gm, "<li>$1</li>")
            // Wrap consecutive <li> in <ul>
            .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`)
            // Convert paragraphs (lines separated by blank lines)
            .split(/\n\n+/)
            .map((para) => {
              para = para.trim();
              if (!para) return "";
              // Skip if already has HTML tags
              if (
                para.startsWith("<h") ||
                para.startsWith("<p") ||
                para.startsWith("<ul") ||
                para.startsWith("<ol") ||
                para.startsWith("<table")
              ) {
                return para;
              }
              // Wrap in <p> tags
              return `<p>${para}</p>`;
            })
            .join("\n\n");

          // Convert Markdown tables to HTML tables
          content = convertMarkdownTablesToHtml(content);

          console.log(`✅ [${requestId}] Converted to HTML format`);
        }

        // ✅ Pseudo-streaming for Gemini: Send content in chunks to simulate streaming
        // This provides better UX even though Gemini doesn't support real streaming
        console.log(
          `📤 [${requestId}] Sending Gemini content via pseudo-streaming (${content.length} chars)`,
        );
        const chunkSize = 50; // Send 50 characters at a time for smooth display
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.substring(
            i,
            Math.min(i + chunkSize, content.length),
          );
          const accumulated = content.substring(
            0,
            Math.min(i + chunkSize, content.length),
          );
          sendSSE("content", { chunk, total: accumulated });

          // Small delay to prevent overwhelming the client
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        console.log(`✅ [${requestId}] Gemini pseudo-streaming completed`);
        console.log(
          `📊 [${requestId}] Content length after Gemini: ${content.length} chars, finishReason: ${finishReason}`,
        );
      } catch (error) {
        console.error(`❌ [${requestId}] Gemini API exception:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // ✅ Send error via SSE instead of JSON
        sendSSE("error", {
          error: "Failed to call Gemini API",
          details: errorMessage,
          type: error instanceof Error ? error.name : typeof error,
          timestamp: new Date().toISOString(),
        });
        res.end();
        return;
      }
    } else {
      // ========== USE OPENAI STREAMING HELPER ==========
      console.log(`🤖 [${requestId}] Using OpenAI API with streaming helper`);
      console.log(
        `📊 [${requestId}] Using max_tokens: ${maxTokens} for length: ${length}`,
      );

      const streamResult = await streamOpenAIResponse(
        apiKey,
        actualModel,
        systemPrompt,
        userPrompt,
        maxTokens,
        sendSSE,
        requestId,
      );

      if (!streamResult) {
        console.error(`❌ [${requestId}] OpenAI streaming failed`);
        res.end();
        return;
      }

      content = streamResult.content;
      finishReason = streamResult.finishReason;
      console.log(
        `✅ [${requestId}] OpenAI streaming completed: ${content.length} characters`,
      );
    }
    // ================================================

    // ========== VALIDATE OUTPUT FORMAT ==========
    const validateHtmlFormat = (
      text: string,
    ): { isValid: boolean; issues: string[] } => {
      const issues: string[] = [];

      // Check for HTML tags
      const hasH2 = /<h2[^>]*>/.test(text);
      const hasParagraphs = /<p[^>]*>/.test(text);

      // Check for Markdown syntax (should not exist)
      const hasMarkdownHeadings = /^#{1,6}\s/m.test(text);
      const hasMarkdownBold = /\*\*[^*]+\*\*/.test(text);
      const hasMarkdownList = /^[-*]\s/m.test(text);

      // Check for line breaks
      const hasLineBreaks = /\n\n/.test(text);
      const isSingleLine = !text.includes("\n") || text.split("\n").length < 5;

      if (!hasH2) issues.push("Missing <h2> headings");
      if (!hasParagraphs) issues.push("Missing <p> paragraphs");
      if (hasMarkdownHeadings) issues.push("Contains Markdown headings (##)");
      if (hasMarkdownBold) issues.push("Contains Markdown bold (**)");
      if (hasMarkdownList) issues.push("Contains Markdown lists (-)");
      if (isSingleLine)
        issues.push("Content appears to be single-line without proper breaks");
      if (!hasLineBreaks) issues.push("Missing line breaks between sections");

      return {
        isValid: issues.length === 0,
        issues,
      };
    };

    // Validate initial content
    const validation = validateHtmlFormat(content);
    if (!validation.isValid) {
      console.log("⚠️ Format validation issues detected:");
      validation.issues.forEach((issue) => console.log(`  - ${issue}`));
    } else {
      console.log("✅ Content format validated successfully");
    }
    // ================================================

    // ========== ENHANCED CONTINUATION LOGIC ==========
    // Continue writing until the article is complete
    let attemptCount = 1;
    const maxAttempts = 10; // Increased from 3 to 10 for longer articles

    // Function to check if outline is complete
    const checkOutlineCompletion = (
      content: string,
      outline: string,
    ): boolean => {
      if (!outline) return true; // No outline to check

      // Extract all [h2] headings from outline
      const outlineH2s = (outline.match(/\[h2\][^\n]+/gi) || []).map((h) =>
        h
          .replace(/\[h2\]\s*/i, "")
          .trim()
          .toLowerCase(),
      );

      // Extract all <h2> headings from content
      const contentH2s = (content.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || []).map(
        (h) =>
          h
            .replace(/<\/?h2[^>]*>/gi, "")
            .trim()
            .toLowerCase(),
      );

      console.log(
        `📊 Outline check: ${contentH2s.length}/${outlineH2s.length} H2 sections completed`,
      );

      // Check if all outline H2s are present in content
      const missingCount = outlineH2s.filter(
        (oh2) =>
          !contentH2s.some((ch2) => ch2.includes(oh2) || oh2.includes(ch2)),
      ).length;

      if (missingCount > 0) {
        console.log(`⚠️ ${missingCount} sections still missing from outline`);
        return false;
      }

      console.log(`✅ All outline sections completed`);
      return true;
    };

    const outlineToCheck = customOutline || autoGeneratedOutline || "";

    console.log(`\n🔄 [${requestId}] Starting continuation check...`);
    console.log(
      `📊 [${requestId}] Initial state: content=${content.length} chars, finishReason="${finishReason}", hasOutline=${!!outlineToCheck}`,
    );

    // IMPROVED: Continue if EITHER article was cut off OR outline is incomplete
    while (attemptCount < maxAttempts) {
      console.log(
        `\n🔍 [${requestId}] Continuation loop iteration ${attemptCount + 1}/${maxAttempts}`,
      );

      // Check if outline is complete
      const isOutlineComplete = outlineToCheck
        ? checkOutlineCompletion(content, outlineToCheck)
        : true;
      console.log(
        `📋 [${requestId}] Outline complete: ${isOutlineComplete}, finishReason: "${finishReason}"`,
      );

      // Stop only if:
      // 1. Outline is complete (or no outline to check)
      // 2. AND finish reason is "stop" (not cut off by token limit)
      if (isOutlineComplete && finishReason === "stop") {
        console.log(`✅ Article is complete, stopping continuation`);
        break;
      }

      // If outline is incomplete, continue regardless of finishReason
      if (!isOutlineComplete) {
        console.log(
          `⚠️ Outline incomplete, forcing continuation (Attempt ${attemptCount + 1}/${maxAttempts})`,
        );
      } else if (finishReason === "length") {
        console.log(
          `📝 Article was cut off by token limit, continuing (Attempt ${attemptCount + 1}/${maxAttempts})`,
        );
      }

      attemptCount++;

      // ========== Load continuation prompt from database ==========
      const continuePromptTemplate = await loadPrompt("continue_article");

      // Build detailed continuation prompt
      let continuationPrompt = ``;
      let continuationInstruction = "";
      let continuationRules = "";
      let outlineReference = "";

      if (outlineToCheck) {
        // ✅ IMPROVED: Detect both missing sections AND incomplete current section

        // Extract all outline sections (H2 and H3)
        const outlineH2s = (outlineToCheck.match(/\[h2\][^\n]+/gi) || []).map(
          (h) => h.replace(/\[h2\]\s*/i, "").trim(),
        );

        const outlineH3s = (outlineToCheck.match(/\[h3\][^\n]+/gi) || []).map(
          (h) => h.replace(/\[h3\]\s*/i, "").trim(),
        );

        // Extract content sections
        const contentH2s = (
          content.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || []
        ).map((h) => h.replace(/<\/?h2[^>]*>/gi, "").trim());

        const contentH3s = (
          content.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || []
        ).map((h) => h.replace(/<\/?h3[^>]*>/gi, "").trim());

        // Find missing H2 sections
        const missingH2s = outlineH2s.filter(
          (oh2) =>
            !contentH2s.some(
              (ch2) =>
                ch2.toLowerCase().includes(oh2.toLowerCase()) ||
                oh2.toLowerCase().includes(ch2.toLowerCase()),
            ),
        );

        // Find missing H3 sections
        const missingH3s = outlineH3s.filter(
          (oh3) =>
            !contentH3s.some(
              (ch3) =>
                ch3.toLowerCase().includes(oh3.toLowerCase()) ||
                oh3.toLowerCase().includes(ch3.toLowerCase()),
            ),
        );

        // ✅ Check if last section is incomplete (ends abruptly)
        const lastH2Match = content.match(/<h2[^>]*>([^<]+)<\/h2>(?:[^]*?)$/);
        const lastH3Match = content.match(/<h3[^>]*>([^<]+)<\/h3>(?:[^]*?)$/);

        let lastSectionIncomplete = false;
        let lastSectionName = "";

        if (lastH3Match) {
          // Check if last H3 has enough paragraphs
          const afterLastH3 = content.substring(content.lastIndexOf("<h3"));
          const paragraphsAfterH3 = (afterLastH3.match(/<p[^>]*>/g) || [])
            .length;

          if (paragraphsAfterH3 < actualH3Paragraphs) {
            lastSectionIncomplete = true;
            lastSectionName = lastH3Match[1].replace(/<[^>]+>/g, "").trim();
            console.log(
              `⚠️ Last H3 section "${lastSectionName}" incomplete: ${paragraphsAfterH3}/${actualH3Paragraphs} paragraphs`,
            );
          }
        } else if (lastH2Match) {
          // Check if last H2 has enough paragraphs
          const afterLastH2 = content.substring(content.lastIndexOf("<h2"));
          const paragraphsAfterH2 = (afterLastH2.match(/<p[^>]*>/g) || [])
            .length;

          if (paragraphsAfterH2 < actualH2Paragraphs) {
            lastSectionIncomplete = true;
            lastSectionName = lastH2Match[1].replace(/<[^>]+>/g, "").trim();
            console.log(
              `⚠️ Last H2 section "${lastSectionName}" incomplete: ${paragraphsAfterH2}/${actualH2Paragraphs} paragraphs`,
            );
          }
        }

        // Build continuation prompt based on what's missing
        if (lastSectionIncomplete) {
          console.log(`📝 Continuing incomplete section: "${lastSectionName}"`);
          continuationInstruction = `⚠️ CRITICAL INSTRUCTION - Complete the current section that was cut off:

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

CURRENT SECTION (INCOMPLETE):
"${lastSectionName}"`;

          continuationRules = `1. FIRST: Complete the section "${lastSectionName}" that was cut off in the middle
2. The article ended mid-section - continue writing from where it stopped
3. DO NOT start a new section or repeat existing content
4. DO NOT write the heading again - just continue the content
5. Add more paragraphs to complete this section (need ${lastH3Match ? actualH3Paragraphs : actualH2Paragraphs} paragraphs total per section)
6. Each paragraph: ${lengthConfig.paragraphWords}+ words (detailed and comprehensive)
7. Use proper HTML structure: <p>...</p> for each paragraph
8. Add line breaks (\\n\\n) between paragraphs

After completing the current section, if there are missing sections in the outline, write them next.`;

          outlineReference = `FULL OUTLINE FOR REFERENCE:
${outlineToCheck}

Continue writing to complete "${lastSectionName}" now:`;
        } else if (missingH2s.length > 0 || missingH3s.length > 0) {
          console.log(`📋 Missing H2 sections: ${missingH2s.join(", ")}`);
          console.log(`📋 Missing H3 sections: ${missingH3s.join(", ")}`);

          continuationInstruction = `⚠️ CRITICAL INSTRUCTION - Continue writing the article:

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

${missingH2s.length > 0 ? `MISSING H2 SECTIONS:\n${missingH2s.map((s) => `- ${s}`).join("\n")}\n\n` : ""}${missingH3s.length > 0 ? `MISSING H3 SECTIONS:\n${missingH3s.map((s) => `- ${s}`).join("\n")}\n\n` : ""}`;

          continuationRules = `1. Write the missing sections listed above
2. DO NOT repeat any content that was already written
3. DO NOT rewrite sections that are already complete
4. Continue seamlessly from where the article stopped
5. Each <h2> section: AT LEAST ${actualH2Paragraphs} detailed paragraphs (${lengthConfig.paragraphWords}+ words each)
6. Each <h3> subsection: AT LEAST ${actualH3Paragraphs} paragraphs (${lengthConfig.paragraphWords}+ words each)
7. FORBIDDEN: Writing only 1 paragraph per heading
8. FORBIDDEN: Skipping <h3> headings - MUST write content for ALL <h3> headings
9. REQUIRED: Write content for BOTH <h2> AND <h3> headings
10. Use proper HTML structure with line breaks (\\n\\n) between paragraphs`;

          outlineReference = `FULL OUTLINE FOR REFERENCE:
${outlineToCheck}

Start writing the missing sections now with multiple paragraphs per heading:`;
        } else {
          continuationInstruction = `Continue writing the article to reach the required length of ${lengthConfig.minWords}-${lengthConfig.maxWords} words.

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}`;

          continuationRules = `- Each <h2>: ${actualH2Paragraphs} paragraphs minimum
- Each <h3>: ${actualH3Paragraphs} paragraphs minimum
- Add more detail and depth WITHOUT repeating content already written`;

          outlineReference = `Follow the outline:
${outlineToCheck}`;
        }
      } else {
        continuationInstruction = `Continue writing the article from where it stopped.

⚠️ WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}`;

        continuationRules = `- Write ${actualH2Paragraphs} paragraphs per <h2> section
- Write ${actualH3Paragraphs} paragraphs per <h3> subsection
- Reach ${lengthConfig.minWords}-${lengthConfig.maxWords} words total`;

        outlineReference = "";
      }

      // Use database prompt if available, otherwise fallback to hardcoded
      if (continuePromptTemplate) {
        console.log("✅ Using database prompt for continue_article");
        continuationPrompt = interpolatePrompt(
          continuePromptTemplate.prompt_template,
          {
            continuation_instruction: continuationInstruction,
            continuation_rules: continuationRules,
            outline_reference: outlineReference,
            writing_style: lengthConfig.writingStyle,
            min_words: lengthConfig.minWords.toString(),
            max_words: lengthConfig.maxWords.toString(),
            h2_paragraphs: actualH2Paragraphs.toString(),
            h3_paragraphs: actualH3Paragraphs.toString(),
            paragraph_words: lengthConfig.paragraphWords.toString(),
          },
        );
      } else {
        console.log(
          "⚠️ Database prompt not found for continue_article, using fallback",
        );
        continuationPrompt = `${continuationInstruction}

⚠️ IMPORTANT RULES (MUST FOLLOW):
${continuationRules}

${outlineReference}`;
      }
      // ===============================================

      let continuationText = "";

      if (provider === "google-ai") {
        // Continue with Gemini API
        console.log(`🔍 [${requestId}] Continuing with Gemini API`);
        const geminiContinuationPrompt = `Previous content:\n${content}\n\n${continuationPrompt}\n\n⚠️ CRITICAL FORMAT REQUIREMENTS - CONTINUE WITH SAME FORMAT:

0. WRITING STYLE (MUST MAINTAIN):
${lengthConfig.writingStyle}

1. HTML STRUCTURE (MANDATORY):
   - Use <p>...</p> for EVERY paragraph
   - Use <h2>...</h2> for main section headings
   - Use <h3>...</h3> for subsection headings
   - ALWAYS put line breaks (\\n\\n) between paragraphs and sections

2. PARAGRAPH RULES (MUST FOLLOW):
   - EVERY SINGLE HEADING (<h2> and <h3>) MUST HAVE ITS OWN CONTENT
   - Each <h2> section: AT LEAST ${actualH2Paragraphs} separate paragraphs (minimum ${actualH2Paragraphs} per H2)
   - Each <h3> subsection: AT LEAST ${actualH3Paragraphs} separate paragraphs (minimum ${actualH3Paragraphs} per H3)
   - Each paragraph: ${lengthConfig.paragraphWords}+ words
   - FORBIDDEN: Writing only 1 paragraph per heading
   - FORBIDDEN: Skipping <h3> headings - MUST write content for ALL <h3> headings
   - DO NOT write all content in one continuous line

3. FORBIDDEN:
   - NO Markdown (##, **, -)
   - NO single-line output
   - NO skipping outline sections (especially <h3> headings)
   - NO writing only 1 paragraph per heading

⚠️ REMEMBER: 
- Write multiple paragraphs per heading (${actualH2Paragraphs} for H2, ${actualH3Paragraphs} for H3)
- NEVER skip <h3> headings - they MUST have content too!

Continue writing with proper HTML structure and multiple paragraphs per section:`;

        try {
          // Build continuation request body for Gemini API
          const geminiContinuationRequestBody: any = {
            contents: [
              {
                parts: [
                  {
                    text: geminiContinuationPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: geminiMaxTokens, // Use same maxOutputTokens as initial generation
              topP: 0.95,
              topK: 40,
            },
          };

          // Only add google_search tool if useGoogleSearch is enabled
          if (useGoogleSearch) {
            console.log(
              `🔍 [${requestId}] Adding Google Search tool to Gemini continuation request`,
            );
            geminiContinuationRequestBody.tools = [
              {
                google_search: {},
              },
            ];
          }

          const geminiContinuationResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(geminiContinuationRequestBody),
            },
          );

          if (!geminiContinuationResponse.ok) {
            console.error("Gemini continuation request failed, stopping...");
            break;
          }

          const geminiContinuationData =
            await geminiContinuationResponse.json();
          continuationText =
            geminiContinuationData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "";
          const rawContinuationFinish =
            geminiContinuationData.candidates?.[0]?.finishReason;
          finishReason =
            rawContinuationFinish === "MAX_TOKENS" ? "length" : "stop";

          console.log(
            `📝 Gemini continuation received: +${continuationText.length / 4} words, finishReason: ${rawContinuationFinish} → ${finishReason}`,
          );

          // ✅ Remove code fence markers if present
          if (continuationText) {
            continuationText = continuationText
              .replace(/^```html\s*/i, "")
              .replace(/\s*```$/i, "");
            console.log(
              `🧹 [${requestId}] Removed code fence markers from continuation`,
            );
          }

          // ✅ Convert Markdown to HTML if needed (same as initial generation)
          if (continuationText) {
            const hasHtmlTags = /<h[23]>|<p>/.test(continuationText);
            const hasMarkdown = /^#{1,6}\s/m.test(continuationText);

            if (!hasHtmlTags || hasMarkdown) {
              console.log(
                `⚠️ [${requestId}] Gemini continuation returned Markdown, converting...`,
              );
              continuationText = continuationText
                .replace(/^### (.+)$/gm, "<h3>$1</h3>")
                .replace(/^## (.+)$/gm, "<h2>$1</h2>")
                .replace(/^# (.+)$/gm, "<h2>$1</h2>")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/__(.+?)__/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/_(.+?)_/g, "<em>$1</em>")
                .replace(/^\* (.+)$/gm, "<li>$1</li>")
                .replace(/^- (.+)$/gm, "<li>$1</li>")
                .replace(
                  /(<li>.*<\/li>\n?)+/g,
                  (match) => `<ul>\n${match}</ul>\n`,
                )
                .split(/\n\n+/)
                .map((para) => {
                  para = para.trim();
                  if (!para) return "";
                  if (
                    para.startsWith("<h") ||
                    para.startsWith("<p") ||
                    para.startsWith("<ul") ||
                    para.startsWith("<ol") ||
                    para.startsWith("<table")
                  ) {
                    return para;
                  }
                  return `<p>${para}</p>`;
                })
                .join("\n\n");

              // Convert Markdown tables to HTML tables
              continuationText = convertMarkdownTablesToHtml(continuationText);
            }

            // ✅ Pseudo-streaming for Gemini continuation
            console.log(
              `📤 [${requestId}] Sending Gemini continuation via pseudo-streaming (${continuationText.length} chars)`,
            );
            const chunkSize = 50;
            for (let i = 0; i < continuationText.length; i += chunkSize) {
              const chunk = continuationText.substring(
                i,
                Math.min(i + chunkSize, continuationText.length),
              );
              const accumulated =
                content +
                "\n\n" +
                continuationText.substring(
                  0,
                  Math.min(i + chunkSize, continuationText.length),
                );
              sendSSE("content", { chunk, total: accumulated });
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
        } catch (error) {
          console.error("Gemini continuation error:", error);
          break;
        }
      } else {
        // Continue with OpenAI API with STREAMING
        sendSSE("status", {
          message: `Đang tiếp tục viết bài (lần ${attemptCount + 1})...`,
          progress: 50 + attemptCount * 5,
        });

        const continuationMessages = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
          {
            role: "assistant",
            content: content,
          },
          {
            role: "user",
            content: continuationPrompt,
          },
        ];

        const continuationResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: actualModel, // Use the mapped model name
              messages: continuationMessages,
              temperature: 0.7,
              max_tokens: maxTokens, // Use same max_tokens as initial generation
              stream: true, // Enable streaming for continuation
            }),
          },
        );

        if (!continuationResponse.ok) {
          console.error("OpenAI continuation request failed, stopping...");
          break;
        }

        // Process streaming continuation response
        const contReader = continuationResponse.body?.getReader();
        const contDecoder = new TextDecoder();

        if (!contReader) {
          console.error("No continuation stream, stopping...");
          break;
        }

        let contBuffer = "";
        continuationText = "";

        while (true) {
          const { done, value } = await contReader.read();

          if (done) {
            console.log("✅ OpenAI continuation streaming completed");
            break;
          }

          contBuffer += contDecoder.decode(value, { stream: true });
          const lines = contBuffer.split("\n");
          contBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

            if (trimmedLine.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(trimmedLine.substring(6));
                const delta = jsonData.choices?.[0]?.delta?.content;
                finishReason =
                  jsonData.choices?.[0]?.finish_reason || finishReason;

                if (delta) {
                  continuationText += delta;
                  // Send continuation chunk to client
                  sendSSE("content", {
                    chunk: delta,
                    total: content + "\n\n" + continuationText,
                  });
                }
              } catch (e) {
                console.error("Error parsing continuation SSE line:", e);
              }
            }
          }
        }
      }

      if (continuationText) {
        content += "\n\n" + continuationText;
        const totalWords = Math.round(content.length / 4);
        console.log(
          `📊 Article total length: ~${totalWords} words (target: ${lengthConfig.minWords}-${lengthConfig.maxWords})`,
        );

        // Re-check outline completion
        if (outlineToCheck) {
          const isNowComplete = checkOutlineCompletion(content, outlineToCheck);
          if (isNowComplete) {
            console.log(`✅ All outline sections now complete!`);
          }
        }
      } else {
        console.log(`⚠️ No continuation text received, stopping`);
        break;
      }
    }

    if (attemptCount >= maxAttempts) {
      console.log(
        `⚠️ Reached maximum continuation attempts (${maxAttempts}), article may be incomplete`,
      );

      // Final check
      if (outlineToCheck && !checkOutlineCompletion(content, outlineToCheck)) {
        console.log(
          `⚠️ WARNING: Outline is still incomplete after ${maxAttempts} attempts`,
        );
      }
    } else {
      console.log(
        `✅ Article generation completed in ${attemptCount} attempt(s)`,
      );
    }
    // ================================================================

    console.log(`\n📝 [${requestId}] Starting post-generation processing...`);
    console.log(
      `📊 [${requestId}] Current content length: ${content.length} characters`,
    );

    // ========== GENERATE TITLE, SEO TITLE, AND META DESCRIPTION ==========
    console.log(
      `🏷️ [${requestId}] Generating article metadata (Title, SEO Title, Meta Description)...`,
    );
    const languageName = languageNames[language] || "Vietnamese";

    // ========== Use HARDCODED System Prompt ==========
    let metadataSystemPrompt = getSystemPrompt("generate_article_title");
    console.log("✅ Using hardcoded system prompt for generate_article_title");

    // ========== Load ONLY User Prompt Template from database ==========
    const titlePromptTemplate = await loadPrompt("generate_article_title");

    let metadataUserPrompt = "";

    if (titlePromptTemplate) {
      // Enhanced prompt to generate all metadata at once
      metadataUserPrompt = `Generate metadata for an article about: "${keyword}" in ${languageName} language.

You MUST return a JSON object with this EXACT format (no markdown, no code blocks):
{
  "title": "Engaging article title (50-60 characters)",
  "seo_title": "SEO-optimized title with keyword (50-60 characters)",
  "meta_description": "Compelling meta description (150-160 characters)"
}

Requirements:
- Title: Natural, engaging, must include the main keyword
- SEO Title: Include keyword at the beginning, optimized for search engines
- Meta Description: Summarize the article value, include keyword, encourage clicks
- ALL fields MUST be in ${languageName} language
- Return ONLY the JSON object, nothing else`;
    } else {
      // FALLBACK: Use hardcoded user prompt
      metadataUserPrompt = `Generate metadata for: "${keyword}" in ${languageName}

Return JSON:
{
  "title": "Article title (50-60 chars)",
  "seo_title": "SEO title with keyword (50-60 chars)", 
  "meta_description": "Meta description (150-160 chars)"
}`;
    }

    // Use the same provider that generated the article
    let title: string;
    let seoTitle: string;
    let metaDescription: string;

    try {
      if (provider === "google-ai") {
        // Use Gemini for metadata
        console.log(`🔍 [${requestId}] Using Gemini to generate metadata...`);

        const geminiMetadataPrompt = `${metadataSystemPrompt}\n\n${metadataUserPrompt}`;

        const geminiMetadataResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: geminiMetadataPrompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
                topP: 0.95,
                topK: 40,
              },
            }),
          },
        );

        if (!geminiMetadataResponse.ok) {
          throw new Error(
            `Gemini metadata API failed: ${geminiMetadataResponse.status}`,
          );
        }

        const geminiMetadataData = await geminiMetadataResponse.json();
        const metadataText =
          geminiMetadataData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          "";

        // Parse JSON from response
        const jsonMatch = metadataText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const metadata = JSON.parse(jsonMatch[0]);
          title = metadata.title || keyword;
          seoTitle = metadata.seo_title || title;
          metaDescription =
            metadata.meta_description || `${keyword} - ${title}`;
          console.log(
            `✅ [${requestId}] Gemini metadata generated successfully`,
          );
        } else {
          throw new Error("Failed to parse JSON from Gemini response");
        }
      } else {
        // Use OpenAI for metadata
        console.log(
          `🤖 [${requestId}] Using OpenAI with model: ${actualModel} to generate metadata...`,
        );

        const metadataResponse = await fetch(
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
                {
                  role: "system",
                  content: metadataSystemPrompt,
                },
                {
                  role: "user",
                  content: metadataUserPrompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 300,
              response_format: { type: "json_object" },
            }),
          },
        );

        if (!metadataResponse.ok) {
          throw new Error(
            `OpenAI metadata API failed: ${metadataResponse.status}`,
          );
        }

        const metadataData = await metadataResponse.json();
        const metadataText =
          metadataData.choices[0]?.message?.content?.trim() || "{}";
        const metadata = JSON.parse(metadataText);

        title = metadata.title || keyword;
        seoTitle = metadata.seo_title || title;
        metaDescription = metadata.meta_description || `${keyword} - ${title}`;
        console.log(`✅ [${requestId}] OpenAI metadata generated successfully`);
      }

      console.log(`📋 [${requestId}] Generated metadata:`);
      console.log(`   Title: "${title}"`);
      console.log(`   SEO Title: "${seoTitle}"`);
      console.log(`   Meta Description: "${metaDescription}"`);
    } catch (error) {
      console.error(`❌ [${requestId}] Metadata generation failed:`, error);
      // Fallback to keyword
      title = keyword;
      seoTitle = keyword;
      metaDescription = `${keyword} - Comprehensive guide and information`;
      console.log(`⚠️ [${requestId}] Using fallback metadata based on keyword`);
    }
    // ========================================================

    // Generate meta description
    console.log(`🔗 [${requestId}] Generating slug...`);
    let slug = keyword
      .toString()
      .normalize("NFKD") // Normalize Unicode
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .toLowerCase()
      .trim()
      .replace(/[đĐ]/g, "d") // Convert Vietnamese đ
      .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
      .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .slice(0, 200); // Limit length

    // ALWAYS make slug unique to avoid duplicate entry errors
    // Check if slug already exists and add unique suffix
    const existingSlugs = await query<any>(
      `SELECT slug FROM articles WHERE slug = ?`,
      [slug],
    );

    if (existingSlugs.length > 0) {
      // Slug exists, add unique suffix
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      slug = `${slug}-${timestamp}-${randomSuffix}`;
      console.log(`⚠️ Slug already exists, generated unique slug: ${slug}`);
    } else {
      // Even if slug doesn't exist, add a short suffix for extra safety
      const shortSuffix = Math.random().toString(36).substring(2, 4);
      slug = `${slug}-${shortSuffix}`;
      console.log(`✅ Generated slug with safety suffix: ${slug}`);
    }

    // ========== SPLIT LONG PARAGRAPHS ==========
    content = splitLongParagraphs(content, 100);
    console.log(`✅ [${requestId}] Split long paragraphs for readability`);
    // ============================================

    // ========== APPLY SEO OPTIONS ==========
    console.log(`🎨 [${requestId}] Applying SEO options...`);
    let finalContent = content;

    // 1. Add internal links (keyword|link pairs)
    // Process as CHECKLIST: each keyword scanned separately in order
    // - Skip keywords not found in content
    // - Ensure minimum 2 paragraphs spacing between links
    // - Never insert links into headings
    if (internalLinks && internalLinks.trim()) {
      const linkPairs = internalLinks.split("\n").filter((line) => line.trim());
      const insertedLinkParagraphs: number[] = []; // Track which paragraph indices have links

      console.log(
        `🔗 Starting internal link insertion: ${linkPairs.length} keywords to process`,
      );

      linkPairs.forEach((pair, idx) => {
        const [keyword, link] = pair.split("|").map((s) => s.trim());
        if (!keyword || !link) return;

        console.log(
          `\n📌 [${idx + 1}/${linkPairs.length}] Processing: "${keyword}" -> ${link}`,
        );

        // Extract all paragraph blocks
        const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        const paragraphs: Array<{
          start: number;
          end: number;
          fullTag: string;
          innerContent: string;
          index: number;
        }> = [];
        let match;
        let paraIndex = 0;

        let tempContent = finalContent; // Work with current state of finalContent
        while ((match = paragraphRegex.exec(tempContent)) !== null) {
          paragraphs.push({
            start: match.index,
            end: match.index + match[0].length,
            fullTag: match[0],
            innerContent: match[1],
            index: paraIndex++,
          });
        }

        console.log(`   Found ${paragraphs.length} paragraphs`);

        // Find first suitable paragraph:
        // 1. Contains keyword (case-insensitive, word boundary)
        // 2. Keyword not already wrapped in <a> tag
        // 3. At least 2 paragraphs away from any previous link
        let targetPara = null;

        for (const para of paragraphs) {
          // Extract plain text
          const plainText = para.innerContent.replace(/<[^>]+>/g, "");

          // Check if keyword exists (word boundary)
          const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const keywordRegex = new RegExp(`\\b${escapedKeyword}\\b`, "i");

          if (!keywordRegex.test(plainText)) {
            continue; // Keyword not in this paragraph
          }

          // Check if keyword already has link in this paragraph
          const alreadyLinked = para.innerContent.match(
            new RegExp(`<a[^>]*>[^<]*${escapedKeyword}[^<]*</a>`, "i"),
          );
          if (alreadyLinked) {
            console.log(
              `   ⏭️  Paragraph ${para.index}: keyword already linked, skip`,
            );
            continue;
          }

          // Check spacing: must be at least 2 paragraphs away from all inserted links
          const tooClose = insertedLinkParagraphs.some(
            (linkedIdx) => Math.abs(para.index - linkedIdx) < 2,
          );
          if (tooClose) {
            console.log(
              `   ⏭️  Paragraph ${para.index}: too close to existing link, skip`,
            );
            continue;
          }

          // This paragraph is suitable
          targetPara = para;
          console.log(`   ✅ Target found at paragraph ${para.index}`);
          break;
        }

        if (!targetPara) {
          console.log(`   ❌ No suitable paragraph found - keyword skipped`);
          return; // Skip this keyword
        }

        // Insert link into target paragraph
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const keywordRegex = new RegExp(`\\b(${escapedKeyword})\\b`, "i");

        // Replace first occurrence in inner content
        const newInnerContent = targetPara.innerContent.replace(
          keywordRegex,
          `<a href="${link}" target="_blank" rel="noopener noreferrer">$1</a>`,
        );
        const newFullTag = targetPara.fullTag.replace(
          targetPara.innerContent,
          newInnerContent,
        );

        // Update finalContent
        finalContent =
          finalContent.slice(0, targetPara.start) +
          newFullTag +
          finalContent.slice(targetPara.end);

        // Track this paragraph
        insertedLinkParagraphs.push(targetPara.index);
        console.log(
          `   ✅ Link inserted successfully in paragraph ${targetPara.index}`,
        );
      });

      console.log(
        `\n🎉 Completed: ${insertedLinkParagraphs.length}/${linkPairs.length} links inserted\n`,
      );
    }

    // 2. Bold keywords
    if (boldKeywords) {
      // Bold main keyword (skip if already inside <a> tag)
      if (boldKeywords.mainKeyword && keyword) {
        const mainKw = keyword.split(",")[0].trim(); // Get first keyword if multiple
        const regex = new RegExp(
          `(?<!<[^>]*>)\\b(${mainKw})\\b(?![^<]*<\/a>)`,
          "gi",
        );
        let count = 0;
        finalContent = finalContent.replace(regex, (match) => {
          // Bold first 3 occurrences (skip if inside link)
          if (count < 3 && !match.includes("<a")) {
            count++;
            return `<strong>${match}</strong>`;
          }
          return match;
        });
      }

      // Bold headings (h2, h3) - preserve inner HTML like links
      if (boldKeywords.headings) {
        finalContent = finalContent.replace(
          /<(h[23])>(.*?)<\/\1>/gi,
          (match, tag, innerContent) => {
            // Check if already has <strong> tag
            if (innerContent.includes("<strong>")) {
              return match; // Already bolded
            }
            // Wrap entire content (including links) in strong tag
            return `<${tag}><strong>${innerContent}</strong></${tag}>`;
          },
        );
      }
    }

    // 3. Append end content
    if (endContent && endContent.trim()) {
      finalContent += `\n\n${endContent}`;
      console.log(`📄 [${requestId}] Appended end content`);
    }

    console.log(`✅ [${requestId}] SEO options applied successfully`);
    // ========================================

    // 4. Auto insert images for keywords
    let imageSearchTokensUsed = 0;
    if (autoInsertImages) {
      console.log(`🖼️ [${requestId}] Starting auto image insertion...`);

      // Strategy: Search once with 20+ images, then insert 1 image every 2-3 paragraphs
      console.log(
        `📸 Searching images for primary keyword: "${primaryKeyword}"`,
      );
      const primaryImages = await searchImagesForKeyword(primaryKeyword, 20);

      if (primaryImages.length > 0) {
        imageSearchTokensUsed += TOKEN_COSTS.FIND_IMAGE_SERP;
        console.log(
          `   Found ${primaryImages.length} images for primary keyword`,
        );

        // Extract all paragraph blocks
        const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        let paragraphs: Array<{
          start: number;
          end: number;
          content: string;
          index: number;
        }> = [];
        let match;
        let paraIndex = 0;

        while ((match = paragraphRegex.exec(finalContent)) !== null) {
          paragraphs.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0],
            index: paraIndex++,
          });
        }

        console.log(`   Found ${paragraphs.length} paragraphs in article`);

        // Calculate spacing between images based on maxImages setting
        const totalParagraphs = paragraphs.length;
        const targetImageCount = Math.min(maxImages || 5, 10); // Default 5, max 10

        // Don't insert image in last paragraph (totalParagraphs - 1 available)
        const availableParagraphs = totalParagraphs - 1;

        // Actual images to insert = min(targetImageCount, availableParagraphs, available images)
        const actualImageCount = Math.min(
          targetImageCount,
          availableParagraphs,
          primaryImages.length,
        );

        console.log(
          `🎯 Target images: ${targetImageCount}, Available paragraphs: ${availableParagraphs}, Will insert: ${actualImageCount} images`,
        );

        if (actualImageCount === 0) {
          console.log(
            `   ⚠️ Not enough paragraphs to insert images (need at least 2 paragraphs)`,
          );
        } else {
          // Calculate spacing: total available paragraphs / number of images
          const spacing = Math.floor(availableParagraphs / actualImageCount);
          console.log(
            `   Spacing: Insert 1 image every ${spacing} paragraph(s)`,
          );

          let offset = 0; // Track content length changes
          let imageIndex = 0;

          // Insert images at calculated intervals
          // Start from paragraph index based on spacing, skip last paragraph
          for (
            let i = 0;
            i < actualImageCount && imageIndex < primaryImages.length;
            i++
          ) {
            const paraIdx = (i + 1) * spacing; // Position: spacing, spacing*2, spacing*3, etc.

            // Make sure we don't exceed available paragraphs (don't insert in last paragraph)
            if (paraIdx >= totalParagraphs - 1) break;

            const img = primaryImages[imageIndex];
            const imgTag = `\n<img src="${img.original}" alt="${img.title || primaryKeyword}" style="width: 100%; height: auto; margin: 20px 0;" />\n`;

            const insertPosition = paragraphs[paraIdx].end + offset;
            finalContent =
              finalContent.slice(0, insertPosition) +
              imgTag +
              finalContent.slice(insertPosition);
            offset += imgTag.length;
            imageIndex++;

            console.log(
              `   ✅ Inserted image ${imageIndex}/${actualImageCount} after paragraph ${paraIdx}`,
            );
          }

          console.log(`   Total: ${imageIndex} images inserted successfully`);
        }
      } else {
        console.log(`   ⚠️ No images found for primary keyword`);
      }

      console.log(`🎉 [${requestId}] Auto image insertion complete`);
    } else {
      console.log(`⏭️ [${requestId}] Auto image insertion skipped (disabled)`);
    }
    // ========================================

    // STEP 2: Calculate actual tokens based on word count WITH model cost multiplier
    console.log(`🧮 [${requestId}] Calculating tokens used...`);

    // Calculate tokens based on actual word count AND model cost multiplier
    const articleTokens = await calculateTokens(
      finalContent,
      "generate_article",
      false,
      actualModel,
    );
    const titleTokens = await calculateTokens(
      title || "",
      "generate_article",
      false,
      actualModel,
    );
    const totalContentTokens = articleTokens + titleTokens;

    // Add image search tokens (fixed cost - NO multiplier for fixed costs)
    const totalTokensWithImages = totalContentTokens + imageSearchTokensUsed;

    // Count words for storage
    const wordCount = countWords(finalContent);

    console.log(`✅ [${requestId}] Article generated successfully`);
    console.log(`   - Word Count: ${wordCount} words`);
    console.log(`   - Model: ${actualModel}`);
    console.log(`   - Article Tokens: ${articleTokens}`);
    console.log(`   - Title Tokens: ${titleTokens}`);
    console.log(`   - Image Search Tokens: ${imageSearchTokensUsed}`);
    console.log(`   - Total Tokens: ${totalTokensWithImages}`);

    console.log(`💰 [${requestId}] Deducting tokens from user account...`);
    const deductResult = await deductTokens(
      userId,
      totalTokensWithImages,
      "GENERATE_ARTICLE",
    );

    if (!deductResult.success) {
      console.error(
        `❌ [${requestId}] Failed to deduct tokens:`,
        deductResult.error,
      );
    } else {
      console.log(
        `✅ [${requestId}] Tokens deducted. Remaining: ${deductResult.remainingTokens}`,
      );
    }

    // Keywords already parsed at the beginning (keywordsArray, primaryKeyword, secondaryKeywords)

    // Clean HTML content before saving (remove empty paragraphs, etc.)
    console.log(`🧹 [${requestId}] Cleaning HTML content...`);
    const cleanedContent = cleanHTMLContent(finalContent);
    console.log(
      `✅ [${requestId}] Content cleaned. Before: ${finalContent.length} chars, After: ${cleanedContent.length} chars`,
    );

    // Save article to database with word_count and tokens_used
    console.log(`💾 [${requestId}] Saving article to database...`);
    const result = await execute(
      `INSERT INTO articles (
        user_id,
        title,
        content,
        meta_title,
        meta_description,
        slug,
        keywords,
        word_count,
        tokens_used,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        title, // Article title
        cleanedContent, // Use cleaned content (removed empty paragraphs)
        seoTitle, // SEO-optimized title
        metaDescription, // SEO meta description
        slug,
        JSON.stringify(keywordsArray), // Save all keywords (main + secondary)
        wordCount, // NEW: Store word count
        totalTokensWithImages, // NEW: Store actual tokens used
        "draft",
      ],
    );

    const articleId = (result as any).insertId;
    console.log(
      `✅ [${requestId}] Article saved to database with ID: ${articleId}`,
    );
    console.log(`   - Title: "${title}"`);
    console.log(`   - SEO Title: "${seoTitle}"`);
    console.log(`   - Meta Description: "${metaDescription}"`);

    // Send final complete event via SSE
    console.log(`📤 [${requestId}] Sending complete event to client...`);
    sendSSE("complete", {
      success: true,
      message: "Article generated and saved successfully",
      articleId: articleId,
      title,
      seoTitle, // Include in response
      metaDescription, // Include in response
      slug,
      content: cleanedContent, // Return cleaned content (no empty paragraphs)
      tokensUsed: totalTokensWithImages,
      remainingTokens: deductResult.remainingTokens,
      // Token breakdown for debugging
      tokenBreakdown: {
        wordCount: wordCount,
        model: actualModel,
        articleTokens: articleTokens,
        titleTokens: titleTokens,
        imageSearchTokens: imageSearchTokensUsed,
        totalTokens: totalTokensWithImages,
      },
    });

    console.log(`✅ [${requestId}] Complete event sent successfully`);

    // Close SSE connection
    res.end();
    console.log(`✅ [${requestId}] SSE connection closed`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating article:`, error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error(`[${requestId}] Error name:`, error.name);
      console.error(`[${requestId}] Error message:`, error.message);
      console.error(`[${requestId}] Error stack:`, error.stack);
    }

    // Return error via SSE if connection is still open
    try {
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      sendSSE("error", {
        error: "Failed to generate article",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      });
      res.end();
    } catch (writeError) {
      // If we can't write to response, connection is already closed
      console.error(`[${requestId}] Failed to send error via SSE:`, writeError);
    }
  }
};

const handleGenerateSeoTitle: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { keyword, language = "vi" } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    // STEP 1: Check if user has enough tokens (estimate based on typical SEO title length)
    // Use gpt-3.5-turbo as default model
    const seoTitleModel = "gpt-3.5-turbo";
    const estimatedTokens = await calculateTokens(
      "Sample SEO Title Text Here",
      "generate_seo_title",
      true,
      seoTitleModel,
    );
    console.log(
      `💰 Generate SEO Title - Estimated tokens: ${estimatedTokens} (fixed cost with multiplier)`,
    );

    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "GENERATE_SEO_TITLE",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${estimatedTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "Generate SEO Title",
      });
    }

    // Get OpenAI API key from database
    const apiKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          "OpenAI API key not configured. Please add it in Admin > Quản lý API",
      });
      return;
    }

    const apiKey = apiKeys[0].api_key;

    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    const languageInstruction = `Create in ${languageNames[language] || "Vietnamese"}`;

    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("generate_seo_title");
    console.log("✅ Using hardcoded system prompt for generate_seo_title");

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("generate_seo_title");

    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt template with variable interpolation
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
      });
    } else {
      // FALLBACK: Use hardcoded user prompt
      userPrompt = `Create an SEO-optimized title for the keyword: "${keyword}". 

CRITICAL REQUIREMENT - Language:
- You MUST write the ENTIRE title in ${languageNames[language] || "Vietnamese"} language
- Do NOT use English or any other language
- The title must be in ${languageNames[language] || "Vietnamese"} from start to finish

The title should be:
- Between 50-60 characters
- Engaging and click-worthy
- Include the keyword naturally
- Clear and descriptive

Return ONLY the title in ${languageNames[language] || "Vietnamese"}, without quotes or extra text.`;
    }
    // ===============================================

    // Use gpt-3.5-turbo as default model for SEO title generation
    const defaultModel = "gpt-3.5-turbo";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: seoTitleModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedTitle = (
      data.choices[0]?.message?.content?.trim() || ""
    ).replace(/^["']|["']$/g, ""); // Remove quotes from start and end

    // STEP 2: Calculate actual tokens based on generated title word count WITH cost multiplier
    const actualTokens = await calculateTokens(
      generatedTitle,
      "generate_seo_title",
      true,
      seoTitleModel,
    );
    console.log(
      `✅ Generate SEO Title success - Deducting ${actualTokens} tokens (fixed cost with multiplier)`,
    );

    // STEP 3: Deduct tokens from user account
    const deductResult = await deductTokens(
      userId,
      actualTokens,
      "GENERATE_SEO_TITLE",
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 4: Return response with token information
    res.json({
      title: generatedTitle,
      tokensUsed: actualTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error generating SEO title:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleGenerateMetaDescription: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { keyword, content = "", language = "vi" } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    // Use gpt-3.5-turbo as default model
    const metaDescModel = "gpt-3.5-turbo";

    // STEP 1: Check if user has enough tokens (estimate based on typical meta description length)
    const estimatedTokens = await calculateTokens(
      "Sample meta description text for estimation purposes here",
      "generate_meta_description",
      true,
      metaDescModel,
    );
    console.log(
      `💰 Generate Meta Description - Estimated tokens: ${estimatedTokens} (fixed cost with multiplier)`,
    );

    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "GENERATE_META_DESC",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${estimatedTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "Generate Meta Description",
      });
    }

    // Get OpenAI API key from database
    const apiKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          "OpenAI API key not configured. Please add it in Admin > Quản lý API",
      });
      return;
    }

    const apiKey = apiKeys[0].api_key;

    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    const languageInstruction = `Create in ${languageNames[language] || "Vietnamese"}`;
    const contentContext = content
      ? `\n\nContent preview: ${content.substring(0, 300)}`
      : "";

    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("generate_meta_description");
    console.log(
      "✅ Using hardcoded system prompt for generate_meta_description",
    );

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("generate_meta_description");

    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt template with variable interpolation
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: keyword,
        language_instruction: languageInstruction,
        content_context: contentContext,
      });
    } else {
      // FALLBACK: Use hardcoded user prompt
      userPrompt = `Create an SEO-optimized meta description in ${languageNames[language] || "Vietnamese"} for the keyword: "${keyword}".${contentContext}

The meta description should be:
- Between 150-160 characters
- Engaging and informative
- Include the keyword naturally
- Encourage clicks with a call-to-action
Return ONLY the meta description, without quotes or extra text.`;
    }
    // ===============================================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: metaDescModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedDescription =
      data.choices[0]?.message?.content?.trim() || "";

    // STEP 2: Calculate actual tokens based on generated description word count WITH cost multiplier
    const actualTokens = await calculateTokens(
      generatedDescription,
      "generate_meta_description",
      true,
      metaDescModel,
    );
    console.log(
      `✅ Generate Meta Description success - Deducting ${actualTokens} tokens (fixed cost with multiplier)`,
    );

    // STEP 3: Deduct tokens from user account
    const deductResult = await deductTokens(
      userId,
      actualTokens,
      "GENERATE_META_DESC",
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 4: Return response with token information
    res.json({
      description: generatedDescription,
      tokensUsed: actualTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error generating meta description:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ========== GENERATE ARTICLE TITLE ==========
const handleGenerateArticleTitle: RequestHandler = async (req, res) => {
  try {
    // Verify user authentication first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { keyword, language = "vi" } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    // Use gpt-3.5-turbo as default model
    const articleTitleModel = "gpt-3.5-turbo";

    // STEP 1: Check if user has enough tokens (estimate based on typical article title length)
    const estimatedTokens = await calculateTokens(
      "Sample Article Title Text Here",
      "generate_article_title",
      true,
      articleTitleModel,
    );
    console.log(
      `💰 Generate Article Title - Estimated tokens: ${estimatedTokens} (fixed cost with multiplier)`,
    );

    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "GENERATE_ARTICLE_TITLE",
    );

    if (!tokenCheck.allowed) {
      console.log(
        `❌ Insufficient tokens for user ${userId}: ${tokenCheck.remainingTokens} < ${estimatedTokens}`,
      );
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "Generate Article Title",
      });
    }

    // Get OpenAI API key from database
    const apiKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'openai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({
        error:
          "OpenAI API key not configured. Please add it in Admin > Quản lý API",
      });
      return;
    }

    const apiKey = apiKeys[0].api_key;

    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    const languageInstruction = `Create in ${languageNames[language] || "Vietnamese"}`;

    // System prompt for article title generation
    const systemPrompt = `You are a professional content writer specializing in creating engaging, natural article titles. You MUST write in ${languageNames[language] || "Vietnamese"} language ONLY.`;

    const userPrompt = `Create a compelling article title based on the keyword: "${keyword}". 

CRITICAL REQUIREMENTS:
- You MUST write the ENTIRE title in ${languageNames[language] || "Vietnamese"} language
- Do NOT use English or any other language
- The title must sound natural and engaging, like a real article title
- Make it interesting and click-worthy
- Include the keyword naturally (can be slightly modified to fit naturally)
- Length: 40-70 characters
- Do NOT use quotation marks or special formatting

Return ONLY the title in ${languageNames[language] || "Vietnamese"}, without quotes or extra text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: articleTitleModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.8, // Slightly higher temperature for more creative titles
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedTitle = (
      data.choices[0]?.message?.content?.trim() || ""
    ).replace(/^["']|["']$/g, ""); // Remove quotes from start and end

    // STEP 2: Calculate actual tokens based on generated title word count WITH cost multiplier
    const actualTokens = await calculateTokens(
      generatedTitle,
      "generate_article_title",
      true,
      articleTitleModel,
    );
    console.log(
      `✅ Generate Article Title success - Deducting ${actualTokens} tokens (fixed cost with multiplier)`,
    );

    // STEP 3: Deduct tokens from user account
    const deductResult = await deductTokens(
      userId,
      actualTokens,
      "GENERATE_ARTICLE_TITLE",
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 4: Return response with token information
    res.json({
      title: generatedTitle,
      tokensUsed: actualTokens,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error generating article title:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ========== GENERATE TOPLIST OUTLINE ==========
interface GenerateToplistOutlineRequest {
  topic: string;
  itemCount: number;
  language: string;
  tone: string;
  length?: string;
  websiteId?: string;
}

const handleGenerateToplistOutline: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const { topic, itemCount, language, tone, length, websiteId } =
      req.body as GenerateToplistOutlineRequest;

    console.log("📥 Received toplist outline request:", {
      topic,
      itemCount,
      language,
      tone,
      length,
    });

    if (!topic || !itemCount || !language || !tone) {
      res.status(400).json({
        error: "topic, itemCount, language, and tone are required",
      });
      return;
    }

    // Validate itemCount
    if (itemCount < 3 || itemCount > 15) {
      res.status(400).json({
        error: "itemCount must be between 3 and 15",
      });
      return;
    }

    // Get Gemini API key from database (default for toplist outline)
    const apiKeys = await query<any>(
      `SELECT api_key FROM api_keys
       WHERE provider = 'google-ai' AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
    );

    if (apiKeys.length === 0) {
      res.status(503).json({ error: "Google AI API key not configured" });
      return;
    }

    const apiKey = apiKeys[0].api_key;

    // Get userId for token management
    const userId = (req as any).userId;

    // STEP 1: Check tokens before generating
    const requiredTokens = TOKEN_COSTS.GENERATE_OUTLINE;
    console.log(
      `💰 Generate Toplist Outline - Required tokens: ${requiredTokens}`,
    );

    const tokenCheck = await checkTokensMiddleware(
      userId,
      requiredTokens,
      "GENERATE_TOPLIST_OUTLINE",
    );

    if (!tokenCheck.allowed) {
      return res.status(403).json({
        error: tokenCheck.error || "Insufficient tokens",
        requiredTokens,
        availableTokens: tokenCheck.remainingTokens || 0,
        featureName: "Generate Toplist Outline",
      });
    }

    // Optional: load website knowledge if websiteId is provided
    let websiteKnowledge: string | undefined;
    if (websiteId) {
      const websiteRows = await query<any>(
        `SELECT knowledge FROM websites WHERE id = ? AND user_id = ? LIMIT 1`,
        [websiteId, userId],
      );
      if (websiteRows && websiteRows.length > 0 && websiteRows[0].knowledge) {
        websiteKnowledge = websiteRows[0].knowledge as string;
      }
    }

    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("generate_toplist_outline");
    // Inject website knowledge at highest priority if present
    if (websiteKnowledge && websiteKnowledge.trim().length > 0) {
      systemPrompt = injectWebsiteKnowledge(systemPrompt, websiteKnowledge);
    }
    console.log(
      "✅ Using hardcoded system prompt for generate_toplist_outline",
    );

    // ========== Load ONLY User Prompt Template from database ==========
    const promptTemplate = await loadPrompt("generate_toplist_outline");

    let userPrompt = "";

    if (promptTemplate) {
      // Use database prompt template with variable interpolation (NO h3 for toplist)
      userPrompt = interpolatePrompt(promptTemplate.prompt_template, {
        keyword: topic,
        language: language === "vi" ? "Vietnamese" : language,
        tone: tone,
        item_count: itemCount.toString(),
      });
    } else {
      // FALLBACK: Use hardcoded user prompt (SPECIFIC NAMES for toplist)
      const languageName = language === "vi" ? "Vietnamese" : language;

      userPrompt = `Create a toplist outline with SPECIFIC NAMES for: "${topic}"

⚠️ CRITICAL REQUIREMENTS:

1. FORMAT - Each item must be a SPECIFIC NAME:
   [h2] Name of Item 1
   [h2] Name of Item 2
   [h2] Name of Item 3
   ...and so on

2. CONTENT RULES:
   - List EXACTLY ${itemCount} specific names/places/products
   - Each item must be a REAL, CONCRETE name (not a question or description)
   - Items should be well-known, reputable, or popular
   - Order by relevance, popularity, or quality
   - Language: ${languageName}
   - Tone: ${tone}

3. EXAMPLES:
   - Keyword: "nhà hàng hải sản đà nẵng"
     [h2] Nhà hàng Mộc Hải Sản
     [h2] Nhà hàng Làng Cá
     [h2] Ốc Ken Sài Gòn

⚠️ FORBIDDEN:
- NO questions (e.g., "Nhà hàng nào ngon?")
- NO descriptions (e.g., "Nhà hàng có view đẹp")
- NO [h3] subheadings (ONLY [h2])
- NO numbering like "1.", "2." (just the name)

Create the outline now with ${itemCount} SPECIFIC NAMES
- Items should be substantial and descriptive
- Items should follow a logical order or ranking

Create the outline now with ONLY [h2] headings:`;
    }
    // ===============================================

    // Generate outline using Gemini (default for toplist)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topP: 0.95,
            topK: 40,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      res.status(500).json({ error: "Failed to call Gemini API" });
      return;
    }

    const data = await response.json();
    let outline = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!outline) {
      res.status(500).json({ error: "No outline generated" });
      return;
    }

    // ========== CONVERT HTML TO BRACKET FORMAT IF NEEDED ==========
    // Check if AI returned HTML format instead of bracket format
    const hasHtmlHeadings = /<h[23]>/i.test(outline);
    const hasBracketFormat = /\[h[23]\]/i.test(outline);

    if (hasHtmlHeadings && !hasBracketFormat) {
      console.log(
        "⚠️ AI returned HTML format, converting to bracket format [h2][h3]...",
      );

      // Convert HTML headings to bracket format
      outline = outline
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "[h2] $1")
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "[h3] $1")
        // Also handle markdown format if present
        .replace(/^##\s+(.+)$/gm, "[h2] $1")
        .replace(/^###\s+(.+)$/gm, "[h3] $1")
        // Clean up any remaining HTML tags
        .replace(/<[^>]+>/g, "")
        // Clean up extra whitespace
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      console.log("✅ Converted to bracket format");
    }

    // ========== ENSURE NO [h3] IN TOPLIST OUTLINE ==========
    // Remove any [h3] subheadings (toplist should only have [h2])
    const h3Count = (outline.match(/\[h3\]/g) || []).length;
    if (h3Count > 0) {
      console.warn(
        `⚠️ Found ${h3Count} [h3] subheadings in toplist outline, removing them...`,
      );
      // Remove lines that start with [h3]
      outline = outline
        .split("\n")
        .filter((line) => !line.trim().startsWith("[h3]"))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      console.log("✅ Removed [h3] subheadings from toplist outline");
    }
    // =======================================================

    // ========== VALIDATE ITEM COUNT ==========
    // Count [h2] items (all [h2] headings are toplist items now)
    const h2Matches = outline.match(/\[h2\]/g);
    const actualItemCount = h2Matches ? h2Matches.length : 0;

    if (actualItemCount !== itemCount) {
      console.warn(
        `⚠️ Item count mismatch! Requested: ${itemCount}, Generated: ${actualItemCount}`,
      );
      console.warn(`Outline preview: ${outline.substring(0, 200)}...`);
    } else {
      console.log(
        `✅ Item count correct: ${actualItemCount}/${itemCount} items`,
      );
    }
    // ==========================================

    // STEP 2: Calculate actual tokens used (estimate for Gemini)
    const estimatedTokens = Math.ceil(outline.length / 4); // Rough estimate
    const tokensToDeduct =
      estimatedTokens > 0 ? estimatedTokens : requiredTokens;

    console.log(
      `✅ Toplist outline generated with Gemini - Deducting ${tokensToDeduct} tokens`,
    );

    // STEP 3: Deduct tokens from user account
    const deductResult = await deductTokens(
      userId,
      tokensToDeduct,
      "GENERATE_TOPLIST_OUTLINE",
    );

    if (!deductResult.success) {
      console.error("Failed to deduct tokens:", deductResult.error);
    }

    // STEP 4: Return response with token information
    res.json({
      success: true,
      outline,
      tokensUsed: tokensToDeduct,
      remainingTokens: deductResult.remainingTokens,
    });
  } catch (error) {
    console.error("Error generating toplist outline:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ========== GENERATE TOPLIST ARTICLE ==========
interface GenerateToplistRequest {
  keyword: string; // Changed from topic to keyword
  itemCount: number;
  language: string;
  outlineType: string;
  customOutline?: string;
  tone: string;
  model: string;
  length?: string;
  // SEO Options
  internalLinks?: string;
  endContent?: string;
  boldKeywords?: {
    mainKeyword?: boolean;
    headings?: boolean;
  };
  autoInsertImages?: boolean;
  maxImages?: number; // Max number of images to insert (default 5, max 10)
  // Website Knowledge
  websiteId?: string; // Optional website ID to use knowledge from
}

const handleGenerateToplist: RequestHandler = async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(
    `\n========== 📝 GENERATE TOPLIST REQUEST [${requestId}] ==========`,
  );

  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!(await verifyUser(req, res))) {
      console.log(`❌ [${requestId}] User verification failed`);
      return;
    }

    const {
      keyword, // Changed from topic
      itemCount,
      language,
      outlineType,
      customOutline,
      tone,
      model,
      length,
      internalLinks,
      endContent,
      boldKeywords,
      autoInsertImages,
      maxImages,
      websiteId,
    } = req.body as GenerateToplistRequest;

    console.log("📥 Received toplist article request:", {
      keyword,
      itemCount,
      language,
      outlineType,
      tone,
      model,
      length,
      hasCustomOutline: !!customOutline,
      websiteId: websiteId || "NONE",
    });

    if (!keyword || !itemCount || !language || !tone || !model) {
      sendSSE("error", {
        error: "keyword, itemCount, language, tone, and model are required",
      });
      res.end();
      return;
    }

    // Validate itemCount
    if (itemCount < 3 || itemCount > 15) {
      sendSSE("error", { error: "itemCount must be between 3 and 15" });
      res.end();
      return;
    }

    // ========== GET API KEY USING HELPER ==========
    console.log(`🔑 [${requestId}] Getting API key for model: ${model}`);
    const modelConfig = await getApiKeyForModel(model, false);

    if (!modelConfig) {
      const provider = model.toLowerCase().includes("gemini")
        ? "Google AI"
        : "OpenAI";
      sendSSE("error", {
        error: `${provider} API key not configured. Please add it in Admin > Quản lý API`,
      });
      res.end();
      return;
    }

    const { apiKey, provider, actualModel } = modelConfig;
    console.log(
      `✅ [${requestId}] Using ${provider} with model: ${actualModel}`,
    );

    // Get userId for token management
    const userId = (req as any).userId;

    // Determine required tokens based on article length
    const lengthKey = (length || "medium").toLowerCase();
    const tokenCostMap: Record<string, number> = {
      short: TOKEN_COSTS.WRITE_ARTICLE_SHORT,
      medium: TOKEN_COSTS.WRITE_ARTICLE_MEDIUM,
      long: TOKEN_COSTS.WRITE_ARTICLE_LONG,
    };
    const requiredTokens =
      tokenCostMap[lengthKey] || TOKEN_COSTS.WRITE_ARTICLE_MEDIUM;

    console.log(
      `💰 Generate Toplist Article - Required tokens: ${requiredTokens} for ${lengthKey} article`,
    );

    // STEP 1: Check if user has enough tokens
    const tokenCheck = await checkTokensMiddleware(
      userId,
      requiredTokens,
      "GENERATE_TOPLIST_ARTICLE",
    );

    if (!tokenCheck.allowed) {
      return res.status(403).json({
        error: tokenCheck.error || "Insufficient tokens",
        requiredTokens,
        availableTokens: tokenCheck.remainingTokens || 0,
        featureName: "Generate Toplist Article",
      });
    }

    // Language mapping
    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };

    const languageInstruction =
      language === "vi"
        ? "Write in Vietnamese (Tiếng Việt)."
        : language === "en"
          ? "Write in English."
          : `Write in ${language}.`;

    // Build length instruction
    const lengthMap: Record<
      string,
      {
        instruction: string;
        writingStyle: string;
        minWords: number;
        maxWords: number;
        paragraphsPerItem: number;
        paragraphsPerItemAIOutline: number;
        paragraphWords: number;
      }
    > = {
      short: {
        instruction: "Write approximately 1,500–2,000 words (Short toplist)",
        writingStyle:
          "Write clearly and directly. Provide essential information with basic explanations for each item.",
        minWords: 1500,
        maxWords: 2000,
        paragraphsPerItem: 1, // No Outline: 1 paragraph per item
        paragraphsPerItemAIOutline: 2, // AI Outline: always 2 paragraphs (same as medium)
        paragraphWords: 80,
      },
      medium: {
        instruction: "Write approximately 2,000–2,500 words (Medium toplist)",
        writingStyle:
          "Write with moderate detail. Include explanations and examples for each item to help readers understand clearly.",
        minWords: 2000,
        maxWords: 2500,
        paragraphsPerItem: 2, // No Outline: 2 paragraphs per item
        paragraphsPerItemAIOutline: 2, // AI Outline: always 2 paragraphs
        paragraphWords: 100,
      },
      long: {
        instruction: "Write approximately 3,000–4,000 words (Long toplist)",
        writingStyle:
          "Write comprehensive in-depth content. Explain each item thoroughly with multiple examples, practical applications, expert insights, and detailed analysis. Provide rich context and actionable information for every point.",
        minWords: 3000,
        maxWords: 4000,
        paragraphsPerItem: 3, // No Outline: 3 paragraphs per item
        paragraphsPerItemAIOutline: 2, // AI Outline: always 2 paragraphs (same as medium)
        paragraphWords: 120,
      },
    };

    const lengthConfig = lengthMap[lengthKey] || lengthMap.medium;

    // ========== DETERMINE PARAGRAPHS PER ITEM BASED ON OUTLINE TYPE ==========
    // AI Outline (auto-toplist): Always 2 paragraphs per item
    // No Outline: Use lengthConfig.paragraphsPerItem (varies by length)
    const actualParagraphsPerItem =
      outlineType === "auto-toplist"
        ? lengthConfig.paragraphsPerItemAIOutline // Always 2 for AI Outline
        : lengthConfig.paragraphsPerItem; // Variable for No Outline (2/3/5)

    console.log(
      `📋 Toplist config: ${lengthKey} length, ${outlineType} outline → ${actualParagraphsPerItem} paragraphs per item`,
    );
    // =======================================================================

    const lengthInstruction = `${lengthConfig.instruction}

CRITICAL LENGTH REQUIREMENTS:
- Total article length: ${lengthConfig.minWords}–${lengthConfig.maxWords} words
- Each numbered item MUST have EXACTLY ${actualParagraphsPerItem} paragraphs
- Each paragraph should be ${lengthConfig.paragraphWords}+ words for comprehensive detail
- Explain every item thoroughly with examples, details, and analysis
- Make sure the article reaches the minimum word count by adding valuable detail`;

    // ========== AUTO-GENERATE OUTLINE IF NEEDED ==========
    let autoGeneratedOutline = "";

    if (outlineType === "auto-toplist") {
      console.log("📝 Auto-generating toplist outline...");

      const h3Config: Record<string, number> = {
        short: 1,
        medium: 2,
        long: 3,
      };
      const h3PerH2 = h3Config[lengthKey] || 2;

      // Load outline prompt from database
      const outlinePromptTemplate = await loadPrompt(
        "generate_toplist_outline",
      );

      let outlineSystemPrompt = "";
      let outlineUserPrompt = "";

      if (outlinePromptTemplate) {
        outlineSystemPrompt = outlinePromptTemplate.system_prompt;

        outlineUserPrompt = interpolatePrompt(
          outlinePromptTemplate.prompt_template,
          {
            keyword: keyword,
            language: languageNames[language] || "Vietnamese",
            tone: tone,
            item_count: itemCount.toString(),
            h3_per_h2: h3PerH2.toString(),
          },
        );
      } else {
        // FALLBACK
        const languageName = languageNames[language] || "Vietnamese";
        outlineSystemPrompt =
          "You are an expert SEO content strategist specializing in toplist articles.";

        outlineUserPrompt = `Create a detailed toplist outline for: "${keyword}"

ARTICLE STRUCTURE:
- Introduction paragraph (no heading)
- ${itemCount} numbered items with headings
- Conclusion paragraph

OUTLINE FORMAT:
[intro] Brief introduction paragraph
[h2] 1. [First Item Title]
[h3] [Subsection 1.1 if needed]
[h2] 2. [Second Item Title]
[h3] [Subsection 2.1 if needed]
...continue for all ${itemCount} items
[h2] Kết luận / Conclusion

REQUIREMENTS:
- Language: ${languageName}
- Tone: ${tone}
- Number of items: ${itemCount}
- Each H2 can have ${h3PerH2} H3 subsections

Create the outline now:`;
      }

      try {
        const outlineResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: outlineSystemPrompt },
                { role: "user", content: outlineUserPrompt },
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          },
        );

        if (outlineResponse.ok) {
          const outlineData = await outlineResponse.json();
          autoGeneratedOutline =
            outlineData.choices[0]?.message?.content?.trim() || "";
          console.log("✅ Auto-generated toplist outline successfully");
        }
      } catch (error) {
        console.error("⚠️ Failed to auto-generate outline:", error);
      }
    }
    // ====================================================

    // Build system and user prompts for article generation
    // ========== Use HARDCODED System Prompt ==========
    let systemPrompt = getSystemPrompt("generate_toplist");
    console.log(
      "✅ Using hardcoded system prompt for generate_toplist_article",
    );

    // ========== Load ONLY User Prompt Template from database ==========
    const articlePromptTemplate = await loadPrompt("generate_toplist_article");

    let userPrompt = "";

    if (articlePromptTemplate) {
      // Use database prompt template with variable interpolation
      const outlineInstruction =
        customOutline && customOutline.trim()
          ? `IMPORTANT - Follow this outline structure EXACTLY:\n${customOutline}\n\n`
          : autoGeneratedOutline
            ? `IMPORTANT - Follow this outline structure EXACTLY:\n${autoGeneratedOutline}\n\n`
            : `IMPORTANT - Create EXACTLY ${itemCount} numbered items (1. 2. 3... ${itemCount}.) with <h2> tags.\n\n`;

      userPrompt = interpolatePrompt(articlePromptTemplate.prompt_template, {
        keyword: keyword,
        language: language === "vi" ? "Vietnamese" : language,
        tone: tone,
        length_instruction: lengthInstruction,
        writing_style: lengthConfig.writingStyle,
        outline_instruction: outlineInstruction,
        paragraphs_per_item: actualParagraphsPerItem.toString(),
        paragraph_words: lengthConfig.paragraphWords.toString(),
        min_words: lengthConfig.minWords.toString(),
        item_count: itemCount.toString(),
      });
    } else {
      // FALLBACK: Use hardcoded user prompt
      userPrompt = `Write a comprehensive toplist article about: "${keyword}"

Number of items: ${itemCount}

${lengthInstruction}

⚠️ WRITING STYLE REQUIREMENTS:
${lengthConfig.writingStyle}`;

      // Add outline instruction if provided
      if (customOutline && customOutline.trim()) {
        userPrompt += `\n\nIMPORTANT - Follow this outline structure EXACTLY:\n${customOutline}\n\nWrite ${actualParagraphsPerItem} detailed paragraphs for each numbered item.`;
      } else if (autoGeneratedOutline) {
        userPrompt += `\n\nIMPORTANT - Follow this outline structure EXACTLY:\n${autoGeneratedOutline}\n\nWrite ${actualParagraphsPerItem} detailed paragraphs for each numbered item.`;
      }
    }
    // ===============================================

    // ========== INJECT WEBSITE KNOWLEDGE IF PROVIDED ==========
    if (websiteId && websiteId.trim()) {
      try {
        console.log(
          `🌐 [${requestId}] Querying website knowledge for websiteId: ${websiteId}`,
        );

        const website = await queryOne<any>(
          "SELECT id, name, knowledge FROM websites WHERE id = ? AND user_id = ?",
          [websiteId, userId],
        );

        if (website && website.knowledge) {
          console.log(
            `✅ [${requestId}] Found website: "${website.name}" with knowledge (${website.knowledge.length} chars)`,
          );
          console.log(
            `📋 Knowledge preview: ${website.knowledge.substring(0, 200)}...`,
          );

          // Inject knowledge into system prompt
          systemPrompt = injectWebsiteKnowledge(
            systemPrompt,
            website.knowledge,
          );

          console.log(
            `✅ [${requestId}] Website knowledge injected into system prompt`,
          );
        } else if (website && !website.knowledge) {
          console.log(
            `⚠️ [${requestId}] Website "${website.name}" found but has no knowledge`,
          );
        } else {
          console.log(
            `⚠️ [${requestId}] Website not found or doesn't belong to user`,
          );
        }
      } catch (error) {
        console.error(
          `❌ [${requestId}] Error querying website knowledge:`,
          error,
        );
        // Continue without knowledge - don't fail the request
      }
    } else {
      console.log(
        `ℹ️ [${requestId}] No websiteId provided, skipping knowledge injection`,
      );
    }
    // ===============================================

    // ========== GENERATE ARTICLE WITH STREAMING ==========
    console.log(
      `📝 [${requestId}] Generating toplist article with streaming...`,
    );
    sendSSE("status", { message: "Generating toplist article..." });

    const maxTokens = 4096;
    const geminiMaxTokens = 8192;
    let content = "";
    let finishReason = "";

    if (provider === "google-ai") {
      // Use Gemini API directly (non-streaming, with pseudo-streaming for UX)
      console.log(`🔍 [${requestId}] Using Gemini API for toplist`);

      try {
        const geminiRequestBody: any = {
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: geminiMaxTokens,
            topP: 0.95,
            topK: 40,
          },
        };

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(geminiRequestBody),
          },
        );

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.json().catch(() => ({}));
          console.error("❌ Gemini API error:", errorData);
          sendSSE("error", {
            error: "Failed to call Gemini API",
            details: errorData?.error?.message || geminiResponse.statusText,
          });
          res.end();
          return;
        }

        const geminiData = await geminiResponse.json();

        if (!geminiData.candidates || geminiData.candidates.length === 0) {
          console.error("❌ Gemini returned no candidates");
          sendSSE("error", {
            error: "Gemini API returned no content",
          });
          res.end();
          return;
        }

        content =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const rawFinishReason = geminiData.candidates?.[0]?.finishReason;
        finishReason = rawFinishReason === "MAX_TOKENS" ? "length" : "stop";

        if (!content) {
          sendSSE("error", { message: "No response from Gemini API" });
          res.end();
          return;
        }

        // ✅ Remove code fence markers if present (```html and ```)
        content = content.replace(/^```html\s*/i, "").replace(/\s*```$/i, "");
        content = content.trim();
        console.log(
          `🧹 [${requestId}] Removed code fence markers from initial content if present`,
        );

        // Pseudo-streaming for better UX
        console.log(
          `📤 [${requestId}] Sending Gemini content via pseudo-streaming`,
        );
        const chunkSize = 50;
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.substring(
            i,
            Math.min(i + chunkSize, content.length),
          );
          const accumulated = content.substring(
            0,
            Math.min(i + chunkSize, content.length),
          );
          sendSSE("content", { chunk, total: accumulated });
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Gemini API exception:`, error);
        sendSSE("error", {
          error: "Failed to call Gemini API",
          details: error instanceof Error ? error.message : String(error),
        });
        res.end();
        return;
      }
    } else {
      // Use OpenAI streaming helper
      const streamResult = await streamOpenAIResponse(
        apiKey,
        actualModel,
        systemPrompt,
        userPrompt,
        maxTokens,
        sendSSE,
        requestId,
      );

      if (!streamResult) {
        console.error(`❌ [${requestId}] OpenAI streaming failed`);
        res.end();
        return;
      }

      content = streamResult.content;
      finishReason = streamResult.finishReason;
    }

    // ✅ Check if AI returned Markdown instead of HTML and convert if needed
    const hasHtmlTags = /<h[23]>|<p>/.test(content);
    const hasMarkdown = /^#{1,6}\s/m.test(content);

    if (!hasHtmlTags || hasMarkdown) {
      console.log(
        `⚠️ [${requestId}] AI returned Markdown/plain text, converting to HTML...`,
      );

      // Convert Markdown to HTML
      content = content
        // Convert headings
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h2>$1</h2>")
        // Convert bold
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Convert italic
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        // Convert lists
        .replace(/^\* (.+)$/gm, "<li>$1</li>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`)
        // Convert paragraphs (lines separated by blank lines)
        .split(/\n\n+/)
        .map((para) => {
          para = para.trim();
          if (!para) return "";
          // Skip if already has HTML tags
          if (
            para.startsWith("<h") ||
            para.startsWith("<p") ||
            para.startsWith("<ul") ||
            para.startsWith("<ol") ||
            para.startsWith("<table") ||
            para.startsWith("<li")
          ) {
            return para;
          }
          // Wrap in <p> tags
          return `<p>${para}</p>`;
        })
        .join("\n\n");

      // Convert Markdown tables to HTML tables
      content = convertMarkdownTablesToHtml(content);

      console.log(`✅ [${requestId}] Converted toplist content to HTML format`);
    }

    console.log(
      `✅ [${requestId}] Initial article generation completed: ${content.length} characters`,
    );

    // ========== ENHANCED CONTINUATION LOGIC FOR TOPLIST ==========
    // Continue writing until all outline items are complete
    let attemptCount = 1;
    const maxAttempts = 10; // Sufficient for 15-item toplists

    // Function to check if toplist outline is complete
    const checkToplistCompletion = (
      content: string,
      outline: string,
      expectedItems: number,
    ): boolean => {
      if (!outline) {
        // No outline to check - just check if we have enough numbered items
        const contentH2s = content.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
        const numberedItems = contentH2s.filter((h2) =>
          /^\d+\./.test(h2.replace(/<\/?h2[^>]*>/gi, "").trim()),
        );
        console.log(
          `📊 Item count check: ${numberedItems.length}/${expectedItems} numbered items`,
        );
        return numberedItems.length >= expectedItems;
      }

      // Extract all [h2] headings from outline (numbered items only)
      const outlineH2s = outline.match(/\[h2\]\s*\d+\./gi) || [];

      // Extract all <h2> numbered headings from content
      const contentH2s = content.match(/<h2[^>]*>\d+\.[^<]+<\/h2>/gi) || [];

      console.log(
        `📊 Toplist completion check: ${contentH2s.length}/${outlineH2s.length} items (expected: ${expectedItems})`,
      );

      // Check if we have all items
      if (contentH2s.length < expectedItems) {
        console.log(
          `⚠️ Missing ${expectedItems - contentH2s.length} items from toplist`,
        );
        return false;
      }

      console.log(`✅ All ${expectedItems} toplist items completed`);
      return true;
    };

    const outlineToCheck = customOutline || autoGeneratedOutline || "";

    console.log(`\n🔄 [${requestId}] Starting toplist continuation check...`);
    console.log(
      `📊 [${requestId}] Initial state: content=${content.length} chars, finishReason="${finishReason}", expectedItems=${itemCount}`,
    );

    // Continue if EITHER article was cut off OR outline is incomplete
    while (attemptCount < maxAttempts) {
      console.log(
        `\n🔍 [${requestId}] Toplist continuation loop iteration ${attemptCount + 1}/${maxAttempts}`,
      );

      // Check if toplist is complete
      const isToplistComplete = checkToplistCompletion(
        content,
        outlineToCheck,
        itemCount,
      );
      console.log(
        `📋 [${requestId}] Toplist complete: ${isToplistComplete}, finishReason: "${finishReason}"`,
      );

      // Stop only if:
      // 1. Toplist has all required items
      // 2. AND finish reason is "stop" (not cut off by token limit)
      if (isToplistComplete && finishReason === "stop") {
        console.log(
          `✅ Toplist is complete with all ${itemCount} items, stopping continuation`,
        );
        break;
      }

      // If toplist is incomplete, continue regardless of finishReason
      if (!isToplistComplete) {
        console.log(
          `⚠️ Toplist incomplete, forcing continuation (Attempt ${attemptCount + 1}/${maxAttempts})`,
        );
      } else if (finishReason === "length") {
        console.log(
          `📝 Article was cut off by token limit, continuing (Attempt ${attemptCount + 1}/${maxAttempts})`,
        );
      }

      attemptCount++;

      // Build continuation prompt
      sendSSE("status", {
        message: `Đang tiếp tục viết bài (${attemptCount}/${maxAttempts})...`,
        progress: 50 + attemptCount * 5,
      });

      // Extract current item count
      const currentH2s = content.match(/<h2[^>]*>\d+\.[^<]+<\/h2>/gi) || [];
      const currentItemCount = currentH2s.length;
      const missingItems = itemCount - currentItemCount;

      // ========== Load toplist continuation prompt from database ==========
      const continueToplistPromptTemplate =
        await loadPrompt("continue_toplist");

      // Build continuation rules
      const continuationRules = `⚠️ CRITICAL INSTRUCTION - Continue writing the toplist:

CURRENT STATUS:
- Already written: ${currentItemCount} items
- Total required: ${itemCount} items
- Still need to write: ${missingItems} items

⚠️ CONTINUATION RULES:
1. Continue from item #${currentItemCount + 1} to item #${itemCount}
2. DO NOT repeat any content already written
3. DO NOT rewrite completed items
4. Each item MUST have EXACTLY ${actualParagraphsPerItem} paragraphs (as specified in length config)
5. Each paragraph MUST be ${lengthConfig.paragraphWords}+ words
6. Use proper HTML: <h2>#. Title</h2> then <p>paragraph</p>
7. FORBIDDEN: Writing more or less than ${actualParagraphsPerItem} paragraphs per item
8. FORBIDDEN: Skipping items

${outlineToCheck ? `OUTLINE TO FOLLOW:\n${outlineToCheck}\n\n` : ""}`;

      let continuationPrompt = "";

      // Use database prompt if available, otherwise fallback
      if (continueToplistPromptTemplate) {
        console.log("✅ Using database prompt for continue_toplist");
        continuationPrompt = interpolatePrompt(
          continueToplistPromptTemplate.prompt_template,
          {
            previous_content: content,
            continuation_rules: continuationRules,
            next_item_number: (currentItemCount + 1).toString(),
            total_items: itemCount.toString(),
            current_item_count: currentItemCount.toString(),
            paragraphs_per_item: actualParagraphsPerItem.toString(),
            paragraph_words: lengthConfig.paragraphWords.toString(),
            length_key: lengthKey,
            outline_reference: outlineToCheck || "No outline provided",
          },
        );
      } else {
        console.log(
          "⚠️ Database prompt not found for continue_toplist, using fallback",
        );
        // FALLBACK: Hardcoded prompt
        continuationPrompt = `You are continuing to write a toplist article. Here is what has been written so far:

${content}

${continuationRules}

⚠️ CRITICAL FORMAT REQUIREMENTS:

1. HTML STRUCTURE (MANDATORY):
   - Use <h2>#. Title</h2> for each numbered item (e.g., <h2>${currentItemCount + 1}. Title Here</h2>)
   - Use <p>...</p> for EVERY paragraph
   - Each item: EXACTLY ${actualParagraphsPerItem} paragraphs (NOT MORE, NOT LESS)
   - Each paragraph: ${lengthConfig.paragraphWords}+ words
   - Line breaks between paragraphs

2. PARAGRAPH COUNT ENFORCEMENT:
   - This is ${lengthKey} length toplist
   - MUST write EXACTLY ${actualParagraphsPerItem} paragraphs per item
   - FORBIDDEN: Writing 3 paragraphs when config says 2
   - FORBIDDEN: Writing 1 paragraph when config says 2

3. TOPLIST CONTINUATION RULES:
   - DO NOT REWRITE items 1-${currentItemCount} (they are already done)
   - ONLY write items #${currentItemCount + 1} through #${itemCount}
   - Start immediately with <h2>${currentItemCount + 1}. [Item Title]</h2>
   - Maintain same style and paragraph count as previous items

4. FORBIDDEN:
   - NO Markdown (##, **, -)
   - NO code fences (\`\`\`html or \`\`\`)
   - NO repeating completed items
   - NO changing paragraph count mid-article

NOW write ONLY items #${currentItemCount + 1} through #${itemCount} with EXACTLY ${actualParagraphsPerItem} paragraphs each:`;
      }
      // ===============================================

      let continuationText = "";

      if (provider === "google-ai") {
        // Continue with Gemini API
        console.log(
          `🔍 [${requestId}] Continuing with Gemini API (items ${currentItemCount + 1}-${itemCount})`,
        );

        // Use the prompt from database (already includes all format requirements)
        try {
          const geminiContinuationRequestBody: any = {
            contents: [
              {
                parts: [
                  {
                    text: continuationPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: geminiMaxTokens,
              topP: 0.95,
              topK: 40,
            },
          };

          const geminiContinuationResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(geminiContinuationRequestBody),
            },
          );

          if (!geminiContinuationResponse.ok) {
            console.error("Gemini continuation request failed, stopping...");
            break;
          }

          const geminiContinuationData =
            await geminiContinuationResponse.json();
          continuationText =
            geminiContinuationData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "";
          const rawContinuationFinish =
            geminiContinuationData.candidates?.[0]?.finishReason;
          finishReason =
            rawContinuationFinish === "MAX_TOKENS" ? "length" : "stop";

          console.log(
            `📝 Gemini continuation received: +${continuationText.length} chars, finishReason: ${rawContinuationFinish} → ${finishReason}`,
          );

          // ✅ Remove code fence markers if present
          continuationText = continuationText
            .replace(/^```html\s*/i, "")
            .replace(/\s*```$/i, "");
          continuationText = continuationText.trim();

          // Convert Markdown to HTML if needed (same as initial generation)
          if (continuationText) {
            const hasHtmlTags = /<h[23]>|<p>/.test(continuationText);
            const hasMarkdown = /^#{1,6}\s/m.test(continuationText);

            if (!hasHtmlTags || hasMarkdown) {
              console.log(
                `⚠️ [${requestId}] Gemini continuation returned Markdown, converting...`,
              );
              continuationText = continuationText
                .replace(/^### (.+)$/gm, "<h3>$1</h3>")
                .replace(/^## (.+)$/gm, "<h2>$1</h2>")
                .replace(/^# (.+)$/gm, "<h2>$1</h2>")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/__(.+?)__/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/_(.+?)_/g, "<em>$1</em>")
                .replace(/^\* (.+)$/gm, "<li>$1</li>")
                .replace(/^- (.+)$/gm, "<li>$1</li>")
                .replace(
                  /(<li>.*<\/li>\n?)+/g,
                  (match) => `<ul>\n${match}</ul>\n`,
                )
                .split(/\n\n+/)
                .map((para) => {
                  para = para.trim();
                  if (!para) return "";
                  if (
                    para.startsWith("<h") ||
                    para.startsWith("<p") ||
                    para.startsWith("<ul") ||
                    para.startsWith("<ol") ||
                    para.startsWith("<table")
                  ) {
                    return para;
                  }
                  return `<p>${para}</p>`;
                })
                .join("\n\n");

              // Convert Markdown tables to HTML tables
              continuationText = convertMarkdownTablesToHtml(continuationText);
            }

            // Pseudo-streaming for Gemini continuation
            console.log(
              `📤 [${requestId}] Sending Gemini continuation via pseudo-streaming (${continuationText.length} chars)`,
            );
            const chunkSize = 50;
            for (let i = 0; i < continuationText.length; i += chunkSize) {
              const chunk = continuationText.substring(
                i,
                Math.min(i + chunkSize, continuationText.length),
              );
              const accumulated =
                content +
                "\n\n" +
                continuationText.substring(
                  0,
                  Math.min(i + chunkSize, continuationText.length),
                );
              sendSSE("content", { chunk, total: accumulated });
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
        } catch (error) {
          console.error("Gemini continuation error:", error);
          break;
        }
      } else {
        // Continue with OpenAI API with STREAMING
        const continuationMessages = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
          {
            role: "assistant",
            content: content,
          },
          {
            role: "user",
            content: continuationPrompt,
          },
        ];

        const continuationResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: actualModel,
              messages: continuationMessages,
              temperature: 0.7,
              max_tokens: maxTokens,
              stream: true,
            }),
          },
        );

        if (!continuationResponse.ok) {
          console.error("OpenAI continuation request failed, stopping...");
          break;
        }

        // Process streaming continuation response
        const contReader = continuationResponse.body?.getReader();
        const contDecoder = new TextDecoder();

        if (!contReader) {
          console.error("No continuation stream, stopping...");
          break;
        }

        let contBuffer = "";
        continuationText = "";

        while (true) {
          const { done, value } = await contReader.read();

          if (done) {
            console.log("✅ OpenAI continuation streaming completed");
            break;
          }

          contBuffer += contDecoder.decode(value, { stream: true });
          const lines = contBuffer.split("\n");
          contBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

            if (trimmedLine.startsWith("data: ")) {
              try {
                const jsonData = JSON.parse(trimmedLine.substring(6));
                const delta = jsonData.choices?.[0]?.delta?.content;
                finishReason =
                  jsonData.choices?.[0]?.finish_reason || finishReason;

                if (delta) {
                  continuationText += delta;
                  // Send continuation chunk to client
                  sendSSE("content", {
                    chunk: delta,
                    total: content + "\n\n" + continuationText,
                  });
                }
              } catch (e) {
                console.error("Error parsing continuation SSE line:", e);
              }
            }
          }
        }
      }

      if (continuationText) {
        content += "\n\n" + continuationText;
        const totalWords = Math.round(content.length / 4);
        console.log(`📊 Toplist total length: ~${totalWords} words`);

        // Re-check toplist completion
        const newItemCount = (
          content.match(/<h2[^>]*>\d+\.[^<]+<\/h2>/gi) || []
        ).length;
        console.log(`📋 Updated item count: ${newItemCount}/${itemCount}`);
      } else {
        console.log(`⚠️ No continuation text received, stopping`);
        break;
      }
    }

    if (attemptCount >= maxAttempts) {
      console.log(
        `⚠️ Reached maximum continuation attempts (${maxAttempts}), toplist may be incomplete`,
      );

      // Final check
      const finalItemCount = (
        content.match(/<h2[^>]*>\d+\.[^<]+<\/h2>/gi) || []
      ).length;
      if (finalItemCount < itemCount) {
        console.log(
          `⚠️ WARNING: Only ${finalItemCount}/${itemCount} items completed`,
        );
        sendSSE("warning", {
          message: `Chỉ tạo được ${finalItemCount}/${itemCount} mục. Bạn có thể thử lại hoặc chỉnh sửa bài viết.`,
        });
      }
    } else {
      console.log(
        `✅ Toplist generation completed in ${attemptCount} attempt(s) with ${itemCount} items`,
      );
    }
    // ================================================================

    // ========== GENERATE TOPLIST TITLE ==========
    console.log(`📝 [${requestId}] Generating toplist title...`);
    const languageName = languageNames[language] || "Vietnamese";

    // IMPORTANT: Title generation ALWAYS uses OpenAI, not Gemini
    // Get OpenAI API key specifically for title generation
    console.log(
      `🔑 [${requestId}] Getting OpenAI API key for title generation...`,
    );
    const openaiConfig = await getApiKeyForModel("gpt-3.5-turbo", false); // Use model_id

    let title: string;

    if (!openaiConfig || openaiConfig.provider !== "openai") {
      console.warn(
        `⚠️ [${requestId}] OpenAI API key not available, using keyword as title`,
      );
      title = keyword;
    } else {
      // ========== Use HARDCODED System Prompt ==========
      let titleSystemPrompt = getSystemPrompt("generate_article_title");
      console.log(
        "✅ Using hardcoded system prompt for generate_toplist_title",
      );

      // ========== Load ONLY User Prompt Template from database ==========
      const titlePromptTemplate = await loadPrompt("generate_toplist_title");

      let titleUserPrompt = "";

      if (titlePromptTemplate) {
        titleUserPrompt = interpolatePrompt(
          titlePromptTemplate.prompt_template,
          {
            keyword: keyword,
            language: languageName,
            item_count: itemCount.toString(),
          },
        );
      } else {
        // FALLBACK: Use hardcoded user prompt
        titleUserPrompt = `Generate a compelling toplist-style title in ${languageName} for the topic: "${keyword}"

CRITICAL REQUIREMENT: The title MUST include the number ${itemCount}.

TITLE FORMAT REQUIREMENTS:
Use one of these toplist formats with the number ${itemCount}:
- Top ${itemCount}...
- ${itemCount} Ways to...
- ${itemCount} Secrets about...
- ${itemCount} Things...
- ${itemCount} Tips for...
- ${itemCount} Reasons why...
- ${itemCount} Steps to...

The number in the title MUST be ${itemCount}, not any other number.
Make it catchy, specific, and click-worthy.
Return ONLY the title text.`;
      }

      try {
        const titleResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiConfig.apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: titleSystemPrompt },
                { role: "user", content: titleUserPrompt },
              ],
              temperature: 0.7,
              max_tokens: 100,
            }),
          },
        );

        if (!titleResponse.ok) {
          console.error(
            `❌ [${requestId}] Title generation failed:`,
            titleResponse.status,
          );
          const errorData = await titleResponse.json().catch(() => ({}));
          console.error(`[${requestId}] Title API error:`, errorData);
          title = keyword; // Fallback to keyword
        } else {
          const titleData = await titleResponse.json();
          console.log(`📝 [${requestId}] Title API response:`, titleData);

          if (!titleData.choices || titleData.choices.length === 0) {
            console.error(`❌ [${requestId}] No choices in title response`);
            title = keyword; // Fallback to keyword
          } else {
            title = (
              titleData.choices[0]?.message?.content?.trim() || keyword
            ).replace(/^["']|["']$/g, "");
            console.log(`✅ [${requestId}] Title generated: "${title}"`);
          }
        }
      } catch (titleError) {
        console.error(
          `❌ [${requestId}] Title generation exception:`,
          titleError,
        );
        title = keyword; // Fallback to keyword
      }
    }

    console.log(`📝 [${requestId}] Final title: "${title}"`);
    // ============================================

    // Generate slug with proper Vietnamese character handling
    let slug = (title || keyword)
      .toString()
      .normalize("NFKD") // Normalize Unicode
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .toLowerCase()
      .trim()
      .replace(/[đĐ]/g, "d") // Convert Vietnamese đ
      .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
      .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .slice(0, 200); // Limit length

    console.log(`🔖 [${requestId}] Generated slug: "${slug}"`);

    // Check if slug exists and make it unique if needed
    try {
      const existingSlug = await query<any>(
        "SELECT id FROM articles WHERE slug = ?",
        [slug],
      );

      if (existingSlug.length > 0) {
        const uniqueSuffix = Date.now().toString().slice(-6);
        slug = `${slug}-${uniqueSuffix}`;
        console.log(
          `⚠️ [${requestId}] Slug conflict detected, using unique slug: "${slug}"`,
        );
      }
    } catch (checkError) {
      console.error(
        `⚠️ [${requestId}] Failed to check slug uniqueness:`,
        checkError,
      );
      // Continue with original slug and hope for the best
    }

    // ========== CLEAN UP CODE FENCE MARKERS ==========
    content = removeCodeFenceMarkers(content);
    console.log(`✅ [${requestId}] Removed code fence markers if present`);
    // ================================================

    // ========== SPLIT LONG PARAGRAPHS ==========
    content = splitLongParagraphs(content, 100);
    console.log(`✅ [${requestId}] Split long paragraphs for readability`);
    // ============================================

    // ========== APPLY SEO OPTIONS ==========
    let finalContent = content;

    // 1. Add internal links
    if (internalLinks && internalLinks.trim()) {
      const linkPairs = internalLinks.split("\n").filter((line) => line.trim());
      const insertedLinkParagraphs: number[] = [];

      console.log(
        `🔗 Starting internal link insertion: ${linkPairs.length} keywords`,
      );

      linkPairs.forEach((pair, idx) => {
        const [linkKeyword, link] = pair.split("|").map((s) => s.trim());
        if (!linkKeyword || !link) return;

        const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        const paragraphs: Array<{
          start: number;
          end: number;
          fullTag: string;
          innerContent: string;
          index: number;
        }> = [];
        let match;
        let paraIndex = 0;

        let tempContent = finalContent;
        while ((match = paragraphRegex.exec(tempContent)) !== null) {
          paragraphs.push({
            start: match.index,
            end: match.index + match[0].length,
            fullTag: match[0],
            innerContent: match[1],
            index: paraIndex++,
          });
        }

        let targetPara = null;

        for (const para of paragraphs) {
          const plainText = para.innerContent.replace(/<[^>]+>/g, "");
          const escapedKeyword = linkKeyword.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const keywordRegex = new RegExp(`\\b${escapedKeyword}\\b`, "i");

          if (!keywordRegex.test(plainText)) continue;

          const alreadyLinked = para.innerContent.match(
            new RegExp(`<a[^>]*>[^<]*${escapedKeyword}[^<]*</a>`, "i"),
          );
          if (alreadyLinked) continue;

          const tooClose = insertedLinkParagraphs.some(
            (linkedIdx) => Math.abs(para.index - linkedIdx) < 2,
          );
          if (tooClose) continue;

          targetPara = para;
          break;
        }

        if (!targetPara) return;

        const escapedKeyword = linkKeyword.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const keywordRegex = new RegExp(`\\b(${escapedKeyword})\\b`, "i");

        const newInnerContent = targetPara.innerContent.replace(
          keywordRegex,
          `<a href="${link}" target="_blank" rel="noopener noreferrer">$1</a>`,
        );
        const newFullTag = targetPara.fullTag.replace(
          targetPara.innerContent,
          newInnerContent,
        );

        finalContent =
          finalContent.slice(0, targetPara.start) +
          newFullTag +
          finalContent.slice(targetPara.end);
        insertedLinkParagraphs.push(targetPara.index);
      });

      console.log(
        `🎉 Completed: ${insertedLinkParagraphs.length}/${linkPairs.length} links inserted`,
      );
    }

    // 2. Bold keywords
    if (boldKeywords) {
      if (boldKeywords.mainKeyword && keyword) {
        const regex = new RegExp(
          `(?<!<[^>]*>)\\b(${keyword})\\b(?![^<]*<\/a>)`,
          "gi",
        );
        let count = 0;
        finalContent = finalContent.replace(regex, (match) => {
          if (count < 3 && !match.includes("<a")) {
            count++;
            return `<strong>${match}</strong>`;
          }
          return match;
        });
      }

      if (boldKeywords.headings) {
        finalContent = finalContent.replace(
          /<(h[23])>(.*?)<\/\1>/gi,
          (match, tag, innerContent) => {
            if (innerContent.includes("<strong>")) return match;
            return `<${tag}><strong>${innerContent}</strong></${tag}>`;
          },
        );
      }
    }

    // 3. Append end content
    if (endContent && endContent.trim()) {
      finalContent += `\n\n${endContent}`;
    }

    // 4. Auto insert images (1 image per toplist item)
    let imageSearchTokensUsed = 0;
    if (autoInsertImages) {
      console.log(
        `🖼️ [${requestId}] Starting auto image insertion for toplist...`,
      );
      console.log(
        `🎯 Strategy: Insert 1 image per toplist item (after each H2/H3 heading)`,
      );

      // Search images for keyword (get itemCount * 2 to ensure enough)
      console.log(`📸 Searching images for keyword: "${keyword}"`);
      const images = await searchImagesForKeyword(keyword, itemCount * 2);

      if (images.length > 0) {
        imageSearchTokensUsed += TOKEN_COSTS.FIND_IMAGE_SERP;
        console.log(`   Found ${images.length} images for keyword`);

        // Extract all H2 and H3 headings (toplist items)
        const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;
        let headings: Array<{
          start: number;
          end: number;
          tag: string;
          content: string;
          index: number;
        }> = [];
        let match;
        let headingIndex = 0;

        while ((match = headingRegex.exec(finalContent)) !== null) {
          headings.push({
            start: match.index,
            end: match.index + match[0].length,
            tag: match[1], // h2 or h3
            content: match[0],
            index: headingIndex++,
          });
        }

        console.log(
          `   Found ${headings.length} headings (toplist items) in content`,
        );

        if (headings.length === 0) {
          console.log(`   ⚠️ No headings found, cannot insert images`);
        } else {
          // Insert 1 image after each heading (up to available images)
          const actualImageCount = Math.min(headings.length, images.length);
          console.log(`   Will insert ${actualImageCount} images (1 per item)`);

          let offset = 0; // Track content length changes

          for (let i = 0; i < actualImageCount; i++) {
            const heading = headings[i];
            const img = images[i];
            const imgTag = `\n<img src="${img.original}" alt="${img.title || keyword}" style="width: 100%; height: auto; margin: 20px 0;" />\n`;

            const insertPosition = heading.end + offset;
            finalContent =
              finalContent.slice(0, insertPosition) +
              imgTag +
              finalContent.slice(insertPosition);
            offset += imgTag.length;

            console.log(
              `   ✅ Inserted image ${i + 1}/${actualImageCount} after ${heading.tag.toUpperCase()}: "${heading.content.replace(/<[^>]*>/g, "").substring(0, 50)}..."`,
            );
          }

          console.log(
            `   Total: ${actualImageCount} images inserted successfully`,
          );
        }
      } else {
        console.log(`   ⚠️ No images found for keyword`);
      }

      console.log(`🎉 [${requestId}] Auto image insertion complete`);
    } else {
      console.log(`⏭️ [${requestId}] Auto image insertion skipped (disabled)`);
    }
    // ========================================

    // Clean HTML content before saving (remove empty paragraphs, etc.)
    console.log(`🧹 [${requestId}] Cleaning HTML content...`);
    const cleanedContent = cleanHTMLContent(finalContent);
    console.log(
      `✅ [${requestId}] Content cleaned. Before: ${finalContent.length} chars, After: ${cleanedContent.length} chars`,
    );

    // Calculate actual tokens based on word count WITH model cost multiplier
    console.log(`🧮 [${requestId}] Calculating tokens used...`);
    const articleTokens = await calculateTokens(
      cleanedContent,
      "generate_toplist",
      false,
      actualModel,
    );
    const totalEstimatedTokens = articleTokens + imageSearchTokensUsed;
    const wordCount = countWords(cleanedContent);

    console.log(`✅ [${requestId}] Toplist generated successfully`);
    console.log(`   - Word Count: ${wordCount} words`);
    console.log(`   - Model: ${actualModel}`);
    console.log(`   - Article Tokens: ${articleTokens}`);
    console.log(`   - Image Search Tokens: ${imageSearchTokensUsed}`);
    console.log(`   - Total Tokens: ${totalEstimatedTokens}`);

    console.log(`💰 [${requestId}] Deducting tokens from user account...`);
    const deductResult = await deductTokens(
      userId,
      totalEstimatedTokens,
      "GENERATE_TOPLIST",
    );

    if (!deductResult.success) {
      console.error(
        `❌ [${requestId}] Failed to deduct tokens:`,
        deductResult.error,
      );
    } else {
      console.log(
        `✅ [${requestId}] Tokens deducted. Remaining: ${deductResult.remainingTokens}`,
      );
    }

    // Save article to database with word_count and tokens_used
    console.log(`💾 [${requestId}] Saving article to database...`);
    console.log(`   Title: "${title}"`);
    console.log(`   Slug: "${slug}"`);
    console.log(`   Content length: ${cleanedContent.length} chars`);

    try {
      const result = await execute(
        `INSERT INTO articles (
          user_id,
          title,
          content,
          meta_title,
          meta_description,
          slug,
          keywords,
          word_count,
          tokens_used,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          title,
          cleanedContent, // Use cleaned content (removed empty paragraphs)
          title,
          keyword,
          slug,
          JSON.stringify([keyword]),
          wordCount, // NEW: Store word count
          totalEstimatedTokens, // NEW: Store actual tokens used
          "draft",
        ],
      );

      const articleId = (result as any).insertId;
      console.log(
        `✅ [${requestId}] Article saved to database with ID: ${articleId}`,
      );

      // Send final complete event via SSE
      console.log(`📤 [${requestId}] Sending complete event to client...`);
      sendSSE("complete", {
        success: true,
        message: "Toplist article generated and saved successfully",
        articleId: articleId,
        title,
        slug,
        content: cleanedContent, // Return cleaned content (no empty paragraphs)
        tokensUsed: totalEstimatedTokens,
        remainingTokens: deductResult.remainingTokens,
      });

      console.log(`✅ [${requestId}] Complete event sent successfully`);
      res.end();
      console.log(`✅ [${requestId}] SSE connection closed`);
    } catch (saveError) {
      console.error(
        `❌ [${requestId}] Error saving article to database:`,
        saveError,
      );

      // ✅ IMPORTANT: Still send 'complete' event so user can continue editing
      // Even if save fails, the content was generated successfully
      sendSSE("complete", {
        success: false, // Indicate save failed
        saved: false,
        error: "Failed to save article to database",
        details:
          saveError instanceof Error ? saveError.message : String(saveError),
        message:
          "Article generated but failed to save. You can still edit and manually save.",
        // Still include the content so user doesn't lose their work
        content: cleanedContent, // Return cleaned content even on error
        title: title,
        tokensUsed: totalEstimatedTokens,
        remainingTokens: deductResult.remainingTokens,
      });
      res.end();
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating toplist:`, error);

    if (error instanceof Error) {
      console.error(`[${requestId}] Error name:`, error.name);
      console.error(`[${requestId}] Error message:`, error.message);
      console.error(`[${requestId}] Error stack:`, error.stack);
    }

    try {
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      sendSSE("error", {
        error: "Failed to generate toplist article",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      });
      res.end();
    } catch (writeError) {
      console.error(`[${requestId}] Failed to send error via SSE:`, writeError);
    }
  }
};

// ====================================================================
// Handler: Generate News Article
// ====================================================================
const handleGenerateNews: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = Date.now().toString();
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[${requestId}] 🆕 NEW NEWS GENERATION REQUEST`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(
    `[${requestId}] Request body:`,
    JSON.stringify(req.body, null, 2),
  );
  console.log(`[${requestId}] Headers:`, {
    "content-type": req.headers["content-type"],
    authorization: req.headers.authorization ? "Bearer ***" : "missing",
  });
  console.log(`${"=".repeat(80)}\n`);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSE = (type: string, data: any) => {
    const sseData = { type, ...data };
    console.log(
      `[${requestId}] 📤 SSE Event:`,
      JSON.stringify(sseData, null, 2),
    );
    res.write(`data: ${JSON.stringify(sseData)}\n\n`);
  };

  try {
    // Verify user authentication
    console.log(`[${requestId}] 🔐 Step 1: Verifying authentication...`);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.error(`[${requestId}] ❌ No token provided`);
      sendSSE("error", { message: "No token provided" });
      res.end();
      return;
    }

    let userId: number;
    try {
      console.log(`[${requestId}] 🔍 Verifying JWT token...`);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as { userId: number };
      userId = decoded.userId;
      console.log(`[${requestId}] ✅ JWT valid, userId: ${userId}`);

      const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [
        userId,
      ]);
      if (!user) {
        console.error(
          `[${requestId}] ❌ User not found in database: ${userId}`,
        );
        sendSSE("error", { message: "User not found" });
        res.end();
        return;
      }
      console.log(`[${requestId}] ✅ User exists in database`);
    } catch (authError) {
      console.error(`[${requestId}] ❌ Authentication error:`, authError);
      sendSSE("error", { message: "Invalid token" });
      res.end();
      return;
    }

    const { keyword, language, model, websiteId, autoInsertImages } = req.body;
    console.log(`[${requestId}] 📝 Parsed request params:`, {
      keyword,
      language,
      model,
      websiteId,
      autoInsertImages,
      hasKeyword: !!keyword?.trim(),
    });

    if (!keyword?.trim()) {
      console.error(`[${requestId}] ❌ Missing keyword`);
      sendSSE("error", { message: "Keyword is required" });
      res.end();
      return;
    }

    console.log(`[${requestId}] ✅ All validations passed`);
    console.log(`[${requestId}] News generation request:`, {
      keyword,
      language,
      model,
      websiteId,
      userId,
    });

    // Step 1: Get website knowledge if provided
    sendSSE("progress", {
      progress: 5,
      message: "Đang tải thông tin website...",
    });
    let websiteKnowledge = "";

    if (websiteId) {
      try {
        const websiteRows = await query(
          "SELECT knowledge FROM websites WHERE id = ? AND user_id = ?",
          [websiteId, userId],
        );
        if (websiteRows && websiteRows.length > 0) {
          websiteKnowledge = websiteRows[0].knowledge || "";
          console.log(
            `[${requestId}] Loaded website knowledge for website ID: ${websiteId}`,
          );
        }
      } catch (error) {
        console.error(`[${requestId}] Error loading website knowledge:`, error);
      }
    }

    // Step 2: Fetch search API keys from database (flexible fallback)
    sendSSE("progress", { progress: 10, message: "Đang tìm kiếm tin tức..." });

    console.log(
      `[${requestId}] 🔍 Step 2: Fetching search API keys from database...`,
    );
    const apiKeysRows = await query(
      "SELECT id, provider, api_key, quota_remaining FROM api_keys WHERE category = ? AND is_active = TRUE ORDER BY RAND()",
      ["search"],
    );

    console.log(
      `[${requestId}] 📊 Search API keys found: ${apiKeysRows.length}`,
    );
    if (apiKeysRows.length === 0) {
      console.error(
        `[${requestId}] ❌ No search API keys available in database!`,
      );
      throw new Error("No search API keys available");
    }

    console.log(`[${requestId}] Found ${apiKeysRows.length} search API keys`);

    // Step 3: Try each API until one succeeds
    let newsResults: any[] = [];
    let usedProvider = "";
    let searchError = "";

    for (const apiKeyRow of apiKeysRows) {
      try {
        const providerLower = apiKeyRow.provider.toLowerCase();
        console.log(`[${requestId}] Trying ${apiKeyRow.provider}...`);

        if (providerLower === "serpapi") {
          // SerpAPI News Search
          const params = new URLSearchParams({
            engine: "google_news",
            q: keyword,
            api_key: apiKeyRow.api_key,
            hl: language === "vi" ? "vi" : "en",
            gl: language === "vi" ? "vn" : "us",
            num: "10",
          });

          const response = await fetch(`https://serpapi.com/search?${params}`);
          if (!response.ok) {
            throw new Error(`SerpAPI returned ${response.status}`);
          }

          const data = await response.json();
          if (data.news_results && data.news_results.length > 0) {
            newsResults = data.news_results.map((item: any) => ({
              title: item.title || "",
              snippet: item.snippet || "",
              source: item.source?.name || "",
              date: item.date || "",
              link: item.link || "",
            }));
            usedProvider = "SerpAPI";
            break;
          }
        } else if (providerLower === "serper") {
          // Serper News Search
          const response = await fetch("https://google.serper.dev/news", {
            method: "POST",
            headers: {
              "X-API-KEY": apiKeyRow.api_key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: keyword,
              gl: language === "vi" ? "vn" : "us",
              hl: language === "vi" ? "vi" : "en",
              num: 10,
            }),
          });

          if (!response.ok) {
            throw new Error(`Serper returned ${response.status}`);
          }

          const data = await response.json();
          if (data.news && data.news.length > 0) {
            newsResults = data.news.map((item: any) => ({
              title: item.title || "",
              snippet: item.snippet || "",
              source: item.source || "",
              date: item.date || "",
              link: item.link || "",
            }));
            usedProvider = "Serper";
            break;
          }
        } else if (providerLower === "zenserp") {
          // Zenserp News Search
          const params = new URLSearchParams({
            apikey: apiKeyRow.api_key,
            q: keyword,
            tbm: "nws",
            location: language === "vi" ? "Vietnam" : "United States",
            hl: language === "vi" ? "vi" : "en",
            num: "10",
          });

          const response = await fetch(
            `https://app.zenserp.com/api/v2/search?${params}`,
          );
          if (!response.ok) {
            throw new Error(`Zenserp returned ${response.status}`);
          }

          const data = await response.json();
          if (data.news_results && data.news_results.length > 0) {
            newsResults = data.news_results.map((item: any) => ({
              title: item.title || "",
              snippet: item.snippet || "",
              source: item.source || "",
              date: item.date || "",
              link: item.url || "",
            }));
            usedProvider = "Zenserp";
            break;
          }
        }

        // Update last_used_at
        await execute("UPDATE api_keys SET last_used_at = NOW() WHERE id = ?", [
          apiKeyRow.id,
        ]);
      } catch (error) {
        searchError = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[${requestId}] ${apiKeyRow.provider} failed:`,
          searchError,
        );
        continue; // Try next API
      }
    }

    if (newsResults.length === 0) {
      throw new Error(`All search APIs failed. Last error: ${searchError}`);
    }

    console.log(
      `[${requestId}] Successfully fetched ${newsResults.length} news results using ${usedProvider}`,
    );
    sendSSE("progress", {
      progress: 30,
      message: `Đã tìm thấy ${newsResults.length} tin tức từ ${usedProvider}`,
    });

    // Step 4: Aggregate news information
    sendSSE("progress", {
      progress: 35,
      message: "Đang tổng hợp thông tin...",
    });

    const newsContext = newsResults
      .map(
        (item, idx) =>
          `[${idx + 1}] ${item.title}\n${item.snippet}\nNguồn: ${item.source} - ${item.date}`,
      )
      .join("\n\n");

    // Step 4.5: Get API key from database based on selected model
    console.log(
      `[${requestId}] 🔑 Step 4.5: Getting API key for model: ${model}`,
    );

    // Determine provider based on model
    let selectedProvider = "openai";
    let selectedApiKey: string;

    if (model && (model.startsWith("gemini") || model.includes("gemini"))) {
      selectedProvider = "google-ai";
      console.log(
        `[${requestId}] 🤖 Model is Gemini, looking for Google AI API key`,
      );

      const geminiKeyRows = await query(
        "SELECT api_key FROM api_keys WHERE provider = ? AND category = ? AND is_active = TRUE LIMIT 1",
        ["google-ai", "content"],
      );

      if (geminiKeyRows.length === 0) {
        console.error(
          `[${requestId}] ❌ Google AI (Gemini) API key not found in database!`,
        );
        throw new Error("Google AI (Gemini) API key not found in database");
      }

      selectedApiKey = geminiKeyRows[0].api_key;
      console.log(
        `[${requestId}] ✅ Retrieved Google AI API key: ${selectedApiKey.substring(0, 10)}...`,
      );
    } else {
      selectedProvider = "openai";
      console.log(
        `[${requestId}] 🤖 Model is OpenAI (${model}), looking for OpenAI API key`,
      );

      const openaiKeyRows = await query(
        "SELECT api_key FROM api_keys WHERE provider = ? AND category = ? AND is_active = TRUE LIMIT 1",
        ["openai", "content"],
      );

      if (openaiKeyRows.length === 0) {
        console.error(
          `[${requestId}] ❌ OpenAI API key not found in database!`,
        );
        throw new Error("OpenAI API key not found in database");
      }

      selectedApiKey = openaiKeyRows[0].api_key;
      console.log(
        `[${requestId}] ✅ Retrieved OpenAI API key: ${selectedApiKey.substring(0, 10)}...`,
      );
    }

    // Step 5: Generate article title using AI
    sendSSE("progress", { progress: 40, message: "Đang tạo tiêu đề..." });

    // Load title prompt from database (consistent with other features)
    const titlePromptTemplate = await loadPrompt("generate_news_title");
    const titlePrompt = titlePromptTemplate
      ? titlePromptTemplate.prompt_template
          .replace("{keyword}", keyword)
          .replace("{language}", language === "vi" ? "Vietnamese" : "English")
          .replace("{news_context}", newsContext)
          .replace(
            "{website_knowledge}",
            websiteKnowledge
              ? `\n\nWebsite style guide:\n${websiteKnowledge}`
              : "",
          )
      : `Based on these news articles about "${keyword}", create a compelling news article title in ${language === "vi" ? "Vietnamese" : "English"}.

News sources:
${newsContext}

Requirements:
- Make it engaging and newsworthy
- Keep it concise (under 100 characters)
- Focus on the most important/latest information
- Use journalistic tone
${websiteKnowledge ? `\n\nWebsite style guide:\n${websiteKnowledge}` : ""}

Return ONLY the title, nothing else.`; // Fallback

    console.log(`[${requestId}] 📝 Step 5.1: Generating article title...`);
    console.log(
      `[${requestId}] Using prompt template: ${titlePromptTemplate ? "from database" : "fallback"}`,
    );
    console.log(
      `[${requestId}] Using provider: ${selectedProvider}, model: ${model}`,
    );

    let articleTitle = "";

    if (selectedProvider === "google-ai") {
      // Use Gemini for title generation
      console.log(`[${requestId}] 🤖 Using Gemini to generate title...`);

      try {
        // @ts-expect-error - GoogleGenerativeAI may not be installed
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(selectedApiKey);
        const geminiModel = genAI.getGenerativeModel({ model });

        const titleResult = await geminiModel.generateContent(titlePrompt);
        const titleText = titleResult.response.text();
        articleTitle = titleText.trim() || keyword;
        console.log(
          `[${requestId}] ✅ Generated title via Gemini: "${articleTitle}"`,
        );
      } catch (error) {
        console.error(
          `[${requestId}] ❌ Gemini title generation failed:`,
          error,
        );
        articleTitle = keyword;
        console.log(
          `[${requestId}] ⚠️ Using fallback title: "${articleTitle}"`,
        );
      }
    } else {
      // Use OpenAI for title generation
      const titleResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${selectedApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: titlePrompt }],
            temperature: 0.8,
            max_tokens: 100,
          }),
        },
      );

      console.log(
        `[${requestId}] 🌐 OpenAI title response status: ${titleResponse.status} ${titleResponse.statusText}`,
      );

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        articleTitle =
          titleData.choices[0]?.message?.content?.trim() || keyword;
        console.log(
          `[${requestId}] ✅ Generated title via OpenAI: "${articleTitle}"`,
        );
      } else {
        const errorText = await titleResponse.text();
        console.error(
          `[${requestId}] ❌ OpenAI title generation failed:`,
          errorText,
        );
        articleTitle = keyword; // Fallback
        console.log(
          `[${requestId}] ⚠️ Using fallback title: "${articleTitle}"`,
        );
      }
    }

    console.log(`[${requestId}] Final article title: ${articleTitle}`);

    // Step 6: Generate news article content
    sendSSE("progress", { progress: 50, message: "Đang viết bài tin tức..." });

    // Load article prompt from database (consistent with other features)
    const articlePromptTemplate = await loadPrompt("generate_news_article");
    const articlePrompt = articlePromptTemplate
      ? articlePromptTemplate.prompt_template
          .replace("{keyword}", keyword)
          .replace("{language}", language === "vi" ? "Vietnamese" : "English")
          .replace("{news_context}", newsContext)
          .replace("{article_title}", articleTitle)
          .replace(
            "{website_knowledge}",
            websiteKnowledge
              ? `\n\nWebsite style guide to follow:\n${websiteKnowledge}`
              : "",
          )
      : `You are a professional news writer. Write a comprehensive news article based on the following sources about "${keyword}".

News sources to aggregate:
${newsContext}

Requirements:
1. Write in ${language === "vi" ? "Vietnamese" : "English"}
2. Combine information from multiple sources
3. Use journalistic inverted pyramid style (most important info first)
4. Include key facts: who, what, when, where, why, how
5. Attribute information to sources when relevant
6. Be objective and factual
7. Use proper HTML formatting: <h2> for sections, <p> for paragraphs, <strong> for emphasis
8. Minimum 800 words
9. Do NOT copy directly - rewrite and synthesize information
10. IMPORTANT: Do NOT include the title "${articleTitle}" in the article body. Start directly with the content.
11. Do NOT use <h1> tags. Only use <h2> and <h3> for section headings.
${websiteKnowledge ? `\n\nWebsite style guide to follow:\n${websiteKnowledge}` : ""}

Article title: ${articleTitle}

Write the complete article content now (without repeating the title):`; // Fallback

    let finalContent = "";
    let tokensUsed = 0;

    if (model.startsWith("gemini")) {
      // Get Gemini API key from database
      const geminiKeyRows = await query(
        "SELECT api_key FROM api_keys WHERE provider = ? AND category = ? AND is_active = TRUE LIMIT 1",
        ["google-ai", "content"],
      );

      if (geminiKeyRows.length === 0) {
        throw new Error("Gemini API key not found in database");
      }

      const geminiApiKey = geminiKeyRows[0].api_key;
      console.log(`[${requestId}] Retrieved Gemini API key from database`);

      // Use Gemini with Google Search capability
      // @ts-expect-error - GoogleGenerativeAI may not be installed
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const geminiModel = genAI.getGenerativeModel({
        model: model,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      });

      const result = await geminiModel.generateContent(articlePrompt);
      const response = result.response;
      finalContent = response.text();

      // Estimate tokens for Gemini
      tokensUsed = Math.ceil((articlePrompt.length + finalContent.length) / 4);
    } else {
      // Use OpenAI models
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${selectedApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: articlePrompt }],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        },
      );

      if (!openaiResponse.ok) {
        throw new Error("Failed to generate article with OpenAI");
      }

      const openaiData = await openaiResponse.json();
      finalContent = openaiData.choices[0]?.message?.content || "";
      tokensUsed = openaiData.usage?.total_tokens || 0;
    }

    sendSSE("progress", { progress: 80, message: "Đang tạo metadata SEO..." });

    // Step 7: Generate SEO title (load from database)
    const seoTitlePromptTemplate = await loadPrompt("generate_news_seo_title");
    const seoTitlePrompt = seoTitlePromptTemplate
      ? seoTitlePromptTemplate.prompt_template
          .replace("{article_title}", articleTitle)
          .replace("{language}", language === "vi" ? "Vietnamese" : "English")
      : `Create an SEO-optimized title for this news article: "${articleTitle}". Make it ${language === "vi" ? "Vietnamese" : "English"}, under 60 characters, keyword-rich. Return ONLY the title.`; // Fallback

    let seoTitle = articleTitle;
    const seoTitleResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${selectedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: seoTitlePrompt }],
          temperature: 0.7,
          max_tokens: 80,
        }),
      },
    );

    if (seoTitleResponse.ok) {
      const seoTitleData = await seoTitleResponse.json();
      seoTitle =
        seoTitleData.choices[0]?.message?.content?.trim() || articleTitle;
      tokensUsed += seoTitleData.usage?.total_tokens || 0;
    }

    // Step 8: Generate meta description (load from database)
    const metaPromptTemplate = await loadPrompt(
      "generate_news_meta_description",
    );
    const metaPrompt = metaPromptTemplate
      ? metaPromptTemplate.prompt_template
          .replace("{article_title}", articleTitle)
          .replace("{language}", language === "vi" ? "Vietnamese" : "English")
      : `Create a compelling meta description for this news article: "${articleTitle}". Make it ${language === "vi" ? "Vietnamese" : "English"}, 150-160 characters, engaging. Return ONLY the description.`; // Fallback

    let metaDescription = articleTitle.substring(0, 160);
    const metaResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${selectedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: metaPrompt }],
          temperature: 0.7,
          max_tokens: 100,
        }),
      },
    );

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      metaDescription =
        metaData.choices[0]?.message?.content?.trim() || metaDescription;
      tokensUsed += metaData.usage?.total_tokens || 0;
    }

    sendSSE("progress", { progress: 90, message: "Đang lưu bài viết..." });

    // Step 8.5: Auto insert images (1 image per heading, similar to Toplist)
    let imageSearchTokensUsed = 0;
    if (autoInsertImages) {
      console.log(
        `🖼️ [${requestId}] Starting auto image insertion for news...`,
      );
      console.log(`🎯 Strategy: Insert 1 image after each H2/H3 heading`);

      // Search images for keyword
      console.log(`📸 Searching images for keyword: "${keyword}"`);
      const images = await searchImagesForKeyword(keyword, 20); // Get plenty of images

      if (images.length > 0) {
        imageSearchTokensUsed += TOKEN_COSTS.FIND_IMAGE_SERP;
        console.log(`   Found ${images.length} images for keyword`);

        // Extract all H2 and H3 headings
        const headingRegex = /<(h[23])\b[^>]*>([\s\S]*?)<\/\1>/gi;
        let headings: Array<{
          start: number;
          end: number;
          tag: string;
          content: string;
          index: number;
        }> = [];
        let match;
        let headingIndex = 0;

        while ((match = headingRegex.exec(finalContent)) !== null) {
          headings.push({
            start: match.index,
            end: match.index + match[0].length,
            tag: match[1], // h2 or h3
            content: match[0],
            index: headingIndex++,
          });
        }

        console.log(`   Found ${headings.length} headings in news article`);

        if (headings.length === 0) {
          console.log(`   ⚠️ No headings found, cannot insert images`);
        } else {
          // Insert 1 image after each heading (up to available images)
          const actualImageCount = Math.min(headings.length, images.length);
          console.log(
            `   Will insert ${actualImageCount} images (1 per heading)`,
          );

          let offset = 0; // Track content length changes

          for (let i = 0; i < actualImageCount; i++) {
            const heading = headings[i];
            const img = images[i];
            const imgTag = `\n<img src="${img.original}" alt="${img.title || keyword}" style="width: 100%; height: auto; margin: 20px 0;" />\n`;

            const insertPosition = heading.end + offset;
            finalContent =
              finalContent.slice(0, insertPosition) +
              imgTag +
              finalContent.slice(insertPosition);
            offset += imgTag.length;

            console.log(
              `   ✅ Inserted image ${i + 1}/${actualImageCount} after ${heading.tag.toUpperCase()}: "${heading.content.replace(/<[^>]*>/g, "").substring(0, 50)}..."`,
            );
          }

          console.log(
            `   Total: ${actualImageCount} images inserted successfully`,
          );
        }
      } else {
        console.log(`   ⚠️ No images found for keyword`);
      }

      console.log(`🎉 [${requestId}] Auto image insertion complete`);
    } else {
      console.log(`⏭️ [${requestId}] Auto image insertion skipped (disabled)`);
    }

    // Step 9: Clean HTML content
    console.log(`[${requestId}] 🧹 Step 9: Cleaning content...`);
    console.log(
      `[${requestId}] Original content length: ${finalContent.length}`,
    );
    console.log(
      `[${requestId}] First 200 chars: ${finalContent.substring(0, 200)}`,
    );

    // Remove markdown code fence markers (```html, ```)
    let cleanedContent = finalContent
      .replace(/^```html\s*/i, "") // Remove opening ```html
      .replace(/^```[a-z]*\s*/i, "") // Remove other opening fences
      .replace(/\s*```$/i, "") // Remove closing ```
      .trim();

    console.log(
      `[${requestId}] After markdown removal: ${cleanedContent.substring(0, 200)}`,
    );

    // Remove ALL h1 tags from the entire content (not just at the beginning)
    // The title should NEVER appear in article content
    cleanedContent = cleanedContent.replace(/<h1[^>]*>.*?<\/h1>\s*/gis, "");

    console.log(
      `[${requestId}] After h1 removal: ${cleanedContent.substring(0, 200)}`,
    );

    // Also remove if title text appears at the start (without tags)
    const escapedTitle = articleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titleVariations = [
      new RegExp(`^${escapedTitle}\\s*`, "i"),
      new RegExp(`^${escapedTitle}\\?\\s*`, "i"), // With question mark
      new RegExp(`^<p[^>]*>\\s*${escapedTitle}\\s*</p>\\s*`, "i"), // In p tag
    ];

    for (const variation of titleVariations) {
      cleanedContent = cleanedContent.replace(variation, "");
    }

    console.log(
      `[${requestId}] After title text removal: ${cleanedContent.substring(0, 200)}`,
    );

    // Apply standard HTML cleaning
    cleanedContent = cleanHTMLContent(cleanedContent);

    console.log(
      `[${requestId}] ✅ Content cleaned. Length: ${cleanedContent.length}`,
    );

    // Step 10: Save to database
    console.log(`[${requestId}] 💾 Step 10: Saving article to database...`);
    console.log(`[${requestId}] Article details:`, {
      userId,
      titleLength: articleTitle.length,
      contentLength: cleanedContent.length,
      seoTitleLength: seoTitle.length,
      metaDescLength: metaDescription.length,
    });

    const result: any = await execute(
      `INSERT INTO articles (user_id, title, content, seo_title, meta_description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())`,
      [userId, articleTitle, cleanedContent, seoTitle, metaDescription],
    );

    const articleId = result.insertId;
    console.log(`[${requestId}] ✅ Article saved with ID: ${articleId}`);

    // Step 11: Deduct tokens
    console.log(
      `[${requestId}] 💰 Step 11: Deducting ${tokensUsed} tokens from user ${userId}...`,
    );
    await execute(
      "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
      [tokensUsed, userId],
    );

    // Get remaining tokens
    const userRows: any = await query(
      "SELECT tokens_remaining FROM users WHERE id = ?",
      [userId],
    );
    const remainingTokens = userRows[0]?.tokens_remaining || 0;

    console.log(
      `[${requestId}] News generation complete. Tokens used: ${tokensUsed}, Remaining: ${remainingTokens}`,
    );

    sendSSE("complete", {
      progress: 100,
      message: "Hoàn thành!",
      articleId,
      tokensUsed,
      remainingTokens,
      searchProvider: usedProvider,
    });

    res.end();
  } catch (error) {
    console.error(`\n${"=".repeat(80)}`);
    console.error(`[${requestId}] ❌ FATAL ERROR in news generation`);
    console.error(
      `[${requestId}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
    );
    console.error(
      `[${requestId}] Error message:`,
      error instanceof Error ? error.message : error,
    );
    console.error(
      `[${requestId}] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(`${"=".repeat(80)}\n`);

    try {
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      sendSSE("error", {
        error: "Failed to generate news article",
        details: errorMessage,
        timestamp: new Date().toISOString(),
        requestId,
      });
      res.end();
    } catch (writeError) {
      console.error(`[${requestId}] Failed to send error via SSE:`, writeError);
    }
  }
};

/**
 * Unified Rewrite Handler - Supports 4 rewrite modes:
 * 1. paragraph: Rewrite paragraph with specified writing style
 * 2. keywords: Rewrite based on keywords with voice/tone and method
 * 3. url: Rewrite from URL with keywords and options
 * 4. news: Rewrite news content with creativity level
 */
const handleUnifiedRewrite: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const {
      mode = "paragraph",
      content,
      url,
      keywords,
      writingStyle,
      voiceAndTone,
      writingMethod,
      creativityLevel,
      language = "vi",
      model = "gpt-3.5-turbo",
      websiteKnowledge,
      autoInsertImages = false,
    } = req.body;

    // Validate mode
    const validModes = ["paragraph", "keywords", "url", "news"];
    if (!validModes.includes(mode)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid rewrite mode" });
    }

    // Mode-specific validation
    if (mode === "paragraph" && !content) {
      return res.status(400).json({
        success: false,
        error: "Content is required for paragraph mode",
      });
    }
    if (mode === "keywords" && (!content || !keywords)) {
      return res.status(400).json({
        success: false,
        error: "Article content and keywords are required for keywords mode",
      });
    }
    if (mode === "url" && (!url || !keywords)) {
      return res
        .status(400)
        .json({ success: false, error: "URL and keywords are required" });
    }
    if (mode === "news" && !content) {
      return res
        .status(400)
        .json({ success: false, error: "Content is required for news mode" });
    }

    // Estimate tokens (simplified: 1 word ≈ 1.3 tokens)
    let textToEstimate = "";
    if (mode === "keywords") {
      textToEstimate = (content || "") + " " + (keywords || "");
    } else {
      textToEstimate = content || keywords || url || "";
    }
    const estimatedTokens = Math.ceil(
      textToEstimate.split(" ").length * 1.3 * 2,
    ); // Double for rewrite output

    // Check token balance
    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "REWRITE",
    );
    if (!tokenCheck.allowed) {
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
      });
    }

    // Get API key and provider based on model selection
    const modelConfig = await getApiKeyForModel(model, false);
    
    if (!modelConfig) {
      const provider = model.toLowerCase().includes("gemini") ? "Google AI" : "OpenAI";
      return res.status(503).json({
        success: false,
        error: `${provider} API key not configured`,
      });
    }

    const { apiKey, provider, actualModel } = modelConfig;

    // Build the rewrite prompt based on mode
    let systemPrompt = getSystemPrompt("ai_rewrite");
    let userPrompt = "";

    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
    };

    const languageName = languageNames[language] || "English";
    const languageInstruction =
      language !== "en" ? `\n\nWrite in ${languageName}.` : "";

    switch (mode) {
      case "paragraph":
        userPrompt = `Rewrite the following paragraph in ${writingStyle} style.${languageInstruction}\n\nOriginal text:\n${content}`;
        break;

      case "keywords":
        const methodDesc: Record<string, string> = {
          "keep-headings":
            "Keep existing H2, H3, H4 headings as-is, only rewrite content.",
          "rewrite-all": "Rewrite both content and headings completely.",
          "deep-rewrite": "Deep rewrite - avoid any 100% duplicate content.",
        };
        userPrompt = `Rewrite the following article while incorporating these keywords naturally to maintain SEO value:

Keywords to use: ${keywords}
Voice & Tone: ${voiceAndTone}
Writing Method: ${methodDesc[writingMethod] || "Standard"}${languageInstruction}

Original Article:
${content}`;
        break;

      case "url":
        userPrompt = `Fetch and rewrite the content from this URL: ${url}
Keywords to optimize: ${keywords}
Voice & Tone: ${voiceAndTone}
Writing Method: ${writingMethod}${languageInstruction}`;
        break;

      case "news":
        const creativityDesc: Record<string, string> = {
          low: "Make minimal changes - keep content mostly the same with slight wording improvements.",
          medium: "Change content length and structure moderately.",
          high: "Transform completely - change style, structure, and length significantly.",
        };
        userPrompt = `Rewrite the following news article with ${creativityDesc[creativityLevel] || "moderate"} changes.${languageInstruction}\n\nOriginal content:\n${content}`;
        break;
    }

    // Inject website knowledge if provided
    if (websiteKnowledge) {
      systemPrompt = injectWebsiteKnowledge(systemPrompt, websiteKnowledge);
    }

    // Call appropriate API based on provider
    let response;
    let data;

    if (provider === "google-ai") {
      // Use Google Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`;
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: mode === "news" && creativityLevel === "high" ? 0.8 : 0.6,
            maxOutputTokens: 4000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google AI API error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: "Failed to generate rewritten content",
        });
      }

      data = await response.json();
      const rewrittenContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rewrittenContent) {
        return res.status(500).json({
          success: false,
          error: "No content generated",
        });
      }

      // Calculate actual tokens used
      const actualTokens = await calculateTokens(
        rewrittenContent,
        "ai_rewrite_text",
        false,
        actualModel,
      );

      // Deduct tokens
      await execute(
        "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
        [actualTokens, userId],
      );

      // Get remaining tokens
      const userRows: any = await query(
        "SELECT tokens_remaining FROM users WHERE id = ?",
        [userId],
      );
      const remainingTokens = userRows[0]?.tokens_remaining || 0;

      return res.json({
        success: true,
        content: rewrittenContent,
        mode,
        tokensUsed: actualTokens,
        remainingTokens,
        message: "Content successfully rewritten!",
      });
    } else {
      // Use OpenAI API
      response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          temperature:
            mode === "news" && creativityLevel === "high" ? 0.8 : 0.6,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        return res.status(response.status).json({
          success: false,
          error: "Failed to generate rewritten content",
        });
      }

      data = await response.json();
      const rewrittenContent = data.choices?.[0]?.message?.content || "";

      if (!rewrittenContent) {
        return res.status(500).json({
          success: false,
          error: "No content generated",
        });
      }

      // Calculate actual tokens used
      const actualTokens = await calculateTokens(
        rewrittenContent,
        "ai_rewrite_text",
        false,
        actualModel,
      );

      // Deduct tokens
      await execute(
        "UPDATE users SET tokens_remaining = tokens_remaining - ? WHERE id = ?",
        [actualTokens, userId],
      );

      // Get remaining tokens
      const userRows: any = await query(
        "SELECT tokens_remaining FROM users WHERE id = ?",
        [userId],
      );
      const remainingTokens = userRows[0]?.tokens_remaining || 0;

      return res.json({
        success: true,
        content: rewrittenContent,
        mode,
        tokensUsed: actualTokens,
        remainingTokens,
        message: "Content successfully rewritten!",
      });
    }
  } catch (error) {
    console.error("Error in unified rewrite:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

router.post("/rewrite", handleUnifiedRewrite);
router.post("/find-image", handleFindImage);
router.post("/write-more", handleWriteMore);
router.post("/generate-outline", handleGenerateOutline); // NEW: Generate outline endpoint
router.post("/generate-article", handleGenerateArticle);
router.post("/generate-seo-title", handleGenerateSeoTitle);
router.post("/generate-meta-description", handleGenerateMetaDescription);
router.post("/generate-article-title", handleGenerateArticleTitle); // NEW: Generate article title
router.post("/generate-toplist-outline", handleGenerateToplistOutline); // NEW: Toplist outline
router.post("/generate-toplist", handleGenerateToplist); // NEW: Toplist article
router.post("/generate-news", handleGenerateNews); // NEW: News article

// ===== AUTO-BLOG ENDPOINTS =====

const handleAutoBlogConfig: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const config = req.body;

    // Validate required fields
    if (!config.keywordPool || config.keywordPool.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Danh sách từ khóa không được để trống",
      });
    }

    if (!config.model) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng chọn model AI",
      });
    }

    // Validate competitor URLs if competitor analysis is enabled
    let competitorUrlsList: string[] = [];
    if (config.competitorAnalysis) {
      if (!config.competitorUrls || config.competitorUrls.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Vui lòng nhập danh sách URL website đối thủ cạnh tranh",
        });
      }

      // Parse and validate competitor URLs
      competitorUrlsList = config.competitorUrls
        .split("\n")
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);

      // Basic URL validation
      const urlRegex = /^https?:\/\/.+\..+/i;
      const invalidUrls = competitorUrlsList.filter((url) => !urlRegex.test(url));

      if (invalidUrls.length > 0) {
        return res.status(400).json({
          success: false,
          error: `URL không hợp lệ: ${invalidUrls.join(", ")}`,
        });
      }
    }

    // Validate internal linking website if enabled
    if (config.internalLinking && !config.selectedWebsiteForInternalLinks) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng chọn website để lấy bài viết liên quan",
      });
    }

    // Validate publishing website if article status is publish
    if (config.articleStatus === "publish" && !config.selectedWebsiteForPublishing) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng chọn website để đăng bài",
      });
    }

    // Log configuration details
    console.log("✓ Auto-blog config received for user:", userId);
    console.log("  - Keywords:", config.keywordPool.split("\n").filter((k: string) => k.trim()).length, "items");
    console.log("  - Trend Monitoring:", config.trendMonitoring);
    console.log("  - Competitor Analysis:", config.competitorAnalysis);
    if (config.competitorAnalysis) {
      console.log("  - Competitor URLs:", competitorUrlsList.length, "sites");
      competitorUrlsList.forEach((url: string) => {
        console.log("    •", url);
      });
    }
    console.log("  - Content Length:", config.contentLength);
    console.log("  - Language:", config.language);
    console.log("  - Persona:", config.persona);
    console.log("  - Human-like Mode:", config.humanLike);
    console.log("  - Auto Metadata:", config.autoGenerateMetadata);
    console.log("  - Internal Linking:", config.internalLinking);
    console.log("  - External Linking:", config.externalLinking);
    console.log("  - Article Status:", config.articleStatus);
    console.log("  - Scheduling:", config.scheduling);
    console.log("  - AI Detection Filter:", config.aiDetectionFilter);
    console.log("  - Batch Frequency:", config.batchFrequency);
    console.log("  - Auto Start:", config.autoStart);
    console.log("  - Model:", config.model);

    // TODO: Save auto-blog configuration to database
    // TABLE: auto_blog_configs (id, user_id, config_json, status, created_at, updated_at)
    // For now, just acknowledge the config

    const configId = Math.random().toString(36).substr(2, 9);

    return res.json({
      success: true,
      message: "Cấu hình tự động viết blog đã được lưu thành công!",
      configId: configId,
      status: config.autoStart ? "running" : "paused",
      competitorCount: competitorUrlsList.length,
      keywordCount: config.keywordPool.split("\n").filter((k: string) => k.trim()).length,
    });
  } catch (error) {
    console.error("Error saving auto-blog config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to save auto-blog configuration",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

router.post("/autoblog/config", handleAutoBlogConfig);

export { router as aiRouter };
