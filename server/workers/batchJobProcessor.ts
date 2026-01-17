import { query, execute } from "../db";
import { generateCompleteArticle } from "../services/articleGenerationService";
import * as aiService from "../services/aiService";

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
  keywords: string[];
  settings: {
    outlineOption?: string;
    customOutline?: string;
    autoInsertImages?: boolean;
    maxImages?: number;
  };
}

// Language name mapping
const LANGUAGE_NAMES: Record<string, string> = {
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

// Helper function to get language name
function getLanguageName(languageCode: string): string {
  return LANGUAGE_NAMES[languageCode] || "English";
}

// Track processing jobs by user_id to avoid processing same user's jobs concurrently
const processingJobs = new Set<number>();
const MAX_CONCURRENT_JOBS = 5; // Process up to 5 jobs simultaneously

/**
 * Main worker function - processes batch jobs in parallel
 * Can process up to MAX_CONCURRENT_JOBS at the same time
 */
export async function processBatchJobs() {
  try {
    // Get pending jobs (one per user to avoid conflicts)
    const jobs = await query<BatchJob>(
      `SELECT * FROM batch_jobs 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [MAX_CONCURRENT_JOBS],
    );

    if (!jobs || jobs.length === 0) {
      return; // No jobs to process
    }

    // Filter out jobs for users already being processed
    const availableJobs = jobs.filter(
      (job) => !processingJobs.has(job.user_id),
    );

    if (availableJobs.length === 0) {
      console.log(
        "[BatchWorker] All pending jobs are for users already being processed",
      );
      return;
    }

    console.log(
      `[BatchWorker] Processing ${availableJobs.length} jobs in parallel`,
    );

    // Process all available jobs in parallel
    const promises = availableJobs.map((job) => processJob(job));
    await Promise.allSettled(promises);
  } catch (error: any) {
    console.error("[BatchWorker] Unexpected error:", error);
  }
}

/**
 * Process a single batch job
 */
async function processJob(job: BatchJob) {
  // Mark this user's job as being processed
  processingJobs.add(job.user_id);

  try {
    console.log(
      `[BatchWorker] Processing job #${job.id} for user ${job.user_id}`,
    );

    // Mark as processing
    await execute(
      `UPDATE batch_jobs 
       SET status = 'processing', 
           started_at = COALESCE(started_at, NOW()),
           last_activity_at = NOW() 
       WHERE id = ?`,
      [job.id],
    );

    // Route to appropriate handler based on job_type
    if (job.job_type === "batch_source") {
      await processSourceBatchJob(job);
    } else if (job.job_type === "batch_keywords") {
      await processBatchKeywordsJob(job);
    } else {
      await markJobAsFailed(job.id, `Unknown job type: ${job.job_type}`);
    }
  } catch (error: any) {
    console.error(`[BatchWorker] Error processing job #${job.id}:`, error);
  } finally {
    // Remove from processing set
    processingJobs.delete(job.user_id);
  }
}

/**
 * Process batch_source job - creates articles from URL sources
 * Sources format: ["keyword|url", "keyword|url", ...]
 */
async function processSourceBatchJob(job: BatchJob) {
  try {
    console.log(
      `[BatchWorker] Processing source batch job #${job.id}`,
    );

    // Parse job data
    let jobData: any;
    try {
      jobData =
        typeof job.job_data === "string"
          ? JSON.parse(job.job_data)
          : job.job_data;
    } catch (error) {
      await markJobAsFailed(job.id, "Invalid job data format");
      return;
    }

    // Parse existing article IDs
    let articleIds: number[] = [];
    try {
      articleIds = job.article_ids
        ? typeof job.article_ids === "string"
          ? JSON.parse(job.article_ids)
          : job.article_ids
        : [];
    } catch (error) {
      articleIds = [];
    }

    // Get sources from job data
    let sourceLines: string[] = [];

    if ((jobData as any).sources && Array.isArray((jobData as any).sources)) {
      // Sources format: ["keyword|url", "keyword|url"]
      sourceLines = (jobData as any).sources;
    } else {
      await markJobAsFailed(job.id, "Invalid job data: no sources");
      return;
    }

    const { settings } = jobData;
    const startIndex = job.current_item_index || 0;

    // Process each source line sequentially
    for (let i = startIndex; i < sourceLines.length; i++) {
      const sourceLine = sourceLines[i];

      // Parse source line: "keyword|url" -> { keyword, url }
      const parts = sourceLine.split("|").map((p) => p.trim());
      const keyword = parts[0];
      const url = parts[1];

      if (!keyword || !url) {
        console.warn(`[BatchWorker] Invalid source format at index ${i}: "${sourceLine}"`);
        await execute(
          `UPDATE batch_jobs 
           SET failed_items = failed_items + 1,
               current_item_index = ?,
               last_activity_at = NOW()
           WHERE id = ?`,
          [i + 1, job.id],
        );
        continue;
      }

      // Check if job was paused or cancelled
      const currentJob = await query<BatchJob>(
        "SELECT status FROM batch_jobs WHERE id = ?",
        [job.id],
      );

      if (!currentJob || currentJob.length === 0) {
        console.log(`[BatchWorker] Job #${job.id} not found, stopping`);
        return;
      }

      if (currentJob[0].status === "cancelled") {
        console.log(`[BatchWorker] Job #${job.id} cancelled, stopping`);
        return;
      }

      if (currentJob[0].status === "paused") {
        console.log(`[BatchWorker] Job #${job.id} paused, stopping`);
        return;
      }

      // Check user's current limits
      const users = await query<any>(
        "SELECT tokens_remaining FROM users WHERE id = ?",
        [job.user_id],
      );
      const subscriptions = await query<any>(
        "SELECT articles_limit FROM user_subscriptions WHERE user_id = ? AND is_active = TRUE",
        [job.user_id],
      );

      if (!users || users.length === 0) {
        await markJobAsFailed(job.id, "User not found");
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        await markJobAsFailed(job.id, "User subscription not found");
        return;
      }

      const user = users[0];
      const subscription = subscriptions[0];
      const tokensRemaining = user.tokens_remaining || 0;
      const articleLimit = subscription.articles_limit || 0;

      // Check if user has reached limits
      if (tokensRemaining <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Insufficient tokens. Job paused at article ${i + 1}/${sourceLines.length}.`,
        );
        console.log(`[BatchWorker] Job #${job.id} paused - out of tokens`);
        return;
      }

      if (articleLimit <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Article limit reached. Job paused at article ${i + 1}/${sourceLines.length}.`,
        );
        console.log(
          `[BatchWorker] Job #${job.id} paused - article limit reached`,
        );
        return;
      }

      // Process this source
      try {
        console.log(
          `\n📝 [BatchWorker] Processing source ${i + 1}/${sourceLines.length}`,
        );
        console.log(`   Source: "${sourceLine}"`);
        console.log(`   Keyword: "${keyword}", URL: "${url}"`);

        const result = await createArticleFromSource(
          job.user_id,
          {
            keyword: keyword,
            url: url,
          },
          i,
          settings,
        );

        if (result && result.articleId) {
          const { articleId, tokensUsed } = result;
          articleIds.push(articleId);

          // Update progress and tokens used
          await execute(
            `UPDATE batch_jobs 
             SET completed_items = ?, 
                 current_item_index = ?,
                 article_ids = ?,
                 tokens_used = tokens_used + ?,
                 last_activity_at = NOW()
             WHERE id = ?`,
            [i + 1, i + 1, JSON.stringify(articleIds), tokensUsed, job.id],
          );

          console.log(
            `✅ [BatchWorker] Successfully created article #${articleId} (${tokensUsed} tokens)`,
          );
        } else {
          // Article creation failed, increment failed count
          await execute(
            `UPDATE batch_jobs 
             SET failed_items = failed_items + 1,
                 current_item_index = ?,
                 last_activity_at = NOW()
             WHERE id = ?`,
            [i + 1, job.id],
          );

          console.log(`❌ [BatchWorker] Failed to create article from source`);
        }
      } catch (error: any) {
        console.error(`[BatchWorker] Error processing source:`, error);

        // Increment failed count
        await execute(
          `UPDATE batch_jobs 
           SET failed_items = failed_items + 1,
               current_item_index = ?,
               last_activity_at = NOW()
           WHERE id = ?`,
          [i + 1, job.id],
        );
      }

      // Small delay between articles
      await sleep(1000);
    }

    // Job completed
    await execute(
      `UPDATE batch_jobs 
       SET status = 'completed',
           completed_at = NOW(),
           last_activity_at = NOW()
       WHERE id = ?`,
      [job.id],
    );

    console.log(`[BatchWorker] Job #${job.id} completed successfully`);
  } catch (error: any) {
    console.error(`[BatchWorker] Error in processSourceBatchJob:`, error);
  }
}

/**
 * Process batch_keywords job - original implementation
 */
async function processBatchKeywordsJob(job: BatchJob) {
  try {
    // Parse job data
    let jobData: JobData;
    try {
      jobData =
        typeof job.job_data === "string"
          ? JSON.parse(job.job_data)
          : job.job_data;
    } catch (error) {
      await markJobAsFailed(job.id, "Invalid job data format");
      return;
    }

    // Parse existing article IDs
    let articleIds: number[] = [];
    try {
      articleIds = job.article_ids
        ? typeof job.article_ids === "string"
          ? JSON.parse(job.article_ids)
          : job.article_ids
        : [];
    } catch (error) {
      articleIds = [];
    }

    // Get articles data from job data
    let articleLines: string[] = [];

    if ((jobData as any).keywords && Array.isArray((jobData as any).keywords)) {
      // Keywords format: ["từ1, từ2, từ3", "từ4, từ5"]
      articleLines = (jobData as any).keywords;
    } else {
      await markJobAsFailed(job.id, "Invalid job data: no keywords");
      return;
    }

    const { settings } = jobData;
    const startIndex = job.current_item_index || 0;

    // Process each keyword line sequentially
    for (let i = startIndex; i < articleLines.length; i++) {
      const keywordLine = articleLines[i];

      // Parse keywords from the line: "từ1, từ2, từ3" -> ["từ1", "từ2", "từ3"]
      const parsedKeywords = keywordLine
        .split(",")
        .map((kw) => kw.trim())
        .filter((kw) => kw.length > 0);

      const primaryKeyword = parsedKeywords[0] || keywordLine;

      // Check if job was paused or cancelled
      const currentJob = await query<BatchJob>(
        "SELECT status FROM batch_jobs WHERE id = ?",
        [job.id],
      );

      if (!currentJob || currentJob.length === 0) {
        console.log(`[BatchWorker] Job #${job.id} not found, stopping`);
        return;
      }

      if (currentJob[0].status === "cancelled") {
        console.log(`[BatchWorker] Job #${job.id} cancelled, stopping`);
        return;
      }

      if (currentJob[0].status === "paused") {
        console.log(`[BatchWorker] Job #${job.id} paused, stopping`);
        return;
      }

      // Check user's current limits
      // Get tokens from users table and articles_limit from user_subscriptions table
      const users = await query<any>(
        "SELECT tokens_remaining FROM users WHERE id = ?",
        [job.user_id],
      );
      const subscriptions = await query<any>(
        "SELECT articles_limit FROM user_subscriptions WHERE user_id = ? AND is_active = TRUE",
        [job.user_id],
      );

      if (!users || users.length === 0) {
        await markJobAsFailed(job.id, "User not found");
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        await markJobAsFailed(job.id, "User subscription not found");
        return;
      }

      const user = users[0];
      const subscription = subscriptions[0];
      const tokensRemaining = user.tokens_remaining || 0;
      const articleLimit = subscription.articles_limit || 0;

      // Check if user has reached limits
      if (tokensRemaining <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Insufficient tokens. Job paused at article ${i + 1}/${articleLines.length}.`,
        );
        console.log(`[BatchWorker] Job #${job.id} paused - out of tokens`);
        return;
      }

      if (articleLimit <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Article limit reached. Job paused at article ${i + 1}/${articleLines.length}.`,
        );
        console.log(
          `[BatchWorker] Job #${job.id} paused - article limit reached`,
        );
        return;
      }

      // Process this article according to new workflow
      try {
        console.log(
          `\n📝 [BatchWorker] Processing article ${i + 1}/${articleLines.length}`,
        );
        console.log(`   Keyword line: "${keywordLine}"`);
        console.log(`   Keywords: ${JSON.stringify(parsedKeywords)}`);
        console.log(`   Primary keyword: "${primaryKeyword}"`);

        const result = await createArticleWithNewWorkflow(
          job.user_id,
          {
            keywordLine: keywordLine,
            keywords: parsedKeywords,
          },
          i,
          settings,
        );

        if (result && result.articleId) {
          const { articleId, tokensUsed } = result;
          articleIds.push(articleId);

          // Update progress and tokens used
          await execute(
            `UPDATE batch_jobs 
             SET completed_items = ?, 
                 current_item_index = ?,
                 article_ids = ?,
                 tokens_used = tokens_used + ?,
                 last_activity_at = NOW()
             WHERE id = ?`,
            [i + 1, i + 1, JSON.stringify(articleIds), tokensUsed, job.id],
          );

          console.log(
            `✅ [BatchWorker] Successfully created article #${articleId} (${tokensUsed} tokens)`,
          );
        } else {
          // Article creation failed, increment failed count
          await execute(
            `UPDATE batch_jobs 
             SET failed_items = failed_items + 1,
                 current_item_index = ?,
                 last_activity_at = NOW()
             WHERE id = ?`,
            [i + 1, job.id],
          );

          console.log(`❌ [BatchWorker] Failed to create article`);
        }
      } catch (error: any) {
        console.error(`[BatchWorker] Error processing article:`, error);

        // Increment failed count
        await execute(
          `UPDATE batch_jobs 
           SET failed_items = failed_items + 1,
               current_item_index = ?,
               last_activity_at = NOW()
           WHERE id = ?`,
          [i + 1, job.id],
        );
      }

      // Small delay between articles to avoid overwhelming the system
      await sleep(1000);
    }

    // Job completed
    await execute(
      `UPDATE batch_jobs 
       SET status = 'completed',
           completed_at = NOW(),
           last_activity_at = NOW()
       WHERE id = ?`,
      [job.id],
    );

    console.log(`[BatchWorker] Job #${job.id} completed successfully`);
  } catch (error: any) {
    console.error(`[BatchWorker] Error in processBatchKeywordsJob:`, error);
  }
}

/**
 * Create article from URL source
 * 
 * STEPS:
 * 1. Fetch content from URL
 * 2. Create article record
 * 3. Rewrite the content using AI
 * 4. Save content to DB
 * 5. Generate SEO title
 * 6. Save SEO metadata
 */
async function createArticleFromSource(
  userId: number,
  sourceData: { keyword: string; url: string },
  sourceIndex: number,
  settings: any,
): Promise<{ articleId: number; tokensUsed: number } | null> {
  let totalTokensUsed = 0;

  try {
    const { keyword, url } = sourceData;
    const model = settings.model || "gpt-4";
    const language = settings.language || "vi";

    console.log(`\n📝 [SourceWorkflow] Step 1: Fetching content from URL`);
    console.log(`   URL: "${url}"`);

    // STEP 1: Fetch content from URL
    let sourceContent = "";
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();
      
      // Simple HTML to text extraction - remove tags and get main content
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (textContent.length < 100) {
        throw new Error("Fetched content is too short (less than 100 characters)");
      }

      sourceContent = textContent.substring(0, 5000); // Limit to 5000 chars
      console.log(`✅ [SourceWorkflow] Content fetched (${sourceContent.length} characters)`);
    } catch (fetchError: any) {
      console.error(`❌ [SourceWorkflow] Failed to fetch URL:`, fetchError.message);
      return null;
    }

    // STEP 2: Create article record
    console.log(`\n📝 [SourceWorkflow] Step 2: Creating article record`);
    const insertResult = await execute(
      `INSERT INTO articles (
        user_id, title, content, status, keywords, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        keyword + " - Đang viết",
        "", // Empty initially, will be filled with rewritten content
        "draft",
        JSON.stringify([keyword]),
      ],
    );

    const articleId = (insertResult as any).insertId;
    console.log(`✅ [SourceWorkflow] Article created with ID: ${articleId}`);

    // STEP 3: Rewrite the content using AI
    console.log(`\n📝 [SourceWorkflow] Step 3: Rewriting content with AI`);
    const rewriteResult = await rewriteSourceContent(
      sourceContent,
      keyword,
      language,
      userId,
      model,
      settings,
    );

    if (!rewriteResult.success || !rewriteResult.content) {
      console.error(`❌ [SourceWorkflow] Failed to rewrite content`);
      return null;
    }

    const rewrittenContent = rewriteResult.content;
    totalTokensUsed += rewriteResult.tokensUsed || 0;
    console.log(`✅ [SourceWorkflow] Content rewritten (${rewrittenContent.length} characters, ${rewriteResult.tokensUsed} tokens)`);

    // STEP 4: Save rewritten content to DB
    console.log(`\n📝 [SourceWorkflow] Step 4: Saving rewritten content`);
    await execute(
      `UPDATE articles SET content = ? WHERE id = ?`,
      [rewrittenContent, articleId],
    );
    console.log(`✅ [SourceWorkflow] Content saved`);

    // STEP 5: Generate SEO title
    console.log(`\n📝 [SourceWorkflow] Step 5: Generating SEO title`);
    const seoTitleResult = await generateBatchWriteSeoTitle(
      keyword,
      language,
      userId,
      model,
    );

    if (!seoTitleResult.success) {
      console.warn(`⚠️ [SourceWorkflow] Failed to generate SEO title, using keyword`);
    } else {
      totalTokensUsed += seoTitleResult.tokensUsed || 0;
    }

    const seoTitle = seoTitleResult.seoTitle || keyword;
    console.log(`✅ [SourceWorkflow] SEO title: "${seoTitle}"`);

    // STEP 6: Generate Meta Description
    console.log(`\n📝 [SourceWorkflow] Step 6: Generating meta description`);
    const metaDescResult = await generateBatchWriteMetaDescription(
      keyword,
      seoTitle,
      language,
      userId,
      model,
    );

    if (!metaDescResult.success) {
      console.warn(`⚠️ [SourceWorkflow] Failed to generate meta description`);
    } else {
      totalTokensUsed += metaDescResult.tokensUsed || 0;
    }

    const metaDescription = metaDescResult.metaDescription || "";
    console.log(`✅ [SourceWorkflow] Meta description: "${metaDescription.substring(0, 80)}..."`);

    // STEP 7: Save SEO metadata
    console.log(`\n📝 [SourceWorkflow] Step 7: Saving SEO metadata`);
    await execute(
      `UPDATE articles SET title = ?, meta_title = ?, meta_description = ?, status = 'completed' WHERE id = ?`,
      [seoTitle, seoTitle, metaDescription, articleId],
    );
    console.log(`✅ [SourceWorkflow] Article completed`);

    return { articleId, tokensUsed: totalTokensUsed };
  } catch (error: any) {
    console.error(`[SourceWorkflow] Error:`, error);
    return null;
  }
}

/**
 * Rewrite source content using AI
 */
async function rewriteSourceContent(
  content: string,
  keyword: string,
  language: string,
  userId: number,
  model: string,
  settings: any,
): Promise<{ success: boolean; content?: string; tokensUsed: number }> {
  try {
    const voiceAndTone = settings.voiceAndTone || "Neutral";
    const writingMethod = settings.writingMethod || "keep-headings";
    const languageName = getLanguageName(language);

    // Build rewrite prompt
    let prompt = `You are an expert content writer. Rewrite the following source content about "${keyword}".\n\n`;
    
    if (writingMethod === "deep-rewrite") {
      prompt += `IMPORTANT: This is a DEEP rewrite. Completely rewrite the content in your own words, using different sentence structures and expressions. The result should be unique and avoid any direct copying from the source.\n\n`;
    } else if (writingMethod === "rewrite-all") {
      prompt += `Rewrite all content including headings and body text. Make it more engaging and better structured.\n\n`;
    } else {
      prompt += `Rewrite the content while keeping the same heading structure. Improve clarity and readability.\n\n`;
    }

    prompt += `Content voice and tone: ${voiceAndTone}\n`;
    prompt += `Language: ${languageName}\n\n`;
    
    prompt += `Source Content:\n${content}\n\n`;
    prompt += `Rewritten Content (${languageName}):`;

    // Call AI service to rewrite
    const estimatedTokens = Math.ceil(content.length / 4) + 500;
    
    const result = await aiService.generateContentWithStreaming(
      prompt,
      {
        model: model,
        temperature: 0.7,
        maxTokens: Math.min(estimatedTokens * 2, 4000),
        language: language,
      },
      userId,
    );

    if (!result || !result.content) {
      return { success: false, tokensUsed: 0 };
    }

    // Clean up the response
    let rewrittenContent = result.content.trim();
    
    // Remove leading phrases like "Here is the rewritten content:" or similar
    rewrittenContent = rewrittenContent
      .replace(/^(here'?s?|here is|below is|following is|the rewritten content|rewritten content).*?:/gi, "")
      .trim();

    return {
      success: true,
      content: rewrittenContent,
      tokensUsed: result.tokensUsed || estimatedTokens,
    };
  } catch (error: any) {
    console.error(`[RewriteSourceContent] Error:`, error);
    return { success: false, tokensUsed: 0 };
  }
}

/**
 * Create article with new workflow (batch write)
 *
 * STEPS:
 * 1. Create article record with title = keyword line + status "Đang viết"
 * 2. Generate SEO Title + Meta Description using AI
 * 3. Save SEO Title + Meta Description to DB
 * 4. Generate article content using AI
 * 5. Save content to DB
 * 6. Regenerate article title based on primary keyword
 * 7. Save title to DB
 */
async function createArticleWithNewWorkflow(
  userId: number,
  articleData: { keywordLine: string; keywords: string[] },
  articleIndex: number,
  settings: any,
): Promise<{ articleId: number; tokensUsed: number } | null> {
  let totalTokensUsed = 0;

  try {
    const primaryKeyword = articleData.keywords[0] || articleData.keywordLine;
    const model = settings.model || "gpt-4";
    const language = settings.language || "vi";

    console.log(`\n📝 [NewWorkflow] Step 1: Creating article record`);
    console.log(`   Title: "${articleData.keywordLine} - Đang viết"`);

    // STEP 1: Create article record in DB
    const insertResult = await execute(
      `INSERT INTO articles (
        user_id, title, content, status, keywords, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        articleData.keywordLine + " - Đang viết",
        "", // Empty content initially
        "draft",
        JSON.stringify(articleData.keywords),
      ],
    );

    const articleId = (insertResult as any).insertId;
    console.log(`✅ [NewWorkflow] Article created with ID: ${articleId}`);

    // STEP 2: Generate SEO Title
    console.log(`\n📝 [NewWorkflow] Step 2: Generating SEO Title`);
    const seoTitleResult = await generateBatchWriteSeoTitle(
      primaryKeyword,
      language,
      userId,
      model,
    );

    if (!seoTitleResult.success) {
      console.error(`❌ [NewWorkflow] Failed to generate SEO Title`);
      return null;
    }

    const seoTitle = seoTitleResult.seoTitle || primaryKeyword;
    totalTokensUsed += seoTitleResult.tokensUsed || 0;
    console.log(`✅ [NewWorkflow] SEO Title: "${seoTitle}"`);

    // STEP 3: Generate Meta Description
    console.log(`\n📝 [NewWorkflow] Step 3: Generating Meta Description`);
    const metaDescResult = await generateBatchWriteMetaDescription(
      primaryKeyword,
      seoTitle,
      language,
      userId,
      model,
    );

    if (!metaDescResult.success) {
      console.error(`❌ [NewWorkflow] Failed to generate Meta Description`);
      return null;
    }

    const metaDescription = metaDescResult.metaDescription || "";
    totalTokensUsed += metaDescResult.tokensUsed || 0;
    console.log(
      `✅ [NewWorkflow] Meta Description: "${metaDescription.substring(0, 80)}..."`,
    );

    // STEP 4: Save SEO Title + Meta Description to DB
    console.log(`\n📝 [NewWorkflow] Step 4: Saving metadata to DB`);
    await execute(
      `UPDATE articles SET meta_title = ?, meta_description = ? WHERE id = ?`,
      [seoTitle, metaDescription, articleId],
    );
    console.log(`✅ [NewWorkflow] Metadata saved`);

    // STEP 5: Generate article content
    console.log(`\n📝 [NewWorkflow] Step 5: Generating article content`);
    const contentResult = await generateBatchWriteContent(
      primaryKeyword,
      seoTitle,
      language,
      userId,
      model,
    );

    if (!contentResult.success) {
      console.error(`❌ [NewWorkflow] Failed to generate content`);
      return null;
    }

    const content = contentResult.content || "";
    totalTokensUsed += contentResult.tokensUsed || 0;
    console.log(`✅ [NewWorkflow] Content generated (${content.length} chars)`);

    // STEP 6: Save content to DB
    console.log(`\n📝 [NewWorkflow] Step 6: Saving content to DB`);
    await execute(`UPDATE articles SET content = ? WHERE id = ?`, [
      content,
      articleId,
    ]);
    console.log(`✅ [NewWorkflow] Content saved`);

    // STEP 7: Generate final title based on primary keyword
    console.log(`\n📝 [NewWorkflow] Step 7: Generating final title`);
    const titleResult = await generateBatchWriteArticleTitle(
      primaryKeyword,
      language,
      userId,
      model,
    );

    if (!titleResult.success) {
      console.error(`❌ [NewWorkflow] Failed to generate title`);
      return null;
    }

    const finalTitle = titleResult.title || primaryKeyword;
    totalTokensUsed += titleResult.tokensUsed || 0;
    console.log(`✅ [NewWorkflow] Final title: "${finalTitle}"`);

    // STEP 8: Save final title to DB + update status
    console.log(
      `\n📝 [NewWorkflow] Step 8: Saving final title and updating status`,
    );
    await execute(
      `UPDATE articles SET title = ?, status = 'published' WHERE id = ?`,
      [finalTitle, articleId],
    );
    console.log(`✅ [NewWorkflow] Article completed and published`);

    console.log(
      `\n✅ [NewWorkflow] Article #${articleId} completed successfully (${totalTokensUsed} total tokens)`,
    );

    return {
      articleId,
      tokensUsed: totalTokensUsed,
    };
  } catch (error: any) {
    console.error(`❌ [NewWorkflow] Error:`, error);
    return null;
  }
}

/**
 * Generate article title using batch_write_article_title prompt
 */
async function generateBatchWriteArticleTitle(
  keyword: string,
  language: string,
  userId: number,
  model: string,
): Promise<{ success: boolean; title?: string; tokensUsed: number }> {
  try {
    const result = await aiService.generateBatchWriteArticleTitle(
      keyword,
      userId,
      language,
      "professional",
      model,
    );

    return {
      success: result.success || false,
      title: result.title,
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    console.error("Error generating title:", error);
    return { success: false, tokensUsed: 0 };
  }
}

/**
 * Generate SEO title using batch_write_seo_title prompt
 */
async function generateBatchWriteSeoTitle(
  keyword: string,
  language: string,
  userId: number,
  model: string,
): Promise<{ success: boolean; seoTitle?: string; tokensUsed: number }> {
  try {
    // Need title for SEO title generation, use keyword as title
    const result = await aiService.generateBatchWriteSeoTitle(
      keyword, // title
      keyword, // keyword
      userId,
      language,
      model,
    );

    return {
      success: result.success || false,
      seoTitle: result.seoTitle,
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    console.error("Error generating SEO title:", error);
    return { success: false, tokensUsed: 0 };
  }
}

/**
 * Generate meta description using batch_write_meta_description prompt
 */
async function generateBatchWriteMetaDescription(
  keyword: string,
  seoTitle: string,
  language: string,
  userId: number,
  model: string,
): Promise<{ success: boolean; metaDescription?: string; tokensUsed: number }> {
  try {
    const result = await aiService.generateBatchWriteMetaDescription(
      seoTitle, // title
      keyword, // keyword
      userId,
      language,
      model,
    );

    return {
      success: result.success || false,
      metaDescription: result.metaDesc, // Note: property name is metaDesc
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    console.error("Error generating meta description:", error);
    return { success: false, tokensUsed: 0 };
  }
}

/**
 * Generate article content - use standard content generation
 */
async function generateBatchWriteContent(
  keyword: string,
  seoTitle: string,
  language: string,
  userId: number,
  model: string,
): Promise<{ success: boolean; content?: string; tokensUsed: number }> {
  try {
    // Use existing article content generation
    const result = await aiService.generateArticleContent({
      keyword,
      language,
      userId,
      model,
      tone: "professional",
      outlineType: "no-outline",
      customOutline: "",
      length: "medium",
    });

    return {
      success: result.success || false,
      content: result.content,
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error) {
    console.error("Error generating content:", error);
    return { success: false, tokensUsed: 0 };
  }
}

/**
 * Create article using the unified article generation service
 * This ensures batch processing uses the same logic as single article generation
 */
async function createArticle(
  userId: number,
  keyword: string,
  keywordIndex: number,
  settings: any,
): Promise<{ articleId: number; tokensUsed: number } | null> {
  try {
    console.log(
      `\n📝 [BatchWorker] Creating article for keyword: "${keyword}"`,
    );
    console.log(`   Settings:`, {
      model: settings.model,
      length: settings.length,
      outlineType: settings.outlineOption,
      language: settings.language,
      tone: settings.tone,
    });

    // Call the unified article generation service
    const result = await generateCompleteArticle({
      userId,
      keyword,
      language: settings.language || "vi",
      tone: settings.tone || "professional",
      model: settings.model || "gpt-4",
      length: settings.length || "medium",
      outlineType: settings.outlineOption || "no-outline",
      customOutline: settings.customOutline || "",
      websiteId: settings.websiteId || "",
      autoInsertImages: settings.autoInsertImages || false,
      maxImages: settings.maxImages || 5,
      useGoogleSearch: settings.useGoogleSearch || false,
    });

    if (result.success && result.articleId) {
      console.log(`✅ [BatchWorker] Article created successfully`);
      console.log(`   Article ID: ${result.articleId}`);
      console.log(`   Tokens used: ${result.tokensUsed}`);

      return {
        articleId: result.articleId,
        tokensUsed: result.tokensUsed || 0,
      };
    } else {
      console.error(
        `❌ [BatchWorker] Article generation failed:`,
        result.error,
      );
      return null;
    }
  } catch (error: any) {
    console.error(`❌ [BatchWorker] Error creating article:`, error);
    return null;
  }
}

// ========== OLD IMPLEMENTATION - REMOVED ==========
// The old generateArticleContent and helper functions have been removed.
// All article generation now goes through the unified articleGenerationService.
// This ensures consistency between single and batch article generation.
// =================================================

/**
 * Mark job as failed
 */
async function markJobAsFailed(jobId: number, errorMessage: string) {
  try {
    await execute(
      `UPDATE batch_jobs 
       SET status = 'failed',
           error_message = ?,
           completed_at = NOW(),
           last_activity_at = NOW()
       WHERE id = ?`,
      [errorMessage, jobId],
    );
  } catch (error) {
    console.error("[BatchWorker] Error marking job as failed:", error);
  }
}

/**
 * Pause job with error message
 */
async function pauseJobWithError(
  jobId: number,
  currentIndex: number,
  errorMessage: string,
) {
  try {
    await execute(
      `UPDATE batch_jobs 
       SET status = 'paused',
           current_item_index = ?,
           error_message = ?,
           last_activity_at = NOW()
       WHERE id = ?`,
      [currentIndex, errorMessage, jobId],
    );
  } catch (error) {
    console.error("[BatchWorker] Error pausing job:", error);
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the worker with interval polling
 */
export function startBatchJobWorker(intervalMs: number = 5000) {
  console.log(`[BatchWorker] Starting worker with ${intervalMs}ms interval`);

  // Run immediately
  processBatchJobs();

  // Then run on interval
  setInterval(() => {
    processBatchJobs();
  }, intervalMs);
}
