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

router.post("/rewrite", handleRewrite);

export { router as aiRouter };
