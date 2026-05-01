import { useUser } from "@clerk/expo";
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

export interface BrandVoice {
  brandName?: string;
  personality: string[];
  targetAudience?: string;
  alwaysInclude?: string;
  neverSay?: string;
}

export default function BrandVoiceScreen() {
  const { user } = useUser();
  const router = useRouter();

  const saved = (user?.unsafeMetadata?.brandVoice ?? {}) as BrandVoice;

  const [brandName, setBrandName] = useState(saved.brandName ?? "");
  const [personality, setPersonality] = useState<string[]>(saved.personality ?? []);
  const [targetAudience, setTargetAudience] = useState(saved.targetAudience ?? "");
  const [alwaysInclude, setAlwaysInclude] = useState(saved.alwaysInclude ?? "");
  const [neverSay, setNeverSay] = useState(saved.neverSay ?? "");
  const [saving, setSaving] = useState(false);

  const togglePersonality = (p: string) => {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
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
            personality,
            targetAudience: targetAudience.trim() || undefined,
            alwaysInclude: alwaysInclude.trim() || undefined,
            neverSay: neverSay.trim() || undefined,
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
    JSON.stringify(personality) !== JSON.stringify(saved.personality ?? []) ||
    targetAudience !== (saved.targetAudience ?? "") ||
    alwaysInclude !== (saved.alwaysInclude ?? "") ||
    neverSay !== (saved.neverSay ?? "");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
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

        {/* Brand Name */}
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
    fontFamily: "Inter_700Bold",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: FOREGROUND,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: -4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: FOREGROUND,
    backgroundColor: "#FFFDF9",
  },
  textarea: {
    minHeight: 72,
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_500Medium",
    color: MUTED,
  },
  chipTextSelected: {
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
