import { Router, RequestHandler, Request, Response } from "express";
import { query, execute, queryOne } from "../db";
import jwt from "jsonwebtoken";

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

    const user = await queryOne<any>("SELECT id FROM users WHERE id = ?", [
      decoded.userId,
    ]);

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

// Get all websites for current user
const handleGetWebsites: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    console.log(`[Websites API] GET /api/websites - User ID: ${userId}`);

    // Try to select with knowledge column first
    let websites;
    try {
      websites = await query<any>(
        `SELECT 
          id,
          name,
          url,
          api_token,
          knowledge,
          is_active,
          last_sync,
          created_at,
          updated_at
        FROM websites
        WHERE user_id = ?
        ORDER BY created_at DESC`,
        [userId]
      );
    } catch (columnError: any) {
      // If knowledge column doesn't exist yet, fall back to query without it
      if (columnError.code === 'ER_BAD_FIELD_ERROR' || columnError.message?.includes('Unknown column')) {
        console.log("[handleGetWebsites] Knowledge column not found, using fallback query");
        websites = await query<any>(
          `SELECT 
            id,
            name,
            url,
            api_token,
            is_active,
            last_sync,
            created_at,
            updated_at
          FROM websites
          WHERE user_id = ?
          ORDER BY created_at DESC`,
          [userId]
        );
      } else {
        throw columnError;
      }
    }

    console.log(`[Websites API] Found ${websites.length} websites for user ${userId}`);

    res.json({
      success: true,
      data: websites,
    });
  } catch (error) {
    console.error("Error fetching websites:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch websites",
    });
  }
};

// Add new website
const handleAddWebsite: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const { name, url, apiToken } = req.body;

    // Validation
    if (!name || !url || !apiToken) {
      res.status(400).json({
        success: false,
        message: "Name, URL, and API Token are required",
      });
      return;
    }

    // Check if URL already exists for this user
    const existingWebsite = await queryOne<any>(
      "SELECT id FROM websites WHERE user_id = ? AND url = ?",
      [userId, url]
    );

    if (existingWebsite) {
      res.status(400).json({
        success: false,
        message: "Website URL already exists",
      });
      return;
    }

    // Verify token by making a test request to the WordPress API
    try {
      const testUrl = `${url.replace(/\/$/, '')}/wp-json/article-writer/v1/drafts`;
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-Article-Writer-Token': apiToken,
        },
      });

      if (!testResponse.ok) {
        res.status(400).json({
          success: false,
          message: "Invalid API token or plugin not activated on website",
        });
        return;
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Cannot connect to website. Please check URL and API token",
      });
      return;
    }

    // Insert website
    const result = await execute(
      `INSERT INTO websites (user_id, name, url, api_token, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, name, url, apiToken]
    );

    res.status(201).json({
      success: true,
      message: "Website added successfully",
      data: {
        id: result.insertId,
        name,
        url,
        apiToken,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error adding website:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add website",
    });
  }
};

// Update website
const handleUpdateWebsite: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, url, apiToken, isActive } = req.body;

    // Check if website exists and belongs to user
    const website = await queryOne<any>(
      "SELECT id FROM websites WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    // Update website
    await execute(
      `UPDATE websites 
       SET name = ?, url = ?, api_token = ?, is_active = ?
       WHERE id = ? AND user_id = ?`,
      [name, url, apiToken, isActive ? 1 : 0, id, userId]
    );

    res.json({
      success: true,
      message: "Website updated successfully",
    });
  } catch (error) {
    console.error("Error updating website:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update website",
    });
  }
};

// Delete website
const handleDeleteWebsite: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const { id } = req.params;

    // Check if website exists and belongs to user
    const website = await queryOne<any>(
      "SELECT id FROM websites WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    // Delete website
    await execute("DELETE FROM websites WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);

    res.json({
      success: true,
      message: "Website deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting website:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete website",
    });
  }
};

// Test website connection
const handleTestWebsite: RequestHandler = async (req, res) => {
  try {
    console.log("Test website request body:", req.body);
    
    if (!(await verifyUser(req, res))) return;

    const { url, apiToken } = req.body;
    
    console.log("Testing connection to:", url, "with token:", apiToken?.substring(0, 10) + "...");

    if (!url || !apiToken) {
      console.log("Missing url or apiToken");
      res.status(400).json({
        success: false,
        message: "URL and API Token are required",
      });
      return;
    }

    try {
      const testUrl = `${url.replace(/\/$/, '')}/wp-json/article-writer/v1/drafts`;
      console.log("Calling WordPress API:", testUrl);
      
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-Article-Writer-Token': apiToken,
        },
      });

      console.log("WordPress API response status:", testResponse.status);

      if (testResponse.ok) {
        res.json({
          success: true,
          message: "Connection successful",
        });
      } else {
        const errorText = await testResponse.text();
        console.log("WordPress API error:", errorText);
        res.status(400).json({
          success: false,
          message: "Invalid API token or plugin not activated",
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(400).json({
        success: false,
        message: "Cannot connect to website",
      });
    }
  } catch (error) {
    console.error("Error testing website:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test connection",
    });
  }
};

// Sync posts from WordPress to VolxAI
const handleSyncPosts: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId; // Changed from user.userId to userId
    const { id } = req.params; // website id
    const { post_type = 'post' } = req.body; // Get post type from request body, default to 'post'

    console.log("Sync posts request for website:", id, "by user:", userId, "post_type:", post_type);

    // Get website info
    const website = await queryOne<any>(
      "SELECT * FROM websites WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    console.log("Fetching posts from:", website.url, "post_type:", post_type);

    // Fetch posts from WordPress API with post_type parameter
  const postsUrl = `${website.url.replace(/\/$/, '')}/wp-json/article-writer/v1/posts?per_page=10000&post_type=${encodeURIComponent(post_type)}`;
    const postsResponse = await fetch(postsUrl, {
      method: 'GET',
      headers: {
        'X-Article-Writer-Token': website.api_token,
      },
    });

    if (!postsResponse.ok) {
      // Read response body for debugging (don't expose secrets)
      let errorText = '';
      try {
        errorText = await postsResponse.text();
      } catch (e) {
        errorText = '<failed to read response body>';
      }

      console.error('Failed to fetch posts from WordPress. Status:', postsResponse.status, 'Body:', errorText);

      // Try to surface a useful message back to the frontend without leaking sensitive data
      let message = 'Failed to fetch posts from WordPress';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed && parsed.message) message = `Failed to fetch posts: ${parsed.message}`;
      } catch (e) {
        // ignore JSON parse errors
      }

      res.status(400).json({
        success: false,
        message,
      });
      return;
    }

    const postsData = await postsResponse.json();
    const posts = postsData.posts || [];

    console.log(`Fetched ${posts.length} posts from WordPress`);

    let syncedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    // Sync each post
    for (const wpPost of posts) {
      try {
        // Check if post already exists (by wordpress_post_id and website_id)
        const existingArticle = await queryOne<any>(
          "SELECT id FROM articles WHERE wordpress_post_id = ? AND website_id = ?",
          [wpPost.id, website.id]
        );

        // Map WordPress status to VolxAI status
        let status = 'draft';
        if (wpPost.status === 'publish') status = 'published';
        else if (wpPost.status === 'draft') status = 'draft';

        // Prepare keywords array from primary_keyword
        let keywordsArray: string[] = [];
        if (wpPost.primary_keyword) {
          // Split by comma if it's a comma-separated string
          keywordsArray = wpPost.primary_keyword
            .split(',')
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0);
        }
        const keywordsJson = JSON.stringify(keywordsArray);

        // Prepare article data
        const articleData = {
          title: wpPost.title,
          content: wpPost.content,
          meta_title: wpPost.seo_title || wpPost.title,
          meta_description: wpPost.meta_description || '',
          keywords: keywordsJson, // Store as JSON array
          primary_keyword: wpPost.primary_keyword || '', // Keep for backward compatibility
          slug: wpPost.slug,
          status: status,
          post_type: post_type, // Include post_type from request
          featured_image: wpPost.featured_image || '',
          wordpress_post_id: wpPost.id,
          website_id: website.id,
          user_id: userId,
          updated_at: new Date(),
        };

        if (existingArticle) {
          // Update existing article
          await execute(
            `UPDATE articles SET 
              title = ?, content = ?, meta_title = ?, meta_description = ?, 
              keywords = ?, primary_keyword = ?, slug = ?, status = ?, post_type = ?, featured_image = ?, 
              updated_at = NOW()
            WHERE id = ?`,
            [
              articleData.title,
              articleData.content,
              articleData.meta_title,
              articleData.meta_description,
              articleData.keywords,
              articleData.primary_keyword,
              articleData.slug,
              articleData.status,
              articleData.post_type,
              articleData.featured_image,
              existingArticle.id,
            ]
          );
          updatedCount++;
          console.log(`Updated article: ${wpPost.title}`);
        } else {
          // Create new article
          await execute(
            `INSERT INTO articles 
              (title, content, meta_title, meta_description, keywords, primary_keyword, 
               slug, status, post_type, featured_image, wordpress_post_id, website_id, 
               user_id, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              articleData.title,
              articleData.content,
              articleData.meta_title,
              articleData.meta_description,
              articleData.keywords,
              articleData.primary_keyword,
              articleData.slug,
              articleData.status,
              articleData.post_type,
              articleData.featured_image,
              articleData.wordpress_post_id,
              articleData.website_id,
              articleData.user_id,
            ]
          );
          createdCount++;
          console.log(`Created article: ${wpPost.title}`);
        }

        syncedCount++;
      } catch (error) {
        console.error(`Error syncing post ${wpPost.id}:`, error);
        // Continue with next post
      }
    }

    // Update last_sync timestamp
    await execute(
      "UPDATE websites SET last_sync = NOW() WHERE id = ?",
      [website.id]
    );

    console.log(`Sync completed: ${syncedCount} total, ${createdCount} created, ${updatedCount} updated`);

    res.json({
      success: true,
      message: "Posts synced successfully",
      data: {
        total: posts.length,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount,
      },
    });
  } catch (error) {
    console.error("Error syncing posts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync posts",
    });
  }
};

/**
 * Get available post types from WordPress website
 * GET /api/websites/:id/post-types
 */
const handleGetPostTypes: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const websiteId = parseInt(req.params.id);
    const userId = (req as any).userId;

    console.log("\n🔍 Fetching post types for website:", websiteId);
    console.log("👤 User ID:", userId);

    // Get website details and verify ownership
    const websiteQuery = `
      SELECT url, api_token, name 
      FROM websites 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `;
    
    console.log("📊 Query params:", { websiteId, userId });
    const websites = await query<any>(websiteQuery, [websiteId, userId]);
    console.log("📋 Query result:", websites);

    if (!websites || websites.length === 0) {
      console.log("❌ No website found or inactive");
      return res.status(404).json({
        success: false,
        message: "Website not found or inactive",
      });
    }

    const website = websites[0];
    const postTypesUrl = `${website.url}/wp-json/article-writer/v1/post-types`;

    console.log(`📡 Fetching from: ${postTypesUrl}`);

    // Fetch post types from WordPress
    const response = await fetch(postTypesUrl, {
      method: "GET",
      headers: {
        "X-Article-Writer-Token": website.api_token,
      },
    });

    const data = await response.json();
    
    console.log("📦 Raw response from WordPress:", JSON.stringify(data, null, 2));

    // Default post types as fallback with count
    const defaultPostTypes = [
      { 
        name: 'post', 
        label: 'Posts',
        singular: 'Post',
        count: 0,
        hierarchical: false,
        has_archive: true
      },
      { 
        name: 'page', 
        label: 'Pages',
        singular: 'Page',
        count: 0,
        hierarchical: true,
        has_archive: false
      }
    ];

    if (data.success && data.post_types) {
      // Ensure post_types is an array and properly formatted
      let postTypes = data.post_types;
      
      // Validate and normalize the data
      if (Array.isArray(postTypes) && postTypes.length > 0) {
        postTypes = postTypes
          .filter(type => {
            // Accept if it has slug, name, or is a string
            return type && (type.slug || type.name || typeof type === 'string');
          })
          .map(type => {
            // Handle different formats from WordPress plugins
            
            // Format 1: {name: "post", label: "Posts", count: 10, ...} - Our plugin format with full data
            if (typeof type === 'object' && type.name) {
              return { 
                name: type.name, 
                label: type.label || type.name,
                singular: type.singular || type.label || type.name,
                description: type.description || '',
                count: type.count || 0,
                hierarchical: type.hierarchical || false,
                has_archive: type.has_archive || false
              };
            }
            
            // Format 2: {slug: "post", label: "Posts", count: 10, ...} - Standard format
            if (typeof type === 'object' && type.slug) {
              return { 
                name: type.slug, 
                label: type.label || type.slug,
                singular: type.singular || type.label || type.slug,
                description: type.description || '',
                count: type.count || 0,
                hierarchical: type.hierarchical || false,
                has_archive: type.has_archive || false
              };
            }
            
            // Format 3: String only
            if (typeof type === 'string') {
              return { 
                name: type, 
                label: type,
                singular: type,
                count: 0,
                hierarchical: false,
                has_archive: false
              };
            }
            
            return null;
          })
          .filter(Boolean);
          
        if (postTypes.length > 0) {
          console.log(`✅ Normalized ${postTypes.length} post types from WordPress`);
          console.log("📋 Post types:", JSON.stringify(postTypes, null, 2));
          
          res.json({
            success: true,
            data: postTypes,
          });
          return;
        }
      }
    }
    
    // If no post types from WordPress or empty array, use defaults
    console.log("⚠️ No post types from WordPress, using defaults");
    res.json({
      success: true,
      data: defaultPostTypes,
    });
  } catch (error: any) {
    console.error("Error fetching post types:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch post types from WordPress",
    });
  }
};

/**
 * Helper function to upload image to WordPress and return the new URL
 * Uses image_url method (WordPress downloads the image)
 */
async function uploadImageToWordPress(
  imageUrl: string,
  websiteUrl: string,
  apiToken: string,
  postTitle: string = ''
): Promise<string | null> {
  try {
    console.log(`   📤 Uploading image: ${imageUrl.substring(0, 80)}...`);
    
    // Upload to WordPress Media Library using image_url method
    // WordPress plugin will download the image from the URL
    const uploadResponse = await fetch(
      `${websiteUrl}/wp-json/article-writer/v1/upload-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Article-Writer-Token': apiToken,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          post_title: postTitle || 'article',
        }),
      }
    );

    if (!uploadResponse.ok) {
      console.log(`   ⚠️ WordPress upload failed: ${uploadResponse.status}`);
      return null;
    }

    const uploadData = await uploadResponse.json();
    if (uploadData.success && uploadData.url) {
      // Clean up duplicate folder paths (e.g., /2025/12/2025/12/ → /2025/12/)
      const cleanedUrl = cleanWordPressUrl(uploadData.url);
      console.log(`   ✅ Image uploaded: ${cleanedUrl}`);
      return cleanedUrl;
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error uploading image:`, error);
    return null;
  }
}

/**
 * Clean up duplicate folder paths in WordPress URLs
 * E.g.: /wp-content/uploads/2025/12/2025/12/image.jpg → /wp-content/uploads/2025/12/image.jpg
 */
function cleanWordPressUrl(url: string): string {
  try {
    // Pattern to match duplicate year/month folders: /YYYY/MM/YYYY/MM/
    const pattern = /\/(\d{4}\/\d{2})\/(\d{4}\/\d{2}\/)+/g;
    
    // Replace with just one occurrence
    const cleaned = url.replace(pattern, '/$1/');
    
    if (cleaned !== url) {
      console.log(`   🧹 Cleaned URL: ${cleaned}`);
    }
    
    return cleaned;
  } catch (error) {
    console.error(`   ⚠️ Error cleaning URL:`, error);
    return url;
  }
}

/**
 * Extract all image URLs from HTML content
 */
function extractImageUrls(content: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match;
  
  while ((match = imgRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

/**
 * Upload all images in content to WordPress and replace URLs
 */
async function uploadAndReplaceImages(
  content: string,
  websiteUrl: string,
  apiToken: string,
  postTitle: string = ''
): Promise<string> {
  const imageUrls = extractImageUrls(content);
  
  if (imageUrls.length === 0) {
    console.log('   ℹ️  No images found in content');
    return content;
  }

  console.log(`\n📸 Found ${imageUrls.length} images to upload`);
  
  let updatedContent = content;
  let successCount = 0;
  
  for (const oldUrl of imageUrls) {
    // Skip if already uploaded to this WordPress site
    if (oldUrl.includes(websiteUrl)) {
      console.log(`   ⏭️  Skipping (already on WordPress): ${oldUrl.substring(0, 60)}...`);
      continue;
    }
    
    // Skip data URIs
    if (oldUrl.startsWith('data:')) {
      console.log(`   ⏭️  Skipping (data URI): ${oldUrl.substring(0, 60)}...`);
      continue;
    }
    
    const newUrl = await uploadImageToWordPress(oldUrl, websiteUrl, apiToken, postTitle);
    
    if (newUrl) {
      // Replace all occurrences of this URL in content
      updatedContent = updatedContent.split(oldUrl).join(newUrl);
      successCount++;
    }
  }
  
  console.log(`✅ Successfully uploaded ${successCount}/${imageUrls.length} images\n`);
  
  return updatedContent;
}

// Publish article to WordPress
const handlePublishArticle: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const { id: websiteId } = req.params;
    const { articleId, postType = 'post', taxonomies = {}, articleData } = req.body;

    console.log("\n🚀 PUBLISH ARTICLE REQUEST:");
    console.log("Website ID:", websiteId);
    console.log("Article ID:", articleId);
    console.log("Post Type:", postType);
    console.log("Taxonomies:", taxonomies);
    console.log("Has articleData:", !!articleData);

    // Validate input
    if (!articleId) {
      res.status(400).json({
        success: false,
        message: "Article ID is required",
      });
      return;
    }

    // Get website
    const website = await queryOne<any>(
      "SELECT * FROM websites WHERE id = ? AND user_id = ?",
      [websiteId, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    // Get article
    const articleFromDB = await queryOne<any>(
      "SELECT * FROM articles WHERE id = ? AND user_id = ?",
      [articleId, userId]
    );

    if (!articleFromDB) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    // IMPORTANT: Use articleData from request if provided (fresh from editor)
    // Otherwise fall back to database version
    const article = articleData ? {
      ...articleFromDB,
      title: articleData.title || articleFromDB.title,
      content: articleData.content || articleFromDB.content,
      meta_title: articleData.metaTitle || articleFromDB.meta_title,
      meta_description: articleData.metaDescription || articleFromDB.meta_description,
      slug: articleData.slug || articleFromDB.slug,
      keywords: articleData.keywords || articleFromDB.keywords,
      featured_image: articleData.featuredImage || articleFromDB.featured_image,
    } : articleFromDB;

    console.log("✓ Website found:", website.url);
    console.log("✓ Article found:", article.title);
    console.log("✓ Using data from:", articleData ? "REQUEST (fresh)" : "DATABASE (cached)");

    // Check if article already published to THIS specific website WITH SAME POST TYPE
    // If post type changed, we need to create a NEW post (can't change post type of existing post)
    
    let existingWordPressPostId = null;
    let existingPostType = null;
    
    // Try to find existing post for this website
    try {
      const existingMapping = await queryOne<any>(
        `SELECT wordpress_post_id, post_type 
         FROM article_website_mapping 
         WHERE article_id = ? AND website_id = ?`,
        [articleId, websiteId]
      );
      
      if (existingMapping && existingMapping.wordpress_post_id) {
        existingPostType = existingMapping.post_type;
        
        // Only use existing post ID if post type matches
        if (existingPostType === postType) {
          existingWordPressPostId = existingMapping.wordpress_post_id;
          console.log(`✓ Found existing post ID ${existingWordPressPostId} with same post type: ${postType}`);
        } else {
          console.log(`⚠️ Post type changed: "${existingPostType}" → "${postType}". Will create NEW post.`);
        }
      }
    } catch (error) {
      // Table might not exist yet, fallback to old method
      console.log("Note: article_website_mapping table not found, using legacy method");
      if (article.wordpress_post_id && article.website_id === parseInt(websiteId)) {
        // In legacy method, also check post type
        if (article.post_type === postType) {
          existingWordPressPostId = article.wordpress_post_id;
        } else {
          console.log(`⚠️ Post type changed: "${article.post_type}" → "${postType}". Will create NEW post.`);
        }
      }
    }

    console.log("Existing WordPress Post ID for this website:", existingWordPressPostId || "None (will create new)");

    // Check if slug already exists on WordPress (even if not tracked in our database)
    // This prevents duplicate posts with slug-2, slug-3, etc.
    if (article.slug && !existingWordPressPostId) {
      try {
        console.log(`🔍 Checking if slug "${article.slug}" already exists on WordPress...`);
        
        // Query WordPress API to find post by slug
        const checkSlugUrl = `${website.url}/wp-json/article-writer/v1/check-slug?slug=${encodeURIComponent(article.slug)}&post_type=${encodeURIComponent(postType)}`;
        const checkResponse = await fetch(checkSlugUrl, {
          method: 'GET',
          headers: {
            'X-Article-Writer-Token': website.api_token,
          },
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (checkData.exists && checkData.post_id) {
            console.log(`⚠️ Found existing post with slug "${article.slug}" (ID: ${checkData.post_id})`);
            console.log(`🗑️ Deleting old post to prevent duplicate...`);
            
            // Delete the old post
            const deleteUrl = `${website.url}/wp-json/article-writer/v1/delete/${checkData.post_id}`;
            const deleteResponse = await fetch(deleteUrl, {
              method: 'POST',
              headers: {
                'X-Article-Writer-Token': website.api_token,
              },
            });

            if (deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              if (deleteData.success) {
                console.log(`✅ Successfully deleted old post (ID: ${checkData.post_id})`);
              } else {
                console.warn(`⚠️ Failed to delete old post: ${deleteData.message}`);
              }
            } else {
              console.warn(`⚠️ Delete request failed with status: ${deleteResponse.status}`);
            }
          } else {
            console.log(`✅ Slug "${article.slug}" is available`);
          }
        }
      } catch (error) {
        console.warn("⚠️ Error checking/deleting existing slug:", error);
        // Continue anyway - WordPress will handle duplicate slugs
      }
    }

    // Parse keywords from JSON if needed
    let keywords: string[] = [];
    if (article.keywords) {
      if (typeof article.keywords === 'string') {
        try {
          keywords = JSON.parse(article.keywords);
        } catch (e) {
          console.warn("Failed to parse keywords JSON:", e);
          keywords = [];
        }
      } else if (Array.isArray(article.keywords)) {
        keywords = article.keywords;
      }
    }

    console.log("Parsed keywords:", keywords);

    // Upload all images in content to WordPress and replace URLs
    console.log("\n📸 Processing images in article content...");
    const updatedContent = await uploadAndReplaceImages(
      article.content,
      website.url.replace(/\/$/, ''),
      website.api_token,
      article.title
    );

    // Prepare post data for WordPress
    const postData: any = {
      title: article.title,
      content: updatedContent, // Use updated content with WordPress image URLs
      status: article.status === 'published' ? 'publish' : 'draft',
      post_type: postType, // Add post type to request
      seo_title: article.meta_title || article.title,
      meta_description: article.meta_description || '',
      primary_keyword: keywords.length > 0 ? keywords[0] : '',
      permalink: article.slug || '',
    };

    console.log("✓ Post Data:", { post_type: postType, status: postData.status });

    // Add taxonomies if provided
    if (taxonomies && Object.keys(taxonomies).length > 0) {
      postData.taxonomies = taxonomies;
      console.log("✓ Adding taxonomies:", taxonomies);
    }

    // Add featured image if exists
    if (article.featured_image) {
      // If it's a WordPress media ID, use it directly
      if (Number.isInteger(article.featured_image)) {
        postData.featured_media = article.featured_image;
      } else {
        // Otherwise, upload the image URL to WordPress first
        try {
          const uploadResponse = await fetch(
            `${website.url}/wp-json/article-writer/v1/upload-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Article-Writer-Token": website.api_token,
              },
              body: JSON.stringify({
                image_url: article.featured_image,
                post_title: article.title,
              }),
            }
          );

          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.attachment_id) {
            postData.featured_media = uploadData.attachment_id;
            console.log("✓ Featured image uploaded:", uploadData.attachment_id);
          }
        } catch (uploadError) {
          console.warn("Failed to upload featured image:", uploadError);
        }
      }
    }

    let wpPostId;
    let action;
    let wpData;

    // Update existing post or create new
    if (existingWordPressPostId) {
      console.log("🔄 Updating existing WordPress post ID:", existingWordPressPostId);
      action = "updated";

      const wpResponse = await fetch(
        `${website.url}/wp-json/article-writer/v1/update/${existingWordPressPostId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Article-Writer-Token": website.api_token,
          },
          body: JSON.stringify(postData),
        }
      );

      // Check response and read JSON once
      if (!wpResponse.ok) {
        const errorData = await wpResponse.json();
        throw new Error(errorData.message || "WordPress API error");
      }

      wpData = await wpResponse.json();
      if (!wpData.success) {
        throw new Error(wpData.message || "Failed to update WordPress post");
      }
      
      wpPostId = existingWordPressPostId;
    } else {
      console.log("➕ Creating new WordPress post");
      action = "created";

      const wpResponse = await fetch(
        `${website.url}/wp-json/article-writer/v1/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Article-Writer-Token": website.api_token,
          },
          body: JSON.stringify(postData),
        }
      );

      // Check response and read JSON once
      if (!wpResponse.ok) {
        const errorData = await wpResponse.json();
        throw new Error(errorData.message || "WordPress API error");
      }

      wpData = await wpResponse.json();
      if (!wpData.success) {
        throw new Error(wpData.message || "Failed to publish to WordPress");
      }
      
      wpPostId = wpData.post_id;
    }

    console.log("✓ WordPress response:", wpData);

    // Save mapping to article_website_mapping table (supports multiple websites per article)
    try {
      // First, try to use the mapping table
      await execute(
        `INSERT INTO article_website_mapping 
         (article_id, website_id, wordpress_post_id, post_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           wordpress_post_id = ?,
           post_type = ?,
           updated_at = NOW()`,
        [articleId, websiteId, wpPostId, postType, wpPostId, postType]
      );
      console.log("✓ Mapping saved to article_website_mapping table");
    } catch (error) {
      console.log("Note: article_website_mapping table not found, using legacy method");
      // Fallback to old method: update articles table
      await execute(
        `UPDATE articles 
         SET wordpress_post_id = ?, website_id = ?, post_type = ?
         WHERE id = ?`,
        [wpPostId, websiteId, postType, articleId]
      );
    }

    console.log("✓ Article published successfully");

    res.json({
      success: true,
      message: `Article ${action} successfully on WordPress`,
      data: {
        articleId,
        wordpressPostId: wpPostId,
        wordpressUrl: wpData.post_url || `${website.url}/?p=${wpPostId}`,
        action,
      },
    });
  } catch (error: any) {
    console.error("❌ Error publishing article:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to publish article to WordPress",
    });
  }
};

/**
 * Schedule article to be published to WordPress at a future time
 * POST /api/websites/:id/schedule-publish
 */
const handleSchedulePublish: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const { id: websiteId } = req.params;
    const { articleId, postType = 'post', taxonomies = {}, scheduledTime } = req.body;

    console.log("\n⏰ SCHEDULE PUBLISH REQUEST:");
    console.log("Website ID:", websiteId);
    console.log("Article ID:", articleId);
    console.log("Post Type:", postType);
    console.log("Scheduled Time:", scheduledTime);

    // Validate input
    if (!articleId || !scheduledTime) {
      res.status(400).json({
        success: false,
        message: "Article ID and scheduled time are required",
      });
      return;
    }

    // Validate schedule time is in the future
    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate <= new Date()) {
      res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
      return;
    }

    // Get website
    const website = await queryOne<any>(
      "SELECT * FROM websites WHERE id = ? AND user_id = ?",
      [websiteId, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    // Get article
    const article = await queryOne<any>(
      "SELECT * FROM articles WHERE id = ? AND user_id = ?",
      [articleId, userId]
    );

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    console.log("✓ Website found:", website.url);
    console.log("✓ Article found:", article.title);

    // Parse keywords
    let keywords: string[] = [];
    if (article.keywords) {
      if (typeof article.keywords === 'string') {
        try {
          keywords = JSON.parse(article.keywords);
        } catch (e) {
          keywords = [];
        }
      } else if (Array.isArray(article.keywords)) {
        keywords = article.keywords;
      }
    }

    // Prepare post data for WordPress scheduled post
    const postData: any = {
      title: article.title,
      content: article.content,
      status: 'future', // WordPress status for scheduled posts
      post_type: postType,
      date: scheduledTime, // WordPress accepts ISO 8601 format
      seo_title: article.meta_title || article.title,
      meta_description: article.meta_description || '',
      primary_keyword: keywords.length > 0 ? keywords[0] : '',
      permalink: article.slug || '',
    };

    console.log("✓ Scheduled Post Data:", { post_type: postType, status: 'future', date: scheduledTime });

    // Add taxonomies if provided
    if (taxonomies && Object.keys(taxonomies).length > 0) {
      postData.taxonomies = taxonomies;
      console.log("✓ Adding taxonomies:", taxonomies);
    }

    // Add featured image if exists
    if (article.featured_image) {
      if (Number.isInteger(article.featured_image)) {
        postData.featured_media = article.featured_image;
      } else {
        try {
          const uploadResponse = await fetch(
            `${website.url}/wp-json/article-writer/v1/upload-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Article-Writer-Token": website.api_token,
              },
              body: JSON.stringify({
                image_url: article.featured_image,
                post_title: article.title,
              }),
            }
          );

          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.attachment_id) {
            postData.featured_media = uploadData.attachment_id;
            console.log("✓ Featured image uploaded:", uploadData.attachment_id);
          }
        } catch (uploadError) {
          console.warn("Failed to upload featured image:", uploadError);
        }
      }
    }

    console.log(`\n📤 Sending scheduled post request to: ${website.url}/wp-json/article-writer/v1/publish`);

    // Create scheduled post in WordPress
    const response = await fetch(
      `${website.url}/wp-json/article-writer/v1/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Article-Writer-Token": website.api_token,
        },
        body: JSON.stringify(postData),
      }
    );

    const wpData = await response.json();

    console.log("\n📥 WordPress Response:");
    console.log("Success:", wpData.success);
    console.log("Post ID:", wpData.post_id);
    console.log("Action:", wpData.action);

    if (!wpData.success) {
      console.error("❌ WordPress Error:", wpData.message);
      throw new Error(wpData.message || "WordPress API returned error");
    }

    const wpPostId = wpData.post_id;

    // Save mapping to database
    try {
      const mappingQuery = `
        INSERT INTO article_website_mapping 
        (article_id, website_id, wordpress_post_id, post_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          wordpress_post_id = VALUES(wordpress_post_id),
          post_type = VALUES(post_type),
          updated_at = NOW()
      `;
      
      await query(mappingQuery, [articleId, websiteId, wpPostId, postType]);
      console.log("✓ Mapping saved to article_website_mapping table");
    } catch (mappingError) {
      console.log("Note: Could not save to article_website_mapping (table might not exist)");
      
      // Fallback: update article table
      await query(
        `UPDATE articles 
         SET wordpress_post_id = ?, 
             website_id = ?,
             post_type = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [wpPostId, websiteId, postType, articleId]
      );
      console.log("✓ Article updated with WordPress post ID (legacy method)");
    }

    res.json({
      success: true,
      message: "Article scheduled for publishing successfully!",
      data: {
        wordpressPostId: wpPostId,
        wordpressUrl: wpData.post_url || `${website.url}/?p=${wpPostId}`,
        scheduledTime: scheduledTime,
        action: wpData.action,
      },
    });
  } catch (error: any) {
    console.error("❌ Error scheduling article:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to schedule article publishing",
    });
  }
};

/**
 * Get taxonomies for a specific post type from WordPress website
 * GET /api/websites/:id/taxonomies?post_type=post
 */
const handleGetTaxonomies: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const websiteId = parseInt(req.params.id);
    const userId = (req as any).userId;
    const postType = (req.query.post_type as string) || 'post';

    console.log("\n🔍 Fetching taxonomies for website:", websiteId);
    console.log("👤 User ID:", userId);
    console.log("📝 Post Type:", postType);

    // Get website details and verify ownership
    const websiteQuery = `
      SELECT url, api_token, name 
      FROM websites 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `;
    
    const websites = await query<any>(websiteQuery, [websiteId, userId]);

    if (!websites || websites.length === 0) {
      console.log("❌ No website found or inactive");
      return res.status(404).json({
        success: false,
        message: "Website not found or inactive",
      });
    }

    const website = websites[0];
    const taxonomiesUrl = `${website.url}/wp-json/article-writer/v1/taxonomies?post_type=${postType}`;

    console.log(`📡 Fetching from: ${taxonomiesUrl}`);

    // Fetch taxonomies from WordPress
    const response = await fetch(taxonomiesUrl, {
      method: "GET",
      headers: {
        "X-Article-Writer-Token": website.api_token,
      },
    });

    const data = await response.json();
    
    console.log("📦 Raw taxonomies response from WordPress:", JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`✅ Found ${data.count || 0} taxonomies`);
      console.log("📋 Taxonomies data:", JSON.stringify(data.taxonomies, null, 2));
      res.json({
        success: true,
        data: data.taxonomies || [],
        post_type: data.post_type,
      });
    } else {
      console.log("❌ WordPress returned success: false");
      console.log("Message:", data.message);
      res.status(400).json({
        success: false,
        message: data.message || "Failed to fetch taxonomies",
      });
    }
  } catch (error: any) {
    console.error("Error fetching taxonomies:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch taxonomies from WordPress",
    });
  }
};

// Update website knowledge
const handleUpdateWebsiteKnowledge: RequestHandler = async (req, res) => {
  try {
    if (!(await verifyUser(req, res))) return;

    const userId = (req as any).userId;
    const websiteId = parseInt(req.params.id);
    const { knowledge } = req.body;

    // Verify website belongs to user
    const website = await queryOne<any>(
      "SELECT id FROM websites WHERE id = ? AND user_id = ?",
      [websiteId, userId]
    );

    if (!website) {
      res.status(404).json({
        success: false,
        message: "Website not found",
      });
      return;
    }

    // Update knowledge
    await execute(
      "UPDATE websites SET knowledge = ?, updated_at = NOW() WHERE id = ?",
      [knowledge || null, websiteId]
    );

    res.json({
      success: true,
      message: "Website knowledge updated successfully",
    });
  } catch (error) {
    console.error("Error updating website knowledge:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update website knowledge",
    });
  }
};

// Register routes
router.get("/", handleGetWebsites);
router.post("/test", handleTestWebsite); // Must be before POST /
router.get("/:id/post-types", handleGetPostTypes); // MUST be before /:id routes
router.get("/:id/taxonomies", handleGetTaxonomies); // NEW: Get taxonomies for post type
router.post("/:id/publish", handlePublishArticle); // NEW: Publish article to WordPress
router.post("/:id/schedule-publish", handleSchedulePublish); // NEW: Schedule publish
router.post("/:id/sync", handleSyncPosts);
router.put("/:id/knowledge", handleUpdateWebsiteKnowledge); // NEW: Update website knowledge
router.post("/", handleAddWebsite);
router.put("/:id", handleUpdateWebsite);
router.delete("/:id", handleDeleteWebsite);

export { router as websitesRouter };
