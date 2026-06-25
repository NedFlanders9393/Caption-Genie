/**
 * Local push notification helpers for Captly.
 *
 * All notifications are scheduled locally — no push server required.
 * Works in production builds only; silently no-ops in Expo Go.
 *
 * Notification types:
 *   1. Daily streak reminder (9 PM) — keeps users coming back
 *   2. Low usage warning — fires when free users have ≤ 3 captions left
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── IDs used to cancel / replace specific notifications ───────────────────────
const STREAK_NOTIF_ID_KEY = "inkwell:streakNotifId";
const LOW_USAGE_NOTIF_ID = "inkwell-low-usage";

// Configure how notifications appear when the app is in the foreground.
// IMPORTANT: This is called lazily (not at module load) because on iOS 26 beta,
// invoking this synchronous TurboModule at app startup can throw an NSException
// before any JS try/catch fires, aborting the process.
let notificationHandlerConfigured = false;
function ensureNotificationHandler(): void {
  if (notificationHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  } catch {
    // Best-effort: ignore handler setup errors so the app keeps running
  }
}

// ── Permissions ───────────────────────────────────────────────────────────────

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 * Safe to call multiple times — won't show the dialog again if already decided.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureNotificationHandler();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Check if notifications are currently allowed without prompting.
 */
export async function notificationsEnabled(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ── Streak reminder ───────────────────────────────────────────────────────────

const STREAK_MESSAGES = [
  { title: "Keep your streak alive 🔥", body: "Open Captly and write a caption to keep your momentum going." },
  { title: "Don't break the chain ✍️", body: "Your streak is waiting. Pop in and generate a caption today." },
  { title: "Your audience is waiting 📲", body: "Take 60 seconds to create a caption. Your streak stays alive." },
  { title: "Small habits, big results 💡", body: "One caption a day keeps the blank page away. Open Captly." },
];

/**
 * Schedule (or re-schedule) the daily streak reminder for 9 PM tonight.
 * Cancels any existing streak notification first.
 */
export async function scheduleDailyStreakReminder(streakDays: number): Promise<void> {
  if (!(await notificationsEnabled())) return;
  ensureNotificationHandler();

  // Cancel the previous one
  await Notifications.cancelAllScheduledNotificationsAsync();

  const msg = STREAK_MESSAGES[streakDays % STREAK_MESSAGES.length]!;

  // Schedule for 9 PM today (or 9 PM tomorrow if it's already past 9 PM)
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(21, 0, 0, 0);
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      sound: false,
      data: { type: "streak_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

// ── Low usage warning ─────────────────────────────────────────────────────────

/**
 * Schedule a one-time notification when the user is running low on free captions.
 * Only fires once per month (cancels existing before scheduling).
 */
export async function scheduleLowUsageWarning(remaining: number): Promise<void> {
  if (!(await notificationsEnabled())) return;
  ensureNotificationHandler();

  // Cancel any existing low-usage notification
  await Notifications.cancelScheduledNotificationAsync(LOW_USAGE_NOTIF_ID).catch(() => {});

  const body =
    remaining === 1
      ? "You have 1 caption left this month. Upgrade to Pro for 150 captions a month."
      : `You have ${remaining} captions left this month. Upgrade to Pro to keep going.`;

  // Fire after a 10-second delay so it feels like a real push
  await Notifications.scheduleNotificationAsync({
    identifier: LOW_USAGE_NOTIF_ID,
    content: {
      title: "Running low on captions ⚡",
      body,
      sound: false,
      data: { type: "low_usage" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });
}

// ── Cancel all ────────────────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
