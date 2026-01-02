import { Router, RequestHandler } from "express";
import { query } from "../db";

const router = Router();

interface RewriteRequest {
  text: string;
  style:
    | "standard"
    | "shorter"
    | "longer"
    | "easy"
    | "creative"
    | "funny"
    | "casual"
    | "friendly"
    | "professional";
}

const stylePrompts: Record<RewriteRequest["style"], string> = {
  standard:
    "Rewrite the following text in a standard, professional manner while maintaining its original meaning.",
  shorter:
    "Rewrite the following text to be much shorter and more concise, removing unnecessary details.",
  longer:
    "Expand the following text with more details, examples, and explanations while maintaining clarity.",
  easy: "Rewrite the following text to be easier to read and understand for a general audience. Use simpler words and shorter sentences.",
  creative:
    "Rewrite the following text in a creative and engaging way that captures attention.",
  funny: "Rewrite the following text in a humorous and entertaining way.",
  casual:
    "Rewrite the following text in a casual, conversational tone as if talking to a friend.",
  friendly:
    "Rewrite the following text in a warm, friendly, and approachable tone.",
  professional:
    "Rewrite the following text in a highly professional and formal tone suitable for business.",
};

const handleRewrite: RequestHandler = async (req, res) => {
  try {
    const { text, style } = req.body as RewriteRequest;

    if (!text || !style) {
      res.status(400).json({ error: "Text and style are required" });
      return;
    }

    if (!stylePrompts[style]) {
      res.status(400).json({ error: "Invalid style provided" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OpenAI API key not configured" });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional content editor. Rewrite text as requested while maintaining accuracy and quality. Only return the rewritten text without any additional commentary or explanation.",
          },
          {
            role: "user",
            content: `${stylePrompts[style]}\n\nText to rewrite:\n${text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      res.status(500).json({ error: "Failed to call OpenAI API" });
      return;
    }

    const data = await response.json();
    const rewrittenText = data.choices[0]?.message?.content?.trim();

    if (!rewrittenText) {
      res.status(500).json({ error: "No response from OpenAI" });
      return;
    }

    // Save to database (optional - for tracking AI usage)
    try {
      await query(
        `INSERT INTO ai_rewrite_history (original_text, rewritten_text, style, created_at) VALUES (?, ?, ?, NOW())`,
        [text, rewrittenText, style],
      );
    } catch (dbError) {
      // Log but don't fail the request if database insert fails
      console.error("Failed to save AI rewrite to database:", dbError);
    }

    res.json({ rewrittenText });
  } catch (error) {
    console.error("Error in rewrite endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleFindImage: RequestHandler = async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    // Get the next available API key
    const apiKeys = await query<any>(
      `SELECT id, provider, api_key FROM image_search_api_keys
       WHERE is_active = TRUE
       ORDER BY quota_remaining DESC
       LIMIT 1`
    );

    if (apiKeys.length === 0) {
      res.status(503).json({ error: "No available image search API keys" });
      return;
    }

    const { id: keyId, provider, api_key } = apiKeys[0];

    let images: any[] = [];
    let error = null;

    try {
      if (provider === "serpapi") {
        const response = await fetch(
          `https://serpapi.com/search?q=${encodeURIComponent(keyword)}&tbm=isch&api_key=${api_key}`
        );
        const data = await response.json();
        images = (data.images_results || []).slice(0, 10).map((img: any) => ({
          title: img.title,
          thumbnail: img.thumbnail,
          original: img.original,
          source: img.source,
        }));
      } else if (provider === "serper.dev") {
        const response = await fetch("https://google.serper.dev/images", {
          method: "POST",
          headers: {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: keyword }),
        });
        const data = await response.json();
        images = (data.images || []).slice(0, 10).map((img: any) => ({
          title: img.title,
          thumbnail: img.imageUrl,
          original: img.imageUrl,
          source: img.source,
        }));
      } else if (provider === "zenserp") {
        const response = await fetch(
          `https://api.zenserp.com/v1/search?q=${encodeURIComponent(keyword)}&tbm=isch&apikey=${api_key}`
        );
        const data = await response.json();
        images = (data.images || []).slice(0, 10).map((img: any) => ({
          title: img.title,
          thumbnail: img.thumbnail,
          original: img.original,
          source: img.source,
        }));
      }
    } catch (apiError) {
      console.error(`Error with ${provider}:`, apiError);
      error = `Failed to fetch images from ${provider}`;
    }

    // Update API key usage
    if (images.length > 0) {
      await execute(
        `UPDATE image_search_api_keys
         SET quota_remaining = quota_remaining - 1, last_used_at = NOW()
         WHERE id = ?`,
        [keyId]
      );
    }

    res.json({ images, provider, error });
  } catch (error) {
    console.error("Error finding images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleWriteMore: RequestHandler = async (req, res) => {
  try {
    const { content, title, keywords } = req.body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OpenAI API key not configured" });
      return;
    }

    // Build the prompt based on available content
    let prompt = "";

    if (content && content.trim()) {
      prompt = `Continue writing the following article content in the same style and tone. Keep it engaging and relevant. Only return the continuation, not the original content:\n\n${content}`;
    } else if (title) {
      prompt = `Write a detailed article about "${title}".`;
      if (keywords && Array.isArray(keywords) && keywords.length > 0) {
        prompt += ` Make sure to include and focus on these keywords: ${keywords.join(", ")}.`;
      }
    } else {
      res.status(400).json({
        error: "Please provide content, title, or keywords",
      });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional content writer. Write engaging, well-structured, and SEO-friendly content. Use proper formatting with paragraphs.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      res.status(500).json({ error: "Failed to call OpenAI API" });
      return;
    }

    const data = await response.json();
    const writtenContent = data.choices[0]?.message?.content?.trim();

    if (!writtenContent) {
      res.status(500).json({ error: "No response from OpenAI" });
      return;
    }

    res.json({ writtenContent });
  } catch (error) {
    console.error("Error writing more:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/rewrite", handleRewrite);
router.post("/find-image", handleFindImage);
router.post("/write-more", handleWriteMore);

export { router as aiRouter };
