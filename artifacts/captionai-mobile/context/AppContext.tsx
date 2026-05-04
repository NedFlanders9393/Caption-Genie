import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useUser, useSession } from "@clerk/expo";
import {
  getHistory,
  addHistory,
  deleteHistoryEntry as deleteHistoryLocal,
  clearHistory,
  getUsageCount,
  incrementUsage,
  getStreak,
  updateStreak,
  FREE_LIMIT,
  getFavorites,
  addFavorite,
  removeFavorite,
  type HistoryEntry,
  type FavoriteEntry,
} from "@/lib/storage";
import {
  fetchHistory,
  saveHistoryEntry,
  deleteHistoryEntry as deleteHistoryRemote,
  clearHistoryRemote,
} from "@/lib/api";
import {
  scheduleDailyStreakReminder,
  scheduleLowUsageWarning,
  notificationsEnabled,
} from "@/lib/notifications";

const BETA_TESTERS = [
  "atlanta@imcmanagement.net",
];

interface AppContextValue {
  history: HistoryEntry[];
  usageCount: number;
  freeLimit: number;
  isOverLimit: boolean;
  streak: number;
  favorites: FavoriteEntry[];
  toggleFavorite: (entry: FavoriteEntry) => Promise<void>;
  isFavorited: (id: string) => boolean;
  addToHistory: (entry: HistoryEntry) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  wipeHistory: () => Promise<void>;
  consumeGeneration: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { session } = useSession();
  const isBetaTester = BETA_TESTERS.includes(
    (user?.primaryEmailAddress?.emailAddress ?? "").toLowerCase()
  );

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const tokenRef = useRef<string | null>(null);

  // Keep a fresh token in a ref so callbacks can use it without stale closure issues
  useEffect(() => {
    if (!session) { tokenRef.current = null; return; }
    session.getToken().then((t) => { tokenRef.current = t; }).catch(() => {});
  }, [session]);

  const loadData = useCallback(async () => {
    const token = session ? await session.getToken().catch(() => null) : null;
    tokenRef.current = token;

    const [localHistory, u, s, f, remoteEntries] = await Promise.all([
      getHistory(),
      getUsageCount(),
      getStreak(),
      getFavorites(),
      fetchHistory(token),
    ]);

    // Merge: remote is source of truth, but keep any local entries not yet synced
    if (remoteEntries.length > 0) {
      const remoteIds = new Set((remoteEntries as HistoryEntry[]).map((e) => e.id));
      const localOnly = localHistory.filter((e) => !remoteIds.has(e.id));
      // Upload local-only entries to server in background
      localOnly.forEach((e) => saveHistoryEntry(e, token).catch(() => {}));
      const merged = [...(remoteEntries as HistoryEntry[]), ...localOnly]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 200);
      // Persist merged list locally
      await clearHistory();
      for (const entry of merged) await addHistory(entry);
      setHistory(merged);
    } else {
      setHistory(localHistory);
    }

    setUsageCount(u);
    setStreak(s);
    setFavorites(f);
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToHistory = useCallback(async (entry: HistoryEntry) => {
    await addHistory(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 200));
    saveHistoryEntry(entry, tokenRef.current).catch(() => {});
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    await deleteHistoryLocal(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
    deleteHistoryRemote(id, tokenRef.current).catch(() => {});
  }, []);

  const wipeHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
    clearHistoryRemote(tokenRef.current).catch(() => {});
  }, []);

  const refreshUsage = useCallback(async () => {
    const u = await getUsageCount();
    setUsageCount(u);
  }, []);

  const toggleFavorite = useCallback(async (entry: FavoriteEntry) => {
    const alreadySaved = favorites.some((f) => f.id === entry.id);
    if (alreadySaved) {
      await removeFavorite(entry.id);
      setFavorites((prev) => prev.filter((f) => f.id !== entry.id));
    } else {
      await addFavorite(entry);
      setFavorites((prev) => [entry, ...prev]);
    }
  }, [favorites]);

  const isFavorited = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const consumeGeneration = useCallback(async (): Promise<boolean> => {
    if (isBetaTester) {
      const s = await updateStreak();
      setStreak(s);
      // Schedule streak reminder if notifications are on
      notificationsEnabled().then((ok) => {
        if (ok) scheduleDailyStreakReminder(s);
      });
      return true;
    }
    if (usageCount >= FREE_LIMIT) return false;
    const [next, s] = await Promise.all([incrementUsage(), updateStreak()]);
    setUsageCount(next);
    setStreak(s);
    // Schedule streak reminder (fire-and-forget)
    notificationsEnabled().then((ok) => {
      if (ok) scheduleDailyStreakReminder(s);
    });
    // Warn when 3 captions or 1 caption remain on the free plan
    const remaining = FREE_LIMIT - next;
    if (remaining === 3 || remaining === 1) {
      notificationsEnabled().then((ok) => {
        if (ok) scheduleLowUsageWarning(remaining);
      });
    }
    return true;
  }, [usageCount, isBetaTester]);

  const isOverLimit = isBetaTester ? false : usageCount >= FREE_LIMIT;

  return (
    <AppContext.Provider
      value={{
        history,
        usageCount,
        freeLimit: FREE_LIMIT,
        isOverLimit,
        streak,
        favorites,
        toggleFavorite,
        isFavorited,
        addToHistory,
        removeFromHistory,
        wipeHistory,
        consumeGeneration,
        refreshUsage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
