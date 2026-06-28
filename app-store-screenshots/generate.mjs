// Captly App Store screenshot generator.
// Renders marketing screenshots at exactly 1284x2778 (iPhone 6.5" slot) via Chromium.
// Run: NODE_PATH=/tmp/pp/node_modules node app-store-screenshots/generate.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";
import { execSync } from "child_process";

const W = 1284, H = 2778;
const OUT = "app-store-screenshots/new";
mkdirSync(OUT, { recursive: true });

// ---- Brand tokens (from constants/colors.ts) ----
const C = {
  text: "#3A3129",
  ink: "#2A231C",
  amber: "#E8B669",
  amberDeep: "#D89B3C",
  amberSoft: "#F6E4C4",
  cream: "#FFFDF9",
  sec: "#F8EFE4",
  muted: "#8C7A6B",
  border: "#F0E3D3",
  card: "#FFFFFF",
  pink: "#E1306C",
  blue: "#0A66C2",
  green: "#2E9E6B",
};

const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;

const baseCSS = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
html,body{width:${W}px;height:${H}px;font-family:'Nunito',sans-serif;color:${C.text};}
.stage{width:${W}px;height:${H}px;position:relative;overflow:hidden;
  background:
    radial-gradient(120% 80% at 50% -8%, #FFFFFF 0%, ${C.cream} 26%, ${C.sec} 55%, #F4E2C6 80%, #F0D2A8 100%),
    linear-gradient(160deg, rgba(243,201,154,0.0) 55%, rgba(240,178,120,0.35) 100%);
  display:flex;flex-direction:column;align-items:center;}
.head{width:1100px;text-align:center;margin-top:118px;}
.head h1{font-size:78px;font-weight:800;line-height:1.1;letter-spacing:-1.5px;color:${C.ink};}
.head p{font-size:35px;font-weight:600;color:${C.muted};margin-top:24px;line-height:1.3;}
/* phone */
.phone{margin-top:72px;width:1012px;height:2120px;background:#0c0c0d;border-radius:108px;
  padding:22px;box-shadow:0 60px 120px -30px rgba(120,80,20,0.35);position:relative;}
.screen{width:100%;height:100%;background:${C.cream};border-radius:88px;overflow:hidden;position:relative;}
.island{position:absolute;top:34px;left:50%;transform:translateX(-50%);width:330px;height:96px;background:#0c0c0d;border-radius:48px;z-index:5;}
.sbar{position:absolute;top:46px;left:0;right:0;display:flex;justify-content:space-between;padding:0 70px;z-index:4;font-weight:800;font-size:34px;color:${C.ink};}
.sbar .r{display:flex;gap:14px;align-items:center;font-size:30px;}
.body{position:absolute;top:150px;left:0;right:0;bottom:0;padding:40px 52px;}
/* shared bits */
.logo{width:74px;height:74px;border-radius:22px;background:${C.amber};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:44px;}
.row{display:flex;align-items:center;}
.chip{padding:14px 26px;border-radius:999px;font-weight:700;font-size:30px;}
.card{background:${C.card};border:2px solid ${C.border};border-radius:34px;padding:38px 40px;box-shadow:0 18px 40px -28px rgba(120,80,20,0.45);}
`;

function layout({ headline, sub, inner, withPhone = true }) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${baseCSS}</style></head>
  <body><div class="stage">
    <div class="head"><h1>${headline}</h1>${sub ? `<p>${sub}</p>` : ""}</div>
    ${withPhone ? `<div class="phone"><div class="screen">
      <div class="island"></div>
      <div class="sbar"><div>9:41</div><div class="r">📶 🔋</div></div>
      <div class="body">${inner}</div>
    </div></div>` : `<div style="width:1100px;margin-top:30px;">${inner}</div>`}
  </div></body></html>`;
}

// ---------- SCREEN 1: HERO (pain -> relief) ----------
const s1 = layout({
  headline: "Never stare at a<br>blank caption again",
  sub: "Type a few words. Get 3 scroll-stopping captions in seconds.",
  inner: `
    <div class="row" style="gap:20px;"><div class="logo">⚡</div><div style="font-size:46px;font-weight:800;color:${C.ink}">Captly</div></div>
    <div style="font-size:40px;font-weight:800;color:${C.ink};margin-top:46px;">What are you posting about?</div>
    <div class="card" style="margin-top:24px;padding:36px;background:${C.sec};border-color:${C.border};">
      <div style="font-size:36px;font-weight:600;color:${C.text};line-height:1.35;">Launching our new maple oat latte this weekend ☕</div>
    </div>
    <div class="row" style="gap:18px;margin-top:34px;flex-wrap:wrap;">
      <div class="chip" style="background:#fff;border:2px solid ${C.amber};color:${C.amberDeep};">☕ Coffee Shop</div>
      <div class="chip" style="background:#fff;border:2px solid ${C.pink};color:${C.pink};">Instagram</div>
      <div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.text};">Playful</div>
    </div>
    <div style="margin-top:40px;background:${C.amber};border-radius:30px;padding:34px;text-align:center;font-size:40px;font-weight:800;color:#fff;box-shadow:0 22px 44px -18px rgba(216,155,60,0.8);">✨ Write my captions</div>
    <div style="margin-top:48px;font-size:30px;font-weight:800;color:${C.muted};letter-spacing:1px;">YOUR CAPTIONS ✦</div>
    <div class="card" style="margin-top:22px;">
      <div class="row" style="justify-content:space-between;"><div class="chip" style="background:${C.amberSoft};color:${C.amberDeep};padding:8px 22px;font-size:26px;">#1</div><div style="font-size:30px;color:${C.muted};letter-spacing:8px;">⟳ ↗ ⧉ ⛉</div></div>
      <div style="font-size:34px;line-height:1.4;margin-top:22px;color:${C.text}">Cold mornings call for warm hands and warmer cups. ☕ Our maple oat latte just dropped — come find your new ritual.</div>
    </div>
    <div class="card" style="margin-top:22px;opacity:0.6;">
      <div class="chip" style="background:${C.amberSoft};color:${C.amberDeep};padding:8px 22px;font-size:26px;">#2</div>
      <div style="font-size:34px;line-height:1.4;margin-top:18px;color:${C.text}">Plot twist: the best part of your Monday is 60 seconds away...</div>
    </div>
  `,
});

// ---------- SCREEN 2: THREE CAPTIONS ----------
function captionCard(n, text, tags, faded = false) {
  return `<div class="card" style="margin-top:26px;${faded ? "opacity:.96;" : ""}">
    <div class="row" style="justify-content:space-between;align-items:center;">
      <div class="chip" style="background:${C.amberSoft};color:${C.amberDeep};padding:10px 24px;font-size:28px;">#${n}</div>
      <div style="font-size:32px;color:${C.muted};letter-spacing:8px;">⟳ ↗ ⧉ ⛉</div>
    </div>
    <div style="font-size:35px;line-height:1.42;margin-top:24px;color:${C.text}">${text}</div>
    <div style="font-size:31px;margin-top:22px;color:${C.amberDeep};font-weight:700;line-height:1.4;">${tags}</div>
  </div>`;
}
const s2 = layout({
  headline: "Three captions.<br>Zero blank pages.",
  sub: "Every one unique — pick a favorite and copy.",
  inner: `
    <div class="row" style="gap:18px;align-items:center;"><div style="font-size:40px;color:${C.muted};">‹</div><div style="font-size:44px;font-weight:800;color:${C.ink}">Your captions</div></div>
    <div class="row" style="gap:16px;margin-top:26px;">
      <div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.amberDeep};font-size:28px;">☕ Coffee Shop</div>
      <div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.pink};font-size:28px;">Instagram</div>
      <div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.text};font-size:28px;">Playful</div>
    </div>
    ${captionCard(1, "Cold mornings call for warm hands and warmer cups. ☕ Our new maple oat latte just dropped — come find your new favorite ritual.", "#coffeeshop #latteart #maplelatte #cozyvibes")}
    ${captionCard(2, "Plot twist: the best part of your Monday is 60 seconds away. Swing by for a fresh pour and a little calm before the rush. 🍂", "#mondaymotivation #specialtycoffee #smallbiz")}
    ${captionCard(3, "We roast it, you toast it. Every cup starts with beans we genuinely obsess over — taste the difference today. ✨", "#freshroast #coffeelovers #localcafe")}
  `,
});

// ---------- SCREEN 3: MADE FOR YOU ----------
function pill(label, active, color) {
  return active
    ? `<div class="chip" style="background:${color || C.amber};color:#fff;font-size:30px;">${label}</div>`
    : `<div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.text};font-size:30px;">${label}</div>`;
}
const s3 = layout({
  headline: "Made for<br>your business",
  sub: "22 industries · 12 tones · every platform — captions that sound like you.",
  inner: `
    <div style="font-size:40px;font-weight:800;color:${C.ink};">Platform</div>
    <div class="row" style="gap:18px;margin-top:24px;flex-wrap:wrap;">
      ${pill("Instagram", true, C.pink)}${pill("TikTok", false)}${pill("Facebook", false)}${pill("LinkedIn", false)}${pill("X", false)}
    </div>
    <div style="font-size:40px;font-weight:800;color:${C.ink};margin-top:58px;">Your industry</div>
    <div class="row" style="gap:18px;margin-top:24px;flex-wrap:wrap;">
      ${pill("☕ Coffee Shop", true)}${pill("Bakery", false)}${pill("Salon", false)}${pill("Fitness", false)}
    </div>
    <div class="row" style="gap:18px;margin-top:18px;flex-wrap:wrap;">
      ${pill("Boutique", false)}${pill("Realtor", false)}${pill("Restaurant", false)}${pill("+ 15 more", false)}
    </div>
    <div style="font-size:40px;font-weight:800;color:${C.ink};margin-top:58px;">Your voice <span style="font-size:30px;font-weight:600;color:${C.muted}">(up to 3)</span></div>
    <div class="row" style="gap:18px;margin-top:24px;flex-wrap:wrap;">
      ${pill("Playful", true)}${pill("Warm", true)}${pill("Bold", false)}${pill("Witty", false)}
    </div>
    <div class="row" style="gap:18px;margin-top:18px;flex-wrap:wrap;">
      ${pill("Professional", false)}${pill("Inspiring", false)}${pill("+ 6 more", false)}
    </div>
    <div style="margin-top:60px;background:${C.amber};border-radius:30px;padding:36px;text-align:center;font-size:42px;font-weight:800;color:#fff;box-shadow:0 22px 44px -18px rgba(216,155,60,0.8);">✨ Write my captions</div>
    <div style="margin-top:60px;display:flex;align-items:center;gap:24px;"><div style="height:2px;background:${C.border};flex:1;"></div><div style="font-size:30px;font-weight:800;color:${C.muted};letter-spacing:1px;white-space:nowrap;">TUNED TO YOUR PICKS</div><div style="height:2px;background:${C.border};flex:1;"></div></div>
    <div class="card" style="margin-top:34px;">
      <div class="row" style="gap:14px;flex-wrap:wrap;margin-bottom:24px;">
        <div class="chip" style="background:#fff;border:2px solid ${C.pink};color:${C.pink};font-size:26px;padding:8px 20px;">Instagram</div>
        <div class="chip" style="background:#fff;border:2px solid ${C.amber};color:${C.amberDeep};font-size:26px;padding:8px 20px;">☕ Coffee Shop</div>
        <div class="chip" style="background:#fff;border:2px solid ${C.border};color:${C.text};font-size:26px;padding:8px 20px;">Playful + Warm</div>
      </div>
      <div style="font-size:35px;line-height:1.42;color:${C.text}">Cold mornings call for warm hands and warmer cups. ☕ Our maple oat latte just dropped — come find your new favorite ritual.</div>
      <div style="font-size:31px;margin-top:20px;color:${C.amberDeep};font-weight:700;">#coffeeshop #latteart #cozyvibes</div>
    </div>
  `,
});

// ---------- SCREEN 4: HASHTAGS ----------
function tag(t, fill) {
  return fill
    ? `<span class="chip" style="background:${fill};color:#fff;font-size:28px;display:inline-block;margin:0 12px 14px 0;">${t}</span>`
    : `<span class="chip" style="background:${C.sec};color:${C.text};font-size:28px;display:inline-block;margin:0 12px 14px 0;">${t}</span>`;
}
function tagCard(badge, badgeColor, desc, tags) {
  return `<div class="card" style="margin-top:26px;">
    <div class="row" style="justify-content:space-between;align-items:center;">
      <div class="chip" style="background:${badgeColor.bg};color:${badgeColor.fg};font-size:28px;">${badge}</div>
      <div style="font-size:28px;color:${C.muted};font-weight:700;">⧉ Copy all</div>
    </div>
    <div style="font-size:28px;color:${C.muted};margin-top:18px;line-height:1.35;">${desc}</div>
    <div style="margin-top:22px;">${tags}</div>
  </div>`;
}
const s4 = layout({
  headline: "Hashtags that<br>get you found",
  sub: "Targeted, popular &amp; reach tags — grouped for you.",
  inner: `
    <div style="font-size:46px;font-weight:800;color:${C.ink}">Hashtags</div>
    <div style="font-size:30px;color:${C.muted};margin-top:12px;">Coffee Shop · Instagram · "Fall menu launch"</div>
    ${tagCard("◎ Targeted", { bg: "#FBEBD6", fg: C.amberDeep }, "Hyper-specific to your niche — reaches the people most likely to buy.",
      tag("#coffeeshop", C.amber) + tag("#specialtycoffee") + tag("#localcafe", C.amber) + tag("#espressobar") + tag("#latteart", C.amber))}
    ${tagCard("↗ Popular", { bg: "#FBEBD6", fg: C.amberDeep }, "High-engagement tags with consistent reach — refreshed for your niche.",
      tag("#coffeelover") + tag("#coffeetime", C.amber) + tag("#butfirstcoffee") + tag("#cafevibes") + tag("#fallmenu", C.amber))}
    ${tagCard("⛯ Reach", { bg: "#DCEFE3", fg: C.green }, "High-volume discovery tags that cast the widest net for impressions.",
      tag("#morning") + tag("#cozy") + tag("#weekendvibes") + tag("#foodie", C.green) + tag("#instagood"))}
  `,
});

// ---------- SCREEN 5: FEATURES (no phone) ----------
function feat(icon, title, desc) {
  return `<div class="card" style="margin-top:30px;display:flex;align-items:center;gap:34px;padding:46px 48px;">
    <div style="width:108px;height:108px;border-radius:28px;background:${C.amber};display:flex;align-items:center;justify-content:center;font-size:54px;flex:0 0 auto;">${icon}</div>
    <div><div style="font-size:46px;font-weight:800;color:${C.ink}">${title}</div>
    <div style="font-size:33px;color:${C.muted};margin-top:10px;line-height:1.3;">${desc}</div></div>
  </div>`;
}
const s5 = layout({
  withPhone: false,
  headline: "",
  sub: "",
  inner: `
    <div style="text-align:center;margin-top:40px;">
      <div class="row" style="justify-content:center;gap:24px;align-items:center;"><div class="logo" style="width:96px;height:96px;border-radius:28px;font-size:56px;">⚡</div><div style="font-size:64px;font-weight:900;color:${C.ink}">Captly</div></div>
      <div style="font-size:74px;font-weight:800;color:${C.ink};margin-top:40px;line-height:1.1;letter-spacing:-1.5px;">Everything you need<br>to post like a pro</div>
    </div>
    <div style="margin-top:30px;">
      ${feat("▦", "Every platform", "Instagram, TikTok, Facebook, LinkedIn &amp; X — each one optimized.")}
      ${feat("◫", "22 industries", "Niche-tuned prompts written for real small businesses.")}
      ${feat("⇅", "12 tones, your way", "Blend up to three for a voice that sounds like you.")}
      ${feat("⟳", "Instant Remix", "Make it shorter, funnier, or more professional in a tap.")}
      ${feat("◷", "Best time to post", "Know exactly when your audience is online.")}
    </div>
    <div style="text-align:center;font-size:34px;font-weight:700;color:${C.muted};margin-top:54px;">Captly — your AI caption studio</div>
  `,
});

const screens = [
  ["1-hero", s1],
  ["2-captions", s2],
  ["3-madeforyou", s3],
  ["4-hashtags", s4],
  ["5-features", s5],
];

const browser = await puppeteer.launch({
  executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (const [name, html] of screens) {
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 9000))]));
  await new Promise(r => setTimeout(r, 500));
  const raw = `${OUT}/_raw-${name}.png`;
  const final = `${OUT}/captly-${name}-1284x2778.png`;
  await page.screenshot({ path: raw });
  execSync(`magick "${raw}" -background white -alpha remove -alpha off -strip "${final}"`);
  execSync(`rm -f "${raw}"`);
  console.log("rendered", final);
}
await browser.close();
console.log("DONE");
