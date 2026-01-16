import { Router, RequestHandler } from "express";
import { query, execute, queryOne } from "../db";
import jwt from "jsonwebtoken";

const router = Router();

// Middleware to verify admin access
async function verifyAdmin(req: any, res: any): Promise<boolean> {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("[Models API] Token received:", token ? `${token.substring(0, 20)}...` : "none");
    
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return false;
    }

    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    console.log("[Models API] Using JWT_SECRET:", jwtSecret ? `${jwtSecret.substring(0, 10)}...` : "default");
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    console.log("[Models API] Token decoded successfully, userId:", decoded.userId);

    const user = await queryOne<any>(
      "SELECT id, role FROM users WHERE id = ?",
      [decoded.userId]
    );
    console.log("[Models API] User found:", user ? `id=${user.id}, role=${user.role}` : "not found");

    if (!user || user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return false;
    }

    req.userId = decoded.userId;
    return true;
  } catch (error) {
    console.error("[Models API] Token verification error:", error instanceof Error ? error.message : error);
    res.status(401).json({ 
      success: false, 
      message: "Invalid token",
      debug: error instanceof Error ? error.message : "Unknown error"
    });
    return false;
  }
}

// GET /api/models - Get all models (public - for dropdown)
const getAllModels: RequestHandler = async (req, res) => {
  try {
    console.log("[Models API] GET /api/models - Fetching active models");
    
    const models = await query<any>(
      `SELECT id, display_name, provider, model_id, description, is_active, 
              display_order, max_tokens, cost_multiplier
       FROM ai_models
       WHERE is_active = TRUE
       ORDER BY display_order ASC, display_name ASC`
    );

    console.log(`[Models API] Found ${models.length} active models:`, models.map(m => m.display_name));

    res.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error("[Models API] Error fetching models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch models",
    });
  }
};

// GET /api/models/admin - Get all models (admin only - includes inactive)
const getAdminModels: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;

    const models = await query<any>(
      `SELECT id, display_name, provider, model_id, description, is_active, 
              display_order, max_tokens, cost_multiplier, created_at, updated_at
       FROM ai_models
       ORDER BY display_order ASC, display_name ASC`
    );

    res.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error("Error fetching admin models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch models",
    });
  }
};

// GET /api/models/:id - Get single model
const getModel: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;

    const { id } = req.params;

    const model = await queryOne<any>(
      `SELECT * FROM ai_models WHERE id = ?`,
      [id]
    );

    if (!model) {
      res.status(404).json({
        success: false,
        error: "Model not found",
      });
      return;
    }

    res.json({
      success: true,
      model,
    });
  } catch (error) {
    console.error("Error fetching model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch model",
    });
  }
};

// POST /api/models - Create new model
const createModel: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;

    const {
      display_name,
      provider,
      model_id,
      description,
      is_active,
      display_order,
      max_tokens,
      cost_multiplier,
    } = req.body;

    // Validation
    if (!display_name || !provider || !model_id) {
      res.status(400).json({
        success: false,
        error: "display_name, provider, and model_id are required",
      });
      return;
    }

    // Check for duplicate display_name
    const existing = await queryOne<any>(
      "SELECT id FROM ai_models WHERE display_name = ?",
      [display_name]
    );

    if (existing) {
      res.status(400).json({
        success: false,
        error: "Model with this display name already exists",
      });
      return;
    }

    const result = await execute(
      `INSERT INTO ai_models 
       (display_name, provider, model_id, description, is_active, display_order, max_tokens, cost_multiplier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        display_name,
        provider,
        model_id,
        description || null,
        is_active !== undefined ? is_active : true,
        display_order || 0,
        max_tokens || 4096,
        cost_multiplier || 1.0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Model created successfully",
      modelId: (result as any).insertId,
    });
  } catch (error) {
    console.error("Error creating model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create model",
    });
  }
};

// PUT /api/models/:id - Update model
const updateModel: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;

    const { id } = req.params;
    const {
      display_name,
      provider,
      model_id,
      description,
      is_active,
      display_order,
      max_tokens,
      cost_multiplier,
    } = req.body;

    // Check if model exists
    const existing = await queryOne<any>(
      "SELECT id FROM ai_models WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Model not found",
      });
      return;
    }

    // Check for duplicate display_name (excluding current model)
    if (display_name) {
      const duplicate = await queryOne<any>(
        "SELECT id FROM ai_models WHERE display_name = ? AND id != ?",
        [display_name, id]
      );

      if (duplicate) {
        res.status(400).json({
          success: false,
          error: "Another model with this display name already exists",
        });
        return;
      }
    }

    await execute(
      `UPDATE ai_models 
       SET display_name = COALESCE(?, display_name),
           provider = COALESCE(?, provider),
           model_id = COALESCE(?, model_id),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active),
           display_order = COALESCE(?, display_order),
           max_tokens = COALESCE(?, max_tokens),
           cost_multiplier = COALESCE(?, cost_multiplier),
           updated_at = NOW()
       WHERE id = ?`,
      [
        display_name,
        provider,
        model_id,
        description,
        is_active,
        display_order,
        max_tokens,
        cost_multiplier,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Model updated successfully",
    });
  } catch (error) {
    console.error("Error updating model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update model",
    });
  }
};

// DELETE /api/models/:id - Delete model
const deleteModel: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyAdmin(req, res))) return;

    const { id } = req.params;

    // Check if model exists
    const existing = await queryOne<any>(
      "SELECT id FROM ai_models WHERE id = ?",
      [id]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Model not found",
      });
      return;
    }

    await execute("DELETE FROM ai_models WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Model deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete model",
    });
  }
};

// Routes
router.get("/", getAllModels); // Public endpoint
router.get("/admin", getAdminModels); // Admin only
router.get("/:id", getModel); // Admin only
router.post("/", createModel); // Admin only
router.put("/:id", updateModel); // Admin only
router.delete("/:id", deleteModel); // Admin only

export { router as modelsRouter };
