import { query, execute } from "../db";
import {
  generateArticleContent as aiGenerateArticle,
  insertImagesIntoArticle,
} from "../services/aiService";

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
    autoInsertImages?: boolean;
    maxImages?: number;
  };
}

let isProcessing = false;

/**
 * Main worker function - processes batch jobs sequentially
 */
export async function processBatchJobs() {
  if (isProcessing) {
    console.log("[BatchWorker] Already processing, skipping...");
    return;
  }

  try {
    isProcessing = true;

    // Get oldest pending job
    const jobs = await query<BatchJob>(
      `SELECT * FROM batch_jobs 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT 1`
    );

    if (!jobs || jobs.length === 0) {
      return; // No jobs to process
    }

    const job = jobs[0];
    console.log(`[BatchWorker] Processing job #${job.id}`);

    // Mark as processing
    await execute(
      `UPDATE batch_jobs 
       SET status = 'processing', 
           started_at = COALESCE(started_at, NOW()),
           last_activity_at = NOW() 
       WHERE id = ?`,
      [job.id]
    );

    // Parse job data
    let jobData: JobData;
    try {
      jobData = typeof job.job_data === 'string' 
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
        ? (typeof job.article_ids === 'string' ? JSON.parse(job.article_ids) : job.article_ids)
        : [];
    } catch (error) {
      articleIds = [];
    }

    const { keywords, settings } = jobData;
    const startIndex = job.current_item_index || 0;

    // Process each keyword sequentially
    for (let i = startIndex; i < keywords.length; i++) {
      const keyword = keywords[i];

      // Check if job was paused or cancelled
      const currentJob = await query<BatchJob>(
        "SELECT status FROM batch_jobs WHERE id = ?",
        [job.id]
      );

      if (!currentJob || currentJob.length === 0) {
        console.log(`[BatchWorker] Job #${job.id} not found, stopping`);
        return;
      }

      if (currentJob[0].status === 'cancelled') {
        console.log(`[BatchWorker] Job #${job.id} cancelled, stopping`);
        return;
      }

      if (currentJob[0].status === 'paused') {
        console.log(`[BatchWorker] Job #${job.id} paused, stopping`);
        return;
      }

      // Check user's current limits
      const users = await query<any>(
        "SELECT tokens_remaining, article_limit FROM users WHERE id = ?",
        [job.user_id]
      );

      if (!users || users.length === 0) {
        await markJobAsFailed(job.id, "User not found");
        return;
      }

      const user = users[0];
      const tokensRemaining = user.tokens_remaining || 0;
      const articleLimit = user.article_limit || 0;

      // Check if user has reached limits
      if (tokensRemaining <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Insufficient tokens. Job paused at keyword ${i + 1}/${keywords.length}.`
        );
        console.log(`[BatchWorker] Job #${job.id} paused - out of tokens`);
        return;
      }

      if (articleLimit <= 0) {
        await pauseJobWithError(
          job.id,
          i,
          `Article limit reached. Job paused at keyword ${i + 1}/${keywords.length}.`
        );
        console.log(`[BatchWorker] Job #${job.id} paused - article limit reached`);
        return;
      }

      // Process this keyword
      try {
        console.log(`[BatchWorker] Processing keyword ${i + 1}/${keywords.length}: "${keyword}"`);

        const result = await createArticle(job.user_id, keyword, settings);

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
            [i + 1, i + 1, JSON.stringify(articleIds), tokensUsed, job.id]
          );

          console.log(`[BatchWorker] Successfully created article #${articleId} for keyword "${keyword}" (${tokensUsed} tokens)`);
        } else {
          // Article creation failed, increment failed count
          await execute(
            `UPDATE batch_jobs 
             SET failed_items = failed_items + 1,
                 current_item_index = ?,
                 last_activity_at = NOW()
             WHERE id = ?`,
            [i + 1, job.id]
          );

          console.log(`[BatchWorker] Failed to create article for keyword "${keyword}"`);
        }
      } catch (error: any) {
        console.error(`[BatchWorker] Error processing keyword "${keyword}":`, error);

        // Increment failed count
        await execute(
          `UPDATE batch_jobs 
           SET failed_items = failed_items + 1,
               current_item_index = ?,
               last_activity_at = NOW()
           WHERE id = ?`,
          [i + 1, job.id]
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
      [job.id]
    );

    console.log(`[BatchWorker] Job #${job.id} completed successfully`);

  } catch (error: any) {
    console.error("[BatchWorker] Unexpected error:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Create article draft and trigger AI generation
 */
async function createArticle(
  userId: number,
  keyword: string,
  settings: any
): Promise<{ articleId: number; tokensUsed: number } | null> {
  try {
    // 1. Create draft article
    const result = await execute(
      `INSERT INTO articles (user_id, title, content, status, created_at, updated_at)
       VALUES (?, ?, '', 'draft', NOW(), NOW())`,
      [userId, keyword]
    );

    const articleId = result.insertId;

    if (!articleId) {
      return null;
    }

    // 2. Generate AI content
    const tokensUsed = await generateArticleContent(articleId, userId, keyword, settings);

    return { articleId, tokensUsed };
  } catch (error: any) {
    console.error(`[BatchWorker] Error creating article:`, error);
    return null;
  }
}

/**
 * Generate article content using AI
 * Calls the aiService to generate content
 */
async function generateArticleContent(
  articleId: number,
  userId: number,
  keyword: string,
  settings: any
) {
  try {
    console.log(`[BatchWorker] Generating AI content for article #${articleId} (keyword: "${keyword}")`);
    
    // Prepare options for AI service
    const options = {
      keyword: keyword,
      language: settings.language || "vi",
      outlineType: settings.outlineOption || "ai-outline",
      tone: settings.tone || "professional",
      model: settings.model || "GPT 4",
      length: settings.length || "medium",
      userId: userId,
      useGoogleSearch: settings.useGoogleSearch || false,
      websiteId: settings.websiteId || undefined,
    };

    // Generate article content
    const result = await aiGenerateArticle(options);

    if (!result.success || !result.content) {
      throw new Error(result.error || "Failed to generate content");
    }

    console.log(`✅ [BatchWorker] Content generated (${result.content.length} chars, ${result.tokensUsed} tokens)`);

    // Update article with generated content
    await execute(
      "UPDATE articles SET content = ?, updated_at = NOW() WHERE id = ?",
      [result.content, articleId]
    );

    // Auto-insert images if requested
    if (settings.autoInsertImages) {
      const maxImages = settings.maxImages || 5;
      console.log(`🖼️ [BatchWorker] Auto-inserting up to ${maxImages} images...`);
      
      const imageResult = await insertImagesIntoArticle(
        articleId,
        keyword,
        maxImages
      );

      if (imageResult.success) {
        console.log(`✅ [BatchWorker] Inserted ${imageResult.imagesInserted} images`);
      } else {
        console.log(`⚠️ [BatchWorker] Image insertion failed: ${imageResult.error}`);
      }
    }

    return result.tokensUsed || 0;
  } catch (error: any) {
    console.error(`[BatchWorker] Error generating article content:`, error);
    throw error;
  }
}

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
      [errorMessage, jobId]
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
  errorMessage: string
) {
  try {
    await execute(
      `UPDATE batch_jobs 
       SET status = 'paused',
           current_item_index = ?,
           error_message = ?,
           last_activity_at = NOW()
       WHERE id = ?`,
      [currentIndex, errorMessage, jobId]
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
