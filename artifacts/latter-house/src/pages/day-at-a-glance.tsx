import { useState, useEffect } from "react";
import { format, addDays, subDays, parseISO, isToday as isTodayFn } from "date-fns";
import { useLocation, useParams, Link } from "wouter";
import {
  useListPlannerEntries,
  useCreatePlannerEntry,
  useUpdatePlannerEntry,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListPlannerEntriesQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ChevronDown, ScrollText, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const timeSlots = Array.from({ length: 18 }, (_, i) => {
  const hour = i + 5;
  return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "pm" : "am"}`;
});
const SCHEDULE_PREVIEW = 6;

export default function DayAtAGlance() {
  const params = useParams<{ date?: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(() => params.date ?? todayStr);
  const [newTaskText, setNewTaskText] = useState("");
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  useEffect(() => { if (params.date) setDate(params.date); }, [params.date]);

  const { data: entries, isLoading: entriesLoading } = useListPlannerEntries(
    { date, view: "day" },
    { query: { queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) } }
  );
  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    { date },
    { query: { queryKey: getListTasksQueryKey({ date }) } }
  );

  const createEntry = useCreatePlannerEntry();
  const updateEntry = useUpdatePlannerEntry();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const priorities = entries?.filter(e => e.section === "priorities") ?? [];
  const scheduleEntries = entries?.filter(e => e.section === "schedule") ?? [];
  const notesEntry = entries?.find(e => e.section === "notes");

  const slotsToShow = scheduleExpanded ? timeSlots : timeSlots.slice(0, SCHEDULE_PREVIEW);

  const handlePriorityBlur = (slotIndex: string, content: string, existingId?: number, existingCategory?: string | null) => {
    if (!content.trim() && !existingId) return;
    if (existingId) {
      updateEntry.mutate(
        { id: existingId, data: { content, section: "priorities", timeSlot: slotIndex, category: existingCategory ?? "" } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    } else if (content.trim()) {
      createEntry.mutate(
        { data: { date, content, section: "priorities", timeSlot: slotIndex } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    }
  };

  const handlePriorityCheck = (existingId: number | undefined, slotIndex: string, currentContent: string, isChecked: boolean) => {
    const category = isChecked ? "done" : "";
    if (existingId) {
      updateEntry.mutate(
        { id: existingId, data: { content: currentContent, section: "priorities", timeSlot: slotIndex, category } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    } else if (currentContent.trim()) {
      createEntry.mutate(
        { data: { date, content: currentContent, section: "priorities", timeSlot: slotIndex, category } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    }
  };

  const handleScheduleBlur = (slot: string, content: string, existingId?: number) => {
    if (!content.trim() && !existingId) return;
    if (existingId) {
      updateEntry.mutate(
        { id: existingId, data: { content, section: "schedule", timeSlot: slot } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    } else if (content.trim()) {
      createEntry.mutate(
        { data: { date, content, section: "schedule", timeSlot: slot } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    }
  };

  const handleNotesBlur = (content: string) => {
    if (!content.trim() && !notesEntry) return;
    if (notesEntry) {
      updateEntry.mutate(
        { id: notesEntry.id, data: { content, section: "notes" } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    } else if (content.trim()) {
      createEntry.mutate(
        { data: { date, content, section: "notes" } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) }) }
      );
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    createTask.mutate(
      { data: { date, text: newTaskText, recurring: false, recurringFrequency: "none" } },
      {
        onSuccess: () => {
          setNewTaskText("");
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
          toast({ title: "Task added" });
        },
      }
    );
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate(
      { id, data: { completed } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) }) }
    );
  };

  const handleDeleteTask = (id: number) => {
    deleteTask.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) }) }
    );
  };

  const goToPrevDay = () => {
    const prev = format(subDays(parseISO(date), 1), "yyyy-MM-dd");
    setDate(prev);
    setLocation(prev === todayStr ? "/" : `/day/${prev}`);
  };
  const goToNextDay = () => {
    const next = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
    setDate(next);
    setLocation(next === todayStr ? "/" : `/day/${next}`);
  };
  const goToToday = () => { setDate(todayStr); setLocation("/"); };

  if (entriesLoading || tasksLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5 animate-in fade-in duration-500 pb-28">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={goToPrevDay} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="px-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium leading-none mb-0.5">
              {format(parseISO(date), "EEEE · MMMM d, yyyy")}
            </p>
            <h1 className="font-serif text-2xl font-semibold text-foreground leading-tight">Day at a Glance</h1>
          </div>
          <button onClick={goToNextDay} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        {!isTodayFn(parseISO(date)) && (
          <button onClick={goToToday} className="text-[11px] text-primary border border-primary/25 rounded-full px-3 py-1 hover:bg-primary/5 transition-colors shrink-0">
            Back to Today
          </button>
        )}
      </div>

      {/* ── Top Priorities ── */}
      <section className="journal-page p-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-primary/70">Top Priorities</h2>
        <div className="space-y-2.5">
          {[1, 2, 3].map((slot) => {
            const entry = priorities.find(e => e.timeSlot === String(slot));
            const isDone = entry?.category === "done";
            return (
              <div key={slot} className="flex items-center gap-3">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={(checked) =>
                    handlePriorityCheck(entry?.id, String(slot), entry?.content ?? "", checked as boolean)
                  }
                  className="shrink-0"
                />
                <Input
                  key={`${date}-priority-${slot}`}
                  defaultValue={entry?.content ?? ""}
                  onBlur={(e) => handlePriorityBlur(String(slot), e.target.value, entry?.id, entry?.category)}
                  placeholder={`Priority ${slot}...`}
                  className={`h-9 border-border/40 bg-background/60 text-sm ${isDone ? "line-through text-muted-foreground/40" : "text-foreground/90"}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Tasks ── */}
      <section className="journal-page p-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-primary/70">Tasks for Today</h2>
        {tasks && tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map(task => (
              <li key={task.id} className="flex items-center gap-3 group py-0.5">
                <Checkbox
                  checked={task.completed ?? false}
                  onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                  className="shrink-0"
                />
                <span className={`flex-1 text-sm leading-snug ${task.completed ? "line-through text-muted-foreground/45" : "text-foreground/85"}`}>
                  {task.text}
                </span>
                {task.recurring && (
                  <Repeat2 className="w-3 h-3 text-muted-foreground/35 shrink-0" />
                )}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">No tasks yet — add one below.</p>
        )}
        <form onSubmit={handleAddTask} className="flex gap-2 pt-1 border-t border-border/30">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a task..."
            className="h-9 border-border/40 bg-background/60 text-sm text-foreground/90 placeholder:text-muted-foreground/45"
          />
          <Button type="submit" size="sm" disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-9">
            {createTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </form>
      </section>

      {/* ── Schedule ── */}
      <section className="journal-page p-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-primary/70">Schedule</h2>
        <div className="space-y-1.5">
          {slotsToShow.map(slot => {
            const entry = scheduleEntries.find(e => e.timeSlot === slot);
            return (
              <div key={slot} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground/55 font-mono w-9 shrink-0 text-right leading-none">{slot}</span>
                <Input
                  key={`${date}-sched-${slot}`}
                  defaultValue={entry?.content ?? ""}
                  onBlur={(e) => handleScheduleBlur(slot, e.target.value, entry?.id)}
                  placeholder="—"
                  className="h-8 border-border/30 bg-background/50 text-sm text-foreground/85 placeholder:text-muted-foreground/25"
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setScheduleExpanded(o => !o)}
          className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${scheduleExpanded ? "rotate-180" : ""}`} />
          {scheduleExpanded ? "Show fewer time slots" : `Show all ${timeSlots.length} time slots`}
        </button>
      </section>

      {/* ── Notes ── */}
      <section className="journal-page p-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest font-semibold text-primary/70">Notes</h2>
        <Textarea
          key={`${date}-notes`}
          defaultValue={notesEntry?.content ?? ""}
          onBlur={(e) => handleNotesBlur(e.target.value)}
          placeholder="Notes, reminders, or thoughts for today..."
          className="min-h-[130px] resize-none border-border/40 bg-background/60 text-sm text-foreground/90 placeholder:text-muted-foreground/45"
        />
      </section>

      {/* ── Link to Declarations ── */}
      <div className="flex justify-center pt-1 pb-2">
        <Link href={`/planner/${date}`}>
          <Button variant="outline" className="border-primary/25 text-primary hover:bg-primary/5 gap-2 text-sm">
            <ScrollText className="w-4 h-4" />
            Declarations & Reflection
          </Button>
        </Link>
      </div>

    </div>
  );
}
