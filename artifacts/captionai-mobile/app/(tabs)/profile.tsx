import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import Paywall from "@/components/Paywall";
import { useSubscription } from "@/lib/revenuecat";

const PRIMARY = "#7C3AED";
const BG = "#FAFAFA";
const FOREGROUND = "#19141F";
const MUTED = "#6B7280";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F3F4F6";
const DANGER = "#DC2626";

type BrandVoice = {
  brandName?: string;
  personality?: string[];
  targetAudience?: string;
  alwaysInclude?: string;
  neverSay?: string;
};

type UserMeta = {
  username?: string;
  location?: string;
  age?: string;
  brandVoice?: BrandVoice;
};

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { usageCount: generationCount, freeLimit: FREE_LIMIT } = useApp();
  const { isSubscribed } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const meta = (user?.unsafeMetadata ?? {}) as UserMeta;

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName
    ? user.firstName[0].toUpperCase()
    : user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
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

  const usagePercent = Math.min((generationCount / FREE_LIMIT) * 100, 100);
  const remaining = Math.max(FREE_LIMIT - generationCount, 0);

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
            {imageUrl ? (
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
    fontFamily: "Inter_700Bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
  },
  editButtonPressed: {
    backgroundColor: "#DDD6FE",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_700Bold",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: FOREGROUND,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  username: {
    fontSize: 14,
    color: PRIMARY,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    color: MUTED,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usageLabel: {
    fontSize: 14,
    color: FOREGROUND,
    fontFamily: "Inter_400Regular",
  },
  usageCount: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_400Regular",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    color: FOREGROUND,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_600SemiBold",
  },
  flex1: { flex: 1 },
  proText: {
    color: "#16A34A",
    fontFamily: "Inter_600SemiBold",
  },
  brandVoiceCard: {
    gap: 12,
  },
  brandVoiceCardPressed: {
    backgroundColor: "#F5F3FF",
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
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  brandVoiceTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: FOREGROUND,
  },
  brandVoiceSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 1,
  },
  brandVoiceEmpty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: PRIMARY,
    marginTop: 1,
  },
  personalityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  personalityChip: {
    backgroundColor: "#EDE9FE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  personalityChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: PRIMARY,
  },
  upgradePill: {
    marginLeft: "auto",
    backgroundColor: "#EDE9FE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upgradePillPressed: {
    backgroundColor: "#DDD6FE",
  },
  upgradePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeCard: {
    backgroundColor: "#EDE9FE",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upgradeCardPressed: {
    backgroundColor: "#DDD6FE",
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
    color: PRIMARY,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeSub: {
    fontSize: 12,
    color: "#5B21B6",
    fontFamily: "Inter_400Regular",
  },
});
