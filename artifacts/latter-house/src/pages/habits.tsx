import { useState } from "react";
import { useListHabits, useCreateHabit, useUpdateHabit, useDeleteHabit, useListHabitLogs, useLogHabit, useDeleteHabitLog } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Flame, Plus, Trash2, Check, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, isToday, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";

const HABIT_EMOJIS = ["🙏", "📖", "💪", "🏃", "💧", "🌿", "✝️", "🌅", "🎯", "💡", "❤️", "🧘"];
const HABIT_COLORS = [
  { value: "primary",  label: "Gold",   cls: "bg-primary/20 text-primary border-primary/30" },
  { value: "green",    label: "Sage",   cls: "bg-green-100 text-green-700 border-green-200" },
  { value: "blue",     label: "Blue",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "purple",   label: "Purple", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "rose",     label: "Rose",   cls: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "amber",    label: "Amber",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
];

type Habit = { id: number; name: string; description?: string | null; emoji?: string | null; color?: string | null; category?: string | null; frequency: string; active: boolean; createdAt: string };
type HabitLog = { id: number; habitId: number; date: string; completed: boolean; note?: string | null; createdAt: string };

type HabitForm = { name: string; description: string; emoji: string; color: string; category: string; frequency: "daily" | "weekly" };
const emptyForm = (): HabitForm => ({ name: "", description: "", emoji: "🙏", color: "primary", category: "", frequency: "daily" });

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = startOfToday();
  const currentMonth = format(today, "yyyy-MM");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HabitForm>(emptyForm());
  const [showInactive, setShowInactive] = useState(false);

  const { data: habits = [], isLoading: habitsLoading } = useListHabits();
  const { data: logs = [] } = useListHabitLogs({ month: currentMonth });
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const del = useDeleteHabit();
  const logHabit = useLogHabit();
  const removeLog = useDeleteHabitLog();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    queryClient.invalidateQueries({ queryKey: [`/api/habits/logs`] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      description: form.description.trim() || null,
      emoji: form.emoji,
      color: form.color,
      category: form.category.trim() || null,
      frequency: form.frequency,
    };
    if (editingId !== null) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidateAll(); setShowForm(false); setEditingId(null); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't update habit", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { invalidateAll(); setShowForm(false); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't create habit", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (h: Habit) => {
    setForm({ name: h.name, description: h.description ?? "", emoji: h.emoji ?? "🙏", color: h.color ?? "primary", category: h.category ?? "", frequency: (h.frequency as "daily" | "weekly") ?? "daily" });
    setEditingId(h.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, { onSuccess: () => invalidateAll() });
  };

  const handleToggleActive = (h: Habit) => {
    update.mutate({ id: h.id, data: { active: !h.active } }, { onSuccess: () => invalidateAll() });
  };

  const handleToggleDay = (habit: Habit, date: string) => {
    const isLogged = (logs as HabitLog[]).some(l => l.habitId === habit.id && l.date === date);
    if (isLogged) {
      removeLog.mutate({ id: habit.id, date }, { onSuccess: () => invalidateAll() });
    } else {
      logHabit.mutate({ id: habit.id, data: { date } }, { onSuccess: () => invalidateAll() });
    }
  };

  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const todayStr = format(today, "yyyy-MM-dd");

  const getColorCls = (color: string | null | undefined) =>
    HABIT_COLORS.find(c => c.value === color)?.cls ?? HABIT_COLORS[0].cls;

  const getStreak = (habitId: number) => {
    const habitLogs = new Set((logs as HabitLog[]).filter(l => l.habitId === habitId && l.completed).map(l => l.date));
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const ds = format(d, "yyyy-MM-dd");
      if (!habitLogs.has(ds)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const activeHabits = (habits as Habit[]).filter(h => h.active);
  const inactiveHabits = (habits as Habit[]).filter(h => !h.active);
  const completedToday = activeHabits.filter(h => (logs as HabitLog[]).some(l => l.habitId === h.id && l.date === todayStr));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Flame className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Habit Tracker</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">
              {completedToday.length} of {activeHabits.length} habits done today · {format(today, "MMMM yyyy")}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Habit
          </Button>
        )}
      </header>

      {/* Form */}
      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium">{editingId !== null ? "Edit Habit" : "New Habit"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Habit name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Daily Bible reading" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_EMOJIS.map(em => (
                  <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all",
                      form.emoji === em ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    )}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Color</label>
              <div className="flex gap-2">
                {HABIT_COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all", c.cls,
                      form.color === c.value ? "ring-2 ring-offset-1 ring-primary scale-110" : ""
                    )} title={c.label} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category (optional)</label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Spiritual" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Frequency</label>
                <div className="flex gap-2 mt-1">
                  {(["daily", "weekly"] as const).map(freq => (
                    <button key={freq} type="button" onClick={() => setForm(f => ({ ...f, frequency: freq }))}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",
                        form.frequency === freq ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                      )}>
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={!form.name.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="w-4 h-4 mr-2" /> {editingId !== null ? "Save" : "Add Habit"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {habitsLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : activeHabits.length === 0 && !showForm ? (
        <div className="journal-page p-10 text-center space-y-2">
          <Flame className="w-8 h-8 text-primary/30 mx-auto" />
          <p className="font-serif text-muted-foreground">No habits yet</p>
          <p className="text-xs text-muted-foreground/60">Build daily disciplines that transform your life</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Month calendar grid per habit */}
          {activeHabits.map(habit => {
            const habitLogs = new Set((logs as HabitLog[]).filter(l => l.habitId === habit.id && l.completed).map(l => l.date));
            const streak = getStreak(habit.id);
            const colorCls = getColorCls(habit.color);
            const monthTotal = monthDays.filter(d => !isFuture(d) || isToday(d)).length;
            const done = monthDays.filter(d => habitLogs.has(format(d, "yyyy-MM-dd"))).length;

            return (
              <div key={habit.id} className="journal-page p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{habit.emoji ?? "🙏"}</span>
                    <div className="min-w-0">
                      <h3 className="font-serif font-medium text-foreground text-base">{habit.name}</h3>
                      {habit.description && <p className="text-xs text-muted-foreground truncate">{habit.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {streak > 0 && (
                      <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                        🔥 {streak}d
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{done}/{monthTotal}</span>
                    <button onClick={() => handleEdit(habit)} className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(habit.id)} className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day grid */}
                <div className="flex flex-wrap gap-1">
                  {monthDays.map(day => {
                    const ds = format(day, "yyyy-MM-dd");
                    const isLogged = habitLogs.has(ds);
                    const isTodayDay = isToday(day);
                    const future = isFuture(day) && !isTodayDay;

                    return (
                      <button
                        key={ds}
                        onClick={() => !future && handleToggleDay(habit, ds)}
                        disabled={future}
                        title={format(day, "MMM d")}
                        className={cn(
                          "w-7 h-7 rounded text-[10px] font-medium transition-all border",
                          isLogged
                            ? cn(colorCls, "border-transparent")
                            : isTodayDay
                            ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/15"
                            : future
                            ? "border-border/30 text-muted-foreground/30 cursor-default"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Inactive habits */}
          {inactiveHabits.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setShowInactive(s => !s)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1">
                {showInactive ? "Hide" : "Show"} {inactiveHabits.length} paused habit{inactiveHabits.length !== 1 ? "s" : ""}
              </button>
              {showInactive && inactiveHabits.map(h => (
                <div key={h.id} className="journal-page p-3 opacity-50 flex items-center gap-3">
                  <span>{h.emoji ?? "🙏"}</span>
                  <span className="text-sm text-muted-foreground flex-1">{h.name}</span>
                  <button onClick={() => handleToggleActive(h)} className="text-xs text-primary hover:text-primary/80">Resume</button>
                  <button onClick={() => handleDelete(h.id)} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
