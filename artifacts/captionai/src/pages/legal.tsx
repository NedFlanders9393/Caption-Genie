import React from "react";

const C = {
  bg: "#FFFDF9",
  text: "#3A3129",
  muted: "#8C7A6B",
  amber: "#E8B669",
  border: "#F0E3D3",
  sectionBg: "#FFFFFF",
};

const LAST_UPDATED = "May 1, 2026";
const CONTACT_EMAIL = "nedflanders9393@gmail.com";

function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg }}>
      <header
        style={{
          borderBottom: `1px solid ${C.border}`,
          backgroundColor: C.bg,
          padding: "16px 20px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href={import.meta.env.BASE_URL}
            style={{ color: C.text, textDecoration: "none", fontSize: 14, fontWeight: 600 }}
          >
            ← Captly
          </a>
          <span style={{ color: C.muted }}>/</span>
          <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{title}</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 64px" }}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          Last updated: {LAST_UPDATED}
        </p>
        {children}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginBottom: 24,
        backgroundColor: C.sectionBg,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: 20,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>
        {children}
      </div>
    </section>
  );
}

function Bullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 8px" }}>
      <strong style={{ fontWeight: 600 }}>{label}: </strong>
      {children}
    </p>
  );
}

function ContactEmail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.amber, fontWeight: 600, textDecoration: "none" }}>
      {CONTACT_EMAIL}
    </a>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <Section title="Who We Are">
        Captly ("we," "us," or "our") is an AI-powered social media caption generator for small
        business owners and content creators. This Privacy Policy explains how we collect, use, and
        protect your information when you use our app.
      </Section>

      <Section title="Information We Collect">
        <Bullet label="Account information">
          When you sign up, we collect your name and email address through Clerk, our authentication
          provider.
        </Bullet>
        <Bullet label="Brand Voice profile">
          Information you voluntarily enter about your brand — such as your brand name, personality,
          target audience, and sample captions. This is used solely to personalize your generated
          captions.
        </Bullet>
        <Bullet label="Generated content">
          The captions and hashtags you generate are stored in your account history so you can access
          them later.
        </Bullet>
        <Bullet label="Usage data">
          We track how many captions you generate per month to enforce your plan limits (10/month
          free, 150/month Pro).
        </Bullet>
        <Bullet label="Device information">
          Basic device and platform information (iOS version, app version) included when you submit a
          bug report.
        </Bullet>
      </Section>

      <Section title="How We Use Your Information">
        {"We use your information to:\n\n"}
        {"• Provide and personalize the Captly service\n"}
        {"• Enforce free and Pro plan usage limits\n"}
        {"• Send owner notifications when you submit a bug report\n"}
        {"• Improve our AI prompts and app experience\n"}
        {"• Respond to your support requests"}
      </Section>

      <Section title="Third-Party Services">
        {"We work with trusted third parties to deliver Captly:\n\n"}
        <Bullet label="Clerk">
          Handles account creation, login, and authentication. Privacy policy: clerk.com/privacy.
        </Bullet>
        <Bullet label="RevenueCat">
          Manages your Pro subscription through Apple's In-App Purchase system. RevenueCat does not
          store your payment information. Privacy policy: revenuecat.com/privacy.
        </Bullet>
        <Bullet label="Anthropic (Claude AI)">
          Processes your prompts to generate captions. Your inputs are sent to Anthropic's API and are
          subject to their usage policies: anthropic.com/privacy.
        </Bullet>
        <Bullet label="Resend">
          Used to send email notifications when you submit a bug report. Privacy policy:
          resend.com/privacy.
        </Bullet>
      </Section>

      <Section title="Data Retention">
        Your account data and caption history are retained while your account is active. You can
        delete your account at any time from the Profile screen. Upon deletion, your personal data and
        caption history will be permanently removed within 30 days.
      </Section>

      <Section title="Your Rights">
        {"You have the right to:\n\n"}
        {"• Access the personal data we hold about you\n"}
        {"• Request correction of inaccurate data\n"}
        {"• Request deletion of your account and data\n"}
        {"• Opt out of non-essential communications\n\n"}
        {"To exercise any of these rights, contact us at the address below."}
      </Section>

      <Section title="Children's Privacy">
        Captly is not directed at children under 13. We do not knowingly collect personal information
        from children under 13. If you believe a child has provided us information, please contact us
        and we will delete it promptly.
      </Section>

      <Section title="Security">
        We use industry-standard security measures including encrypted data transmission (HTTPS/TLS),
        secure authentication via Clerk, and limited access to production databases. No method of
        transmission over the internet is 100% secure, but we take reasonable steps to protect your
        information.
      </Section>

      <Section title="Changes to This Policy">
        We may update this Privacy Policy from time to time. We will notify you of significant changes
        through the app. Continued use after changes constitutes acceptance of the updated policy.
      </Section>

      <Section title="Contact Us">
        {"If you have questions about this Privacy Policy or want to exercise your data rights, contact us at:\n\n"}
        <ContactEmail />
      </Section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <Section title="Agreement to Terms">
        By downloading, installing, or using Captly, you agree to be bound by these Terms of Service.
        If you do not agree, please do not use the app.
      </Section>

      <Section title="Description of Service">
        Captly is an AI-powered caption generation tool for social media. We provide free and Pro
        subscription tiers. The free tier includes up to 10 caption generations per month. The Pro
        tier provides up to 150 generations per month and is billed through Apple's In-App Purchase
        system.
      </Section>

      <Section title="Subscriptions & Billing">
        {"• Subscriptions are billed through Apple's App Store and governed by Apple's terms.\n"}
        {"• Your subscription automatically renews unless cancelled at least 24 hours before the end of the current period.\n"}
        {"• You can manage or cancel your subscription at any time in your iPhone Settings → Apple ID → Subscriptions.\n"}
        {"• We do not process payments directly — Apple handles all billing and refunds.\n"}
        {"• Prices are displayed in your local currency at the time of purchase and may vary by region."}
      </Section>

      <Section title="Free Trial">
        If a free trial is offered, it will automatically convert to a paid subscription at the end of
        the trial period unless cancelled beforehand. You will not be charged during the trial period.
      </Section>

      <Section title="Acceptable Use">
        {"You agree not to use Captly to:\n\n"}
        {"• Generate content that is illegal, harmful, threatening, abusive, or harassing\n"}
        {"• Violate any applicable laws or regulations\n"}
        {"• Attempt to reverse engineer, hack, or disrupt the service\n"}
        {"• Resell or redistribute access to Captly without our written permission\n"}
        {"• Use the service to generate spam or misleading content at scale"}
      </Section>

      <Section title="AI-Generated Content">
        {"Captly uses Claude AI (Anthropic) to generate captions. You acknowledge that:\n\n"}
        {"• AI-generated content may occasionally be inaccurate, incomplete, or unsuitable\n"}
        {"• You are responsible for reviewing all generated content before publishing\n"}
        {"• We do not guarantee the originality or uniqueness of generated captions\n"}
        {"• The captions you generate are yours to use — we do not claim ownership"}
      </Section>

      <Section title="Intellectual Property">
        The Captly app, its design, logo, and underlying technology are owned by us and protected by
        intellectual property laws. You are granted a limited, non-exclusive, non-transferable license
        to use the app for personal or business purposes in accordance with these Terms.
      </Section>

      <Section title="Account Termination">
        We reserve the right to suspend or terminate your account if you violate these Terms. You may
        also delete your account at any time from the Profile screen. Upon termination, your data will
        be deleted in accordance with our Privacy Policy.
      </Section>

      <Section title="Disclaimer of Warranties">
        Captly is provided "as is" without warranties of any kind. We do not warrant that the service
        will be uninterrupted, error-free, or that AI-generated content will meet your specific
        requirements.
      </Section>

      <Section title="Limitation of Liability">
        To the fullest extent permitted by law, Captly and its owners shall not be liable for any
        indirect, incidental, special, or consequential damages arising from your use of the app,
        including but not limited to loss of revenue or data.
      </Section>

      <Section title="Changes to Terms">
        We may update these Terms from time to time. We will notify you of material changes through the
        app. Continued use after changes constitutes acceptance of the updated Terms.
      </Section>

      <Section title="Governing Law">
        These Terms are governed by the laws of the United States. Any disputes shall be resolved
        through binding arbitration in accordance with applicable law.
      </Section>

      <Section title="Contact Us">
        {"Questions about these Terms? Reach us at:\n\n"}
        <ContactEmail />
      </Section>
    </LegalLayout>
  );
}
