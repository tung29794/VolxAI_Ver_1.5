import { Router, RequestHandler } from "express";
import { query, execute } from "../db";

const router = Router();

interface SaveArticleRequest {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  featuredImage: string;
  status: "draft" | "published";
}

const handleSaveArticle: RequestHandler = async (req, res) => {
  try {
    const {
      title,
      content,
      metaTitle,
      metaDescription,
      slug,
      keywords,
      featuredImage,
      status,
    } = req.body as SaveArticleRequest;

    // Validation
    if (!title || !content || !slug) {
      res.status(400).json({
        error: "Title, content, and slug are required",
      });
      return;
    }

    // Check if slug already exists
    const existingArticle = await query<any>(
      "SELECT id FROM articles WHERE slug = ?",
      [slug]
    );

    if (existingArticle.length > 0) {
      res.status(400).json({ error: "Slug already exists" });
      return;
    }

    // Insert article
    const result = await execute(
      `INSERT INTO articles (
        title, 
        content, 
        meta_title, 
        meta_description, 
        slug, 
        keywords, 
        featured_image,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        content,
        metaTitle || title,
        metaDescription,
        slug,
        JSON.stringify(keywords),
        featuredImage || null,
        status,
      ]
    );

    res.status(201).json({
      message: `Article ${status === "published" ? "published" : "saved as draft"}`,
      articleId: result.insertId,
    });
  } catch (error) {
    console.error("Error saving article:", error);
    res.status(500).json({ error: "Failed to save article" });
  }
};

const handleGetArticles: RequestHandler = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = "SELECT id, title, slug, status, meta_description, created_at FROM articles";
    const params: any[] = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const articles = await query<any>(sql, params);

    res.json({ articles });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
};

const handleGetArticle: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const articles = await query<any>(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );

    if (articles.length === 0) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const article = articles[0];
    article.keywords = JSON.parse(article.keywords || "[]");

    res.json({ article });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
};

const handleDeleteArticle: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute(
      "DELETE FROM articles WHERE id = ?",
      [id]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    res.json({ message: "Article deleted successfully" });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
};

router.post("/save", handleSaveArticle);
router.get("/", handleGetArticles);
router.get("/:id", handleGetArticle);
router.delete("/:id", handleDeleteArticle);

export { router as articlesRouter };
