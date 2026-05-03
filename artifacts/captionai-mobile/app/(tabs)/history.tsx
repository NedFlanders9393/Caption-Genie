import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { remixCaption } from "@/lib/api";
import Paywall from "@/components/Paywall";
import type { HistoryEntry, FavoriteEntry } from "@/lib/storage";

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  TikTok: "#010101",
  Facebook: "#1877F2",
  LinkedIn: "#0A66C2",
  "Twitter/X": "#000000",
};

const REMIX_DIRECTIONS = [
  "Make it shorter",
  "Make it longer",
  "Make it funnier",
  "More professional",
  "More casual",
  "Add urgency",
  "More emotional",
  "Change the hook",
];

function CaptionList({
  captions,
  platform,
  colors,
  entryId,
  niche,
}: {
  captions: { caption: string; hashtags: string }[];
  platform?: string;
  colors: any;
  entryId?: string;
  niche?: string;
}) {
  const { getToken } = useAuth();
  const { toggleFavorite, isFavorited } = useApp();
  const { isSubscribed } = useSubscription();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [remixOpenIdx, setRemixOpenIdx] = useState<number | null>(null);
  const [remixLoadingIdx, setRemixLoadingIdx] = useState<number | null>(null);
  const [remixResults, setRemixResults] = useState<Record<number, { caption: string; hashtags: string } | null>>({});
  const [copiedRemixIdx, setCopiedRemixIdx] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleCopy = async (caption: string, hashtags: string, idx: number) => {
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyRemix = async (caption: string, hashtags: string, idx: number) => {
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedRemixIdx(idx);
    setTimeout(() => setCopiedRemixIdx(null), 2000);
  };

  const handleShare = async (caption: string, hashtags: string) => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(text);
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const handleRemix = async (idx: number, direction: string) => {
    const original = captions[idx];
    if (!original) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRemixLoadingIdx(idx);
    setRemixOpenIdx(null);
    try {
      const token = await getToken();
      const result = await remixCaption(
        { caption: original.caption, direction, platform: platform ?? undefined },
        token
      );
      setRemixResults((prev) => ({ ...prev, [idx]: result }));
    } catch {
      setRemixResults((prev) => ({ ...prev, [idx]: null }));
    } finally {
      setRemixLoadingIdx(null);
    }
  };

  return (
    <>
    <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    <View style={styles.captionList}>
      {captions.map((c, i) => (
        <View
          key={i}
          style={[styles.captionItem, { borderTopColor: colors.border, borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0 }]}
        >
          <Text style={[styles.captionText, { color: colors.foreground }]}>{c.caption}</Text>
          {c.hashtags ? (
            <Text style={[styles.hashtagText, { color: colors.primary }]}>{c.hashtags}</Text>
          ) : null}

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleCopy(c.caption, c.hashtags, i)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Feather
                name={copiedIdx === i ? "check" : "copy"}
                size={13}
                color={copiedIdx === i ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.actionText, { color: copiedIdx === i ? colors.primary : colors.mutedForeground }]}>
                {copiedIdx === i ? "Copied" : "Copy"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleShare(c.caption, c.hashtags)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={13} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Share</Text>
            </TouchableOpacity>

            {entryId && (() => {
              const favId = `${entryId}_${i}`;
              const saved = isFavorited(favId);
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleFavorite({ id: favId, caption: c.caption, hashtags: c.hashtags, platform, niche, savedAt: Date.now() });
                  }}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="bookmark" size={13} color={saved ? "#E8B669" : colors.mutedForeground} />
                  <Text style={[styles.actionText, { color: saved ? "#E8B669" : colors.mutedForeground }]}>
                    {saved ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>
              );
            })()}

            {remixLoadingIdx === i ? (
              <View style={styles.actionBtn}>
                <ActivityIndicator size={13} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Remixing…</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (!isSubscribed) { setShowPaywall(true); return; }
                  setRemixOpenIdx(remixOpenIdx === i ? null : i);
                }}
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Feather
                  name="shuffle"
                  size={13}
                  color={remixOpenIdx === i ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.actionText, { color: remixOpenIdx === i ? colors.primary : colors.mutedForeground }]}>
                  Remix
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Remix direction chips */}
          {remixOpenIdx === i && (
            <View style={[styles.remixChips, { borderTopColor: colors.border }]}>
              <Text style={[styles.remixLabel, { color: colors.mutedForeground }]}>Choose a direction</Text>
              <View style={styles.chipGrid}>
                {REMIX_DIRECTIONS.map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    onPress={() => handleRemix(i, dir)}
                    style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: colors.foreground }]}>{dir}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Remixed result */}
          {remixResults[i] !== undefined && remixResults[i] !== null && (
            <View style={[styles.remixResult, { backgroundColor: "#F8EFE4", borderColor: "#F0E3D3" }]}>
              <View style={styles.remixResultHeader}>
                <Feather name="shuffle" size={12} color="#E8B669" />
                <Text style={styles.remixResultLabel}>Remixed</Text>
                <TouchableOpacity
                  onPress={() => setRemixResults((prev) => ({ ...prev, [i]: undefined as any }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={12} color="#8C7A6B" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.captionText, { color: "#3A3129" }]}>{remixResults[i]!.caption}</Text>
              {remixResults[i]!.hashtags ? (
                <Text style={[styles.hashtagText, { color: "#E8B669" }]}>{remixResults[i]!.hashtags}</Text>
              ) : null}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleCopyRemix(remixResults[i]!.caption, remixResults[i]!.hashtags, i)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={copiedRemixIdx === i ? "check" : "copy"}
                    size={13}
                    color={copiedRemixIdx === i ? "#E8B669" : "#8C7A6B"}
                  />
                  <Text style={[styles.actionText, { color: copiedRemixIdx === i ? "#E8B669" : "#8C7A6B" }]}>
                    {copiedRemixIdx === i ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShare(remixResults[i]!.caption, remixResults[i]!.hashtags)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="share-2" size={13} color="#8C7A6B" />
                  <Text style={[styles.actionText, { color: "#8C7A6B" }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
    </>
  );
}

function HistoryItem({
  item,
  onDelete,
  colors,
}: {
  item: HistoryEntry;
  onDelete: (id: string) => void;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const isMulti = !!(item.multiPlatformResults && item.multiPlatformResults.length > 0);

  const date = new Date(item.createdAt);
  const timeStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const handleDelete = () => {
    if (Platform.OS === "web") {
      onDelete(item.id);
      return;
    }
    Alert.alert("Delete", "Remove this entry from history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && isMulti && !activeTab) {
      setActiveTab(item.multiPlatformResults![0].platform);
    }
  };

  const activeMultiCaptions = isMulti
    ? (item.multiPlatformResults!.find((r) => r.platform === activeTab)?.captions ?? item.captions)
    : item.captions;

  const activePlatform = isMulti ? activeTab : item.params.platform;

  const previewCaption = isMulti
    ? item.multiPlatformResults![0]?.captions[0]?.caption
    : item.captions[0]?.caption;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <TouchableOpacity onPress={handleExpand} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardNiche, { color: colors.foreground }]}>
              {item.params.niche}
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              {item.params.platform} · {item.params.tone} · {timeStr}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </View>
        </View>
        {!expanded && (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {previewCaption ?? ""}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <>
          {isMulti && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformTabs}>

              {item.multiPlatformResults!.map((r) => {
                const active = activeTab === r.platform;
                const accent = PLATFORM_COLORS[r.platform] ?? colors.primary;
                return (
                  <TouchableOpacity
                    key={r.platform}
                    onPress={() => setActiveTab(r.platform)}
                    style={[
                      styles.platformTab,
                      {
                        backgroundColor: active ? accent : colors.background,
                        borderColor: active ? accent : colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.platformTabText, { color: active ? "#fff" : colors.foreground }]}>
                      {r.platform}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <CaptionList
            captions={activeMultiCaptions}
            platform={activePlatform}
            colors={colors}
            entryId={item.id}
            niche={item.params.niche}
          />
          <TouchableOpacity onPress={handleDelete} style={styles.deleteEntryBtn} activeOpacity={0.7}>
            <Feather name="trash-2" size={12} color={colors.mutedForeground} />
            <Text style={[styles.deleteEntryText, { color: colors.mutedForeground }]}>Delete entry</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Favorites list ────────────────────────────────────────────────────────────
function FavoritesList({ colors, bottomPad }: { colors: any; bottomPad: number }) {
  const { favorites, toggleFavorite } = useApp();
  const { isSubscribed } = useSubscription();
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleCopy = async (entry: FavoriteEntry) => {
    const text = entry.hashtags ? `${entry.caption}\n\n${entry.hashtags}` : entry.caption;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (entry: FavoriteEntry) => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    const text = entry.hashtags ? `${entry.caption}\n\n${entry.hashtags}` : entry.caption;
    if (Platform.OS === "web") { await Clipboard.setStringAsync(text); return; }
    try { await Share.share({ message: text }); } catch {}
  };

  if (favorites.length === 0) {
    return (
      <>
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <View style={[styles.empty, { paddingBottom: bottomPad }]}>
        <View style={styles.emptyIconCircle}>
          <Feather name="bookmark" size={26} color="#E8B669" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved captions yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Tap the bookmark icon on any caption to save it here for quick access
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.navigate("/(tabs)/generate")}
          activeOpacity={0.85}
        >
          <Feather name="feather" size={14} color="#fff" />
          <Text style={styles.emptyCtaText}>Write a caption</Text>
        </TouchableOpacity>
      </View>
      </>
    );
  }

  return (
    <>
    <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    <FlatList
      data={favorites}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#E8B669", borderRadius: colors.radius }]}>
          {/* Header */}
          <View style={styles.favHeader}>
            <View style={styles.favMeta}>
              {item.platform ? (
                <Text style={[styles.favPlatform, { color: PLATFORM_COLORS[item.platform] ?? colors.mutedForeground }]}>
                  {item.platform}
                </Text>
              ) : null}
              {item.niche ? (
                <Text style={[styles.favNiche, { color: colors.mutedForeground }]}>{item.niche}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite(item);
              }}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Feather name="bookmark" size={16} color="#E8B669" />
            </TouchableOpacity>
          </View>
          {/* Caption */}
          <Text style={[styles.captionText, { color: colors.foreground }]}>{item.caption}</Text>
          {item.hashtags ? (
            <Text style={[styles.hashtagText, { color: colors.primary }]}>{item.hashtags}</Text>
          ) : null}
          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleCopy(item)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Feather
                name={copiedId === item.id ? "check" : "copy"}
                size={13}
                color={copiedId === item.id ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.actionText, { color: copiedId === item.id ? colors.primary : colors.mutedForeground }]}>
                {copiedId === item.id ? "Copied" : "Copy"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleShare(item)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={13} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, removeFromHistory, wipeHistory, favorites } = useApp();
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites">("all");

  const handleClearAll = () => {
    if (Platform.OS === "web") {
      wipeHistory();
      return;
    }
    Alert.alert("Clear History", "Delete all saved captions?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: wipeHistory },
    ]);
  };

  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;

  const FilterBar = (
    <View style={styles.filterBar}>
      {(["all", "favorites"] as const).map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => setActiveFilter(f)}
          style={[
            styles.filterBtn,
            activeFilter === f && { backgroundColor: "#E8B669" },
          ]}
          activeOpacity={0.8}
        >
          {f === "favorites" && (
            <Feather
              name="bookmark"
              size={12}
              color={activeFilter === f ? "#3A3129" : colors.mutedForeground}
            />
          )}
          <Text
            style={[
              styles.filterText,
              { color: activeFilter === f ? "#3A3129" : colors.mutedForeground },
              activeFilter === f && { fontFamily: "Nunito_600SemiBold" },
            ]}
          >
            {f === "all" ? "All" : `Saved${favorites.length > 0 ? ` (${favorites.length})` : ""}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (activeFilter === "favorites") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.listContent, { paddingTop: topPad }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          </View>
          {FilterBar}
        </View>
        <FavoritesList colors={colors} bottomPad={bottomPad} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!history.length}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
              {history.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                  <Text style={[styles.clearText, { color: colors.destructive }]}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            {FilterBar}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Feather name="clock" size={26} color="#E8B669" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No captions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Every caption you generate will be saved here so you can revisit and reuse them
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.navigate("/(tabs)/generate")}
              activeOpacity={0.85}
            >
              <Feather name="zap" size={14} color="#fff" />
              <Text style={styles.emptyCtaText}>Write your first caption</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryItem item={item} onDelete={removeFromHistory} colors={colors} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, gap: 0 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Nunito_700Bold",
    letterSpacing: -0.5,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Nunito_500Medium",
  },
  card: {
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardNiche: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 4 },
  preview: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 19 },
  platformTabs: { flexDirection: "row", gap: 8, paddingVertical: 8 },
  platformTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  platformTabText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  captionList: { gap: 0 },
  captionItem: { paddingTop: 12, gap: 6 },
  captionText: { fontSize: 14, lineHeight: 21, fontFamily: "Nunito_400Regular" },
  hashtagText: { fontSize: 12, fontFamily: "Nunito_500Medium", lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Nunito_500Medium" },
  remixChips: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  remixLabel: {
    fontSize: 11,
    fontFamily: "Nunito_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
  },
  remixResult: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  remixResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  remixResultLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#E8B669",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  deleteEntryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    paddingTop: 10,
    paddingBottom: 2,
    opacity: 0.55,
  },
  deleteEntryText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDF3E3",
    borderWidth: 1,
    borderColor: "#F0E3D3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: "#E8B669",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyCtaText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },

  // Filter bar
  filterBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
  },

  // Favorites card header
  favHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  favPlatform: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  favNiche: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
  },
});
