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
import { useRouter } from "expo-router";
import { useSubscription } from "@/lib/revenuecat";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PRIMARY = "#E8B669";
const BG = "#FFFDF9";
const FOREGROUND = "#3A3129";
const MUTED = "#8C7A6B";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F0E3D3";
const AMBER_LIGHT = "#F8EFE4";

// Top-up pack identifiers — server-side RevenueCat seed should match these.
// Until the RC seed script is updated to create these products, the UI will
// show "Coming soon" for any pack whose package isn't found in offerings.
// Must match App Store / Play Store product identifiers seeded in
// scripts/src/seedRevenueCat.ts (CREDIT_PACKS[].storeId) and the webhook map
// in artifacts/api-server/src/routes/revenuecatWebhook.ts.
const TOP_UP_PACK_IDS = {
  mini: "com.captionai.app.credits.10",
  small: "com.captionai.app.credits.50",
  medium: "com.captionai.app.credits.200",
  large: "com.captionai.app.credits.500",
} as const;

const TOP_UP_PACKS: {
  id: keyof typeof TOP_UP_PACK_IDS;
  credits: number;
  fallbackPrice: string;
  perCredit: string;
  badge?: string;
}[] = [
  { id: "mini", credits: 10, fallbackPrice: "$1.99", perCredit: "$0.20 / credit" },
  { id: "small", credits: 20, fallbackPrice: "$3.99", perCredit: "$0.20 / credit" },
  { id: "medium", credits: 50, fallbackPrice: "$8.99", perCredit: "$0.18 / credit", badge: "POPULAR" },
  { id: "large", credits: 200, fallbackPrice: "$24.99", perCredit: "$0.12 / credit", badge: "BEST VALUE" },
];

function formatCurrency(amount: number, currencyCode?: string, sample?: string): string {
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(amount);
    } catch {
      // fall through to symbol-based formatting
    }
  }
  const symbol = sample?.match(/^[^\d]+/)?.[0]?.trim() ?? "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export default function Paywall({ visible, onClose }: Props) {
  const router = useRouter();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isNativeAvailable } = useSubscription();

  const openLegal = (path: "/terms" | "/privacy-policy") => {
    onClose();
    router.push(path);
  };

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages ?? [];

  const monthlyPkg = packages.find(
    (p: any) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const monthlyPrice = monthlyPkg?.product?.priceString ?? "$9.99";

  const annualPkg = packages.find(
    (p: any) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );
  const annualProduct = annualPkg?.product;
  const annualNum = annualProduct?.price;
  const monthlyNum = monthlyPkg?.product?.price;
  // Only treat annual as available when it resolves to a real, purchasable store
  // product with a valid price. The RC `$rc_annual` package can exist as a
  // placeholder before the App Store product is live — showing it would present
  // an un-buyable option that fails silently on press.
  const hasAnnual =
    !!annualPkg &&
    !!annualProduct?.identifier &&
    typeof annualNum === "number" &&
    annualNum > 0;
  const annualPrice = annualProduct?.priceString ?? "$59.99";

  const savingsPct =
    monthlyNum && annualNum
      ? Math.round((1 - annualNum / (monthlyNum * 12)) * 100)
      : 50;
  const annualPerMonth =
    typeof annualNum === "number" && annualNum > 0
      ? formatCurrency(annualNum / 12, annualProduct?.currencyCode, monthlyPrice)
      : "$5.00";

  // Find top-up packages by product identifier match.
  const findTopUpPkg = (productId: string) =>
    packages.find((p: any) => p.product?.identifier === productId || p.identifier === productId);

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  const effectivePlan: "monthly" | "annual" = hasAnnual ? selectedPlan : "monthly";
  const activePkg = effectivePlan === "annual" ? annualPkg : monthlyPkg;
  const ctaLabel =
    effectivePlan === "annual"
      ? `Start Pro — ${annualPrice}/year`
      : `Start Pro — ${monthlyPrice}/month`;

  const handlePurchasePro = async () => {
    if (!activePkg) return;
    setPurchasingId("pro");
    try {
      await purchase(activePkg);
      onClose();
    } catch {
      // User cancelled or error
    } finally {
      setPurchasingId(null);
    }
  };

  const handlePurchaseTopUp = async (productId: string) => {
    const pkg = findTopUpPkg(productId);
    if (!pkg) return;
    setPurchasingId(productId);
    try {
      await purchase(pkg);
      onClose();
    } catch {
      // User cancelled or error
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      onClose();
    } catch {}
  };

  const anyLoading = isPurchasing || isRestoring;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
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
            <Text style={styles.title}>Get more credits</Text>
            <Text style={styles.subtitle}>
              Generate captions on demand with a simple credit system
            </Text>
          </View>

          {/* How credits work */}
          <View style={styles.explainerCard}>
            <Text style={styles.explainerTitle}>How credits work</Text>
            <View style={styles.explainerRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.explainerText}>
                <Text style={styles.explainerBold}>1 credit</Text> = 1 caption generation (3 unique captions)
              </Text>
            </View>
            <View style={styles.explainerRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.explainerText}>
                <Text style={styles.explainerBold}>Hashtags &amp; remixes are free</Text> — no credits used, with a generous monthly allowance
              </Text>
            </View>
            <View style={styles.explainerRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.explainerText}>
                <Text style={styles.explainerBold}>Failed generations are refunded</Text> automatically
              </Text>
            </View>
            <View style={styles.explainerRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.explainerText}>
                <Text style={styles.explainerBold}>Monthly credits reset each month</Text> (they don&apos;t roll over) — top-up credits never expire
              </Text>
            </View>
          </View>

          {/* Pro subscription */}
          <Text style={styles.sectionLabel}>Subscribe & save</Text>
          <View style={[styles.proCard]}>
            <View style={styles.proHeader}>
              <Text style={styles.proName}>Captly Pro</Text>
              <View style={styles.creditsBadge}>
                <Text style={styles.creditsBadgeText}>150 credits / mo</Text>
              </View>
            </View>

            {hasAnnual ? (
              <View style={styles.planOptions}>
                <Pressable
                  onPress={() => setSelectedPlan("annual")}
                  style={[
                    styles.planOption,
                    effectivePlan === "annual" && styles.planOptionSelected,
                  ]}
                >
                  <View style={styles.planLeft}>
                    <View
                      style={[
                        styles.radio,
                        effectivePlan === "annual" && styles.radioSelected,
                      ]}
                    >
                      {effectivePlan === "annual" ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.planTextWrap}>
                      <View style={styles.planTitleRow}>
                        <Text style={styles.planTitle}>Annual</Text>
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>SAVE {savingsPct}%</Text>
                        </View>
                      </View>
                      <Text style={styles.planSub}>
                        {annualPrice}/year · {annualPerMonth}/mo
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedPlan("monthly")}
                  style={[
                    styles.planOption,
                    effectivePlan === "monthly" && styles.planOptionSelected,
                  ]}
                >
                  <View style={styles.planLeft}>
                    <View
                      style={[
                        styles.radio,
                        effectivePlan === "monthly" && styles.radioSelected,
                      ]}
                    >
                      {effectivePlan === "monthly" ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.planTextWrap}>
                      <Text style={styles.planTitle}>Monthly</Text>
                      <Text style={styles.planSub}>{monthlyPrice}/month</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.proCreditsLine}>
                  <Text style={styles.proCreditsNumber}>150 credits</Text> every month
                </Text>
                <Text style={styles.proPerCredit}>{monthlyPrice}/month</Text>
              </>
            )}

            <View style={styles.proBenefit}>
              <Feather name="zap" size={14} color={PRIMARY} />
              <Text style={styles.proBenefitText}>
                <Text style={styles.explainerBold}>Our most advanced AI</Text> — sharper, more creative, more on-brand captions
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                (anyLoading || !activePkg) && styles.ctaDisabled,
              ]}
              onPress={handlePurchasePro}
              disabled={anyLoading || !activePkg}
            >
              {purchasingId === "pro" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {activePkg ? ctaLabel : "Pro plan unavailable"}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Top-up packs */}
          <Text style={styles.sectionLabel}>One-time credit packs</Text>
          <Text style={styles.sectionHint}>
            No subscription — credits never expire
          </Text>
          <View style={styles.packsList}>
            {TOP_UP_PACKS.map((pack) => {
              const productId = TOP_UP_PACK_IDS[pack.id];
              const pkg = findTopUpPkg(productId);
              const available = !!pkg;
              const priceLabel = pkg?.product?.priceString ?? pack.fallbackPrice;
              const isThisLoading = purchasingId === productId;

              return (
                <View key={pack.id} style={styles.packCard}>
                  <View style={styles.packTop}>
                    <View style={styles.packLeft}>
                      <Text style={styles.packCredits}>{pack.credits} credits</Text>
                      <Text style={styles.packPerCredit}>{pack.perCredit}</Text>
                    </View>
                    <View style={styles.packRight}>
                      {pack.badge ? (
                        <View style={styles.packBadge}>
                          <Text style={styles.packBadgeText}>{pack.badge}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.packPrice}>{priceLabel}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.packBuyBtn,
                      pressed && available && styles.packBuyBtnPressed,
                      (anyLoading || !available) && styles.packBuyBtnDisabled,
                    ]}
                    onPress={() => handlePurchaseTopUp(productId)}
                    disabled={anyLoading || !available}
                  >
                    {isThisLoading ? (
                      <ActivityIndicator color={PRIMARY} size="small" />
                    ) : (
                      <Text
                        style={[
                          styles.packBuyText,
                          !available && styles.packBuyTextDisabled,
                        ]}
                      >
                        {available ? `Buy ${pack.credits} credits` : "Coming soon"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Restore + disclaimer */}
          <Pressable
            onPress={handleRestore}
            disabled={anyLoading}
            style={styles.restoreBtn}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={MUTED} />
            ) : (
              <Text style={styles.restoreText}>Restore purchase</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Captly Pro auto-renews (monthly or yearly, depending on the plan you choose) until cancelled.
            Cancel anytime in your App Store account settings. Credit packs are one-time purchases.
          </Text>

          <View style={styles.legalLinks}>
            <Pressable onPress={() => openLegal("/terms")} hitSlop={8}>
              <Text style={styles.legalLinkText}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable onPress={() => openLegal("/privacy-policy")} hitSlop={8}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </Pressable>
          </View>

          {!isNativeAvailable ? (
            <Text style={styles.devNote}>
              Note: purchases are disabled in Expo Go preview. Available in TestFlight / production builds.
            </Text>
          ) : null}
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
    top: 20,
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
    gap: 18,
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
    backgroundColor: AMBER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
  },
  explainerCard: {
    backgroundColor: AMBER_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    gap: 10,
  },
  explainerTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
    marginBottom: 4,
  },
  explainerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 7,
  },
  explainerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: FOREGROUND,
    lineHeight: 20,
  },
  explainerBold: {
    fontFamily: "Nunito_700Bold",
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginTop: -10,
  },
  proCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PRIMARY,
    padding: 18,
    gap: 6,
  },
  proHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  proHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proName: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
  },
  proPrice: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
  },
  proCreditsLine: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    color: FOREGROUND,
    marginTop: 4,
  },
  proCreditsNumber: {
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
  },
  proPerCredit: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginBottom: 10,
  },
  proBenefit: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: AMBER_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  proBenefitText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: FOREGROUND,
    lineHeight: 19,
  },
  bestValueBadge: {
    backgroundColor: AMBER_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  creditsBadge: {
    backgroundColor: AMBER_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  creditsBadgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  planOptions: {
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  planOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: AMBER_LIGHT,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  planTextWrap: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: PRIMARY,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
  },
  planSub: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  packsList: {
    gap: 10,
  },
  packCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 12,
  },
  packTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packLeft: {
    flex: 1,
  },
  packRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  packCredits: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
  },
  packPerCredit: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    marginTop: 2,
  },
  packBadge: {
    backgroundColor: AMBER_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  packBadgeText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  packPrice: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: FOREGROUND,
  },
  packBuyBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  packBuyBtnPressed: {
    backgroundColor: AMBER_LIGHT,
  },
  packBuyBtnDisabled: {
    borderColor: CARD_BORDER,
    backgroundColor: "#FAFAFA",
  },
  packBuyText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    color: PRIMARY,
  },
  packBuyTextDisabled: {
    color: MUTED,
  },
  cta: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  legalLinkText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: PRIMARY,
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
    color: MUTED,
  },
  devNote: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 16,
    fontStyle: "italic",
    marginTop: 6,
  },
});
