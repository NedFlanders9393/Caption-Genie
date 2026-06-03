import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useUser, useSession } from "@clerk/expo";
import {
  getHistory,
  addHistory,
  setHistory as setHistoryLocal,
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
  setFavorites as setFavoritesLocal,
  clearHashtagHistory,
  type HistoryEntry,
  type FavoriteEntry,
} from "@/lib/storage";
import {
  fetchHistory,
  saveHistoryEntry,
  deleteHistoryEntry as deleteHistoryRemote,
  clearHistoryRemote,
  fetchFavorites,
  saveFavoriteEntry,
  deleteFavoriteRemote,
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
  wipeAllUserData: () => Promise<void>;
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

    // Local reads must always succeed; remote reads are best-effort and
    // are isolated with `allSettled` so a single network failure can't
    // prevent local hydration on cold start (especially offline).
    const [localHistoryRes, uRes, sRes, localFavsRes, remoteEntriesRes, remoteFavsRes] = await Promise.allSettled([
      getHistory(),
      getUsageCount(),
      getStreak(),
      getFavorites(),
      fetchHistory(token),
      fetchFavorites(token),
    ]);

    const localHistory = localHistoryRes.status === "fulfilled" ? localHistoryRes.value : [];
    const u = uRes.status === "fulfilled" ? uRes.value : 0;
    const s = sRes.status === "fulfilled" ? sRes.value : 0;
    const localFavs = localFavsRes.status === "fulfilled" ? localFavsRes.value : [];
    const remoteEntries = remoteEntriesRes.status === "fulfilled" ? remoteEntriesRes.value : [];
    const remoteFavs = remoteFavsRes.status === "fulfilled" ? remoteFavsRes.value : [];

    // Merge caption history: union of remote + local; upload local-only either way
    // so reinstall / device-switch never loses prior local history.
    const remoteHistoryIds = new Set((remoteEntries as HistoryEntry[]).map((e) => e.id));
    const localOnlyHistory = localHistory.filter((e) => !remoteHistoryIds.has(e.id));
    if (token) {
      localOnlyHistory.forEach((e) => saveHistoryEntry(e, token).catch(() => {}));
    }
    const mergedHistory = [...(remoteEntries as HistoryEntry[]), ...localOnlyHistory]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
    if (mergedHistory.length > 0 && remoteEntries.length > 0) {
      // Persist the merged remote-truth view locally so we hydrate fast next launch
      await setHistoryLocal(mergedHistory).catch(() => {});
    }
    setHistory(mergedHistory);

    // Merge favorites: same union rule, and persist merged set locally.
    const remoteFavIds = new Set((remoteFavs as FavoriteEntry[]).map((e) => e.id));
    const localOnlyFavs = localFavs.filter((e) => !remoteFavIds.has(e.id));
    if (token) {
      localOnlyFavs.forEach((e) => saveFavoriteEntry(e, token).catch(() => {}));
    }
    const mergedFavs = [...(remoteFavs as FavoriteEntry[]), ...localOnlyFavs]
      .sort((a, b) => b.savedAt - a.savedAt);
    if (remoteFavs.length > 0) {
      await setFavoritesLocal(mergedFavs).catch(() => {});
    }
    setFavorites(mergedFavs);

    setUsageCount(u);
    setStreak(s);
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

  /**
   * Clears ALL locally-cached user content (history, favorites, hashtag
   * history) and resets in-memory state. Used by account deletion so that
   * deleted-account data cannot be re-uploaded to a different account if
   * someone signs in on the same device afterward. Local-only; the server
   * has already wiped its rows by the time this runs.
   */
  const wipeAllUserData = useCallback(async () => {
    await Promise.allSettled([
      clearHistory(),
      setFavoritesLocal([]),
      clearHashtagHistory(),
    ]);
    setHistory([]);
    setFavorites([]);
    setUsageCount(0);
    setStreak(0);
  }, []);

  const toggleFavorite = useCallback(async (entry: FavoriteEntry) => {
    const alreadySaved = favorites.some((f) => f.id === entry.id);
    if (alreadySaved) {
      await removeFavorite(entry.id);
      setFavorites((prev) => prev.filter((f) => f.id !== entry.id));
      deleteFavoriteRemote(entry.id, tokenRef.current).catch(() => {});
    } else {
      await addFavorite(entry);
      setFavorites((prev) => [entry, ...prev]);
      saveFavoriteEntry(entry, tokenRef.current).catch(() => {});
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
        wipeAllUserData,
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
