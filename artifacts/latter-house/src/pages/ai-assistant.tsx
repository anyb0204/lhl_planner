import { useState } from "react";
import {
  Sparkles, Package, FileText, Share2, Target, Heart,
  Lightbulb, Send, RefreshCw, Copy, CheckCircle2,
  ChevronDown, ChevronUp, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGenerateScripture, useGenerateEncouragement } from "@workspace/api-client-react";
import { MemoryCard } from "@/components/memory-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolKey =
  | "etsy-title"
  | "product-desc"
  | "social-caption"
  | "goal-suggestions"
  | "routine"
  | "digital-products"
  | "encouragement"
  | "scripture";

interface Tool {
  key: ToolKey;
  icon: React.FC<{ className?: string }>;
  label: string;
  description: string;
  prompt?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  color: string;
  bg: string;
}

// ─── Mock AI response generators ─────────────────────────────────────────────

function mockEtsyTitle(keyword: string): string {
  const keyword_clean = keyword || "handmade item";
  const styles = ["Boho", "Vintage", "Farmhouse", "Cottagecore", "Modern Rustic"];
  const occasions = ["Gift", "Home Decor", "Birthday Gift", "Holiday Gift", "Personalized Gift"];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const occasion = occasions[Math.floor(Math.random() * occasions.length)];
  return `${style} ${keyword_clean} | Handmade ${occasion} | Custom ${keyword_clean} | Ready to Ship | Perfect ${occasion} for Her`;
}

function mockProductDesc(item: string): string {
  return `Introducing this beautifully crafted ${item || "handmade piece"} — made with love and attention to detail.

Each piece is thoughtfully created to bring warmth and character to your home. Whether you're treating yourself or searching for the perfect gift, this ${item || "item"} is sure to delight.

✨ WHAT MAKES THIS SPECIAL:
• Carefully handcrafted with quality materials
• One-of-a-kind character and charm
• Perfect for gifting or keeping
• Ships beautifully packaged with care

📦 SHIPPING:
Ships within 3-5 business days. Arrives gift-ready in protective packaging.

💛 ABOUT MY SHOP:
Every item in my shop is made by me with care and intentionality. Your purchase supports a small, faith-driven business — and I'm grateful for every order.

Questions? Just message me — I'm happy to help!`;
}

function mockSocialCaption(topic: string): string {
  const emojis = ["✨", "💛", "🌿", "🙏", "💫"];
  const e = emojis[Math.floor(Math.random() * emojis.length)];
  return `${e} New in the shop! ${topic || "Something beautiful"} just dropped and I couldn't be more excited to share it with you.

Made with love. Shipped with care. Designed to bring joy to your home. ${e}

👉 Link in bio to shop now!

${["#handmade", "#shopsmall", "#etsyseller", "#makersgonnamake", "#smallbusiness", "#faithdriven", "#handcrafted", "#homedecor"].join(" ")}`;
}

function mockGoalSuggestions(area: string): string {
  const suggestions = {
    business: [
      "List 5 new products this week to build inventory momentum",
      "Research 3 competitors and identify one gap in the market you could fill",
      "Create a simple content calendar for the next 30 days",
      "Set up a dedicated workspace for your business activities",
      "Connect with one other seller community for support and ideas",
    ],
    health: [
      "Walk 20 minutes each morning before checking your phone",
      "Drink a full glass of water before each meal",
      "Schedule your next wellness check-up",
      "Establish a 10-minute evening wind-down routine",
      "Add one vegetable to every meal this week",
    ],
    spiritual: [
      "Spend 10 minutes in morning prayer before the day begins",
      "Memorize one scripture that speaks to your current season",
      "Start a gratitude journal — 3 things each night",
      "Read one chapter of Proverbs daily",
      "Find an accountability partner for your faith journey",
    ],
    financial: [
      "Review last month's spending and identify one category to reduce",
      "Set up automatic savings of even $25/week",
      "Research one additional income stream that fits your skills",
      "Create a simple monthly budget in 3 categories: needs, wants, savings",
      "Track every expense for the next 30 days",
    ],
  };

  const key = (area?.toLowerCase() as keyof typeof suggestions) ?? "business";
  const list = suggestions[key] ?? suggestions.business;
  return list.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

function mockRoutine(focus: string): string {
  return `🌅 MORNING ROUTINE (for ${focus || "purpose and productivity"})

6:00 AM — Wake without phone. Take 3 deep breaths.
6:05 AM — Hydrate (16 oz water + lemon)
6:15 AM — Prayer and scripture reading (15 min)
6:30 AM — Journal: Today I'm grateful for... / My top 3 priorities are...
6:45 AM — Light movement (walk, stretching, or yoga)
7:15 AM — Personal hygiene + get dressed intentionally
7:45 AM — Healthy breakfast — no screens
8:00 AM — Begin your most important task of the day

🌙 EVENING ROUTINE

8:00 PM — Wrap up work. Close laptop.
8:15 PM — Light dinner or herbal tea
8:30 PM — Review what you accomplished today (no judgment)
8:45 PM — Prepare tomorrow's top 3 priorities
9:00 PM — No screens. Read, pray, or journal.
9:30 PM — Gratitude reflection — 3 specific things
10:00 PM — Lights out for quality rest

💡 Remember: Routines are scaffolding, not cages. Adjust as needed. The goal is intention, not perfection.`;
}

function mockDigitalProducts(niche: string): string {
  return `💡 DIGITAL PRODUCT IDEAS for "${niche || "your niche"}"

BEGINNER-FRIENDLY (Low effort, fast to create):
1. Printable daily planner pages
2. Goal-setting worksheet bundle
3. Habit tracker template
4. Scripture affirmation cards (printable)
5. Budget tracking spreadsheet

INTERMEDIATE (Some effort, good income potential):
6. 30-day devotional journal (PDF)
7. "Start Your Side Hustle" mini-course
8. Meal planning + grocery list template bundle
9. Etsy listing template kit
10. Social media caption swipe file (50+ captions)

HIGHER VALUE (More work, premium pricing):
11. Self-paced video course on your expertise
12. Done-for-you Canva template packs
13. Coaching session recordings + workbook
14. Complete system bundle (planners + trackers + guide)
15. Private membership / community access

🎯 START HERE: Pick the one that excites you AND that you could create this week. Progress beats perfection every time.`;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    key: "etsy-title",
    icon: Package,
    label: "Etsy Title Generator",
    description: "Generate SEO-optimized Etsy listing titles that attract buyers.",
    inputLabel: "What is your product?",
    inputPlaceholder: "e.g. hand-poured soy candle",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  {
    key: "product-desc",
    icon: FileText,
    label: "Product Description",
    description: "Create compelling product descriptions for any platform.",
    inputLabel: "Describe your product briefly",
    inputPlaceholder: "e.g. crocheted baby blanket in mint green",
    color: "text-sky-700",
    bg: "bg-sky-50",
  },
  {
    key: "social-caption",
    icon: Share2,
    label: "Social Media Caption",
    description: "Write engaging captions for Instagram, Facebook, or TikTok.",
    inputLabel: "What are you posting about?",
    inputPlaceholder: "e.g. new jewelry listing in my Etsy shop",
    color: "text-pink-700",
    bg: "bg-pink-50",
  },
  {
    key: "goal-suggestions",
    icon: Target,
    label: "Goal Suggestions",
    description: "Get specific, actionable goals tailored to your focus area.",
    inputLabel: "What area do you want to focus on?",
    inputPlaceholder: "e.g. business, health, spiritual, financial",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    key: "routine",
    icon: RefreshCw,
    label: "Routine Builder",
    description: "Create a personalized morning or evening routine.",
    inputLabel: "What's your main goal for the routine?",
    inputPlaceholder: "e.g. more peace, business growth, better health",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  {
    key: "digital-products",
    icon: Lightbulb,
    label: "Digital Product Ideas",
    description: "Brainstorm profitable digital products you can create and sell.",
    inputLabel: "What's your niche or expertise?",
    inputPlaceholder: "e.g. Christian women, home organizing, faith journaling",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    key: "encouragement",
    icon: Heart,
    label: "Personal Encouragement",
    description: "Receive a faith-filled word of encouragement for your day.",
    color: "text-rose-700",
    bg: "bg-rose-50",
  },
  {
    key: "scripture",
    icon: Sparkles,
    label: "Daily Scripture",
    description: "Get a scripture with reflection tailored to your journey.",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface ToolResult {
  key: ToolKey;
  input: string;
  output: string;
}

export default function AIAssistantPage() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const generateScripture = useGenerateScripture();
  const generateEncouragement = useGenerateEncouragement();

  const activeTool_ = tools.find(t => t.key === activeTool);

  async function handleGenerate() {
    if (!activeTool) return;
    setLoading(true);

    try {
      let output = "";

      if (activeTool === "encouragement") {
        const result = await new Promise<string>((resolve, reject) => {
          generateEncouragement.mutate({ data: { view: "day" } }, {
            onSuccess: (data: { message: string }) => resolve(data.message),
            onError: reject,
          });
        });
        output = result;
      } else if (activeTool === "scripture") {
        const result = await new Promise<{ reference: string; text: string; reflection: string }>((resolve, reject) => {
          generateScripture.mutate({ data: {} }, {
            onSuccess: resolve,
            onError: reject,
          });
        });
        output = `${result.reference}\n\n"${result.text}"\n\n${result.reflection}`;
      } else {
        // Mock responses for business tools
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
        switch (activeTool) {
          case "etsy-title": output = mockEtsyTitle(input); break;
          case "product-desc": output = mockProductDesc(input); break;
          case "social-caption": output = mockSocialCaption(input); break;
          case "goal-suggestions": output = mockGoalSuggestions(input); break;
          case "routine": output = mockRoutine(input); break;
          case "digital-products": output = mockDigitalProducts(input); break;
        }
      }

      const resultId = `${activeTool}-${Date.now()}`;
      setResults(prev => [
        { key: activeTool, input, output },
        ...prev.slice(0, 9),
      ]);
      setExpanded(resultId);
    } catch {
      setResults(prev => [
        { key: activeTool, input, output: "Something went wrong. Please try again." },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-primary" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground font-serif italic">
          Your faith-filled, business-savvy creative partner.
        </p>
      </header>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Tool selector ── */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Choose a tool</p>
          <div className="grid grid-cols-1 gap-2">
            {tools.map(tool => (
              <button
                key={tool.key}
                onClick={() => { setActiveTool(tool.key); setInput(""); }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200",
                  activeTool === tool.key
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tool.bg)}>
                  <tool.icon className={cn("w-4.5 h-4.5", tool.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{tool.description}</p>
                </div>
                {activeTool === tool.key && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input + output panel ── */}
        <div className="space-y-4">
          {activeTool_ ? (
            <>
              <div className="journal-page p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", activeTool_.bg)}>
                    <activeTool_.icon className={cn("w-4 h-4", activeTool_.color)} />
                  </div>
                  <h3 className="font-serif font-semibold text-foreground">{activeTool_.label}</h3>
                </div>

                {activeTool_.inputLabel && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {activeTool_.inputLabel}
                    </label>
                    <Input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder={activeTool_.inputPlaceholder}
                      onKeyDown={e => { if (e.key === "Enter") handleGenerate(); }}
                    />
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={loading || (!!activeTool_.inputLabel && !input.trim())}
                  className="w-full gap-2 bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Results
                  </p>
                  {results.map((result, i) => {
                    const id = `result-${i}`;
                    const tool = tools.find(t => t.key === result.key);
                    const isExpanded = expanded === id || i === 0;
                    return (
                      <div key={id} className="journal-page overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : id)}
                        >
                          <div className="flex items-center gap-2">
                            {tool && <div className={cn("w-5 h-5 rounded flex items-center justify-center", tool.bg)}>
                              <tool.icon className={cn("w-3 h-3", tool.color)} />
                            </div>}
                            <span className="text-xs font-medium text-foreground">{tool?.label}</span>
                            {result.input && (
                              <span className="text-xs text-muted-foreground/70 italic truncate max-w-[120px]">
                                · {result.input}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); copyToClipboard(result.output, id); }}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy"
                            >
                              {copiedId === id
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <pre className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
                              {result.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-foreground">Select a tool to begin</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Choose from the tools on the left to generate content, ideas, or encouragement.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Memory card */}
      <div className="md:col-start-2 md:row-start-1">
        <MemoryCard />
      </div>
      </div>
    </div>
  );
}
