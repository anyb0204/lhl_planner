import { useState } from "react";
import { useLocation } from "wouter";
import { format, startOfYear, eachMonthOfInterval, endOfYear, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, getYear } from "date-fns";
import { useListSpecialDates, useListTasks } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SpecialDate = { date: string; type: string; recurring?: boolean };
type Task = { date?: string | null; completed: boolean };

function getSpecialTypesForDay(specialDates: SpecialDate[], dayStr: string): string[] {
  return specialDates
    .filter(sd => sd.date === dayStr || (sd.recurring && sd.date.slice(5) === dayStr.slice(5)))
    .map(sd => sd.type);
}

function MiniMonth({
  monthDate,
  specialDates,
  tasks,
  onDayClick,
}: {
  monthDate: Date;
  specialDates: SpecialDate[];
  tasks: Task[];
  onDayClick: (date: string) => void;
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  return (
    <div className="journal-page p-3">
      <h3 className="text-xs font-serif font-medium text-foreground mb-2 text-center tracking-wide">
        {format(monthDate, "MMMM")}
      </h3>
      <div className="grid grid-cols-7 gap-px mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[8px] text-muted-foreground/60 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const specialTypes = inMonth ? getSpecialTypesForDay(specialDates, dayStr) : [];
          const hasOpenTasks = inMonth && tasks.some(t => t.date === dayStr && !t.completed);
          const hasAny = specialTypes.length > 0 || hasOpenTasks;

          return (
            <button
              key={dayStr}
              onClick={() => inMonth && onDayClick(dayStr)}
              disabled={!inMonth}
              className={`relative flex flex-col items-center py-0.5 rounded transition-colors
                ${inMonth ? "hover:bg-primary/10 cursor-pointer" : "opacity-0 cursor-default"}
                ${isToday ? "ring-1 ring-primary/60 bg-primary/5" : ""}
              `}
            >
              <span className={`text-[9px] leading-none ${isToday ? "text-primary font-semibold" : inMonth ? "text-foreground/70" : "text-muted-foreground/30"}`}>
                {format(day, "d")}
              </span>
              {hasAny && inMonth && (
                <div className="flex gap-px mt-0.5 flex-wrap justify-center">
                  {hasOpenTasks && <span className="w-1 h-1 rounded-full bg-blue-400 block" />}
                  {specialTypes.includes("birthday") && <span className="w-1 h-1 rounded-full bg-pink-400 block" />}
                  {specialTypes.includes("anniversary") && <span className="w-1 h-1 rounded-full bg-rose-500 block" />}
                  {specialTypes.includes("bill") && <span className="w-1 h-1 rounded-full bg-orange-400 block" />}
                  {specialTypes.includes("event") && <span className="w-1 h-1 rounded-full bg-blue-500 block" />}
                  {specialTypes.includes("reminder") && <span className="w-1 h-1 rounded-full bg-amber-400 block" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function YearAtAGlance() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState(getYear(new Date()));

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const { data: specialDatesRaw = [], isLoading: loadingDates } = useListSpecialDates({ month: `${year}-01` });
  const { data: allTasksRaw = [], isLoading: loadingTasks } = useListTasks({});

  const specialDates = specialDatesRaw as SpecialDate[];
  const tasks = allTasksRaw as Task[];

  const isLoading = loadingDates || loadingTasks;

  const legend = [
    { color: "bg-blue-400", label: "Open Tasks" },
    { color: "bg-pink-400", label: "Birthday" },
    { color: "bg-rose-500", label: "Anniversary" },
    { color: "bg-orange-400", label: "Bill" },
    { color: "bg-blue-500", label: "Event" },
    { color: "bg-amber-400", label: "Reminder" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <CalendarRange className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-4xl font-serif font-semibold tracking-tight text-foreground">Year at a Glance</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">Tap any day to open the daily planner</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)} className="h-8 w-8 border-border/50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-serif text-xl font-medium text-foreground w-16 text-center">{year}</span>
          <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)} className="h-8 w-8 border-border/50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${l.color} block`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {months.map(month => (
            <MiniMonth
              key={format(month, "yyyy-MM")}
              monthDate={month}
              specialDates={specialDates}
              tasks={tasks}
              onDayClick={(date) => setLocation(`/day/${date}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
