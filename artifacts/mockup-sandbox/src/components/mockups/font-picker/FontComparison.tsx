const AMBER = "#E8B669";
const BG = "#FFFDF9";
const DARK = "#3A3129";
const MUTED = "#8C7A6B";
const BORDER = "#F0E3D3";
const PILL_BG = "#F5EDE4";

const fonts = [
  { name: "Inter", family: "Inter", label: "Current" },
  { name: "DM Sans", family: "DM Sans", label: "Friendly" },
  { name: "Outfit", family: "Outfit", label: "Modern" },
  { name: "Plus Jakarta\nSans", family: "Plus Jakarta Sans", label: "Premium" },
  { name: "Poppins", family: "Poppins", label: "Rounded" },
  { name: "Space\nGrotesk", family: "Space Grotesk", label: "Editorial" },
];

const labels = [
  { text: "Captura", role: "wordmark" },
  { text: "Caption Generator", role: "title" },
  { text: "History", role: "title" },
  { text: "Hashtag Intelligence", role: "title" },
  { text: "Profile", role: "tab" },
];

export function FontComparison() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 24,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Typography Options
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: 1560,
        }}
      >
        {fonts.map((font) => (
          <div
            key={font.family}
            style={{
              backgroundColor: "#fff",
              border: `1.5px solid ${BORDER}`,
              borderRadius: 20,
              padding: "18px 16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {/* Font name + badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontFamily: `'${font.family}', sans-serif`,
                  fontSize: 12,
                  fontWeight: 700,
                  color: DARK,
                  whiteSpace: "pre-line",
                  lineHeight: 1.3,
                }}
              >
                {font.name}
              </span>
              {font.label === "Current" ? (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    color: AMBER,
                    backgroundColor: "#FDF3E3",
                    borderRadius: 6,
                    padding: "2px 7px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Now
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    color: MUTED,
                    backgroundColor: PILL_BG,
                    borderRadius: 6,
                    padding: "2px 7px",
                    letterSpacing: "0.05em",
                  }}
                >
                  {font.label}
                </span>
              )}
            </div>

            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: BORDER,
                marginBottom: 18,
              }}
            />

            {/* Wordmark */}
            <div style={{ marginBottom: 14 }}>
              <p
                style={{
                  fontSize: 9,
                  fontFamily: "Inter, sans-serif",
                  color: MUTED,
                  marginBottom: 4,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Wordmark
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor: AMBER,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#fff" }}>✦</span>
                </div>
                <span
                  style={{
                    fontFamily: `'${font.family}', sans-serif`,
                    fontSize: 20,
                    fontWeight: 700,
                    color: DARK,
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                  }}
                >
                  Captura
                </span>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: BORDER,
                marginBottom: 14,
              }}
            />

            {/* Screen titles */}
            <div style={{ marginBottom: 6 }}>
              <p
                style={{
                  fontSize: 9,
                  fontFamily: "Inter, sans-serif",
                  color: MUTED,
                  marginBottom: 10,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Screen Titles
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Caption Generator", "History", "Hashtag Intelligence"].map(
                  (title) => (
                    <span
                      key={title}
                      style={{
                        fontFamily: `'${font.family}', sans-serif`,
                        fontSize: 16,
                        fontWeight: 700,
                        color: DARK,
                        lineHeight: 1.2,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {title}
                    </span>
                  )
                )}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: 1,
                backgroundColor: BORDER,
                marginTop: 14,
                marginBottom: 14,
              }}
            />

            {/* Tab labels */}
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontFamily: "Inter, sans-serif",
                  color: MUTED,
                  marginBottom: 10,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Tab Labels
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Home", "Generate", "History", "Hashtags", "Profile"].map(
                  (tab, i) => (
                    <span
                      key={tab}
                      style={{
                        fontFamily: `'${font.family}', sans-serif`,
                        fontSize: 10,
                        fontWeight: i === 0 ? 700 : 500,
                        color: i === 0 ? AMBER : MUTED,
                        lineHeight: 1,
                      }}
                    >
                      {tab}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
