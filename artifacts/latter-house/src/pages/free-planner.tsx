import { useState } from "react";
import { format } from "date-fns";
import { Printer, ArrowUpCircle, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TIME_SLOTS = [
  "5am","6am","7am","8am","9am","10am","11am",
  "12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm",
];

const SCHEDULE_PREVIEW = 3;
const TASKS_PREVIEW = 3;

export default function FreePlanner() {
  const [, setLocation] = useLocation();
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  const [tasks, setTasks] = useState<string[]>(["", "", "", "", ""]);
  const [priorities, setPriorities] = useState<string[]>(["", "", ""]);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [gratitude, setGratitude] = useState<string[]>(["", "", ""]);
  const [notes, setNotes] = useState("");

  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);

  const visibleTimeSlots = scheduleExpanded ? TIME_SLOTS : TIME_SLOTS.slice(0, SCHEDULE_PREVIEW);
  const hiddenSlotCount = TIME_SLOTS.length - SCHEDULE_PREVIEW;

  const visibleTasks = tasksExpanded ? tasks : tasks.slice(0, TASKS_PREVIEW);
  const hiddenTaskCount = tasks.length - TASKS_PREVIEW;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24 space-y-6 animate-in fade-in duration-400">

        {/* Upgrade banner */}
        <div className="no-print rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">You're on the Free plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your planner is not saved — fill it in, print it, and take it with you.
              Upgrade to save your data and unlock trackers, AI tools, and more.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setLocation("/pricing")}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Upgrade
          </Button>
        </div>

        {/* Header */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Latter House Life · Daily Planner</p>
          <h1 className="text-2xl font-serif font-semibold text-foreground">{today}</h1>
          <p className="font-serif italic text-sm text-muted-foreground">"The glory of this present house will be greater than the former." — Haggai 2:9</p>
        </div>

        {/* Notes & Reflection — top */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Notes & Reflection</h2>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Your thoughts, notes, or reflections for today…"
            className="min-h-[120px] resize-none border-border/50 bg-background/60 placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Top Priorities */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Top Priorities</h2>
          {priorities.map((val, i) => (
            <Textarea
              key={i}
              value={val}
              onChange={e => setPriorities(p => p.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`${i + 1}.`}
              className="min-h-[56px] resize-none border-border/50 bg-background/60 placeholder:text-muted-foreground/50"
            />
          ))}
        </div>

        {/* Tasks */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Today's Tasks</h2>
          {visibleTasks.map((val, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded border border-border/60 shrink-0 mt-1" />
              <Textarea
                value={val}
                onChange={e => setTasks(t => t.map((v, j) => j === i ? e.target.value : v))}
                placeholder={`Task ${i + 1}…`}
                className="min-h-[40px] resize-none border-border/50 bg-background/60 placeholder:text-muted-foreground/50"
              />
            </div>
          ))}
          <div className="flex items-center gap-4 pt-1">
            {tasks.length > TASKS_PREVIEW && (
              <button
                className="no-print flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={() => setTasksExpanded(o => !o)}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${tasksExpanded ? "rotate-180" : ""}`} />
                {tasksExpanded ? "Show less" : `Show ${hiddenTaskCount} more`}
              </button>
            )}
            <button
              className="no-print text-xs text-primary hover:underline"
              onClick={() => setTasks(t => [...t, ""])}
            >
              + Add task
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleTimeSlots.map(slot => (
              <div key={slot} className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-10 pt-2 shrink-0">{slot}</span>
                <Textarea
                  value={schedule[slot] ?? ""}
                  onChange={e => setSchedule(s => ({ ...s, [slot]: e.target.value }))}
                  placeholder="…"
                  className="min-h-[44px] resize-none border-border/50 bg-background/60 placeholder:text-muted-foreground/40 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            className="no-print flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
            onClick={() => setScheduleExpanded(o => !o)}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${scheduleExpanded ? "rotate-180" : ""}`} />
            {scheduleExpanded ? "Show less" : `Show ${hiddenSlotCount} more time slots`}
          </button>
        </div>

        {/* Gratitude */}
        <div className="print-page rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Gratitude</h2>
          {gratitude.map((val, i) => (
            <Textarea
              key={i}
              value={val}
              onChange={e => setGratitude(g => g.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`${i + 1}. I am grateful for…`}
              className="min-h-[52px] resize-none border-border/50 bg-background/60 placeholder:text-muted-foreground/50 placeholder:italic"
            />
          ))}
        </div>

        {/* Print button */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </Button>
          <p className="text-xs text-muted-foreground">
            To save as PDF: choose "Save as PDF" in your print dialog.
          </p>
        </div>

        {/* Bottom upgrade */}
        <div className="no-print rounded-xl border border-border/40 bg-muted/20 p-5 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Want to save this and access it anytime?</p>
          <p className="text-xs text-muted-foreground">
            Upgrade to Plus ($5.99/mo) to save your planner data, use all trackers, and unlock AI-powered planning tools.
          </p>
          <Button size="sm" className="mt-1" onClick={() => setLocation("/pricing")}>
            See Plans
          </Button>
        </div>

      </div>
    </>
  );
}
