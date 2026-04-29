import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GenerateCaptionsBody, RegenerateOneCaptionBody, GenerateHashtagsBody } from "@workspace/api-zod";

const captionsRouter: IRouter = Router();

const SYSTEM_PROMPT = `You are the world's best social media copywriter — you've written viral content for thousands of small businesses across every industry. You understand platform algorithms, consumer psychology, and what actually makes people stop scrolling, engage, and buy.

Your captions have these qualities:
- Magnetic first lines that interrupt the scroll (hooks that create curiosity, urgency, or instant relatability)
- Specific, concrete language — never vague or generic buzzwords
- Authentic voice that sounds human, not corporate
- Emotional resonance — you connect to real feelings, real problems, real desires
- Strategic structure: hook → value/story → CTA → hashtags
- Every word earns its place — no filler, no fluff

You know that the #1 mistake most businesses make is writing captions ABOUT themselves. Great captions are always ABOUT the customer — their desires, their problems, their transformation.

Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary before or after.`;

// Deep niche profiles — audience psychology, what they care about, what triggers them
const NICHE_PROFILES: Record<string, string> = {
  "Real Estate": "Audience: homebuyers (anxious, excited, overwhelmed by the process), sellers (want top dollar fast), investors (ROI-focused). They fear making the wrong decision on the biggest purchase of their life. They respond to: market expertise, local knowledge, success stories, demystifying the process, 'what most agents won't tell you' angles.",
  "Fitness Coach": "Audience: people who've tried and failed before, feeling stuck, motivated but inconsistent. They want transformation — not just physical but confidence and discipline. They respond to: real client wins (with specifics), 'you're not broken' messaging, myth-busting, insider tips that pros use, showing the journey not just the destination.",
  "Restaurant": "Audience: foodies, date-night planners, office lunch crowds, families. Driven by: cravings, FOMO, special occasions, discovery. They respond to: mouthwatering sensory descriptions, origin stories of dishes, chef expertise, behind-the-scenes, limited specials, 'you've never tasted anything like this' claims backed by specifics.",
  "Boutique/Shop": "Audience: style-conscious, identity-driven shoppers who buy to express who they are. They respond to: aspirational lifestyle imagery in words, limited availability, how items make them feel/look, styling tips, 'you deserve this' messaging, community belonging.",
  "General Business": "Audience: local community members, potential repeat customers. They respond to: proof of quality, local pride, personal story behind the business, reliability signals, community connection, value over price.",
  "Beauty/Salon": "Audience: self-care seekers, people preparing for big moments, confidence-builders. They respond to: transformation stories, before/after language, booking urgency, 'you deserve to feel beautiful' messaging, expertise signals, exclusive techniques.",
  "Photography": "Audience: couples, families, businesses capturing important moments. They fear: missing memories, looking bad in photos, wasting money on mediocre work. They respond to: emotion-first language (how it feels to have these memories), sneak peek style, behind-the-scenes process, 'your story deserves to be told beautifully' angles.",
  "Coaching/Consulting": "Audience: ambitious professionals, entrepreneurs stuck at a ceiling, people craving change. They respond to: insight-driven hooks ('The #1 reason most businesses plateau...'), specific results with numbers, 'I used to think...' pivots, contrarian takes on conventional wisdom, the cost of inaction.",
  "Healthcare/Wellness": "Audience: people dealing with pain, fatigue, or wanting to be proactive. They respond to: empathy-first messaging, 'you're not imagining it' validation, specific symptom resonance, gentle authority, success stories, actionable quick tips that build trust.",
  "E-commerce": "Audience: convenience-focused online shoppers, deal-hunters, gift-buyers. They respond to: problem → solution structure, social proof (reviews, numbers sold), scarcity and urgency, before/after scenarios, specific product benefits not features, 'ships today' style confidence.",
  "Event Planning": "Audience: overwhelmed people planning the most important days of their lives. They fear: stress, chaos, things going wrong. They respond to: 'we handle everything' reassurance, vision-painting language, behind-the-scenes expertise proof, 'this is what working with us feels like' testimonials.",
  "Pet Care": "Audience: pet parents who treat animals like family — deeply emotional, guilt-prone if they can't provide the best. They respond to: 'your pet deserves...' framing, humor (pets are relatable), tail-wag-worthy language, expertise that gives them peace of mind.",
  "Education/Tutoring": "Audience: parents worried about their child's future, adult learners feeling behind. They respond to: specific outcome promises ('went from C to A in 6 weeks'), process demystification, confidence-building, 'you/your child is not the problem — the method is' reframing.",
  "Home Services": "Audience: homeowners anxious about quality, pricing, and reliability. They've been burned before. They respond to: trust signals (licensed, insured, guaranteed), before/after contrast, 'here's what most companies won't do' differentiation, transparent process language.",
  "Law Firm": "Audience: people in crisis, scared and confused about legal situations. They respond to: calm authority, 'we've seen this before and we know exactly what to do' confidence, demystifying legal jargon, specific wins (without names), 'you don't have to face this alone' empathy.",
  "Coffee Shop": "Audience: routine-seekers, remote workers, community connectors, coffee enthusiasts. They respond to: ritual and mood language ('that first sip feeling'), origin stories, barista craft, seasonal excitement, local community pride, 'third place' belonging.",
  "Yoga Studio": "Audience: stress-weary people seeking calm and community, beginners who are intimidated, practitioners deepening their practice. They respond to: inclusive 'all bodies welcome' language, transformation stories (physical and mental), instructor authenticity, class-specific benefits.",
  "Automotive": "Audience: car owners who fear being taken advantage of, truck/car enthusiasts, practical transportation-seekers. They respond to: expertise signals, transparent pricing language, time/money savings, 'we treat your car like our own' care signals, performance language for enthusiasts.",
  "Marketing Agency": "Audience: business owners frustrated with wasted ad spend and broken promises. They respond to: specific numbers and ROI, contrarian takes on industry norms, 'what actually works in 2024/2025' angles, case study snippets, 'stop doing X, start doing Y' frameworks.",
  "Non-Profit": "Audience: values-driven donors and volunteers who want their contribution to matter. They respond to: specific impact (20 meals served, 1 family housed), personal stories, urgency of need, 'you made this possible' appreciation, mission clarity.",
  "Travel/Tourism": "Audience: experience-seekers, adventure-craving, escape-needing people. They respond to: vivid sensory language that transports them, FOMO-inducing specifics, insider local knowledge, 'most tourists never know about this' angles, dream-selling then logistics.",
  "Dental/Medical": "Audience: anxiety-prone patients (dental fear is real), health-conscious adults, parents researching care for families. They respond to: fear-reduction language ('painless', 'gentle', 'we get it — most people feel nervous'), specific technology/expertise proof, 'this is what modern care looks like' education.",
};

// Platform-specific deep knowledge
const PLATFORM_GUIDES: Record<string, string> = {
  Instagram: `INSTAGRAM ALGORITHM + BEST PRACTICES:
- Hook in the FIRST LINE is everything — it shows in the preview before 'more'. Make it impossible to scroll past.
- Optimal length: 138-150 chars for short captions; 1,000-2,200 for carousel/storytelling posts
- Line breaks matter — use white space to create rhythm. Short punchy lines alternate with detail.
- Hashtags: 5-10 targeted hashtags at the end (NOT mixed in). Mix niche (50K-500K posts) + broad (1M+)
- First comment or caption: both work. Keep caption focused on the story.
- Emojis used sparingly at line breaks or to replace punctuation — not as decoration
- Hook formulas that work on Instagram: Bold statement. Question. Relatable pain. Controversial take. 'I used to...'`,

  Facebook: `FACEBOOK ALGORITHM + BEST PRACTICES:
- Facebook rewards content that sparks genuine conversation — end with a real question people want to answer
- Optimal length: 40-80 words for most posts; longer for stories/announcements
- Conversational, community-focused tone — Facebook is about connection, not selling
- Hashtags: 2-3 max (Facebook hashtags have less impact than Instagram)
- Facebook users are slightly older — more patience for context, less tolerant of hype
- 'Tag someone who...' and 'comment if...' CTAs work extremely well for reach
- Link posts: put the hook BEFORE you mention there's a link`,

  LinkedIn: `LINKEDIN ALGORITHM + BEST PRACTICES:
- LinkedIn rewards dwell time — make people stop and read by opening with a surprising/contrarian statement
- The first 2-3 lines are shown before 'see more' — make them impossible to skip
- Structure: Bold opening → Context/story → Key insight → Practical takeaway → Engagement question
- Optimal length: 900-1,200 characters (3-5 short paragraphs)
- Use line breaks aggressively — walls of text get scrolled past
- Hashtags: 3-5 highly relevant professional hashtags at the END
- Personal stories with professional lessons perform best
- Avoid: humblebrag, jargon, corporate speak, buzzwords like 'synergy'
- Hook formulas that work: 'I made a $XX mistake so you don't have to.' / 'Unpopular opinion:' / 'X years in [industry] taught me this:'`,

  TikTok: `TIKTOK ALGORITHM + BEST PRACTICES:
- TikTok captions complement the video — they're secondary, but they hook scrollers in the 'For You' feed preview
- Keep it SHORT and punchy — 2-3 lines max usually
- Use trending language naturally (not forced). Reference 'the algorithm', 'POV:', 'let me tell you'
- Hashtags: 5-8 — mix niche + trending (check what's trending in your category)
- Questions that beg to be answered in comments perform extremely well
- Lowercase, conversational style often outperforms formal writing
- Start with the hook — TikTok's audience has a 3-second patience threshold
- 'Watch to the end' style teasers in caption drive watch time`,

  "Twitter/X": `TWITTER/X ALGORITHM + BEST PRACTICES:
- 280 character limit including hashtags — ruthlessly edit every word
- The tweet IS the hook — no warm-up, no setup. Lead with the payload.
- Threads outperform single tweets — if you have more to say, thread it
- Hashtags: 1-2 max (more hurts reach on X)
- Bold, slightly provocative opinions perform best ('Hot take:' works)
- Punchy rhythm: short sentences. Fragments are fine.
- Avoid links in body text if possible — X deprioritizes external links
- Numbers and specifics dramatically boost credibility and saves`,
};

// Post type specific formulas
const POST_TYPE_FORMULAS: Record<string, string> = {
  "Product Showcase": "Lead with the transformation/outcome, not the product. 'Imagine [desired state] without [pain].' Then introduce the product as the vehicle. End with CTA.",
  "New Arrival": "Create excitement + FOMO. 'It's here.' / 'You asked, we listened.' Lead with what makes it special, not just 'new arrival'. Include limited first-batch language if applicable.",
  "Sale/Promo": "Urgency + value clarity. Open with the saving ('Save $X / Get X% off') — don't bury it. Add social proof ('our bestseller') + deadline. Make math easy for them.",
  "Flash Sale": "Maximum urgency. Short, punchy, countdown-style. 'X hours only.' 'This won't last.' 'We've never done this before.' Make them feel they'd regret missing it.",
  "Limited Time Offer": "Scarcity over discount. 'Only X left.' 'Ends [specific time].' The FOMO of missing out should be the core emotion — not just the deal.",
  "Giveaway/Contest": "Lead with what they win (make it sound amazing). Entry mechanic should be simple (follow + tag). Create genuine excitement — 'our biggest giveaway ever' if true.",
  "Behind the Scenes": "People follow people — give them real access. 'You've never seen this before.' Share a process, a mistake, a learning moment. Authentic > polished here.",
  "Day in the Life": "Make readers feel like they're there. Specific sensory details. Real moments, not curated perfection. 'By 6am I've already...' or 'Here's what nobody tells you about...'",
  "Team Spotlight": "Make the person the hero, not the company. What's their story? What do they love about the work? 'Meet [Name]...' Humanize the brand through real people.",
  "Tips & Education": "Lead with the counterintuitive insight or the #1 mistake. 'Stop doing X. Start doing Y.' List format works well — '3 things most [niche] owners don't know.' Give real value.",
  "How-To/Tutorial": "Start with the outcome ('In 5 minutes, you'll know exactly how to...'). Promise simplicity. Use numbered structure. End with 'save this for later' CTA.",
  "Q&A": "Lead with the most burning question in your niche. 'The question I get asked every single day:' Answer it fully. Invite follow-up questions at the end.",
  "Announcement": "Big energy opening. 'Something is coming.' / 'We've been working on this for months.' Build anticipation. Be specific about what, when, why it matters to THEM.",
  "Milestone/Celebration": "Frame it around gratitude — not bragging. 'X [customers/years/orders]' then immediately pivot: 'This happened because of YOU.' Make followers feel like co-creators.",
  "Seasonal/Holiday": "Connect the season/holiday to your business genuinely. Avoid forced connections. If it's real, lean into the emotion of the season. What does this time of year mean for your customers?",
  "Customer Story": "Story arc: Before → Struggle → Discovery → After. Specific details make it real. 'Sarah came to us after...' Let their transformation be the ad.",
  "Testimonial/Review": "Don't just quote — frame it. Set up what they were dealing with, then let the quote do the work. Add social proof layers: 'One of 500+ reviews.'",
  "Before & After": "Paint both states vividly. The 'before' should be something the reader identifies with (pain/frustration). The 'after' should feel achievable. 'Here's what changed in [timeframe]:'",
  "Motivational Quote": "Don't just share the quote — add YOUR take. What does it mean in the context of your industry? Why did it stop you? Make it relevant to your specific audience.",
  "Community Post": "Invite participation. Ask a real question you'd genuinely want to know. 'Drop your answer below.' Make people feel their opinion matters — because it does.",
  "User-Generated Content": "Make the original creator feel celebrated. Tag them, credit them. 'When our community creates content like this, we're speechless.' Encourage others to share.",
};

// Tone blending guide
const TONE_BLEND_GUIDE: Record<string, string> = {
  Professional: "confident, authoritative, polished — uses industry terms naturally, data-backed claims, precise language",
  Casual: "conversational, friendly, reads like a text from a friend — contractions, everyday words, light humor",
  Funny: "wit and humor woven in naturally — wordplay, unexpected comparisons, self-deprecation. Never forced.",
  Inspirational: "uplifting, belief-building, future-focused — 'you can', 'imagine if', 'this is your moment' energy",
  Storytelling: "narrative arc with specific sensory details — 'It was a Tuesday when...' Pull reader into a scene.",
  Bold: "unapologetic, direct, confident — short punchy sentences, no hedging, calls things what they are",
  Empowering: "puts power in the reader's hands — 'you deserve', 'you have what it takes', choice-giving language",
  Heartfelt: "genuine emotional warmth — vulnerable, sincere, personal — reads from the heart not the marketing team",
  Witty: "smart, clever, a little unexpected — surprising word choices, subtle humor, rewards close reading",
  Luxurious: "aspirational, exclusive, sensory-rich — evokes quality, craft, and the feeling of the finer things",
  Playful: "light, fun, energetic — exclamation marks used sparingly but effectively, emojis natural, upbeat",
  Authentic: "raw, unpolished in the best way — sounds like a real human, not a brand — specific over general always",
};

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
    postType,
    captionLength = "Medium",
    includeEmojis = true,
    ctaType,
    count = 3,
    avoidCaptions = [],
  } = params;

  const nicheProfile = NICHE_PROFILES[niche] ?? `Audience: potential customers of a ${niche} business. Speak directly to their needs and desires.`;
  const platformGuide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES["Instagram"];
  const postTypeFormula = postType && POST_TYPE_FORMULAS[postType] ? `\nPOST TYPE FORMULA (${postType}): ${POST_TYPE_FORMULAS[postType]}` : "";

  // Build tone blend instruction
  const tones = tone.split(",").map((t) => t.trim()).filter(Boolean);
  const toneBlend = tones
    .map((t) => TONE_BLEND_GUIDE[t])
    .filter(Boolean)
    .join(" | ");
  const toneInstruction = tones.length > 1
    ? `Blend these tones together naturally (${tones.join(" + ")}): ${toneBlend}`
    : `Tone: ${tones[0]} — ${toneBlend || tones[0]}`;

  const lengthGuide = {
    Short: "Short: 1-3 punchy lines, under 150 characters for the caption body. Hook-only structure. Every word must earn its place.",
    Medium: "Medium: 3-6 lines, 150-300 characters. Hook + 1-2 value sentences + CTA. Tight and purposeful.",
    Long: "Long: 8-15 lines, 400-700 characters. Full hook → context/story → insight → CTA arc. Use line breaks for rhythm. This is where storytelling shines.",
  }[captionLength] ?? "Medium: 3-6 lines, 150-300 characters.";

  const emojiInstruction = includeEmojis
    ? "Emojis: Use 2-4 emojis purposefully — at line breaks, to replace punctuation, or to add visual rhythm. NEVER as filler. Choose emojis that enhance meaning."
    : "Emojis: DO NOT use any emojis whatsoever.";

  const ctaInstruction = ctaType && ctaType !== "None"
    ? `Call-to-Action: End with a natural, non-pushy version of '${ctaType}'. Integrate it smoothly — don't just append it. Make it feel like the logical next step.`
    : "Call-to-Action: Include a soft, natural CTA that fits the post type — could be a question, an invitation, or a direction.";

  const avoidSection = avoidCaptions.length > 0
    ? `\n\nCRITICAL — DO NOT produce captions that are structurally or thematically similar to these:\n${avoidCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n")}\nEach new caption must use a completely different hook, structure, and angle.`
    : "";

  const hashtagGuide = {
    Instagram: "Include 6-10 hashtags. Mix: 2-3 ultra-niche (under 100K posts), 3-4 niche (100K-1M), 2-3 broad (1M+). Place at the end.",
    Facebook: "Include 2-3 hashtags only. Very targeted to the post topic.",
    LinkedIn: "Include 3-5 professional hashtags. Industry + topic + audience focused.",
    TikTok: "Include 5-8 hashtags. Mix trending (check what's hot in this niche) + niche-specific.",
    "Twitter/X": "Include 1-2 hashtags ONLY. Weave them naturally into the text or at the end. Every character counts.",
  }[platform] ?? "Include 6-10 relevant hashtags.";

  return `TASK: Write ${count} exceptional, distinct social media caption(s) for this ${niche} business.

━━━ THE POST ━━━
What this post is about: ${postDescription}
${postType ? `Post type: ${postType}` : ""}

━━━ KNOW YOUR AUDIENCE ━━━
${nicheProfile}

━━━ PLATFORM MASTERY ━━━
${platformGuide}

━━━ CRAFT REQUIREMENTS ━━━
${toneInstruction}
Length: ${lengthGuide}
${emojiInstruction}
${ctaInstruction}
Hashtags: ${hashtagGuide}
${postTypeFormula}

━━━ QUALITY STANDARDS ━━━
Each caption MUST:
1. Open with a hook that stops the scroll — test: would YOU stop scrolling for this?
2. Speak to the CUSTOMER'S desire or pain, not about the business
3. Include at least one specific, concrete detail (not vague generalities)
4. Sound like a real human wrote it — not AI, not marketing copy
5. Be structurally different from the other captions (different hook type, different angle, different structure)
6. Feel complete and publish-ready — nothing generic, nothing that could apply to any business

Hook type variety to use across the ${count} caption(s):
- Provocative question or bold statement
- Specific number or surprising fact
- Relatable 'you know that feeling when...' scenario
- Story opening ('Last week...' / 'A customer told us...')
- Contrarian or unexpected take${avoidSection}

━━━ RESPOND IN THIS EXACT JSON FORMAT ━━━
{
  "captions": [
    {
      "caption": "The full caption text here — no hashtags in this field",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3"
    }
  ]
}`;
}

function buildHashtagPrompt(params: { niche: string; topic: string; platform?: string }) {
  const { niche, topic, platform = "Instagram" } = params;
  const nicheProfile = NICHE_PROFILES[niche] ?? `${niche} business`;

  const platformHashtagGuide = {
    Instagram: "Instagram hashtag strategy: mix low-competition (10K-100K posts) for discoverability + medium (100K-1M) for reach + broad (1M+) for max exposure. Sweet spot is mostly medium-competition.",
    Facebook: "Facebook hashtags: less important than Instagram. Focus on highly specific, community-relevant tags.",
    LinkedIn: "LinkedIn hashtags: professional, industry-specific. People follow hashtags on LinkedIn. Choose ones your target audience actually follows.",
    TikTok: "TikTok hashtags: mix niche + trending sounds. Include at least 2-3 currently trending tags in this category.",
    "Twitter/X": "Twitter/X hashtags: conversations cluster around 1-2 hashtags. Choose the ones where your audience actually spends time.",
  }[platform] ?? "Mix niche-specific with broader reach hashtags.";

  return `TASK: Generate the most effective hashtag set for a ${niche} business.

Post topic: ${topic}
Platform: ${platform}

AUDIENCE CONTEXT: ${nicheProfile}

PLATFORM STRATEGY: ${platformHashtagGuide}

Generate 30 strategically chosen hashtags in 3 groups:

NICHE (10 tags): Highly specific to this exact niche and topic. These reach the exact right audience — people already interested in ${niche}. Include hashtags your ideal customer actually searches and follows. Mix of ${niche}-specific industry terms + location-agnostic niche tags.

TRENDING (10 tags): Popular hashtags with high engagement in this category RIGHT NOW. These extend reach beyond existing followers. Should include mix of topic-specific trending tags + platform-specific trending formats.

BROAD (10 tags): High-volume discovery hashtags (millions of posts). These cast the widest net. Include universally relevant small business, entrepreneurship, and lifestyle tags that still fit this content.

QUALITY RULES:
- Every hashtag must be actually usable and discoverable (no nonsense or too-obscure tags)
- Mix singular/plural variations thoughtfully  
- Avoid hashtags that are banned or spammy
- Make them specific enough that the right audience finds them
- All hashtags MUST be relevant — no generic filler like #love #instagood unless genuinely appropriate

Respond ONLY with valid JSON:
{
  "hashtags": ["#all30", "#combined", "#in", "#one", "#array"],
  "grouped": {
    "niche": ["#niche1", "#niche2", "#niche3", "#niche4", "#niche5", "#niche6", "#niche7", "#niche8", "#niche9", "#niche10"],
    "trending": ["#trending1", "#trending2", "#trending3", "#trending4", "#trending5", "#trending6", "#trending7", "#trending8", "#trending9", "#trending10"],
    "broad": ["#broad1", "#broad2", "#broad3", "#broad4", "#broad5", "#broad6", "#broad7", "#broad8", "#broad9", "#broad10"]
  }
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
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildCaptionPrompt({
            niche,
            postDescription,
            tone,
            platform: platform ?? undefined,
            postType: postType ?? undefined,
            captionLength: captionLength ?? undefined,
            includeEmojis: includeEmojis ?? true,
            ctaType: ctaType ?? undefined,
            count: 3,
          }),
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = ("{" + block.text).trim();
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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildCaptionPrompt({
            niche,
            postDescription,
            tone,
            platform: platform ?? undefined,
            postType: postType ?? undefined,
            captionLength: captionLength ?? undefined,
            includeEmojis: includeEmojis ?? true,
            ctaType: ctaType ?? undefined,
            count: 1,
            avoidCaptions: existingCaptions ?? [],
          }),
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = ("{" + block.text).trim();
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
      system: "You are the world's best social media strategist specializing in hashtag research and audience discovery. You know exactly which hashtags drive real reach vs vanity metrics. Always respond with valid JSON only — no markdown, no code blocks.",
      messages: [
        {
          role: "user",
          content: buildHashtagPrompt({ niche, topic, platform: platform ?? undefined }),
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = ("{" + block.text).trim();
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
