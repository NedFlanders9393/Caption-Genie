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
  type HistoryEntry,
} from "@/lib/storage";

const BETA_TESTERS = [
  "atlanta@imcmanagement.net",
];

interface AppContextValue {
  history: HistoryEntry[];
  usageCount: number;
  freeLimit: number;
  isOverLimit: boolean;
  streak: number;
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

  const loadData = useCallback(async () => {
    const [h, u, s] = await Promise.all([getHistory(), getUsageCount(), getStreak()]);
    setHistory(h);
    setUsageCount(u);
    setStreak(s);
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

  const consumeGeneration = useCallback(async (): Promise<boolean> => {
    if (isBetaTester) {
      // Still track streak for beta testers
      const s = await updateStreak();
      setStreak(s);
      return true;
    }
    if (usageCount >= FREE_LIMIT) return false;
    const [next, s] = await Promise.all([incrementUsage(), updateStreak()]);
    setUsageCount(next);
    setStreak(s);
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
