// Standalone 9:16 TikTok "Now available on the App Store" launch card.
// Matches the cinematic promo close scene (Scene5): cream bg, dark app icon
// with the real Captly logo, wordmark, tagline, black App Store badge.
// Renders at 1080x1920, flattened sRGB (no alpha) — ready to post to TikTok.
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const C = {
  ink: "#2A231C",
  text: "#3A3129",
  amber: "#E8B669",
  amberDeep: "#D89B3C",
  cream: "#FFFDF9",
  sec: "#F8EFE4",
  muted: "#8C7A6B",
};

const logoPath = "artifacts/captly-promo-cinematic/public/images/captly-logo.png";
const logoB64 = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;

const appleSvg = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:64px;height:64px;"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.67 2.14-3.13 1.53-2.7 5.98.58 7.15-.59 1.49-1.53 3.01-2.9 4.38V20.28zM12.03 7.25C11.97 3.96 15.65 1.56 18.2 1c.34 3.61-3.6 6.36-6.17 6.25z"/></svg>`;

const star = (top, left, size, op) => `<div style="position:absolute;top:${top};left:${left};width:${size}px;height:${size}px;opacity:${op};background:radial-gradient(circle,${C.amber} 0%,transparent 70%);border-radius:50%;"></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">${FONT}
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
html,body{width:1080px;height:1920px;font-family:'Nunito',sans-serif;}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden;
  background:
    radial-gradient(60% 34% at 50% 40%, rgba(232,182,105,0.28) 0%, rgba(232,182,105,0) 60%),
    radial-gradient(130% 90% at 50% -6%, #FFFFFF 0%, ${C.cream} 24%, ${C.sec} 52%, #F4E2C6 78%, #F0D2A8 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;}
.glow{position:absolute;top:32%;left:50%;transform:translate(-50%,-50%);width:620px;height:620px;background:rgba(232,182,105,0.38);border-radius:50%;filter:blur(90px);}
.icon{position:relative;z-index:2;width:360px;height:360px;border-radius:96px;background:${C.text};
  box-shadow:0 60px 120px -40px rgba(120,80,20,0.65), inset 0 0 0 2px rgba(255,255,255,0.14);
  overflow:hidden;display:flex;align-items:center;justify-content:center;}
.icon img{width:100%;height:100%;object-fit:cover;}
.brand{z-index:2;margin-top:64px;font-size:168px;font-weight:900;letter-spacing:-4px;color:${C.ink};line-height:1;}
.tag{z-index:2;margin-top:26px;font-size:52px;font-weight:600;color:${C.muted};text-align:center;line-height:1.28;}
.badge{z-index:2;margin-top:76px;display:flex;align-items:center;gap:26px;background:#000;color:#fff;
  border-radius:34px;padding:30px 52px;box-shadow:0 34px 70px -26px rgba(0,0,0,0.55);}
.badge .txt{display:flex;flex-direction:column;align-items:flex-start;line-height:1;}
.badge .small{font-size:30px;color:#d8d8d8;margin-bottom:8px;font-weight:500;}
.badge .big{font-size:56px;font-weight:700;letter-spacing:-0.5px;}
.avail{z-index:2;position:absolute;bottom:150px;left:0;right:0;text-align:center;
  font-size:44px;font-weight:900;letter-spacing:10px;text-transform:uppercase;color:${C.amberDeep};}
.avail::before,.avail::after{content:"";display:inline-block;width:70px;height:5px;border-radius:3px;background:${C.amber};vertical-align:middle;margin:0 30px;}
</style></head>
<body>
<div class="stage">
  ${star("18%","20%",120,0.5)}${star("24%","78%",90,0.4)}${star("70%","14%",110,0.4)}${star("64%","82%",80,0.35)}${star("80%","50%",70,0.3)}
  <div class="glow"></div>
  <div class="icon"><img src="${logoB64}" alt="Captly"></div>
  <div class="brand">Captly</div>
  <div class="tag">Captions that convert.<br>In seconds.</div>
  <div class="badge">${appleSvg}<div class="txt"><span class="small">Download on the</span><span class="big">App Store</span></div></div>
  <div class="avail">Now Available</div>
</div>
</body></html>`;

const outDir = "app-store-screenshots/tiktok";
fs.mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, "_launch.html");
fs.writeFileSync(htmlPath, html);

const browser = await puppeteer.launch({
  executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });
await page.goto("file://" + path.resolve(htmlPath), { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 600));
const out = path.join(outDir, "captly-tiktok-launch-1080x1920.png");
await page.screenshot({ path: out });
await browser.close();
console.log("rendered", out);
