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

// Get all features
router.get("/", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    let features: any[] = [];
    try {
      features = await query<any>(
        `SELECT
          id,
          name,
          description,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM features
        ORDER BY display_order ASC, name ASC`,
      );
    } catch (tableError: any) {
      // Check if the features table doesn't exist
      if (
        tableError?.code === "ER_NO_SUCH_TABLE" ||
        tableError?.message?.includes("doesn't exist")
      ) {
        console.warn("Features table does not exist. Returning empty list.");
        features = [];
      } else {
        throw tableError;
      }
    }

    res.json({
      success: true,
      data: features || [],
    });
  } catch (error: any) {
    console.error("Get features error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch features",
    });
  }
});

// Get single feature
router.get("/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    let feature: any = null;
    try {
      feature = await queryOne<any>(
        `SELECT
          id,
          name,
          description,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM features
        WHERE id = ?`,
        [id],
      );
    } catch (tableError: any) {
      // If features table doesn't exist, return not found
      if (
        tableError?.code === "ER_NO_SUCH_TABLE" ||
        tableError?.message?.includes("doesn't exist")
      ) {
        console.warn("Features table does not exist.");
        return res.status(404).json({
          success: false,
          message: "Feature not found",
        });
      }
      throw tableError;
    }

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }

    res.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    console.error("Get feature error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feature",
    });
  }
});

// Create new feature
router.post("/", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { name, description, display_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Feature name is required",
      });
    }

    // Check if feature name already exists
    const existing = await queryOne<any>(
      "SELECT id FROM features WHERE name = ?",
      [name],
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Feature with this name already exists",
      });
    }

    await execute(
      `INSERT INTO features (name, description, display_order, is_active)
       VALUES (?, ?, ?, ?)`,
      [name, description || null, display_order || 0, true],
    );

    res.status(201).json({
      success: true,
      message: "Feature created successfully",
    });
  } catch (error) {
    console.error("Create feature error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create feature",
    });
  }
});

// Update feature
router.put("/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const { name, description, display_order, is_active } = req.body;

    // Check if feature exists
    const feature = await queryOne<any>(
      "SELECT id FROM features WHERE id = ?",
      [id],
    );

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }

    // Check if new name conflicts (if changed)
    if (name) {
      const conflicting = await queryOne<any>(
        "SELECT id FROM features WHERE name = ? AND id != ?",
        [name, id],
      );

      if (conflicting) {
        return res.status(400).json({
          success: false,
          message: "Another feature with this name already exists",
        });
      }
    }

    await execute(
      `UPDATE features
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        name || null,
        description || null,
        display_order !== undefined ? display_order : null,
        is_active !== undefined ? is_active : null,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Feature updated successfully",
    });
  } catch (error) {
    console.error("Update feature error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feature",
    });
  }
});

// Delete feature
router.delete("/:id", async (req: Request, res: Response) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const { id } = req.params;

    // Check if feature exists
    const feature = await queryOne<any>(
      "SELECT id FROM features WHERE id = ?",
      [id],
    );

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }

    // Delete the feature
    await execute("DELETE FROM features WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Feature deleted successfully",
    });
  } catch (error) {
    console.error("Delete feature error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete feature",
    });
  }
});

export { router as featuresRouter };
