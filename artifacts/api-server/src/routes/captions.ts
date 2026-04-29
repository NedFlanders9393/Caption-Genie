import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GenerateCaptionsBody, RegenerateOneCaptionBody, GenerateHashtagsBody } from "@workspace/api-zod";

const captionsRouter: IRouter = Router();

function buildCaptionPrompt(params: {
  niche: string;
  postDescription: string;
  tone: string;
  platform?: string;
  postType?: string;
  captionLength?: string;
  includeEmojis?: boolean;
  ctaType?: string;
  count?: number;
  avoidCaptions?: string[];
}) {
  const {
    niche,
    postDescription,
    tone,
    platform = "Instagram",
    postType = "General",
    captionLength = "Medium",
    includeEmojis = true,
    ctaType = "None",
    count = 5,
    avoidCaptions = [],
  } = params;

  const lengthGuide = {
    Short: "under 100 characters (punchy, one-liner style)",
    Medium: "150-250 characters (balanced, engaging)",
    Long: "300-500 characters (storytelling, detailed)",
  }[captionLength] ?? "150-250 characters";

  const platformGuide = {
    Instagram: "Use a hook first line, then body. Hashtags on a separate line at the end.",
    Facebook: "Conversational and community-focused. Longer is fine. Few hashtags (3-5 max).",
    LinkedIn: "Professional insight-driven. Start with a bold statement. 3-5 hashtags.",
    TikTok: "Fun, punchy, youth-friendly. Reference trending language. 5-8 hashtags.",
    "Twitter/X": "Tight, max 280 chars total including hashtags. 2-3 hashtags only.",
  }[platform] ?? "Use a hook first line, then body.";

  const ctaGuide = ctaType && ctaType !== "None" ? `Always end with a call-to-action: "${ctaType}"` : "";
  const emojiGuide = includeEmojis
    ? "Include relevant emojis naturally throughout the caption."
    : "Do NOT include any emojis.";

  const avoidGuide = avoidCaptions.length > 0
    ? `\n\nDo NOT produce captions similar to these already shown:\n${avoidCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    : "";

  return `Create ${count} unique social media caption(s) for a ${niche} business on ${platform}.

Post description: ${postDescription}
Post type: ${postType}
Tone: ${tone}
Caption length: ${lengthGuide}
Platform style: ${platformGuide}
${emojiGuide}
${ctaGuide}
${avoidGuide}

Rules:
- Make each caption feel distinct in structure and approach
- Include 5-8 relevant hashtags per caption (fewer for LinkedIn/Facebook/Twitter as noted)
- Captions must be authentic to a ${niche} business owner's voice
- Keep the ${tone} tone consistent

Respond ONLY with valid JSON:
{
  "captions": [
    {
      "caption": "The caption text here without hashtags",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3"
    }
  ]
}`;
}

captionsRouter.post("/captions/generate", async (req, res) => {
  const parsed = GenerateCaptionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: "You are an expert social media caption writer for small businesses. Always respond with valid JSON only — no markdown, no code blocks, no extra text.",
      messages: [
        {
          role: "user",
          content: buildCaptionPrompt({
            niche, postDescription, tone,
            platform: platform ?? undefined,
            postType: postType ?? undefined,
            captionLength: captionLength ?? undefined,
            includeEmojis: includeEmojis ?? true,
            ctaType: ctaType ?? undefined,
            count: 5,
          }),
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
    if (jsonMatch) rawText = jsonMatch[1].trim();

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

captionsRouter.post("/captions/regenerate-one", async (req, res) => {
  const parsed = RegenerateOneCaptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType, existingCaptions } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: "You are an expert social media caption writer for small businesses. Always respond with valid JSON only — no markdown, no code blocks, no extra text.",
      messages: [
        {
          role: "user",
          content: buildCaptionPrompt({
            niche, postDescription, tone,
            platform: platform ?? undefined,
            postType: postType ?? undefined,
            captionLength: captionLength ?? undefined,
            includeEmojis: includeEmojis ?? true,
            ctaType: ctaType ?? undefined,
            count: 1,
            avoidCaptions: existingCaptions ?? [],
          }),
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
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as { captions: { caption: string; hashtags: string }[] };
    if (!parsed_response.captions?.[0]) {
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json(parsed_response.captions[0]);
  } catch (err) {
    req.log.error({ err }, "Single caption regeneration failed");
    res.status(500).json({ error: "Failed to regenerate caption" });
  }
});

captionsRouter.post("/captions/hashtags", async (req, res) => {
  const parsed = GenerateHashtagsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { niche, topic, platform } = parsed.data;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "You are an expert social media strategist. Always respond with valid JSON only — no markdown, no code blocks.",
      messages: [
        {
          role: "user",
          content: `Generate a comprehensive hashtag set for a ${niche} business posting about: ${topic}
Platform: ${platform ?? "Instagram"}

Create 30 hashtags grouped into:
- niche: 10 industry-specific hashtags (moderate reach, targeted)
- trending: 10 currently popular hashtags (high reach)  
- broad: 10 broad popular hashtags (massive reach, general audience)

Respond ONLY with valid JSON:
{
  "hashtags": ["#all", "#hashtags", "#combined"],
  "grouped": {
    "niche": ["#niche1", "#niche2"],
    "trending": ["#trending1", "#trending2"],
    "broad": ["#broad1", "#broad2"]
  }
}`,
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
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as {
      hashtags: string[];
      grouped: { niche: string[]; trending: string[]; broad: string[] };
    };

    res.json(parsed_response);
  } catch (err) {
    req.log.error({ err }, "Hashtag generation failed");
    res.status(500).json({ error: "Failed to generate hashtags" });
  }
});

export default captionsRouter;
