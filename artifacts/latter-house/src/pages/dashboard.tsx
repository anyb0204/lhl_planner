import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useListTodos,
  useListHabits,
  useListHabitLogs,
  useListPrayers,
  useListHealthAppointments,
  useListMedications,
  useListPlannerEntries,
  useGenerateScripture,
  useGenerateEncouragement,
  useGetBackOnTrack,
  useCreateHabit,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Calendar, CalendarDays, CheckSquare, BookHeart, Flame,
  Brain, Sparkles, Target, DollarSign, Pill, CalendarCheck,
  TrendingUp, Heart, ArrowRight, Star, RefreshCw, RotateCcw, Plus, Check, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfToday, parseISO, differenceInDays } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type Stat = { label: string; value: number | string; sub?: string; color: string; href: string };

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name}` : time;
}

const quickLinks = [
  { label: "Daily Planner", icon: BookOpen, href: "/", color: "bg-primary/10 text-primary" },
  { label: "Weekly View", icon: Calendar, href: "/weekly", color: "bg-primary/10 text-primary" },
  { label: "Monthly View", icon: CalendarDays, href: "/monthly", color: "bg-primary/10 text-primary" },
  { label: "Task List", icon: CheckSquare, href: "/tasks", color: "bg-blue-50 text-blue-700" },
  { label: "Prayer Journal", icon: BookHeart, href: "/prayer-journal", color: "bg-purple-50 text-purple-700" },
  { label: "Habit Tracker", icon: Flame, href: "/habits", color: "bg-amber-50 text-amber-700" },
  { label: "Brain Dump", icon: Brain, href: "/brain-dump", color: "bg-green-50 text-green-700" },
  { label: "Truth Generator", icon: Sparkles, href: "/truth-generator", color: "bg-rose-50 text-rose-700" },
  { label: "Goals", icon: Target, href: "/trackers/goals", color: "bg-emerald-50 text-emerald-700" },
  { label: "Financial", icon: DollarSign, href: "/trackers/financial", color: "bg-lime-50 text-lime-700" },
  { label: "Medications", icon: Pill, href: "/trackers/medications", color: "bg-sky-50 text-sky-700" },
  { label: "Appointments", icon: CalendarCheck, href: "/trackers/appointments", color: "bg-indigo-50 text-indigo-700" },
];

type HabitLog = { id: number; habitId: number; date: string; completed: boolean };
type TodoItem = { id: number; text: string; completed: boolean; dueDate?: string | null };
type Prayer = { id: number; body: string; answered: boolean };
type BackOnTrackHabit = { name: string; why: string };

const LAST_VISIT_KEY = "lhl-last-visit";

function getDaysAway(): number {
  const stored = localStorage.getItem(LAST_VISIT_KEY);
  const today = format(startOfToday(), "yyyy-MM-dd");
  localStorage.setItem(LAST_VISIT_KEY, today);
  if (!stored) return 0;
  const diff = differenceInDays(parseISO(today), parseISO(stored));
  return diff;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const today = startOfToday();
  const todayStr = format(today, "yyyy-MM-dd");
  const currentMonth = format(today, "yyyy-MM");

  const daysAway = useRef(getDaysAway()).current;

  const [scripture, setScripture] = useState<{ reference: string; text: string; reflection: string } | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [encouragementLoading, setEncouragementLoading] = useState(false);

  const [reginaldOpen, setReginaldOpen] = useState(false);
  const [reginaldResult, setReginaldResult] = useState<{
    greeting: string;
    habits: BackOnTrackHabit[];
    scripture: { reference: string; text: string };
    encouragement: string;
  } | null>(null);
  const [reginaldLoading, setReginaldLoading] = useState(false);
  const [addedHabits, setAddedHabits] = useState<Set<string>>(new Set());

  const { data: todos = [] } = useListTodos();
  const { data: habits = [] } = useListHabits();
  const { data: logs = [] } = useListHabitLogs({ month: currentMonth });
  const { data: prayers = [] } = useListPrayers();
  const { data: appointments = [] } = useListHealthAppointments();
  const { data: medications = [] } = useListMedications();
  const { data: todayEntries = [] } = useListPlannerEntries({ date: todayStr, view: "day" });

  const generateScripture = useGenerateScripture();
  const generateEncouragement = useGenerateEncouragement();
  const getBackOnTrack = useGetBackOnTrack();
  const createHabit = useCreateHabit();

  const activeTodos = (todos as TodoItem[]).filter(t => !t.completed);
  const overdueTodos = activeTodos.filter(t => t.dueDate && parseISO(t.dueDate) < today);
  const activeHabits = (habits as { id: number; name: string; active: boolean }[]).filter(h => h.active);
  const habitsDoneToday = activeHabits.filter(h => (logs as HabitLog[]).some(l => l.habitId === h.id && l.date === todayStr));
  const unansweredPrayers = (prayers as Prayer[]).filter(p => !p.answered).length;
  const answeredPrayers = (prayers as Prayer[]).filter(p => p.answered).length;
  const upcomingAppts = (appointments as { appointmentDate: string }[]).filter(a => a.appointmentDate >= todayStr).slice(0, 3);
  const todayAppts = (appointments as { id: number; person: string; doctor: string; specialty?: string | null; appointmentDate: string }[]).filter(a => a.appointmentDate === todayStr);
  const todayPriorities = (todayEntries as { id: number; content: string; section: string }[]).filter(e => e.section === "top-priorities");
  const medCount = (medications as { id: number }[]).length;

  const stats: Stat[] = [
    {
      label: "Active Tasks",
      value: activeTodos.length,
      sub: overdueTodos.length > 0 ? `${overdueTodos.length} overdue` : "all on track",
      color: overdueTodos.length > 0 ? "text-red-600" : "text-primary",
      href: "/tasks",
    },
    {
      label: "Habits Today",
      value: `${habitsDoneToday.length}/${activeHabits.length}`,
      sub: activeHabits.length === 0 ? "no habits yet" : habitsDoneToday.length === activeHabits.length ? "all done! 🙌" : "keep going",
      color: "text-amber-600",
      href: "/habits",
    },
    {
      label: "Prayers",
      value: unansweredPrayers,
      sub: answeredPrayers > 0 ? `${answeredPrayers} answered` : "lifting them up",
      color: "text-purple-600",
      href: "/prayer-journal",
    },
    {
      label: "Appointments",
      value: upcomingAppts.length,
      sub: upcomingAppts.length > 0 ? `next: ${format(parseISO(upcomingAppts[0].appointmentDate + "T12:00:00"), "MMM d")}` : "none upcoming",
      color: "text-blue-600",
      href: "/trackers/appointments",
    },
  ];

  useEffect(() => {
    if (!scripture && !scriptureLoading) {
      setScriptureLoading(true);
      generateScripture.mutate({ data: {} }, {
        onSuccess: (data) => { setScripture(data); setScriptureLoading(false); },
        onError: () => setScriptureLoading(false),
      });
    }
  }, []);

  const handleScripture = () => {
    setScriptureLoading(true);
    generateScripture.mutate({ data: {} }, {
      onSuccess: (data) => { setScripture(data); setScriptureLoading(false); },
      onError: () => setScriptureLoading(false),
    });
  };

  const handleEncouragement = () => {
    setEncouragementLoading(true);
    generateEncouragement.mutate({ data: { view: "day" } }, {
      onSuccess: (data) => { setEncouragement(data.message); setEncouragementLoading(false); },
      onError: () => setEncouragementLoading(false),
    });
  };

  const handleGetBackOnTrack = () => {
    setReginaldLoading(true);
    setReginaldOpen(true);
    getBackOnTrack.mutate({ data: { daysAway: daysAway > 0 ? daysAway : null } }, {
      onSuccess: (data) => { setReginaldResult(data); setReginaldLoading(false); },
      onError: () => setReginaldLoading(false),
    });
  };

  const handleAddHabit = (habit: BackOnTrackHabit) => {
    createHabit.mutate({ data: { name: habit.name } }, {
      onSuccess: () => {
        setAddedHabits(prev => new Set(prev).add(habit.name));
        queryClient.invalidateQueries({ queryKey: ["listHabits"] });
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">
          {greeting(user?.firstName)}
        </h1>
        <p className="text-muted-foreground font-serif italic">
          {format(today, "EEEE, MMMM d, yyyy")} · Walking by faith
        </p>
      </header>

      {/* ── Today at a Glance ─────────────────────────────── */}
      <section className="journal-page border-l-4 border-primary/60 overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-serif text-base font-semibold text-foreground">Today at a Glance</h2>
            </div>
            <Link href={`/day/${todayStr}`}>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs gap-1.5">
                <BookOpen className="w-3 h-3" /> Plan Today
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {/* Today's priorities */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Star className="w-3 h-3 text-primary" /> Top Priorities
              </p>
              {todayPriorities.length > 0 ? (
                <ul className="space-y-1">
                  {todayPriorities.slice(0, 3).map(e => (
                    <li key={e.id} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                      <span className="leading-snug">{e.content}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link href={`/day/${todayStr}`} className="text-xs text-primary hover:text-primary/80 transition-colors italic">
                  Add today's priorities →
                </Link>
              )}
            </div>

            {/* Today's appointments */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <CalendarCheck className="w-3 h-3 text-blue-500" /> Appointments
              </p>
              {todayAppts.length > 0 ? (
                <ul className="space-y-1">
                  {todayAppts.slice(0, 3).map(a => (
                    <li key={a.id} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                      <span className="leading-snug">{a.doctor}{a.specialty ? ` · ${a.specialty}` : ""} ({a.person})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">None scheduled today</p>
              )}
            </div>

            {/* Medications reminder */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Pill className="w-3 h-3 text-sky-500" /> Medications
              </p>
              {medCount > 0 ? (
                <Link href="/trackers/medications" className="text-xs text-foreground/80 hover:text-primary transition-colors flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1 shrink-0" />
                  <span>{medCount} medication{medCount !== 1 ? "s" : ""} tracked — remember to take them</span>
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">No medications tracked</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <div className="journal-page p-4 space-y-1 cursor-pointer hover:shadow-md transition-shadow group">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className={cn("text-2xl font-serif font-semibold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Reginald — Get Back on Track */}
      <div className="journal-page border-l-4 border-primary/60 overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-serif text-base font-semibold text-foreground">Get Back on Track</h2>
                <p className="text-xs text-muted-foreground">Reginald will give you 2 small steps to restart today.</p>
              </div>
            </div>
            {!reginaldOpen && (
              <Button
                size="sm"
                onClick={handleGetBackOnTrack}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                Ask Reginald
              </Button>
            )}
          </div>

          {reginaldOpen && (
            <div className="mt-5 space-y-5">
              {reginaldLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  Reginald is preparing your gentle restart…
                </div>
              ) : reginaldResult ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary uppercase tracking-wider">A word from Reginald</p>
                    <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">{reginaldResult.greeting}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your 2 steps for right now</p>
                    {reginaldResult.habits.map((habit) => {
                      const added = addedHabits.has(habit.name);
                      return (
                        <div key={habit.name} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                            <Flame className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{habit.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{habit.why}</p>
                          </div>
                          <button
                            onClick={() => !added && handleAddHabit(habit)}
                            disabled={added}
                            className={cn(
                              "shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all",
                              added
                                ? "bg-primary/20 text-primary cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {added ? <><Check className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Add</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-primary">{reginaldResult.scripture.reference}</p>
                    <p className="font-serif italic text-xs text-foreground/80 leading-relaxed">"{reginaldResult.scripture.text}"</p>
                  </div>

                  <p className="font-serif text-sm text-primary/80 italic border-t border-border/40 pt-4">
                    {reginaldResult.encouragement}
                  </p>

                  <button
                    onClick={() => { setReginaldOpen(false); setReginaldResult(null); setAddedHabits(new Set()); }}
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Verse of the day + Encouragement */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="journal-page p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Daily Scripture
            </h2>
            <Button size="sm" variant="ghost" onClick={handleScripture} disabled={scriptureLoading}
              className="h-7 text-xs text-muted-foreground hover:text-primary">
              <RefreshCw className={cn("w-3 h-3 mr-1", scriptureLoading && "animate-spin")} />
              {scripture ? "New" : "Get"}
            </Button>
          </div>
          {scripture ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary">{scripture.reference}</p>
              <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">"{scripture.text}"</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{scripture.reflection}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-serif italic">
              Click "Get" for today's scripture and reflection.
            </p>
          )}
        </div>

        <div className="journal-page p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" /> Encouragement
            </h2>
            <Button size="sm" variant="ghost" onClick={handleEncouragement} disabled={encouragementLoading}
              className="h-7 text-xs text-muted-foreground hover:text-primary">
              <RefreshCw className={cn("w-3 h-3 mr-1", encouragementLoading && "animate-spin")} />
              {encouragement ? "New" : "Get"}
            </Button>
          </div>
          {encouragement ? (
            <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">{encouragement}</p>
          ) : (
            <p className="text-sm text-muted-foreground font-serif italic">
              Click "Get" for a faith-filled word of encouragement.
            </p>
          )}
        </div>
      </div>

      {/* Today's habits progress */}
      {activeHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" /> Today's Habits
            </h2>
            <Link href="/habits" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="journal-page p-4">
            <div className="flex flex-wrap gap-2">
              {activeHabits.map(h => {
                const done = (logs as HabitLog[]).some(l => l.habitId === h.id && l.date === todayStr);
                return (
                  <Link key={h.id} href="/habits"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      done
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    )}>
                    {done ? "✓" : "○"} {h.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Active tasks preview */}
      {activeTodos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" /> Pending Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="journal-page divide-y divide-border/40">
            {activeTodos.slice(0, 5).map(t => {
              const overdue = t.dueDate && parseISO(t.dueDate) < today;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
                  <span className="text-sm flex-1">{t.text}</span>
                  {overdue && <span className="text-[11px] text-red-600">overdue</span>}
                  {t.dueDate && !overdue && <span className="text-[11px] text-muted-foreground">{format(parseISO(t.dueDate + "T12:00:00"), "MMM d")}</span>}
                </div>
              );
            })}
            {activeTodos.length > 5 && (
              <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                +{activeTodos.length - 5} more tasks
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick navigation grid */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href}>
              <div className="journal-page p-3 flex flex-col items-center gap-1.5 text-center cursor-pointer hover:shadow-md transition-shadow group">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", link.color)}>
                  <link.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                  {link.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
