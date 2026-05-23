import { useState, useRef } from "react";
import { useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo, useTaskBreakdown } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2, Calendar, X, ChevronDown, Flag, Sparkles, BookOpen, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday, isPast, isFuture, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low" | "none";
type Filter = "all" | "active" | "completed" | "overdue";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-red-600",    dot: "bg-red-500" },
  medium: { label: "Medium", color: "text-amber-600",  dot: "bg-amber-400" },
  low:    { label: "Low",    color: "text-blue-500",   dot: "bg-blue-400" },
  none:   { label: "None",   color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "active",    label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "overdue",   label: "Overdue" },
];

type TodoItem = {
  id: number; text: string; notes?: string | null; dueDate?: string | null;
  completed: boolean; completedAt?: string | null; priority?: string | null;
  category?: string | null; createdAt: string; updatedAt: string;
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("active");
  const [showForm, setShowForm] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState<Record<number, string>>({});
  const [editDue, setEditDue] = useState<Record<number, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [breakdownTask, setBreakdownTask] = useState<TodoItem | null>(null);
  const [breakdownResult, setBreakdownResult] = useState<{
    steps: { text: string; estimatedMinutes: number }[];
    scripture: { reference: string; text: string };
    encouragement: string;
  } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const { data: todos = [], isLoading } = useListTodos();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const del = useDeleteTodo();
  const taskBreakdown = useTaskBreakdown();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/todos"] });

  const today = startOfToday();

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    create.mutate({ data: { text } }, {
      onSuccess: () => { invalidate(); setQuickText(""); },
      onError: () => toast({ title: "Couldn't add task", variant: "destructive" }),
    });
  };

  const handleToggle = (todo: TodoItem) => {
    const now = new Date().toISOString().slice(0, 10);
    update.mutate({ id: todo.id, data: { completed: !todo.completed, completedAt: !todo.completed ? now : null } }, {
      onSuccess: () => invalidate(),
    });
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, { onSuccess: () => { invalidate(); setExpandedId(null); } });
  };

  const handlePriority = (id: number, priority: Priority) => {
    update.mutate({ id, data: { priority } }, { onSuccess: () => invalidate() });
  };

  const handleBreakdown = (todo: TodoItem) => {
    setBreakdownTask(todo);
    setBreakdownResult(null);
    setBreakdownLoading(true);
    taskBreakdown.mutate({ data: { task: todo.text } }, {
      onSuccess: (data) => { setBreakdownResult(data); setBreakdownLoading(false); },
      onError: () => { setBreakdownLoading(false); toast({ title: "Reginald couldn't connect. Try again.", variant: "destructive" }); },
    });
  };

  const handleSaveDetails = (todo: TodoItem) => {
    const updates: Record<string, unknown> = {};
    if (editNotes[todo.id] !== undefined) updates.notes = editNotes[todo.id] || null;
    if (editDue[todo.id] !== undefined) updates.dueDate = editDue[todo.id] || null;
    if (Object.keys(updates).length === 0) return;
    update.mutate({ id: todo.id, data: updates }, {
      onSuccess: () => { invalidate(); setEditNotes(n => { const c = { ...n }; delete c[todo.id]; return c; }); setEditDue(d => { const c = { ...d }; delete c[todo.id]; return c; }); },
    });
  };

  const filtered = (todos as TodoItem[]).filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return !t.completed && !!t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate));
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const order: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
    const pa = order[a.priority ?? "none"] ?? 3;
    const pb = order[b.priority ?? "none"] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const overdueCount = (todos as TodoItem[]).filter(t =>
    !t.completed && !!t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
  ).length;

  const getDueDateLabel = (dueDate: string) => {
    const d = parseISO(dueDate);
    if (isToday(d)) return { label: "Today", color: "text-amber-600" };
    if (isPast(d)) return { label: `Overdue · ${format(d, "MMM d")}`, color: "text-red-600" };
    return { label: format(d, "MMM d"), color: isFuture(d) && d <= new Date(today.getTime() + 2*86400000) ? "text-amber-500" : "text-muted-foreground" };
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Task List</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">
              {(todos as TodoItem[]).filter(t => !t.completed).length} active · {overdueCount > 0 && <span className="text-red-600">{overdueCount} overdue · </span>}{(todos as TodoItem[]).filter(t => t.completed).length} done
            </p>
          </div>
        </div>
      </header>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <Input
          ref={inputRef}
          value={quickText}
          onChange={e => setQuickText(e.target.value)}
          placeholder="Add a task… press Enter to save"
          className="flex-1"
        />
        <Button type="submit" disabled={!quickText.trim() || create.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </form>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            )}>
            {f.label}
            {f.value === "overdue" && overdueCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{overdueCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="journal-page p-10 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-primary/30 mx-auto" />
          <p className="font-serif text-muted-foreground">
            {filter === "active" ? "No active tasks — you're clear!" : filter === "overdue" ? "No overdue tasks 🙌" : "Nothing here yet"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map(todo => {
            const priority = (todo.priority ?? "none") as Priority;
            const pc = PRIORITY_CONFIG[priority];
            const isExpanded = expandedId === todo.id;
            const due = todo.dueDate ? getDueDateLabel(todo.dueDate) : null;

            return (
              <li key={todo.id} className="journal-page overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(todo)}
                    className={cn(
                      "w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                      todo.completed ? "bg-primary border-primary" : "border-border hover:border-primary/60"
                    )}
                  >
                    {todo.completed && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                  </button>

                  {/* Text */}
                  <span className={cn("flex-1 text-sm leading-snug", todo.completed && "line-through text-muted-foreground")}>
                    {todo.text}
                  </span>

                  {/* Priority dot */}
                  {priority !== "none" && (
                    <span className={cn("w-2 h-2 rounded-full shrink-0", pc.dot)} title={pc.label} />
                  )}

                  {/* Due date chip */}
                  {due && (
                    <span className={cn("text-[11px] shrink-0", due.color)}>{due.label}</span>
                  )}

                  {/* Reginald breakdown */}
                  {!todo.completed && (
                    <button
                      onClick={() => handleBreakdown(todo)}
                      title="Ask Reginald to break this down"
                      className="text-primary/40 hover:text-primary transition-colors shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Expand */}
                  <button onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border/40 p-3 space-y-3 bg-muted/20 animate-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Due date</label>
                        <Input type="date" value={editDue[todo.id] ?? todo.dueDate ?? ""}
                          onChange={e => setEditDue(d => ({ ...d, [todo.id]: e.target.value }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</label>
                        <div className="flex gap-1.5">
                          {(["high", "medium", "low", "none"] as Priority[]).map(p => (
                            <button key={p} onClick={() => handlePriority(todo.id, p)}
                              className={cn("w-2 h-2 rounded-full transition-all hover:scale-125",
                                PRIORITY_CONFIG[p].dot,
                                priority === p ? "ring-2 ring-offset-1 ring-current scale-125" : ""
                              )} title={PRIORITY_CONFIG[p].label} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</label>
                      <Textarea value={editNotes[todo.id] ?? todo.notes ?? ""}
                        onChange={e => setEditNotes(n => ({ ...n, [todo.id]: e.target.value }))}
                        placeholder="Add notes…" className="min-h-[60px] resize-none text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveDetails(todo)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(todo.id)} className="text-destructive hover:text-destructive h-7 text-xs">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)} className="h-7 text-xs ml-auto">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {/* Reginald Task Breakdown Modal */}
      <Dialog open={!!breakdownTask} onOpenChange={(open) => { if (!open) { setBreakdownTask(null); setBreakdownResult(null); } }}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg font-semibold text-foreground">Reginald's Breakdown</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {breakdownTask?.text}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {breakdownLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm font-serif italic">Reginald is thinking…</p>
            </div>
          ) : breakdownResult ? (
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Your Steps</p>
                <ol className="space-y-2">
                  {breakdownResult.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{step.text}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[10px] text-muted-foreground">{step.estimatedMinutes} min</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider">{breakdownResult.scripture.reference}</span>
                </div>
                <p className="font-serif italic text-sm text-foreground/80 leading-relaxed">"{breakdownResult.scripture.text}"</p>
              </div>

              <div className="border-l-2 border-primary/40 pl-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reginald says</p>
                <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">{breakdownResult.encouragement}</p>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => { setBreakdownTask(null); setBreakdownResult(null); }}
              >
                I'm Ready — Let's Do This
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
