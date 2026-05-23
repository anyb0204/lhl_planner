import { useState } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { useLocation } from "wouter";
import { 
  useListPlannerEntries, 
  useListTasks, 
  useUpdateTask,
  useGenerateScripture,
  useGenerateEncouragement,
  usePlannerHelp,
  getListTasksQueryKey,
  useListSpecialDates
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Heart, ChevronLeft, ChevronRight, Gift, Bell, Star, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AddSuggestionTask } from "@/components/add-suggestion-task";

const WEEKLY_TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  birthday:    { icon: Gift,     color: "text-pink-500" },
  anniversary: { icon: Heart,    color: "text-rose-500" },
  event:       { icon: Calendar, color: "text-blue-500" },
  reminder:    { icon: Bell,     color: "text-amber-500" },
  bill:        { icon: Star,     color: "text-orange-500" },
};

export default function WeeklyPlanner() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dateParam = format(startDate, "yyyy-MM-dd");
  const monthParam = format(startDate, "yyyy-MM");

  const { data: entries, isLoading: entriesLoading } = useListPlannerEntries(
    { date: dateParam, view: "week" }
  );
  
  const { data: allTasks, isLoading: tasksLoading } = useListTasks({});
  const { data: specialDates } = useListSpecialDates({ month: monthParam });
  
  const updateTask = useUpdateTask();
  const generateScripture = useGenerateScripture();
  const generateEncouragement = useGenerateEncouragement();
  const plannerHelp = usePlannerHelp();

  const [scripture, setScripture] = useState<{ reference: string; text: string; reflection: string } | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [helpInsights, setHelpInsights] = useState<{ suggestions: string[]; insights: string; prayerFocus?: string | null } | null>(null);

  const prevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

  const handleToggleTask = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) })
    });
  };

  const getWeeklyWord = () => {
    generateScripture.mutate({ data: {} }, {
      onSuccess: (data) => setScripture(data),
      onError: () => toast({
        title: "Couldn't fetch scripture",
        description: "Please try again in a moment.",
        variant: "destructive",
      }),
    });
  };

  const getEncouragement = () => {
    generateEncouragement.mutate({ data: { view: "week" } }, {
      onSuccess: (data) => setEncouragement(data.message),
      onError: () => toast({
        title: "Couldn't fetch encouragement",
        description: "Please try again in a moment.",
        variant: "destructive",
      }),
    });
  };

  const getHelp = () => {
    plannerHelp.mutate({ data: { view: "week", context: "Weekly planning: help me organize and prepare for the week ahead with faith-based priorities." } }, {
      onSuccess: (data) => setHelpInsights(data),
      onError: () => toast({
        title: "Couldn't get weekly guidance",
        description: "Please try again in a moment.",
        variant: "destructive",
      }),
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-foreground">
            {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
          </h1>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8 text-muted-foreground border-border/50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8 text-muted-foreground border-border/50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-primary/20 text-primary hover:bg-primary/5 text-sm"
            onClick={getHelp}
            disabled={plannerHelp.isPending}
          >
            {plannerHelp.isPending
              ? <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              : <Sparkles className="w-3 h-3 mr-2" />}
            Weekly Help
          </Button>
          <Button
            variant="outline"
            className="border-primary/20 text-primary hover:bg-primary/5 text-sm"
            onClick={getWeeklyWord}
            disabled={generateScripture.isPending}
          >
            {generateScripture.isPending
              ? <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              : <Sparkles className="w-3 h-3 mr-2" />}
            Weekly Word
          </Button>
          <Button
            variant="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            onClick={getEncouragement}
            disabled={generateEncouragement.isPending}
          >
            {generateEncouragement.isPending
              ? <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              : <Heart className="w-3 h-3 mr-2" />}
            Encouragement
          </Button>
        </div>
      </header>

      {/* ── Special Dates Banner ──────────────────────────── */}
      {(() => {
        const weekSpecialDates = (specialDates ?? []).filter(sd => {
          const sdDay = sd.date.slice(5);
          return weekDays.some(d => {
            const dayStr = format(d, "yyyy-MM-dd");
            return sd.recurring ? dayStr.slice(5) === sdDay : sd.date === dayStr;
          });
        });
        if (weekSpecialDates.length === 0) return null;
        return (
          <div className="journal-page p-4 border-primary/15 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-primary" />
              <h3 className="text-xs uppercase tracking-[0.2em] text-primary font-medium">This Week's Special Dates</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {weekSpecialDates.map(sd => {
                const meta = WEEKLY_TYPE_META[sd.type] ?? WEEKLY_TYPE_META.event;
                const Icon = meta.icon;
                return (
                  <div key={sd.id} className="flex items-center gap-1.5 bg-background/70 border border-border/50 rounded-full px-3 py-1 text-xs">
                    <Icon className={`w-3 h-3 ${meta.color}`} />
                    <span className="text-foreground/80">{format(new Date(sd.date + "T00:00:00"), "EEE MMM d")}</span>
                    <span className="text-foreground/60">·</span>
                    <span className="text-foreground/90 font-medium">{sd.label}</span>
                    {sd.recurring && <span className="text-[9px] text-muted-foreground ml-0.5 uppercase tracking-wide">yearly</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {entriesLoading || tasksLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {weekDays.map(day => {
            const dayString = format(day, "yyyy-MM-dd");
            const dayEntries = entries?.filter(e => e.date === dayString) || [];
            const dayTasks = allTasks?.filter(t => t.date === dayString) || [];
            const topPriorities = dayEntries.filter(e => e.section === "top-priorities");
            const schedule = dayEntries.filter(e => e.section === "schedule").slice(0, 3);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={dayString} className={`journal-page p-4 h-[600px] flex flex-col ${isToday ? 'ring-2 ring-primary/50' : ''}`}>
                <button
                  onClick={() => setLocation(`/day/${dayString}`)}
                  className="text-center mb-4 pb-2 border-b border-border/50 w-full hover:bg-primary/5 rounded-md transition-colors -mx-1 px-1 cursor-pointer"
                >
                  <div className="text-sm uppercase tracking-widest text-muted-foreground mb-1">{format(day, "EEE")}</div>
                  <div className={`text-2xl font-serif ${isToday ? 'text-primary font-medium' : 'text-foreground'}`}>
                    {format(day, "d")}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 tracking-wide">tap to plan</div>
                </button>

                <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {topPriorities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-widest text-primary font-medium">Priorities</h4>
                      <ul className="space-y-1">
                        {topPriorities.map(p => (
                          <li key={p.id} className="text-sm text-foreground/80 line-clamp-2">• {p.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {schedule.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Schedule</h4>
                      <ul className="space-y-1">
                        {schedule.map(s => (
                          <li key={s.id} className="text-sm flex gap-2">
                            <span className="text-muted-foreground w-12 text-right">{s.timeSlot}</span>
                            <span className="text-foreground/80 truncate">{s.content}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-widest text-muted-foreground flex justify-between">
                      Tasks <span className="text-primary">{dayTasks.filter(t => t.completed).length}/{dayTasks.length}</span>
                    </h4>
                    <div className="space-y-2">
                      {dayTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-2">
                          <Checkbox 
                            checked={task.completed} 
                            onCheckedChange={(c) => handleToggleTask(task.id, c as boolean)}
                            className="mt-0.5 h-3 w-3 border-primary/40 data-[state=checked]:bg-primary"
                          />
                          <span className={`text-xs leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <p className="text-xs text-muted-foreground/50 italic">No tasks</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!scripture} onOpenChange={(open) => !open && setScripture(null)}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium text-primary text-center">
              {scripture?.reference}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <blockquote className="text-center font-serif text-lg leading-relaxed text-foreground italic px-4 border-x-2 border-primary/20">
              "{scripture?.text}"
            </blockquote>
            <div className="bg-primary/5 p-4 rounded-md">
              <h4 className="font-medium text-xs uppercase tracking-widest text-primary mb-2">Reflection</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{scripture?.reflection}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!encouragement} onOpenChange={(open) => !open && setEncouragement(null)}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium text-primary text-center flex items-center justify-center gap-2">
              <Heart className="w-5 h-5" /> Weekly Encouragement
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 px-4 text-center">
            <p className="font-serif text-lg leading-relaxed text-foreground">{encouragement}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!helpInsights} onOpenChange={(open) => !open && setHelpInsights(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-primary/20 shadow-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Weekly Guidance
            </DialogTitle>
            <DialogDescription className="text-foreground/70">A look ahead at your week.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {helpInsights?.suggestions && helpInsights.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">Suggestions</h4>
                <ul className="space-y-3">
                  {helpInsights.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-foreground/80 bg-background/50 p-3 rounded-md border border-border/50">
                      <div className="flex gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                      <div className="pl-6">
                        <AddSuggestionTask suggestion={s} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {helpInsights?.insights && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground">Perspective</h4>
                <p className="text-sm text-foreground/80 leading-relaxed italic bg-primary/5 p-4 rounded-md border-l-2 border-primary/30">
                  {helpInsights.insights}
                </p>
              </div>
            )}
            {helpInsights?.prayerFocus && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" /> Prayer Focus
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{helpInsights.prayerFocus}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
