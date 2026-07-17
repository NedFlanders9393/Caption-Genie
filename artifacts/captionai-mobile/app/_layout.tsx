import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AnimatedSplash from "@/components/AnimatedSplash";

const BG = "#FFFDF9";
const AMBER = "#E8B669";

// Branded fallback shown if Clerk is still restoring the session after the
// animated splash has dismissed. Guarantees a cream branded screen instead of a
// blank white flash on slow networks / cold proxy starts.
function BrandedLoader() {
  return (
    <View style={loaderStyles.fill}>
      <ActivityIndicator size="large" color={AMBER} />
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider, initializeRevenueCat, linkRevenueCatIdentity } from "@/lib/revenuecat";
import { getDeviceId } from "@/lib/deviceId";
import { initGlobalCrashHandler, flushPendingCrashes, reportCrash } from "@/lib/crashReporter";

function RevenueCatIdentityLinker() {
  const { user } = useUser();
  useEffect(() => {
    if (user?.id) {
      linkRevenueCatIdentity(user.id);
    }
  }, [user?.id]);
  return null;
}

// Reports when Clerk has finished restoring the session so the splash can stay
// on screen until the app is actually ready (instead of fading to a second loader).
function ClerkReadySignal({ onReady }: { onReady: () => void }) {
  const { isLoaded } = useAuth();
  useEffect(() => {
    if (isLoaded) onReady();
  }, [isLoaded, onReady]);
  return null;
}

// NOTE: ShareExtensionTokenSyncer was removed from the launch path because the
// Share Extension is not currently included in the build (no plugin in app.json
// adds TokenSync.swift/.m to the Xcode project). Calling NativeModules.TokenSync
// when it isn't registered is a no-op in tokenSync.ts, but keeping the
// component in the render tree adds a useEffect with a `useSession()` subscription
// that runs on every mount during the launch window. Re-add when shipping the
// Share Extension.


SplashScreen.preventAutoHideAsync();

// Install the global JS error handler immediately at module load time.
// This runs before any component mounts so no crashes slip through.
initGlobalCrashHandler();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          presentation: "modal",
          headerStyle: { backgroundColor: "#FFFDF9" },
          headerTintColor: "#E8B669",
          headerTitleStyle: { fontFamily: "Nunito_600SemiBold", color: "#3A3129" },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="daily-rewards"
        options={{
          title: "Daily Rewards",
          presentation: "modal",
          headerStyle: { backgroundColor: "#FFFDF9" },
          headerTintColor: "#E8B669",
          headerTitleStyle: { fontFamily: "Nunito_600SemiBold", color: "#3A3129" },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="brand-voice"
        options={{
          title: "Brand Voice",
          presentation: "modal",
          headerStyle: { backgroundColor: "#FFFDF9" },
          headerTintColor: "#E8B669",
          headerTitleStyle: { fontFamily: "Nunito_600SemiBold", color: "#3A3129" },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [splashDone, setSplashDone] = useState(false);
  const [clerkReady, setClerkReady] = useState(false);
  const router = useRouter();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    (async () => {
      try {
        const deviceId = await getDeviceId();
        initializeRevenueCat(deviceId ? `guest_${deviceId}` : undefined);
      } catch {
        initializeRevenueCat();
      }
    })();
  }, []);

  // Flush any crashes that were queued offline during a previous session
  useEffect(() => {
    flushPendingCrashes().catch(() => {});
  }, []);

  // Handle tapping a notification — route the user to the relevant screen.
  //
  // Registration is GATED on already-granted notification permission. This
  // eliminates the expo-notifications TurboModule call from the launch path
  // entirely on fresh installs (which never have permission) and matches the
  // crash signature observed in builds 10–14 (TurboModule exception via
  // RCTTurboModule.mm on a worker thread, JS try/catch can't contain it).
  // On users who already granted permission, we still defer 2s past launch.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (cancelled || status !== "granted") return;
        notifListenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const type = response.notification.request.content.data?.type;
            if (type === "streak_reminder") {
              router.push("/(tabs)/generate");
            } else if (type === "low_usage") {
              router.push("/(tabs)/profile");
            }
          }
        );
      } catch {
        // expo-notifications can throw on some iOS versions — ignore
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      notifListenerRef.current?.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkReadySignal onReady={() => setClerkReady(true)} />
      <ClerkLoading>
        <BrandedLoader />
      </ClerkLoading>
      <ClerkLoaded>
        <RevenueCatIdentityLinker />
        <SafeAreaProvider>
          <ErrorBoundary onError={(error, stack) => reportCrash(error, "ErrorBoundary").catch(() => {})}>
            <QueryClientProvider client={queryClient}>
              <SubscriptionProvider>
                <AppProvider>
                  <GestureHandlerRootView>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </AppProvider>
              </SubscriptionProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
      {!splashDone && (
        <AnimatedSplash
          ready={clerkReady}
          onFinish={() => setSplashDone(true)}
          maxDurationMs={12000}
        />
      )}
    </ClerkProvider>
  );
}
