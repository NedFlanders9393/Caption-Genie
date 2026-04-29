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

interface GroupCardProps {
  title: string;
  tags: string[];
  accent: string;
  colors: any;
}

function GroupCard({ title, tags, accent, colors }: GroupCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(tags.map((t) => `#${t.replace(/^#/, "")}`).join(" "));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={[
        styles.groupCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.groupHeader}>
        <View style={[styles.groupBadge, { backgroundColor: accent + "20", borderRadius: 6 }]}>
          <Text style={[styles.groupBadgeText, { color: accent }]}>{title}</Text>
        </View>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.7}>
          <Feather name={copied ? "check" : "copy"} size={14} color={copied ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.copyText, { color: copied ? colors.primary : colors.mutedForeground }]}>
            {copied ? "Copied" : "Copy all"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tags}>
        {tags.map((tag) => {
          const t = tag.startsWith("#") ? tag : `#${tag}`;
          return (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: 6 }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{t}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function HashtagsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();
  const { isOverLimit, consumeGeneration } = useApp();

  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<HashtagGroups | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

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

    try {
      const result = await generateHashtags({ niche, topic: topic.trim(), platform });
      setGrouped(result.grouped);
      if (!isSubscribed) await consumeGeneration();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
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
        <Text style={[styles.title, { color: colors.foreground }]}>Hashtag Tool</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Get curated hashtags for any post topic
        </Text>

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

        {grouped && (
          <View style={styles.results}>
            <Text style={[styles.resultsLabel, { color: colors.foreground }]}>Your Hashtags</Text>
            <GroupCard title="Niche" tags={grouped.niche} accent={colors.primary} colors={colors} />
            <GroupCard title="Trending" tags={grouped.trending} accent="#0EA5E9" colors={colors} />
            <GroupCard title="Broad" tags={grouped.broad} accent="#10B981" colors={colors} />
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
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -12 },
  fields: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
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
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  generateBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  results: { gap: 12 },
  resultsLabel: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  groupCard: { borderWidth: 1.5, padding: 14, gap: 12 },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  groupBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  copyText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
