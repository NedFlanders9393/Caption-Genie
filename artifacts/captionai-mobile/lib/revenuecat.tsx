import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

// react-native-purchases: native module only — not available on web.
// Guard every call with Platform.OS !== "web" checks below.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Purchases: any = Platform.OS !== "web" ? (() => { try { return require("react-native-purchases").default; } catch { return null; } })() : null;
const purchasesAvailable = Purchases !== null;
let purchasesConfigured = false;
// If linkRevenueCatIdentity() is called before configure() finishes (Clerk can
// resolve the user before RC init completes), buffer the id and apply it as soon
// as configuration is done — otherwise a signed-in user could be stranded on the
// guest RC identity for the whole session.
let pendingLinkUserId: string | null = null;

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

function getRevenueCatApiKey(): string | null {
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY || null;
  }
  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY || null;
  }
  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY || null;
  }
  return REVENUECAT_TEST_API_KEY || null;
}

export function initializeRevenueCat(appUserId?: string | null) {
  if (Platform.OS === "web") return;
  if (!purchasesAvailable) {
    console.warn("[RevenueCat] Native module not available (Expo Go). Subscription features will be disabled.");
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn("[RevenueCat] Public API key not configured — subscription features disabled.");
    return;
  }

  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    // Configure with the guest device identity (guest_<deviceId>) when no user
    // is signed in, so guest purchases attribute to the same ledger row the API
    // server uses for that device. On sign-in, linkRevenueCatIdentity() aliases
    // this to the Clerk user id. Apple 5.1.1(v): purchases must not require
    // registration.
    Purchases.configure(appUserId ? { apiKey, appUserID: appUserId } : { apiKey });
    purchasesConfigured = true;
    // Apply any identity link that arrived before configuration completed.
    if (pendingLinkUserId) {
      const id = pendingLinkUserId;
      pendingLinkUserId = null;
      Purchases.logIn(id).catch((err: unknown) =>
        console.warn("[RevenueCat] Failed to link buffered identity:", err),
      );
    }
  } catch (err) {
    console.warn("[RevenueCat] configure() failed — subscription features disabled:", err);
    purchasesConfigured = false;
  }
}

export async function linkRevenueCatIdentity(clerkUserId: string): Promise<void> {
  if (Platform.OS === "web" || !purchasesAvailable) return;
  // Not configured yet — buffer the id so init can apply it once ready.
  if (!purchasesConfigured) {
    pendingLinkUserId = clerkUserId;
    return;
  }
  try {
    await Purchases.logIn(clerkUserId);
  } catch (err) {
    console.warn("[RevenueCat] Failed to link identity:", err);
  }
}

// Stub customer info returned when native module is unavailable
const STUB_CUSTOMER_INFO = {
  entitlements: { active: {} },
};

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      if (!purchasesAvailable || !purchasesConfigured) return STUB_CUSTOMER_INFO;
      try {
        return await Purchases.getCustomerInfo();
      } catch (err) {
        console.warn("[RevenueCat] getCustomerInfo failed:", err);
        return STUB_CUSTOMER_INFO;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      if (!purchasesAvailable || !purchasesConfigured) return null;
      try {
        return await Purchases.getOfferings();
      } catch (err) {
        console.warn("[RevenueCat] getOfferings failed:", err);
        return null;
      }
    },
    staleTime: 300 * 1000,
    retry: false,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      if (!purchasesAvailable || !purchasesConfigured) {
        throw new Error("Subscriptions are not available yet. Please try again later.");
      }
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!purchasesAvailable || !purchasesConfigured) {
        throw new Error("Subscriptions are not available yet. Please try again later.");
      }
      return Purchases.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isNativeAvailable: purchasesAvailable,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
