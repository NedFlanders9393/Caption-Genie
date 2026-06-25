import { getDeviceId } from "./deviceId";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

const AI_TIMEOUT_MS = 30_000;

function authHeaders(token: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Headers for guest-accessible AI endpoints. Always includes the device id so
 * the server can track usage / enforce the free tier when no auth token is
 * present (guest mode — caption generation works without signing in).
 */
async function aiHeaders(token: string | null): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const deviceId = await getDeviceId();
    if (deviceId) headers["X-Device-Id"] = deviceId;
  } catch {
    // Device id is best-effort; signed-in requests still work via the token.
  }
  return headers;
}

/**
 * Thrown when the server rejects a paid action (HTTP 402) because the user is
 * out of credits. Callers can detect this with `instanceof` and open the
 * paywall instead of showing a generic error.
 */
export class InsufficientCreditsError extends Error {
  isPro: boolean;
  constructor(message: string, isPro = false) {
    super(message);
    this.name = "InsufficientCreditsError";
    this.isPro = isPro;
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = (err.message ?? "").toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("load failed") ||
      msg.includes("network request failed")
    );
  }
  return false;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = AI_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      throw new Error("Request timed out — the server is taking too long. Please try again.");
    }
    if (isNetworkError(err)) {
      throw new Error("No internet connection. Please check your network and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Safely parse a Response as JSON. If the body is empty or malformed,
// returns `null` instead of throwing — callers handle the null shape.
async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
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
  sampleCaptions?: string[];
  voiceDescription?: string;
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
  popular: string[];
  broad: string[];
}

export async function generateCaptions(params: CaptionParams, token: string | null = null): Promise<CaptionItem[]> {
  const res = await fetchWithTimeout(`${BASE}/api/captions/generate`, {
    method: "POST",
    headers: await aiHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    if (res.status === 402) {
      throw new InsufficientCreditsError(
        err?.message ?? "You're out of credits.",
        !!err?.isPro,
      );
    }
    throw new Error(err?.message ?? err?.error ?? "Failed to generate captions");
  }
  const data = await safeJson(res);
  if (!data || !Array.isArray(data.captions)) {
    throw new Error("Got an unexpected response from the server. Please try again.");
  }
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
  const res = await fetchWithTimeout(`${BASE}/api/captions/regenerate-one`, {
    method: "POST",
    headers: await aiHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    if (res.status === 402) {
      throw new InsufficientCreditsError(
        err?.message ?? "You're out of credits.",
        !!err?.isPro,
      );
    }
    throw new Error(err?.message ?? err?.error ?? "Failed to regenerate caption");
  }
  const data = await safeJson(res);
  if (!data || typeof data.caption !== "string") {
    throw new Error("Got an unexpected response from the server. Please try again.");
  }
  return data;
}

export async function remixCaption(
  params: { caption: string; direction: string; platform?: string },
  token: string | null = null
): Promise<CaptionItem> {
  const res = await fetchWithTimeout(`${BASE}/api/captions/remix`, {
    method: "POST",
    headers: await aiHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message ?? err?.error ?? "Failed to remix caption");
  }
  const data = await safeJson(res);
  if (!data || typeof data.caption !== "string") {
    throw new Error("Got an unexpected response from the server. Please try again.");
  }
  return data;
}

export async function fetchHistory(token: string | null = null): Promise<unknown[]> {
  if (!token || !BASE) return [];
  const res = await fetchWithTimeout(`${BASE}/api/history`, {
    method: "GET",
    headers: authHeaders(token),
  }, 10_000);
  if (!res.ok) return [];
  const data = await safeJson(res);
  return Array.isArray(data?.entries) ? data.entries : [];
}

export async function saveHistoryEntry(entry: unknown, token: string | null = null): Promise<void> {
  if (!token || !BASE) return;
  await fetchWithTimeout(`${BASE}/api/history`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  }, 10_000).catch(() => {});
}

export async function deleteHistoryEntry(id: string, token: string | null = null): Promise<void> {
  if (!token || !BASE) return;
  await fetchWithTimeout(`${BASE}/api/history/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }, 10_000).catch(() => {});
}

export async function clearHistoryRemote(token: string | null = null): Promise<void> {
  if (!token || !BASE) return;
  await fetchWithTimeout(`${BASE}/api/history/all`, {
    method: "DELETE",
    headers: authHeaders(token),
  }, 10_000).catch(() => {});
}

export async function fetchFavorites(token: string | null = null): Promise<unknown[]> {
  if (!token || !BASE) return [];
  const res = await fetchWithTimeout(`${BASE}/api/favorites`, {
    method: "GET",
    headers: authHeaders(token),
  }, 10_000);
  if (!res.ok) return [];
  const data = await safeJson(res);
  return Array.isArray(data?.entries) ? data.entries : [];
}

export async function saveFavoriteEntry(entry: unknown, token: string | null = null): Promise<void> {
  if (!token || !BASE) return;
  await fetchWithTimeout(`${BASE}/api/favorites`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  }, 10_000).catch(() => {});
}

export async function deleteFavoriteRemote(id: string, token: string | null = null): Promise<void> {
  if (!token || !BASE) return;
  await fetchWithTimeout(`${BASE}/api/favorites/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }, 10_000).catch(() => {});
}

// ─── Credits ─────────────────────────────────────────────────────────────

export interface CreditBalance {
  subscription: number;
  purchased: number;
  total: number;
  monthlyCreditsResetAt: string;
  lifetimeUsed: number;
  lifetimePurchased: number;
}

export interface CreditTransaction {
  id: number;
  delta: number;
  reason: string;
  bucket: string;
  source: string | null;
  balanceAfter: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function fetchCreditBalance(token: string | null): Promise<CreditBalance> {
  const res = await fetchWithTimeout(
    `${BASE}/api/credits/balance`,
    // Use aiHeaders (not authHeaders) so the X-Device-Id is included: guests
    // have no token and are identified purely by their device id.
    { method: "GET", headers: await aiHeaders(token) },
    10_000,
  );
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error ?? "Failed to fetch credit balance");
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from credit balance endpoint");
  return data as CreditBalance;
}

export async function fetchCreditTransactions(
  token: string | null,
  limit: number = 50,
): Promise<CreditTransaction[]> {
  const res = await fetchWithTimeout(
    `${BASE}/api/credits/transactions?limit=${limit}`,
    { method: "GET", headers: authHeaders(token) },
    10_000,
  );
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error ?? "Failed to fetch credit transactions");
  }
  const data = await safeJson(res);
  return (data?.transactions ?? []) as CreditTransaction[];
}

// ─── Device Free Credits ──────────────────────────────────────────────────

export interface ClaimFreeResult {
  granted: number;
  alreadyClaimed: boolean;
  blockedReason?: string;
}

/**
 * Claim the one-time free signup bonus for this device.
 * Safe to call on every sign-in — idempotent on the server.
 * Silently succeeds even if the device already claimed or is blocked.
 */
export async function claimFreeCreditsForDevice(
  deviceId: string,
  token: string | null,
): Promise<ClaimFreeResult> {
  if (!token || !BASE) return { granted: 0, alreadyClaimed: false };
  const res = await fetchWithTimeout(
    `${BASE}/api/credits/claim-free`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ deviceId }),
    },
    10_000,
  );
  if (!res.ok) return { granted: 0, alreadyClaimed: false };
  const data = await safeJson(res);
  return data ?? { granted: 0, alreadyClaimed: false };
}

// ─── Account ──────────────────────────────────────────────────────────────

/**
 * Permanently delete the signed-in user's account and all server-side data.
 * Required by Apple for apps that support account creation.
 */
export async function deleteAccount(token: string | null): Promise<void> {
  if (!token || !BASE) {
    throw new Error("You must be signed in to delete your account.");
  }
  const res = await fetchWithTimeout(
    `${BASE}/api/account`,
    { method: "DELETE", headers: authHeaders(token) },
    15_000,
  );
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error ?? "Failed to delete account. Please try again.");
  }
}

export async function generateHashtags(
  params: HashtagParams,
  token: string | null = null
): Promise<{ hashtags: string[]; grouped: HashtagGroups }> {
  const res = await fetchWithTimeout(`${BASE}/api/captions/hashtags`, {
    method: "POST",
    headers: await aiHeaders(token),
    body: JSON.stringify(params),
    // Hashtags are faster, but still give a reasonable window
  }, 20_000);
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message ?? err?.error ?? "Failed to generate hashtags");
  }
  const data = await safeJson(res);
  if (!data || !data.grouped) {
    throw new Error("Got an unexpected response from the server. Please try again.");
  }
  return data;
}
