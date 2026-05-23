import { useState, useEffect } from "react";
import { Sun, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useTier } from "@/contexts/TierContext";
import { useToast } from "@/hooks/use-toast";

interface Devotional {
  date: string;
  scripture: { reference: string; text: string };
  title: string;
  reflection: string;
  declaration: string;
  prayer: string;
}

async function fetchDevotional(): Promise<Devotional> {
  let goalsText = "";
  try {
    const ctxRes = await fetch("/api/ai/premium-context");
    if (ctxRes.ok) {
      const ctx = await ctxRes.json() as { goals: Array<{ title: string; category: string }> };
      goalsText = (ctx.goals ?? []).slice(0, 5).map((g) => `${g.title} (${g.category})`).join(", ");
    }
  } catch { /* non-critical — proceed without goals */ }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/ai/devotional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: goalsText }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Devotional>;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((res) => setTimeout(res, 1200));
    }
  }
  throw lastErr;
}

const CACHE_KEY = "lhl_devotional_v1";
const CACHE_TTL = 20 * 60 * 60 * 1000; // 20 hours

function readCache(): Devotional | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: Devotional };
    if (Date.now() - at > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function writeCache(data: Devotional) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch {}
}

export default function DevotionalPage() {
  const tier = useTier();
  const { toast } = useToast();
  const [devotional, setDevotional] = useState<Devotional | null>(() => readCache());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tier === "premium" && !devotional) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const handleGenerate = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) { setDevotional(cached); return; }
    }
    setLoading(true);
    try {
      const result = await fetchDevotional();
      writeCache(result);
      setDevotional(result);
    } catch {
      toast({ title: "Couldn't generate devotional", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UpgradeGate feature="Personalized Daily Devotional" isPremium={tier === "premium"}>
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24 space-y-8 animate-in fade-in duration-400">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Sun className="w-7 h-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">Morning Devotional</h1>
          </div>
          <p className="text-muted-foreground font-serif italic text-sm">
            Written fresh each morning, just for you.
          </p>
        </header>

        {loading && !devotional ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground font-serif italic">Preparing your morning word…</p>
          </div>
        ) : devotional ? (
          <div className="space-y-8">
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{devotional.date}</p>
              <h2 className="text-2xl font-serif font-semibold text-foreground">{devotional.title}</h2>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
              <p className="font-serif text-lg font-medium text-primary">{devotional.scripture.reference}</p>
              <blockquote className="font-serif text-base leading-relaxed text-foreground italic">
                "{devotional.scripture.text}"
              </blockquote>
            </div>

            <div className="space-y-4">
              {devotional.reflection.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-foreground/85 leading-relaxed font-serif text-base">{para}</p>
              ))}
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
              <p className="text-xs uppercase tracking-widest text-primary font-medium">Speak This Aloud</p>
              <p className="font-serif text-lg font-semibold text-foreground leading-relaxed">
                {devotional.declaration}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/20 p-6 space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Prayer</p>
              <p className="font-serif italic text-foreground/80 leading-relaxed">{devotional.prayer}</p>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="gap-1.5 text-muted-foreground border-border/50 hover:text-foreground"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Generate a new devotional
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </UpgradeGate>
  );
}
