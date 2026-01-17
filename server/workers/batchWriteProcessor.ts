/**
 * Batch Write Processor - New Implementation
 *
 * Workflow:
 * 1. Create article record with keywords array
 * 2. Generate SEO Title using batch_write_seo_title prompt
 * 3. Generate Meta Description using batch_write_meta_description prompt
 * 4. Generate article content
 * 5. Generate final title using batch_write_article_title prompt
 * 6. Validate all required fields before marking as complete
 * 7. Mark article as published if all validations pass
 */

import { query, execute } from "../db";
import * as aiService from "../services/aiService";

/**
 * Simple AI caller for rewriting content
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
    if (provider === "google-ai" || provider === "gemini") {
      // Call Google AI (Gemini)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Google AI API error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!content && data.candidates?.[0]?.content?.parts?.length > 1) {
        content = data.candidates[0].content.parts
          .map((p: any) => p.text || "")
          .filter((t: any) => t && t.trim())
          .join(" ");
      }

      content = content.trim();
      
      if (!content) {
        return { success: false, error: "No content generated from Google AI" };
      }

      const tokensUsed = Math.ceil(content.length / 4);
      return { success: true, content, tokensUsed };
    } else if (provider === "openai") {
      // Call OpenAI
      const url = "https://api.openai.com/v1/chat/completions";
      
      const response = await fetch(url, {
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
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `OpenAI API error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (!content) {
        return { success: false, error: "No content generated from OpenAI" };
      }

      const tokensUsed = data.usage?.total_tokens || Math.ceil(content.length / 4);
      return { success: true, content, tokensUsed };
    } else {
      return { success: false, error: `Unsupported provider: ${provider}` };
    }
  } catch (error: any) {
    console.error("callAI error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}


interface BatchJob {
  id: number;
  user_id: number;
  job_type: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  job_data: any;
  article_ids: any;
  current_item_index: number;
  tokens_at_start: number;
  tokens_used: number;
  articles_limit_at_start: number;
  error_message: string | null;
}

interface JobData {
  keywords?: string[];
  sources?: string[]; // For batch_source: ["keyword|url", ...]
  settings: {
    model?: string;
    language?: string;
    tone?: string;
    length?: string;
    outlineOption?: string;
    customOutline?: string;
    autoInsertImages?: boolean;
    maxImages?: number;
    websiteId?: number | null;
    useGoogleSearch?: boolean;
    voiceAndTone?: string; // For batch_source
    writingMethod?: string; // For batch_source
    websiteKnowledge?: string; // For batch_source
  };
}

// Track processing jobs by user_id to avoid processing same user's jobs concurrently
const processingJobs = new Set<number>();
const MAX_CONCURRENT_JOBS = 5;

/**
 * Main worker function - processes batch jobs in parallel
 */
export async function processBatchWriteJobs() {
  try {
    // Get pending batch jobs (both keywords and source)
    const jobs = await query<BatchJob>(
      `SELECT * FROM batch_jobs 
       WHERE status = 'pending' AND job_type IN ('batch_keywords', 'batch_source')
       ORDER BY created_at ASC 
       LIMIT ?`,
      [MAX_CONCURRENT_JOBS],
    );

    if (!jobs || jobs.length === 0) {
      return;
    }

    // Filter out jobs for users already being processed
    const availableJobs = jobs.filter(
      (job) => !processingJobs.has(job.user_id),
    );

    if (availableJobs.length === 0) {
      console.log(
        "[BatchWrite] All pending jobs are for users already being processed",
      );
      return;
    }

    console.log(
      `[BatchWrite] Processing ${availableJobs.length} batch write jobs`,
    );

    // Process all available jobs in parallel
    const promises = availableJobs.map((job) => processJob(job));
    await Promise.allSettled(promises);
  } catch (error: any) {
    console.error("[BatchWrite] Unexpected error:", error);
  }
}

/**
 * Process a single batch write job
 */
async function processJob(job: BatchJob) {
  processingJobs.add(job.user_id);

  try {
    console.log(
      `\n[BatchWrite] Processing job #${job.id} for user ${job.user_id}`,
    );

    // Mark as processing
    await execute(
      `UPDATE batch_jobs SET status = 'processing', started_at = COALESCE(started_at, NOW()), last_activity_at = NOW() WHERE id = ?`,
      [job.id],
    );

    // Parse job data
    let jobData: JobData;
    try {
      jobData =
        typeof job.job_data === "string"
          ? JSON.parse(job.job_data)
          : job.job_data;
    } catch (error) {
      await markJobFailed(job.id, "Invalid job data format");
      return;
    }

    const { keywords, sources, settings } = jobData;
    
    // Determine items based on job type
    const items = job.job_type === 'batch_source' ? sources : keywords;
    const itemType = job.job_type === 'batch_source' ? 'sources' : 'keywords';
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await markJobFailed(job.id, `No ${itemType} provided`);
      return;
    }

    let articleIds: number[] = [];
    const startIndex = job.current_item_index || 0;
    let hasOverloadError = false; // Track if any error is due to API overload
    let failedKeywords: string[] = []; // Track failed keywords for error message
    const MAX_FAILURES = 5; // Stop batch job if 5+ articles fail

    // Process each item sequentially
    for (let i = startIndex; i < items.length; i++) {
      const itemLine = items[i];

      // Check job status
      const currentJobs = await query<BatchJob>(
        "SELECT status FROM batch_jobs WHERE id = ?",
        [job.id],
      );
      const currentJob = currentJobs?.[0];
      if (!currentJob || currentJob.status === "cancelled") {
        console.log(`[BatchWrite] Job #${job.id} cancelled, stopping`);
        return;
      }

      if (currentJob.status === "paused") {
        console.log(`[BatchWrite] Job #${job.id} paused, stopping`);
        return;
      }

      // Check user limits BEFORE attempting to write
      // If either tokens or articles_limit is exhausted, pause the job
      // Get tokens from users table and articles_limit from user_subscriptions table
      const userTokenData = await query<any>(
        "SELECT tokens_remaining FROM users WHERE id = ?",
        [job.user_id],
      );
      const subscriptionData = await query<any>(
        "SELECT articles_limit FROM user_subscriptions WHERE user_id = ? AND is_active = TRUE",
        [job.user_id],
      );

      const user = userTokenData?.[0];
      const subscription = subscriptionData?.[0];

      if (!user || !subscription) {
        await markJobFailed(job.id, "User or subscription not found");
        return;
      }

      if (user.tokens_remaining <= 0) {
        await pauseJob(
          job.id,
          i,
          `Insufficient tokens at article ${i + 1}/${items.length}. Please upgrade or wait for token reset.`,
        );
        return;
      }

      if (subscription.articles_limit <= 0) {
        await pauseJob(
          job.id,
          i,
          `Article limit reached at article ${i + 1}/${items.length}. Please upgrade your plan.`,
        );
        return;
      }

      try {
        console.log(
          `\n📝 [BatchWrite] Article ${i + 1}/${items.length} [${job.job_type}]: "${itemLine}"`,
        );

        // Process based on job type
        const result = job.job_type === 'batch_source'
          ? await processSourceLine(job.user_id, itemLine, settings)
          : await processKeywordLine(job.user_id, itemLine, settings);

        if (result.success && result.articleId) {
          articleIds.push(result.articleId);

          // Update batch job progress
          await execute(
            `UPDATE batch_jobs SET completed_items = completed_items + 1, current_item_index = ?, article_ids = ?, tokens_used = tokens_used + ?, last_activity_at = NOW() WHERE id = ?`,
            [i + 1, JSON.stringify(articleIds), result.tokensUsed || 0, job.id],
          );

          // Only reduce articles_limit when article is successfully created
          // Failed articles are deleted, so we don't reduce the limit for them
          await execute(
            `UPDATE user_subscriptions SET articles_limit = articles_limit - 1 WHERE user_id = ? AND articles_limit > 0`,
            [job.user_id],
          );

          console.log(
            `✅ [BatchWrite] Article #${result.articleId} completed (${result.tokensUsed} tokens, article_limit -1)`,
          );
        } else {
          // Article failed - DELETE it to avoid leaving empty articles
          if (result.articleId) {
            await execute(`DELETE FROM articles WHERE id = ?`, [
              result.articleId,
            ]);
            console.log(
              `🗑️ [BatchWrite] Deleted failed article #${result.articleId}`,
            );
          }

          // Track failed item
          failedKeywords.push(itemLine);
          console.log(
            `❌ [BatchWrite] Failed ${itemType} (#${failedKeywords.length}): "${itemLine}"`,
          );

          // Check if error is due to API overload
          if (result.error && result.error.toLowerCase().includes("overload")) {
            hasOverloadError = true;
            console.log(`⚠️ [BatchWrite] Detected API overload error`);
          }

          await execute(
            `UPDATE batch_jobs SET failed_items = failed_items + 1, current_item_index = ?, last_activity_at = NOW() WHERE id = ?`,
            [i + 1, job.id],
          );

          console.log(`   Error: ${result.error}`);

          // Check if failures >= MAX_FAILURES
          if (failedKeywords.length >= MAX_FAILURES) {
            console.log(
              `⏹️  [BatchWrite] Stopping batch job - ${MAX_FAILURES} articles failed`,
            );
            break;
          }
        }
      } catch (error: any) {
        console.error(`[BatchWrite] Error processing keyword:`, error);

        // Track failed keyword
        failedKeywords.push(keywordLine);
        console.log(
          `❌ [BatchWrite] Exception in keyword (#${failedKeywords.length}): "${keywordLine}"`,
        );

        // Check if exception is due to overload
        const errorMsg = error.message?.toLowerCase() || "";
        if (
          errorMsg.includes("overload") ||
          errorMsg.includes("unavailable") ||
          errorMsg.includes("503")
        ) {
          hasOverloadError = true;
          console.log(`⚠️ [BatchWrite] Detected API overload exception`);
        }

        await execute(
          `UPDATE batch_jobs SET failed_items = failed_items + 1, current_item_index = ?, last_activity_at = NOW() WHERE id = ?`,
          [i + 1, job.id],
        );

        console.log(`   Error: ${error.message}`);

        // Check if failures >= MAX_FAILURES
        if (failedKeywords.length >= MAX_FAILURES) {
          console.log(
            `⏹️  [BatchWrite] Stopping batch job - ${MAX_FAILURES} articles failed`,
          );
          break;
        }
      }

      // Small delay between articles
      await sleep(1000);
    }

    // Check if any articles succeeded
    const finalJob = await query<BatchJob>(
      `SELECT completed_items, failed_items FROM batch_jobs WHERE id = ?`,
      [job.id],
    );
    const final = finalJob?.[0];

    // Only mark as completed if at least 1 article succeeded
    if (final && final.completed_items > 0) {
      let errorMsg = "";

      // If there are failed keywords, include them in error message
      if (failedKeywords.length > 0) {
        errorMsg = `${failedKeywords.length} bài viết thất bại: ${failedKeywords.join(", ")}`;
        // Truncate if too long (MySQL TEXT limit is safer with 1000 chars)
        if (errorMsg.length > 1000) {
          errorMsg = errorMsg.substring(0, 997) + "...";
        }
      }

      console.log(
        `📝 [BatchWrite] Setting error_message for completed job: "${errorMsg}"`,
      );

      await execute(
        `UPDATE batch_jobs SET status = 'completed', error_message = ?, completed_at = NOW(), last_activity_at = NOW() WHERE id = ?`,
        [errorMsg, job.id],
      );
      console.log(
        `✅ [BatchWrite] Job #${job.id} completed (${final.completed_items}/${final.completed_items + final.failed_items} succeeded)`,
      );
      if (errorMsg) console.log(`   Failed keywords saved: ${errorMsg}`);
    } else {
      // All articles failed - check if it's due to overload
      let errorMsg = "";

      if (hasOverloadError) {
        errorMsg =
          "Không hoàn thành - AI đang quá tải, xin vui lòng chọn Model khác hoặc quay lại sau";
      } else if (failedKeywords.length > 0) {
        errorMsg = `Tất cả bài viết thất bại. Từ khóa bị lỗi: ${failedKeywords.join(", ")}`;
        // Truncate if too long
        if (errorMsg.length > 1000) {
          errorMsg = errorMsg.substring(0, 997) + "...";
        }
      } else {
        errorMsg = "All articles failed to generate";
      }

      console.log(
        `📝 [BatchWrite] Setting error_message for failed job: "${errorMsg}"`,
      );

      await execute(
        `UPDATE batch_jobs SET status = 'failed', error_message = ?, completed_at = NOW(), last_activity_at = NOW() WHERE id = ?`,
        [errorMsg, job.id],
      );
      console.log(`❌ [BatchWrite] Job #${job.id} failed: ${errorMsg}`);
    }
  } catch (error: any) {
    console.error(`[BatchWrite] Error processing job #${job.id}:`, error);
  } finally {
    processingJobs.delete(job.user_id);
  }
}

/**
 * Process a single keyword line and create a complete article
 *
 * Steps:
 * 1. Create article record with title = keyword + " - Đang viết", empty content
 * 2. Generate SEO Title
 * 3. Generate Meta Description
 * 4. Save metadata to article
 * 5. Generate article content
 * 6. Save content to article
 * 7. Generate final article title
 * 8. Save title to article
 * 9. VALIDATE: title >= 40 chars, seo_title exists, meta_description exists
 * 10. If valid, mark as published. Otherwise, mark as failed.
 */
async function processKeywordLine(
  userId: number,
  keywordLine: string,
  settings: JobData["settings"],
): Promise<{
  success: boolean;
  articleId?: number;
  tokensUsed: number;
  error?: string;
}> {
  let totalTokensUsed = 0;
  let articleId: number | undefined = undefined;

  try {
    // Parse keywords from line
    const parsedKeywords = keywordLine
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);

    const primaryKeyword = parsedKeywords[0] || keywordLine;
    const language = settings?.language || "vi";

    // ✅ Always use gpt-3.5-turbo for title, SEO title, meta description
    const titleModel = "gpt-3.5-turbo";

    // User-selected model for article content only
    const contentModel = settings?.model || "gpt-3.5-turbo";

    console.log(`  🤖 Title model: "${titleModel}"`);
    console.log(`  🤖 Content model: "${contentModel}"`);

    // STEP 1: Create article record
    console.log(`  📝 Step 1: Creating article record`);
    const insertResult = await execute(
      `INSERT INTO articles (user_id, title, content, status, keywords, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        keywordLine + " - Đang viết",
        "",
        "draft",
        JSON.stringify(parsedKeywords),
      ],
    );

    const articleId = (insertResult as any).insertId;
    if (!articleId) throw new Error("Failed to create article record");
    console.log(`  ✅ Article created: #${articleId}`);

    // STEP 2: Generate SEO Title (always use OpenAI)
    console.log(`  📝 Step 2: Generating SEO Title (using ${titleModel})`);
    const seoTitleResult = await aiService.generateBatchWriteSeoTitle(
      primaryKeyword, // title
      primaryKeyword, // keyword
      userId,
      language,
      titleModel,
    );

    if (!seoTitleResult.success || !seoTitleResult.seoTitle) {
      throw new Error(`Failed to generate SEO Title: ${seoTitleResult.error}`);
    }

    const seoTitle = seoTitleResult.seoTitle.trim();
    totalTokensUsed += seoTitleResult.tokensUsed || 0;
    console.log(`  ✅ SEO Title: "${seoTitle}"`);

    // STEP 3: Generate Meta Description (always use OpenAI)
    console.log(
      `  📝 Step 3: Generating Meta Description (using ${titleModel})`,
    );
    const metaDescResult = await aiService.generateBatchWriteMetaDescription(
      seoTitle, // title
      primaryKeyword, // keyword
      userId,
      language,
      titleModel,
    );

    if (!metaDescResult.success || !metaDescResult.metaDesc) {
      throw new Error(
        `Failed to generate Meta Description: ${metaDescResult.error}`,
      );
    }

    const metaDesc = metaDescResult.metaDesc.trim();
    totalTokensUsed += metaDescResult.tokensUsed || 0;
    console.log(`  ✅ Meta Description: "${metaDesc.substring(0, 60)}..."`);

    // STEP 4: Save metadata
    console.log(`  📝 Step 4: Saving SEO Title and Meta Description`);
    await execute(
      `UPDATE articles SET seo_title = ?, meta_description = ? WHERE id = ?`,
      [seoTitle, metaDesc, articleId],
    );
    console.log(`  ✅ Metadata saved`);

    // STEP 5: Generate article content (use user-selected model)
    console.log(
      `  📝 Step 5: Generating article content (using ${contentModel})`,
    );
    const contentResult = await aiService.generateArticleContent({
      keyword: primaryKeyword,
      language,
      model: contentModel,
      userId,
      tone: settings?.tone || "professional",
      outlineType: settings?.outlineOption || "no-outline",
      customOutline: settings?.customOutline || "",
      length: settings?.length || "medium",
      websiteId: settings?.websiteId ? String(settings.websiteId) : undefined,
    });

    if (!contentResult.success || !contentResult.content) {
      throw new Error(`Failed to generate content: ${contentResult.error}`);
    }

    const content = contentResult.content.trim();
    totalTokensUsed += contentResult.tokensUsed || 0;
    console.log(`  ✅ Content generated: ${content.length} chars`);

    // STEP 6: Save content
    console.log(`  📝 Step 6: Saving content`);
    await execute(`UPDATE articles SET content = ? WHERE id = ?`, [
      content,
      articleId,
    ]);
    console.log(`  ✅ Content saved`);

    // STEP 7: Generate final article title (always use OpenAI)
    console.log(
      `  📝 Step 7: Generating final article title (using ${titleModel})`,
    );
    const titleResult = await aiService.generateBatchWriteArticleTitle(
      primaryKeyword,
      userId,
      language,
      "professional",
      titleModel,
    );

    if (!titleResult.success || !titleResult.title) {
      throw new Error(`Failed to generate article title: ${titleResult.error}`);
    }

    const finalTitle = titleResult.title.trim();
    totalTokensUsed += titleResult.tokensUsed || 0;
    console.log(`  ✅ Final title: "${finalTitle}"`);

    // STEP 8: Save title
    console.log(`  📝 Step 8: Saving final title`);
    await execute(`UPDATE articles SET title = ? WHERE id = ?`, [
      finalTitle,
      articleId,
    ]);
    console.log(`  ✅ Title saved`);

    // STEP 9: VALIDATE - ALL REQUIRED FIELDS MUST EXIST AND MEET CRITERIA
    console.log(`  📝 Step 9: Validating article`);
    const articles = await query<any>(
      `SELECT id, title, seo_title, meta_description, content FROM articles WHERE id = ?`,
      [articleId],
    );
    const article = articles?.[0];

    if (!article) {
      throw new Error("Article record not found after update");
    }

    // Strict validation
    const validationErrors: string[] = [];

    // Check title length >= 40 characters
    if (!article.title || article.title.length < 40) {
      validationErrors.push(
        `Title too short: ${article.title?.length || 0} chars (required: 40+)`,
      );
    }

    // Check SEO title exists
    if (!article.seo_title || article.seo_title.trim().length === 0) {
      validationErrors.push(`SEO Title is missing or empty`);
    }

    // Check Meta Description exists
    if (
      !article.meta_description ||
      article.meta_description.trim().length === 0
    ) {
      validationErrors.push(`Meta Description is missing or empty`);
    }

    // Check content exists
    if (!article.content || article.content.trim().length === 0) {
      validationErrors.push(`Content is missing or empty`);
    }

    if (validationErrors.length > 0) {
      // Validation failed - keep article as draft
      const errorMsg = validationErrors.join("; ");
      console.log(`  ❌ Validation failed: ${errorMsg}`);

      await execute(`UPDATE articles SET status = 'draft' WHERE id = ?`, [
        articleId,
      ]);

      return {
        success: false,
        articleId,
        tokensUsed: totalTokensUsed,
        error: `Validation failed: ${errorMsg}`,
      };
    }

    // STEP 10: All validations passed - mark as published
    console.log(`  📝 Step 10: Marking article as published`);
    await execute(`UPDATE articles SET status = 'published' WHERE id = ?`, [
      articleId,
    ]);
    console.log(`  ✅ Article published`);

    return {
      success: true,
      articleId,
      tokensUsed: totalTokensUsed,
    };
  } catch (error: any) {
    console.error(`  ❌ Error in processKeywordLine:`, error.message);
    // Note: articleId may be undefined if error happened before article creation
    return {
      success: false,
      articleId, // Return articleId if it was created before error
      tokensUsed: totalTokensUsed,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Process a single source line (batch_source)
 * Format: "keyword|url"
 * Fetches content from URL and rewrites it
 */
async function processSourceLine(
  userId: number,
  sourceLine: string,
  settings: JobData["settings"],
): Promise<{
  success: boolean;
  articleId?: number;
  tokensUsed: number;
  error?: string;
}> {
  let totalTokensUsed = 0;
  let articleId: number | undefined = undefined;

  try {
    // Parse source line: "keyword|url"
    const parts = sourceLine.split("|").map(p => p.trim());
    if (parts.length !== 2) {
      throw new Error(`Invalid source format. Expected "keyword|url", got: "${sourceLine}"`);
    }

    const [keyword, sourceUrl] = parts;
    if (!keyword || !sourceUrl) {
      throw new Error("Both keyword and URL are required");
    }

    const language = settings?.language || "vi";
    const model = settings?.model || "gemini-2.5-flash";
    const voiceAndTone = settings?.voiceAndTone || "Trung lập";
    const writingMethod = settings?.writingMethod || "keep-headings";

    const languageName =
      language === "vi"
        ? "Vietnamese"
        : language === "en"
        ? "English"
        : language;

    console.log(`  🔗 Source URL: ${sourceUrl}`);
    console.log(`  🎯 Keyword: ${keyword}`);
    console.log(`  🤖 Model: ${model}`);
    console.log(`  ✍️ Writing Method: ${writingMethod}`);

    // STEP 1: Fetch content from URL
    console.log(`  📝 Step 1: Fetching content from URL`);
    let sourceContent = "";
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();
      
      // Simple HTML to text extraction
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (textContent.length < 100) {
        throw new Error("Fetched content is too short (less than 100 characters)");
      }

      sourceContent = textContent.substring(0, 8000); // Limit to 8000 chars
      console.log(`  ✅ Content fetched: ${sourceContent.length} chars`);
    } catch (fetchError: any) {
      console.error(`  ❌ Failed to fetch URL:`, fetchError?.message || fetchError);
      console.log(
        `  ⚠️ Falling back to keyword-based generation for "${keyword}" because source URL could not be fetched`,
      );

      // 🔁 Fallback: if we cannot fetch the source URL (e.g. 403/Cloudflare),
      // reuse the existing keyword-based batch pipeline instead of failing
      // the entire job. This will create a fresh article based only on the
      // keyword, so jobs still complete even when some websites block bots.
      return await processKeywordLine(
        userId,
        keyword,
        {
          ...settings,
          // Map voice/tone to the tone field used by processKeywordLine
          tone: settings?.voiceAndTone || (settings as any)?.tone || "professional",
          // Ensure language/model are preserved
          language,
          model,
        } as any,
      );
    }

    // STEP 2: Prepare model & generate outline/key ideas from source content
    console.log(
      `  📝 Step 2: Preparing model and generating outline from source content`,
    );

    // Get model configuration (shared for outline + article generation)
    const modelConfigResult = await execute(
      `SELECT model_id, provider FROM ai_models 
       WHERE (model_id = ? OR display_name = ?) AND is_active = TRUE 
       LIMIT 1`,
      [model, model],
    );

    if (!modelConfigResult || (modelConfigResult as any[]).length === 0) {
      throw new Error(`Model "${model}" not found or inactive`);
    }

    const modelInfo = (modelConfigResult as any[])[0];
    const actualModel = modelInfo.model_id;
    const provider = modelInfo.provider;

    // Get API key
    const apiKeyResult = await execute(
      `SELECT api_key FROM api_keys
       WHERE provider = ? AND category = 'content' AND is_active = TRUE
       LIMIT 1`,
      [provider],
    );

    if (!apiKeyResult || (apiKeyResult as any[]).length === 0) {
      throw new Error(`No active API key found for provider: ${provider}`);
    }

    const apiKey = (apiKeyResult as any[])[0].api_key;

    let summaryOutline = "";
    try {
      console.log(
        `  📝 Step 2a: Generating outline / key ideas from source content`,
      );

      let outlineSystemPrompt =
        "You are an expert content strategist. Your job is to read long source articles and extract a clear, well-structured outline of the main sections and key ideas.";

      // Inject website knowledge at the highest-priority level if available
      if (settings?.websiteKnowledge && String(settings.websiteKnowledge).trim().length > 0) {
        outlineSystemPrompt = injectWebsiteKnowledge(
          outlineSystemPrompt,
          String(settings.websiteKnowledge),
        );
      }

      let outlineUserPrompt = `Based on the following source article about "${keyword}", create a detailed outline of the main sections and key ideas.\n\n`;
      outlineUserPrompt += "Requirements:\n";
      outlineUserPrompt += `- Write headings in ${languageName}.\n`;
      outlineUserPrompt += `- Target voice and tone: ${voiceAndTone}.\n`;
      outlineUserPrompt += `- Writing method preference: ${writingMethod} (keep original structure vs rewrite vs deep rewrite).\n`;
      outlineUserPrompt +=
        "- Use the following outline format (IMPORTANT):\\n  - [h2] Main section title\\n  - [h3] Subsection title\\n";
      outlineUserPrompt +=
        "- Focus only on structure and key ideas, NOT full paragraphs.\\n";
      outlineUserPrompt +=
        "- Do NOT write the full article, only the outline with short notes if really necessary.\\n\\n";
      outlineUserPrompt += `Source content (truncated):\n${sourceContent}\n`;

      const outlineResult = await callAI(
        provider,
        apiKey,
        actualModel,
        outlineSystemPrompt,
        outlineUserPrompt,
        1500,
        0.5,
      );

      if (outlineResult.success && outlineResult.content) {
        summaryOutline = outlineResult.content.trim();
        totalTokensUsed += outlineResult.tokensUsed || 0;
        console.log(
          `  ✅ Outline generated from source (${summaryOutline.length} chars)`,
        );
      } else {
        console.warn(
          `  ⚠️ Failed to generate outline from source: ${outlineResult.error}`,
        );
      }
    } catch (outlineError: any) {
      console.error(
        `  ❌ Error while generating outline from source:`,
        outlineError?.message || outlineError,
      );
    }

    // STEP 3: Create article record
    console.log(`  📝 Step 3: Creating article record`);
    const insertResult = await execute(
      `INSERT INTO articles (user_id, title, content, status, keywords, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        keyword + " - Đang viết lại",
        "",
        "draft",
        JSON.stringify([keyword]),
      ],
    );

    articleId = (insertResult as any).insertId;
    if (!articleId) throw new Error("Failed to create article record");
    console.log(`  ✅ Article created: #${articleId}`);

    // STEP 4: Generate full article content from outline (preferred) or fallback to direct rewrite
    console.log(
      `  📝 Step 4: Generating article content from outline or source`,
    );

    let rewrittenContent = "";

    if (summaryOutline && summaryOutline.trim().length > 0) {
      console.log(
        `  📋 Using outline-based generation via AI service (generateArticleContent)`,
      );

      const lengthSetting = settings?.length || "medium";

      const articleResult = await aiService.generateArticleContent({
        keyword,
        language,
        outlineType: "your-outline",
        customOutline: summaryOutline,
        tone: voiceAndTone,
        model,
        length: lengthSetting,
        userId,
        writingMethod,
        websiteId: settings?.websiteId
          ? String(settings.websiteId)
          : undefined,
      } as any);

      if (!articleResult.success || !articleResult.content) {
        throw new Error(
          `Failed to generate article from outline: ${articleResult.error}`,
        );
      }

      rewrittenContent = articleResult.content.trim();
      totalTokensUsed += articleResult.tokensUsed || 0;
      console.log(
        `  ✅ Article generated from outline: ${rewrittenContent.length} chars (${articleResult.tokensUsed} tokens)`,
      );
    } else {
      console.log(
        `  ⚠️ No outline available, falling back to direct rewrite of source content`,
      );

      // Build rewrite prompt (previous behaviour)
      let systemPrompt =
        "You are an expert content writer. Your task is to rewrite articles in a natural, engaging way.";

      let userPrompt = `Rewrite the following source content about "${keyword}".\n\n`;

      if (writingMethod === "deep-rewrite") {
        userPrompt +=
          "IMPORTANT: This is a DEEP rewrite. Completely rewrite the content in your own words, using different sentence structures and expressions. The result should be unique and avoid any direct copying from the source.\n\n";
      } else if (writingMethod === "rewrite-all") {
        userPrompt +=
          "Rewrite all content including headings and body text. Make it more engaging and better structured.\n\n";
      } else {
        userPrompt +=
          "Rewrite the content while keeping similar heading structure. Improve clarity and readability.\n\n";
      }

      userPrompt += `Content voice and tone: ${voiceAndTone}\n`;
      userPrompt += `Language: ${languageName}\n`;
      userPrompt += `Target keyword: ${keyword}\n\n`;
      userPrompt += `Source Content:\n${sourceContent}\n\n`;
      userPrompt += `Rewritten Content (${languageName}, in HTML format with proper headings):`;

      const estimatedTokens = Math.ceil(sourceContent.length / 4) + 1000;

      const rewriteResult = await callAI(
        provider,
        apiKey,
        actualModel,
        systemPrompt,
        userPrompt,
        Math.min(estimatedTokens * 2, 4000),
        0.7,
      );

      if (!rewriteResult.success || !rewriteResult.content) {
        throw new Error(`Failed to rewrite content: ${rewriteResult.error}`);
      }

      rewrittenContent = rewriteResult.content.trim();

      // Clean up response
      rewrittenContent = rewrittenContent
        .replace(
          /^(here'?s?|here is|below is|following is|the rewritten content|rewritten content).*?:/gi,
          "",
        )
        .trim();

      totalTokensUsed += rewriteResult.tokensUsed || estimatedTokens;
      console.log(
        `  ✅ Content rewritten: ${rewrittenContent.length} chars (${rewriteResult.tokensUsed} tokens)`,
      );
    }

    // STEP 5: Save rewritten content
    console.log(`  📝 Step 5: Saving rewritten content`);
    await execute(
      `UPDATE articles SET content = ? WHERE id = ?`,
      [rewrittenContent, articleId],
    );
    console.log(`  ✅ Content saved`);

    // STEP 6: Generate SEO Title
    console.log(`  📝 Step 6: Generating SEO Title`);
    const titleModel = "gpt-3.5-turbo";
    const seoTitleResult = await aiService.generateBatchWriteSeoTitle(
      keyword,
      keyword,
      userId,
      language,
      titleModel,
    );

    if (!seoTitleResult.success || !seoTitleResult.seoTitle) {
      throw new Error(`Failed to generate SEO Title: ${seoTitleResult.error}`);
    }

    const seoTitle = seoTitleResult.seoTitle.trim();
    totalTokensUsed += seoTitleResult.tokensUsed || 0;
    console.log(`  ✅ SEO Title: "${seoTitle}"`);

    // STEP 7: Generate Meta Description
    console.log(`  📝 Step 7: Generating Meta Description`);
    const metaDescResult = await aiService.generateBatchWriteMetaDescription(
      seoTitle,
      keyword,
      userId,
      language,
      titleModel,
    );

    if (!metaDescResult.success || !metaDescResult.metaDesc) {
      throw new Error(`Failed to generate Meta Description: ${metaDescResult.error}`);
    }

    const metaDesc = metaDescResult.metaDesc.trim();
    totalTokensUsed += metaDescResult.tokensUsed || 0;
    console.log(`  ✅ Meta Description generated`);

    // STEP 8: Generate final title
    console.log(`  📝 Step 8: Generating final article title`);
    const titleResult = await aiService.generateBatchWriteArticleTitle(
      keyword,
      userId,
      language,
      "professional",
      titleModel,
    );

    if (!titleResult.success || !titleResult.title) {
      throw new Error(`Failed to generate title: ${titleResult.error}`);
    }

    const finalTitle = titleResult.title.trim();
    totalTokensUsed += titleResult.tokensUsed || 0;
    console.log(`  ✅ Final title: "${finalTitle}"`);

    // STEP 9: Update article with all metadata
    console.log(`  📝 Step 9: Saving all metadata to article`);
    await execute(
      `UPDATE articles SET 
        title = ?,
        seo_title = ?,
        meta_description = ?,
        status = 'published'
      WHERE id = ?`,
      [finalTitle, seoTitle, metaDesc, articleId],
    );
    console.log(`  ✅ Article saved and published`);

    // STEP 10: Validate
    console.log(`  📝 Step 10: Validating article`);
    const validationErrors: string[] = [];

    if (!finalTitle || finalTitle.length < 40) {
      validationErrors.push(`Title too short: ${finalTitle?.length || 0} chars`);
    }

    if (!seoTitle) {
      validationErrors.push(`SEO Title missing`);
    }

    if (!metaDesc) {
      validationErrors.push(`Meta Description missing`);
    }

    if (!rewrittenContent || rewrittenContent.length < 200) {
      validationErrors.push(`Content too short: ${rewrittenContent?.length || 0} chars`);
    }

    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.join("; ");
      console.log(`  ❌ Validation failed: ${errorMsg}`);
      await execute(`UPDATE articles SET status = 'draft' WHERE id = ?`, [articleId]);
      return {
        success: false,
        articleId,
        tokensUsed: totalTokensUsed,
        error: `Validation failed: ${errorMsg}`,
      };
    }

    console.log(`  ✅ Validation passed - Article #${articleId} is published`);

    return {
      success: true,
      articleId,
      tokensUsed: totalTokensUsed,
    };
  } catch (error: any) {
    console.error(`  ❌ Error in processSourceLine:`, error.message || error);

    if (articleId) {
      await execute(`UPDATE articles SET status = 'draft' WHERE id = ?`, [articleId]);
    }

    return {
      success: false,
      articleId,
      tokensUsed: totalTokensUsed,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Mark job as failed
 */
async function markJobFailed(jobId: number, errorMessage: string) {
  try {
    await execute(
      `UPDATE batch_jobs SET status = 'failed', error_message = ?, completed_at = NOW(), last_activity_at = NOW() WHERE id = ?`,
      [errorMessage, jobId],
    );
  } catch (error) {
    console.error("[BatchWrite] Error marking job as failed:", error);
  }
}

/**
 * Pause job with error message
 */
async function pauseJob(
  jobId: number,
  currentIndex: number,
  errorMessage: string,
) {
  try {
    await execute(
      `UPDATE batch_jobs SET status = 'paused', current_item_index = ?, error_message = ?, last_activity_at = NOW() WHERE id = ?`,
      [currentIndex, errorMessage, jobId],
    );
  } catch (error) {
    console.error("[BatchWrite] Error pausing job:", error);
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the batch write processor
 */
export function startBatchWriteProcessor(intervalMs: number = 5000) {
  console.log(`[BatchWrite] Starting processor with ${intervalMs}ms interval`);

  processBatchWriteJobs();

  setInterval(() => {
    processBatchWriteJobs();
  }, intervalMs);
}
