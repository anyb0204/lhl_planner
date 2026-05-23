import { useState, useEffect } from "react";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { useLocation, useParams } from "wouter";
import {
  useListPlannerEntries,
  useCreatePlannerEntry,
  useUpdatePlannerEntry,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useGenerateScripture,
  useGenerateEncouragement,
  usePlannerHelp,
  useGenerateTruth,
  getListPlannerEntriesQueryKey,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Sparkles, Heart, Shield, RefreshCw, ChevronDown, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function DailyPlanner() {
  const [, setLocation] = useLocation();
  const params = useParams<{ date?: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState(() => params.date ?? format(new Date(), "yyyy-MM-dd"));

  useEffect(() => { if (params.date) setDate(params.date); }, [params.date]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [newTaskFrequency, setNewTaskFrequency] = useState<"daily" | "weekly">("daily");

  const [callingStatement, setCallingStatement] = useState("");
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [gratitudeExpanded, setGratitudeExpanded] = useState(false);

  const [lieInput, setLieInput] = useState("");
  const [truthResult, setTruthResult] = useState<{
    lie: string;
    scriptureReference: string;
    scriptureText: string;
    affirmation: string;
    reflection: string;
  } | null>(null);

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

  const generateScripture = useGenerateScripture();
  const generateEncouragement = useGenerateEncouragement();
  const plannerHelp = usePlannerHelp();
  const generateTruth = useGenerateTruth();

  const [scripture, setScripture] = useState<{ reference: string; text: string; reflection: string } | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [helpInsights, setHelpInsights] = useState<{ suggestions: string[]; insights: string; prayerFocus?: string | null } | null>(null);

  const handleToggleRecurring = (id: number, recurring: boolean, recurringFrequency: string) => {
    updateTask.mutate({ id, data: { recurring: !recurring, recurringFrequency: !recurring ? recurringFrequency : "none" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) })
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    createTask.mutate({ data: { date: newTaskDate, text: newTaskText, recurring: newTaskRecurring, recurringFrequency: newTaskRecurring ? newTaskFrequency : "none" } }, {
      onSuccess: () => {
        const isToday = newTaskDate === format(new Date(), "yyyy-MM-dd");
        const label = isToday ? "today" : format(new Date(newTaskDate + "T12:00:00"), "MMM d");
        toast({ title: `Task added for ${label}` });
        setNewTaskText("");
        setNewTaskDate(format(new Date(), "yyyy-MM-dd"));
        setNewTaskRecurring(false);
        if (newTaskDate === date) {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
        }
      }
    });
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) })
    });
  };

  const handleDeleteTask = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) })
    });
  };

  const handleEntryBlur = (section: string, content: string, existingId?: number, timeSlot?: string) => {
    if (!content.trim() && !existingId) return;
    if (existingId) {
      updateEntry.mutate({ id: existingId, data: { content, section, timeSlot } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) })
      });
    } else {
      createEntry.mutate({ data: { date, content, section, timeSlot } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPlannerEntriesQueryKey({ date, view: "day" }) })
      });
    }
  };

  const handleRevealTruth = () => {
    if (!lieInput.trim()) return;
    generateTruth.mutate({ data: { lie: lieInput } }, {
      onSuccess: (data) => setTruthResult(data),
      onError: () => toast({
        title: "Couldn't generate truth",
        description: "Please try again in a moment.",
        variant: "destructive",
      }),
    });
  };

  const handleNewTruth = () => {
    setTruthResult(null);
    setLieInput("");
    generateTruth.reset();
  };

  const getEntriesBySection = (section: string) => entries?.filter(e => e.section === section) || [];

  const scheduleEntries = getEntriesBySection("schedule");
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 5;
    return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`;
  });
  const SCHEDULE_PREVIEW = 3;
  const hiddenSlotCount = timeSlots.length - SCHEDULE_PREVIEW;

  const getDailyWord = () => {
    generateScripture.mutate({ data: {} }, {
      onSuccess: (data) => setScripture(data),
      onError: () => toast({ title: "Couldn't fetch scripture", description: "Please try again.", variant: "destructive" }),
    });
  };

  const getEncouragement = () => {
    generateEncouragement.mutate({ data: { view: "day" } }, {
      onSuccess: (data) => setEncouragement(data.message),
      onError: () => toast({ title: "Couldn't fetch encouragement", description: "Please try again.", variant: "destructive" }),
    });
  };

  const getHelp = () => {
    const taskList = tasks?.map(t => t.text).join(", ") || "no tasks yet";
    const scheduleList = scheduleEntries.map(e => `${e.timeSlot}: ${e.content}`).join(", ") || "schedule is empty";
    const context = `Tasks for today: ${taskList}. Schedule: ${scheduleList}.`;
    plannerHelp.mutate({ data: { view: "day", context } }, {
      onSuccess: (data) => setHelpInsights(data),
      onError: () => toast({ title: "Couldn't get planning help", description: "Please try again.", variant: "destructive" }),
    });
  };

  if (entriesLoading || tasksLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  const goToPrevDay = () => {
    const prev = format(subDays(parseISO(date), 1), "yyyy-MM-dd");
    setDate(prev);
    setLocation(`/planner/${prev}`);
  };
  const goToNextDay = () => {
    const next = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
    setDate(next);
    setLocation(`/planner/${next}`);
  };
  const goToToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setDate(today);
    setLocation("/planner");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">

      {/* ── Calling Statement ── */}
      <section className="journal-page p-8 text-center space-y-4 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-center gap-3 mb-1">
          <button onClick={goToPrevDay} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-sans">
            {format(parseISO(date), "EEEE · MMMM d, yyyy")}
          </p>
          <button onClick={goToNextDay} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {!isToday(parseISO(date)) && (
            <button onClick={goToToday} className="text-[10px] uppercase tracking-wide text-primary/60 hover:text-primary border border-primary/20 rounded-full px-2 py-0.5 transition-colors hover:bg-primary/5">
              Today
            </button>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl text-primary leading-tight font-serif">
          I am called to be someone who...
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto font-serif italic leading-relaxed">
          Not who you were — but who God is calling you to become.
          Envision it. Speak it into today.
        </p>
        <Textarea
          value={callingStatement}
          onChange={(e) => setCallingStatement(e.target.value)}
          placeholder="...walk in courage and not fear what lies ahead. Trusting God's timing and taking one faithful step today..."
          className="min-h-[100px] text-center text-base font-serif border-border/50 bg-background/70 text-foreground/90 resize-none placeholder:text-muted-foreground/55 placeholder:italic focus-visible:ring-primary/30 max-w-2xl mx-auto"
        />
        <div className="flex justify-center gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 text-primary hover:bg-primary/5 text-xs"
            onClick={getDailyWord}
            disabled={generateScripture.isPending}
          >
            {generateScripture.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
            Today's Word
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            onClick={getEncouragement}
            disabled={generateEncouragement.isPending}
          >
            {generateEncouragement.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Heart className="w-3 h-3 mr-1.5" />}
            Encouragement
          </Button>
        </div>

        {scripture && (
          <div className="max-w-2xl mx-auto mt-2 p-4 bg-primary/6 border border-primary/20 rounded-md text-left space-y-2 animate-in fade-in duration-300">
            <p className="text-xs uppercase tracking-widest text-primary text-center">{scripture.reference}</p>
            <blockquote className="font-serif text-base text-foreground/80 italic text-center leading-relaxed">"{scripture.text}"</blockquote>
            <p className="text-xs text-muted-foreground leading-relaxed text-center">{scripture.reflection}</p>
          </div>
        )}

        {encouragement && (
          <div className="max-w-2xl mx-auto mt-2 p-4 bg-primary/6 border border-primary/20 rounded-md animate-in fade-in duration-300">
            <p className="font-serif text-base text-foreground/80 italic text-center leading-relaxed">{encouragement}</p>
          </div>
        )}
      </section>

      {/* ── Top Priorities ── */}
      <section className="journal-page p-6">
        <h2 className="text-xl font-serif font-medium text-foreground mb-4">Top Priorities</h2>
        <div className="space-y-3">
          {[0, 1, 2].map((index) => {
            const entry = entries?.find(e => e.section === "priorities" && e.timeSlot === String(index + 1));
            return (
              <Textarea
                key={index}
                defaultValue={entry?.content ?? ""}
                onBlur={(e) => handleEntryBlur("priorities", e.target.value, entry?.id, String(index + 1))}
                placeholder={`${index + 1}.`}
                className="min-h-[64px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/50"
              />
            );
          })}
        </div>
      </section>

      {/* ── Schedule ── */}
      <section className="journal-page p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-serif font-medium text-foreground">Schedule</h2>
        </div>

        {/* Always-visible: first 3 time slots */}
        <div className="space-y-3">
          {timeSlots.slice(0, SCHEDULE_PREVIEW).map((slot) => {
            const entry = scheduleEntries.find((e) => e.timeSlot === slot);
            return (
              <Textarea
                key={slot}
                defaultValue={entry?.content ?? ""}
                onBlur={(e) => handleEntryBlur("schedule", e.target.value, entry?.id, slot)}
                placeholder={`${slot}...`}
                className="min-h-[60px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/50"
              />
            );
          })}
        </div>

        {/* Expanded: remaining time slots */}
        {scheduleExpanded && (
          <div className="space-y-3 mt-3 animate-in fade-in duration-200">
            {timeSlots.slice(SCHEDULE_PREVIEW).map((slot) => {
              const entry = scheduleEntries.find((e) => e.timeSlot === slot);
              return (
                <Textarea
                  key={slot}
                  defaultValue={entry?.content ?? ""}
                  onBlur={(e) => handleEntryBlur("schedule", e.target.value, entry?.id, slot)}
                  placeholder={`${slot}...`}
                  className="min-h-[60px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/50"
                />
              );
            })}
          </div>
        )}

        <button
          onClick={() => setScheduleExpanded((o) => !o)}
          className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${scheduleExpanded ? "rotate-180" : ""}`} />
          {scheduleExpanded ? "Show less" : `Show ${hiddenSlotCount} more time slots`}
        </button>
      </section>

      {/* ── Tasks ── */}
      <section className="journal-page p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-serif font-medium text-foreground">Tasks</h2>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/20 text-primary hover:bg-primary/5 text-xs"
            onClick={getHelp}
            disabled={plannerHelp.isPending}
          >
            {plannerHelp.isPending ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
            Help Me Plan
          </Button>
        </div>

        {helpInsights && (
          <div className="mb-4 bg-primary/6 border border-primary/20 rounded-md p-4 space-y-3 animate-in fade-in duration-300">
            <p className="text-sm text-foreground/80 font-serif italic leading-relaxed">{helpInsights.insights}</p>
            {helpInsights.suggestions.length > 0 && (
              <ul className="space-y-1.5">
                {helpInsights.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-foreground/75 flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            )}
            {helpInsights.prayerFocus && (
              <p className="text-xs text-foreground/65 italic font-serif border-t border-primary/15 pt-2 mt-2">
                Prayer focus: {helpInsights.prayerFocus}
              </p>
            )}
          </div>
        )}

        {tasks && tasks.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 p-3 rounded-md border border-border/40 bg-background/50 group">
                <Checkbox
                  checked={task.completed ?? false}
                  onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                  className="mt-0.5 shrink-0"
                />
                <span className={`flex-1 text-sm text-foreground/85 leading-relaxed ${task.completed ? "line-through text-muted-foreground/60" : ""}`}>
                  {task.text}
                </span>
                {task.recurring && (
                  <span className="text-[10px] text-foreground/55 font-medium uppercase tracking-wide shrink-0 flex items-center gap-0.5">
                    <Repeat2 className="w-3 h-3" /> {task.recurringFrequency === "weekly" ? "wk" : "daily"}
                  </span>
                )}
                <button
                  title={task.recurring ? "Remove repeat" : "Make repeating"}
                  onClick={() => handleToggleRecurring(task.id, task.recurring ?? false, task.recurringFrequency ?? "daily")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-primary"
                >
                  <Repeat2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground/60 mb-4">No tasks for today yet.</p>
        )}

        <form onSubmit={handleAddTask} className="space-y-3 border-t border-border/30 pt-4">
          <div className="flex gap-2">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              className="border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/50"
            />
            <Button type="submit" size="sm" disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
              {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">For date:</label>
            <Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="w-40 text-sm border-border/50 bg-background/70 text-foreground/90" />
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground select-none">
              <input type="checkbox" checked={newTaskRecurring} onChange={e => setNewTaskRecurring(e.target.checked)} className="accent-primary" />
              <Repeat2 className="w-3 h-3" /> Repeating
            </label>
            {newTaskRecurring && (
              <div className="flex gap-1.5">
                {(["daily", "weekly"] as const).map(freq => (
                  <button key={freq} type="button" onClick={() => setNewTaskFrequency(freq)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-all capitalize ${newTaskFrequency === freq ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {freq}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      </section>

      {/* ── Gratitude ── */}
      <section className="journal-page p-6">
        <h2 className="text-xl font-serif font-medium text-foreground mb-4">Gratitude</h2>
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Textarea
              key={index}
              placeholder="..."
              className="min-h-[56px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/65"
            />
          ))}

          {gratitudeExpanded && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <Textarea
                placeholder="..."
                className="min-h-[56px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/65"
              />
              <Textarea
                placeholder="Notes on what you're grateful for..."
                className="min-h-[90px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/55"
              />
            </div>
          )}

          <button
            onClick={() => setGratitudeExpanded((o) => !o)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${gratitudeExpanded ? "rotate-180" : ""}`} />
            {gratitudeExpanded ? "Show less" : "Add more + notes"}
          </button>
        </div>
      </section>

      {/* ── Notes & Reflection ── */}
      <section className="journal-page p-6">
        <h2 className="text-xl font-serif font-medium text-foreground mb-4">Notes & Reflection</h2>
        <Textarea
          placeholder="Your thoughts, notes, or reflections for today..."
          className="min-h-[180px] resize-none border-border/50 bg-background/70 text-foreground/90 placeholder:text-muted-foreground/50"
        />
      </section>

      {/* ── Arm Yourself with Truth ── */}
      <section className="journal-page p-6 border-l-4 border-l-primary/40 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-serif font-medium text-foreground">Arm Yourself with Truth</h2>
        </div>
        <p className="text-sm text-muted-foreground font-serif italic leading-relaxed">
          Name the lie you know you'll face today — then let God's Word replace it before you begin.
        </p>

        {!truthResult ? (
          <div className="space-y-3">
            <Textarea
              value={lieInput}
              onChange={(e) => setLieInput(e.target.value)}
              placeholder="The lie I tend to believe is... (e.g. &quot;I'm too far behind to matter&quot;, &quot;I'm not enough&quot;)"
              className="min-h-[80px] text-sm font-serif border-border/50 bg-background/70 text-foreground/90 resize-none placeholder:text-muted-foreground/55 placeholder:italic focus-visible:ring-primary/30"
            />
            <Button
              onClick={handleRevealTruth}
              disabled={!lieInput.trim() || generateTruth.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            >
              {generateTruth.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching the Word...</>
                : <><Shield className="w-4 h-4 mr-2" /> Reveal God's Truth</>
              }
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-muted/50 rounded-md p-3 border border-border/50">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">The Lie</p>
              <p className="text-sm font-serif italic text-foreground/85">"{truthResult.lie}"</p>
            </div>

            <div className="bg-primary/8 border border-primary/25 rounded-md p-4 space-y-3">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-primary mb-1">God Says</p>
                <p className="font-serif text-lg font-medium text-primary">{truthResult.scriptureReference}</p>
              </div>
              <blockquote className="text-center font-serif text-base leading-relaxed text-foreground italic border-x-2 border-primary/25 px-4 py-2">
                "{truthResult.scriptureText}"
              </blockquote>
              <div className="space-y-2 pt-1">
                <p className="text-sm font-medium text-foreground text-center">{truthResult.affirmation}</p>
                <p className="text-xs text-muted-foreground leading-relaxed text-center">{truthResult.reflection}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" className="border-primary/20 text-primary hover:bg-primary/5" onClick={handleNewTruth}>
                  <RefreshCw className="w-3 h-3 mr-1.5" /> New Truth
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
