import React, { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch as UISwitch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Loader2, Copy, Check, Sparkles, Crown, AlertCircle,
  Globe, Share2, Briefcase, Music, Twitter,
  Heart, RefreshCw, Share, Clock, Hash, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PrivacyPolicyPage, TermsPage, SupportPage } from "@/pages/legal";
import LandingPage from "@/pages/landing";

const queryClient = new QueryClient();

// Web users have no login, so they act as guests. The API identifies guests by
// a stable X-Device-Id header (matching the mobile app). Without it, AI routes
// return 401. We persist one id per browser in localStorage.
function getDeviceId(): string {
  const KEY = "captly_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
    ...extra,
  };
}

// Constants
const PLATFORMS = [
  { name: "Instagram", icon: Globe },
  { name: "Facebook", icon: Share2 },
  { name: "LinkedIn", icon: Briefcase },
  { name: "TikTok", icon: Music },
  { name: "Twitter/X", icon: Twitter },
];

const NICHES = [
  "Real Estate",
  "Fitness Coach",
  "Restaurant",
  "Boutique/Shop",
  "General Business",
  "Beauty/Salon",
  "Photography",
  "Coaching/Consulting",
  "Healthcare/Wellness",
  "E-commerce",
  "Event Planning",
  "Pet Care",
  "Education/Tutoring",
  "Home Services",
  "Law Firm",
  "Coffee Shop",
  "Yoga Studio",
  "Automotive",
  "Marketing Agency",
  "Non-Profit",
  "Travel/Tourism",
  "Dental/Medical",
];

const POST_TYPES = [
  "Product Showcase",
  "New Arrival",
  "Sale/Promo",
  "Flash Sale",
  "Limited Time Offer",
  "Giveaway/Contest",
  "Behind the Scenes",
  "Day in the Life",
  "Team Spotlight",
  "Tips & Education",
  "How-To/Tutorial",
  "Q&A",
  "Announcement",
  "Milestone/Celebration",
  "Seasonal/Holiday",
  "Customer Story",
  "Testimonial/Review",
  "Before & After",
  "Motivational Quote",
  "Community Post",
  "User-Generated Content",
];

const TONES = [
  "Professional",
  "Casual",
  "Funny",
  "Inspirational",
  "Storytelling",
  "Bold",
  "Empowering",
  "Heartfelt",
  "Witty",
  "Luxurious",
  "Playful",
  "Authentic",
];
const LENGTHS = ["Short", "Medium", "Long"];
const CTAS = [
  "None",
  "Shop Now",
  "Link in Bio",
  "DM Us",
  "Comment Below",
  "Tag a Friend",
  "Save This Post",
];

const MAX_FREE_GENERATIONS = 10;

// Types
interface Caption {
  caption: string;
  hashtags: string;
}

interface UsageData {
  count: number;
  month: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  niche: string;
  platform: string;
  tone: string;
  postDescription: string;
  captions: Caption[];
}

interface FavoriteItem {
  id: string;
  caption: string;
  hashtags: string;
  niche: string;
  platform: string;
  savedAt: string;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function CaptionAIApp() {
  const { toast } = useToast();
  
  // App State
  const [activeTab, setActiveTab] = useState<"generator" | "history" | "hashtags">("generator");
  const [usage, setUsage] = useState<UsageData>({ count: 0, month: "" });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Generator State
  const [platform, setPlatform] = useState<string>("Instagram");
  const [niche, setNiche] = useState<string>("General Business");
  const [postType, setPostType] = useState<string>("");
  const [postDescription, setPostDescription] = useState("");
  const [tones, setTones] = useState<string[]>(["Professional"]);
  const [captionLength, setCaptionLength] = useState<string>("Medium");
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [ctaType, setCtaType] = useState<string>("None");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  
  // Hashtag Tool State
  const [hashtagNiche, setHashtagNiche] = useState<string>("General Business");
  const [hashtagPlatform, setHashtagPlatform] = useState<string>("Instagram");
  const [hashtagTopic, setHashtagTopic] = useState("");
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [hashtagResults, setHashtagResults] = useState<{
    grouped: { niche: string[]; popular: string[]; broad: string[] }
  } | null>(null);

  // History & Favorites State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // UI State
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Initialize usage counter and storage
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const storedUsage = localStorage.getItem("captionai_usage");
    
    if (storedUsage) {
      try {
        const parsed = JSON.parse(storedUsage) as UsageData;
        if (parsed.month !== currentMonth) {
          const newUsage = { count: 0, month: currentMonth };
          setUsage(newUsage);
          localStorage.setItem("captionai_usage", JSON.stringify(newUsage));
        } else {
          setUsage(parsed);
        }
      } catch (e) {
        const newUsage = { count: 0, month: currentMonth };
        setUsage(newUsage);
        localStorage.setItem("captionai_usage", JSON.stringify(newUsage));
      }
    } else {
      const newUsage = { count: 0, month: currentMonth };
      setUsage(newUsage);
      localStorage.setItem("captionai_usage", JSON.stringify(newUsage));
    }

    const storedHistory = localStorage.getItem("captionai_history");
    if (storedHistory) {
      try { setHistory(JSON.parse(storedHistory)); } catch (e) {}
    }

    const storedFavorites = localStorage.getItem("captionai_favorites");
    if (storedFavorites) {
      try { setFavorites(JSON.parse(storedFavorites)); } catch (e) {}
    }

    // Restore Pro status
    const storedPro = localStorage.getItem("captionai_pro");
    if (storedPro) {
      try {
        const proData = JSON.parse(storedPro) as { isPro: boolean; customerId?: string };
        if (proData.isPro) {
          setIsPro(true);
          // Silently re-verify in background
          if (proData.customerId) {
            fetch("/api/stripe/check-status", {
              method: "POST",
              headers: apiHeaders(),
              body: JSON.stringify({ customerId: proData.customerId }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (!data.isPro) {
                  setIsPro(false);
                  localStorage.removeItem("captionai_pro");
                }
              })
              .catch(() => {});
          }
        }
      } catch (e) {}
    }

    // Handle Stripe checkout redirect
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkoutStatus === "success" && sessionId) {
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch(`/api/stripe/verify-session?session_id=${sessionId}`, {
        headers: apiHeaders(),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.isPro) {
            setIsPro(true);
            localStorage.setItem("captionai_pro", JSON.stringify({ isPro: true, email: data.email, customerId: data.customerId }));
            toast({ title: "Welcome to Pro!", description: "You now have unlimited caption generations." });
          }
        })
        .catch(() => {});
    } else if (checkoutStatus === "cancel") {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast({ title: "Checkout cancelled", description: "You can upgrade anytime.", variant: "destructive" });
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("captionai_history", JSON.stringify(newHistory));
  };

  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    localStorage.setItem("captionai_favorites", JSON.stringify(newFavorites));
  };

  const incrementUsage = () => {
    const newUsage = { ...usage, count: usage.count + 1 };
    setUsage(newUsage);
    localStorage.setItem("captionai_usage", JSON.stringify(newUsage));
  };

  const toggleTone = (t: string) => {
    setTones((prev) => {
      if (prev.includes(t)) {
        return prev.length > 1 ? prev.filter((x) => x !== t) : prev;
      }
      if (prev.length >= 3) return prev;
      return [...prev, t];
    });
  };

  const handleCheckout = async () => {
    if (!checkoutEmail || !checkoutEmail.includes("@")) {
      toast({ title: "Valid email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ email: checkoutEmail }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to create checkout session");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Checkout error", description: err.message ?? "Something went wrong. Please try again.", variant: "destructive" });
      setCheckoutLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
      toast({
        title: "Copied!",
        description: "Copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: text,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      handleCopy(text, "share");
    }
  };

  const toggleFavorite = (captionObj: Caption, platformStr: string, nicheStr: string) => {
    const exists = favorites.find(f => f.caption === captionObj.caption);
    if (exists) {
      saveFavorites(favorites.filter(f => f.id !== exists.id));
      toast({ title: "Removed from favorites" });
    } else {
      saveFavorites([{
        id: generateId(),
        caption: captionObj.caption,
        hashtags: captionObj.hashtags,
        niche: nicheStr,
        platform: platformStr,
        savedAt: new Date().toISOString()
      }, ...favorites]);
      toast({ title: "Saved to favorites!" });
    }
  };

  const isFavorited = (caption: string) => {
    return favorites.some(f => f.caption === caption);
  };

  // Generator Actions
  const handleGenerate = async () => {
    if (!postDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your post first.",
        variant: "destructive",
      });
      return;
    }

    if (!isPro && usage.count >= MAX_FREE_GENERATIONS) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setCaptions([]);

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          niche,
          postDescription,
          tone: tones.join(", "),
          platform,
          postType: postType || undefined,
          captionLength,
          includeEmojis,
          ctaType,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate captions");
      const data = await res.json();
      
      if (data.captions && Array.isArray(data.captions)) {
        setCaptions(data.captions);
        incrementUsage();
        
        // Save to history
        const newHistoryItem: HistoryItem = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          niche,
          platform,
          tone: tones.join(", "),
          postDescription,
          captions: data.captions
        };
        saveHistory([newHistoryItem, ...history].slice(0, 20));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      toast({
        title: "Error generating captions",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateOne = async (index: number) => {
    if (!isPro && usage.count >= MAX_FREE_GENERATIONS) {
      setShowUpgradeModal(true);
      return;
    }

    setRegeneratingIndex(index);

    try {
      const res = await fetch("/api/captions/regenerate-one", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          niche,
          postDescription,
          tone: tones.join(", "),
          platform,
          postType: postType || undefined,
          captionLength,
          includeEmojis,
          ctaType,
          existingCaptions: captions.map(c => c.caption),
        }),
      });

      if (!res.ok) throw new Error("Failed to regenerate caption");
      const newCaption = await res.json();
      
      if (newCaption.caption && newCaption.hashtags) {
        const updatedCaptions = [...captions];
        updatedCaptions[index] = newCaption;
        setCaptions(updatedCaptions);
        incrementUsage();
      }
    } catch (error) {
      toast({
        title: "Error regenerating caption",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Hashtag Actions
  const handleGenerateHashtags = async () => {
    if (!hashtagTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter what your post is about.",
        variant: "destructive",
      });
      return;
    }

    if (!isPro && usage.count >= MAX_FREE_GENERATIONS) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGeneratingHashtags(true);
    setHashtagResults(null);

    try {
      const res = await fetch("/api/captions/hashtags", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          niche: hashtagNiche,
          topic: hashtagTopic,
          platform: hashtagPlatform,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate hashtags");
      const data = await res.json();
      
      if (data.grouped) {
        setHashtagResults(data);
        incrementUsage();
      }
    } catch (error) {
      toast({
        title: "Error generating hashtags",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const copyAllHashtags = () => {
    if (!hashtagResults) return;
    const all = [
      ...hashtagResults.grouped.niche,
      ...hashtagResults.grouped.popular,
      ...hashtagResults.grouped.broad
    ].join(" ");
    handleCopy(all, "all-hashtags");
  };

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background sm:bg-muted/30 pb-safe">
      <div className="w-full max-w-[430px] bg-background sm:border-x sm:shadow-sm flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-foreground">Captly</h1>
          </div>
          
          {isPro ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>Pro</span>
            </div>
          ) : (
            <div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                usage.count >= MAX_FREE_GENERATIONS 
                  ? "bg-destructive/10 border-destructive/20 text-destructive" 
                  : "bg-secondary/50 border-border text-secondary-foreground hover:bg-secondary"
              }`}
              onClick={() => setShowUpgradeModal(true)}
            >
              <span>{usage.count}/{MAX_FREE_GENERATIONS}</span>
              <span className="opacity-70">free</span>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-24">
          <AnimatePresence mode="wait">
            
            {/* GENERATOR TAB */}
            {activeTab === "generator" && (
              <motion.div
                key="generator"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-8 p-5 pb-32"
              >
                {/* Platform Selector */}
                <section className="flex flex-col gap-3">
                  <div className="flex overflow-x-auto pb-2 -mx-5 px-5 gap-2 scrollbar-none">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setPlatform(p.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                          platform === p.name
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent"
                        }`}
                      >
                        <p.icon className="w-4 h-4" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Industry Selector */}
                <section className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">Your Industry</label>
                  <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger className="w-full rounded-xl border-border bg-card h-12 text-sm focus:ring-primary">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                {/* Post Type Selector */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Post Type</label>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>
                  <Select value={postType || "__none__"} onValueChange={(v) => setPostType(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="w-full rounded-xl border-border bg-card h-12 text-sm focus:ring-primary">
                      <SelectValue placeholder="Choose a post type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No specific type</SelectItem>
                      {POST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                {/* Description Textarea */}
                <section className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">
                    What are we posting about?
                  </label>
                  <Textarea
                    placeholder="e.g. Just listed a stunning 3-bedroom house in Austin with a pool..."
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    className="min-h-[120px] resize-none text-base p-4 rounded-xl border-border bg-card shadow-sm focus-visible:ring-primary"
                  />
                </section>

                {/* Tone Selector */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Tone of Voice</label>
                    <span className="text-xs text-muted-foreground">{tones.length}/3 selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => {
                      const selected = tones.includes(t);
                      const maxed = !selected && tones.length >= 3;
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTone(t)}
                          disabled={maxed}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : maxed
                              ? "bg-card text-muted-foreground/40 border-border cursor-not-allowed"
                              : "bg-card text-muted-foreground border-border hover:bg-secondary/60 hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Caption Controls */}
                <section className="bg-card border rounded-xl p-4 flex flex-col gap-4">
                  <label className="text-sm font-semibold text-foreground mb-1">Caption Settings</label>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Length</span>
                    <div className="flex bg-secondary rounded-lg p-1">
                      {LENGTHS.map(l => (
                        <button
                          key={l}
                          onClick={() => setCaptionLength(l)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            captionLength === l ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Include Emojis</span>
                    <UISwitch 
                      checked={includeEmojis} 
                      onCheckedChange={setIncludeEmojis}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground shrink-0">Call to Action</span>
                    <Select value={ctaType} onValueChange={setCtaType}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Select CTA" />
                      </SelectTrigger>
                      <SelectContent>
                        {CTAS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* Generate Button (Floating or inline, we'll keep it inline and floating at bottom) */}
                <div className="pt-2"></div>

                {/* Results Area */}
                <AnimatePresence mode="wait">
                  {captions.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-4 mt-2 border-t pt-8"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Your Captions</h2>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">{captions.length} generated</span>
                      </div>
                      
                      <div className="flex flex-col gap-5">
                        {captions.map((caption, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                          >
                            <Card className="overflow-hidden border bg-card shadow-sm">
                              <CardContent className="p-0">
                                <div className="p-4 flex flex-col gap-3 relative">
                                  {regeneratingIndex === i && (
                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    </div>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap text-card-foreground leading-relaxed">
                                    {caption.caption}
                                  </p>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {caption.hashtags}
                                  </p>
                                </div>
                                <div className="bg-muted/30 p-2 px-3 border-t flex justify-between items-center">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-8 w-8 transition-colors ${isFavorited(caption.caption) ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}`}
                                      onClick={() => toggleFavorite(caption, platform, niche)}
                                    >
                                      <Heart className="w-4 h-4" fill={isFavorited(caption.caption) ? "currentColor" : "none"} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleRegenerateOne(i)}
                                      disabled={regeneratingIndex !== null}
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs font-medium bg-background"
                                      onClick={() => handleShare(`${caption.caption}\n\n${caption.hashtags}`)}
                                    >
                                      <Share className="w-3.5 h-3.5 mr-1.5" />
                                      Share
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 text-xs font-medium"
                                      onClick={() => handleCopy(`${caption.caption}\n\n${caption.hashtags}`, `cap-${i}`)}
                                    >
                                      {copiedStates[`cap-${i}`] ? (
                                        <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied!</>
                                      ) : (
                                        <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
                
              </motion.div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-6 p-5"
              >
                {/* Favorites Section */}
                <Collapsible
                  open={isFavoritesOpen}
                  onOpenChange={setIsFavoritesOpen}
                  className="bg-card border rounded-xl overflow-hidden shadow-sm"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold text-sm">
                    <div className="flex items-center gap-2 text-primary">
                      <Heart className="w-4 h-4" fill="currentColor" />
                      Favorites ({favorites.length})
                    </div>
                    {isFavoritesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0 flex flex-col gap-4 border-t">
                      {favorites.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No favorites yet.</p>
                      ) : (
                        favorites.map(f => (
                          <div key={f.id} className="bg-muted/40 rounded-lg p-3 border border-border/50 text-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">{f.platform}</span> • {f.niche}
                            </div>
                            <p className="whitespace-pre-wrap">{f.caption}</p>
                            <p className="text-xs text-muted-foreground">{f.hashtags}</p>
                            <div className="flex justify-end gap-2 mt-2">
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => {
                                saveFavorites(favorites.filter(fav => fav.id !== f.id));
                              }}>Unfavorite</Button>
                              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => handleCopy(`${f.caption}\n\n${f.hashtags}`, f.id)}>
                                {copiedStates[f.id] ? "Copied!" : "Copy"}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* History List */}
                <div>
                  <h2 className="font-bold text-lg mb-4">Recent Generations</h2>
                  
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-xl bg-card border-dashed">
                      <Clock className="w-8 h-8 mb-3 opacity-20" />
                      <p className="text-sm">Your generation history will appear here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {history.map(item => (
                        <Collapsible
                          key={item.id}
                          open={expandedHistory.includes(item.id)}
                          onOpenChange={(isOpen) => {
                            if (isOpen) setExpandedHistory([...expandedHistory, item.id]);
                            else setExpandedHistory(expandedHistory.filter(id => id !== item.id));
                          }}
                          className="bg-card border rounded-xl shadow-sm"
                        >
                          <CollapsibleTrigger className="w-full text-left p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <span className="bg-secondary px-2 py-0.5 rounded-sm text-secondary-foreground">{item.platform}</span>
                                <span>{item.niche}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground font-medium line-clamp-1">
                              {item.postDescription}
                            </p>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4 pt-0 border-t flex flex-col gap-4">
                              {item.captions.map((cap, i) => (
                                <div key={i} className="bg-muted/30 rounded-lg p-3 border text-sm flex flex-col gap-2">
                                  <p className="whitespace-pre-wrap">{cap.caption}</p>
                                  <p className="text-xs text-muted-foreground">{cap.hashtags}</p>
                                  <div className="flex justify-end gap-2 mt-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className={`h-7 w-7 ${isFavorited(cap.caption) ? "text-red-500" : "text-muted-foreground"}`}
                                      onClick={() => toggleFavorite(cap, item.platform, item.niche)}
                                    >
                                      <Heart className="w-3.5 h-3.5" fill={isFavorited(cap.caption) ? "currentColor" : "none"} />
                                    </Button>
                                    <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => handleCopy(`${cap.caption}\n\n${cap.hashtags}`, `${item.id}-${i}`)}>
                                      {copiedStates[`${item.id}-${i}`] ? "Copied!" : "Copy"}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* HASHTAG TAB */}
            {activeTab === "hashtags" && (
              <motion.div
                key="hashtags"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-6 p-5 pb-24"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <h2 className="font-bold text-xl">Hashtag Tool</h2>
                  <p className="text-sm text-muted-foreground">Find the perfect mix of targeted and broad hashtags for your post.</p>
                </div>

                <section className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">Industry</label>
                  <Select value={hashtagNiche} onValueChange={setHashtagNiche}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </section>

                <section className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">Platform</label>
                  <Select value={hashtagPlatform} onValueChange={setHashtagPlatform}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </section>

                <section className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">What's your post about?</label>
                  <Textarea
                    placeholder="e.g. A new espresso drink we just added to the menu..."
                    value={hashtagTopic}
                    onChange={(e) => setHashtagTopic(e.target.value)}
                    className="min-h-[100px] resize-none text-base p-4 rounded-xl border-border bg-card shadow-sm"
                  />
                </section>

                <Button 
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-md"
                  onClick={handleGenerateHashtags}
                  disabled={isGeneratingHashtags || !hashtagTopic.trim()}
                >
                  {isGeneratingHashtags ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Hash className="w-5 h-5 mr-2" /> Find Hashtags</>
                  )}
                </Button>

                {hashtagResults && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-6 mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">Results</h3>
                      <Button variant="secondary" size="sm" onClick={copyAllHashtags} className="h-8 text-xs font-medium">
                        {copiedStates["all-hashtags"] ? "Copied All!" : "Copy All 30"}
                      </Button>
                    </div>

                    {[
                      { title: "Targeted (Niche)", data: hashtagResults.grouped.niche, desc: "Highly relevant to your specific offering" },
                      { title: "Trending", data: hashtagResults.grouped.popular, desc: "Currently popular in your industry" },
                      { title: "Broad Reach", data: hashtagResults.grouped.broad, desc: "High volume for maximum visibility" }
                    ].map(group => (
                      <div key={group.title} className="bg-card border rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{group.title}</h4>
                            <p className="text-[10px] text-muted-foreground">{group.desc}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleCopy(group.data.join(" "), group.title)}>
                            {copiedStates[group.title] ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.data.map(tag => (
                            <button 
                              key={tag} 
                              onClick={() => handleCopy(tag, tag)}
                              className="bg-secondary/50 hover:bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer"
                            >
                              {copiedStates[tag] ? <span className="text-primary">Copied!</span> : tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Floating Generate Button (Only on Generator Tab) */}
        {activeTab === "generator" && (
          <div className="absolute bottom-16 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-6 z-10 pointer-events-none">
            <motion.div whileTap={{ scale: 0.97 }} className="pointer-events-auto">
              <Button 
                className="w-full h-14 rounded-full text-base font-semibold shadow-lg shadow-primary/20"
                onClick={handleGenerate}
                disabled={isGenerating || !postDescription.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Writing magic...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Captions
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        )}

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t flex items-center justify-around px-2 pb-safe z-20">
          {[
            { id: "generator", icon: Sparkles, label: "Generator" },
            { id: "history", icon: Clock, label: "History" },
            { id: "hashtags", icon: Hash, label: "Hashtags" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center w-full py-3 gap-1 transition-colors ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "fill-primary/20" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

      </div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0 overflow-hidden border-0">
          <div className="bg-primary p-6 text-primary-foreground text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Crown className="w-8 h-8 text-white drop-shadow-md" />
              </div>
              <DialogTitle className="text-2xl font-bold mb-2">You've Hit Your Free Limit</DialogTitle>
              <DialogDescription className="text-primary-foreground/90 text-sm font-medium">
                Upgrade to Captly Pro for unlimited captions, priority AI generation, and advanced features.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 bg-card flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium text-card-foreground">Unlimited caption generations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium text-card-foreground">Priority AI processing speed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium text-card-foreground">All premium tones & industries</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={checkoutEmail}
                onChange={(e) => setCheckoutEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full h-12 rounded-xl text-base font-bold shadow-md shadow-primary/20"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Redirecting to checkout..." : "Upgrade for $9.99/month"}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground font-medium" onClick={() => setShowUpgradeModal(false)}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={CaptionAIApp} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/*" component={LandingPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
