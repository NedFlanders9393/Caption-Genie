import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GenerateCaptionsBody } from "@workspace/api-zod";

const captionsRouter: IRouter = Router();

captionsRouter.post("/captions/generate", async (req, res) => {
  const parsed = GenerateCaptionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { niche, postDescription, tone } = parsed.data;

  const systemPrompt = `You are an expert social media caption writer for small businesses. 
You specialize in creating engaging captions that drive engagement and sales.
Always respond with exactly 5 unique captions in valid JSON format.`;

  const userPrompt = `Create 5 unique social media captions for a ${niche} business.

Post description: ${postDescription}
Tone: ${tone}

Rules:
- Each caption should be compelling and optimized for social media engagement
- Include 5-8 relevant hashtags per caption
- Vary the structure and approach across all 5 captions
- Keep the ${tone} tone consistent throughout
- Make captions feel authentic to a ${niche} business

Respond ONLY with valid JSON in this exact format:
{
  "captions": [
    {
      "caption": "The caption text here without hashtags",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();

    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      rawText = jsonMatch[1].trim();
    }

    const parsed_response = JSON.parse(rawText) as { captions: { caption: string; hashtags: string }[] };

    if (!parsed_response.captions || !Array.isArray(parsed_response.captions)) {
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json({ captions: parsed_response.captions });
  } catch (err) {
    req.log.error({ err }, "Caption generation failed");
    res.status(500).json({ error: "Failed to generate captions" });
  }
});

export default captionsRouter;
