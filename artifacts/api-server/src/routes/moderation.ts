import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
});

router.post(
  "/moderate-image",
  // Allow up to 10MB for base64 image payloads
  (req, res, next) => {
    const contentLength = Number(req.headers["content-length"] ?? 0);
    if (contentLength > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "Image too large" });
    }
    next();
  },
  async (req, res) => {
    const { imageBase64, mimeType = "image/jpeg" } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    try {
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 10,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Does this image contain nudity, explicit sexual content, or graphic violence? Reply with only the word SAFE or UNSAFE.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "low" },
              },
            ],
          },
        ],
      });

      const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "UNSAFE";
      const safe = answer.startsWith("SAFE");

      return res.json({ safe, reason: safe ? null : "Image contains inappropriate content." });
    } catch (err: any) {
      req.log.error({ err }, "Moderation check failed");
      // Fail open if the moderation service is unavailable, but log it
      return res.json({ safe: true, reason: null, warning: "Moderation service unavailable" });
    }
  }
);

export default router;
