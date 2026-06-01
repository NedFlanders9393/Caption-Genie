import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_STORE_KEY = "captly_device_id";

function generateSimpleUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable device identifier for anti-abuse fingerprinting.
 *
 * iOS: uses identifierForVendor (stable until app is uninstalled).
 * Fallback: generates a UUID stored in SecureStore (iOS Keychain — survives
 * reinstalls unless the user explicitly wipes their keychain).
 *
 * This ID is sent to the server when claiming free credits. It is NOT used
 * for tracking or advertising — only for abuse prevention.
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === "ios") {
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return vendorId;
    }

    // Fallback: persisted UUID in SecureStore
    const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (stored) return stored;

    const fresh = generateSimpleUuid();
    await SecureStore.setItemAsync(SECURE_STORE_KEY, fresh);
    return fresh;
  } catch {
    // If everything fails, return a session-only random ID (won't persist
    // across reinstalls but at least lets the claim attempt proceed)
    return generateSimpleUuid();
  }
}
