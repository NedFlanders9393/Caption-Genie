const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

export interface BrandVoice {
  brandName?: string;
  personality?: string[];
  targetAudience?: string;
  alwaysInclude?: string;
  neverSay?: string;
}

export interface CaptionParams {
  niche: string;
  postDescription: string;
  tone: string;
  platform?: string;
  postType?: string;
  captionLength?: string;
  includeEmojis?: boolean;
  ctaType?: string;
  brandVoice?: BrandVoice;
}

export interface CaptionItem {
  caption: string;
  hashtags: string;
}

export interface MultiPlatformResult {
  platform: string;
  captions: CaptionItem[];
}

export interface HashtagParams {
  niche: string;
  topic: string;
  platform?: string;
}

export interface HashtagGroups {
  niche: string[];
  trending: string[];
  broad: string[];
}

export async function generateCaptions(params: CaptionParams): Promise<CaptionItem[]> {
  const res = await fetch(`${BASE}/api/captions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to generate captions");
  }
  const data = await res.json();
  return data.captions;
}

export async function generateMultiPlatform(
  params: Omit<CaptionParams, "platform">
): Promise<MultiPlatformResult[]> {
  const platforms = ["Instagram", "TikTok", "Facebook", "LinkedIn"];
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const captions = await generateCaptions({ ...params, platform });
      return { platform, captions };
    })
  );
  return results;
}

export async function regenerateOneCaption(
  params: CaptionParams & { existingCaptions: string[] }
): Promise<CaptionItem> {
  const res = await fetch(`${BASE}/api/captions/regenerate-one`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to regenerate caption");
  }
  return res.json();
}

export async function generateHashtags(
  params: HashtagParams
): Promise<{ hashtags: string[]; grouped: HashtagGroups }> {
  const res = await fetch(`${BASE}/api/captions/hashtags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to generate hashtags");
  }
  return res.json();
}
