import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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

const PRIMARY = "#7C3AED";
const PRIMARY_DARK = "#6D28D9";
const BG = "#FAFAFA";
const FOREGROUND = "#19141F";
const MUTED = "#6B7280";
const INPUT_BG = "#FFFFFF";
const INPUT_BORDER = "#E5E7EB";
const INPUT_BORDER_FOCUS = "#7C3AED";
const ERROR_COLOR = "#DC2626";
const ERROR_BG = "#FEF2F2";
const ERROR_BORDER = "#FECACA";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);

  const isLoading = fetchStatus === "fetching";

  // Auto-navigate when auth state updates
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn]);

  const handleSubmit = async () => {
    setGeneralError(null);
    try {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) {
        setGeneralError(error.message ?? "Something went wrong. Please try again.");
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setGeneralError(sendError.message ?? "Failed to send verification code.");
      }
    } catch (err: any) {
      setGeneralError(err?.message ?? "Something went wrong. Please try again.");
    }
  };

  const handleVerify = async () => {
    setGeneralError(null);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setGeneralError(error.message ?? "Invalid code. Please try again.");
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => {
            router.replace("/(tabs)");
          },
        });
      } else {
        setGeneralError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setGeneralError(err?.message ?? "Verification failed. Please try again.");
    }
  };

  if (signUp.status === "complete" || isSignedIn) return null;

  // Verification step
  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>✦</Text>
              </View>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: PRIMARY, fontFamily: "Inter_600SemiBold" }}>
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

              <Pressable
                style={styles.textButton}
                onPress={async () => {
                  try {
                    await signUp.verifications.sendEmailCode();
                  } catch (err: any) {
                    setGeneralError(err?.message ?? "Failed to resend. Please try again.");
                  }
                }}
              >
                <Text style={styles.textButtonText}>Resend code</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Sign-up form
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>✦</Text>
            </View>
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
              {errors.fields.emailAddress && (
                <Text style={styles.fieldError}>{errors.fields.emailAddress.message}</Text>
              )}
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
              {errors.fields.password && (
                <Text style={styles.fieldError}>{errors.fields.password.message}</Text>
              )}
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

      {/* Required for Clerk bot protection */}
      <View nativeID="clerk-captcha" />
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
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    color: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: FOREGROUND,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: FOREGROUND,
    fontFamily: "Inter_500Medium",
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
    fontFamily: "Inter_400Regular",
  },
  inputFocused: {
    borderColor: INPUT_BORDER_FOCUS,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldError: {
    fontSize: 13,
    color: ERROR_COLOR,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  button: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    backgroundColor: PRIMARY_DARK,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  textButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  textButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  terms: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
  },
  link: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
