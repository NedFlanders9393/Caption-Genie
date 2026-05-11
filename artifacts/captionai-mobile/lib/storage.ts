import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Onboarding ────────────────────────────────────────────────────────────────
export const ONBOARDING_KEY = "inkwell_onboarding_done";

// ── Streak tracking ──────────────────────────────────────────────────────────

const STREAK_KEY = "inkwell:streak";
const LAST_ACTIVE_KEY = "inkwell:lastActiveDate";

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayString(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

export async function getStreak(): Promise<number> {
  const [streakStr, lastActive] = await Promise.all([
    AsyncStorage.getItem(STREAK_KEY),
    AsyncStorage.getItem(LAST_ACTIVE_KEY),
  ]);
  const streak = streakStr ? parseInt(streakStr, 10) : 0;
  const today = todayString();
  const yesterday = yesterdayString();
  // Streak expired if last active was before yesterday
  if (lastActive && lastActive !== today && lastActive !== yesterday) {
    return 0;
  }
  return streak;
}

export async function updateStreak(): Promise<number> {
  const today = todayString();
  const yesterday = yesterdayString();
  const [streakStr, lastActive] = await Promise.all([
    AsyncStorage.getItem(STREAK_KEY),
    AsyncStorage.getItem(LAST_ACTIVE_KEY),
  ]);
  const currentStreak = streakStr ? parseInt(streakStr, 10) : 0;

  // Already updated today — no change
  if (lastActive === today) return currentStreak;

  const newStreak = lastActive === yesterday ? currentStreak + 1 : 1;
  await Promise.all([
    AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
    AsyncStorage.setItem(LAST_ACTIVE_KEY, today),
  ]);
  return newStreak;
}

// ── History + Usage ──────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  createdAt: number;
  params: {
    niche: string;
    postDescription: string;
    tone: string;
    platform?: string;
    postType?: string;
    captionLength?: string;
  };
  captions: { caption: string; hashtags: string }[];
  multiPlatformResults?: { platform: string; captions: { caption: string; hashtags: string }[] }[];
}

const HISTORY_KEY = "captionai:history";
const USAGE_KEY = "captionai:usage";
const USAGE_MONTH_KEY = "captionai:usage_month";

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  const existing = await getHistory();
  const updated = [entry, ...existing].slice(0, 200);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const existing = await getHistory();
  const updated = existing.filter((e) => e.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

/** Atomically replace the entire history list (used for merges to avoid N writes). */
export async function setHistory(entries: HistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 200)));
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export async function getUsageCount(): Promise<number> {
  const month = getCurrentMonth();
  const storedMonth = await AsyncStorage.getItem(USAGE_MONTH_KEY);
  if (storedMonth !== month) {
    await AsyncStorage.setItem(USAGE_MONTH_KEY, month);
    await AsyncStorage.setItem(USAGE_KEY, "0");
    return 0;
  }
  const count = await AsyncStorage.getItem(USAGE_KEY);
  return count ? parseInt(count, 10) : 0;
}

export async function incrementUsage(): Promise<number> {
  const current = await getUsageCount();
  const next = current + 1;
  await AsyncStorage.setItem(USAGE_KEY, String(next));
  return next;
}

export const FREE_LIMIT = 10;

// ── Hashtag History ───────────────────────────────────────────────────────────

export interface HashtagHistoryEntry {
  id: string;
  createdAt: number;
  params: { niche: string; topic: string; platform: string };
  grouped: { niche: string[]; popular: string[]; broad: string[] };
}

const HASHTAG_HISTORY_KEY = "captionai:hashtag_history";
const HASHTAG_HISTORY_LIMIT = 10;

export async function getHashtagHistory(): Promise<HashtagHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HASHTAG_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addHashtagHistory(entry: HashtagHistoryEntry): Promise<void> {
  const existing = await getHashtagHistory();
  const deduped = existing.filter((e) => e.id !== entry.id);
  const updated = [entry, ...deduped].slice(0, HASHTAG_HISTORY_LIMIT);
  await AsyncStorage.setItem(HASHTAG_HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHashtagHistory(): Promise<void> {
  await AsyncStorage.removeItem(HASHTAG_HISTORY_KEY);
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoriteEntry {
  id: string;            // stable unique ID — historyEntryId_captionIndex or content hash
  caption: string;
  hashtags: string;
  platform?: string;
  niche?: string;
  savedAt: number;
}

const FAVORITES_KEY = "inkwell:favorites";

export async function getFavorites(): Promise<FavoriteEntry[]> {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addFavorite(entry: FavoriteEntry): Promise<void> {
  const existing = await getFavorites();
  if (existing.some((e) => e.id === entry.id)) return; // already saved
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([entry, ...existing]));
}

export async function removeFavorite(id: string): Promise<void> {
  const existing = await getFavorites();
  await AsyncStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(existing.filter((e) => e.id !== id))
  );
}

export async function isFavorite(id: string): Promise<boolean> {
  const existing = await getFavorites();
  return existing.some((e) => e.id === id);
}

/** Atomically replace the entire favorites list. Used for remote/local merges. */
export async function setFavorites(entries: FavoriteEntry[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(entries));
}
