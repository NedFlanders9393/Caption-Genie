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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { remixCaption } from "@/lib/api";
import type { HistoryEntry } from "@/lib/storage";

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
}: {
  captions: { caption: string; hashtags: string }[];
  platform?: string;
  colors: any;
}) {
  const { getToken } = useAuth();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [remixOpenIdx, setRemixOpenIdx] = useState<number | null>(null);
  const [remixLoadingIdx, setRemixLoadingIdx] = useState<number | null>(null);
  const [remixResults, setRemixResults] = useState<Record<number, { caption: string; hashtags: string } | null>>({});
  const [copiedRemixIdx, setCopiedRemixIdx] = useState<number | null>(null);

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

            {remixLoadingIdx === i ? (
              <View style={styles.actionBtn}>
                <ActivityIndicator size={13} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Remixing…</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setRemixOpenIdx(remixOpenIdx === i ? null : i)}
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
                  {copiedRemixIdx === i ? "Copied" : "Copy remix"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
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
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7}>
              <Feather name="trash-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
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
          <CaptionList captions={activeMultiCaptions} platform={activePlatform} colors={colors} />
        </>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, removeFromHistory, wipeHistory } = useApp();

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
          <View style={styles.listHeader}>
            <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                <Text style={[styles.clearText, { color: colors.destructive }]}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="clock" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Generated captions will appear here
            </Text>
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
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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
  cardNiche: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 4 },
  preview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  platformTabs: { flexDirection: "row", gap: 8, paddingVertical: 8 },
  platformTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  platformTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  captionList: { gap: 0 },
  captionItem: { paddingTop: 12, gap: 6 },
  captionText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  hashtagText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  remixChips: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  remixLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
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
    fontFamily: "Inter_500Medium",
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
    fontFamily: "Inter_600SemiBold",
    color: "#E8B669",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
