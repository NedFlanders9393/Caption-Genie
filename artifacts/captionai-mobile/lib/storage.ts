import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Streak tracking ──────────────────────────────────────────────────────────

const STREAK_KEY = "quill:streak";
const LAST_ACTIVE_KEY = "quill:lastActiveDate";

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
  const updated = [entry, ...existing].slice(0, 100);
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
