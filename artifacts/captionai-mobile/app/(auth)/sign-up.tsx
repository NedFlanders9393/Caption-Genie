import { useAuth, useClerk, useSignUp } from "@clerk/expo";
import { claimFreeCreditsForDevice } from "../../lib/api";
import { getDeviceId } from "../../lib/deviceId";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signUp, isLoaded, setActive: setActiveHook } = useSignUp() as any;
  const { setActive: setActiveClerk } = useClerk() as any;
  const setActive = setActiveHook ?? setActiveClerk;
  const { isSignedIn, getToken } = useAuth() as any;
  const router = useRouter();

  // Hold the SignUpResource returned by create() so handleVerify can use it.
  // The hook ref may become stale after create() triggers a re-render.
  const signUpResourceRef = useRef<any>(null);

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

  const handleSubmit = async () => {
    if (!signUp || !setActive) {
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
      // Always use the RETURNED resource — the hook ref may be stale after create() re-renders.
      const resource = await signUp.create({ emailAddress: email, password }) as any;
      signUpResourceRef.current = resource;

      console.log("[sign-up] created, status=", resource?.status,
        "hasPrepareEmail=", typeof resource?.prepareEmailAddressVerification,
        "hasPrepareVer=", typeof resource?.prepareVerification,
        "hookHasPrepareEmail=", typeof signUp?.prepareEmailAddressVerification,
        "hookHasPrepareVer=", typeof signUp?.prepareVerification);

      // If Clerk completed sign-up without needing email verification, go straight in.
      if (resource?.status === "complete" && resource?.createdSessionId) {
        await setActive({ session: resource.createdSessionId });
        try {
          const [deviceId, token] = await Promise.all([getDeviceId(), getToken?.()]);
          if (deviceId && token) claimFreeCreditsForDevice(deviceId, token).catch(() => {});
        } catch {}
        router.replace("/(tabs)/home");
        return;
      }

      // Try every known prepare-verification method (native vs web SDK naming).
      const su = resource ?? signUp;
      if (typeof su?.prepareEmailAddressVerification === "function") {
        await su.prepareEmailAddressVerification({ strategy: "email_code" });
      } else if (typeof su?.prepareVerification === "function") {
        await su.prepareVerification({ strategy: "email_code" });
      } else if (typeof signUp?.prepareEmailAddressVerification === "function") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      } else if (typeof signUp?.prepareVerification === "function") {
        await signUp.prepareVerification({ strategy: "email_code" });
      } else {
        // Neither method found — Clerk may auto-send the email on create().
        // Proceed to the code entry step anyway.
        console.log("[sign-up] no prepare method found; proceeding to verify step");
      }

      setStep("verify");
    } catch (err: any) {
      console.log("[sign-up] error", err?.errors, err?.message, String(err));
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        String(err) ??
        "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!setActive) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      // Prefer the resource returned by create() over the potentially-stale hook ref.
      const su = signUpResourceRef.current ?? signUp;
      let result: any;
      if (typeof su?.attemptEmailAddressVerification === "function") {
        result = await su.attemptEmailAddressVerification({ code });
      } else if (typeof su?.attemptVerification === "function") {
        result = await su.attemptVerification({ strategy: "email_code", code });
      } else if (typeof signUp?.attemptEmailAddressVerification === "function") {
        result = await signUp.attemptEmailAddressVerification({ code });
      } else {
        result = await signUp.attemptVerification({ strategy: "email_code", code });
      }

      console.log("[verify] status=", result?.status, "sessionId=", result?.createdSessionId ?? su?.createdSessionId);
      const sessionId = result?.createdSessionId ?? su?.createdSessionId ?? signUp?.createdSessionId;
      if (sessionId) {
        await setActive({ session: sessionId });
        try {
          const [deviceId, token] = await Promise.all([getDeviceId(), getToken?.()]);
          if (deviceId && token) claimFreeCreditsForDevice(deviceId, token).catch(() => {});
        } catch {}
        router.replace("/(tabs)/home");
      } else {
        setGeneralError(`Verification incomplete (status: ${result?.status ?? "unknown"}). Please try again.`);
      }
    } catch (err: any) {
      console.log("[verify] error", err?.errors, err?.message, String(err));
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Verification failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded) return;
    setGeneralError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
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
