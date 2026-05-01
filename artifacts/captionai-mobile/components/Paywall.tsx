import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSubscription } from "@/lib/revenuecat";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PRIMARY = "#7C3AED";
const BG = "#FAFAFA";
const FOREGROUND = "#19141F";
const MUTED = "#6B7280";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F3F4F6";
const SUCCESS = "#16A34A";

const FEATURES = [
  "Unlimited caption generation",
  "All 22 business niches",
  "12 tone combinations",
  "Hashtag tool — unlimited",
  "Priority generation speed",
  "Early access to new features",
];

export default function Paywall({ visible, onClose }: Props) {
  const { offerings, purchase, restore, isPurchasing, isRestoring } = useSubscription();

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages ?? [];

  // Find monthly and annual packages by identifier
  const monthlyPkg = packages.find(
    (p: any) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const annualPkg = packages.find(
    (p: any) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );

  const [selected, setSelected] = useState<"monthly" | "annual">("annual");

  const selectedPkg = selected === "monthly" ? monthlyPkg : annualPkg;
  const monthlyPrice = monthlyPkg?.product?.priceString ?? "$9.99";
  const annualPrice = annualPkg?.product?.priceString ?? "$99.99";

  // Calculate per-month cost for annual to show savings
  const annualMonthly = annualPkg?.product?.price
    ? `$${(annualPkg.product.price / 12).toFixed(2)}/mo`
    : "$8.33/mo";

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    try {
      await purchase(selectedPkg);
      onClose();
    } catch {
      // User cancelled or error — stay on screen
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      onClose();
    } catch {}
  };

  const isLoading = isPurchasing || isRestoring;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close */}
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Feather name="x" size={22} color={MUTED} />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <Feather name="zap" size={32} color={PRIMARY} />
            </View>
            <Text style={styles.title}>Unlock Pro</Text>
            <Text style={styles.subtitle}>
              Generate unlimited captions for your business
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Feather name="check" size={12} color={PRIMARY} />
                </View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Plan selector */}
          <Text style={styles.planLabel}>Choose your plan</Text>
          <View style={styles.plans}>
            {/* Annual — shown first as recommended */}
            <Pressable
              style={[styles.planCard, selected === "annual" && styles.planCardSelected]}
              onPress={() => setSelected("annual")}
            >
              <View style={styles.planCardTop}>
                <View style={styles.planCardLeft}>
                  <View style={styles.planRadio}>
                    {selected === "annual" && <View style={styles.planRadioInner} />}
                  </View>
                  <View>
                    <View style={styles.planNameRow}>
                      <Text style={[styles.planName, selected === "annual" && styles.planNameSelected]}>
                        Annual
                      </Text>
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    </View>
                    <Text style={styles.planSub}>{annualMonthly} · billed yearly</Text>
                  </View>
                </View>
                <Text style={[styles.planPrice, selected === "annual" && styles.planPriceSelected]}>
                  {annualPrice}
                </Text>
              </View>
            </Pressable>

            {/* Monthly */}
            <Pressable
              style={[styles.planCard, selected === "monthly" && styles.planCardSelected]}
              onPress={() => setSelected("monthly")}
            >
              <View style={styles.planCardTop}>
                <View style={styles.planCardLeft}>
                  <View style={styles.planRadio}>
                    {selected === "monthly" && <View style={styles.planRadioInner} />}
                  </View>
                  <View>
                    <Text style={[styles.planName, selected === "monthly" && styles.planNameSelected]}>
                      Monthly
                    </Text>
                    <Text style={styles.planSub}>cancel anytime</Text>
                  </View>
                </View>
                <Text style={[styles.planPrice, selected === "monthly" && styles.planPriceSelected]}>
                  {monthlyPrice}/mo
                </Text>
              </View>
            </Pressable>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              (isLoading || !selectedPkg) && styles.ctaDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isLoading || !selectedPkg}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>
                {selected === "annual"
                  ? `Start Pro — ${annualPrice}/year`
                  : `Start Pro — ${monthlyPrice}/month`}
              </Text>
            )}
          </Pressable>

          {/* Restore + disclaimer */}
          <Pressable
            onPress={handleRestore}
            disabled={isLoading}
            style={styles.restoreBtn}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={MUTED} />
            ) : (
              <Text style={styles.restoreText}>Restore purchase</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Subscriptions auto-renew. Cancel anytime in your{"\n"}App Store account settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === "web" ? 60 : 0,
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 20,
    right: 20,
    padding: 8,
    zIndex: 10,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  scroll: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 20,
  },
  hero: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: FOREGROUND,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: FOREGROUND,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  plans: {
    gap: 10,
  },
  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    padding: 16,
  },
  planCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#FAFAFF",
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: FOREGROUND,
  },
  planNameSelected: {
    color: PRIMARY,
  },
  bestValueBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  planSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: FOREGROUND,
  },
  planPriceSelected: {
    color: PRIMARY,
  },
  cta: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
});
