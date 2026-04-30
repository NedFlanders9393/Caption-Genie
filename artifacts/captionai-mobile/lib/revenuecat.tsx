import React, { createContext, useContext } from "react";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

export function initializeRevenueCat() {
  // RevenueCat not yet configured — skipped
}

const stubValue = {
  customerInfo: null,
  offerings: null,
  isSubscribed: false,
  isLoading: false,
  purchase: async (_pkg: any) => { throw new Error("Subscriptions not yet available"); },
  restore: async () => { throw new Error("Subscriptions not yet available"); },
  isPurchasing: false,
  isRestoring: false,
};

type SubscriptionContextValue = typeof stubValue;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={stubValue}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
