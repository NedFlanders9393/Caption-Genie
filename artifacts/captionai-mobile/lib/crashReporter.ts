/**
 * Captly crash analytics — uses the existing /api/bugs infrastructure.
 *
 * Features:
 *   1. Hooks React Native's global JS error handler (catches unhandled crashes)
 *   2. Reports caught React render errors via ErrorBoundary.onError
 *   3. Queues crashes locally when offline; flushes on next launch
 *   4. Deduplicates: same error within 60 s is only sent once
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const QUEUE_KEY = "inkwell:crash_queue";
const MAX_QUEUE = 20;
const DEDUP_MS = 60_000; // suppress duplicate errors within 60 s

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueuedCrash {
  id: string;
  message: string;
  stack: string;
  context: string;
  platform: string;
  timestamp: number;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

const recentMessages = new Map<string, number>();

function isDuplicate(message: string): boolean {
  const last = recentMessages.get(message);
  if (last && Date.now() - last < DEDUP_MS) return true;
  recentMessages.set(message, Date.now());
  return false;
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedCrash[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedCrash[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE)));
  } catch {}
}

async function enqueue(crash: QueuedCrash): Promise<void> {
  const queue = await loadQueue();
  queue.unshift(crash);
  await saveQueue(queue);
}

// ── Send to API ───────────────────────────────────────────────────────────────

async function sendCrash(crash: QueuedCrash): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/bugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `[CRASH] ${crash.message}`,
        expectedBehavior: crash.stack || "(no stack trace)",
        screen: crash.context || "unknown",
        platform: crash.platform,
        // appVersion: crash.appVersion, (add when expo-constants is imported)
        type: "crash",
      }),
    });
    return res.ok;
  } catch {
    return false; // offline or server unreachable — will retry on next launch
  }
}

// ── Flush queued crashes from previous sessions ───────────────────────────────

export async function flushPendingCrashes(): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  const remaining: QueuedCrash[] = [];
  for (const crash of queue) {
    const sent = await sendCrash(crash);
    if (!sent) remaining.push(crash);
  }
  await saveQueue(remaining);
}

// ── Core report function ──────────────────────────────────────────────────────

export async function reportCrash(
  error: unknown,
  context = "unknown"
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message || "Unknown error";

  if (isDuplicate(message)) return;

  const crash: QueuedCrash = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    stack: err.stack ?? "",
    context,
    platform: Platform.OS,
    timestamp: Date.now(),
  };

  // Try to send immediately; if it fails, queue it for next launch
  const sent = await sendCrash(crash);
  if (!sent) {
    await enqueue(crash);
  }
}

// ── Global JS error handler ───────────────────────────────────────────────────

/**
 * Call once at app startup to catch all unhandled JS exceptions.
 * On web this is a no-op because ErrorUtils is native-only.
 */
export function initGlobalCrashHandler(): void {
  if (Platform.OS === "web") return;

  const ErrorUtils = (global as any).ErrorUtils;
  if (!ErrorUtils) return;

  const previousHandler = ErrorUtils.getGlobalHandler?.() as
    | ((error: Error, isFatal: boolean) => void)
    | null;

  ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
    reportCrash(error, isFatal ? "fatal" : "unhandled-error").catch(() => {});
    // Always call the original handler so React Native still shows its red screen in dev
    if (previousHandler) previousHandler(error, isFatal);
  });
}
