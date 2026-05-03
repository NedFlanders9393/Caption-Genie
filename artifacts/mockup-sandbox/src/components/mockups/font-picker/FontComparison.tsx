const AMBER = "#E8B669";
const BG = "#FFFDF9";
const DARK = "#3A3129";
const MUTED = "#8C7A6B";
const BORDER = "#F0E3D3";
const PILL_BG = "#F5EDE4";

const fonts = [
  { name: "Nunito", family: "Nunito", tag: "Warm & Round", tagColor: "#6B9E78" },
  { name: "Raleway", family: "Raleway", tag: "Elegant", tagColor: "#8B7BB5" },
  { name: "Josefin Sans", family: "Josefin Sans", tag: "Geometric", tagColor: "#5B8AAD" },
  { name: "Montserrat", family: "Montserrat", tag: "Classic", tagColor: "#B57B6E" },
  { name: "Geist", family: "Geist", tag: "Modern", tagColor: "#5A7A6E" },
  { name: "IBM Plex Sans", family: "IBM Plex Sans", tag: "Humanist", tagColor: "#8A7B5A" },
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
        padding: "32px 20px",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 24,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Typography — Stands Out a Little
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: 1580,
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
            }}
          >
            {/* Font name + personality tag */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: `'${font.family}', sans-serif`,
                  fontSize: 13,
                  fontWeight: 700,
                  color: DARK,
                  lineHeight: 1.3,
                }}
              >
                {font.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  color: font.tagColor,
                  backgroundColor: `${font.tagColor}18`,
                  borderRadius: 6,
                  padding: "2px 7px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  marginLeft: 6,
                }}
              >
                {font.tag}
              </span>
            </div>

            <div style={{ width: "100%", height: 1, backgroundColor: BORDER, marginBottom: 16 }} />

            {/* Wordmark */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 9, fontFamily: "Inter, sans-serif", color: MUTED, marginBottom: 8, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Wordmark
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: AMBER,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 2px 6px ${AMBER}55`,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#fff", lineHeight: 1 }}>✦</span>
                </div>
                <span
                  style={{
                    fontFamily: `'${font.family}', sans-serif`,
                    fontSize: 21,
                    fontWeight: 700,
                    color: DARK,
                    letterSpacing: "-0.4px",
                    lineHeight: 1,
                  }}
                >
                  Captura
                </span>
              </div>
            </div>

            <div style={{ width: "100%", height: 1, backgroundColor: BORDER, marginBottom: 16 }} />

            {/* Screen titles */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 9, fontFamily: "Inter, sans-serif", color: MUTED, marginBottom: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Screen Titles
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {["Caption Generator", "History", "Hashtag Intelligence"].map((title) => (
                  <span
                    key={title}
                    style={{
                      fontFamily: `'${font.family}', sans-serif`,
                      fontSize: 15,
                      fontWeight: 700,
                      color: DARK,
                      lineHeight: 1.2,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", height: 1, backgroundColor: BORDER, marginBottom: 16 }} />

            {/* Tab labels */}
            <div>
              <p style={{ fontSize: 9, fontFamily: "Inter, sans-serif", color: MUTED, marginBottom: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Tab Labels
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {["Home", "Generate", "History", "Hashtags", "Profile"].map((tab, i) => (
                  <span
                    key={tab}
                    style={{
                      fontFamily: `'${font.family}', sans-serif`,
                      fontSize: 10,
                      fontWeight: i === 0 ? 700 : 500,
                      color: i === 0 ? AMBER : MUTED,
                    }}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <p
        style={{
          marginTop: 20,
          fontSize: 10,
          fontFamily: "Inter, sans-serif",
          color: MUTED,
          letterSpacing: "0.03em",
        }}
      >
        All six have visible personality without being loud — pick the one that feels like Captura.
      </p>
    </div>
  );
}
