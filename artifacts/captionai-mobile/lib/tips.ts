// Curated, research-backed social media tips for small business owners.
// Sources: Meta Business Insights, Sprout Social Index, HubSpot State of Marketing,
// LinkedIn Marketing Solutions, TikTok for Business.

export const tips: string[] = [
  // Instagram
  "Carousels get 3× more reach than single images on Instagram. Use them to share before/afters, tutorials, or multi-step tips.",
  "The first 125 characters of your Instagram caption show before 'more' — put your strongest hook there.",
  "Using 3–5 targeted hashtags now outperforms 30 generic ones since Instagram's 2023 algorithm update.",
  "Ending your caption with a question increases comments by up to 89%. Try 'What do you think?' or 'Tag someone who needs this.'",
  "Posting consistently at the same time trains Instagram's algorithm. Aim for 9–11am Tuesday–Friday for highest reach.",
  "Instagram Reels get 22% more engagement than standard video posts. Repurpose your TikTok content here too.",
  "Adding a location tag to your posts can increase engagement by 79% — always tag your city or venue.",

  // TikTok
  "TikTok's algorithm rewards watch-through rate above all else. A caption that teases what's coming ('wait for the ending') boosts completion.",
  "TikTok captions are most effective under 150 characters. Save the detail for your on-screen text or voiceover.",
  "The comment section is TikTok content. Reply to comments with a video reply to double your content output for free.",
  "TikTok posts between 7–9pm on weekdays consistently see 20–30% higher view counts for small business accounts.",

  // LinkedIn
  "LinkedIn posts with line breaks and white space get 3× more engagement than dense paragraphs. Break up every 1–2 sentences.",
  "The first 3 lines of a LinkedIn post are all that show before 'see more' — make them impossible to scroll past.",
  "Personal stories on LinkedIn get 3× more engagement than company announcements. Share your journey, not just your wins.",
  "Tuesday and Wednesday 8–10am are peak LinkedIn engagement windows. Schedule your best posts for then.",

  // Facebook
  "Facebook posts between 40–80 characters get 66% more engagement than longer posts. Short and sharp wins.",
  "Facebook video posts get 135% more organic reach than photo posts. Even a 30-second clip can dramatically boost visibility.",
  "The best time to post on Facebook for small businesses is 1–3pm Wednesday and 12–1pm Friday.",

  // General best practices
  "A clear call-to-action ('Save this for later,' 'Share with a friend who needs this') increases reshares by up to 89%.",
  "Consistency beats frequency every time. Posting 3× per week reliably outperforms 7× per week done inconsistently.",
  "User-generated content — reposting a customer photo or review — gets 4× higher click-through rates than brand-only content.",
  "Emojis in captions increase engagement by 17% on average. Use them to break up text and add personality, not just decoration.",
  "Captions that mention a specific emotion ('excited,' 'grateful,' 'can't stop thinking about') get 15–20% more shares.",
  "Optimal caption length by platform: Instagram 138–150 chars for discovery, Facebook under 80 chars, LinkedIn 25 words, X/Twitter 71–100 chars.",
];

/**
 * Returns a different tip each day, rotating through the full list.
 * The same tip shows all day so it feels intentional, not random.
 */
export function getTodaysTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return tips[dayOfYear % tips.length];
}
