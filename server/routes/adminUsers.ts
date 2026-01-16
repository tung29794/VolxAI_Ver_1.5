import { Router, Request, Response } from "express";
import { query, queryOne, execute } from "../db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = Router();
const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

// Middleware to check admin role
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Check if user is admin
    const user = await queryOne<any>(
      "SELECT id, email, role FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(401).json({ success: false, error: "Authentication failed" });
  }
};

// GET /api/admin/users - List all users with pagination, search, filters
router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || "";
    const role = req.query.role as string || "";
    const status = req.query.status as string || ""; // active, locked, all
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (search) {
      whereConditions.push("(u.email LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)");
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (role) {
      whereConditions.push("u.role = ?");
      queryParams.push(role);
    }

    if (status === "active") {
      whereConditions.push("u.is_active = TRUE AND u.is_locked = FALSE");
    } else if (status === "locked") {
      whereConditions.push("u.is_locked = TRUE");
    } else if (status === "inactive") {
      whereConditions.push("u.is_active = FALSE");
    }

    const whereClause = whereConditions.length > 0 
      ? "WHERE " + whereConditions.join(" AND ")
      : "";

    // Count total users
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countResult = await queryOne<any>(countQuery, queryParams);
    const total = countResult?.total || 0;

    // Get users with subscription and article count
    const usersQuery = `
      SELECT 
        u.id,
        u.email,
        u.username,
        u.full_name,
        u.role,
        u.tokens_remaining,
        u.article_limit,
        u.is_active,
        u.is_locked,
        u.locked_reason,
        u.is_verified,
        u.admin_notes,
        u.last_login,
        u.created_at,
        u.updated_at,
        us.plan_type,
        us.plan_name,
        us.tokens_limit,
        us.articles_limit,
        us.expires_at,
        us.is_active as subscription_active,
        (SELECT COUNT(*) FROM articles WHERE user_id = u.id) as total_articles,
        (SELECT COUNT(*) FROM articles WHERE user_id = u.id AND status = 'published') as published_articles
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await query<any>(usersQuery, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch users",
      details: error.message 
    });
  }
});

// GET /api/admin/users/:id - Get single user details
router.get("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await queryOne<any>(`
      SELECT 
        u.*,
        us.plan_type,
        us.plan_name,
        us.tokens_limit,
        us.articles_limit,
        us.billing_cycle,
        us.expires_at,
        us.is_active as subscription_active,
        us.auto_renew,
        us.notes as subscription_notes,
        (SELECT COUNT(*) FROM articles WHERE user_id = u.id) as total_articles,
        (SELECT COUNT(*) FROM articles WHERE user_id = u.id AND status = 'published') as published_articles,
        (SELECT COUNT(*) FROM articles WHERE user_id = u.id AND status = 'draft') as draft_articles
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id
      WHERE u.id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get recent articles
    const recentArticles = await query<any>(`
      SELECT id, title, status, created_at, updated_at
      FROM articles
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    // Get usage history
    const usageHistory = await query<any>(`
      SELECT 
        month,
        tokens_used,
        articles_created,
        requests_count
      FROM user_usage
      WHERE user_id = ?
      ORDER BY month DESC
      LIMIT 6
    `, [userId]);

    res.json({
      success: true,
      data: {
        user,
        recentArticles,
        usageHistory
      }
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user",
      details: error.message 
    });
  }
});

// POST /api/admin/users - Create new user
router.post("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      email,
      username,
      password,
      full_name,
      role = "user",
      tokens_remaining = 10000,
      article_limit = 2,
      admin_notes
    } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Email, username, and password are required" 
      });
    }

    // Check if email or username exists
    const existingUser = await queryOne<any>(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: "Email or username already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await execute(`
      INSERT INTO users (
        email, username, password, full_name, role, 
        tokens_remaining, article_limit, admin_notes, 
        is_active, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
    `, [
      email, 
      username, 
      hashedPassword, 
      full_name || null, 
      role,
      tokens_remaining,
      article_limit,
      admin_notes || null
    ]);

    const newUserId = (result as any).insertId;

    // Create default free subscription
    await execute(`
      INSERT INTO user_subscriptions (
        user_id, plan_type, plan_name, tokens_limit, articles_limit, is_active
      ) VALUES (?, 'free', 'Gói Miễn Phí', ?, ?, TRUE)
    `, [newUserId, tokens_remaining, article_limit]);

    res.status(201).json({
      success: true,
      data: { userId: newUserId },
      message: "User created successfully"
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create user",
      details: error.message 
    });
  }
});

// PUT /api/admin/users/:id - Update user
router.put("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      email,
      username,
      password, // Optional: only if admin wants to change it
      full_name,
      role,
      tokens_remaining,
      article_limit,
      is_active,
      is_locked,
      locked_reason,
      admin_notes
    } = req.body;

    // Check if user exists
    const existingUser = await queryOne<any>(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (email !== undefined) {
      updates.push("email = ?");
      params.push(email);
    }
    if (username !== undefined) {
      updates.push("username = ?");
      params.push(username);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hashedPassword);
    }
    if (full_name !== undefined) {
      updates.push("full_name = ?");
      params.push(full_name);
    }
    if (role !== undefined) {
      updates.push("role = ?");
      params.push(role);
    }
    if (tokens_remaining !== undefined) {
      updates.push("tokens_remaining = ?");
      params.push(tokens_remaining);
    }
    if (article_limit !== undefined) {
      updates.push("article_limit = ?");
      params.push(article_limit);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active);
    }
    if (is_locked !== undefined) {
      updates.push("is_locked = ?");
      params.push(is_locked);
    }
    if (locked_reason !== undefined) {
      updates.push("locked_reason = ?");
      params.push(locked_reason);
    }
    if (admin_notes !== undefined) {
      updates.push("admin_notes = ?");
      params.push(admin_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    params.push(userId);

    await execute(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: "User updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update user",
      details: error.message 
    });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Don't allow deleting self
    if (req.user?.id === userId) {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot delete your own account" 
      });
    }

    // Check if user exists
    const existingUser = await queryOne<any>(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Delete user (cascades will delete related records)
    await execute("DELETE FROM users WHERE id = ?", [userId]);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete user",
      details: error.message 
    });
  }
});

// PUT /api/admin/users/:id/subscription - Update user subscription
router.put("/users/:id/subscription", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      plan_type,
      plan_name,
      tokens_limit,
      articles_limit,
      billing_cycle,
      expires_at,
      is_active,
      notes
    } = req.body;

    // Check if subscription exists
    const existingSub = await queryOne<any>(
      "SELECT id FROM user_subscriptions WHERE user_id = ?",
      [userId]
    );

    if (!existingSub) {
      // Create new subscription
      await execute(`
        INSERT INTO user_subscriptions (
          user_id, plan_type, plan_name, tokens_limit, articles_limit,
          billing_cycle, expires_at, is_active, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, plan_type, plan_name, tokens_limit, articles_limit,
        billing_cycle, expires_at, is_active, notes
      ]);
    } else {
      // Update existing subscription
      const updates: string[] = [];
      const params: any[] = [];

      if (plan_type !== undefined) {
        updates.push("plan_type = ?");
        params.push(plan_type);
      }
      if (plan_name !== undefined) {
        updates.push("plan_name = ?");
        params.push(plan_name);
      }
      if (tokens_limit !== undefined) {
        updates.push("tokens_limit = ?");
        params.push(tokens_limit);
      }
      if (articles_limit !== undefined) {
        updates.push("articles_limit = ?");
        params.push(articles_limit);
      }
      if (billing_cycle !== undefined) {
        updates.push("billing_cycle = ?");
        params.push(billing_cycle);
      }
      if (expires_at !== undefined) {
        updates.push("expires_at = ?");
        params.push(expires_at);
      }
      if (is_active !== undefined) {
        updates.push("is_active = ?");
        params.push(is_active);
      }
      if (notes !== undefined) {
        updates.push("notes = ?");
        params.push(notes);
      }

      if (updates.length > 0) {
        params.push(userId);
        await execute(
          `UPDATE user_subscriptions SET ${updates.join(", ")}, updated_at = NOW() WHERE user_id = ?`,
          params
        );
      }
    }

    // Also update user table
    if (tokens_limit !== undefined) {
      await execute(
        "UPDATE users SET tokens_remaining = ? WHERE id = ?",
        [tokens_limit, userId]
      );
    }
    if (articles_limit !== undefined) {
      await execute(
        "UPDATE users SET article_limit = ? WHERE id = ?",
        [articles_limit, userId]
      );
    }

    res.json({
      success: true,
      message: "Subscription updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update subscription",
      details: error.message 
    });
  }
});

// POST /api/admin/users/:id/add-tokens - Add tokens to user
router.post("/users/:id/add-tokens", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid token amount" 
      });
    }

    await execute(
      "UPDATE users SET tokens_remaining = tokens_remaining + ? WHERE id = ?",
      [amount, userId]
    );

    res.json({
      success: true,
      message: `Added ${amount} tokens successfully`
    });
  } catch (error: any) {
    console.error("Error adding tokens:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add tokens",
      details: error.message 
    });
  }
});

// GET /api/admin/stats - Get admin dashboard stats
router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    // Total users
    const totalUsers = await queryOne<any>("SELECT COUNT(*) as count FROM users");
    
    // Active users (logged in last 30 days)
    const activeUsers = await queryOne<any>(
      "SELECT COUNT(*) as count FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    // Total articles
    const totalArticles = await queryOne<any>("SELECT COUNT(*) as count FROM articles");

    // Paid subscriptions
    const paidSubs = await queryOne<any>(
      "SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_type != 'free' AND is_active = TRUE"
    );

    // Recent users (last 7 days)
    const recentUsers = await query<any>(
      "SELECT id, email, username, created_at FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC LIMIT 10"
    );

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        activeUsers: activeUsers?.count || 0,
        totalArticles: totalArticles?.count || 0,
        paidSubscriptions: paidSubs?.count || 0,
        recentUsers
      }
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch stats",
      details: error.message 
    });
  }
});

export default router;
