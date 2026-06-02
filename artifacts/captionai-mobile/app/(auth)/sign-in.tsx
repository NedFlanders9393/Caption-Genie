import { useAuth, useClerk, useSignIn } from "@clerk/expo";
import { claimFreeCreditsForDevice } from "../../lib/api";
import { getDeviceId } from "../../lib/deviceId";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#E8B669";
const PRIMARY_DARK = "#D4A055";
const BG = "#FFFDF9";
const FOREGROUND = "#3A3129";
const MUTED = "#8C7A6B";
const INPUT_BG = "#FFFFFF";
const INPUT_BORDER = "#F0E3D3";
const INPUT_BORDER_FOCUS = "#E8B669";
const ERROR_COLOR = "#DC2626";
const ERROR_BG = "#FEF2F2";
const ERROR_BORDER = "#FECACA";

export default function SignInPage() {
  const { signIn } = useSignIn();
  const clerk = useClerk() as any;
  const { isSignedIn, getToken } = useAuth() as any;
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isSignedIn]);

  const handleSignIn = async () => {
    if (!signIn) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    const email = emailAddress.trim();
    if (!email || !password) {
      setGeneralError("Please enter your email and password.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const si = signIn as any;

      // Clerk v6 "Future API": password() does sign-in in one step.
      // Returns { error } — actual status lives on the reactive signIn resource.
      const { error } = await si.password({ identifier: email, password });

      if (error) {
        const msg = error.longMessage ?? error.message ?? "Sign-in failed. Please try again.";
        setGeneralError(msg);
        return;
      }

      if (si.status === "complete" && si.createdSessionId) {
        await clerk.setActive({ session: si.createdSessionId });
        try {
          const [deviceId, token] = await Promise.all([getDeviceId(), getToken?.()]);
          if (deviceId && token) claimFreeCreditsForDevice(deviceId, token).catch(() => {});
        } catch {}
        router.replace("/(tabs)/home");
      } else {
        setGeneralError(`Sign-in incomplete (status: ${si.status ?? "unknown"}). Please try again.`);
      }
    } catch (err: unknown) {
      const e = err as any;
      const msg =
        e?.errors?.[0]?.longMessage ??
        e?.errors?.[0]?.message ??
        e?.message ??
        "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSignedIn) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Feather name="feather" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Captly account</Text>
          </View>

          <View style={styles.form}>
            {generalError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{generalError}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                autoCapitalize="none"
                value={emailAddress}
                placeholder="you@example.com"
                placeholderTextColor={MUTED}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                value={password}
                placeholder="Your password"
                placeholderTextColor={MUTED}
                secureTextEntry
                onChangeText={setPassword}
                autoComplete="password"
                textContentType="password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                isLoading && styles.buttonDisabled,
                pressed && !isLoading && styles.buttonPressed,
              ]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text style={styles.link}>Sign up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: FOREGROUND,
    fontFamily: "Nunito_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: ERROR_BG,
    borderWidth: 1,
    borderColor: ERROR_BORDER,
    borderRadius: 10,
    padding: 12,
  },
  errorBoxText: {
    fontSize: 14,
    color: ERROR_COLOR,
    fontFamily: "Nunito_400Regular",
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: FOREGROUND,
    fontFamily: "Nunito_500Medium",
  },
  input: {
    height: 52,
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: FOREGROUND,
    fontFamily: "Nunito_400Regular",
  },
  inputFocused: {
    borderColor: INPUT_BORDER_FOCUS,
  },
  button: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    backgroundColor: PRIMARY_DARK,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
  },
  link: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
