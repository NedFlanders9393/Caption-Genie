import { useAuth, useSignUp } from "@clerk/expo";
import { claimFreeCreditsForDevice } from "../../lib/api";
import { getDeviceId } from "../../lib/deviceId";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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

type Step = "credentials" | "verify";

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const { isSignedIn, getToken } = useAuth() as any;
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

  const completeSignUp = async (su: any) => {
    await su.finalize();
    try {
      const [deviceId, token] = await Promise.all([getDeviceId(), getToken?.()]);
      if (deviceId && token) claimFreeCreditsForDevice(deviceId, token).catch(() => {});
    } catch {}
    router.replace("/(tabs)/home");
  };

  const handleSubmit = async () => {
    if (!signUp) {
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
      const su = signUp as any;

      // Clerk v6 "Future API": password() creates the pending sign-up.
      // Returns { error } — actual state lives on the reactive signUp resource.
      // The verification email is dispatched separately below via sendEmailCode().
      const { error } = await su.password({ emailAddress: email, password });

      if (error) {
        const msg = error.longMessage ?? error.message ?? "Sign-up failed. Please try again.";
        setGeneralError(msg);
        return;
      }

      if (su.status === "complete") {
        await completeSignUp(su);
      } else {
        // Clerk v6 "Future API": password() creates the pending sign-up but does
        // NOT send the verification email — we must dispatch it explicitly.
        const { error: sendError } = await su.verifications.sendEmailCode();
        if (sendError) {
          const msg =
            sendError.longMessage ??
            sendError.message ??
            "Couldn't send a verification code. Please try again.";
          setGeneralError(msg);
          return;
        }
        setStep("verify");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUp) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const su = signUp as any;

      // Clerk v6 "Future API": verifyEmailCode() is on signUp.verifications
      const { error } = await su.verifications.verifyEmailCode({ code: code.trim() });

      if (error) {
        const msg = error.longMessage ?? error.message ?? "Verification failed. Please try again.";
        setGeneralError(msg);
        return;
      }

      if (su.status === "complete") {
        await completeSignUp(su);
      } else {
        setGeneralError(`Verification incomplete (status: ${su.status ?? "unknown"}). Please try again.`);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Verification failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!signUp) return;
    setGeneralError(null);
    try {
      const su = signUp as any;
      // Canonical Future API: resend the verification code
      const { error } = await su.verifications.sendEmailCode();
      if (error) {
        const msg = error.longMessage ?? error.message ?? "Failed to resend. Please try again.";
        setGeneralError(msg);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? "Failed to resend. Please try again.";
      setGeneralError(msg);
    }
  };

  if (isSignedIn) return null;

  if (step === "verify") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
            <View style={styles.header}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
              />
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
                onPress={handleVerify}
                disabled={isLoading || !code}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Verifying…" : "Verify email"}
                </Text>
              </Pressable>

              <Pressable style={styles.textButton} onPress={handleResend}>
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Start generating captions that actually convert
            </Text>
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
                placeholder="At least 8 characters"
                placeholderTextColor={MUTED}
                secureTextEntry
                onChangeText={setPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (!emailAddress || !password || isLoading) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!emailAddress || !password || isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Creating account…" : "Create account"}
              </Text>
            </Pressable>

            <Text style={styles.terms}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable>
                  <Text style={styles.link}>Sign in</Text>
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
  terms: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
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
