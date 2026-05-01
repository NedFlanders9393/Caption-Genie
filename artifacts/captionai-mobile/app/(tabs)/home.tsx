import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import { useApp } from "@/context/AppContext";
import { getTodaysTip } from "@/lib/tips";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFDF9",
  card: "#FFFFFF",
  darkTile: "#3A3129",
  amber: "#E8B669",
  amberLight: "#FDF3E3",
  flame: "#E8824A",
  tipBg: "#F8EFE4",
  tipBorder: "#F0E3D3",
  textPrimary: "#3A3129",
  textSecondary: "#5D5045",
  textMuted: "#8C7A6B",
  textFaint: "#B0A090",
  border: "#F0E3D3",
  pillBg: "#F5EDE4",
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  TikTok: "#010101",
  Facebook: "#1877F2",
  LinkedIn: "#0A66C2",
  "Twitter/X": "#000000",
};

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { history, streak } = useApp();

  const firstName = user?.firstName ?? user?.username ?? "there";
  const avatarUrl = user?.imageUrl;
  const tip = useMemo(() => getTodaysTip(), []);
  const recentItems = history.slice(0, 2);

  async function copyCaption(text: string) {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Feather name="feather" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Quill</Text>
          </View>
          {user?.hasImage && avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* ── Greeting + Streak ────────────────────────────────────────────── */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingLabel}>{greetingForHour()}, {firstName}</Text>
            <Text style={styles.greetingHeadline}>
              Ready to create{"\n"}something wonderful?
            </Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Feather name="zap" size={16} color={C.flame} />
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>day{streak !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <View style={styles.tilesRow}>

          {/* Write a Caption — primary dark tile */}
          <TouchableOpacity
            style={[styles.tile, styles.tileDark]}
            onPress={() => router.navigate("/(tabs)")}
            activeOpacity={0.85}
          >
            <View style={styles.tileIconAmber}>
              <Feather name="star" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.tileLabelLight}>Write a{"\n"}Caption</Text>
          </TouchableOpacity>

          {/* Find Hashtags */}
          <TouchableOpacity
            style={[styles.tile, styles.tileLight]}
            onPress={() => router.navigate("/(tabs)/hashtags")}
            activeOpacity={0.85}
          >
            <View style={styles.tileIconLight}>
              <Feather name="hash" size={20} color={C.textMuted} />
            </View>
            <Text style={styles.tileLabelDark}>Find{"\n"}Hashtags</Text>
          </TouchableOpacity>

          {/* View History */}
          <TouchableOpacity
            style={[styles.tile, styles.tileLight]}
            onPress={() => router.navigate("/(tabs)/history")}
            activeOpacity={0.85}
          >
            <View style={styles.tileIconLight}>
              <Feather name="clock" size={20} color={C.textMuted} />
            </View>
            <Text style={styles.tileLabelDark}>View{"\n"}History</Text>
          </TouchableOpacity>

        </View>

        {/* ── Tip of the day ───────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <Feather name="trending-up" size={15} color={C.flame} style={styles.tipIcon} />
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Tip: </Text>
            {tip}
          </Text>
        </View>

        {/* ── Recent Magic ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Magic</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={() => router.navigate("/(tabs)/history")}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="feather" size={28} color={C.textFaint} />
            <Text style={styles.emptyText}>Your first caption will appear here.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.navigate("/(tabs)")}
            >
              <Text style={styles.emptyBtnText}>Write your first caption</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentItems.map((entry) => {
            const firstCaption = entry.captions?.[0];
            if (!firstCaption) return null;
            const platform = entry.params?.platform;
            const platformColor = platform ? (PLATFORM_COLORS[platform] ?? C.textMuted) : C.textMuted;
            const niche = entry.params?.niche;
            const timeAgo = formatTimeAgo(entry.createdAt);

            return (
              <View key={entry.id} style={styles.captionCard}>
                {/* Card header */}
                <View style={styles.captionCardHeader}>
                  <View style={styles.captionMeta}>
                    {niche ? (
                      <View style={styles.nicheTag}>
                        <Feather name="tag" size={9} color={C.amber} />
                        <Text style={styles.nicheTagText}>{niche}</Text>
                      </View>
                    ) : null}
                    {platform ? (
                      <Text style={[styles.platformLabel, { color: platformColor }]}>
                        {platform}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => copyCaption(firstCaption.caption)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Feather name="copy" size={15} color={C.textFaint} />
                  </TouchableOpacity>
                </View>

                {/* Caption text */}
                <Text style={styles.captionText} numberOfLines={2}>
                  {firstCaption.caption}
                </Text>

                {/* Footer */}
                <View style={styles.captionCardFooter}>
                  {firstCaption.hashtags ? (
                    <Text style={styles.hashtagsText} numberOfLines={1}>
                      {firstCaption.hashtags.split(" ").slice(0, 3).join(" ")}
                    </Text>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.timeAgo}>{timeAgo}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.amber,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.tipBorder,
  },
  avatarFallback: {
    backgroundColor: C.tipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textSecondary,
  },

  // Greeting
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  greetingText: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textMuted,
    marginBottom: 4,
  },
  greetingHeadline: {
    fontSize: 26,
    fontWeight: "700",
    color: C.textPrimary,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  streakBadge: {
    backgroundColor: C.tipBg,
    borderColor: C.tipBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
    minWidth: 58,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    lineHeight: 18,
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: C.textMuted,
    lineHeight: 11,
  },

  // Quick Action Tiles
  tilesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    height: 148,
    borderRadius: 24,
    padding: 14,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tileDark: {
    backgroundColor: C.darkTile,
    shadowColor: C.darkTile,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tileLight: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tileIconAmber: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  tileIconLight: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.tipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabelLight: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 19,
  },
  tileLabelDark: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    lineHeight: 19,
  },

  // Tip callout
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.tipBg,
    borderWidth: 1,
    borderColor: C.tipBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 10,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 18,
  },
  tipBold: {
    fontWeight: "700",
    color: C.textPrimary,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "500",
    color: C.textMuted,
  },

  // Empty state
  emptyCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 4,
    backgroundColor: C.amber,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Caption cards
  captionCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  captionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  captionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  nicheTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.amberLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  nicheTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.amber,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  platformLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  captionText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  captionCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hashtagsText: {
    fontSize: 11,
    color: C.textFaint,
    flex: 1,
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 10,
    color: C.textFaint,
    fontWeight: "500",
  },
});
