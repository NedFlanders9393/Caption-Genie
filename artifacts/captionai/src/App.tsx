import React, { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Copy, Check, Sparkles, Crown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

// Constants
const NICHES = [
  "Real Estate",
  "Fitness Coach",
  "Restaurant",
  "Boutique/Shop",
  "General Business",
];

const TONES = ["Professional", "Casual", "Funny", "Inspirational"];
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

function CaptionAIApp() {
  const { toast } = useToast();
  const [niche, setNiche] = useState<string>("General Business");
  const [postDescription, setPostDescription] = useState("");
  const [tone, setTone] = useState<string>("Professional");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [usage, setUsage] = useState<UsageData>({ count: 0, month: "" });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Initialize usage counter from localStorage
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const stored = localStorage.getItem("captionai_usage");
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UsageData;
        if (parsed.month !== currentMonth) {
          // Reset for new month
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
  }, []);

  const handleGenerate = async () => {
    if (!postDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your post first.",
        variant: "destructive",
      });
      return;
    }

    if (usage.count >= MAX_FREE_GENERATIONS) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setCaptions([]);

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche.replace("/", "_").replace(" ", "_"), // Adjust format if needed for API, but let's send exactly what user selects or what the API expects.
          postDescription,
          tone,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate captions");
      }

      const data = await res.json();
      
      if (data.captions && Array.isArray(data.captions)) {
        setCaptions(data.captions);
        
        // Increment usage
        const newUsage = { ...usage, count: usage.count + 1 };
        setUsage(newUsage);
        localStorage.setItem("captionai_usage", JSON.stringify(newUsage));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error generating captions",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (caption: Caption, index: number) => {
    const textToCopy = `${caption.caption}\n\n${caption.hashtags}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied!",
        description: "Caption copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-background sm:bg-muted/30">
      <div className="w-full max-w-[430px] bg-background sm:border-x sm:shadow-sm flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-foreground">CaptionAI</h1>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border text-xs font-medium text-secondary-foreground">
            <span className={usage.count >= MAX_FREE_GENERATIONS ? "text-destructive" : ""}>
              {usage.count}/{MAX_FREE_GENERATIONS}
            </span>
            <span className="opacity-70">left</span>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-8 pb-32">
          
          {/* Niche Selector */}
          <section className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-foreground">Your Industry</label>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button
                  key={n}
                  onClick={() => setNiche(n)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    niche === n
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          {/* Description Textarea */}
          <section className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>What are we posting about?</span>
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
            <label className="text-sm font-semibold text-foreground">Tone of Voice</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    tone === t
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Results Area */}
          <AnimatePresence mode="wait">
            {captions.length > 0 ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 mt-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Your Captions</h2>
                  <span className="text-xs text-muted-foreground">{captions.length} generated</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {captions.map((caption, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="p-4 flex flex-col gap-3">
                            <p className="text-sm whitespace-pre-wrap text-card-foreground leading-relaxed">
                              {caption.caption}
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {caption.hashtags}
                            </p>
                          </div>
                          <div className="bg-muted/30 p-2 border-t flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10 gap-2 h-8"
                              onClick={() => handleCopy(caption, i)}
                            >
                              {copiedIndex === i ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ) : !isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground mt-4"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary/40" />
                </div>
                <p className="text-sm max-w-[200px]">Fill out the details above to get scroll-stopping captions.</p>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Bottom floating CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-8">
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
        </div>

      </div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0 overflow-hidden border-0">
          <div className="bg-primary p-6 text-primary-foreground text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold mb-2">You've reached your limit</DialogTitle>
              <DialogDescription className="text-primary-foreground/80 text-base">
                Upgrade to CaptionAI Pro to get unlimited AI-powered captions that convert.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 bg-card flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-card-foreground">Unlimited caption generations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-card-foreground">Priority AI processing speed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-card-foreground">All premium tones & industries</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button className="w-full h-12 rounded-xl text-base font-bold shadow-md shadow-primary/20">
                Upgrade for $9.99/mo
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowUpgradeModal(false)}>
                Maybe later
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
      <Route path="/" component={CaptionAIApp} />
      <Route path="/*" component={CaptionAIApp} />
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
