import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay } from "date-fns";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPlannerEntries, 
  useListTasks,
  useGenerateScripture,
  useGenerateEncouragement,
  usePlannerHelp,
  useListSpecialDates,
  useCreateSpecialDate,
  useDeleteSpecialDate,
  getListSpecialDatesQueryKey
} from "@workspace/api-client-react";
import { Loader2, Sparkles, Heart, ChevronLeft, ChevronRight, Gift, Star, Calendar, Plus, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AddSuggestionTask } from "@/components/add-suggestion-task";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  birthday:    { icon: Gift,     color: "text-pink-500",   label: "Birthday" },
  anniversary: { icon: Heart,    color: "text-rose-500",   label: "Anniversary" },
  event:       { icon: Calendar, color: "text-blue-500",   label: "Event" },
  reminder:    { icon: Bell,     color: "text-amber-500",  label: "Reminder" },
  bill:        { icon: Star,     color: "text-orange-500", label: "Bill / Due Date" },
};

export default function MonthlyPlanner() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const dateParam = format(monthStart, "yyyy-MM-dd");
  const monthParam = format(monthStart, "yyyy-MM");

  const { data: entries, isLoading: entriesLoading } = useListPlannerEntries({ date: dateParam, view: "month" });
  const { data: allTasks, isLoading: tasksLoading } = useListTasks({});
  const { data: specialDates, isLoading: datesLoading } = useListSpecialDates({ month: monthParam });

  const createSpecialDate = useCreateSpecialDate();
  const deleteSpecialDate = useDeleteSpecialDate();

  const generateScripture = useGenerateScripture();
  const generateEncouragement = useGenerateEncouragement();
  const plannerHelp = usePlannerHelp();

  const [scripture, setScripture] = useState<{ reference: string; text: string; reflection: string } | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [helpInsights, setHelpInsights] = useState<{ suggestions: string[]; insights: string; prayerFocus?: string | null } | null>(null);

  const [dayDialog, setDayDialog] = useState<{ open: boolean; date: string; label: string } | null>(null);
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  type SpecialDateType = "birthday" | "anniversary" | "event" | "reminder" | "bill";
  const [newType, setNewType] = useState<SpecialDateType>("event");
  const [newRecurring, setNewRecurring] = useState(false);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getMonthlyWord = () => {
    generateScripture.mutate({ data: {} }, { onSuccess: (data) => setScripture(data) });
  };

  const getEncouragement = () => {
    generateEncouragement.mutate({ data: { view: "month" } }, { onSuccess: (data) => setEncouragement(data.message) });
  };

  const getHelp = () => {
    plannerHelp.mutate({ data: { view: "month", context: "Monthly planning overview" } }, { onSuccess: (data) => setHelpInsights(data) });
  };

  const openDayDialog = (dayString: string) => {
    setDayDialog({ open: true, date: dayString, label: format(new Date(dayString + "T00:00:00"), "EEEE, MMMM d") });
  };

  const goToDay = (date: string) => {
    setDayDialog(null);
    setLocation(`/day/${date}`);
  };

  const openAddDateDialog = () => {
    setAddDateOpen(true);
    setNewLabel("");
    setNewType("event");
    setNewRecurring(false);
  };

  const handleAddSpecialDate = () => {
    if (!dayDialog || !newLabel.trim()) return;
    createSpecialDate.mutate(
      { data: { date: dayDialog.date, label: newLabel.trim(), type: newType, recurring: newRecurring } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSpecialDatesQueryKey({ month: monthParam }) });
          setAddDateOpen(false);
          setDayDialog(null);
        },
      }
    );
  };

  const handleDeleteSpecialDate = (id: number) => {
    deleteSpecialDate.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSpecialDatesQueryKey({ month: monthParam }) }),
    });
  };

  const getSpecialDatesForDay = (dayString: string) => {
    return (specialDates ?? []).filter(sd => {
      if (sd.recurring) {
        return sd.date.slice(5) === dayString.slice(5);
      }
      return sd.date === dayString;
    });
  };

  const upcomingSpecialDates = (specialDates ?? [])
    .filter(sd => sd.date >= format(new Date(), "yyyy-MM-dd") || sd.recurring)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-foreground">
            {format(monthStart, "MMMM yyyy")}
          </h1>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 text-muted-foreground border-border/50">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 text-muted-foreground border-border/50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 text-sm" onClick={getHelp}>
            <Sparkles className="w-3 h-3 mr-2" /> Monthly Help
          </Button>
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 text-sm" onClick={getMonthlyWord}>
            <Sparkles className="w-3 h-3 mr-2" /> Monthly Word
          </Button>
          <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm" onClick={getEncouragement}>
            <Heart className="w-3 h-3 mr-2" /> Encouragement
          </Button>
        </div>
      </header>

      {/* ── Special Dates Banner ───────────────────────────── */}
      {!datesLoading && upcomingSpecialDates.length > 0 && (
        <div className="journal-page p-4 border-primary/15 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] text-primary font-medium">Special Dates This Month</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingSpecialDates.map(sd => {
              const meta = TYPE_META[sd.type] ?? TYPE_META.event;
              const Icon = meta.icon;
              return (
                <div key={sd.id} className="flex items-center gap-1.5 bg-background/70 border border-border/50 rounded-full px-3 py-1 text-xs group">
                  <Icon className={`w-3 h-3 ${meta.color}`} />
                  <span className="text-foreground/80">{format(new Date(sd.date + "T00:00:00"), "MMM d")}</span>
                  <span className="text-foreground/60">·</span>
                  <span className="text-foreground/90 font-medium">{sd.label}</span>
                  {sd.recurring && <span className="text-[9px] text-muted-foreground ml-0.5 uppercase tracking-wide">yearly</span>}
                  <button
                    onClick={() => handleDeleteSpecialDate(sd.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entriesLoading || tasksLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="journal-page p-6 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-border/50 rounded-t-md overflow-hidden">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="bg-card p-3 text-center text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border/50 border-t border-border/50">
            {days.map(day => {
              const dayString = format(day, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const dayTasks = allTasks?.filter(t => t.date === dayString) || [];
              const dayEntries = entries?.filter(e => e.date === dayString && e.section === "top-priorities") || [];
              const daySpecialDates = getSpecialDatesForDay(dayString);

              return (
                <div
                  key={dayString}
                  onClick={() => isCurrentMonth && openDayDialog(dayString)}
                  className={`bg-card min-h-[120px] p-2 flex flex-col transition-colors
                    ${isCurrentMonth ? 'cursor-pointer hover:bg-accent/20' : 'opacity-40 bg-card/50'}
                    ${isToday ? 'ring-inset ring-2 ring-primary/50' : ''}
                  `}
                >
                  <div className={`text-right mb-1 ${isToday ? 'font-serif text-primary font-medium text-lg' : 'text-sm text-foreground/70'}`}>
                    {format(day, "d")}
                  </div>

                  {daySpecialDates.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1">
                      {daySpecialDates.map(sd => {
                        const meta = TYPE_META[sd.type] ?? TYPE_META.event;
                        const Icon = meta.icon;
                        return (
                          <div key={sd.id} className={`flex items-center gap-0.5 text-[9px] leading-none ${meta.color} bg-current/10 rounded px-0.5 py-px`}>
                            <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                            <span className="truncate max-w-[56px] text-foreground/80">{sd.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex-1 flex flex-wrap gap-1 items-start content-start pt-1">
                    {dayEntries.length > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-primary block shrink-0" />
                        <span className="text-[9px] text-primary">{dayEntries.length}</span>
                      </span>
                    )}
                    {dayTasks.length > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 block shrink-0" />
                        <span className="text-[9px] text-blue-500/70">{dayTasks.filter(t => !t.completed).length}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day Action Dialog ──────────────────────────────── */}
      <Dialog open={!!dayDialog?.open} onOpenChange={(open) => { if (!open) setDayDialog(null); }}>
        <DialogContent className="sm:max-w-sm bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-medium text-foreground">
              {dayDialog?.label}
            </DialogTitle>
            <DialogDescription className="text-foreground/60">What would you like to do?</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground justify-start gap-3"
              onClick={() => dayDialog && goToDay(dayDialog.date)}
            >
              <Calendar className="w-4 h-4" />
              Plan this day
            </Button>
            <Button
              variant="outline"
              className="w-full border-primary/20 text-primary hover:bg-primary/5 justify-start gap-3"
              onClick={openAddDateDialog}
            >
              <Plus className="w-4 h-4" />
              Add a special date
            </Button>

            {dayDialog && getSpecialDatesForDay(dayDialog.date).length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">On this day</p>
                <div className="space-y-1.5">
                  {getSpecialDatesForDay(dayDialog.date).map(sd => {
                    const meta = TYPE_META[sd.type] ?? TYPE_META.event;
                    const Icon = meta.icon;
                    return (
                      <div key={sd.id} className="flex items-center justify-between text-sm bg-background/50 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          <span className="text-foreground/80">{sd.label}</span>
                          {sd.recurring && <span className="text-[10px] text-muted-foreground">yearly</span>}
                        </div>
                        <button onClick={() => handleDeleteSpecialDate(sd.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Special Date Dialog ────────────────────────── */}
      <Dialog open={addDateOpen} onOpenChange={(open) => { if (!open) setAddDateOpen(false); }}>
        <DialogContent className="sm:max-w-sm bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-medium text-foreground">
              Add Special Date
            </DialogTitle>
            <DialogDescription className="text-foreground/60">
              {dayDialog?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Mom's birthday, rent due, anniversary..."
                className="border-border/50 bg-background/70 focus-visible:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleAddSpecialDate()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as SpecialDateType)}>
                <SelectTrigger className="border-border/50 bg-background/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={newRecurring}
                onCheckedChange={(v) => setNewRecurring(v === true)}
              />
              <Label htmlFor="recurring" className="text-sm text-foreground/80 cursor-pointer">
                Repeat every year
              </Label>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleAddSpecialDate}
              disabled={!newLabel.trim() || createSpecialDate.isPending}
            >
              {createSpecialDate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Scripture Dialog ───────────────────────────────── */}
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

      {/* ── Encouragement Dialog ──────────────────────────── */}
      <Dialog open={!!encouragement} onOpenChange={(open) => !open && setEncouragement(null)}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium text-primary text-center flex items-center justify-center gap-2">
              <Heart className="w-5 h-5" /> A Word For The Month
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 px-4 text-center space-y-6">
            <p className="font-serif text-lg leading-relaxed text-foreground">{encouragement}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Help Dialog ───────────────────────────────────── */}
      <Dialog open={!!helpInsights} onOpenChange={(open) => !open && setHelpInsights(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-primary/20 shadow-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Monthly Overview
            </DialogTitle>
            <DialogDescription className="text-foreground/70">Looking at the month ahead.</DialogDescription>
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
                      <div className="pl-6"><AddSuggestionTask suggestion={s} /></div>
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
