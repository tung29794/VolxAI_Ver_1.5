import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query, queryOne, execute } from "../db";

const router = Router();

// Test endpoint
router.get("/test", (req: Request, res: Response) => {
  res.json({ success: true, message: "API is working" });
});

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  created_at: Date;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<User, "password">;
}

// Register endpoint
router.post("/register", async (req: Request, res: Response<LoginResponse>) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);

    // Check if email exists
    const existingEmail = await queryOne(
      "SELECT id FROM users WHERE email = ?",
      [validatedData.email],
    );

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check if username exists
    const existingUsername = await queryOne(
      "SELECT id FROM users WHERE username = ?",
      [validatedData.username],
    );

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(validatedData.password, 10);

    // Insert user
    const result = await execute(
      "INSERT INTO users (email, username, password, full_name, is_active) VALUES (?, ?, ?, ?, TRUE)",
      [
        validatedData.email,
        validatedData.username,
        hashedPassword,
        validatedData.full_name || "",
      ],
    );

    const userId = (result as any).insertId;

    // Initialize tokens_remaining for new user (10,000 free tokens)
    await execute(
      "UPDATE users SET tokens_remaining = ? WHERE id = ?",
      [10000, userId]
    );

    // Create free subscription for new user
    await execute(
      "INSERT INTO user_subscriptions (user_id, plan_type, tokens_limit, articles_limit, is_active) VALUES (?, ?, ?, ?, TRUE)",
      [userId, "free", 10000, 2],
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId, email: validatedData.email, username: validatedData.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await execute(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [userId, token, expiresAt],
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: userId,
        email: validatedData.email,
        username: validatedData.username,
        full_name: validatedData.full_name || "",
        created_at: new Date(),
        role: "user",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return res.status(400).json({
        success: false,
        message: errors.join(", "),
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Login endpoint
router.post("/login", async (req: Request, res: Response<LoginResponse>) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Find user by email
    const user = await queryOne<User & { password: string; role?: string }>(
      "SELECT id, email, username, full_name, password, created_at, role FROM users WHERE email = ? AND is_active = TRUE",
      [validatedData.email],
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(
      validatedData.password,
      user.password,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await execute(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt],
    );

    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return res.status(400).json({
        success: false,
        message: errors.join(", "),
      });
    }

    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Logout endpoint
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Delete session
    await execute("DELETE FROM sessions WHERE token = ?", [token]);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get current user
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    // Get user with role and tokens_remaining
    const user = await queryOne<User & { role?: string; tokens_remaining?: number }>(
      "SELECT id, email, username, full_name, avatar_url, bio, created_at, role, tokens_remaining FROM users WHERE id = ?",
      [decoded.userId],
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user subscription
    let subscription = await queryOne<any>(
      "SELECT id, plan_type, tokens_limit, articles_limit, articles_used_this_month, is_active, expires_at FROM user_subscriptions WHERE user_id = ?",
      [decoded.userId],
    );

    // Auto-downgrade if subscription expired
    if (subscription && subscription.expires_at) {
      const expirationDate = new Date(subscription.expires_at);
      const now = new Date();

      if (now > expirationDate && subscription.plan_type !== "free") {
        // Auto-downgrade to free plan
        await execute(
          "UPDATE user_subscriptions SET plan_type = ?, tokens_limit = ?, articles_limit = ?, expires_at = NULL WHERE id = ?",
          [subscription.id, 10000, 2],
        );

        // Also update users table to reflect downgrade
        await execute(
          "UPDATE users SET tokens_remaining = ?, article_limit = ? WHERE id = ?",
          [10000, 2, decoded.userId],
        );

        // Update the subscription object
        subscription = {
          ...subscription,
          plan_type: "free",
          tokens_limit: 10000,
          articles_limit: 2,
          expires_at: null,
        };
      }
    }

    // Add tokens_remaining to subscription object for frontend
    const subscriptionWithTokens = subscription 
      ? { ...subscription, tokens_remaining: user.tokens_remaining || 0 }
      : { plan_type: "free", tokens_remaining: user.tokens_remaining || 0 };

    return res.status(200).json({
      success: true,
      message: "User found",
      user,
      subscription: subscriptionWithTokens,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Get user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Change password endpoint
router.post("/change-password", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    // Validate input
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get user with password
    const user = await queryOne<any>(
      "SELECT id, password FROM users WHERE id = ?",
      [decoded.userId],
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const passwordMatch = await bcryptjs.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password
    await execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      decoded.userId,
    ]);

    // Log the activity
    await execute(
      "INSERT INTO activity_log (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())",
      [decoded.userId, "password_changed", "user"],
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get upgrade history endpoint
router.get("/upgrade-history", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    // Get upgrade history
    const history = await query<any>(
      "SELECT id, from_plan, to_plan, amount, currency, billing_cycle, status, rejection_reason, created_at FROM subscription_history WHERE user_id = ? ORDER BY created_at DESC",
      [decoded.userId],
    );

    // Map to display format
    const formattedHistory = history.map((item) => ({
      id: item.id,
      date: new Date(item.created_at).toLocaleDateString("vi-VN"),
      fromPlan: mapPlanName(item.from_plan),
      toPlan: mapPlanName(item.to_plan),
      amount: `${item.amount.toLocaleString("vi-VN")} ${item.currency}`,
      status: mapStatus(item.status),
      rejectionReason: item.rejection_reason || null,
    }));

    return res.status(200).json({
      success: true,
      message: "Upgrade history retrieved successfully",
      data: formattedHistory,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Get upgrade history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Helper function to map plan names
function mapPlanName(planType: string): string {
  const planNames: Record<string, string> = {
    free: "Miễn phí",
    starter: "Starter",
    grow: "Grow",
    professional: "Professional",
  };
  return planNames[planType] || planType;
}

// Helper function to map status
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Đang xử lý",
    pending_approval: "Chờ duyệt",
    completed: "Đã hoàn tất",
    cancelled: "Đã hủy",
    failed: "Thất bại",
    rejected: "Từ chối",
  };
  return statusMap[status] || status;
}

// Update profile endpoint
router.post("/update-profile", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    const { fullName } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    // Update full name
    await execute("UPDATE users SET full_name = ? WHERE id = ?", [
      fullName.trim(),
      decoded.userId,
    ]);

    // Log the activity
    await execute(
      "INSERT INTO activity_log (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())",
      [decoded.userId, "profile_updated", "user"],
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Confirm payment endpoint
router.post("/confirm-payment", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    const { newPlan, amount } = req.body;

    if (!newPlan || !amount) {
      return res.status(400).json({
        success: false,
        message: "Plan and amount are required",
      });
    }

    // Get current subscription
    const currentSubscription = await queryOne<any>(
      "SELECT plan_type FROM user_subscriptions WHERE user_id = ?",
      [decoded.userId],
    );

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const oldPlan = currentSubscription.plan_type;

    // Define plan details
    const planDetails: Record<string, { tokens: number; articles: number }> = {
      free: { tokens: 10000, articles: 2 },
      starter: { tokens: 400000, articles: 60 },
      grow: { tokens: 1000000, articles: 150 },
      professional: { tokens: 2000000, articles: 300 },
    };

    const newPlanDetails =
      planDetails[newPlan as keyof typeof planDetails] || planDetails.free;

    // Calculate expiration date (30 days from now for monthly, 365 days for annual)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days

    // Update subscription with new plan and expiration date
    await execute(
      "UPDATE user_subscriptions SET plan_type = ?, tokens_limit = ?, articles_limit = ?, expires_at = ?, updated_at = NOW() WHERE user_id = ?",
      [newPlan, newPlanDetails.tokens, newPlanDetails.articles, expiresAt, decoded.userId],
    );

    // CRITICAL: Update tokens_remaining and article_limit in users table to match new plan
    await execute(
      "UPDATE users SET tokens_remaining = ?, article_limit = ? WHERE id = ?",
      [newPlanDetails.tokens, newPlanDetails.articles, decoded.userId]
    );

    // Record subscription history
    await execute(
      "INSERT INTO subscription_history (user_id, from_plan, to_plan, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [decoded.userId, oldPlan, newPlan, amount, "VND", "completed"],
    );

    // Log the activity
    await execute(
      "INSERT INTO activity_log (user_id, action, entity_type, details, created_at) VALUES (?, ?, ?, ?, NOW())",
      [
        decoded.userId,
        "subscription_upgraded",
        "subscription",
        JSON.stringify({ from: oldPlan, to: newPlan, amount }),
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Payment confirmed and subscription updated",
      data: {
        planType: newPlan,
        tokensLimit: newPlanDetails.tokens,
        articlesLimit: newPlanDetails.articles,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Confirm payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Request upgrade/downgrade endpoint (creates pending payment approval)
router.post("/request-upgrade", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as { userId: number };

    const { newPlan, amount, billingPeriod } = req.body;

    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: "Plan is required",
      });
    }

    // Get current subscription
    const currentSubscription = await queryOne<any>(
      "SELECT id, plan_type FROM user_subscriptions WHERE user_id = ?",
      [decoded.userId],
    );

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const oldPlan = currentSubscription.plan_type;

    // Create subscription history record with pending status
    const historyResult = await execute(
      "INSERT INTO subscription_history (user_id, from_plan, to_plan, amount, currency, billing_cycle, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
      [
        decoded.userId,
        oldPlan,
        newPlan,
        amount || 0,
        "VND",
        billingPeriod || "monthly",
        "pending_approval",
      ],
    );

    const subscriptionHistoryId = (historyResult as any).insertId;

    // Create payment approval record
    await execute(
      "INSERT INTO payment_approvals (user_id, subscription_id, from_plan, to_plan, amount, billing_period, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
      [
        decoded.userId,
        subscriptionHistoryId,
        oldPlan,
        newPlan,
        amount || 0,
        billingPeriod || "monthly",
        "pending",
      ],
    );

    const isDowngrade =
      oldPlan !== "free" &&
      ["free", "starter", "grow", "pro", "corp", "premium"].indexOf(newPlan) <
        ["free", "starter", "grow", "pro", "corp", "premium"].indexOf(oldPlan);

    return res.status(200).json({
      success: true,
      message: `${isDowngrade ? "Downgrade" : "Upgrade"} request submitted successfully. Awaiting admin approval.`,
      data: {
        status: "pending_approval",
        fromPlan: oldPlan,
        toPlan: newPlan,
        amount,
        type: isDowngrade ? "downgrade" : "upgrade",
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Request upgrade error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Default plans for fallback
const DEFAULT_PLANS = [
  {
    id: 1,
    plan_key: "free",
    plan_name: "Free",
    description: "Thử nghiệm VolxAI",
    monthly_price: 0,
    annual_price: null,
    tokens_limit: 10000,
    articles_limit: 2,
    features: null,
    icon_name: "Gift",
    display_order: 1,
    is_active: 1,
  },
  {
    id: 2,
    plan_key: "starter",
    plan_name: "Starter",
    description: "Bắt đầu với VolxAI",
    monthly_price: 150000,
    annual_price: 1500000,
    tokens_limit: 400000,
    articles_limit: 60,
    features: null,
    icon_name: "Sparkles",
    display_order: 2,
    is_active: 1,
  },
  {
    id: 3,
    plan_key: "grow",
    plan_name: "Grow",
    description: "Cho những người viết nhiều",
    monthly_price: 300000,
    annual_price: 3000000,
    tokens_limit: 1000000,
    articles_limit: 150,
    features: null,
    icon_name: "Zap",
    display_order: 3,
    is_active: 1,
  },
  {
    id: 4,
    plan_key: "pro",
    plan_name: "Pro",
    description: "Cho nhà viết chuyên nghiệp",
    monthly_price: 475000,
    annual_price: 4750000,
    tokens_limit: 2000000,
    articles_limit: 300,
    features: null,
    icon_name: "Zap",
    display_order: 4,
    is_active: 1,
  },
  {
    id: 5,
    plan_key: "corp",
    plan_name: "Corp",
    description: "Cho công ty nhỏ",
    monthly_price: 760000,
    annual_price: 7600000,
    tokens_limit: 4000000,
    articles_limit: 600,
    features: null,
    icon_name: "Crown",
    display_order: 5,
    is_active: 1,
  },
  {
    id: 6,
    plan_key: "premium",
    plan_name: "Premium",
    description: "Giải pháp hoàn chỉnh cho doanh nghiệp",
    monthly_price: 1200000,
    annual_price: 12000000,
    tokens_limit: 6500000,
    articles_limit: 1000,
    features: null,
    icon_name: "Crown",
    display_order: 6,
    is_active: 1,
  },
];

// Get all subscription plans (public endpoint - no authentication required)
router.get("/plans", async (req: Request, res: Response) => {
  try {
    console.log("GET /api/auth/plans - fetching subscription plans");

    let plans: any[] = [];
    let fromDatabase = false;

    try {
      const result = await query<any>(
        "SELECT id, plan_key, plan_name, description, monthly_price, annual_price, tokens_limit, articles_limit, features, icon_name, display_order, is_active FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC",
      );

      if (result && result.length > 0) {
        // Parse features JSON string and convert IDs to objects
        plans = await Promise.all(
          result.map(async (plan: any) => {
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
                  } catch (fe: any) {
                    // If features table doesn't exist, just return empty array
                    if (
                      fe?.code === "ER_NO_SUCH_TABLE" ||
                      fe?.message?.includes("doesn't exist")
                    ) {
                      console.warn(
                        `Features table does not exist. Plan ${plan.plan_key} will show without feature details.`,
                      );
                      parsedFeatures = [];
                    } else {
                      throw fe;
                    }
                  }
                }
              } catch (e) {
                console.error(
                  `Failed to parse features for plan ${plan.plan_key}:`,
                  e,
                );
                parsedFeatures = [];
              }
            }
            return {
              ...plan,
              features: parsedFeatures,
            };
          }),
        );
        fromDatabase = true;
        console.log(`Fetched ${plans.length} plans from database`);
      }
    } catch (tableError) {
      console.warn(
        "Could not fetch from database, using default plans",
        tableError,
      );
    }

    // Use defaults if no plans from database
    if (!fromDatabase || plans.length === 0) {
      plans = DEFAULT_PLANS;
      console.log(`Using ${plans.length} default plans`);
    }

    console.log(`Returning ${plans.length} plans to client`);
    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Error in /api/auth/plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as authRouter };
