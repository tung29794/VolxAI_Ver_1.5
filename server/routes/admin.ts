import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { query, queryOne, execute } from "../db";

const router = Router();

// Middleware to verify admin role
async function verifyAdmin(req: Request, res: Response): Promise<boolean> {
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

    const user = await queryOne<any>(
      "SELECT id, role FROM users WHERE id = ?",
      [decoded.userId],
    );

    if (!user || user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
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

// Get statistics
router.get("/statistics", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    // Total users
    const totalUsersResult = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users",
    );
    const totalUsers = totalUsersResult?.count || 0;

    // Free users
    const freeUsersResult = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_type = 'free'",
    );
    const freeUsers = freeUsersResult?.count || 0;

    // Upgraded users
    const upgradedUsers = totalUsers - freeUsers;

    // Revenue calculations
    let revenueResult: any[] = [];
    try {
      revenueResult = await query<any>(
        `SELECT
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
          DATE(created_at) as date,
          DATE_FORMAT(created_at, '%Y-%m') as month,
          CONCAT('Q', QUARTER(created_at), ' ', YEAR(created_at)) as quarter,
          YEAR(created_at) as year
        FROM subscription_history
        WHERE status = 'completed' OR status = 'pending_approval'
        GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%Y-%m'), CONCAT('Q', QUARTER(created_at), ' ', YEAR(created_at)), YEAR(created_at)
        ORDER BY created_at DESC`,
      );
    } catch (e: any) {
      // If subscription_history table doesn't exist, just use empty data
      if (
        e?.code === "ER_NO_SUCH_TABLE" ||
        e?.message?.includes("doesn't exist")
      ) {
        console.warn(
          "subscription_history table does not exist. Revenue data will be empty.",
        );
        revenueResult = [];
      } else {
        throw e;
      }
    }

    // Organize revenue data
    const dailyRevenue: { date: string; amount: number }[] = [];
    const monthlyRevenue: { month: string; amount: number }[] = [];
    const quarterlyRevenue: { quarter: string; amount: number }[] = [];
    const yearlyRevenue: { year: number; amount: number }[] = [];

    const processedDates = new Set();
    const processedMonths = new Set();
    const processedQuarters = new Set();
    const processedYears = new Set();

    for (const record of revenueResult) {
      const dateStr = record.date;
      if (dateStr && !processedDates.has(dateStr)) {
        dailyRevenue.push({
          date: dateStr,
          amount: parseInt(record.total_revenue),
        });
        processedDates.add(dateStr);
      }

      const monthStr = record.month;
      if (monthStr && !processedMonths.has(monthStr)) {
        monthlyRevenue.push({
          month: monthStr,
          amount: parseInt(record.total_revenue),
        });
        processedMonths.add(monthStr);
      }

      const quarterStr = record.quarter; // Already formatted as "Q1 2026"
      if (quarterStr && !processedQuarters.has(quarterStr)) {
        quarterlyRevenue.push({
          quarter: quarterStr,
          amount: parseInt(record.total_revenue),
        });
        processedQuarters.add(quarterStr);
      }

      const yearStr = record.year;
      if (yearStr && !processedYears.has(yearStr)) {
        yearlyRevenue.push({
          year: yearStr,
          amount: parseInt(record.total_revenue),
        });
        processedYears.add(yearStr);
      }
    }

    let totalRevenue = 0;
    try {
      const totalRevenueResult = await queryOne<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM subscription_history WHERE status = 'completed' OR status = 'pending_approval'",
      );
      totalRevenue = totalRevenueResult?.total || 0;
    } catch (e: any) {
      // If subscription_history table doesn't exist, just use 0
      if (
        e?.code === "ER_NO_SUCH_TABLE" ||
        e?.message?.includes("doesn't exist")
      ) {
        console.warn(
          "subscription_history table does not exist. Total revenue will be 0.",
        );
        totalRevenue = 0;
      } else {
        throw e;
      }
    }

    res.json({
      success: true,
      data: {
        totalUsers,
        freeUsers,
        upgradedUsers,
        totalRevenue,
        dailyRevenue: dailyRevenue.slice(0, 30),
        monthlyRevenue: monthlyRevenue.slice(0, 12),
        quarterlyRevenue: quarterlyRevenue.slice(0, 8),
        yearlyRevenue: yearlyRevenue.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

// Get all articles
router.get("/articles", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const articles = await query<any>(
      `SELECT 
        a.id,
        a.user_id,
        a.title,
        a.status,
        a.views_count,
        a.tokens_used,
        a.created_at,
        a.published_at,
        u.username
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC`,
    );

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("Get articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch articles",
    });
  }
});

// Archive article
router.post("/articles/:id/archive", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    await execute("UPDATE articles SET status = 'archived' WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Article archived successfully",
    });
  } catch (error) {
    console.error("Archive article error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive article",
    });
  }
});

// Delete article
router.delete("/articles/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    await execute("DELETE FROM articles WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete article",
    });
  }
});

// Get pending payments
router.get("/payments", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const payments = await query<any>(
      `SELECT 
        p.id,
        p.user_id,
        p.from_plan,
        p.to_plan,
        p.amount,
        p.billing_period,
        p.status,
        p.payment_date,
        p.created_at,
        u.username,
        u.email
      FROM payment_approvals p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC`,
    );

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
});

// Approve payment
router.post("/payments/:id/approve", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const adminId = (req as any).userId;

    // Get payment details
    const payment = await queryOne<any>(
      "SELECT * FROM payment_approvals WHERE id = ?",
      [id],
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Define plan details for tokens and articles
    const planDetails: Record<string, { tokens: number; articles: number }> = {
      free: { tokens: 10000, articles: 2 },
      starter: { tokens: 400000, articles: 60 },
      grow: { tokens: 1000000, articles: 150 },
      pro: { tokens: 2000000, articles: 300 },
      professional: { tokens: 2000000, articles: 300 },
      corp: { tokens: 4000000, articles: 600 },
      premium: { tokens: 6500000, articles: 1000 },
    };

    const planInfo =
      planDetails[payment.to_plan as keyof typeof planDetails] ||
      planDetails.free;

    // Calculate expiration date based on billing period
    const expiresAt = new Date();
    if (payment.billing_period === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Get current user subscription to calculate token addition
    const currentSubscription = await queryOne<any>(
      "SELECT tokens_limit, articles_limit FROM user_subscriptions WHERE user_id = ?",
      [payment.user_id],
    );

    const currentTokens = currentSubscription?.tokens_limit || 0;
    const currentArticles = currentSubscription?.articles_limit || 0;
    
    // Add the full amount of new plan tokens and articles to current amounts
    // Don't reset, just add
    const newTokensLimit = currentTokens + planInfo.tokens;
    const newArticlesLimit = currentArticles + planInfo.articles;

    // Update payment status
    await execute(
      "UPDATE payment_approvals SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
      [adminId, id],
    );

    // Update subscription history status and to_plan
    await execute(
      "UPDATE subscription_history SET status = 'completed', to_plan = ? WHERE id = ?",
      [payment.to_plan, payment.subscription_id],
    );

    // Update user subscription plan with tokens, articles, and expiration date
    // Tokens and articles are ADDED, not reset
    await execute(
      "UPDATE user_subscriptions SET plan_type = ?, tokens_limit = ?, articles_limit = ?, expires_at = ? WHERE user_id = ?",
      [
        payment.to_plan,
        newTokensLimit,
        newArticlesLimit,
        expiresAt,
        payment.user_id,
      ],
    );

    // CRITICAL: Also update tokens_remaining and article_limit in users table to match subscription
    // This ensures user can immediately use their new tokens and articles
    await execute(
      "UPDATE users SET tokens_remaining = ?, article_limit = ? WHERE id = ?",
      [newTokensLimit, newArticlesLimit, payment.user_id]
    );

    res.json({
      success: true,
      message: "Payment approved successfully",
    });
  } catch (error) {
    console.error("Approve payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve payment",
    });
  }
});

// Reject payment
router.post("/payments/:id/reject", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get payment details
    const payment = await queryOne<any>(
      "SELECT * FROM payment_approvals WHERE id = ?",
      [id],
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment_approvals status
    await execute(
      "UPDATE payment_approvals SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [reason || "No reason provided", id],
    );

    // Update subscription_history status to rejected with reason
    await execute(
      "UPDATE subscription_history SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [reason || "No reason provided", payment.subscription_id],
    );

    res.json({
      success: true,
      message: "Payment rejected successfully",
    });
  } catch (error) {
    console.error("Reject payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject payment",
    });
  }
});

// ========================================
// SUBSCRIPTION PLANS CRUD OPERATIONS
// ========================================

// Get all subscription plans
router.get("/plans", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    let plans: any[] = [];
    try {
      plans = await query<any>(
        `SELECT
          id,
          plan_key,
          plan_name,
          description,
          monthly_price,
          annual_price,
          tokens_limit,
          articles_limit,
          features,
          icon_name,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM subscription_plans
        ORDER BY display_order ASC, created_at DESC`,
      );
    } catch (tableError: any) {
      // If subscription_plans table doesn't exist, return empty list
      if (
        tableError?.code === "ER_NO_SUCH_TABLE" ||
        tableError?.message?.includes("doesn't exist")
      ) {
        console.warn(
          "subscription_plans table does not exist. Returning empty list.",
        );
        plans = [];
      } else {
        throw tableError;
      }
    }

    // Helper function to convert feature IDs to feature objects
    const convertFeatures = async (featureData: any) => {
      if (!featureData) return [];

      let featureIds: number[] = [];
      try {
        if (typeof featureData === "string") {
          featureIds = JSON.parse(featureData);
        } else if (Array.isArray(featureData)) {
          featureIds = featureData;
        }
      } catch (e) {
        console.error("Failed to parse features:", e);
        return [];
      }

      if (!Array.isArray(featureIds) || featureIds.length === 0) {
        return [];
      }

      try {
        // Get feature details
        const placeholders = featureIds.map(() => "?").join(",");
        const features = await query<any>(
          `SELECT id, name, description, display_order, is_active FROM features WHERE id IN (${placeholders})`,
          featureIds,
        );

        return features || [];
      } catch (e: any) {
        // If features table doesn't exist, just return empty array
        if (
          e?.code === "ER_NO_SUCH_TABLE" ||
          e?.message?.includes("doesn't exist")
        ) {
          console.warn(
            "Features table does not exist. Plans will show without feature details.",
          );
          return [];
        }
        console.error("Failed to convert features:", e);
        return [];
      }
    };

    // Parse features and convert IDs to objects
    const parsedPlans = await Promise.all(
      plans.map(async (plan: any) => ({
        ...plan,
        features: await convertFeatures(plan.features),
      })),
    );

    res.json({
      success: true,
      data: parsedPlans,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
});

// Get single plan
router.get("/plans/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    const plan = await queryOne<any>(
      `SELECT
        id,
        plan_key,
        plan_name,
        description,
        monthly_price,
        annual_price,
        tokens_limit,
        articles_limit,
        features,
        icon_name,
        display_order,
        is_active,
        created_at,
        updated_at
      FROM subscription_plans
      WHERE id = ?`,
      [id],
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Parse features JSON string and convert IDs to objects
    let parsedFeatures: any[] = [];
    if (plan.features) {
      try {
        let featureIds: number[] = [];
        if (typeof plan.features === "string") {
          featureIds = JSON.parse(plan.features);
        } else if (Array.isArray(plan.features)) {
          featureIds = plan.features;
        }

        if (Array.isArray(featureIds) && featureIds.length > 0) {
          try {
            const placeholders = featureIds.map(() => "?").join(",");
            const features = await query<any>(
              `SELECT id, name, description, display_order, is_active FROM features WHERE id IN (${placeholders})`,
              featureIds,
            );
            parsedFeatures = features || [];
          } catch (e: any) {
            // If features table doesn't exist, just return empty array
            if (
              e?.code === "ER_NO_SUCH_TABLE" ||
              e?.message?.includes("doesn't exist")
            ) {
              console.warn(
                `Features table does not exist. Plan ${plan.plan_key} will show without feature details.`,
              );
              parsedFeatures = [];
            } else {
              throw e;
            }
          }
        }
      } catch (e) {
        console.error(`Failed to parse features for plan ${plan.plan_key}:`, e);
        parsedFeatures = [];
      }
    }

    const parsedPlan = {
      ...plan,
      features: parsedFeatures,
    };

    res.json({
      success: true,
      data: parsedPlan,
    });
  } catch (error) {
    console.error("Get plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
});

// Create new plan
router.post("/plans", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const {
      plan_key,
      plan_name,
      description,
      monthly_price,
      annual_price,
      tokens_limit,
      articles_limit,
      features,
      icon_name,
      display_order,
    } = req.body;

    // Validate required fields
    if (!plan_key || !plan_name) {
      return res.status(400).json({
        success: false,
        message: "plan_key and plan_name are required",
      });
    }

    // Check if plan_key already exists
    const existing = await queryOne<any>(
      "SELECT id FROM subscription_plans WHERE plan_key = ?",
      [plan_key],
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Plan with this key already exists",
      });
    }

    await execute(
      `INSERT INTO subscription_plans
        (plan_key, plan_name, description, monthly_price, annual_price,
         tokens_limit, articles_limit, features, icon_name, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan_key,
        plan_name,
        description || null,
        monthly_price || 0,
        annual_price || null,
        tokens_limit || 10000,
        articles_limit || 2,
        features ? JSON.stringify(features) : null,
        icon_name || null,
        display_order || 0,
        true,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
    });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create plan",
    });
  }
});

// Update plan
router.put("/plans/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const {
      plan_key,
      plan_name,
      description,
      monthly_price,
      annual_price,
      tokens_limit,
      articles_limit,
      features,
      icon_name,
      display_order,
      is_active,
    } = req.body;

    // Check if plan exists
    const plan = await queryOne<any>(
      "SELECT id FROM subscription_plans WHERE id = ?",
      [id],
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Check if new plan_key conflicts (if changed)
    if (plan_key) {
      const conflicting = await queryOne<any>(
        "SELECT id FROM subscription_plans WHERE plan_key = ? AND id != ?",
        [plan_key, id],
      );

      if (conflicting) {
        return res.status(400).json({
          success: false,
          message: "Another plan with this key already exists",
        });
      }
    }

    await execute(
      `UPDATE subscription_plans
       SET plan_key = COALESCE(?, plan_key),
           plan_name = COALESCE(?, plan_name),
           description = COALESCE(?, description),
           monthly_price = COALESCE(?, monthly_price),
           annual_price = COALESCE(?, annual_price),
           tokens_limit = COALESCE(?, tokens_limit),
           articles_limit = COALESCE(?, articles_limit),
           features = COALESCE(?, features),
           icon_name = COALESCE(?, icon_name),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        plan_key || null,
        plan_name || null,
        description || null,
        monthly_price !== undefined ? monthly_price : null,
        annual_price || null,
        tokens_limit !== undefined ? tokens_limit : null,
        articles_limit !== undefined ? articles_limit : null,
        features ? JSON.stringify(features) : null,
        icon_name || null,
        display_order !== undefined ? display_order : null,
        is_active !== undefined ? is_active : null,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Plan updated successfully",
    });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update plan",
    });
  }
});

// Delete plan
router.delete("/plans/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    // Check if plan exists
    const plan = await queryOne<any>(
      "SELECT id FROM subscription_plans WHERE id = ?",
      [id],
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Check if plan is being used by any subscription (soft delete instead)
    const usingPlan = await queryOne<any>(
      "SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_type = (SELECT plan_key FROM subscription_plans WHERE id = ?)",
      [id],
    );

    if (usingPlan && usingPlan.count > 0) {
      // Soft delete by setting is_active to false
      await execute(
        "UPDATE subscription_plans SET is_active = 0 WHERE id = ?",
        [id],
      );

      return res.json({
        success: true,
        message:
          "Plan deactivated successfully (has active subscribers). Hard deletion is not recommended.",
      });
    }

    // Hard delete if not in use
    await execute("DELETE FROM subscription_plans WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete plan",
    });
  }
});

// ===== AI PROMPTS MANAGEMENT =====

// Get all AI prompts
router.get("/prompts", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const prompts = await query<any>(
      `SELECT 
        id,
        feature_name,
        display_name,
        description,
        prompt_template,
        system_prompt,
        available_variables,
        is_active,
        created_at,
        updated_at
      FROM ai_prompts
      ORDER BY display_name ASC`
    );

    // Parse available_variables from JSON string to array
    const parsedPrompts = prompts.map((prompt: any) => ({
      ...prompt,
      available_variables: typeof prompt.available_variables === 'string' 
        ? JSON.parse(prompt.available_variables) 
        : prompt.available_variables,
    }));

    res.json({
      success: true,
      prompts: parsedPrompts,
    });
  } catch (error) {
    console.error("Get prompts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prompts",
    });
  }
});

// Get single AI prompt by ID
router.get("/prompts/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    const prompt = await queryOne<any>(
      `SELECT 
        id,
        feature_name,
        display_name,
        description,
        prompt_template,
        system_prompt,
        available_variables,
        is_active,
        created_at,
        updated_at
      FROM ai_prompts
      WHERE id = ?`,
      [id]
    );

    if (!prompt) {
      res.status(404).json({
        success: false,
        message: "Prompt not found",
      });
      return;
    }

    // Parse available_variables from JSON string to array
    const parsedPrompt = {
      ...prompt,
      available_variables: typeof prompt.available_variables === 'string' 
        ? JSON.parse(prompt.available_variables) 
        : prompt.available_variables,
    };

    res.json({
      success: true,
      prompt: parsedPrompt,
    });
  } catch (error) {
    console.error("Get prompt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prompt",
    });
  }
});

// Create new AI prompt
router.post("/prompts", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const {
      feature_name,
      display_name,
      description,
      prompt_template,
      system_prompt,
      available_variables,
      is_active = true,
    } = req.body;

    // Validation
    if (!feature_name || !display_name || !prompt_template || !system_prompt) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: feature_name, display_name, prompt_template, system_prompt",
      });
      return;
    }

    // Check if feature_name already exists
    const existing = await queryOne<any>(
      "SELECT id FROM ai_prompts WHERE feature_name = ?",
      [feature_name]
    );

    if (existing) {
      res.status(409).json({
        success: false,
        message: "A prompt with this feature name already exists",
      });
      return;
    }

    const result = await execute(
      `INSERT INTO ai_prompts 
        (feature_name, display_name, description, prompt_template, system_prompt, available_variables, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        feature_name,
        display_name,
        description || null,
        prompt_template,
        system_prompt,
        JSON.stringify(available_variables || []),
        is_active,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Prompt created successfully",
      promptId: result.insertId,
    });
  } catch (error) {
    console.error("Create prompt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create prompt",
    });
  }
});

// Update AI prompt
router.put("/prompts/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const {
      display_name,
      description,
      prompt_template,
      system_prompt,
      available_variables,
      is_active,
    } = req.body;

    // Check if prompt exists
    const existing = await queryOne<any>(
      "SELECT id FROM ai_prompts WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Prompt not found",
      });
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(display_name);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (prompt_template !== undefined) {
      updates.push("prompt_template = ?");
      values.push(prompt_template);
    }
    if (system_prompt !== undefined) {
      updates.push("system_prompt = ?");
      values.push(system_prompt);
    }
    if (available_variables !== undefined) {
      updates.push("available_variables = ?");
      values.push(JSON.stringify(available_variables));
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: "No fields to update",
      });
      return;
    }

    values.push(id);

    await execute(
      `UPDATE ai_prompts 
      SET ${updates.join(", ")}
      WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Prompt updated successfully",
    });
  } catch (error) {
    console.error("Update prompt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update prompt",
    });
  }
});

// Delete AI prompt
router.delete("/prompts/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    // Check if prompt exists
    const existing = await queryOne<any>(
      "SELECT id, feature_name FROM ai_prompts WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Prompt not found",
      });
      return;
    }

    await execute("DELETE FROM ai_prompts WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Prompt deleted successfully",
    });
  } catch (error) {
    console.error("Delete prompt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete prompt",
    });
  }
});

// Toggle prompt active status
router.patch("/prompts/:id/toggle", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    // Check if prompt exists
    const existing = await queryOne<any>(
      "SELECT id, is_active FROM ai_prompts WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Prompt not found",
      });
      return;
    }

    const newStatus = !existing.is_active;

    await execute(
      "UPDATE ai_prompts SET is_active = ? WHERE id = ?",
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Prompt ${newStatus ? "activated" : "deactivated"} successfully`,
      is_active: newStatus,
    });
  } catch (error) {
    console.error("Toggle prompt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle prompt status",
    });
  }
});

// ========================================
// AI FEATURE TOKEN COSTS MANAGEMENT
// ========================================

// Get all AI feature token costs
router.get("/token-costs", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const costs = await query<any>(
      `SELECT 
        id,
        feature_key,
        feature_name,
        token_cost,
        description,
        is_active,
        created_at,
        updated_at
      FROM ai_feature_token_costs
      ORDER BY 
        CASE feature_key
          WHEN 'generate_article' THEN 1
          WHEN 'generate_toplist' THEN 2
          WHEN 'generate_news' THEN 3
          WHEN 'continue_article' THEN 4
          WHEN 'generate_seo_title' THEN 5
          WHEN 'generate_article_title' THEN 6
          WHEN 'generate_meta_description' THEN 7
          WHEN 'ai_rewrite_text' THEN 8
          WHEN 'find_image' THEN 9
          WHEN 'write_more' THEN 10
          ELSE 99
        END`
    );

    res.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    console.error("Get token costs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch token costs",
    });
  }
});

// Get single token cost
router.get("/token-costs/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    const cost = await queryOne<any>(
      `SELECT 
        id,
        feature_key,
        feature_name,
        token_cost,
        description,
        is_active,
        created_at,
        updated_at
      FROM ai_feature_token_costs
      WHERE id = ?`,
      [id]
    );

    if (!cost) {
      return res.status(404).json({
        success: false,
        message: "Token cost not found",
      });
    }

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    console.error("Get token cost error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch token cost",
    });
  }
});

// Update token cost
router.put("/token-costs/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const { token_cost, feature_name, description, is_active } = req.body;

    // Check if cost exists
    const cost = await queryOne<any>(
      "SELECT id FROM ai_feature_token_costs WHERE id = ?",
      [id]
    );

    if (!cost) {
      return res.status(404).json({
        success: false,
        message: "Token cost not found",
      });
    }

    // Validate token_cost
    if (token_cost !== undefined) {
      const tokenCostNum = parseInt(token_cost);
      if (isNaN(tokenCostNum) || tokenCostNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Token cost must be a non-negative number",
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (feature_name !== undefined) {
      updates.push("feature_name = ?");
      values.push(feature_name);
    }
    if (token_cost !== undefined) {
      updates.push("token_cost = ?");
      values.push(parseInt(token_cost));
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(id);

    await execute(
      `UPDATE ai_feature_token_costs SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Token cost updated successfully",
    });
  } catch (error) {
    console.error("Update token cost error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update token cost",
    });
  }
});

// Toggle token cost active status
router.patch("/token-costs/:id/toggle", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    const existing = await queryOne<any>(
      "SELECT id, is_active FROM ai_feature_token_costs WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Token cost not found",
      });
      return;
    }

    const newStatus = !existing.is_active;

    await execute(
      "UPDATE ai_feature_token_costs SET is_active = ? WHERE id = ?",
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Token cost ${newStatus ? "activated" : "deactivated"} successfully`,
      is_active: newStatus,
    });
  } catch (error) {
    console.error("Toggle token cost error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle token cost status",
    });
  }
});

// Get token cost by feature key (used by AI endpoints)
router.get("/token-costs/feature/:featureKey", async (req: Request, res: Response) => {
  // This endpoint doesn't require admin auth - it's used by AI endpoints
  try {
    const { featureKey } = req.params;

    const cost = await queryOne<any>(
      `SELECT token_cost 
       FROM ai_feature_token_costs 
       WHERE feature_key = ? AND is_active = TRUE`,
      [featureKey]
    );

    if (!cost) {
      // Return default cost if not found
      return res.json({
        success: true,
        data: { token_cost: 1000 }, // Default fallback
      });
    }

    res.json({
      success: true,
      data: cost,
    });
  } catch (error) {
    console.error("Get token cost by feature error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch token cost",
    });
  }
});

export { router as adminRouter };
