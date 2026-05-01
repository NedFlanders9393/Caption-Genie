const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface BrandVoice {
  brandName?: string;
  tagline?: string;
  personality?: string[];
  targetAudience?: string;
  captionStyle?: string[];
  alwaysInclude?: string;
  neverSay?: string;
  sampleCaption?: string;
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

export async function generateCaptions(params: CaptionParams, token: string | null = null): Promise<CaptionItem[]> {
  const res = await fetch(`${BASE}/api/captions/generate`, {
    method: "POST",
    headers: authHeaders(token),
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
  params: Omit<CaptionParams, "platform">,
  platforms: string[],
  token: string | null = null
): Promise<MultiPlatformResult[]> {
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const captions = await generateCaptions({ ...params, platform }, token);
      return { platform, captions };
    })
  );
  return results;
}

export async function regenerateOneCaption(
  params: CaptionParams & { existingCaptions: string[] },
  token: string | null = null
): Promise<CaptionItem> {
  const res = await fetch(`${BASE}/api/captions/regenerate-one`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to regenerate caption");
  }
  return res.json();
}

export async function remixCaption(
  params: { caption: string; direction: string; platform?: string },
  token: string | null = null
): Promise<CaptionItem> {
  const res = await fetch(`${BASE}/api/captions/remix`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to remix caption");
  }
  return res.json();
}

export async function generateHashtags(
  params: HashtagParams,
  token: string | null = null
): Promise<{ hashtags: string[]; grouped: HashtagGroups }> {
  const res = await fetch(`${BASE}/api/captions/hashtags`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to generate hashtags");
  }
  return res.json();
}
