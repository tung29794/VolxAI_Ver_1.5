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
    // Get pending batch_keywords jobs
    const jobs = await query<BatchJob>(
      `SELECT * FROM batch_jobs 
       WHERE status = 'pending' AND job_type = 'batch_keywords'
       ORDER BY created_at ASC 
       LIMIT ?`,
      [MAX_CONCURRENT_JOBS]
    );

    if (!jobs || jobs.length === 0) {
      return;
    }

    // Filter out jobs for users already being processed
    const availableJobs = jobs.filter(job => !processingJobs.has(job.user_id));

    if (availableJobs.length === 0) {
      console.log("[BatchWrite] All pending jobs are for users already being processed");
      return;
    }

    console.log(`[BatchWrite] Processing ${availableJobs.length} batch write jobs`);

    // Process all available jobs in parallel
    const promises = availableJobs.map(job => processJob(job));
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
    console.log(`\n[BatchWrite] Processing job #${job.id} for user ${job.user_id}`);

    // Mark as processing
    await execute(
      `UPDATE batch_jobs SET status = 'processing', started_at = COALESCE(started_at, NOW()), last_activity_at = NOW() WHERE id = ?`,
      [job.id]
    );

    // Parse job data
    let jobData: JobData;
    try {
      jobData = typeof job.job_data === 'string' ? JSON.parse(job.job_data) : job.job_data;
    } catch (error) {
      await markJobFailed(job.id, "Invalid job data format");
      return;
    }

    const { keywords, settings } = jobData;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      await markJobFailed(job.id, "No keywords provided");
      return;
    }

    let articleIds: number[] = [];
    const startIndex = job.current_item_index || 0;

    // Process each keyword line sequentially
    for (let i = startIndex; i < keywords.length; i++) {
      const keywordLine = keywords[i];

      // Check job status
      const currentJobs = await query<BatchJob>("SELECT status FROM batch_jobs WHERE id = ?", [job.id]);
      const currentJob = currentJobs?.[0];
      if (!currentJob || currentJob.status === 'cancelled') {
        console.log(`[BatchWrite] Job #${job.id} cancelled, stopping`);
        return;
      }

      if (currentJob.status === 'paused') {
        console.log(`[BatchWrite] Job #${job.id} paused, stopping`);
        return;
      }

      // Check user limits
      const users = await query<any>("SELECT tokens_remaining, article_limit FROM users WHERE id = ?", [job.user_id]);
      const user = users?.[0];
      if (!user) {
        await markJobFailed(job.id, "User not found");
        return;
      }

      if (user.tokens_remaining <= 0) {
        await pauseJob(job.id, i, `Insufficient tokens at article ${i + 1}/${keywords.length}`);
        return;
      }

      if (user.article_limit <= 0) {
        await pauseJob(job.id, i, `Article limit reached at article ${i + 1}/${keywords.length}`);
        return;
      }

      try {
        console.log(`\n📝 [BatchWrite] Article ${i + 1}/${keywords.length}: "${keywordLine}"`);

        const result = await processKeywordLine(job.user_id, keywordLine, settings);

        if (result.success && result.articleId) {
          articleIds.push(result.articleId);
          
          await execute(
            `UPDATE batch_jobs SET completed_items = completed_items + 1, current_item_index = ?, article_ids = ?, tokens_used = tokens_used + ?, last_activity_at = NOW() WHERE id = ?`,
            [i + 1, JSON.stringify(articleIds), result.tokensUsed || 0, job.id]
          );

          console.log(`✅ [BatchWrite] Article #${result.articleId} completed (${result.tokensUsed} tokens)`);
        } else {
          await execute(
            `UPDATE batch_jobs SET failed_items = failed_items + 1, current_item_index = ?, last_activity_at = NOW() WHERE id = ?`,
            [i + 1, job.id]
          );

          console.log(`❌ [BatchWrite] Article failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[BatchWrite] Error processing keyword:`, error);
        await execute(
          `UPDATE batch_jobs SET failed_items = failed_items + 1, current_item_index = ?, last_activity_at = NOW() WHERE id = ?`,
          [i + 1, job.id]
        );
      }

      // Small delay between articles
      await sleep(1000);
    }

    // Job completed successfully
    await execute(
      `UPDATE batch_jobs SET status = 'completed', completed_at = NOW(), last_activity_at = NOW() WHERE id = ?`,
      [job.id]
    );

    console.log(`✅ [BatchWrite] Job #${job.id} completed successfully`);

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
  settings: JobData['settings']
): Promise<{ success: boolean; articleId?: number; tokensUsed: number; error?: string }> {
  let totalTokensUsed = 0;

  try {
    // Parse keywords from line
    const parsedKeywords = keywordLine
      .split(',')
      .map(kw => kw.trim())
      .filter(kw => kw.length > 0);

    const primaryKeyword = parsedKeywords[0] || keywordLine;
    const language = settings?.language || 'vi';
    
    // ✅ Always use gpt-3.5-turbo for title, SEO title, meta description
    const titleModel = 'gpt-3.5-turbo';
    
    // User-selected model for article content only
    const contentModel = settings?.model || 'gpt-3.5-turbo';

    console.log(`  🤖 Title model: "${titleModel}"`);
    console.log(`  🤖 Content model: "${contentModel}"`);

    // STEP 1: Create article record
    console.log(`  📝 Step 1: Creating article record`);
    const insertResult = await execute(
      `INSERT INTO articles (user_id, title, content, status, keywords, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, keywordLine + ' - Đang viết', '', 'draft', JSON.stringify(parsedKeywords)]
    );

    const articleId = (insertResult as any).insertId;
    if (!articleId) throw new Error('Failed to create article record');
    console.log(`  ✅ Article created: #${articleId}`);

    // STEP 2: Generate SEO Title (always use OpenAI)
    console.log(`  📝 Step 2: Generating SEO Title (using ${titleModel})`);
    const seoTitleResult = await aiService.generateBatchWriteSeoTitle(
      primaryKeyword,  // title
      primaryKeyword,  // keyword
      userId,
      language,
      titleModel
    );

    if (!seoTitleResult.success || !seoTitleResult.seoTitle) {
      throw new Error(`Failed to generate SEO Title: ${seoTitleResult.error}`);
    }

    const seoTitle = seoTitleResult.seoTitle.trim();
    totalTokensUsed += seoTitleResult.tokensUsed || 0;
    console.log(`  ✅ SEO Title: "${seoTitle}"`);

    // STEP 3: Generate Meta Description (always use OpenAI)
    console.log(`  📝 Step 3: Generating Meta Description (using ${titleModel})`);
    const metaDescResult = await aiService.generateBatchWriteMetaDescription(
      seoTitle,           // title
      primaryKeyword,     // keyword
      userId,
      language,
      titleModel
    );

    if (!metaDescResult.success || !metaDescResult.metaDesc) {
      throw new Error(`Failed to generate Meta Description: ${metaDescResult.error}`);
    }

    const metaDesc = metaDescResult.metaDesc.trim();
    totalTokensUsed += metaDescResult.tokensUsed || 0;
    console.log(`  ✅ Meta Description: "${metaDesc.substring(0, 60)}..."`);

    // STEP 4: Save metadata
    console.log(`  📝 Step 4: Saving SEO Title and Meta Description`);
    await execute(
      `UPDATE articles SET seo_title = ?, meta_description = ? WHERE id = ?`,
      [seoTitle, metaDesc, articleId]
    );
    console.log(`  ✅ Metadata saved`);

    // STEP 5: Generate article content (use user-selected model)
    console.log(`  📝 Step 5: Generating article content (using ${contentModel})`);
    const contentResult = await aiService.generateArticleContent({
      keyword: primaryKeyword,
      language,
      model: contentModel,
      userId,
      tone: settings?.tone || 'professional',
      outlineType: settings?.outlineOption || 'no-outline',
      customOutline: settings?.customOutline || '',
      length: settings?.length || 'medium'
    });

    if (!contentResult.success || !contentResult.content) {
      throw new Error(`Failed to generate content: ${contentResult.error}`);
    }

    const content = contentResult.content.trim();
    totalTokensUsed += contentResult.tokensUsed || 0;
    console.log(`  ✅ Content generated: ${content.length} chars`);

    // STEP 6: Save content
    console.log(`  📝 Step 6: Saving content`);
    await execute(
      `UPDATE articles SET content = ? WHERE id = ?`,
      [content, articleId]
    );
    console.log(`  ✅ Content saved`);

    // STEP 7: Generate final article title (always use OpenAI)
    console.log(`  📝 Step 7: Generating final article title (using ${titleModel})`);
    const titleResult = await aiService.generateBatchWriteArticleTitle(
      primaryKeyword,
      userId,
      language,
      'professional',
      titleModel
    );

    if (!titleResult.success || !titleResult.title) {
      throw new Error(`Failed to generate article title: ${titleResult.error}`);
    }

    const finalTitle = titleResult.title.trim();
    totalTokensUsed += titleResult.tokensUsed || 0;
    console.log(`  ✅ Final title: "${finalTitle}"`);

    // STEP 8: Save title
    console.log(`  📝 Step 8: Saving final title`);
    await execute(
      `UPDATE articles SET title = ? WHERE id = ?`,
      [finalTitle, articleId]
    );
    console.log(`  ✅ Title saved`);

    // STEP 9: VALIDATE - ALL REQUIRED FIELDS MUST EXIST AND MEET CRITERIA
    console.log(`  📝 Step 9: Validating article`);
    const articles = await query<any>(
      `SELECT id, title, seo_title, meta_description, content FROM articles WHERE id = ?`,
      [articleId]
    );
    const article = articles?.[0];

    if (!article) {
      throw new Error('Article record not found after update');
    }

    // Strict validation
    const validationErrors: string[] = [];

    // Check title length >= 40 characters
    if (!article.title || article.title.length < 40) {
      validationErrors.push(`Title too short: ${article.title?.length || 0} chars (required: 40+)`);
    }

    // Check SEO title exists
    if (!article.seo_title || article.seo_title.trim().length === 0) {
      validationErrors.push(`SEO Title is missing or empty`);
    }

    // Check Meta Description exists
    if (!article.meta_description || article.meta_description.trim().length === 0) {
      validationErrors.push(`Meta Description is missing or empty`);
    }

    // Check content exists
    if (!article.content || article.content.trim().length === 0) {
      validationErrors.push(`Content is missing or empty`);
    }

    if (validationErrors.length > 0) {
      // Validation failed - keep article as draft
      const errorMsg = validationErrors.join('; ');
      console.log(`  ❌ Validation failed: ${errorMsg}`);
      
      await execute(
        `UPDATE articles SET status = 'draft' WHERE id = ?`,
        [articleId]
      );

      return {
        success: false,
        articleId,
        tokensUsed: totalTokensUsed,
        error: `Validation failed: ${errorMsg}`
      };
    }

    // STEP 10: All validations passed - mark as published
    console.log(`  📝 Step 10: Marking article as published`);
    await execute(
      `UPDATE articles SET status = 'published' WHERE id = ?`,
      [articleId]
    );
    console.log(`  ✅ Article published`);

    return {
      success: true,
      articleId,
      tokensUsed: totalTokensUsed
    };

  } catch (error: any) {
    console.error(`  ❌ Error in processKeywordLine:`, error.message);
    return {
      success: false,
      tokensUsed: totalTokensUsed,
      error: error.message || 'Unknown error'
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
      [errorMessage, jobId]
    );
  } catch (error) {
    console.error("[BatchWrite] Error marking job as failed:", error);
  }
}

/**
 * Pause job with error message
 */
async function pauseJob(jobId: number, currentIndex: number, errorMessage: string) {
  try {
    await execute(
      `UPDATE batch_jobs SET status = 'paused', current_item_index = ?, error_message = ?, last_activity_at = NOW() WHERE id = ?`,
      [currentIndex, errorMessage, jobId]
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
