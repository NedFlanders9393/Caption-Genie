import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider, initializeRevenueCat, linkRevenueCatIdentity } from "@/lib/revenuecat";

function RevenueCatIdentityLinker() {
  const { user } = useUser();
  useEffect(() => {
    if (user?.id) {
      linkRevenueCatIdentity(user.id);
    }
  }, [user?.id]);
  return null;
}

SplashScreen.preventAutoHideAsync();

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
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#3A3129" },
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
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#3A3129" },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const router = useRouter();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    try {
      initializeRevenueCat();
    } catch (err: any) {
      Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
    }
  }, []);

  // Handle tapping a notification — route the user to the relevant screen
  useEffect(() => {
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
    return () => {
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
      <ClerkLoaded>
        <RevenueCatIdentityLinker />
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <SubscriptionProvider>
                <AppProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </AppProvider>
              </SubscriptionProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
