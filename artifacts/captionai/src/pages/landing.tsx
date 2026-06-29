import { Link } from "wouter";
import {
  Apple,
  Sparkles,
  Hash,
  Clock,
  Wand2,
  Layers,
  History,
  Check,
  Zap,
  ArrowRight,
} from "lucide-react";

const APP_STORE_URL = "https://apps.apple.com/app/id6766227449";
const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

function AppStoreButton({
  size = "lg",
  className = "",
}: {
  size?: "lg" | "md";
  className?: string;
}) {
  const pad = size === "lg" ? "px-6 py-3.5" : "px-5 py-3";
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-3 rounded-2xl bg-[#231d17] ${pad} text-white shadow-lg shadow-[#3a3129]/20 transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <Apple className="h-7 w-7" strokeWidth={1.5} />
      <span className="flex flex-col leading-none text-left">
        <span className="text-[11px] font-medium opacity-80">
          Download on the
        </span>
        <span className="text-lg font-extrabold tracking-tight">
          App Store
        </span>
      </span>
    </a>
  );
}

function Phone({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.2rem] border-[6px] border-[#231d17] bg-[#231d17] shadow-2xl shadow-[#3a3129]/30 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="rounded-[1.7rem] block w-full"
        loading="lazy"
      />
    </div>
  );
}

const FEATURES = [
  {
    icon: Sparkles,
    title: "3 captions, instantly",
    body: "Describe your post in a few words and get three distinct, scroll-stopping captions in seconds.",
  },
  {
    icon: Layers,
    title: "Tuned to your business",
    body: "22 industries, 21 post types, and 12 tones — captions written for your niche and your voice.",
  },
  {
    icon: Hash,
    title: "Hashtags that work",
    body: "Get 30 grouped hashtags — niche, trending, and broad — ready to copy with one tap.",
  },
  {
    icon: Clock,
    title: "Best time to post",
    body: "Platform-aware timing so your captions go out when your audience is actually scrolling.",
  },
  {
    icon: Wand2,
    title: "One-tap remix",
    body: "Make any caption shorter, funnier, or more professional with eight instant remix directions.",
  },
  {
    icon: History,
    title: "Everything saved",
    body: "Your captions are kept in History so you can reuse your best lines whenever you need them.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Describe your post",
    body: "A photo of today's special? A new arrival? Just type a few words.",
  },
  {
    n: "2",
    title: "Pick your vibe",
    body: "Choose your platform, industry, and tone — Captly handles the rest.",
  },
  {
    n: "3",
    title: "Post & grow",
    body: "Copy your favorite caption and hashtags, and you're ready to publish.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#FFFDF9] text-[#3A3129]"
      style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#F0E3D3] bg-[#FFFDF9]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8B669] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Captly</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#8C7A6B] md:flex">
            <a href="#features" className="hover:text-[#3A3129]">
              Features
            </a>
            <a href="#how" className="hover:text-[#3A3129]">
              How it works
            </a>
            <a href="#pricing" className="hover:text-[#3A3129]">
              Pricing
            </a>
          </nav>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#231d17] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Get the app
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 0%, #F8EFE4 0%, rgba(248,239,228,0) 60%), radial-gradient(50% 40% at 0% 30%, #FBEED6 0%, rgba(251,238,214,0) 55%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0E3D3] bg-white px-4 py-1.5 text-sm font-bold text-[#B07D2E] shadow-sm">
              <Zap className="h-4 w-4 fill-[#E8B669] text-[#E8B669]" />
              Now on the App Store
            </div>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Captions that{" "}
              <span className="text-[#D99B4A]">stop the scroll.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6F6052]">
              Captly turns a few words into three ready-to-post captions —
              written for your business, your platform, and your voice. Plus
              hashtags, timing, and remixes in one tap.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <AppStoreButton />
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E8B669] bg-white px-6 py-3.5 font-bold text-[#B07D2E] transition-colors hover:bg-[#FBF4EA]"
              >
                Try it free in your browser
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#A2917F]">
              Free to start · No credit card · Built for small businesses
            </p>
          </div>

          <div className="relative flex justify-center">
            <Phone
              src={asset("shots/hero.png")}
              alt="Captly app generating captions"
              className="w-[230px] rotate-[-4deg] md:w-[270px]"
            />
            <Phone
              src={asset("shots/captions.png")}
              alt="Generated captions in Captly"
              className="absolute -bottom-6 left-1/2 hidden w-[210px] translate-x-2 rotate-[6deg] sm:block md:w-[240px]"
            />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[#F0E3D3] bg-[#FBF6EE]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-center text-sm font-bold text-[#8C7A6B]">
          <span>Instagram</span>
          <span className="text-[#E8B669]">•</span>
          <span>TikTok</span>
          <span className="text-[#E8B669]">•</span>
          <span>Facebook</span>
          <span className="text-[#E8B669]">•</span>
          <span>LinkedIn</span>
          <span className="text-[#E8B669]">•</span>
          <span>Twitter / X</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Everything you need to post like a pro
          </h2>
          <p className="mt-4 text-lg text-[#6F6052]">
            Captly does the writing, the hashtags, and the timing — so you can
            get back to running your business.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-[#F0E3D3] bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8EFE4] text-[#D99B4A]">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-extrabold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-[#6F6052]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="bg-[#FBF6EE] py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
          <div className="order-2 flex justify-center md:order-1">
            <Phone
              src={asset("shots/madeforyou.png")}
              alt="Captly tuned to your picks"
              className="w-[260px] md:w-[300px]"
            />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Written for your niche — not generic fluff
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#6F6052]">
              A bakery doesn't sound like a law firm. Captly tunes every caption
              to your industry, post type, and tone, so it sounds like you wrote
              it on your best day.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "22 industries with audience-specific writing",
                "12 tones — pick up to 3 to blend your voice",
                "Platform-aware formatting for each network",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#E8B669] text-white">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="font-semibold text-[#3A3129]">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Three taps to a better post
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8B669] text-2xl font-extrabold text-white shadow-md shadow-[#E8B669]/30">
                {s.n}
              </div>
              <h3 className="mt-5 text-xl font-extrabold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-[#6F6052]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#FBF6EE] py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Simple pricing
            </h2>
            <p className="mt-4 text-lg text-[#6F6052]">
              Start free. Upgrade when you're ready to post more.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-[#F0E3D3] bg-white p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#8C7A6B]">Free</h3>
              <p className="mt-3 text-4xl font-extrabold">
                $0
                <span className="text-base font-bold text-[#A2917F]">
                  {" "}
                  /month
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-[#3A3129]">
                {[
                  "10 caption generations a month",
                  "All industries & tones",
                  "Hashtags & remix included",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 font-semibold">
                    <Check
                      className="h-5 w-5 flex-none text-[#E8B669]"
                      strokeWidth={3}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl border-2 border-[#E8B669] bg-white p-8 shadow-lg shadow-[#E8B669]/10">
              <span className="absolute -top-3 right-6 rounded-full bg-[#E8B669] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                Most popular
              </span>
              <h3 className="text-lg font-extrabold text-[#D99B4A]">Pro</h3>
              <p className="mt-3 text-4xl font-extrabold">
                $9.99
                <span className="text-base font-bold text-[#A2917F]">
                  {" "}
                  /month
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-[#3A3129]">
                {[
                  "150 caption generations a month",
                  "Best time to post insights",
                  "Higher hashtag & remix limits",
                  "Priority caption generation",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 font-semibold">
                    <Check
                      className="h-5 w-5 flex-none text-[#E8B669]"
                      strokeWidth={3}
                    />
                    {t}
                  </li>
                ))}
              </ul>
              <AppStoreButton size="md" className="mt-7 w-full justify-center" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-20">
        <div
          className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-xl"
          style={{
            background: "linear-gradient(135deg, #E8B669 0%, #D99B4A 100%)",
          }}
        >
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            Your next great caption is one tap away
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-semibold text-white/90">
            Join the small businesses using Captly to post more, stress less,
            and grow their audience.
          </p>
          <div className="mt-9 flex justify-center">
            <AppStoreButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F0E3D3] bg-[#FFFDF9]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8B669] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-extrabold">Captly</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-[#8C7A6B]">
            <Link href="/support" className="hover:text-[#3A3129]">
              Support
            </Link>
            <Link href="/privacy-policy" className="hover:text-[#3A3129]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#3A3129]">
              Terms
            </Link>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#3A3129]"
            >
              App Store
            </a>
          </nav>
          <p className="text-sm font-semibold text-[#A2917F]">
            © 2026 Captly
          </p>
        </div>
      </footer>
    </div>
  );
}
