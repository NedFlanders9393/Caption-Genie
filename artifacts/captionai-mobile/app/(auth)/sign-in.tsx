import { useAuth, useSignIn } from "@clerk/expo";
import { claimFreeCreditsForDevice } from "../../lib/api";
import { getDeviceId } from "../../lib/deviceId";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

type Step = "credentials" | "verify" | "reset_request" | "reset_verify";

export default function SignInPage() {
  const { signIn } = useSignIn();
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
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isSignedIn]);

  // Set the new session as active and finish the sign-in flow.
  const finalizeAndContinue = async (si: any) => {
    await si.finalize();
    try {
      const [deviceId, token] = await Promise.all([getDeviceId(), getToken?.()]);
      if (deviceId && token) claimFreeCreditsForDevice(deviceId, token).catch(() => {});
    } catch {}
    router.replace("/(tabs)/home");
  };

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

      // Clerk v6 "Future API": password() verifies the first factor in one step.
      // Returns { error } — actual status lives on the reactive signIn resource.
      const { error } = await si.password({ identifier: email, password });

      if (error) {
        const msg = error.longMessage ?? error.message ?? "Sign-in failed. Please try again.";
        setGeneralError(msg);
        return;
      }

      if (si.status === "complete") {
        await finalizeAndContinue(si);
        return;
      }

      // New / untrusted device: Clerk requires a second factor. Replit-managed
      // Clerk uses an email verification code for this. Send it and show the
      // code-entry step.
      if (si.status === "needs_second_factor" || si.status === "needs_client_trust") {
        const factors = (si.supportedSecondFactors ?? []) as Array<{ strategy?: string }>;
        const hasEmailCode = factors.some((f) => f.strategy === "email_code");
        if (hasEmailCode || si.status === "needs_client_trust") {
          const { error: sendError } = await si.mfa.sendEmailCode();
          if (sendError) {
            const msg = sendError.longMessage ?? sendError.message ?? "Couldn't send a verification code. Please try again.";
            setGeneralError(msg);
            return;
          }
          setStep("verify");
          return;
        }
        setGeneralError("This account requires an extra verification step that isn't available. Please contact support.");
        return;
      }

      setGeneralError(`Sign-in incomplete (status: ${si.status ?? "unknown"}). Please try again.`);
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

  const handleVerify = async () => {
    if (!signIn) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const si = signIn as any;

      const { error } = await si.mfa.verifyEmailCode({ code: code.trim() });

      if (error) {
        const msg = error.longMessage ?? error.message ?? "Verification failed. Please try again.";
        setGeneralError(msg);
        return;
      }

      if (si.status === "complete") {
        await finalizeAndContinue(si);
      } else {
        setGeneralError(`Verification incomplete (status: ${si.status ?? "unknown"}). Please try again.`);
      }
    } catch (err: unknown) {
      const e = err as any;
      const msg =
        e?.errors?.[0]?.longMessage ??
        e?.errors?.[0]?.message ??
        e?.message ??
        "Verification failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!signIn) return;
    setGeneralError(null);
    try {
      const si = signIn as any;
      const { error } = await si.mfa.sendEmailCode();
      if (error) {
        const msg = error.longMessage ?? error.message ?? "Failed to resend. Please try again.";
        setGeneralError(msg);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? "Failed to resend. Please try again.";
      setGeneralError(msg);
    }
  };

  // ---- Forgot password (reset via emailed code) ----
  const startReset = () => {
    setGeneralError(null);
    setCode("");
    setNewPassword("");
    setStep("reset_request");
  };

  const handleSendReset = async () => {
    if (!signIn) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    const email = emailAddress.trim();
    if (!email) {
      setGeneralError("Please enter your email address.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const si = signIn as any;
      // Establish the sign-in attempt with the identifier, then send a
      // password-reset code to the account's email (Clerk v6 Future API).
      const { error: createError } = await si.create({ identifier: email });
      if (createError) {
        const msg = createError.longMessage ?? createError.message ?? "Couldn't start password reset. Please try again.";
        setGeneralError(msg);
        return;
      }
      const { error } = await si.resetPasswordEmailCode.sendCode();
      if (error) {
        const msg = error.longMessage ?? error.message ?? "Couldn't send a reset code. Please try again.";
        setGeneralError(msg);
        return;
      }
      setStep("reset_verify");
    } catch (err: unknown) {
      const e = err as any;
      const msg =
        e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetVerify = async () => {
    if (!signIn) {
      setGeneralError("Still connecting to authentication service. Please wait a moment and try again.");
      return;
    }
    if (!code.trim()) {
      setGeneralError("Please enter the reset code from your email.");
      return;
    }
    if (newPassword.length < 8) {
      setGeneralError("Your new password must be at least 8 characters.");
      return;
    }
    setGeneralError(null);
    setIsLoading(true);
    try {
      const si = signIn as any;
      // 1) Verify the emailed code (status -> needs_new_password)
      const { error: verifyError } = await si.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) {
        const msg = verifyError.longMessage ?? verifyError.message ?? "That code didn't work. Please try again.";
        setGeneralError(msg);
        return;
      }
      // 2) Submit the new password (status -> complete)
      const { error: submitError } = await si.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (submitError) {
        const msg = submitError.longMessage ?? submitError.message ?? "Couldn't set your new password. Please try again.";
        setGeneralError(msg);
        return;
      }
      if (si.status === "complete") {
        await finalizeAndContinue(si);
        return;
      }

      // Account has 2FA enabled (or device needs trust): Clerk requires a
      // second factor even after a reset. Send the email code and reuse the
      // shared MFA verify step.
      if (si.status === "needs_second_factor" || si.status === "needs_client_trust") {
        const { error: sendError } = await si.mfa.sendEmailCode();
        if (sendError) {
          const msg = sendError.longMessage ?? sendError.message ?? "Couldn't send a verification code. Please try again.";
          setGeneralError(msg);
          return;
        }
        setCode("");
        setStep("verify");
        return;
      }

      setGeneralError(`Reset incomplete (status: ${si.status ?? "unknown"}). Please try again.`);
    } catch (err: unknown) {
      const e = err as any;
      const msg =
        e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Something went wrong. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetResend = async () => {
    if (!signIn) return;
    setGeneralError(null);
    try {
      const si = signIn as any;
      const { error } = await si.resetPasswordEmailCode.sendCode();
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
              <View style={styles.logoCircle}>
                <Feather name="shield" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Verify it's you</Text>
              <Text style={styles.subtitle}>
                For your security, we sent a 6-digit code to{"\n"}
                <Text style={{ color: PRIMARY, fontFamily: "Nunito_600SemiBold" }}>
                  {emailAddress}
                </Text>
              </Text>
            </View>

            <View style={styles.form}>
              {generalError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{generalError}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[styles.input, codeFocused && styles.inputFocused]}
                  value={code}
                  placeholder="000000"
                  placeholderTextColor={MUTED}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  autoFocus
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !code) && styles.buttonDisabled,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
                onPress={handleVerify}
                disabled={isLoading || !code}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify & sign in</Text>
                )}
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

  if (step === "reset_request") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Feather name="lock" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a code to reset your password.
              </Text>
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
                  returnKeyType="send"
                  onSubmitEditing={handleSendReset}
                  autoFocus
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !emailAddress) && styles.buttonDisabled,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
                onPress={handleSendReset}
                disabled={isLoading || !emailAddress}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send reset code</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.textButton}
                onPress={() => {
                  setStep("credentials");
                  setGeneralError(null);
                }}
              >
                <Text style={[styles.textButtonText, { color: MUTED }]}>← Back to sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === "reset_verify") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Feather name="lock" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Create new password</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code we sent to{"\n"}
                <Text style={{ color: PRIMARY, fontFamily: "Nunito_600SemiBold" }}>
                  {emailAddress}
                </Text>
                {"\n"}and choose a new password.
              </Text>
            </View>

            <View style={styles.form}>
              {generalError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{generalError}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>Reset code</Text>
                <TextInput
                  style={[styles.input, codeFocused && styles.inputFocused]}
                  value={code}
                  placeholder="000000"
                  placeholderTextColor={MUTED}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordRef.current?.focus()}
                  autoFocus
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>New password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={newPasswordRef}
                    style={[styles.input, styles.passwordInput, newPasswordFocused && styles.inputFocused]}
                    value={newPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showNewPassword}
                    onChangeText={setNewPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={handleResetVerify}
                    onFocus={() => setNewPasswordFocused(true)}
                    onBlur={() => setNewPasswordFocused(false)}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword((v) => !v)}
                    hitSlop={8}
                  >
                    <Feather name={showNewPassword ? "eye-off" : "eye"} size={20} color={MUTED} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !code || !newPassword) && styles.buttonDisabled,
                  pressed && !isLoading && styles.buttonPressed,
                ]}
                onPress={handleResetVerify}
                disabled={isLoading || !code || !newPassword}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Reset password & sign in</Text>
                )}
              </Pressable>

              <Pressable style={styles.textButton} onPress={handleResetResend}>
                <Text style={styles.textButtonText}>Resend code</Text>
              </Pressable>

              <Pressable
                style={styles.textButton}
                onPress={() => {
                  setStep("credentials");
                  setCode("");
                  setNewPassword("");
                  setGeneralError(null);
                }}
              >
                <Text style={[styles.textButtonText, { color: MUTED }]}>← Back to sign in</Text>
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
          keyboardShouldPersistTaps="always"
        >
          {router.canGoBack() ? (
            <Pressable
              style={styles.dismissButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Feather name="x" size={22} color={MUTED} />
            </Pressable>
          ) : null}

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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.passwordInput, passwordFocused && styles.inputFocused]}
                  value={password}
                  placeholder="Your password"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={MUTED} />
                </Pressable>
              </View>
              <Pressable style={styles.forgotButton} onPress={startReset} hitSlop={8}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
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
  dismissButton: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: -8,
  },
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
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    color: PRIMARY,
    fontFamily: "Nunito_600SemiBold",
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
