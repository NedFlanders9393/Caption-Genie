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

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="Agreement to Terms">
          By downloading, installing, or using Inkwell, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.
        </Section>

        <Section title="Description of Service">
          Inkwell is an AI-powered caption generation tool for social media. We provide free and Pro subscription tiers. The free tier includes up to 10 caption generations per month. The Pro tier provides up to 500 generations per month and is billed through Apple's In-App Purchase system.
        </Section>

        <Section title="Subscriptions & Billing">
          {"• Subscriptions are billed through Apple's App Store and governed by Apple's terms.\n"}
          {"• Your subscription automatically renews unless cancelled at least 24 hours before the end of the current period.\n"}
          {"• You can manage or cancel your subscription at any time in your iPhone Settings → Apple ID → Subscriptions.\n"}
          {"• We do not process payments directly — Apple handles all billing and refunds.\n"}
          {"• Prices are displayed in your local currency at the time of purchase and may vary by region."}
        </Section>

        <Section title="Free Trial">
          If a free trial is offered, it will automatically convert to a paid subscription at the end of the trial period unless cancelled beforehand. You will not be charged during the trial period.
        </Section>

        <Section title="Acceptable Use">
          You agree not to use Inkwell to:{"\n\n"}
          {"• Generate content that is illegal, harmful, threatening, abusive, or harassing\n"}
          {"• Violate any applicable laws or regulations\n"}
          {"• Attempt to reverse engineer, hack, or disrupt the service\n"}
          {"• Resell or redistribute access to Inkwell without our written permission\n"}
          {"• Use the service to generate spam or misleading content at scale"}
        </Section>

        <Section title="AI-Generated Content">
          Inkwell uses Claude AI (Anthropic) to generate captions. You acknowledge that:{"\n\n"}
          {"• AI-generated content may occasionally be inaccurate, incomplete, or unsuitable\n"}
          {"• You are responsible for reviewing all generated content before publishing\n"}
          {"• We do not guarantee the originality or uniqueness of generated captions\n"}
          {"• The captions you generate are yours to use — we do not claim ownership"}
        </Section>

        <Section title="Intellectual Property">
          The Inkwell app, its design, logo, and underlying technology are owned by us and protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the app for personal or business purposes in accordance with these Terms.
        </Section>

        <Section title="Account Termination">
          We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time from the Profile screen. Upon termination, your data will be deleted in accordance with our Privacy Policy.
        </Section>

        <Section title="Disclaimer of Warranties">
          Inkwell is provided "as is" without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or that AI-generated content will meet your specific requirements.
        </Section>

        <Section title="Limitation of Liability">
          To the fullest extent permitted by law, Inkwell and its owners shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including but not limited to loss of revenue or data.
        </Section>

        <Section title="Changes to Terms">
          We may update these Terms from time to time. We will notify you of material changes through the app. Continued use after changes constitutes acceptance of the updated Terms.
        </Section>

        <Section title="Governing Law">
          These Terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with applicable law.
        </Section>

        <Section title="Contact Us">
          Questions about these Terms? Reach us at:{"\n\n"}
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
  contactEmail: {
    color: C.amber,
    fontWeight: "600",
  },
});
