import { Router, RequestHandler } from "express";
import { query, execute } from "../db";

const router = Router();

interface APIKey {
  id?: number;
  provider: string;
  category: "content" | "search";
  api_key: string;
  is_active: boolean;
  description?: string;
  quota_remaining?: number;
  created_at?: string;
}

const handleGetAPIKeys: RequestHandler = async (req, res) => {
  try {
    const { category } = req.query;

    let sql = "SELECT * FROM api_keys";
    const params: any[] = [];

    if (category) {
      sql += " WHERE category = ?";
      params.push(category);
    }

    sql += " ORDER BY category, provider, created_at DESC";

    const apiKeys = await query<any>(sql, params);

    // Group by category
    const grouped = apiKeys.reduce(
      (acc: any, key: any) => {
        if (!acc[key.category]) {
          acc[key.category] = [];
        }
        acc[key.category].push(key);
        return acc;
      },
      {}
    );

    res.json({ apiKeys, grouped });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
};

const handleCreateAPIKey: RequestHandler = async (req, res) => {
  try {
    const { provider, category, api_key, description, is_active } =
      req.body as APIKey;

    if (!provider || !category || !api_key) {
      res.status(400).json({
        error: "Provider, category, and API key are required",
      });
      return;
    }

    const result = await execute(
      `INSERT INTO api_keys (provider, category, api_key, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [provider, category, api_key, description || null, is_active !== false]
    );

    res.status(201).json({
      message: "API key created successfully",
      id: (result as any).insertId,
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key" });
  }
};

const handleUpdateAPIKey: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider, category, api_key, description, is_active } =
      req.body as APIKey;

    const result = await execute(
      `UPDATE api_keys 
       SET provider = ?, category = ?, api_key = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [provider, category, api_key, description || null, is_active, id]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    res.json({ message: "API key updated successfully" });
  } catch (error) {
    console.error("Error updating API key:", error);
    res.status(500).json({ error: "Failed to update API key" });
  }
};

const handleDeleteAPIKey: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute("DELETE FROM api_keys WHERE id = ?", [id]);

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
};

router.get("/", handleGetAPIKeys);
router.post("/", handleCreateAPIKey);
router.put("/:id", handleUpdateAPIKey);
router.delete("/:id", handleDeleteAPIKey);

export { router as apiKeysRouter };
