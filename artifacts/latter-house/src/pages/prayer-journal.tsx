import { useState } from "react";
import { useListPrayers, useCreatePrayer, useUpdatePrayer, useDeletePrayer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BookHeart, Plus, Trash2, Check, X, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Category = "request" | "praise" | "intercession" | "thanksgiving" | "confession";
type Filter = "all" | "unanswered" | "answered";

const CATEGORIES: { value: Category; label: string; emoji: string; color: string }[] = [
  { value: "request",      label: "Request",      emoji: "🙏", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "praise",       label: "Praise",       emoji: "🌟", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "intercession", label: "Intercession", emoji: "💜", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "thanksgiving", label: "Thanksgiving", emoji: "🌿", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "confession",   label: "Confession",   emoji: "✝️", color: "bg-primary/5 text-primary border-primary/20" },
];

type PrayerEntry = {
  id: number; date: string; title?: string | null; body: string;
  category?: string | null; answered: boolean; answeredDate?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
};

type PrayerForm = { date: string; title: string; body: string; category: Category; notes: string };
const emptyForm = (): PrayerForm => ({
  date: new Date().toISOString().slice(0, 10), title: "", body: "", category: "request", notes: "",
});

export default function PrayerJournalPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PrayerForm>(emptyForm());
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: prayers = [], isLoading } = useListPrayers();
  const create = useCreatePrayer();
  const update = useUpdatePrayer();
  const del = useDeletePrayer();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/prayers"] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) return;
    const payload = {
      date: form.date,
      title: form.title.trim() || null,
      body: form.body,
      category: form.category,
      notes: form.notes.trim() || null,
    };
    if (editingId !== null) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't update entry", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't save prayer", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (p: PrayerEntry) => {
    setForm({ date: p.date, title: p.title ?? "", body: p.body, category: (p.category as Category) ?? "request", notes: p.notes ?? "" });
    setEditingId(p.id);
    setShowForm(true);
    setExpandedId(null);
  };

  const handleToggleAnswered = (p: PrayerEntry) => {
    const now = new Date().toISOString().slice(0, 10);
    update.mutate({ id: p.id, data: { answered: !p.answered, answeredDate: !p.answered ? now : null } }, {
      onSuccess: () => invalidate(),
    });
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, { onSuccess: () => { invalidate(); setExpandedId(null); } });
  };

  const getCat = (cat: string | null | undefined) =>
    CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[0];

  const filtered = (prayers as PrayerEntry[]).filter(p => {
    if (filter === "answered") return p.answered;
    if (filter === "unanswered") return !p.answered;
    return true;
  });

  const answeredCount = (prayers as PrayerEntry[]).filter(p => p.answered).length;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <BookHeart className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Prayer Journal</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">
              {(prayers as PrayerEntry[]).length} entries · {answeredCount} answered 🙌
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> New Prayer Entry
          </Button>
        )}
      </header>

      {/* Form */}
      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium text-foreground">
            {editingId !== null ? "Edit Entry" : "New Prayer Entry"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Title (optional)</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Healing for Mom" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      form.category === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    )}>
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Prayer *</label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your prayer here…" className="min-h-[120px] resize-none font-serif" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes / Scripture</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Relevant scripture, context, or follow-up thoughts…" className="min-h-[60px] resize-none text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={!form.body.trim() || create.isPending || update.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="w-4 h-4 mr-2" />
                {editingId !== null ? "Save Changes" : "Save Prayer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Filter */}
      <div className="flex gap-1.5">
        {(["all", "unanswered", "answered"] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border capitalize",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
            )}>
            {f === "answered" ? "✅ Answered" : f === "unanswered" ? "🙏 Active" : "All"}
          </button>
        ))}
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="journal-page p-10 text-center space-y-2">
          <BookHeart className="w-8 h-8 text-primary/30 mx-auto" />
          <p className="font-serif text-muted-foreground">
            {filter === "answered" ? "No answered prayers recorded yet" : "No prayer entries yet"}
          </p>
          <p className="text-xs text-muted-foreground/60">Your conversations with God, written down</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(prayer => {
            const cat = getCat(prayer.category);
            const isExpanded = expandedId === prayer.id;

            return (
              <li key={prayer.id} className={cn("journal-page overflow-hidden transition-all", prayer.answered && "opacity-75")}>
                <div className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cat.color)}>
                          {cat.emoji} {cat.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{format(new Date(prayer.date + "T12:00:00"), "MMMM d, yyyy")}</span>
                        {prayer.answered && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Answered{prayer.answeredDate ? ` · ${prayer.answeredDate}` : ""}
                          </span>
                        )}
                      </div>
                      {prayer.title && (
                        <h3 className="font-serif text-base font-medium text-foreground mt-1">{prayer.title}</h3>
                      )}
                      <p className={cn("text-sm font-serif text-foreground/80 mt-1 leading-relaxed", !isExpanded && "line-clamp-3")}>
                        {prayer.body}
                      </p>
                      {prayer.notes && isExpanded && (
                        <div className="mt-2 p-3 bg-muted/30 rounded text-xs text-muted-foreground font-serif italic">
                          {prayer.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleToggleAnswered(prayer)} title={prayer.answered ? "Mark unanswered" : "Mark answered"}
                        className={cn("p-1.5 rounded transition-colors", prayer.answered ? "text-green-600 hover:text-green-700" : "text-muted-foreground/50 hover:text-green-600")}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : prayer.id)}
                        className="p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex gap-2 pt-1 border-t border-border/40 animate-in slide-in-from-top-1 duration-150">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(prayer)} className="h-7 text-xs text-muted-foreground hover:text-primary">
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(prayer.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
