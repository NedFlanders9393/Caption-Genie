import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  "Unlimited caption generation",
  "All 22 business niches",
  "12 tone combinations",
  "Hashtag tool — unlimited",
  "Priority generation speed",
];

export default function Paywall({ visible, onClose }: Props) {
  const colors = useColors();
  const { offerings, purchase, restore, isPurchasing, isRestoring } = useSubscription();

  const currentOffering = offerings?.current;
  const pkg = currentOffering?.availablePackages[0];
  const price = pkg?.product?.priceString ?? "$9.99";

  const handlePurchase = async () => {
    if (!pkg) return;
    try {
      await purchase(pkg);
      onClose();
    } catch {}
  };

  const handleRestore = async () => {
    try {
      await restore();
      onClose();
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.secondary, borderRadius: colors.radius },
            ]}
          >
            <Feather name="zap" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Unlock Pro</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Generate unlimited captions for your business
          </Text>
        </View>

        <View
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check" size={16} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring || !pkg}
            style={[
              styles.cta,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: isPurchasing || !pkg ? 0.7 : 1,
              },
            ]}
            activeOpacity={0.85}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {price}/month — Start Pro
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
            activeOpacity={0.7}
            style={styles.restore}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                Restore purchase
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Cancel anytime. Billed monthly.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 100 : 60,
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 60 : 20,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  hero: {
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  featureCard: {
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    gap: 14,
    alignItems: "center",
  },
  cta: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  restore: {
    paddingVertical: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
