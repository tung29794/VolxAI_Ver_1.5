import { Router, RequestHandler, Request, Response } from "express";
import { query, execute, queryOne } from "../db";
import jwt from "jsonwebtoken";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

const router = Router();

// Middleware to verify user token
async function verifyUser(req: Request, res: Response): Promise<boolean> {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.error("[verifyUser] No token provided");
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

    console.log("[verifyUser] Decoded token:", decoded);

    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [
      decoded.userId,
    ]);

    console.log("[verifyUser] User found:", user);

    if (!user) {
      res.status(403).json({
        success: false,
        message: "User not found",
      });
      return false;
    }

    (req as any).userId = decoded.userId;
    return true;
  } catch (error) {
    console.error("[verifyUser] Error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return false;
  }
}

// Helper function to download image from URL
async function downloadImageFromUrl(imageUrl: string): Promise<string> {
  const uploadDir = process.env.UPLOAD_DIR || "/home/jybcaorr/public_html/upload";
  
  // Check if URL is already from volxai.com
  if (imageUrl.includes('volxai.com')) {
    return imageUrl;
  }

  try {
    // Parse URL to get file extension
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname) || '.jpg';
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `rehosted-${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Download image
    await new Promise<void>((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      const request = protocol.get(imageUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Recursively follow redirect
            downloadImageFromUrl(redirectUrl).then(url => {
              resolve();
            }).catch(reject);
          }
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          reject(new Error('URL does not point to an image'));
          return;
        }

        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete file on error
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      // Set timeout
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });

    // Return the new URL
    return `https://volxai.com/upload/${filename}`;
  } catch (error) {
    console.error("Error downloading image:", imageUrl, error);
    // Return original URL if download fails
    return imageUrl;
  }
}

// Helper function to process images in HTML content
async function processImagesInContent(content: string, isAdmin: boolean): Promise<string> {
  if (!isAdmin) {
    return content; // Only process for admin users
  }

  // Find all img tags with src attribute
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  const matches = [...content.matchAll(imgRegex)];
  
  if (matches.length === 0) {
    return content;
  }

  let processedContent = content;
  
  // Process each image
  for (const match of matches) {
    const fullImgTag = match[0];
    const imageUrl = match[1];
    
    // Skip if already hosted on volxai.com or is a data URL
    if (imageUrl.includes('volxai.com') || imageUrl.startsWith('data:')) {
      continue;
    }

    try {
      // Download and rehost the image
      const newUrl = await downloadImageFromUrl(imageUrl);
      
      // Replace the old URL with new URL in the img tag
      const newImgTag = fullImgTag.replace(imageUrl, newUrl);
      processedContent = processedContent.replace(fullImgTag, newImgTag);
      
      console.log(`[processImages] Rehosted: ${imageUrl} -> ${newUrl}`);
    } catch (error) {
      console.error(`[processImages] Failed to rehost: ${imageUrl}`, error);
      // Continue with original URL if rehosting fails
    }
  }
  
  return processedContent;
}

interface SaveArticleRequest {
  id?: number;  // Add id for update
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
    // Verify user authentication
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;

    const {
      id,
      title,
      content,
      metaTitle,
      metaDescription,
      slug,
      keywords,
      featuredImage,
      status,
    } = req.body as SaveArticleRequest;

    // Check if user is admin
    const user = await queryOne<any>("SELECT username FROM users WHERE id = ?", [userId]);
    const isAdmin = user && user.username === 'admin';

    // Process images in content (rehost external images for admin users)
    let processedContent = content;
    if (isAdmin) {
      console.log("[handleSaveArticle] Processing images for admin user...");
      processedContent = await processImagesInContent(content, isAdmin);
      console.log("[handleSaveArticle] Image processing complete");
    }

    // Validation
    if (!title || !processedContent || !slug) {
      res.status(400).json({
        error: "Title, content, and slug are required",
      });
      return;
    }

    // If updating, check if article exists and belongs to user
    if (id) {
      const existingArticle = await query<any>(
        "SELECT id, user_id FROM articles WHERE id = ?",
        [id],
      );

      if (existingArticle.length === 0) {
        res.status(404).json({ error: "Article not found" });
        return;
      }

      if (existingArticle[0].user_id !== userId) {
        res.status(403).json({ error: "You don't have permission to edit this article" });
        return;
      }

      // Check if slug is taken by another article
      const slugCheck = await query<any>(
        "SELECT id FROM articles WHERE slug = ? AND id != ?",
        [slug, id],
      );

      if (slugCheck.length > 0) {
        res.status(400).json({ error: "Slug already exists" });
        return;
      }

      // Update article
      await execute(
        `UPDATE articles SET
          title = ?, 
          content = ?, 
          meta_title = ?, 
          meta_description = ?, 
          slug = ?, 
          keywords = ?, 
          featured_image = ?,
          status = ?,
          published_at = IF(status = 'draft' AND ? = 'published', NOW(), published_at),
          updated_at = NOW()
        WHERE id = ?`,
        [
          title,
          processedContent,
          metaTitle || title,
          metaDescription,
          slug,
          JSON.stringify(keywords),
          featuredImage || null,
          status,
          status,
          id,
        ],
      );

      res.status(200).json({
        success: true,
        message: `Article ${status === "published" ? "updated and published" : "updated as draft"}`,
        articleId: id,
      });
    } else {
      // Check if slug already exists (for new articles)
      const existingArticle = await query<any>(
        "SELECT id FROM articles WHERE slug = ?",
        [slug],
      );

      if (existingArticle.length > 0) {
        res.status(400).json({ error: "Slug already exists" });
        return;
      }

      // Insert new article
      const result = await execute(
        `INSERT INTO articles (
          user_id,
          title, 
          content, 
          meta_title, 
          meta_description, 
          slug, 
          keywords, 
          featured_image,
          status,
          published_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'published', NOW(), NULL), NOW(), NOW())`,
        [
          userId,
          title,
          processedContent,
          metaTitle || title,
          metaDescription,
          slug,
          JSON.stringify(keywords),
          featuredImage || null,
          status,
          status,
        ],
      );

      res.status(201).json({
        success: true,
        message: `Article ${status === "published" ? "published" : "saved as draft"}`,
        articleId: result.insertId,
      });
    }
  } catch (error) {
    console.error("Error saving article:", error);
    res.status(500).json({ error: "Failed to save article" });
  }
};

const handleGetArticles: RequestHandler = async (req, res) => {
  try {
    console.log("[handleGetArticles] Starting...");
    
    // Verify user authentication
    const verified = await verifyUser(req, res);
    console.log("[handleGetArticles] Verification result:", verified);
    
    if (!verified) {
      console.log("[handleGetArticles] Verification failed, returning");
      return;
    }

    const userId = (req as any).userId;
    const { status } = req.query;
    console.log("[handleGetArticles] Status filter:", status);
    console.log("[handleGetArticles] User ID:", userId);

    // Get user info to determine if admin
    const user = await queryOne<any>("SELECT username FROM users WHERE id = ?", [userId]);
    const isAdmin = user && user.username === 'admin';

    let sql = `
      SELECT 
        a.id, 
        a.user_id,
        a.title, 
        a.slug, 
        a.status, 
        a.meta_title,
        a.meta_description,
        a.featured_image,
        a.created_at,
        a.published_at,
        u.username
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE ${isAdmin ? "u.username = 'admin'" : "a.user_id = ?"}
    `;
    const params: any[] = isAdmin ? [] : [userId];

    if (status && status !== 'all') {
      sql += " AND a.status = ?";
      params.push(status);
    }

    sql += " ORDER BY a.created_at DESC";

    console.log("[handleGetArticles] Executing query...");
    const articles = await query<any>(sql, params);
    console.log("[handleGetArticles] Found articles:", articles.length);

    res.json({ 
      success: true,
      data: articles 
    });
  } catch (error) {
    console.error("[handleGetArticles] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch articles",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleGetArticle: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const articles = await query<any>(
      `SELECT a.*, w.url as website_url, u.username
       FROM articles a
       LEFT JOIN websites w ON a.website_id = w.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (articles.length === 0) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const article = articles[0];
    
    // Parse keywords from JSON field (priority) or fallback to primary_keyword
    if (article.keywords && typeof article.keywords === 'string') {
      try {
        article.keywords = JSON.parse(article.keywords);
      } catch (e) {
        // If parsing fails, try primary_keyword as fallback
        article.keywords = article.primary_keyword ? [article.primary_keyword] : [];
      }
    } else if (article.primary_keyword) {
      // Fallback to primary_keyword if keywords field is empty
      article.keywords = [article.primary_keyword];
    } else {
      article.keywords = [];
    }

    res.json({ article });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
};

const handleGetArticleBySlug: RequestHandler = async (req, res) => {
  try {
    const { slug } = req.params;

    const articles = await query<any>(
      `SELECT 
        a.*,
        w.url as website_url,
        u.username,
        u.full_name
      FROM articles a
      LEFT JOIN websites w ON a.website_id = w.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.slug = ? AND a.status = 'published' AND u.username = 'admin'`,
      [slug]
    );

    if (articles.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Article not found" 
      });
      return;
    }

    const article = articles[0];
    
    // Parse keywords from JSON field (priority) or fallback to primary_keyword
    if (article.keywords && typeof article.keywords === 'string') {
      try {
        article.keywords = JSON.parse(article.keywords);
      } catch (e) {
        // If parsing fails, try primary_keyword as fallback
        article.keywords = article.primary_keyword ? [article.primary_keyword] : [];
      }
    } else if (article.primary_keyword) {
      // Fallback to primary_keyword if keywords field is empty
      article.keywords = [article.primary_keyword];
    } else {
      article.keywords = [];
    }

    res.json({ 
      success: true,
      article 
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch article" 
    });
  }
};

const handleDeleteArticle: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await execute("DELETE FROM articles WHERE id = ?", [id]);

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
router.get("/slug/:slug", handleGetArticleBySlug);
router.get("/:id", handleGetArticle);
router.delete("/:id", handleDeleteArticle);

export { router as articlesRouter };
