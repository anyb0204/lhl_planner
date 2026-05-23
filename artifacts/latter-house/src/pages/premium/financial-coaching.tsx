import { useState } from "react";
import { DollarSign, Loader2, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useTier } from "@/contexts/TierContext";
import { useToast } from "@/hooks/use-toast";

interface Coaching {
  summary: string;
  strengths: string[];
  opportunities: string[];
  nextMonthGoals: string[];
  scriptureEncouragement: { reference: string; text: string; application: string };
  coachingMessage: string;
}

async function generateCoaching(): Promise<Coaching> {
  const ctxRes = await fetch("/api/ai/premium-context");
  const ctx = ctxRes.ok ? await ctxRes.json() as {
    financials: Array<{ type: string; amount: string; description: string; category?: string; date: string }>;
  } : { financials: [] };

  const month = format(new Date(), "MMMM yyyy");
  const entriesText = ctx.financials.map((f: { type: string; amount: string; description: string; category?: string }) =>
    `${f.type}: $${f.amount} — ${f.description}${f.category ? ` (${f.category})` : ""}`
  ).join("; ") || "";

  const r = await fetch("/api/ai/financial-coaching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: entriesText, month }),
  });
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<Coaching>;
}

export default function FinancialCoachingPage() {
  const tier = useTier();
  const { toast } = useToast();
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [loading, setLoading] = useState(false);
  const currentMonth = format(new Date(), "MMMM yyyy");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      setCoaching(await generateCoaching());
    } catch {
      toast({ title: "Couldn't generate coaching", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UpgradeGate feature="Financial Coaching" isPremium={tier === "premium"}>
      <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 space-y-8 animate-in fade-in duration-400">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">Financial Coaching</h1>
          </div>
          <p className="text-muted-foreground font-serif italic">
            Faith-based stewardship guidance rooted in your actual numbers for {currentMonth}.
          </p>
        </header>

        {!coaching ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center space-y-4">
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
              AI will review your financial entries for this month and offer encouraging, faith-grounded coaching — celebrating what you're doing well and suggesting practical improvements for next month.
            </p>
            <Button size="lg" onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reviewing your finances…</> : <><Sparkles className="w-4 h-4" /> Get Financial Coaching</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-2">
              <h2 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Monthly Overview</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{coaching.summary}</p>
            </div>

            {coaching.strengths.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <h2 className="font-semibold text-emerald-800">What You're Doing Well</h2>
                <ul className="space-y-2">
                  {coaching.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                      <span className="shrink-0 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coaching.opportunities.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Opportunities to Grow</h2>
                <ul className="space-y-2">
                  {coaching.opportunities.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary mt-0.5 shrink-0">→</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coaching.nextMonthGoals.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Goals for Next Month</h2>
                <ul className="space-y-2">
                  {coaching.nextMonthGoals.map((g, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground/85">
                      <span className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-xs text-primary shrink-0">{i + 1}</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <blockquote className="font-serif italic text-foreground/80 leading-relaxed">
                "{coaching.scriptureEncouragement.text}"
              </blockquote>
              <p className="text-xs text-primary font-medium">— {coaching.scriptureEncouragement.reference}</p>
              {coaching.scriptureEncouragement.application && (
                <p className="text-xs text-muted-foreground">{coaching.scriptureEncouragement.application}</p>
              )}
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/20 p-5">
              <p className="text-sm font-serif italic text-foreground/80 leading-relaxed">{coaching.coachingMessage}</p>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh Coaching
              </Button>
            </div>
          </div>
        )}
      </div>
    </UpgradeGate>
  );
}
