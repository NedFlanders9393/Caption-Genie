import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "@clerk/express";
import rateLimit from "express-rate-limit";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GenerateCaptionsBody, RegenerateOneCaptionBody, GenerateHashtagsBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const FREE_MONTHLY_LIMIT = 10;
const PRO_MONTHLY_LIMIT = 500;

function getYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function isRevenueCatPro(userId: string): Promise<boolean> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) return false;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "X-Platform": "ios",
      },
    });
    if (!res.ok) return false;
    const data = await res.json() as { subscriber?: { entitlements?: { active?: Record<string, unknown> } } };
    return !!data.subscriber?.entitlements?.active?.["pro"];
  } catch {
    return false;
  }
}

async function enforceUsageLimit(userId: string, req: Request, res: Response): Promise<boolean> {
  const yearMonth = getYearMonth();
  const isPro = await isRevenueCatPro(userId);
  const limit = isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;

  const result = await db.execute(
    sql`INSERT INTO monthly_usage (user_id, year_month, count)
        VALUES (${userId}, ${yearMonth}, 1)
        ON CONFLICT (user_id, year_month)
        DO UPDATE SET count = monthly_usage.count + 1
        RETURNING count`
  );
  const newCount = (result.rows[0] as { count: number }).count;

  if (newCount > limit) {
    await db.execute(
      sql`UPDATE monthly_usage SET count = count - 1
          WHERE user_id = ${userId} AND year_month = ${yearMonth}`
    );
    res.status(429).json({
      error: isPro
        ? `Monthly generation limit reached (${PRO_MONTHLY_LIMIT}/month for Pro). Resets on the 1st.`
        : `Free tier limit reached (${FREE_MONTHLY_LIMIT}/month). Upgrade to Pro for 500 generations/month.`,
      limit,
      isPro,
    });
    return false;
  }

  return true;
}

const captionsRouter: IRouter = Router();

// Rate limiter: max 30 requests per 10 minutes per user (identified by Clerk userId)
const captionRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req as any).auth?.userId ?? "anonymous",
  validate: { xForwardedForHeader: false },
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

// Apply auth + rate limiting to all caption routes
captionsRouter.use(requireAuth({ signInUrl: "/api/unauthorized" }));
captionsRouter.use(captionRateLimit);

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
  "Influencer/Creator": "Audience: engaged followers who follow the creator for their personality, perspective, and lifestyle — not a product or service. They want authentic access, opinions, and entertainment. They respond to: unfiltered honesty, 'storytime' style hooks, relatable struggles, strong POV, behind-the-scenes access, and content that makes them feel like an insider.",
  "Fashion Influencer": "Audience: style-conscious followers who trust this creator's taste. They're aspiration-driven but budget-aware. They respond to: outfit breakdowns ('this $30 find looks like $300'), styling tips and tricks, 'where I got it' transparency, trend alerts with personal takes, and 'you can wear this anywhere' versatility angles.",
  "Beauty Influencer": "Audience: makeup lovers, skincare obsessives, beauty beginners and enthusiasts who treat this creator as their trusted friend in the industry. They respond to: honest reviews ('I was NOT expecting this'), before/after language, ingredient breakdowns in plain English, drugstore vs. luxury comparisons, and 'this changed my routine' testimonials.",
  "Lifestyle Influencer": "Audience: people who aspire to the creator's aesthetic, habits, or way of living. They respond to: 'a day in my life' intimacy, practical tips that feel achievable, morning routine and productivity content, aesthetic visual descriptions, and 'here's how I actually do it' authenticity over curated perfection.",
  "Food Influencer": "Audience: food lovers, home cooks, recipe seekers who are hungry (literally and figuratively) for inspiration. They respond to: mouthwatering sensory language ('crispy edges, melty center'), difficulty level ('5 ingredients, 20 minutes'), 'you NEED to make this' urgency, flavor profile descriptions, and surprising ingredient reveals.",
  "Fitness Influencer": "Audience: people who follow for workout motivation, form tips, transformation inspiration. They respond to: 'you can do this' encouragement, specific workout details ('4 sets, 12 reps'), myth-busting ('you don't need a gym for this'), real progress updates (not just peak performance), and 'I struggled with this too' vulnerability.",
  "Travel Influencer": "Audience: wanderlust-filled followers who travel vicariously through this creator — some planning their own trips, some just dreaming. They respond to: vivid destination descriptions, 'hidden gem' discoveries, honest travel tips ('skip this, do this instead'), cost breakdowns, and 'how to visit on a budget' practical angles.",
  "Tech/Gaming Creator": "Audience: tech enthusiasts, gamers, early adopters who trust this creator's honest take over brand marketing. They respond to: spec breakdowns in plain English, 'is it actually worth it' angles, setup tours, gaming moments, 'hot take' opinions on industry news, and community challenges.",
  "Parenting/Family Creator": "Audience: parents (often overwhelmed, looking for solidarity and practical advice) who feel seen by this creator. They respond to: relatable parenting humor, 'you're not alone' validation, practical hacks that actually work, honest moments (not just highlight reel), and 'things I wish someone told me' content.",
  "Finance/Money Creator": "Audience: people who feel behind financially and want guidance they can trust. They respond to: specific numbers and examples ('I paid off $40K in 18 months'), myth-busting ('you don't need to earn more to save more'), simple explainers of complex concepts, 'mistake I made so you don't have to' honesty, and actionable first steps.",
  "Digital Products": "Audience: entrepreneurs, creators, and side-hustlers looking for passive income or digital tools. They're skeptical of hype but excited by proof. They respond to: specific income claims with context, 'what's inside' transparency, social proof (students/customers), the problem the product solves, and limited-time launch urgency.",
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

  YouTube: `YOUTUBE ALGORITHM + BEST PRACTICES:
- This caption is for a YouTube Community post or Shorts description — both serve different purposes
- Community posts: up to 5,000 characters. Think of it like a Facebook post — conversational, engaging, drives comments
- Shorts descriptions: only the FIRST 100 characters show without clicking 'more' — make them count
- Video descriptions: first 2-3 lines are visible before 'show more' — lead with the hook and key info
- YouTube rewards watch time and engagement — captions should tease the value inside the video, not spoil it
- Hook formula: state the benefit or intrigue in the first line ('This one trick got me 10K views in a week')
- Subscribe CTA works well here — YouTube audience expects and responds to subscribe prompts
- Hashtags: 3-5 placed at the END of the description (YouTube treats them specially and creates clickable links)
- Include relevant keywords naturally — YouTube is a search engine, so searchable language matters
- No links in descriptions unless directing to a landing page — keep focus on the video itself`,

  Pinterest: `PINTEREST ALGORITHM + BEST PRACTICES:
- Pinterest is a visual SEARCH ENGINE, not a social network — keywords are everything
- Pin description limit: 500 characters. Write rich, keyword-heavy descriptions naturally
- Users are in planning/discovery mode — they're dreaming, collecting ideas, preparing to buy
- Lead with the most searchable phrase ('Easy weeknight dinner ideas' / 'Home office decor inspiration')
- Write as if describing the pin to someone who can't see the image — what is it, why is it valuable?
- Include 2-3 relevant keyword phrases woven naturally into the text (not as a list — as sentences)
- Seasonal and evergreen content both perform — 'Summer outfit ideas' and 'timeless living room decor'
- Action-oriented language works: 'Save this for later' / 'Try this recipe tonight' / 'Shop the look'
- Hashtags: 2-5 highly relevant hashtags (Pinterest uses them, but keywords in the description matter more)
- Avoid clickbait — Pinterest audience is intentional and will not click misleading pins`,
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
  "Sponsored Content": "Transparency + authenticity. Lead with the value/content first, not the brand. Disclose naturally ('partnered with [brand]' or '#ad'). The hook should be about the BENEFIT to the audience, not the brand deal. If it reads like an ad, it fails.",
  "Brand Partnership/Collab": "Lead with the excitement — 'I've been waiting to share this.' Explain WHY this collab makes sense (shared values, complementary audiences). Make followers feel like they're getting something special from it, not just being sold to.",
  "Brand Deal Reveal": "Story angle: 'They reached out and I said yes because...' Be specific about why this brand fits. Make the audience feel like insiders. 'I only say yes to brands I actually use' builds long-term trust.",
  "Get Ready With Me": "Invite readers into the routine — 'pull up a chair.' Sensory, step-by-step language. Share thoughts, music, mood. GRWM content is about intimacy, not instruction. Make them feel like they're getting ready WITH you.",
  "Outfit/Look of the Day": "Lead with the feeling, not the clothes. 'Feeling [mood] today in this [vibe] look.' Then break down pieces. Include budget info if relevant ('under $100 total'). Where to get it is the #1 question — answer it.",
  "Haul": "Build anticipation ('you have to see what I found'). Go piece by piece — each item gets its own mini moment. Include honest reactions. Price points matter. End with your top pick or biggest surprise.",
  "Favorites/Recommendations": "Position as 'trusted friend sharing the good stuff.' Lead with why these are YOUR favorites (specificity builds trust). Include context for each — not just 'I like it' but 'I use this every morning and here's why.' Link in bio / save this CTA works perfectly here.",
  "Reel/Short Video": "Caption should complement, not repeat the video. Hook line should make them watch (or rewatch). Include the key takeaway in text for accessibility. 'Watch until the end' style CTAs drive completion rates.",
  "Story Content": "Casual, conversational, in-the-moment energy. Like texting your best friend. Use questions that beg replies. Build suspense across multiple 'slides' (reference the next part). Personal and unfiltered wins over polished.",
  "Poll/This or That": "Make the choice fun and slightly debatable — 'settle this debate for me.' Both options should be appealing or interesting. The point is engagement, so pick a topic your audience has a real opinion about. React to results in follow-up content.",
  "Follow Me Around": "Scene-setting opening ('We're going to...') that builds anticipation. Share the itinerary or plan briefly. Use conversational asides and personal commentary. Make followers feel like they're along for the ride, not watching from the outside.",
  "Unboxing": "Lead with anticipation ('I've been waiting for this for WEEKS'). Describe each element as you encounter it — texture, smell, quality, first impression. Honest reaction > scripted enthusiasm. First impression = the hook.",
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

interface BrandVoice {
  brandName?: string;
  tagline?: string;
  personality?: string[];
  targetAudience?: string;
  captionStyle?: string[];
  alwaysInclude?: string;
  neverSay?: string;
  sampleCaption?: string;
}

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
  brandVoice?: BrandVoice;
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
    brandVoice,
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
    YouTube: "Include 3-5 hashtags placed at the very end of the description. Focus on broad searchable terms relevant to the video topic.",
    Pinterest: "Include 2-5 hashtags at the end. Highly descriptive and keyword-rich — think what someone would search to find this pin.",
  }[platform] ?? "Include 6-10 relevant hashtags.";

  const brandVoiceSection = brandVoice && (brandVoice.brandName || brandVoice.tagline || brandVoice.personality?.length || brandVoice.targetAudience || brandVoice.captionStyle?.length || brandVoice.alwaysInclude || brandVoice.neverSay || brandVoice.sampleCaption)
    ? `\n━━━ BRAND VOICE (CRITICAL — follow this exactly) ━━━
${brandVoice.brandName ? `Brand name: ${brandVoice.brandName}` : ""}
${brandVoice.tagline ? `Brand tagline / slogan: "${brandVoice.tagline}" — mirror the energy, rhythm, and style of this phrase` : ""}
${brandVoice.personality?.length ? `Brand personality: ${brandVoice.personality.join(", ")} — every caption MUST sound like this brand` : ""}
${brandVoice.targetAudience ? `Their exact audience: ${brandVoice.targetAudience} — write directly to this person` : ""}
${brandVoice.captionStyle?.length ? `Writing style rules (MUST follow): ${brandVoice.captionStyle.join(", ")}` : ""}
${brandVoice.alwaysInclude ? `Always weave in (naturally, not forced): ${brandVoice.alwaysInclude}` : ""}
${brandVoice.neverSay ? `NEVER use these words, phrases, or themes: ${brandVoice.neverSay}` : ""}
${brandVoice.sampleCaption ? `\nSAMPLE CAPTION (study this carefully — match its exact voice, rhythm, length, punctuation style, line structure, and tone):\n---\n${brandVoice.sampleCaption}\n---\nYour captions MUST feel like they were written by the same person who wrote the sample above.` : ""}
This brand voice overrides generic niche advice — make it personal and specific to THIS brand.\n`
    : "";

  return `TASK: Write ${count} exceptional, distinct social media caption(s) for this ${niche} business.

━━━ THE POST ━━━
What this post is about: ${postDescription}
${postType ? `Post type: ${postType}` : ""}

━━━ KNOW YOUR AUDIENCE ━━━
${nicheProfile}${brandVoiceSection}

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

  const userId = (req as any).auth?.userId as string;
  const allowed = await enforceUsageLimit(userId, req, res);
  if (!allowed) return;

  const { niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType } = parsed.data;
  const brandVoice = req.body.brandVoice as BrandVoice | undefined;

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
            brandVoice,
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

  const userId = (req as any).auth?.userId as string;
  const allowed = await enforceUsageLimit(userId, req, res);
  if (!allowed) return;

  const { niche, postDescription, tone, platform, postType, captionLength, includeEmojis, ctaType, existingCaptions } = parsed.data;
  const brandVoice = req.body.brandVoice as BrandVoice | undefined;

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
            brandVoice,
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

  const userId = (req as any).auth?.userId as string;
  const allowed = await enforceUsageLimit(userId, req, res);
  if (!allowed) return;

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

captionsRouter.post("/captions/remix", async (req, res) => {
  const { caption, direction, platform } = req.body as {
    caption?: string;
    direction?: string;
    platform?: string;
  };

  if (!caption || typeof caption !== "string" || !direction || typeof direction !== "string") {
    res.status(400).json({ error: "caption and direction are required" });
    return;
  }

  const directionGuide: Record<string, string> = {
    "Make it shorter": "Compress to the punchiest possible version — keep only the highest-impact words. Target under 100 characters for the caption body.",
    "Make it longer": "Expand with a compelling story arc, more sensory detail, and a stronger hook. Use line breaks for rhythm. Aim for 400-600 characters.",
    "Make it funnier": "Add wit, wordplay, or a self-aware humorous angle. Should make someone smile or laugh while still selling. Never forced or cringe.",
    "More professional": "Elevate the language — polished, authoritative, confident. Remove slang. Every word signals expertise. Suitable for LinkedIn.",
    "More casual": "Rewrite so it sounds like a real human texted it to a friend. Contractions, relaxed phrasing, conversational flow.",
    "Add urgency": "Inject time pressure and FOMO throughout — 'limited time', 'today only', 'before it's gone', countdown language. Make inaction feel costly.",
    "More emotional": "Dial up the feeling — connect to real human desires, fears, or joys. Should resonate in the gut, not just the head.",
    "Change the hook": "Keep the core message but write a completely different opening line — different hook type, angle, and energy.",
  };

  const guidance = directionGuide[direction] ?? `Rewrite this caption to be: ${direction}. Keep the core message but change the style, tone, or structure to match.`;
  const platformHint = platform ? ` Optimized for ${platform}.` : "";

  const prompt = `You are the world's best social media copywriter. Remix this caption in one specific direction.

ORIGINAL CAPTION:
${caption}

REMIX DIRECTION: ${direction}
INSTRUCTION: ${guidance}${platformHint}

Rules:
- Keep the same core message and purpose as the original
- Apply the direction change fully — don't be timid about it
- The result must feel complete and publish-ready
- Keep platform-appropriate hashtags (update them if needed to match the new tone)
- Respond with valid JSON only

RESPOND IN THIS EXACT JSON FORMAT:
{
  "caption": "The remixed caption text here — no hashtags",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3"
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "You are the world's best social media copywriter. Always respond with valid JSON only — no markdown fences, no code blocks, no extra commentary.",
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let rawText = block.text.trim();
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) rawText = jsonMatch[1].trim();

    const parsed_response = JSON.parse(rawText) as { caption: string; hashtags: string };
    if (!parsed_response.caption) {
      res.status(500).json({ error: "Invalid AI response format" });
      return;
    }

    res.json(parsed_response);
  } catch (err) {
    req.log.error({ err }, "Caption remix failed");
    res.status(500).json({ error: "Failed to remix caption" });
  }
});

export default captionsRouter;
