import { useState } from "react";
import { HeartPulse, Loader2, Sparkles, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useTier } from "@/contexts/TierContext";
import { useToast } from "@/hooks/use-toast";

interface HealthSummary {
  conditionsSummary: Array<{ name: string; status: string; notes?: string }>;
  medicationsSummary: Array<{ name: string; dose?: string; timing?: string; notes?: string }>;
  questionsForDoctor: string[];
  importantReminders: string[];
  disclaimer: string;
}

async function generateHealthSummary(): Promise<HealthSummary> {
  const ctxRes = await fetch("/api/ai/premium-context");
  const ctx = ctxRes.ok ? await ctxRes.json() as {
    conditions: Array<{ name: string; status: string; notes?: string }>;
    medications: Array<{ name: string; dose?: string; times?: string; notes?: string }>;
  } : { conditions: [], medications: [] };

  const conditionsText = ctx.conditions.map((c: { name: string; status: string; notes?: string }) =>
    `${c.name} (${c.status})${c.notes ? `: ${c.notes}` : ""}`
  ).join("; ") || "";

  const medsText = ctx.medications.map((m: { name: string; dose?: string; times?: string; notes?: string }) =>
    `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.times ? ` — ${m.times}` : ""}`
  ).join("; ") || "";

  const r = await fetch("/api/ai/health-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conditions: conditionsText, medications: medsText }),
  });
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<HealthSummary>;
}

export default function HealthSummaryPage() {
  const tier = useTier();
  const { toast } = useToast();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      setSummary(await generateHealthSummary());
    } catch {
      toast({ title: "Couldn't generate summary", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UpgradeGate feature="Health Summary" isPremium={tier === "premium"}>
      <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 space-y-8 animate-in fade-in duration-400">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">Health Summary</h1>
          </div>
          <p className="text-muted-foreground font-serif italic">
            A plain-language summary of your health picture — ready to share with your doctor.
          </p>
        </header>

        {!summary ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center space-y-4">
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
              AI will read your logged health conditions and medications, then create a clear, organized summary you can print and bring to any medical appointment.
            </p>
            <Button size="lg" onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building summary…</> : <><Sparkles className="w-4 h-4" /> Generate My Health Summary</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {summary.conditionsSummary.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Health Conditions</h2>
                <div className="space-y-2">
                  {summary.conditionsSummary.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${c.status === "active" ? "bg-amber-100 text-amber-700" : c.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {c.status}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.notes && <p className="text-muted-foreground text-xs mt-0.5">{c.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.medicationsSummary.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Current Medications</h2>
                <div className="space-y-2">
                  {summary.medicationsSummary.map((m, i) => (
                    <div key={i} className="rounded-md border border-border/30 bg-muted/20 px-4 py-3 text-sm">
                      <p className="font-medium text-foreground">{m.name}{m.dose ? ` — ${m.dose}` : ""}</p>
                      {m.timing && <p className="text-muted-foreground text-xs">{m.timing}</p>}
                      {m.notes && <p className="text-muted-foreground text-xs italic">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.questionsForDoctor.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Suggested Questions for Your Doctor</h2>
                <ul className="space-y-2">
                  {summary.questionsForDoctor.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary mt-0.5 shrink-0">?</span> {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.importantReminders.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
                <h2 className="font-semibold text-foreground">Self-Care Reminders</h2>
                <ul className="space-y-2">
                  {summary.importantReminders.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-emerald-600 mt-0.5 shrink-0">✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{summary.disclaimer}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-center">
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print Summary
              </Button>
              <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </UpgradeGate>
  );
}
