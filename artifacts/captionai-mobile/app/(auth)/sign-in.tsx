import { useAuth, useSignIn } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

type Step = "credentials" | "second_factor";

export default function SignInPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signIn, setActive, isLoaded } = useSignIn() as any;
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isSignedIn]);

  const handleSignIn = async () => {
    if (!isLoaded) {
      setGeneralError("Authentication is still loading. Please wait a moment and try again.");
      return;
    }
    if (!emailAddress.trim() || !password) {
      setGeneralError("Please enter your email and password.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setStep("second_factor");
      } else {
        setGeneralError(`Sign-in could not complete (status: ${result.status}). Please try again.`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded) return;
    setGeneralError(null);
    setIsLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");
      } else {
        setGeneralError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Verification failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    setGeneralError(null);
    try {
      await signIn.prepareSecondFactor({ strategy: "email_code" });
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? "Could not resend. Please try again.";
      setGeneralError(msg);
    }
  };

  if (isSignedIn) return null;

  // Block the form until Clerk is ready — never show a sign-in button that can't work
  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 14, fontFamily: "Nunito_400Regular", color: MUTED, fontSize: 14 }}>
          Loading…
        </Text>
      </SafeAreaView>
    );
  }

  if (step === "second_factor") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Feather name="feather" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: PRIMARY, fontFamily: "Nunito_600SemiBold" }}>
                  {emailAddress}
                </Text>
              </Text>
            </View>

            <View style={styles.form}>
              {generalError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{generalError}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[styles.input, codeFocused && styles.inputFocused]}
                  value={code}
                  placeholder="000000"
                  placeholderTextColor={MUTED}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoFocus
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !code) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleVerifyCode}
                disabled={isLoading || !code}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Verifying…" : "Verify & sign in"}
                </Text>
              </Pressable>

              <Pressable style={styles.textButton} onPress={handleResendCode}>
                <Text style={styles.textButtonText}>Resend code</Text>
              </Pressable>

              <Pressable
                style={styles.textButton}
                onPress={() => {
                  setStep("credentials");
                  setCode("");
                  setGeneralError(null);
                }}
              >
                <Text style={[styles.textButtonText, { color: MUTED }]}>← Back</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Captly account</Text>
          </View>

          <View style={styles.form}>
            {generalError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{generalError}</Text>
              </View>
            )}

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
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
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
  textButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  textButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: "Nunito_500Medium",
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
