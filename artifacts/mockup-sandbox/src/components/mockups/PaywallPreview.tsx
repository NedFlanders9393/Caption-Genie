export default function PaywallPreview() {
  const PRIMARY = "#E8B669";
  const BG = "#FFFDF9";
  const FOREGROUND = "#3A3129";
  const MUTED = "#8C7A6B";
  const CARD_BG = "#FFFFFF";
  const CARD_BORDER = "#F0E3D3";
  const AMBER_LIGHT = "#F8EFE4";

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ width: 390, background: BG, padding: "56px 24px 40px", fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }}>

        {/* Close button */}
        <div style={{ position: "absolute", top: 20, right: 20, width: 38, height: 38, borderRadius: 20, background: CARD_BG, border: `1px solid ${CARD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>

        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: AMBER_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: FOREGROUND, letterSpacing: -0.5 }}>Get more credits</div>
          <div style={{ fontSize: 15, color: MUTED, textAlign: "center", lineHeight: "22px" }}>Generate captions on demand with a simple credit system</div>
        </div>

        {/* How credits work */}
        <div style={{ background: AMBER_LIGHT, borderRadius: 16, border: `1px solid ${CARD_BORDER}`, padding: 18, display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: FOREGROUND, marginBottom: 4 }}>How credits work</div>
          {[
            ["1 credit", " = 1 caption generation (3 unique captions)"],
            ["Hashtags are always free", " — no credits used"],
            ["Failed generations are refunded", " automatically"],
            ["Top-up credits never expire", " — Pro credits reset monthly"],
          ].map(([bold, rest], i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: PRIMARY, marginTop: 7, flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: FOREGROUND, lineHeight: "20px" }}>
                <span style={{ fontWeight: 700 }}>{bold}</span>{rest}
              </div>
            </div>
          ))}
        </div>

        {/* Subscribe & save label */}
        <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 10 }}>Subscribe & save</div>

        {/* Pro card */}
        <div style={{ background: CARD_BG, borderRadius: 16, border: `2px solid ${PRIMARY}`, padding: 18, display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: FOREGROUND }}>Captly Pro</span>
              <span style={{ background: AMBER_LIGHT, borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700, color: PRIMARY, letterSpacing: 0.5 }}>BEST VALUE</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: PRIMARY }}>$9.99/mo</span>
          </div>
          <div style={{ fontSize: 15, color: FOREGROUND, marginTop: 4 }}>
            <span style={{ fontWeight: 700, color: PRIMARY }}>150 credits</span> every month
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>That's just $0.067 per credit</div>
          <div style={{ background: PRIMARY, borderRadius: 12, padding: "14px 0", textAlign: "center" as const, cursor: "pointer" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>Start Pro — $9.99/month</span>
          </div>
        </div>

        {/* One-time packs label */}
        <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>One-time credit packs</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>No subscription — credits never expire</div>

        {/* Credit packs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            { credits: 50, price: "$4.99", perCredit: "$0.10 / credit", badge: null },
            { credits: 200, price: "$14.99", perCredit: "$0.075 / credit", badge: "POPULAR" },
            { credits: 500, price: "$29.99", perCredit: "$0.06 / credit", badge: "BEST VALUE" },
          ].map((pack) => (
            <div key={pack.credits} style={{ background: CARD_BG, borderRadius: 14, border: `1.5px solid ${CARD_BORDER}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: FOREGROUND }}>{pack.credits} credits</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{pack.perCredit}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {pack.badge && (
                    <span style={{ background: AMBER_LIGHT, borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700, color: PRIMARY, letterSpacing: 0.5 }}>{pack.badge}</span>
                  )}
                  <span style={{ fontSize: 16, fontWeight: 700, color: FOREGROUND }}>{pack.price}</span>
                </div>
              </div>
              <div style={{ borderRadius: 10, border: `1.5px solid ${PRIMARY}`, padding: "10px 0", textAlign: "center" as const, cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: PRIMARY }}>Buy {pack.credits} credits</span>
              </div>
            </div>
          ))}
        </div>

        {/* Restore */}
        <div style={{ textAlign: "center" as const, marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: MUTED, textDecoration: "underline", cursor: "pointer" }}>Restore purchase</span>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center" as const, lineHeight: "16px" }}>
          Captly Pro auto-renews monthly. Cancel anytime in your App Store account settings. Credit packs are one-time purchases.
        </div>
      </div>
    </div>
  );
}
