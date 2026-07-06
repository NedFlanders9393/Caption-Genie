---
name: Captly personal mode
description: How "Personal" caption mode differs from Business mode and the rules that keep it from sounding like an ad.
---

# Captly personal mode

Personal mode is for real people WITHOUT a brand. It has its own prompt path
(`buildPersonalCaptionPrompt` + `SYSTEM_PROMPT_PERSONAL`) — never reuse the
business prompt for it.

- **Never brand voice, never niche, never business post-type/CTA.** Business-only
  inputs must be excluded when `isPersonal` (both client `buildParams` and server
  route logic).
- **Occasion presets** are the personal equivalent of business post types
  (`PERSONAL_OCCASION_GUIDE`). Optional; unknown values fall back to baseline
  personal guidance (no crash).
- **Anti-ad guardrails are load-bearing.** The prompt hard-blocks price/discount/
  promo/product/brand/link-in-bio/sales-CTA and reframes anything sellable as the
  person's own life moment. **Why:** owner's explicit worry that personal captions
  might read like advertisements. Verified by a "candles on sale, 20% off, link in
  bio" input returning personal maker's-pride captions with zero ad language.
- **Tension to watch:** the anti-hype/announcement bans conflict with genuine
  personal life news (engagement, pregnancy). There is a deliberate carve-out
  allowing heartfelt personal excitement while still banning corporate hype — keep
  both sides in sync if you touch either the forbidden list or the Big News occasion.

**How to apply:** any change to one layer of an optional caption input (occasion,
keywords, etc.) must be threaded through all of: OpenAPI (both bodies) + codegen,
server destructure + prompt builder call in BOTH generate and regenerate-one,
client `CaptionParams`, and `buildParams` (gated on mode where appropriate).
