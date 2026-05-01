import AsyncStorage from "@react-native-async-storage/async-storage";

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
