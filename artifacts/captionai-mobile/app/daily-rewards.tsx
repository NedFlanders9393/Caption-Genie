import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import {
  fetchCheckinStatus,
  claimDailyCheckin,
  AlreadyClaimedError,
  type CheckinStatus,
} from "@/lib/api";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarCell {
  key: string;
  day: number | null;
  date: string | null; // YYYY-MM-DD
  claimed: boolean;
  isToday: boolean;
  missed: boolean;
}

function buildCalendar(status: CheckinStatus): CalendarCell[] {
  const [y, m] = status.todayUtc.split("-").map(Number);
  const year = y!;
  const month = m!; // 1-based
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay: 0=Sun..6=Sat → convert to Mon-first index 0..6
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const claimedSet = new Set(status.claimedDatesThisMonth);
  const todayDay = Number(status.todayUtc.slice(8, 10));

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ key: `blank-${i}`, day: null, date: null, claimed: false, isToday: false, missed: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const claimed = claimedSet.has(date);
    cells.push({
      key: date,
      day: d,
      date,
      claimed,
      isToday: d === todayDay,
      missed: d < todayDay && !claimed,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-${cells.length}`, day: null, date: null, claimed: false, isToday: false, missed: false });
  }
  return cells;
}

export default function DailyRewardsScreen() {
  const colors = useColors();
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = isSignedIn ? await getToken() : null;
      const s = await fetchCheckinStatus(token);
      setStatus(s);
    } catch (err) {
      setError((err as Error)?.message ?? "Couldn't load your rewards. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  const onClaim = useCallback(async () => {
    if (!status || status.claimedToday || claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const token = isSignedIn ? await getToken() : null;
      const result = await claimDailyCheckin(token);
      if (Platform.OS !== "web") {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
      setJustClaimed(result.granted);
      setStatus(result.status);
    } catch (err) {
      if (err instanceof AlreadyClaimedError) {
        // Refresh — the server says today is already claimed
        await load();
      } else {
        setError((err as Error)?.message ?? "Couldn't claim your reward. Please try again.");
      }
    } finally {
      setClaiming(false);
    }
  }, [status, claiming, getToken, isSignedIn, load]);

  const cells = useMemo(() => (status ? buildCalendar(status) : []), [status]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Streak headline */}
      <View style={styles.streakHeader}>
        <View style={[styles.flameWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="zap" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.streakTitle, { color: colors.foreground }]}>
            {status && status.currentStreak > 0
              ? `${status.currentStreak}-day streak`
              : "Start your streak"}
          </Text>
          <Text style={[styles.streakSub, { color: colors.mutedForeground }]}>
            Check in daily to earn free credits. Day 7 pays a weekly bonus!
          </Text>
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBox, { borderRadius: colors.radius }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} hitSlop={10}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* This month calendar */}
      {status ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>THIS MONTH</Text>
          <View style={styles.dowRow}>
            {DOW_LABELS.map((d) => (
              <Text key={d} style={[styles.dowText, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell) => (
              <View key={cell.key} style={styles.cellWrap}>
                {cell.day === null ? null : (
                  <View
                    style={[
                      styles.cell,
                      cell.claimed && { backgroundColor: colors.secondary },
                      cell.isToday && !cell.claimed && { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  >
                    {cell.claimed ? (
                      <Feather name="check" size={14} color={colors.primary} />
                    ) : (
                      <Text
                        style={[
                          styles.cellText,
                          { color: cell.missed ? "#C9BEB2" : colors.foreground },
                          cell.isToday && { color: colors.primary, fontFamily: "Nunito_700Bold" },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <Feather name="check" size={12} color={colors.primary} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Checked in</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { borderColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Today</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Up next — 7-day reward schedule */}
      {status ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>UP NEXT</Text>
          {status.rewards.map((reward, i) => {
            const dayNum = i + 1;
            const isNext = !status.claimedToday && dayNum === status.nextStreakDay;
            const isDone =
              status.currentStreak > 0 &&
              (status.claimedToday ? dayNum <= status.currentStreak : dayNum < status.nextStreakDay);
            return (
              <View
                key={dayNum}
                style={[
                  styles.rewardRow,
                  { borderRadius: colors.radius / 1.5 },
                  isNext && { backgroundColor: colors.secondary },
                ]}
              >
                <View
                  style={[
                    styles.dayBadge,
                    { backgroundColor: isNext ? colors.primary : "#F1EAE0" },
                  ]}
                >
                  {isDone ? (
                    <Feather name="check" size={12} color={colors.primary} />
                  ) : (
                    <Text style={[styles.dayBadgeText, { color: isNext ? "#fff" : colors.mutedForeground }]}>
                      {dayNum}
                    </Text>
                  )}
                </View>
                <Text style={[styles.rewardLabel, { color: colors.foreground }]}>
                  {isNext ? "Next claim" : `Day ${dayNum}`}
                  {dayNum === 7 ? "  ·  Weekly bonus" : ""}
                </Text>
                <View style={styles.rewardAmount}>
                  <Feather name="zap" size={13} color={colors.primary} />
                  <Text style={[styles.rewardAmountText, { color: colors.primary }]}>+{reward}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Claim button */}
      {status ? (
        status.claimedToday ? (
          <View style={[styles.claimedBox, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
            <Feather name="check-circle" size={18} color={colors.primary} />
            <Text style={[styles.claimedText, { color: colors.foreground }]}>
              {justClaimed
                ? `+${justClaimed} credit${justClaimed === 1 ? "" : "s"} claimed! Come back tomorrow.`
                : "Claimed for today — come back tomorrow!"}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.claimButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={onClaim}
            disabled={claiming}
            activeOpacity={0.85}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#fff" />
                <Text style={styles.claimButtonText}>
                  Claim +{status.nextReward} credit{status.nextReward === 1 ? "" : "s"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )
      ) : null}

      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
        Days reset at midnight UTC. Miss a day and your streak starts over.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  streakHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  flameWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  streakTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20 },
  streakSub: { fontFamily: "Nunito_500Medium", fontSize: 13, marginTop: 2 },
  errorBox: {
    backgroundColor: "#FDECEC",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorText: { color: "#B3261E", fontFamily: "Nunito_500Medium", fontSize: 13, flex: 1 },
  retryText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  card: { borderWidth: 1, padding: 16 },
  cardLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  dowRow: { flexDirection: "row", marginBottom: 6 },
  dowText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 4,
  },
  cell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: { fontFamily: "Nunito_600SemiBold", fontSize: 13 },
  legendRow: { flexDirection: "row", gap: 18, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  legendText: { fontFamily: "Nunito_500Medium", fontSize: 11 },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  dayBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  rewardLabel: { flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 14 },
  rewardAmount: { flexDirection: "row", alignItems: "center", gap: 4 },
  rewardAmountText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  claimButtonText: { color: "#fff", fontFamily: "Nunito_800ExtraBold", fontSize: 16 },
  claimedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  claimedText: { fontFamily: "Nunito_700Bold", fontSize: 14, flexShrink: 1 },
  footnote: {
    fontFamily: "Nunito_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
