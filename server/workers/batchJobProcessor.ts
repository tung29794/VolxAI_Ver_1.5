import { query, execute } from "../db";
import { generateCompleteArticle } from "../services/articleGenerationService";

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
      [MAX_CONCURRENT_JOBS]
    );

    if (!jobs || jobs.length === 0) {
      return; // No jobs to process
    }

    // Filter out jobs for users already being processed
    const availableJobs = jobs.filter(job => !processingJobs.has(job.user_id));

    if (availableJobs.length === 0) {
      console.log("[BatchWorker] All pending jobs are for users already being processed");
      return;
    }

    console.log(`[BatchWorker] Processing ${availableJobs.length} jobs in parallel`);

    // Process all available jobs in parallel
    const promises = availableJobs.map(job => processJob(job));
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
    console.log(`[BatchWorker] Processing job #${job.id} for user ${job.user_id}`);

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

        const result = await createArticle(job.user_id, keyword, i, settings);

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
    console.error(`[BatchWorker] Error processing job #${job.id}:`, error);
  } finally {
    // Remove from processing set
    processingJobs.delete(job.user_id);
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
  settings: any
): Promise<{ articleId: number; tokensUsed: number } | null> {
  try {
    console.log(`\n📝 [BatchWorker] Creating article for keyword: "${keyword}"`);
    console.log(`   Settings:`, {
      model: settings.model,
      length: settings.length,
      outlineType: settings.outlineOption,
      language: settings.language,
      tone: settings.tone
    });

    // Call the unified article generation service
    const result = await generateCompleteArticle({
      userId,
      keyword,
      language: settings.language || 'vi',
      tone: settings.tone || 'professional',
      model: settings.model || 'gpt-4',
      length: settings.length || 'medium',
      outlineType: settings.outlineOption || 'no-outline',
      customOutline: settings.customOutline || '',
      websiteId: settings.websiteId || '',
      autoInsertImages: settings.autoInsertImages || false,
      maxImages: settings.maxImages || 5,
      useGoogleSearch: settings.useGoogleSearch || false
    });

    if (result.success && result.articleId) {
      console.log(`✅ [BatchWorker] Article created successfully`);
      console.log(`   Article ID: ${result.articleId}`);
      console.log(`   Tokens used: ${result.tokensUsed}`);
      
      return {
        articleId: result.articleId,
        tokensUsed: result.tokensUsed || 0
      };
    } else {
      console.error(`❌ [BatchWorker] Article generation failed:`, result.error);
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
