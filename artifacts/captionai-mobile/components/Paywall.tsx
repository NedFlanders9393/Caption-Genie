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
const TOP_UP_PACK_IDS = {
  small: "captionai_credits_50",
  medium: "captionai_credits_200",
  large: "captionai_credits_500",
} as const;

const TOP_UP_PACKS: {
  id: keyof typeof TOP_UP_PACK_IDS;
  credits: number;
  fallbackPrice: string;
  perCredit: string;
  badge?: string;
}[] = [
  { id: "small", credits: 50, fallbackPrice: "$4.99", perCredit: "$0.10 / credit" },
  { id: "medium", credits: 200, fallbackPrice: "$14.99", perCredit: "$0.075 / credit", badge: "POPULAR" },
  { id: "large", credits: 500, fallbackPrice: "$29.99", perCredit: "$0.06 / credit", badge: "BEST VALUE" },
];

export default function Paywall({ visible, onClose }: Props) {
  const { offerings, purchase, restore, isPurchasing, isRestoring, isNativeAvailable } = useSubscription();

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages ?? [];

  const monthlyPkg = packages.find(
    (p: any) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const monthlyPrice = monthlyPkg?.product?.priceString ?? "$9.99";

  // Find top-up packages by product identifier match.
  const findTopUpPkg = (productId: string) =>
    packages.find((p: any) => p.product?.identifier === productId || p.identifier === productId);

  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchasePro = async () => {
    if (!monthlyPkg) return;
    setPurchasingId("pro");
    try {
      await purchase(monthlyPkg);
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
                <Text style={styles.explainerBold}>Hashtags are always free</Text> — no credits used
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
                <Text style={styles.explainerBold}>Top-up credits never expire</Text> — Pro credits reset monthly
              </Text>
            </View>
          </View>

          {/* Pro subscription */}
          <Text style={styles.sectionLabel}>Subscribe & save</Text>
          <View style={[styles.proCard]}>
            <View style={styles.proHeader}>
              <View style={styles.proHeaderLeft}>
                <Text style={styles.proName}>Captly Pro</Text>
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
              </View>
              <Text style={styles.proPrice}>{monthlyPrice}/mo</Text>
            </View>
            <Text style={styles.proCreditsLine}>
              <Text style={styles.proCreditsNumber}>150 credits</Text> every month
            </Text>
            <Text style={styles.proPerCredit}>That's just $0.067 per credit</Text>

            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                (anyLoading || !monthlyPkg) && styles.ctaDisabled,
              ]}
              onPress={handlePurchasePro}
              disabled={anyLoading || !monthlyPkg}
            >
              {purchasingId === "pro" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {monthlyPkg ? `Start Pro — ${monthlyPrice}/month` : "Pro plan unavailable"}
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
            Captly Pro auto-renews monthly. Cancel anytime in your App Store account settings.
            Credit packs are one-time purchases.
          </Text>

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
