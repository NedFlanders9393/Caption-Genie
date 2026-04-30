import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { generateCaptions, regenerateOneCaption, type CaptionParams, type CaptionItem } from "@/lib/api";
import PlatformPicker from "@/components/PlatformPicker";
import TonePicker from "@/components/TonePicker";
import CaptionCard from "@/components/CaptionCard";
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

const POST_TYPES = [
  "Product Showcase", "New Arrival", "Sale/Promo", "Flash Sale",
  "Limited Time Offer", "Giveaway/Contest", "Behind the Scenes",
  "Day in the Life", "Team Spotlight", "Tips & Education", "How-To/Tutorial",
  "Q&A", "Announcement", "Milestone/Celebration", "Seasonal/Holiday",
  "Customer Story", "Testimonial/Review", "Before & After", "Motivational Quote",
  "Community Post", "User-Generated Content",
];

const LENGTHS = ["Short", "Medium", "Long"];
const CTAS = ["None", "Shop Now", "Link in Bio", "DM Us", "Comment Below", "Tag a Friend", "Save This Post"];

export default function GenerateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addToHistory, consumeGeneration, isOverLimit } = useApp();
  const { isSubscribed } = useSubscription();

  const [platform, setPlatform] = useState("Instagram");
  const [niche, setNiche] = useState("");
  const [postType, setPostType] = useState("");
  const [tones, setTones] = useState<string[]>(["Professional"]);
  const [description, setDescription] = useState("");
  const [captionLength, setCaptionLength] = useState("Medium");
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [ctaType, setCtaType] = useState("None");
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const canGenerate = niche && tones.length > 0 && description.trim();

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    if (!isSubscribed && isOverLimit) {
      setShowPaywall(true);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);

    try {
      const params: CaptionParams = {
        niche,
        postDescription: description.trim(),
        tone: tones.join(", "),
        platform,
        postType: postType || undefined,
        captionLength,
        includeEmojis,
        ctaType: ctaType === "None" ? undefined : ctaType,
      };

      const result = await generateCaptions(params);
      setCaptions(result);

      await addToHistory({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        params: { niche, postDescription: description.trim(), tone: tones.join(", "), platform, postType, captionLength },
        captions: result,
      });

      if (!isSubscribed) await consumeGeneration();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [canGenerate, isSubscribed, isOverLimit, niche, description, tones, platform, postType, captionLength, includeEmojis, ctaType, addToHistory, consumeGeneration]);

  const handleRegenerate = useCallback(
    async (idx: number) => {
      if (!isSubscribed && isOverLimit) {
        setShowPaywall(true);
        return;
      }
      setRegeneratingIdx(idx);
      try {
        const existing = captions.map((c) => c.caption);
        const fresh = await regenerateOneCaption({
          niche,
          postDescription: description.trim(),
          tone: tones.join(", "),
          platform,
          postType: postType || undefined,
          captionLength,
          includeEmojis,
          ctaType: ctaType === "None" ? undefined : ctaType,
          existingCaptions: existing,
        });
        setCaptions((prev) => {
          const next = [...prev];
          next[idx] = fresh;
          return next;
        });
        if (!isSubscribed) await consumeGeneration();
      } catch (e: any) {
        setError(e?.message ?? "Regeneration failed.");
      } finally {
        setRegeneratingIdx(null);
      }
    },
    [captions, isSubscribed, isOverLimit, niche, description, tones, platform, postType, captionLength, includeEmojis, ctaType, consumeGeneration]
  );

  const toggleTone = useCallback((t: string) => {
    setTones((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Caption Generator</Text>
          {!isSubscribed && (
            <TouchableOpacity
              onPress={() => setShowPaywall(true)}
              style={[styles.proChip, { backgroundColor: colors.secondary, borderRadius: colors.radius / 2 }]}
              activeOpacity={0.7}
            >
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={[styles.proChipText, { color: colors.primary }]}>Go Pro</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Platform</Text>
          <View style={styles.platformRow}>
            <PlatformPicker selected={platform} onSelect={setPlatform} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <OptionPicker label="Industry" value={niche} options={NICHES} onSelect={setNiche} placeholder="Select niche" />
            </View>
            <View style={styles.flex1}>
              <OptionPicker label="Post Type" value={postType} options={POST_TYPES} onSelect={setPostType} placeholder="Optional" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Tone <Text style={{ fontFamily: "Inter_400Regular" }}>(pick up to 3)</Text>
          </Text>
          <TonePicker selected={tones} onToggle={toggleTone} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>What's this post about?</Text>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius / 2,
                color: colors.foreground,
              },
            ]}
            placeholder="Describe your post, product, promotion, or message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={styles.flex1}>
            <OptionPicker label="Length" value={captionLength} options={LENGTHS} onSelect={setCaptionLength} />
          </View>
          <View style={styles.flex1}>
            <OptionPicker label="Call to Action" value={ctaType} options={CTAS} onSelect={setCtaType} />
          </View>
        </View>

        <View style={[styles.section, styles.emojiRow]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Include emojis</Text>
          <Switch
            value={includeEmojis}
            onValueChange={setIncludeEmojis}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
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
              <Feather name="zap" size={18} color={canGenerate ? "#fff" : colors.mutedForeground} />
              <Text
                style={[
                  styles.generateText,
                  { color: canGenerate ? "#fff" : colors.mutedForeground },
                ]}
              >
                Generate Captions
              </Text>
            </>
          )}
        </TouchableOpacity>

        {captions.length > 0 && (
          <View style={styles.results}>
            <Text style={[styles.resultsLabel, { color: colors.foreground }]}>Your Captions</Text>
            {captions.map((c, i) => (
              <CaptionCard
                key={i}
                index={i}
                caption={c.caption}
                hashtags={c.hashtags}
                onRegenerate={() => handleRegenerate(i)}
                isRegenerating={regeneratingIdx === i}
              />
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  proChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  platformRow: { marginHorizontal: -16 },
  row: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  textarea: {
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    lineHeight: 22,
  },
  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  generateBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  results: { gap: 12 },
  resultsLabel: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
});
