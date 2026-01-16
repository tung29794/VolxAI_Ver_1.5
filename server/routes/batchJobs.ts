import { Router, Request, Response } from "express";
import { query, queryOne, execute } from "../db";
import jwt from "jsonwebtoken";

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Middleware to authenticate token
const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: Function
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid token",
    });
  }
};

// Get user's batch jobs
router.get("/batch-jobs", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, limit = 20, page = 1 } = req.query;

    let queryStr = "SELECT * FROM batch_jobs WHERE user_id = ?";
    const params: any[] = [user.id];

    if (status && status !== "all") {
      queryStr += " AND status = ?";
      params.push(status);
    }

    queryStr += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const jobs = await query(queryStr, params);

    // Get total count
    let countQueryStr = "SELECT COUNT(*) as total FROM batch_jobs WHERE user_id = ?";
    const countParams: any[] = [user.id];
    if (status && status !== "all") {
      countQueryStr += " AND status = ?";
      countParams.push(status);
    }
    const countResult = await query<any>(countQueryStr, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching batch jobs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch batch jobs",
    });
  }
});

// Get single batch job details
router.get("/batch-jobs/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const jobs = await query(
      "SELECT * FROM batch_jobs WHERE id = ? AND user_id = ?",
      [id, user.id]
    );

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch job not found",
      });
    }

    const job = jobs[0] as any;

    // Parse JSON fields
    if (job.job_data) {
      try {
        job.job_data = typeof job.job_data === 'string' 
          ? JSON.parse(job.job_data) 
          : job.job_data;
      } catch (e) {
        job.job_data = {};
      }
    }

    if (job.article_ids) {
      try {
        job.article_ids = typeof job.article_ids === 'string'
          ? JSON.parse(job.article_ids)
          : job.article_ids;
      } catch (e) {
        job.article_ids = [];
      }
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error("Error fetching batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch batch job",
    });
  }
});

// Create batch job
router.post("/batch-jobs", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { job_type, keywords, settings } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Keywords array is required",
      });
    }

    // Get user's current tokens and article limit
    const users = await query<any>(
      "SELECT tokens_remaining, article_limit FROM users WHERE id = ?",
      [user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userData = users[0];
    const tokensAtStart = userData.tokens_remaining || 0;
    const articlesLimitAtStart = userData.article_limit || 0;

    // Create batch job
    const jobData = {
      keywords,
      settings: settings || {},
    };

    const result = await execute(
      `INSERT INTO batch_jobs (
        user_id, job_type, status, total_items, 
        job_data, tokens_at_start, articles_limit_at_start,
        last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        job_type || "batch_keywords",
        "pending",
        keywords.length,
        JSON.stringify(jobData),
        tokensAtStart,
        articlesLimitAtStart,
      ]
    );

    const jobId = result.insertId;

    res.json({
      success: true,
      data: {
        jobId,
        total_items: keywords.length,
        status: "pending",
      },
    });
  } catch (error: any) {
    console.error("Error creating batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create batch job",
    });
  }
});

// Cancel batch job
router.post("/batch-jobs/:id/cancel", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const result = await execute(
      `UPDATE batch_jobs 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = ? AND user_id = ? AND status IN ('pending', 'processing')`,
      [id, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch job not found or cannot be cancelled",
      });
    }

    res.json({
      success: true,
      message: "Batch job cancelled",
    });
  } catch (error: any) {
    console.error("Error cancelling batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to cancel batch job",
    });
  }
});

// Pause batch job
router.post("/batch-jobs/:id/pause", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const result = await execute(
      `UPDATE batch_jobs 
       SET status = 'paused', updated_at = NOW() 
       WHERE id = ? AND user_id = ? AND status = 'processing'`,
      [id, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch job not found or not processing",
      });
    }

    res.json({
      success: true,
      message: "Batch job paused",
    });
  } catch (error: any) {
    console.error("Error pausing batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to pause batch job",
    });
  }
});

// Resume batch job
router.post("/batch-jobs/:id/resume", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const result = await execute(
      `UPDATE batch_jobs 
       SET status = 'pending', updated_at = NOW() 
       WHERE id = ? AND user_id = ? AND status = 'paused'`,
      [id, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch job not found or not paused",
      });
    }

    res.json({
      success: true,
      message: "Batch job resumed",
    });
  } catch (error: any) {
    console.error("Error resuming batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to resume batch job",
    });
  }
});

// Delete batch job
router.delete("/batch-jobs/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Only allow deleting completed, failed, or cancelled jobs
    const result = await execute(
      `DELETE FROM batch_jobs 
       WHERE id = ? AND user_id = ? AND status IN ('completed', 'failed', 'cancelled')`,
      [id, user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch job not found or cannot be deleted",
      });
    }

    res.json({
      success: true,
      message: "Batch job deleted",
    });
  } catch (error: any) {
    console.error("Error deleting batch job:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete batch job",
    });
  }
});

export default router;
