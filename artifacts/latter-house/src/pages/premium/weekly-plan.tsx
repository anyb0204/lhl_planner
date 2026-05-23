import { useState } from "react";
import { Calendar, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useTier } from "@/contexts/TierContext";
import { useToast } from "@/hooks/use-toast";

interface DayPlan { day: string; focus: string; keyTasks: string[]; eveningReflection: string; }
interface WeeklyPlan {
  weekTheme: string;
  themeScripture: { reference: string; text: string };
  days: DayPlan[];
  weeklyIntention: string;
  prayerAnchor: string | null;
}

async function fetchPremiumContext() {
  const r = await fetch("/api/ai/premium-context");
  if (!r.ok) return null;
  return r.json() as Promise<{ goals: Array<{ title: string; category: string; progress: string }> }>;
}

async function generateWeeklyPlan(goalsText: string, tasksText: string): Promise<WeeklyPlan> {
  const r = await fetch("/api/ai/weekly-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals: goalsText, recentTasks: tasksText }),
  });
  if (!r.ok) throw new Error("Failed to generate plan");
  return r.json() as Promise<WeeklyPlan>;
}

export default function WeeklyPlanPage() {
  const tier = useTier();
  const { toast } = useToast();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const ctx = await fetchPremiumContext();
      const goalsText = ctx?.goals?.map(g => `${g.title} (${g.category})`).join(", ") ?? "";
      const result = await generateWeeklyPlan(goalsText, "");
      setPlan(result);
    } catch {
      toast({ title: "Couldn't generate your plan", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UpgradeGate feature="Weekly Planning Session" isPremium={tier === "premium"}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24 space-y-8 animate-in fade-in duration-400">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">Weekly Planning Session</h1>
          </div>
          <p className="text-muted-foreground font-serif italic">
            AI generates a full week plan rooted in your goals and faith.
          </p>
        </header>

        {!plan ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center space-y-4">
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
              Click below and AI will read your current goals, then build a purposeful day-by-day plan for the coming week — complete with a theme scripture, daily focus areas, and an evening reflection for each day.
            </p>
            <Button size="lg" onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your week…</> : <><Sparkles className="w-4 h-4" /> Generate My Week Plan</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <p className="text-xs uppercase tracking-widest text-primary font-medium">This Week's Theme</p>
              <h2 className="text-xl font-serif font-semibold text-foreground">{plan.weekTheme}</h2>
              <blockquote className="border-l-2 border-primary/30 pl-4 font-serif italic text-foreground/80">
                "{plan.themeScripture.text}"
                <footer className="text-xs text-primary mt-1 not-italic">— {plan.themeScripture.reference}</footer>
              </blockquote>
              {plan.weeklyIntention && (
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">{plan.weeklyIntention}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.days.map((day) => (
                <div key={day.day} className="rounded-lg border border-border/50 bg-card p-5 space-y-3">
                  <h3 className="font-semibold text-foreground">{day.day}</h3>
                  <p className="text-sm text-primary font-medium">{day.focus}</p>
                  {day.keyTasks.length > 0 && (
                    <ul className="space-y-1">
                      {day.keyTasks.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <span className="text-primary mt-0.5">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  {day.eveningReflection && (
                    <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2 mt-2">
                      Evening: {day.eveningReflection}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {plan.prayerAnchor && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground italic font-serif">
                {plan.prayerAnchor}
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Regenerate Plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </UpgradeGate>
  );
}
