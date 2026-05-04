import { NativeModules, Platform } from "react-native";

const { TokenSync } = NativeModules as {
  TokenSync?: {
    setToken(token: string): void;
    clearToken(): void;
    setNiche(niche: string): void;
  };
};

/** Write the Clerk JWT to the shared App Group so the Share Extension can use it. */
export function syncAuthToken(token: string): void {
  if (Platform.OS === "ios" && TokenSync) {
    try {
      TokenSync.setToken(token);
    } catch {
      // Native module unavailable in Expo Go — safe to ignore
    }
  }
}

/** Write the user's selected niche to the shared App Group. */
export function syncNiche(niche: string): void {
  if (Platform.OS === "ios" && TokenSync) {
    try {
      TokenSync.setNiche(niche);
    } catch {}
  }
}

/** Clear the stored token (on sign-out). */
export function clearAuthToken(): void {
  if (Platform.OS === "ios" && TokenSync) {
    try {
      TokenSync.clearToken();
    } catch {}
  }
}
