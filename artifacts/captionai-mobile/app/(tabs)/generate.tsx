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
import { useUser, useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import {
  generateCaptions,
  generateMultiPlatform,
  regenerateOneCaption,
  type CaptionParams,
  type CaptionItem,
  type MultiPlatformResult,
  type BrandVoice,
} from "@/lib/api";
import PlatformPicker from "@/components/PlatformPicker";
import TonePicker from "@/components/TonePicker";
import CaptionCard from "@/components/CaptionCard";
import OptionPicker from "@/components/OptionPicker";
import Paywall from "@/components/Paywall";
import BestTimeCard from "@/components/BestTimeCard";

const NICHES = [
  "Real Estate", "Fitness Coach", "Restaurant", "Boutique/Shop",
  "General Business", "Beauty/Salon", "Photography", "Coaching/Consulting",
  "Healthcare/Wellness", "E-commerce", "Event Planning", "Pet Care",
  "Education/Tutoring", "Home Services", "Law Firm", "Coffee Shop",
  "Yoga Studio", "Automotive", "Marketing Agency", "Non-Profit",
  "Travel/Tourism", "Dental/Medical",
  "Influencer/Creator", "Fashion Influencer", "Beauty Influencer",
  "Lifestyle Influencer", "Food Influencer", "Fitness Influencer",
  "Travel Influencer", "Tech/Gaming Creator", "Parenting/Family Creator",
  "Finance/Money Creator", "Digital Products",
];

const POST_TYPES = [
  "Product Showcase", "New Arrival", "Sale/Promo", "Flash Sale",
  "Limited Time Offer", "Giveaway/Contest", "Behind the Scenes",
  "Day in the Life", "Team Spotlight", "Tips & Education", "How-To/Tutorial",
  "Q&A", "Announcement", "Milestone/Celebration", "Seasonal/Holiday",
  "Customer Story", "Testimonial/Review", "Before & After", "Motivational Quote",
  "Community Post", "User-Generated Content",
  "Sponsored Content", "Brand Partnership/Collab", "Brand Deal Reveal",
  "Get Ready With Me", "Outfit/Look of the Day", "Haul",
  "Favorites/Recommendations", "Reel/Short Video", "Story Content",
  "Poll/This or That", "Follow Me Around", "Unboxing",
];

const LENGTHS = ["Short", "Medium", "Long"];
const CTAS = [
  "None",
  "Shop Now", "Grab Yours", "Link in Bio",
  "Book Now", "Apply Now", "Sign Up",
  "DM Us", "DM for Details", "DM to Collab",
  "Comment Below", "Drop a Comment", "Tell Us Below",
  "Tag a Friend", "Share This",
  "Save This Post", "Follow for More",
  "Turn On Notifications", "Watch Until the End",
  "Learn More", "Try It Free",
  "Join the Waitlist", "Download Now",
];
const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  TikTok: "#010101",
  Facebook: "#1877F2",
  LinkedIn: "#0A66C2",
  "Twitter/X": "#000000",
  YouTube: "#FF0000",
  Pinterest: "#E60023",
};

export default function GenerateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { addToHistory, consumeGeneration, isOverLimit } = useApp();
  const { isSubscribed } = useSubscription();

  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [activePlatformTab, setActivePlatformTab] = useState("Instagram");
  const [niche, setNiche] = useState("");
  const [postType, setPostType] = useState("");
  const [tones, setTones] = useState<string[]>(["Professional"]);
  const [description, setDescription] = useState("");
  const [captionLength, setCaptionLength] = useState("Medium");
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [ctaType, setCtaType] = useState("None");
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [multiResults, setMultiResults] = useState<MultiPlatformResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const brandVoice = user?.unsafeMetadata?.brandVoice as BrandVoice | undefined;
  const hasBrandVoice = !!(brandVoice?.brandName || brandVoice?.tagline || brandVoice?.personality?.length || brandVoice?.targetAudience || brandVoice?.captionStyle?.length || brandVoice?.sampleCaption);

  const canGenerate = niche && tones.length > 0 && description.trim();

  const multiPlatform = platforms.length > 1;

  const buildParams = useCallback((): CaptionParams => ({
    niche,
    postDescription: description.trim(),
    tone: tones.join(", "),
    platform: platforms[0] ?? "Instagram",
    postType: postType || undefined,
    captionLength,
    includeEmojis,
    ctaType: ctaType === "None" ? undefined : ctaType,
    brandVoice: hasBrandVoice ? brandVoice : undefined,
  }), [niche, description, tones, platforms, postType, captionLength, includeEmojis, ctaType, hasBrandVoice, brandVoice]);

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
      const token = await getToken();
      if (multiPlatform) {
        const params = buildParams();
        const results = await generateMultiPlatform(params, platforms, token);
        setMultiResults(results);
        setActivePlatformTab(platforms[0] ?? "Instagram");

        await addToHistory({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
          params: { niche, postDescription: description.trim(), tone: tones.join(", "), platform: platforms.join(", "), postType, captionLength },
          captions: results[0]?.captions ?? [],
          multiPlatformResults: results,
        });
      } else {
        const params = buildParams();
        const result = await generateCaptions(params, token);
        setCaptions(result);
        setMultiResults([]);

        await addToHistory({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
          params: { niche, postDescription: description.trim(), tone: tones.join(", "), platform: platforms[0] ?? "Instagram", postType, captionLength },
          captions: result,
        });
      }

      if (!isSubscribed) await consumeGeneration();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [canGenerate, isSubscribed, isOverLimit, multiPlatform, buildParams, niche, description, tones, platforms, postType, captionLength, addToHistory, consumeGeneration]);

  const handleRegenerate = useCallback(
    async (idx: number) => {
      if (!isSubscribed && isOverLimit) {
        setShowPaywall(true);
        return;
      }
      setRegeneratingIdx(idx);
      try {
        const token = await getToken();
        const existing = captions.map((c) => c.caption);
        const fresh = await regenerateOneCaption({
          ...buildParams(),
          existingCaptions: existing,
        }, token);
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
    [captions, isSubscribed, isOverLimit, buildParams, consumeGeneration, getToken]
  );

  const toggleTone = useCallback((t: string) => {
    setTones((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return prev; // enforce max 3
      return [...prev, t];
    });
  }, []);

  const togglePlatform = useCallback((p: string) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        // keep at least 1 selected
        if (prev.length === 1) return prev;
        const next = prev.filter((x) => x !== p);
        // reset results when switching modes
        setCaptions([]);
        setMultiResults([]);
        return next;
      }
      if (prev.length >= 7) return prev;
      setCaptions([]);
      setMultiResults([]);
      return [...prev, p];
    });
    setError(null);
  }, []);

  const activePlatformCaptions = multiResults.find((r) => r.platform === activePlatformTab)?.captions ?? [];

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

        {/* Brand Voice Badge */}
        {hasBrandVoice ? (
          <TouchableOpacity
            style={[styles.brandVoiceBadge, { backgroundColor: "#F8EFE4", borderRadius: colors.radius / 2 }]}
            onPress={() => router.push("/brand-voice")}
            activeOpacity={0.7}
          >
            <Feather name="mic" size={13} color={colors.primary} />
            <Text style={[styles.brandVoiceBadgeText, { color: colors.primary }]}>
              {brandVoice?.brandName ? `${brandVoice.brandName} voice active` : "Brand voice active"}
            </Text>
            <Feather name="edit-2" size={12} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.brandVoiceSetup, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius / 2 }]}
            onPress={() => router.push("/brand-voice")}
            activeOpacity={0.7}
          >
            <Feather name="mic" size={13} color={colors.mutedForeground} />
            <Text style={[styles.brandVoiceSetupText, { color: colors.mutedForeground }]}>
              Set up brand voice for personalized captions
            </Text>
            <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Platform */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Platform <Text style={{ fontFamily: "Inter_400Regular" }}>(pick up to 7)</Text>
          </Text>
          <PlatformPicker selected={platforms} onToggle={togglePlatform} />
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
              <Feather name={multiPlatform ? "layers" : "zap"} size={18} color={canGenerate ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.generateText, { color: canGenerate ? "#fff" : colors.mutedForeground }]}>
                {multiPlatform ? `Generate for ${platforms.length} Platforms` : "Generate Captions"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Single platform results */}
        {!multiPlatform && captions.length > 0 && (
          <View style={styles.results}>
            <Text style={[styles.resultsLabel, { color: colors.foreground }]}>Your Captions</Text>
            <BestTimeCard platform={platforms[0] ?? "Instagram"} />
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

        {/* Multi-platform results */}
        {multiPlatform && multiResults.length > 0 && (
          <View style={styles.results}>
            <Text style={[styles.resultsLabel, { color: colors.foreground }]}>All Platforms</Text>
            <BestTimeCard platform={platforms[0] ?? "Instagram"} multiPlatforms={platforms} />
            {/* Platform tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformTabs}>
              {platforms.map((p) => {
                const active = activePlatformTab === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setActivePlatformTab(p)}
                    style={[
                      styles.platformTab,
                      {
                        backgroundColor: active ? PLATFORM_COLORS[p] : colors.card,
                        borderColor: active ? PLATFORM_COLORS[p] : colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.platformTabText, { color: active ? "#fff" : colors.foreground }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Captions for active tab */}
            {activePlatformCaptions.map((c, i) => (
              <CaptionCard
                key={`${activePlatformTab}-${i}`}
                index={i}
                caption={c.caption}
                hashtags={c.hashtags}
                onRegenerate={async () => {}}
                isRegenerating={false}
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
  brandVoiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -8,
  },
  brandVoiceBadgeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  brandVoiceSetup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: -8,
  },
  brandVoiceSetupText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
  platformTabs: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  platformTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  platformTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
