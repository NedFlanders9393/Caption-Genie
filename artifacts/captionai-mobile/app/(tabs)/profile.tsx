import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import Paywall from "@/components/Paywall";
import { useSubscription } from "@/lib/revenuecat";
import { fetchCreditBalance, type CreditBalance } from "@/lib/api";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const PRIMARY = "#E8B669";
const BG = "#FFFDF9";
const FOREGROUND = "#3A3129";
const MUTED = "#8C7A6B";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F0E3D3";
const DANGER = "#DC2626";

type BrandVoice = {
  brandName?: string;
  personality?: string[];
  targetAudience?: string;
  alwaysInclude?: string;
  neverSay?: string;
};

type UserMeta = {
  firstName?: string;
  lastName?: string;
  username?: string;
  location?: string;
  age?: string;
  brandVoice?: BrandVoice;
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const router = useRouter();
  const { usageCount: generationCount, freeLimit: FREE_LIMIT } = useApp();
  const { isSubscribed, restore, isRestoring } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugDescription, setBugDescription] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = useCallback(() => {
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.current.start();
  }, [spinAnim]);

  const stopSpin = useCallback(() => {
    spinLoop.current?.stop();
    spinLoop.current = null;
    spinAnim.setValue(0);
  }, [spinAnim]);

  const loadCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      setCreditsError(null);
      startSpin();
      const token = await getToken();
      const bal = await fetchCreditBalance(token);
      setCredits(bal);
    } catch (err) {
      setCreditsError((err as Error)?.message ?? "Couldn't load credit balance");
    } finally {
      setCreditsLoading(false);
      stopSpin();
    }
  }, [getToken, startSpin, stopSpin]);

  // Refresh credits every time the tab becomes focused so users see fresh
  // balance after a generation, restore, or purchase elsewhere in the app.
  useFocusEffect(
    useCallback(() => {
      void loadCredits();
    }, [loadCredits]),
  );

  const meta = (user?.unsafeMetadata ?? {}) as UserMeta;

  const resolvedFirst = meta.firstName || user?.firstName || "";
  const resolvedLast = meta.lastName || user?.lastName || "";

  const initials = resolvedFirst && resolvedLast
    ? `${resolvedFirst[0]}${resolvedLast[0]}`.toUpperCase()
    : resolvedFirst
    ? resolvedFirst[0].toUpperCase()
    : user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  const displayName = resolvedFirst
    ? `${resolvedFirst}${resolvedLast ? ` ${resolvedLast}` : ""}`
    : user?.emailAddresses[0]?.emailAddress ?? "User";

  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const imageUrl = user?.imageUrl;

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const handleRestore = async () => {
    try {
      const info = await restore();
      const active = (info.activeSubscriptions?.length ?? 0) > 0 ||
        Object.keys(info.entitlements?.active ?? {}).length > 0;
      if (active) {
        Alert.alert("Purchases Restored", "Your Pro subscription has been restored successfully.");
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases tied to your account.");
      }
    } catch (err: any) {
      Alert.alert("Restore Failed", err?.message ?? "Unable to restore purchases. Please try again.");
    }
  };

  const usagePercent = Math.min((generationCount / FREE_LIMIT) * 100, 100);
  const remaining = Math.max(FREE_LIMIT - generationCount, 0);

  const handleSubmitBug = async () => {
    if (bugDescription.trim().length < 5) {
      Alert.alert("Too short", "Please describe the bug in a bit more detail.");
      return;
    }
    setBugSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/bugs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          description: bugDescription.trim(),
          expectedBehavior: bugExpected.trim() || undefined,
          platform: Platform.OS,
          appVersion: "1.0.0",
          userEmail: email,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error ?? `Server error ${res.status}`);
      }
      setBugSubmitted(true);
      setBugDescription("");
      setBugExpected("");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not submit your report. Please try again.");
    } finally {
      setBugSubmitting(false);
    }
  };

  const handleCloseBugModal = () => {
    setBugModalVisible(false);
    setBugSubmitted(false);
    setBugDescription("");
    setBugExpected("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Profile</Text>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            onPress={() => router.push("/edit-profile")}
          >
            <Feather name="edit-2" size={15} color={PRIMARY} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        {/* Avatar + Name */}
        <View style={styles.avatarCard}>
          <Pressable onPress={() => router.push("/edit-profile")}>
            {user?.hasImage && imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.displayName}>{displayName}</Text>
          {meta.username ? (
            <Text style={styles.username}>@{meta.username}</Text>
          ) : null}
          <Text style={styles.email}>{email}</Text>
          {(meta.location || meta.age) ? (
            <View style={styles.metaRow}>
              {meta.location ? (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={12} color={MUTED} />
                  <Text style={styles.metaText}>{meta.location}</Text>
                </View>
              ) : null}
              {meta.age ? (
                <View style={styles.metaItem}>
                  <Feather name="user" size={12} color={MUTED} />
                  <Text style={styles.metaText}>{meta.age} yrs</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Credits */}
        <View style={styles.card}>
          <View style={styles.creditsHeader}>
            <Text style={styles.cardTitle}>Credits</Text>
            <TouchableOpacity onPress={loadCredits} disabled={creditsLoading} hitSlop={10}>
              <Animated.View style={{
                transform: [{
                  rotate: spinAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  })
                }]
              }}>
                <Feather name="refresh-cw" size={14} color={MUTED} />
              </Animated.View>
            </TouchableOpacity>
          </View>
          {creditsLoading && !credits ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 12 }} />
          ) : creditsError && !credits ? (
            <Text style={[styles.usageSub, { color: DANGER }]}>{creditsError}</Text>
          ) : credits ? (
            <>
              <View style={styles.creditsTotalRow}>
                <Text style={styles.creditsTotalValue}>{credits.total}</Text>
                <Text style={styles.creditsTotalLabel}>credits available</Text>
              </View>
              <View style={styles.creditsBreakdown}>
                <View style={styles.creditsBreakdownItem}>
                  <Text style={styles.creditsBreakdownValue}>{credits.subscription}</Text>
                  <Text style={styles.creditsBreakdownLabel}>From Pro</Text>
                </View>
                <View style={styles.creditsBreakdownDivider} />
                <View style={styles.creditsBreakdownItem}>
                  <Text style={styles.creditsBreakdownValue}>{credits.purchased}</Text>
                  <Text style={styles.creditsBreakdownLabel}>Purchased</Text>
                </View>
              </View>
              {creditsError ? (
                <Text style={[styles.usageSub, { color: DANGER }]}>
                  Couldn't refresh: {creditsError}
                </Text>
              ) : (
                <Text style={styles.usageSub}>
                  {credits.lifetimeUsed} used all-time · 1 credit per caption set
                </Text>
              )}
            </>
          ) : null}
        </View>

        {/* Usage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Free generations used</Text>
            <Text style={styles.usageCount}>
              {generationCount} / {FREE_LIMIT}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usagePercent}%` as any }]} />
          </View>
          {remaining > 0 ? (
            <Text style={styles.usageSub}>
              {remaining} generation{remaining !== 1 ? "s" : ""} remaining this month
            </Text>
          ) : (
            <Text style={[styles.usageSub, { color: DANGER }]}>
              Monthly limit reached
            </Text>
          )}
        </View>

        {/* Brand Voice */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.brandVoiceCard, pressed && styles.brandVoiceCardPressed]}
          onPress={() => router.push("/brand-voice")}
        >
          <View style={styles.brandVoiceHeader}>
            <View style={styles.brandVoiceIconWrap}>
              <Feather name="mic" size={18} color={PRIMARY} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.brandVoiceTitle}>Brand Voice</Text>
              {meta.brandVoice?.brandName ? (
                <Text style={styles.brandVoiceSub}>{meta.brandVoice.brandName}</Text>
              ) : (
                <Text style={styles.brandVoiceEmpty}>Set your brand's personality</Text>
              )}
            </View>
            <Feather name="chevron-right" size={16} color={MUTED} />
          </View>
          {meta.brandVoice?.personality && meta.brandVoice.personality.length > 0 && (
            <View style={styles.personalityRow}>
              {meta.brandVoice.personality.slice(0, 4).map((p) => (
                <View key={p} style={styles.personalityChip}>
                  <Text style={styles.personalityChipText}>{p}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={MUTED} />
            <Text style={styles.infoText}>{email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Feather name="shield" size={16} color={isSubscribed ? "#16A34A" : MUTED} />
            <Text style={[styles.infoText, isSubscribed && styles.proText]}>
              {isSubscribed ? "Pro plan" : "Free plan"}
            </Text>
            {!isSubscribed && (
              <Pressable
                style={({ pressed }) => [styles.upgradePill, pressed && styles.upgradePillPressed]}
                onPress={() => setPaywallVisible(true)}
              >
                <Text style={styles.upgradePillText}>Upgrade</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.restoreRow, pressed && styles.restoreRowPressed]}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Feather name="refresh-cw" size={16} color={PRIMARY} />
            )}
            <Text style={styles.restoreText}>
              {isRestoring ? "Restoring…" : "Restore Purchases"}
            </Text>
          </Pressable>
        </View>

        {/* Upgrade to Pro banner — only for free users */}
        {!isSubscribed && (
          <Pressable
            style={({ pressed }) => [styles.upgradeCard, pressed && styles.upgradeCardPressed]}
            onPress={() => setPaywallVisible(true)}
          >
            <View style={styles.upgradeIcon}>
              <Feather name="zap" size={20} color={PRIMARY} />
            </View>
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSub}>Unlimited captions · $9.99/mo or $99.99/yr</Text>
            </View>
            <Feather name="chevron-right" size={18} color={PRIMARY} />
          </Pressable>
        )}

        {/* Help & Support */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Help & Support</Text>
          <Pressable
            style={({ pressed }) => [styles.helpRow, pressed && styles.helpRowPressed]}
            onPress={() => setBugModalVisible(true)}
          >
            <View style={styles.helpIcon}>
              <Feather name="alert-circle" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.helpText}>Report a Bug</Text>
            <Feather name="chevron-right" size={16} color={MUTED} />
          </Pressable>
        </View>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <Pressable
            style={({ pressed }) => [styles.helpRow, pressed && styles.helpRowPressed]}
            onPress={() => router.push("/privacy-policy")}
          >
            <View style={styles.helpIcon}>
              <Feather name="shield" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.helpText}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color={MUTED} />
          </Pressable>
          <View style={styles.helpDivider} />
          <Pressable
            style={({ pressed }) => [styles.helpRow, pressed && styles.helpRowPressed]}
            onPress={() => router.push("/terms")}
          >
            <View style={styles.helpIcon}>
              <Feather name="file-text" size={16} color={PRIMARY} />
            </View>
            <Text style={styles.helpText}>Terms of Service</Text>
            <Feather name="chevron-right" size={16} color={MUTED} />
          </Pressable>
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={16} color={DANGER} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <Paywall visible={paywallVisible} onClose={() => setPaywallVisible(false)} />

      {/* Bug Report Modal */}
      <Modal
        visible={bugModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseBugModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Report a Bug</Text>
              <TouchableOpacity onPress={handleCloseBugModal} hitSlop={12}>
                <Feather name="x" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {bugSubmitted ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Feather name="check-circle" size={48} color={PRIMARY} />
                </View>
                <Text style={styles.successTitle}>Thanks for letting us know!</Text>
                <Text style={styles.successSub}>
                  Your report has been received. We review every submission and fix issues as quickly as possible.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={handleCloseBugModal}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Describe what happened and we'll investigate it right away.
                </Text>

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>What went wrong?</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextarea]}
                    placeholder="e.g. The app crashed when I tapped Generate, the caption didn't copy, the platform selector stopped working..."
                    placeholderTextColor={MUTED}
                    value={bugDescription}
                    onChangeText={setBugDescription}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>What did you expect to happen? <Text style={styles.optional}>(optional)</Text></Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextareaSmall]}
                    placeholder="e.g. The caption should have copied to my clipboard"
                    placeholderTextColor={MUTED}
                    value={bugExpected}
                    onChangeText={setBugExpected}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (bugSubmitting || bugDescription.trim().length < 5) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmitBug}
                  disabled={bugSubmitting || bugDescription.trim().length < 5}
                  activeOpacity={0.85}
                >
                  {bugSubmitting ? (
                    <Text style={styles.submitBtnText}>Submitting...</Text>
                  ) : (
                    <>
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Submit Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  container: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: FOREGROUND,
    fontFamily: "Nunito_700Bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F8EFE4",
  },
  editButtonPressed: {
    backgroundColor: "#F0E3D3",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Nunito_600SemiBold",
  },
  avatarCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 4,
  },
  avatarFallback: {
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: FOREGROUND,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  username: {
    fontSize: 14,
    color: PRIMARY,
    fontFamily: "Nunito_500Medium",
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    fontFamily: "Nunito_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  creditsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creditsTotalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  creditsTotalValue: {
    fontSize: 36,
    fontWeight: "700",
    color: FOREGROUND,
    letterSpacing: -1,
  },
  creditsTotalLabel: {
    fontSize: 13,
    color: MUTED,
  },
  creditsBreakdown: {
    flexDirection: "row",
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  creditsBreakdownItem: {
    flex: 1,
    alignItems: "center",
  },
  creditsBreakdownDivider: {
    width: 1,
    backgroundColor: CARD_BORDER,
  },
  creditsBreakdownValue: {
    fontSize: 18,
    fontWeight: "600",
    color: FOREGROUND,
  },
  creditsBreakdownLabel: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usageLabel: {
    fontSize: 14,
    color: FOREGROUND,
    fontFamily: "Nunito_400Regular",
  },
  usageCount: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Nunito_600SemiBold",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 4,
  },
  usageSub: {
    fontSize: 13,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    color: FOREGROUND,
    fontFamily: "Nunito_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: CARD_BORDER,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    padding: 16,
    marginTop: 4,
  },
  signOutPressed: {
    backgroundColor: "#FEF2F2",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: DANGER,
    fontFamily: "Nunito_600SemiBold",
  },
  flex1: { flex: 1 },
  proText: {
    color: "#16A34A",
    fontFamily: "Nunito_600SemiBold",
  },
  brandVoiceCard: {
    gap: 12,
  },
  brandVoiceCardPressed: {
    backgroundColor: "#F8EFE4",
  },
  brandVoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandVoiceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8EFE4",
    alignItems: "center",
    justifyContent: "center",
  },
  brandVoiceTitle: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: FOREGROUND,
  },
  brandVoiceSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginTop: 1,
  },
  brandVoiceEmpty: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: PRIMARY,
    marginTop: 1,
  },
  personalityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  personalityChip: {
    backgroundColor: "#F8EFE4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  personalityChipText: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: PRIMARY,
  },
  restoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  restoreRowPressed: {
    opacity: 0.6,
  },
  restoreText: {
    fontSize: 15,
    color: PRIMARY,
    fontFamily: "Nunito_500Medium",
  },
  upgradePill: {
    marginLeft: "auto",
    backgroundColor: "#F8EFE4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upgradePillPressed: {
    backgroundColor: "#F0E3D3",
  },
  upgradePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Nunito_600SemiBold",
  },
  upgradeCard: {
    backgroundColor: "#F8EFE4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0E3D3",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upgradeCardPressed: {
    backgroundColor: "#F0E3D3",
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: {
    flex: 1,
    gap: 2,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A3129",
    fontFamily: "Nunito_600SemiBold",
  },
  upgradeSub: {
    fontSize: 12,
    color: "#8C7A6B",
    fontFamily: "Nunito_400Regular",
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  helpRowPressed: { opacity: 0.7 },
  helpIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8EFE4",
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_500Medium",
    color: FOREGROUND,
  },
  helpDivider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 4,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  modalHeader: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: CARD_BORDER,
    alignSelf: "center",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
  },
  modalScroll: { flex: 1 },
  modalContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    lineHeight: 20,
  },
  modalField: { gap: 8 },
  modalFieldLabel: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: FOREGROUND,
  },
  optional: {
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    fontSize: 13,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: FOREGROUND,
    backgroundColor: "#FFFFFF",
  },
  modalTextarea: {
    minHeight: 130,
    lineHeight: 22,
  },
  modalTextareaSmall: {
    minHeight: 80,
    lineHeight: 22,
  },
  submitBtn: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
  successContainer: {
    alignItems: "center",
    gap: 16,
    paddingTop: 40,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F8EFE4",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  doneBtn: {
    marginTop: 8,
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
});
