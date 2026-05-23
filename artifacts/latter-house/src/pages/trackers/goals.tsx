import { useState } from "react";
import {
  useListGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Target, Pencil, X, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type GoalCategory = "spiritual" | "personal" | "health" | "business" | "family" | "kingdom";

const CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: "spiritual", label: "Spiritual", color: "bg-purple-100 text-purple-700" },
  { value: "personal", label: "Personal", color: "bg-blue-100 text-blue-700" },
  { value: "health", label: "Health", color: "bg-green-100 text-green-700" },
  { value: "business", label: "Business", color: "bg-amber-100 text-amber-700" },
  { value: "family", label: "Family", color: "bg-pink-100 text-pink-700" },
  { value: "kingdom", label: "Kingdom", color: "bg-primary/10 text-primary" },
];

type GoalForm = {
  title: string;
  description: string;
  category: GoalCategory | "";
  targetDate: string;
  milestones: string;
};

const emptyForm = (): GoalForm => ({
  title: "",
  description: "",
  category: "",
  targetDate: "",
  milestones: "",
});

export default function GoalsTracker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [filterCategory, setFilterCategory] = useState<GoalCategory | "all">("all");

  const { data: goals, isLoading } = useListGoals();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const del = useDeleteGoal();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listGoals"] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      targetDate: form.targetDate || null,
      milestones: form.milestones ? JSON.stringify(form.milestones.split("\n").filter(Boolean)) : null,
    };

    if (editingId !== null) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't update goal", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't add goal", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (goal: NonNullable<typeof goals>[number]) => {
    let milestonesText = "";
    if (goal.milestones) {
      try {
        const arr = JSON.parse(goal.milestones);
        if (Array.isArray(arr)) milestonesText = arr.join("\n");
      } catch { milestonesText = goal.milestones; }
    }
    setForm({
      title: goal.title,
      description: goal.description ?? "",
      category: (goal.category as GoalCategory) ?? "",
      targetDate: goal.targetDate ?? "",
      milestones: milestonesText,
    });
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleProgressUpdate = (id: number, progress: string) => {
    update.mutate({ id, data: { progress } }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't update progress", variant: "destructive" }),
    });
  };

  const handleToggleComplete = (goal: NonNullable<typeof goals>[number]) => {
    update.mutate({ id: goal.id, data: { completed: !goal.completed, progress: !goal.completed ? "100" : goal.progress } }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't update goal", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't delete goal", variant: "destructive" }),
    });
  };

  const filteredGoals = goals?.filter(g =>
    filterCategory === "all" || g.category === filterCategory
  ) ?? [];

  const activeGoals = filteredGoals.filter(g => !g.completed);
  const completedGoals = filteredGoals.filter(g => g.completed);

  const getCategoryConfig = (cat: string | null) =>
    CATEGORIES.find(c => c.value === cat) ?? { label: cat ?? "General", color: "bg-muted text-muted-foreground" };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Goal Tracker</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">Pursue the calling God has placed on your life</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Goal
          </Button>
        )}
      </header>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            filterCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          All Goals
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filterCategory === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium text-foreground">
            {editingId !== null ? "Edit Goal" : "New Goal"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Goal Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What do you want to accomplish?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: f.category === cat.value ? "" : cat.value }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        form.category === cat.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Target Date</label>
                <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Description / Why This Matters</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Why is this goal important to you? How does it align with who God is calling you to be?" className="min-h-[80px] resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Milestones (one per line)</label>
              <Textarea value={form.milestones} onChange={e => setForm(f => ({ ...f, milestones: e.target.value }))} placeholder="Step 1: Research and pray&#10;Step 2: Take first action&#10;Step 3: ..." className="min-h-[80px] resize-none font-mono text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!form.title.trim() || create.isPending || update.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {(create.isPending || update.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {editingId !== null ? "Save Changes" : "Add Goal"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="space-y-8">
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-primary font-medium flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Active Goals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} getCategoryConfig={getCategoryConfig} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} onProgressUpdate={handleProgressUpdate} />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-2">
                <Star className="w-3.5 h-3.5" /> Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {completedGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} getCategoryConfig={getCategoryConfig} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} onProgressUpdate={handleProgressUpdate} />
                ))}
              </div>
            </div>
          )}

          {filteredGoals.length === 0 && (
            <div className="journal-page p-12 text-center space-y-3">
              <Target className="w-10 h-10 text-primary/30 mx-auto" />
              <p className="font-serif text-lg text-muted-foreground">No goals yet</p>
              <p className="text-sm text-muted-foreground/60">Set goals that align with who God is calling you to become</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type GoalItem = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  progress: string;
  completed: boolean;
  milestones?: string | null;
  createdAt: string;
  updatedAt: string;
};

function GoalCard({ goal, getCategoryConfig, onEdit, onDelete, onToggle, onProgressUpdate }: {
  goal: GoalItem;
  getCategoryConfig: (cat: string | null) => { label: string; color: string };
  onEdit: (g: GoalItem) => void;
  onDelete: (id: number) => void;
  onToggle: (g: GoalItem) => void;
  onProgressUpdate: (id: number, progress: string) => void;
}) {
  const progress = parseInt(goal.progress) || 0;
  const catConfig = getCategoryConfig(goal.category ?? null);

  let milestones: string[] = [];
  if (goal.milestones) {
    try {
      const parsed = JSON.parse(goal.milestones);
      if (Array.isArray(parsed)) milestones = parsed;
    } catch { milestones = [goal.milestones]; }
  }

  return (
    <div className="journal-page p-5 space-y-3 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {goal.category && (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1.5 ${catConfig.color}`}>
              {catConfig.label}
            </span>
          )}
          <h3 className={`font-serif text-base font-medium ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {goal.title}
          </h3>
          {goal.targetDate && (
            <p className="text-xs text-muted-foreground mt-0.5">Target: {goal.targetDate}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title={goal.completed ? "Mark incomplete" : "Mark complete"} onClick={() => onToggle(goal)}>
            <Check className={`h-3.5 w-3.5 ${goal.completed ? 'text-primary' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(goal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {goal.description && (
        <p className="text-xs text-muted-foreground leading-relaxed font-serif italic">{goal.description}</p>
      )}

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!goal.completed && (
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={e => onProgressUpdate(goal.id, e.target.value)}
            className="w-full h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
        )}
      </div>

      {milestones.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Milestones</p>
          <ul className="space-y-0.5">
            {milestones.map((m, i) => (
              <li key={i} className="text-xs text-foreground/70 flex gap-1.5">
                <span className="text-primary">•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
