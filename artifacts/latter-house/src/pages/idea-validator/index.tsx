import { useState } from "react";
import {
  Lightbulb, TrendingUp, AlertTriangle, Target, DollarSign,
  ChevronDown, ChevronUp, Trash2, Clock, CheckCircle2,
  BarChart3, Users, Zap, ArrowRight, Loader2, PlusCircle,
  Eye, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvisibleCompetitor {
  name: string;
  type: string;
  threat: "high" | "medium" | "low";
  description: string;
}

interface FailureReason {
  rank: number;
  title: string;
  probability: "high" | "medium" | "low";
  detail: string;
  mitigation: string;
}

interface TamStep {
  step: string;
  value: string;
  assumption: string;
}

interface CacLtvMonth {
  month: number;
  cac: number;
  ltv: number;
  ratio: number;
  cumulativeCustomers: number;
}

interface AlternativeIdea {
  title: string;
  description: string;
  successProbability: number;
  whyBetter: string;
}

interface AnalysisReport {
  executiveSummary: string;
  successProbability: number;
  confidenceScore: number;
  invisibleCompetition: {
    headline: string;
    competitors: InvisibleCompetitor[];
    insight: string;
  };
  preMortem: {
    headline: string;
    failures: FailureReason[];
  };
  tamAnalysis: {
    headline: string;
    totalAddressableMarket: string;
    serviceableAddressableMarket: string;
    serviceableObtainableMarket: string;
    calculation: TamStep[];
    insight: string;
  };
  cacLtvProjection: {
    headline: string;
    year1Summary: string;
    months: CacLtvMonth[];
    assumptions: string[];
  };
  alternativeIdeas: AlternativeIdea[];
  keyRecommendations: string[];
}

interface IdeaRecord {
  id: number;
  title: string;
  description: string;
  targetCustomer?: string;
  revenueModel?: string;
  stage?: string;
  status: "pending" | "complete" | "error";
  report: AnalysisReport | null;
  successProbability?: number;
  confidenceScore?: number;
  createdAt: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function listIdeas() {
  return apiFetch<IdeaRecord[]>("/api/ideas");
}

function createIdea(data: {
  title: string;
  description: string;
  targetCustomer?: string;
  revenueModel?: string;
  stage?: string;
}) {
  return apiFetch<IdeaRecord>("/api/ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function deleteIdea(id: number) {
  return apiFetch<void>(`/api/ideas/${id}`, { method: "DELETE" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle
            cx="35" cy="35" r={r} fill="none"
            stroke="currentColor" strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
          {value}
        </span>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function ThreatBadge({ level }: { level: "high" | "medium" | "low" }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium",
      level === "high" && "bg-red-100 text-red-700",
      level === "medium" && "bg-amber-100 text-amber-700",
      level === "low" && "bg-green-100 text-green-700",
    )}>
      {level}
    </span>
  );
}

function Section({
  icon: Icon, title, children, defaultOpen = false,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function ReportView({ report, idea }: { report: AnalysisReport; idea: IdeaRecord }) {
  return (
    <div className="space-y-4">
      {/* Header scores */}
      <div className="bg-muted/20 rounded-xl p-5">
        <p className="text-sm text-muted-foreground italic mb-4">{report.executiveSummary}</p>
        <div className="flex justify-around">
          <ScoreRing
            value={report.successProbability ?? idea.successProbability ?? 0}
            label="Success Probability"
            color="text-primary"
          />
          <ScoreRing
            value={report.confidenceScore ?? idea.confidenceScore ?? 0}
            label="Confidence Score"
            color="text-amber-500"
          />
          <ScoreRing
            value={Math.min(100, Math.round(
              ((report.cacLtvProjection?.months?.at(-1)?.ratio ?? 1) / 5) * 100
            ))}
            label="LTV:CAC Health"
            color="text-emerald-500"
          />
        </div>
      </div>

      {/* Key recommendations */}
      {report.keyRecommendations?.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Key Recommendations
          </h4>
          <ul className="space-y-2">
            {report.keyRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invisible Competition */}
      <Section icon={Eye} title="Invisible Competition" defaultOpen>
        <p className="text-sm text-muted-foreground">{report.invisibleCompetition.headline}</p>
        <div className="space-y-3">
          {report.invisibleCompetition.competitors.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">({c.type})</span>
                  <ThreatBadge level={c.threat} />
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground font-medium border-l-2 border-primary pl-3 italic">
          {report.invisibleCompetition.insight}
        </p>
      </Section>

      {/* Pre-Mortem */}
      <Section icon={AlertTriangle} title="Pre-Mortem: Why This Fails" defaultOpen>
        <p className="text-sm text-muted-foreground">{report.preMortem.headline}</p>
        <div className="space-y-4">
          {report.preMortem.failures.map((f) => (
            <div key={f.rank} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                  f.probability === "high" ? "bg-red-500" : f.probability === "medium" ? "bg-amber-500" : "bg-green-500"
                )}>
                  {f.rank}
                </span>
                <span className="font-semibold text-sm text-foreground">{f.title}</span>
                <ThreatBadge level={f.probability} />
              </div>
              <p className="text-sm text-muted-foreground pl-8">{f.detail}</p>
              <div className="pl-8 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><strong>Mitigation:</strong> {f.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* TAM */}
      <Section icon={Target} title="Market Size (TAM/SAM/SOM)">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "TAM", value: report.tamAnalysis.totalAddressableMarket, color: "bg-blue-100 text-blue-700" },
            { label: "SAM", value: report.tamAnalysis.serviceableAddressableMarket, color: "bg-violet-100 text-violet-700" },
            { label: "SOM", value: report.tamAnalysis.serviceableObtainableMarket, color: "bg-primary/10 text-primary" },
          ].map((m) => (
            <div key={m.label} className={cn("rounded-lg p-3 text-center", m.color)}>
              <div className="text-xs font-medium opacity-70 mb-1">{m.label}</div>
              <div className="text-base font-bold">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {report.tamAnalysis.calculation.map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <div>
                <span className="font-medium text-foreground">{step.step}:</span>
                <span className="text-primary font-semibold ml-1">{step.value}</span>
                <span className="text-muted-foreground ml-1">— {step.assumption}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground font-medium border-l-2 border-primary pl-3 italic mt-2">
          {report.tamAnalysis.insight}
        </p>
      </Section>

      {/* CAC/LTV */}
      <Section icon={TrendingUp} title="12-Month CAC vs. LTV Projection">
        <p className="text-sm text-muted-foreground mb-3">{report.cacLtvProjection.year1Summary}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Month</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">CAC</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">LTV</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ratio</th>
                <th className="text-right py-2 pl-3 text-muted-foreground font-medium">Customers</th>
              </tr>
            </thead>
            <tbody>
              {report.cacLtvProjection.months.map((m) => (
                <tr key={m.month} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3 text-foreground font-medium">M{m.month}</td>
                  <td className="text-right py-2 px-3 text-foreground">${m.cac.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-foreground">${m.ltv.toLocaleString()}</td>
                  <td className={cn(
                    "text-right py-2 px-3 font-semibold",
                    m.ratio >= 3 ? "text-emerald-600" : m.ratio >= 1 ? "text-amber-600" : "text-red-600"
                  )}>
                    {m.ratio.toFixed(1)}x
                  </td>
                  <td className="text-right py-2 pl-3 text-foreground">{m.cumulativeCustomers.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1">
          {report.cacLtvProjection.assumptions.map((a, i) => (
            <p key={i} className="text-xs text-muted-foreground">• {a}</p>
          ))}
        </div>
      </Section>

      {/* Alternatives */}
      {report.alternativeIdeas?.length > 0 && (
        <Section icon={Lightbulb} title="Alternative Ideas to Consider">
          <div className="space-y-4">
            {report.alternativeIdeas.map((alt, i) => (
              <div key={i} className="p-4 bg-muted/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-sm text-foreground">{alt.title}</h5>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {alt.successProbability}% success
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alt.description}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                  {alt.whyBetter}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  onSelect,
  onDelete,
  selected,
}: {
  idea: IdeaRecord;
  onSelect: (idea: IdeaRecord) => void;
  onDelete: (id: number) => void;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "border rounded-xl p-4 cursor-pointer transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"
      )}
      onClick={() => onSelect(idea)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {idea.status === "complete" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : idea.status === "error" ? (
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground truncate">{idea.title}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
          {idea.successProbability != null && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                Success: <strong className="text-primary">{idea.successProbability}%</strong>
              </span>
              {idea.confidenceScore != null && (
                <span className="text-xs text-muted-foreground">
                  Confidence: <strong className="text-amber-500">{idea.confidenceScore}%</strong>
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IdeaValidatorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"form" | "report">("form");
  const [selectedIdea, setSelectedIdea] = useState<IdeaRecord | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    targetCustomer: "",
    revenueModel: "",
    stage: "idea",
  });

  const { data: ideas = [], isLoading: loadingIdeas } = useQuery({
    queryKey: ["ideas"],
    queryFn: listIdeas,
  });

  const analyzeMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setSelectedIdea(data);
      setView("report");
      setForm({ title: "", description: "", targetCustomer: "", revenueModel: "", stage: "idea" });
    },
    onError: (err: Error) => {
      toast({
        title: "Analysis failed",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIdea,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      if (selectedIdea?.id === id) {
        setSelectedIdea(null);
        setView("form");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    analyzeMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      targetCustomer: form.targetCustomer.trim() || undefined,
      revenueModel: form.revenueModel.trim() || undefined,
      stage: form.stage || undefined,
    });
  };

  const isLoading = analyzeMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-3 text-primary">
          <Lightbulb className="w-6 h-6" />
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">
          Idea Validator
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Get a senior VC-level analysis of your business idea — invisible competition, failure pre-mortem,
          TAM calculation, and 12-month CAC/LTV projections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form + history */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => { setView("form"); setSelectedIdea(null); }}
              className="w-full flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Analyze New Idea
            </button>

            {loadingIdeas ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No analyses yet. Submit your first idea!
              </div>
            ) : (
              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground px-1 mb-2">Past Analyses</p>
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    selected={selectedIdea?.id === idea.id && view === "report"}
                    onSelect={(i) => { setSelectedIdea(i); setView("report"); }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: form or report */}
        <div className="lg:col-span-2">
          {view === "form" || !selectedIdea ? (
            <div className="border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Submit Your Idea
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Idea Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., AI-powered lease negotiation tool"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Describe Your Idea <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does it do? What problem does it solve? Include as much detail as possible for a sharper analysis."
                    rows={4}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" /> Target Customer
                    </label>
                    <Input
                      value={form.targetCustomer}
                      onChange={(e) => setForm({ ...form, targetCustomer: e.target.value })}
                      placeholder="e.g., SMB owners, 30-50 yr olds"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> Revenue Model
                    </label>
                    <Input
                      value={form.revenueModel}
                      onChange={(e) => setForm({ ...form, revenueModel: e.target.value })}
                      placeholder="e.g., SaaS subscription, $49/mo"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Stage</label>
                  <div className="flex flex-wrap gap-2">
                    {["idea", "mvp", "early revenue", "scaling"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, stage: s })}
                        disabled={isLoading}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize",
                          form.stage === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing — this takes ~20 seconds…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Run Full VC Analysis
                    </>
                  )}
                </Button>

                {isLoading && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Analysis in progress…</p>
                    {[
                      "Scanning competitive landscape",
                      "Running failure pre-mortem",
                      "Calculating TAM bottom-up",
                      "Projecting 12-month CAC/LTV",
                      "Generating confidence score",
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedIdea.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedIdea.description}</p>
                </div>
              </div>
              {selectedIdea.report ? (
                <ReportView report={selectedIdea.report} idea={selectedIdea} />
              ) : (
                <div className="border border-border rounded-xl p-8 text-center">
                  <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Analysis failed. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
