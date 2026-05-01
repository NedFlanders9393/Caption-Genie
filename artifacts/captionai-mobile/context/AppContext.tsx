import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/expo";
import {
  getHistory,
  addHistory,
  deleteHistoryEntry,
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
  const isBetaTester = BETA_TESTERS.includes(
    (user?.primaryEmailAddress?.emailAddress ?? "").toLowerCase()
  );

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  const loadData = useCallback(async () => {
    const [h, u, s, f] = await Promise.all([
      getHistory(),
      getUsageCount(),
      getStreak(),
      getFavorites(),
    ]);
    setHistory(h);
    setUsageCount(u);
    setStreak(s);
    setFavorites(f);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToHistory = useCallback(async (entry: HistoryEntry) => {
    await addHistory(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    await deleteHistoryEntry(id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const wipeHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
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
