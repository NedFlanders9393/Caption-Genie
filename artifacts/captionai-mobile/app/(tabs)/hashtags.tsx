import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useApp } from "@/context/AppContext";
import { generateHashtags, type HashtagGroups } from "@/lib/api";
import OptionPicker from "@/components/OptionPicker";
import Paywall from "@/components/Paywall";

const NICHES = [
  "Real Estate", "Fitness Coach", "Restaurant", "Boutique/Shop",
  "General Business", "Beauty/Salon", "Photography", "Coaching/Consulting",
  "Healthcare/Wellness", "E-commerce", "Event Planning", "Pet Care",
  "Education/Tutoring", "Home Services", "Law Firm", "Coffee Shop",
  "Yoga Studio", "Automotive", "Marketing Agency", "Non-Profit",
  "Travel/Tourism", "Dental/Medical",
];

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "Twitter/X"];

const GROUP_META = {
  niche: {
    label: "Targeted",
    icon: "crosshair" as const,
    accent: "#E8B669",
    bg: "#F8EFE4",
    desc: "Hyper-specific to your industry — reaches the exact audience most likely to buy",
  },
  trending: {
    label: "Trending",
    icon: "trending-up" as const,
    accent: "#E8824A",
    bg: "#FEF0E7",
    desc: "High-momentum tags that extend your reach beyond existing followers right now",
  },
  broad: {
    label: "Reach",
    icon: "radio" as const,
    accent: "#4CAF86",
    bg: "#E6F5EF",
    desc: "High-volume discovery tags that cast the widest net for maximum impressions",
  },
};

interface HashtagChipProps {
  tag: string;
  selected: boolean;
  onPress: () => void;
  accent: string;
  bg: string;
  colors: any;
}

function HashtagChip({ tag, selected, onPress, accent, bg, colors }: HashtagChipProps) {
  const t = tag.startsWith("#") ? tag : `#${tag}`;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tag,
        {
          backgroundColor: selected ? accent : colors.secondary,
          borderColor: selected ? accent : "transparent",
          borderWidth: selected ? 1.5 : 0,
          borderRadius: 8,
        },
      ]}
    >
      <Text style={[styles.tagText, { color: selected ? "#fff" : colors.primary }]}>{t}</Text>
    </TouchableOpacity>
  );
}

interface GroupCardProps {
  groupKey: "niche" | "trending" | "broad";
  tags: string[];
  colors: any;
  selected: Set<string>;
  onTagPress: (tag: string) => void;
}

function GroupCard({ groupKey, tags, colors, selected, onTagPress }: GroupCardProps) {
  const [copied, setCopied] = useState(false);
  const meta = GROUP_META[groupKey];

  const handleCopyAll = async () => {
    await Clipboard.setStringAsync(tags.map((t) => `#${t.replace(/^#/, "")}`).join(" "));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.groupHeaderRow}>
        <View style={[styles.groupBadge, { backgroundColor: meta.bg, borderRadius: 8 }]}>
          <Feather name={meta.icon} size={13} color={meta.accent} />
          <Text style={[styles.groupBadgeText, { color: meta.accent }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity onPress={handleCopyAll} style={styles.copyBtn} activeOpacity={0.7}>
          <Feather name={copied ? "check" : "copy"} size={14} color={copied ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.copyText, { color: copied ? colors.primary : colors.mutedForeground }]}>
            {copied ? "Copied" : "Copy all"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.groupDesc, { color: colors.mutedForeground }]}>{meta.desc}</Text>
      <View style={styles.tags}>
        {tags.map((tag) => (
          <HashtagChip
            key={tag}
            tag={tag}
            selected={selected.has(tag)}
            onPress={() => onTagPress(tag)}
            accent={meta.accent}
            bg={meta.bg}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

export default function HashtagsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isOverLimit, consumeGeneration } = useApp();

  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<HashtagGroups | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [smartMixCopied, setSmartMixCopied] = useState(false);
  const [mixCopied, setMixCopied] = useState(false);

  const canGenerate = niche && topic.trim();

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (!isSubscribed && isOverLimit) {
      setShowPaywall(true);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const token = await getToken();
      const result = await generateHashtags({ niche, topic: topic.trim(), platform }, token);
      setGrouped(result.grouped);
      if (!isSubscribed) await consumeGeneration();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const smartMix = grouped
    ? [
        ...grouped.niche.slice(0, 3),
        ...grouped.trending.slice(0, 3),
        ...grouped.broad.slice(0, 2),
      ]
    : [];

  const handleCopySmartMix = async () => {
    await Clipboard.setStringAsync(smartMix.map((t) => `#${t.replace(/^#/, "")}`).join(" "));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSmartMixCopied(true);
    setTimeout(() => setSmartMixCopied(false), 2000);
  };

  const handleCopySelected = async () => {
    const tags = Array.from(selected).map((t) => `#${t.replace(/^#/, "")}`).join(" ");
    await Clipboard.setStringAsync(tags);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMixCopied(true);
    setTimeout(() => setMixCopied(false), 2000);
  };

  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Hashtag Intelligence</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            3 strategic groups + smart mix — tap any tag to select
          </Text>
        </View>

        <View style={styles.fields}>
          <OptionPicker label="Industry" value={niche} options={NICHES} onSelect={setNiche} />
          <OptionPicker label="Platform" value={platform} options={PLATFORMS} onSelect={setPlatform} />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Topic</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                  color: colors.foreground,
                },
              ]}
              placeholder="e.g. 'Summer sale', 'New product launch', 'Tips for first-time buyers'"
              placeholderTextColor={colors.mutedForeground}
              value={topic}
              onChangeText={setTopic}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderRadius: colors.radius / 2 }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={!canGenerate || loading}
          style={[
            styles.generateBtn,
            {
              backgroundColor: canGenerate && !loading ? colors.primary : colors.muted,
              borderRadius: colors.radius,
            },
          ]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="hash" size={18} color={canGenerate ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.generateText, { color: canGenerate ? "#fff" : colors.mutedForeground }]}>
                Generate Hashtags
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!grouped && !loading && (
          <View style={styles.preResultsHint}>
            <View style={styles.preResultsIconRow}>
              {["niche", "trending", "broad"].map((label, i) => (
                <View key={label} style={[styles.preResultsPill, i === 0 && styles.preResultsPillDark]}>
                  <Text style={[styles.preResultsPillText, i === 0 && styles.preResultsPillTextLight]}>
                    #{label === "niche" ? "targeted" : label === "trending" ? "trending" : "broad"}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.preResultsTitle, { color: colors.foreground }]}>
              Get 30 ready-to-use hashtags
            </Text>
            <Text style={[styles.preResultsBody, { color: colors.mutedForeground }]}>
              Describe your post above and tap Generate. You'll get three curated sets — niche, trending, and broad reach — plus a Smart Mix of the best 8.
            </Text>
          </View>
        )}

        {grouped && (
          <View style={styles.results}>
            {/* Smart Mix */}
            <View style={[styles.smartMixCard, { backgroundColor: "#3A3129", borderRadius: colors.radius }]}>
              <View style={styles.smartMixHeader}>
                <View style={styles.smartMixTitleRow}>
                  <Feather name="zap" size={16} color="#E8B669" />
                  <Text style={styles.smartMixTitle}>Smart Mix</Text>
                </View>
                <Text style={styles.smartMixSub}>Optimal 8-tag set · 3 targeted + 3 trending + 2 reach</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smartMixTags}>
                {smartMix.map((t) => (
                  <View key={t} style={styles.smartMixTag}>
                    <Text style={styles.smartMixTagText}>#{t.replace(/^#/, "")}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={handleCopySmartMix} style={styles.smartMixCopyBtn} activeOpacity={0.8}>
                <Feather name={smartMixCopied ? "check" : "copy"} size={14} color={smartMixCopied ? "#86EFAC" : "#E8B669"} />
                <Text style={[styles.smartMixCopyText, { color: smartMixCopied ? "#86EFAC" : "#E8B669" }]}>
                  {smartMixCopied ? "Copied to clipboard!" : "Copy Smart Mix"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected mix banner */}
            {selected.size > 0 && (
              <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius / 2 }]}>
                <Text style={[styles.selectionCount, { color: colors.primary }]}>
                  {selected.size} tag{selected.size !== 1 ? "s" : ""} selected
                </Text>
                <TouchableOpacity onPress={handleCopySelected} style={[styles.copySelectedBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                  <Feather name={mixCopied ? "check" : "copy"} size={13} color="#fff" />
                  <Text style={styles.copySelectedText}>{mixCopied ? "Copied!" : "Copy selection"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Three groups */}
            <GroupCard groupKey="niche" tags={grouped.niche} colors={colors} selected={selected} onTagPress={toggleTag} />
            <GroupCard groupKey="trending" tags={grouped.trending} colors={colors} selected={selected} onTagPress={toggleTag} />
            <GroupCard groupKey="broad" tags={grouped.broad} colors={colors} selected={selected} onTagPress={toggleTag} />
          </View>
        )}
      </ScrollView>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontSize: 26, fontFamily: "Nunito_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", marginTop: 2 },
  fields: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    minHeight: 80,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 14, fontFamily: "Nunito_400Regular", flex: 1 },
  generateBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateText: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  results: { gap: 14 },
  smartMixCard: {
    padding: 16,
    gap: 12,
  },
  smartMixHeader: { gap: 4 },
  smartMixTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  smartMixTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#FFFDF9",
    letterSpacing: -0.2,
  },
  smartMixSub: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#B0A090",
  },
  smartMixTags: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  smartMixTag: {
    backgroundColor: "rgba(232, 182, 105, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(232, 182, 105, 0.3)",
  },
  smartMixTagText: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
    color: "#F8EFE4",
  },
  smartMixCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  smartMixCopyText: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  selectionCount: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
  copySelectedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copySelectedText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#fff",
  },
  groupCard: { borderWidth: 1.5, padding: 14, gap: 10 },
  groupHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  groupBadgeText: { fontSize: 12, fontFamily: "Nunito_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  groupDesc: { fontSize: 12, fontFamily: "Nunito_400Regular", lineHeight: 17 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  copyText: { fontSize: 13, fontFamily: "Nunito_500Medium" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 13, fontFamily: "Nunito_500Medium" },

  // Pre-results hint (shown before first generation)
  preResultsHint: {
    marginTop: 28,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  preResultsIconRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  preResultsPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F8EFE4",
    borderWidth: 1,
    borderColor: "#F0E3D3",
  },
  preResultsPillDark: {
    backgroundColor: "#3A3129",
    borderColor: "#3A3129",
  },
  preResultsPillText: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#8C7A6B",
  },
  preResultsPillTextLight: {
    color: "#E8B669",
  },
  preResultsTitle: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  preResultsBody: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
});
