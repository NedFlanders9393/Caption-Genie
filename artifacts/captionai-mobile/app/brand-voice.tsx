import { useUser } from "@clerk/expo";
import { useSubscription } from "@/lib/revenuecat";
import Paywall from "@/components/Paywall";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#E8B669";
const BG = "#FFFDF9";
const FOREGROUND = "#3A3129";
const MUTED = "#8C7A6B";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F0E3D3";

const PERSONALITIES = [
  "Professional", "Playful", "Witty", "Inspiring",
  "Bold", "Authentic", "Luxurious", "Empowering",
  "Heartfelt", "Casual", "Funny", "Storytelling",
];

const WRITING_STYLES = [
  "Short punchy lines",
  "Ask a question at the end",
  "Use storytelling",
  "Line breaks between sentences",
  "Bullet points",
  "First person (I / We)",
  "Uses ellipsis...",
  "All lowercase",
  "Numbered tips",
  "Heavy emojis",
  "No emojis",
  "Conversational asides",
];

export interface BrandVoice {
  brandName?: string;
  tagline?: string;
  personality: string[];
  targetAudience?: string;
  captionStyle?: string[];
  alwaysInclude?: string;
  neverSay?: string;
  sampleCaption?: string;
  sampleCaptions?: string[];
  voiceDescription?: string;
}

export default function BrandVoiceScreen() {
  const { user } = useUser();
  const router = useRouter();

  const saved = (user?.unsafeMetadata?.brandVoice ?? {}) as BrandVoice;

  const [brandName, setBrandName] = useState(saved.brandName ?? "");
  const [tagline, setTagline] = useState(saved.tagline ?? "");
  const [personality, setPersonality] = useState<string[]>(saved.personality ?? []);
  const [targetAudience, setTargetAudience] = useState(saved.targetAudience ?? "");
  const [captionStyle, setCaptionStyle] = useState<string[]>(saved.captionStyle ?? []);
  const [alwaysInclude, setAlwaysInclude] = useState(saved.alwaysInclude ?? "");
  const [neverSay, setNeverSay] = useState(saved.neverSay ?? "");
  // Multiple sample captions — prefer sampleCaptions array, fall back to legacy sampleCaption
  const savedSamples = saved.sampleCaptions?.length
    ? saved.sampleCaptions
    : saved.sampleCaption
    ? [saved.sampleCaption]
    : [""];
  const [sampleCaptions, setSampleCaptions] = useState<string[]>(savedSamples);
  const [voiceDescription, setVoiceDescription] = useState(saved.voiceDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isSubscribed } = useSubscription();

  const updateSample = (index: number, value: string) => {
    setSampleCaptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addSample = () => {
    if (sampleCaptions.length < 3) setSampleCaptions((prev) => [...prev, ""]);
  };

  const removeSample = (index: number) => {
    setSampleCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePersonality = (p: string) => {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleStyle = (s: string) => {
    setCaptionStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          brandVoice: {
            brandName: brandName.trim() || undefined,
            tagline: tagline.trim() || undefined,
            personality,
            targetAudience: targetAudience.trim() || undefined,
            captionStyle: captionStyle.length > 0 ? captionStyle : undefined,
            alwaysInclude: alwaysInclude.trim() || undefined,
            neverSay: neverSay.trim() || undefined,
            sampleCaptions: sampleCaptions.map((s) => s.trim()).filter(Boolean),
            sampleCaption: sampleCaptions[0]?.trim() || undefined,
            voiceDescription: voiceDescription.trim() || undefined,
          } satisfies BrandVoice,
        },
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save brand voice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    brandName !== (saved.brandName ?? "") ||
    tagline !== (saved.tagline ?? "") ||
    JSON.stringify(personality) !== JSON.stringify(saved.personality ?? []) ||
    targetAudience !== (saved.targetAudience ?? "") ||
    JSON.stringify(captionStyle) !== JSON.stringify(saved.captionStyle ?? []) ||
    alwaysInclude !== (saved.alwaysInclude ?? "") ||
    neverSay !== (saved.neverSay ?? "") ||
    JSON.stringify(sampleCaptions) !== JSON.stringify(savedSamples) ||
    voiceDescription !== (saved.voiceDescription ?? "");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Feather name="mic" size={28} color={PRIMARY} />
          </View>
          <Text style={styles.heroTitle}>Your Brand Voice</Text>
          <Text style={styles.heroDesc}>
            Tell us who you are and every caption will sound unmistakably like you — not a generic AI.
          </Text>
        </View>

        {/* Brand Name + Tagline */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Brand Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sunrise Coffee Co."
            placeholderTextColor={MUTED}
            value={brandName}
            onChangeText={setBrandName}
          />
          <Text style={styles.hint}>Captions will reference your brand by name when appropriate</Text>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Tagline / Slogan</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Built for dreamers, designed for doers"
            placeholderTextColor={MUTED}
            value={tagline}
            onChangeText={setTagline}
          />
          <Text style={styles.hint}>Your signature phrase — the AI will mirror its energy and rhythm</Text>
        </View>

        {/* Personality */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Brand Personality</Text>
          <Text style={styles.subLabel}>Pick up to 4 that describe your brand's voice</Text>
          <View style={styles.chips}>
            {PERSONALITIES.map((p) => {
              const selected = personality.includes(p);
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    if (!selected && personality.length >= 4) return;
                    togglePersonality(p);
                  }}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    !selected && personality.length >= 4 && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {personality.length > 0 && (
            <Text style={styles.hint}>Selected: {personality.join(", ")}</Text>
          )}
        </View>

        {/* Target Audience */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Target Audience</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="e.g. Women aged 28–45 who love self-care and are budget-conscious"
            placeholderTextColor={MUTED}
            value={targetAudience}
            onChangeText={setTargetAudience}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Be specific — the AI writes directly to this person</Text>
        </View>

        {/* Writing Style */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Writing Style</Text>
          <Text style={styles.subLabel}>Structural habits that make your captions feel like you</Text>
          <View style={styles.chips}>
            {WRITING_STYLES.map((s) => {
              const selected = captionStyle.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleStyle(s)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {captionStyle.length > 0 && (
            <Text style={styles.hint}>Selected: {captionStyle.join(", ")}</Text>
          )}
        </View>

        {/* Always Include */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Always Weave In</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="e.g. quality, handcrafted, community, locally sourced"
            placeholderTextColor={MUTED}
            value={alwaysInclude}
            onChangeText={setAlwaysInclude}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Keywords, themes, or phrases your brand is known for</Text>
        </View>

        {/* Never Say */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Never Use</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="e.g. cheap, deal, discount, best price in town"
            placeholderTextColor={MUTED}
            value={neverSay}
            onChangeText={setNeverSay}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Words or phrases that don't fit your brand</Text>
        </View>

        {/* Voice Description */}
        <View style={styles.card}>
          <View style={styles.sampleHeader}>
            <Feather name="mic" size={14} color={PRIMARY} />
            <Text style={styles.fieldLabel}>How Do You Sound?</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={"Describe your voice like you're telling a friend. e.g. \"I'm direct and a little sarcastic, I never use fluff, I swear occasionally, and I always end with a question.\""}
            placeholderTextColor={MUTED}
            value={voiceDescription}
            onChangeText={setVoiceDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Your own words beat any checkbox — be honest and specific</Text>
        </View>

        {/* Sample Captions */}
        <View style={styles.card}>
          <View style={styles.sampleHeader}>
            <Feather name="star" size={14} color={PRIMARY} />
            <Text style={styles.fieldLabel}>Caption Examples</Text>
          </View>
          <Text style={styles.subLabel}>
            Paste real captions you've written. The more examples you give, the more accurately the AI clones your voice.
          </Text>
          {sampleCaptions.map((sample, index) => (
            <View key={index} style={index > 0 ? styles.sampleEntry : undefined}>
              <View style={styles.sampleLabelRow}>
                <Text style={styles.sampleIndexLabel}>Example {index + 1}</Text>
                {index > 0 && (
                  <Pressable onPress={() => removeSample(index)} hitSlop={8}>
                    <Feather name="x" size={14} color={MUTED} />
                  </Pressable>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.textareaLarge]}
                placeholder={
                  index === 0
                    ? "Paste your best caption here — include hashtags if you use them.\n\nThe AI will study every pattern: sentence length, punctuation, emojis, how you open, how you close."
                    : "Another caption you've written — different post type is even better."
                }
                placeholderTextColor={MUTED}
                value={sample}
                onChangeText={(v) => updateSample(index, v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          ))}
          {sampleCaptions.length < 3 && (
            <Pressable style={styles.addSampleBtn} onPress={addSample}>
              <Feather name="plus" size={14} color={PRIMARY} />
              <Text style={styles.addSampleText}>Add another example</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>3 examples = near-perfect voice cloning</Text>
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            (!hasChanges || saving) && styles.saveBtnDisabled,
            pressed && hasChanges && styles.saveBtnPressed,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Brand Voice</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#F8EFE4",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0E3D3",
  },
  _unused: {
    lineHeight: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 10,
  },
  sampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: FOREGROUND,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginTop: -4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: FOREGROUND,
    backgroundColor: "#FFFDF9",
  },
  textarea: {
    minHeight: 72,
    lineHeight: 22,
  },
  textareaLarge: {
    minHeight: 110,
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    backgroundColor: "#FFFDF9",
  },
  chipSelected: {
    backgroundColor: "#F8EFE4",
    borderColor: PRIMARY,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
    color: MUTED,
  },
  chipTextSelected: {
    color: PRIMARY,
    fontFamily: "Nunito_600SemiBold",
  },
  sampleEntry: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  sampleLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sampleIndexLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addSampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  addSampleText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: PRIMARY,
  },
  saveBtn: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  saveBtnPressed: {
    backgroundColor: "#D4A055",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
});
