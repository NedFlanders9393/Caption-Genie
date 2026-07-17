---
name: Captly promo video export clarity
description: Why exported Captly promo videos look blurry and the levers that actually help
---

# Captly promo video blur

The owner periodically reports exported promo videos (video-js scaffold artifacts) look "blurry."

**Root cause hierarchy:**
1. **Export/recording resolution** is the dominant factor and is NOT controllable from app code. The recording pipeline (`src/lib/video/hooks.ts`, `window.startRecording`/`stopRecording` injected by Replit — do NOT modify) captures the preview at the preview pane's pixel size. A modest preview size → low-res capture → upscaling to 1080×1920 for TikTok looks soft. Plus TikTok re-compresses on upload.
2. **Translucent glass cards** (`bg-white/80` + `backdrop-blur-xl`) lower text contrast and soften edges. Making cards fully opaque (`bg-white`) with a defined warm border (`border-[#F0E3D3]`) and dropping `backdrop-blur` visibly sharpens legibility at any resolution. This is the main *code* lever.

**Why:** app code can't raise the capture resolution, so the honest guidance to the owner is: fullscreen/enlarge the preview before exporting, and expect some TikTok recompression. Cosmetic contrast fixes help perception but won't turn a low-res capture into HD.

**How to apply:** for "make the video clearer" requests, do the opaque-card contrast pass AND tell the owner the resolution reality — don't imply code alone will make it HD. Big background blur orbs (`blur-[100px]`) are intentional brand ambiance, not the text-blur culprit — leave them.
