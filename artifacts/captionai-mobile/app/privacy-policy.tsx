import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const C = {
  bg: "#FFFDF9",
  text: "#3A3129",
  muted: "#8C7A6B",
  amber: "#E8B669",
  border: "#F0E3D3",
  sectionBg: "#FFFFFF",
};

const LAST_UPDATED = "May 1, 2026";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Who We Are">
          Captura ("we," "us," or "our") is an AI-powered social media caption generator for small business owners and content creators. This Privacy Policy explains how we collect, use, and protect your information when you use our app.
        </Section>

        <Section title="Information We Collect">
          <BulletItem label="Account information">
            When you sign up, we collect your name and email address through Clerk, our authentication provider.
          </BulletItem>
          <BulletItem label="Brand Voice profile">
            Information you voluntarily enter about your brand — such as your brand name, personality, target audience, and sample captions. This is used solely to personalize your generated captions.
          </BulletItem>
          <BulletItem label="Generated content">
            The captions and hashtags you generate are stored in your account history so you can access them later.
          </BulletItem>
          <BulletItem label="Usage data">
            We track how many captions you generate per month to enforce your plan limits (10/month free, 500/month Pro).
          </BulletItem>
          <BulletItem label="Device information">
            Basic device and platform information (iOS version, app version) included when you submit a bug report.
          </BulletItem>
        </Section>

        <Section title="How We Use Your Information">
          We use your information to:
          {"\n\n"}• Provide and personalize the Captura service{"\n"}
          • Enforce free and Pro plan usage limits{"\n"}
          • Send owner notifications when you submit a bug report{"\n"}
          • Improve our AI prompts and app experience{"\n"}
          • Respond to your support requests
        </Section>

        <Section title="Third-Party Services">
          We work with trusted third parties to deliver Captura:
          {"\n\n"}
          <BulletItem label="Clerk">Handles account creation, login, and authentication. Privacy policy: clerk.com/privacy.</BulletItem>
          <BulletItem label="RevenueCat">Manages your Pro subscription through Apple's In-App Purchase system. RevenueCat does not store your payment information. Privacy policy: revenuecat.com/privacy.</BulletItem>
          <BulletItem label="Anthropic (Claude AI)">Processes your prompts to generate captions. Your inputs are sent to Anthropic's API and are subject to their usage policies: anthropic.com/privacy.</BulletItem>
          <BulletItem label="Resend">Used to send email notifications when you submit a bug report. Privacy policy: resend.com/privacy.</BulletItem>
        </Section>

        <Section title="Data Retention">
          Your account data and caption history are retained while your account is active. You can delete your account at any time from the Profile screen. Upon deletion, your personal data and caption history will be permanently removed within 30 days.
        </Section>

        <Section title="Your Rights">
          You have the right to:{"\n\n"}
          • Access the personal data we hold about you{"\n"}
          • Request correction of inaccurate data{"\n"}
          • Request deletion of your account and data{"\n"}
          • Opt out of non-essential communications{"\n\n"}
          To exercise any of these rights, contact us at the address below.
        </Section>

        <Section title="Children's Privacy">
          Captura is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, please contact us and we will delete it promptly.
        </Section>

        <Section title="Security">
          We use industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure authentication via Clerk, and limited access to production databases. No method of transmission over the internet is 100% secure, but we take reasonable steps to protect your information.
        </Section>

        <Section title="Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="Contact Us">
          If you have questions about this Privacy Policy or want to exercise your data rights, contact us at:{"\n\n"}
          <Text style={styles.contactEmail}>nedflanders9393@gmail.com</Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

function BulletItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Text style={styles.sectionBody}>
      <Text style={styles.bulletLabel}>{label}: </Text>
      {children}
      {"\n"}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 34,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  updated: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
    backgroundColor: C.sectionBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
  },
  bulletLabel: {
    fontWeight: "600",
    color: C.text,
  },
  contactEmail: {
    color: C.amber,
    fontWeight: "600",
  },
});
