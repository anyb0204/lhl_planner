import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Droplets, Activity,
  TrendingUp, Calendar, X, Check, Info, Smile,
  Zap, Moon, Sun, Frown, Meh, SmilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  format, addDays, subDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, parseISO,
  differenceInDays, addMonths, subMonths, isToday,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowLevel = "spotting" | "light" | "medium" | "heavy";

interface DayLog {
  date: string; // yyyy-MM-dd
  flow?: FlowLevel;
  symptoms: string[];
  mood?: string;
  notes: string;
  temperature?: string; // basal body temp
}

interface TrackerData {
  logs: DayLog[];
  cycleLength: number; // user's set average, default 28
  periodLength: number; // user's set average, default 5
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lhl-menstrual-tracker";

const SYMPTOMS = [
  { id: "cramps", label: "Cramps", emoji: "🫀" },
  { id: "headache", label: "Headache", emoji: "🤕" },
  { id: "bloating", label: "Bloating", emoji: "💫" },
  { id: "backache", label: "Back ache", emoji: "🔙" },
  { id: "tender-breasts", label: "Tender breasts", emoji: "💗" },
  { id: "nausea", label: "Nausea", emoji: "🤢" },
  { id: "fatigue", label: "Fatigue", emoji: "😴" },
  { id: "acne", label: "Acne", emoji: "🔴" },
  { id: "discharge", label: "Discharge", emoji: "💧" },
  { id: "spotting", label: "Spotting", emoji: "🩸" },
  { id: "insomnia", label: "Insomnia", emoji: "🌙" },
  { id: "hot-flashes", label: "Hot flashes", emoji: "🔥" },
  { id: "cravings", label: "Cravings", emoji: "🍫" },
  { id: "appetite-loss", label: "Low appetite", emoji: "🥗" },
  { id: "dizziness", label: "Dizziness", emoji: "😵" },
];

const MOODS = [
  { id: "happy", label: "Happy", emoji: "😊", color: "text-amber-500" },
  { id: "calm", label: "Calm", emoji: "😌", color: "text-emerald-500" },
  { id: "energetic", label: "Energetic", emoji: "⚡", color: "text-yellow-500" },
  { id: "sensitive", label: "Sensitive", emoji: "🥺", color: "text-pink-500" },
  { id: "irritable", label: "Irritable", emoji: "😤", color: "text-red-500" },
  { id: "sad", label: "Sad", emoji: "😔", color: "text-blue-500" },
  { id: "anxious", label: "Anxious", emoji: "😰", color: "text-purple-500" },
  { id: "tired", label: "Tired", emoji: "😴", color: "text-gray-500" },
];

const FLOW_CONFIG: Record<FlowLevel, { label: string; color: string; bg: string; dots: number }> = {
  spotting: { label: "Spotting", color: "text-rose-300", bg: "bg-rose-100", dots: 1 },
  light:    { label: "Light",    color: "text-rose-400", bg: "bg-rose-200", dots: 2 },
  medium:   { label: "Medium",   color: "text-rose-600", bg: "bg-rose-400", dots: 3 },
  heavy:    { label: "Heavy",    color: "text-rose-700", bg: "bg-rose-600", dots: 4 },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadData(): TrackerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { logs: [], cycleLength: 28, periodLength: 5 };
    return JSON.parse(raw) as TrackerData;
  } catch {
    return { logs: [], cycleLength: 28, periodLength: 5 };
  }
}

function saveData(data: TrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Cycle analysis ───────────────────────────────────────────────────────────

interface CycleInfo {
  periodDates: Set<string>;
  cycleStarts: string[]; // sorted oldest first
  nextPeriodStart: Date | null;
  ovulationDate: Date | null;
  fertileStart: Date | null;
  fertileEnd: Date | null;
  pmsStart: Date | null;
  currentCycleDay: number | null;
  avgCycleLength: number;
  avgPeriodLength: number;
  currentPhase: "period" | "follicular" | "fertile" | "ovulation" | "luteal" | "pms" | null;
}

function analyzeCycles(data: TrackerData): CycleInfo {
  const { logs, cycleLength, periodLength } = data;

  // Collect all period dates
  const periodDates = new Set<string>(
    logs.filter(l => l.flow).map(l => l.date)
  );

  // Find cycle starts: a period date NOT preceded by another period date within 2 days
  const sortedPeriodDates = Array.from(periodDates).sort();
  const cycleStarts: string[] = [];

  for (let i = 0; i < sortedPeriodDates.length; i++) {
    const d = parseISO(sortedPeriodDates[i]);
    const prev = i > 0 ? parseISO(sortedPeriodDates[i - 1]) : null;
    if (!prev || differenceInDays(d, prev) > 2) {
      cycleStarts.push(sortedPeriodDates[i]);
    }
  }

  // Calculate average cycle length from recorded starts
  let avgCycleLength = cycleLength;
  if (cycleStarts.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < cycleStarts.length; i++) {
      diffs.push(differenceInDays(parseISO(cycleStarts[i]), parseISO(cycleStarts[i - 1])));
    }
    avgCycleLength = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
  }

  // Calculate average period length
  let avgPeriodLength = periodLength;
  if (cycleStarts.length >= 1) {
    const lengths: number[] = [];
    for (const start of cycleStarts) {
      const startDate = parseISO(start);
      let len = 0;
      for (let d = 0; d < 10; d++) {
        const check = format(addDays(startDate, d), "yyyy-MM-dd");
        if (periodDates.has(check)) len++;
        else break;
      }
      if (len > 0) lengths.push(len);
    }
    if (lengths.length > 0) {
      avgPeriodLength = Math.round(lengths.reduce((s, l) => s + l, 0) / lengths.length);
    }
  }

  // Predict next period and fertile window based on last known cycle start
  const today = startOfDay(new Date());
  let nextPeriodStart: Date | null = null;
  let ovulationDate: Date | null = null;
  let fertileStart: Date | null = null;
  let fertileEnd: Date | null = null;
  let pmsStart: Date | null = null;
  let currentCycleDay: number | null = null;
  let currentPhase: CycleInfo["currentPhase"] = null;

  if (cycleStarts.length > 0) {
    const lastStart = parseISO(cycleStarts[cycleStarts.length - 1]);
    const daysSinceLast = differenceInDays(today, lastStart);
    const cyclesElapsed = Math.floor(daysSinceLast / avgCycleLength);
    const projectedLastStart = addDays(lastStart, cyclesElapsed * avgCycleLength);
    const projectedNext = addDays(projectedLastStart, avgCycleLength);

    nextPeriodStart = projectedNext;
    currentCycleDay = differenceInDays(today, projectedLastStart) + 1;

    // Ovulation: ~14 days before next period
    ovulationDate = subDays(projectedNext, 14);
    fertileStart = subDays(ovulationDate, 5);
    fertileEnd = addDays(ovulationDate, 1);
    pmsStart = subDays(projectedNext, 5);

    // Determine current phase
    const isInPeriod = currentCycleDay >= 1 && currentCycleDay <= avgPeriodLength;
    const fertileDay = differenceInDays(today, projectedLastStart);
    const ovDay = differenceInDays(ovulationDate, projectedLastStart);
    const pmsDay = differenceInDays(pmsStart, projectedLastStart);

    if (isInPeriod) currentPhase = "period";
    else if (isSameDay(today, ovulationDate)) currentPhase = "ovulation";
    else if (fertileDay >= differenceInDays(fertileStart, projectedLastStart) && fertileDay <= differenceInDays(fertileEnd, projectedLastStart)) currentPhase = "fertile";
    else if (differenceInDays(today, pmsStart) >= 0 && differenceInDays(today, pmsStart) < 5) currentPhase = "pms";
    else if (currentCycleDay > avgPeriodLength && currentCycleDay < differenceInDays(fertileStart, projectedLastStart) + 1) currentPhase = "follicular";
    else currentPhase = "luteal";
  }

  return {
    periodDates,
    cycleStarts,
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    pmsStart,
    currentCycleDay,
    avgCycleLength,
    avgPeriodLength,
    currentPhase,
  };
}

// ─── Day type for calendar coloring ──────────────────────────────────────────

type DayType =
  | "period"
  | "predicted-period"
  | "ovulation"
  | "fertile"
  | "pms"
  | "follicular"
  | "luteal"
  | "today"
  | "none";

function getDayType(date: Date, cycleInfo: CycleInfo): DayType {
  const dateStr = format(date, "yyyy-MM-dd");
  const today = startOfDay(new Date());

  if (cycleInfo.periodDates.has(dateStr)) return "period";

  // Predicted period range
  if (cycleInfo.nextPeriodStart) {
    for (let i = 0; i < cycleInfo.avgPeriodLength; i++) {
      if (isSameDay(date, addDays(cycleInfo.nextPeriodStart, i))) return "predicted-period";
    }
    // Future cycles (1 ahead)
    const nextNext = addDays(cycleInfo.nextPeriodStart, cycleInfo.avgCycleLength);
    for (let i = 0; i < cycleInfo.avgPeriodLength; i++) {
      if (isSameDay(date, addDays(nextNext, i))) return "predicted-period";
    }
  }

  if (cycleInfo.ovulationDate && isSameDay(date, cycleInfo.ovulationDate)) return "ovulation";

  if (
    cycleInfo.fertileStart &&
    cycleInfo.fertileEnd &&
    date >= cycleInfo.fertileStart &&
    date <= cycleInfo.fertileEnd
  ) return "fertile";

  if (
    cycleInfo.pmsStart &&
    date >= cycleInfo.pmsStart &&
    cycleInfo.nextPeriodStart &&
    date < cycleInfo.nextPeriodStart
  ) return "pms";

  if (isToday(date)) return "today";
  return "none";
}

const DAY_STYLES: Record<DayType, string> = {
  period:           "bg-rose-500 text-white font-semibold rounded-full",
  "predicted-period": "bg-rose-200 text-rose-700 rounded-full",
  ovulation:        "bg-purple-500 text-white font-semibold rounded-full ring-2 ring-purple-300",
  fertile:          "bg-purple-100 text-purple-700 rounded-full",
  pms:              "bg-amber-100 text-amber-700 rounded-full",
  follicular:       "",
  luteal:           "",
  today:            "ring-2 ring-foreground/40 rounded-full font-semibold",
  none:             "",
};

// ─── Phase badge ──────────────────────────────────────────────────────────────

const PHASE_INFO: Record<NonNullable<CycleInfo["currentPhase"]>, { label: string; desc: string; color: string; bg: string }> = {
  period:     { label: "Period",     desc: "Your body is shedding its uterine lining.",             color: "text-rose-700",   bg: "bg-rose-50 border-rose-200" },
  follicular: { label: "Follicular", desc: "Energy rising. Great time to start new projects.",       color: "text-sky-700",    bg: "bg-sky-50 border-sky-200" },
  fertile:    { label: "Fertile Window", desc: "Peak fertility days. Estrogen is at its highest.",   color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  ovulation:  { label: "Ovulation",  desc: "Peak energy and confidence. You're glowing!",            color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  luteal:     { label: "Luteal",     desc: "Progesterone rises. Favor calmer, nourishing activities.", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  pms:        { label: "PMS",        desc: "Be gentle with yourself. Rest and nourish.",             color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
};

// ─── Flow dots ────────────────────────────────────────────────────────────────

function FlowDots({ level }: { level: FlowLevel }) {
  const cfg = FLOW_CONFIG[level];
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full",
            i < cfg.dots ? cfg.bg.replace("bg-", "bg-") : "bg-muted/50"
          )}
        />
      ))}
    </div>
  );
}

// ─── Log Day Modal ────────────────────────────────────────────────────────────

interface LogDayModalProps {
  date: Date;
  existing?: DayLog;
  onSave: (log: DayLog) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function LogDayModal({ date, existing, onSave, onDelete, onClose }: LogDayModalProps) {
  const [flow, setFlow] = useState<FlowLevel | undefined>(existing?.flow);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [mood, setMood] = useState<string | undefined>(existing?.mood);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [temp, setTemp] = useState(existing?.temperature ?? "");

  function toggleSymptom(id: string) {
    setSymptoms(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function handleSave() {
    onSave({
      date: format(date, "yyyy-MM-dd"),
      flow,
      symptoms,
      mood,
      notes: notes.trim(),
      temperature: temp.trim() || undefined,
    });
  }

  const isFuture = date > startOfDay(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {format(date, "EEEE, MMMM d")}
              </h3>
              {isToday(date) && (
                <span className="text-xs text-primary font-medium">Today</span>
              )}
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flow */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Flow
            </p>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setFlow(undefined)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all",
                  !flow
                    ? "border-muted bg-muted text-muted-foreground ring-1 ring-foreground/20"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <span className="text-base">🚫</span>
                <span className="text-[10px]">None</span>
              </button>
              {(["spotting", "light", "medium", "heavy"] as FlowLevel[]).map(level => {
                const cfg = FLOW_CONFIG[level];
                return (
                  <button
                    key={level}
                    onClick={() => setFlow(level)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all",
                      flow === level
                        ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                        : "border-border/50 text-muted-foreground hover:border-rose-200"
                    )}
                  >
                    <Droplets className={cn("w-4 h-4", flow === level ? cfg.color : "text-muted-foreground")} />
                    <span className="text-[10px]">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mood</p>
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(mood === m.id ? undefined : m.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all",
                    mood === m.id
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border/40 text-muted-foreground hover:border-border"
                  )}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSymptom(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    symptoms.includes(s.id)
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  <span>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* BBT Temperature */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Basal Body Temp (optional)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="96"
                max="100"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="98.6"
                className="w-24 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">°F</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How are you feeling today?"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {existing && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

interface CalendarProps {
  month: Date;
  cycleInfo: CycleInfo;
  logs: DayLog[];
  onSelectDay: (date: Date) => void;
  selectedDate: Date | null;
}

function CycleCalendar({ month, cycleInfo, logs, onSelectDay, selectedDate }: CalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to Monday
  const startPad = (monthStart.getDay() + 6) % 7; // 0=Mon
  const paddedDays: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
  ];
  // Pad end to complete rows
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  const logMap = new Map(logs.map(l => [l.date, l]));

  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
          <div key={d} className="text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {paddedDays.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const dateStr = format(date, "yyyy-MM-dd");
          const dayType = getDayType(date, cycleInfo);
          const log = logMap.get(dateStr);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, month);
          const isFuture = date > startOfDay(new Date());

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(date)}
              className={cn(
                "relative flex flex-col items-center justify-center h-9 w-full text-sm transition-all hover:scale-105",
                !isCurrentMonth && "opacity-30",
                isSelected && "ring-2 ring-foreground/60 rounded-full z-10",
                DAY_STYLES[dayType],
                !DAY_STYLES[dayType] && "text-foreground hover:bg-muted/60 rounded-full",
                isFuture && dayType === "none" && "text-muted-foreground"
              )}
            >
              <span className="text-xs font-medium leading-none">{format(date, "d")}</span>
              {/* Flow dot indicator */}
              {log?.flow && (
                <div className={cn(
                  "absolute bottom-0.5 w-1 h-1 rounded-full",
                  dayType === "period" ? "bg-white/70" : "bg-rose-500"
                )} />
              )}
              {/* Symptom indicator */}
              {(log?.symptoms?.length ?? 0) > 0 && !log?.flow && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: "bg-rose-500", label: "Period" },
    { color: "bg-rose-200", label: "Predicted" },
    { color: "bg-purple-500", label: "Ovulation" },
    { color: "bg-purple-100 border border-purple-300", label: "Fertile" },
    { color: "bg-amber-100 border border-amber-300", label: "PMS" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={cn("w-3 h-3 rounded-full", color)} />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ icon: Icon, label, value, sub, color }: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="journal-page p-4 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-4 h-4", color)} />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn("text-2xl font-serif font-semibold", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MenstrualTrackerPage() {
  const [data, setData] = useState<TrackerData>(loadData);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [logModalDate, setLogModalDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "log" | "insights">("calendar");
  const [showSettings, setShowSettings] = useState(false);
  const [cycleLen, setCycleLen] = useState(String(data.cycleLength));
  const [periodLen, setPeriodLen] = useState(String(data.periodLength));

  useEffect(() => { saveData(data); }, [data]);

  const cycleInfo = useMemo(() => analyzeCycles(data), [data]);

  function upsertLog(log: DayLog) {
    setData(d => {
      const existing = d.logs.findIndex(l => l.date === log.date);
      const logs = existing >= 0
        ? d.logs.map((l, i) => i === existing ? log : l)
        : [...d.logs, log];
      return { ...d, logs };
    });
  }

  function deleteLog(date: string) {
    setData(d => ({ ...d, logs: d.logs.filter(l => l.date !== date) }));
  }

  function saveSettings() {
    const cl = parseInt(cycleLen) || 28;
    const pl = parseInt(periodLen) || 5;
    setData(d => ({ ...d, cycleLength: Math.min(Math.max(cl, 20), 45), periodLength: Math.min(Math.max(pl, 2), 10) }));
    setShowSettings(false);
  }

  const todayLog = data.logs.find(l => l.date === format(new Date(), "yyyy-MM-dd"));
  const selectedLog = selectedDate
    ? data.logs.find(l => l.date === format(selectedDate, "yyyy-MM-dd"))
    : undefined;

  // Days until next period
  const daysUntilPeriod = cycleInfo.nextPeriodStart
    ? differenceInDays(cycleInfo.nextPeriodStart, startOfDay(new Date()))
    : null;

  // Recent logs sorted newest first
  const recentLogs = [...data.logs]
    .filter(l => l.flow || l.symptoms.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <style>{`
        .period-gradient {
          background: linear-gradient(135deg, hsl(347,80%,95%) 0%, hsl(338,80%,88%) 100%);
        }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Droplets className="w-7 h-7 text-rose-500" />
            Cycle Tracker
          </h1>
          <p className="text-muted-foreground font-serif italic text-sm">
            Know your body. Honor every phase.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/50 hover:border-border"
        >
          Settings
        </button>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="journal-page p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-semibold text-foreground">Cycle Settings</h3>
            <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cycle Length (days)
              </label>
              <input
                type="number" min="20" max="45"
                value={cycleLen}
                onChange={e => setCycleLen(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground/60">Typical: 21–35 days</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Period Length (days)
              </label>
              <input
                type="number" min="2" max="10"
                value={periodLen}
                onChange={e => setPeriodLen(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground/60">Typical: 3–7 days</p>
            </div>
          </div>
          <Button onClick={saveSettings} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
            Save Settings
          </Button>
        </div>
      )}

      {/* Current phase banner */}
      {cycleInfo.currentPhase && (
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-4",
          PHASE_INFO[cycleInfo.currentPhase].bg
        )}>
          <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
            {cycleInfo.currentPhase === "period" && <Droplets className="w-6 h-6 text-rose-500" />}
            {cycleInfo.currentPhase === "follicular" && <Sun className="w-6 h-6 text-sky-500" />}
            {(cycleInfo.currentPhase === "fertile" || cycleInfo.currentPhase === "ovulation") && <Zap className="w-6 h-6 text-purple-500" />}
            {cycleInfo.currentPhase === "luteal" && <Moon className="w-6 h-6 text-indigo-500" />}
            {cycleInfo.currentPhase === "pms" && <Activity className="w-6 h-6 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn("text-sm font-semibold", PHASE_INFO[cycleInfo.currentPhase].color)}>
                {PHASE_INFO[cycleInfo.currentPhase].label}
              </p>
              {cycleInfo.currentCycleDay && (
                <span className="text-[10px] text-muted-foreground bg-white/60 px-2 py-0.5 rounded-full">
                  Day {cycleInfo.currentCycleDay}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              {PHASE_INFO[cycleInfo.currentPhase].desc}
            </p>
          </div>
          {/* Log today shortcut */}
          <Button
            size="sm"
            onClick={() => setLogModalDate(new Date())}
            className="bg-rose-500 hover:bg-rose-600 text-white shrink-0 h-8 text-xs gap-1"
          >
            <Plus className="w-3 h-3" /> Log
          </Button>
        </div>
      )}

      {/* No data yet */}
      {cycleInfo.cycleStarts.length === 0 && !cycleInfo.currentPhase && (
        <div className="rounded-2xl border-2 border-dashed border-rose-200 p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
            <Droplets className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <p className="font-serif font-semibold text-foreground">Start tracking your cycle</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap any date on the calendar to log your period. Predictions will appear after your first entry.
            </p>
          </div>
          <Button
            onClick={() => setLogModalDate(new Date())}
            className="bg-rose-500 hover:bg-rose-600 text-white gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log Today
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-muted/50 rounded-xl p-1">
        {(["calendar", "log", "insights"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "log" ? "History" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── CALENDAR TAB ── */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="font-serif font-semibold text-lg text-foreground">
              {format(calendarMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="journal-page p-4">
            <CycleCalendar
              month={calendarMonth}
              cycleInfo={cycleInfo}
              logs={data.logs}
              onSelectDay={date => {
                setSelectedDate(date);
                setLogModalDate(date);
              }}
              selectedDate={selectedDate}
            />
          </div>

          {/* Legend */}
          <Legend />

          {/* Upcoming predictions */}
          {cycleInfo.nextPeriodStart && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Upcoming
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    label: "Next Period",
                    date: cycleInfo.nextPeriodStart,
                    days: daysUntilPeriod,
                    color: "text-rose-600",
                    bg: "bg-rose-50 border-rose-200",
                    dot: "bg-rose-500",
                  },
                  cycleInfo.ovulationDate && {
                    label: "Ovulation",
                    date: cycleInfo.ovulationDate,
                    days: differenceInDays(cycleInfo.ovulationDate, startOfDay(new Date())),
                    color: "text-purple-600",
                    bg: "bg-purple-50 border-purple-200",
                    dot: "bg-purple-500",
                  },
                  cycleInfo.fertileStart && {
                    label: "Fertile Window",
                    date: cycleInfo.fertileStart,
                    days: differenceInDays(cycleInfo.fertileStart, startOfDay(new Date())),
                    color: "text-indigo-600",
                    bg: "bg-indigo-50 border-indigo-200",
                    dot: "bg-indigo-400",
                  },
                ].filter(Boolean).map((item) => {
                  if (!item) return null;
                  const daysNum = item.days ?? 0;
                  return (
                    <div
                      key={item.label}
                      className={cn("rounded-xl border p-3 space-y-1", item.bg)}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full", item.dot)} />
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      </div>
                      <p className={cn("text-lg font-serif font-semibold", item.color)}>
                        {daysNum === 0 ? "Today"
                          : daysNum < 0 ? `${Math.abs(daysNum)}d ago`
                          : `In ${daysNum}d`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(item.date, "MMM d")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === "log" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Recent Entries</p>
            <Button
              size="sm"
              onClick={() => setLogModalDate(new Date())}
              className="gap-1 bg-rose-500 hover:bg-rose-600 text-white h-7 text-xs"
            >
              <Plus className="w-3 h-3" /> Log Today
            </Button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
                <Calendar className="w-7 h-7 text-rose-400" />
              </div>
              <p className="text-sm text-muted-foreground">No entries yet. Start logging to see your history.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => {
                const date = parseISO(log.date);
                const moodItem = log.mood ? MOODS.find(m => m.id === log.mood) : null;
                return (
                  <button
                    key={log.date}
                    onClick={() => setLogModalDate(date)}
                    className="w-full journal-page p-4 flex items-center gap-3 hover:shadow-sm transition-shadow text-left"
                  >
                    {/* Date badge */}
                    <div className="w-10 text-center shrink-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {format(date, "MMM")}
                      </p>
                      <p className="text-xl font-serif font-semibold text-foreground leading-tight">
                        {format(date, "d")}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{format(date, "EEE")}</p>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Flow */}
                      {log.flow && (
                        <div className="flex items-center gap-2">
                          <FlowDots level={log.flow} />
                          <span className="text-xs font-medium text-rose-600">
                            {FLOW_CONFIG[log.flow].label}
                          </span>
                        </div>
                      )}

                      {/* Symptoms */}
                      {log.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {log.symptoms.slice(0, 4).map(sId => {
                            const s = SYMPTOMS.find(x => x.id === sId);
                            return s ? (
                              <span key={sId} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                                {s.emoji} {s.label}
                              </span>
                            ) : null;
                          })}
                          {log.symptoms.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{log.symptoms.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Note preview */}
                      {log.notes && (
                        <p className="text-xs text-muted-foreground italic truncate">{log.notes}</p>
                      )}
                    </div>

                    {/* Mood */}
                    {moodItem && (
                      <span className="text-xl shrink-0">{moodItem.emoji}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              icon={TrendingUp}
              label="Avg Cycle"
              value={`${cycleInfo.avgCycleLength} days`}
              sub={cycleInfo.cycleStarts.length >= 2 ? `Based on ${cycleInfo.cycleStarts.length - 1} cycles` : "Using your setting"}
              color="text-rose-600"
            />
            <InsightCard
              icon={Droplets}
              label="Avg Period"
              value={`${cycleInfo.avgPeriodLength} days`}
              sub="Duration"
              color="text-rose-500"
            />
            <InsightCard
              icon={Calendar}
              label="Cycles Tracked"
              value={String(cycleInfo.cycleStarts.length)}
              sub={`${data.logs.filter(l => l.flow).length} days logged`}
              color="text-purple-600"
            />
            <InsightCard
              icon={Activity}
              label="Next Period"
              value={daysUntilPeriod !== null
                ? daysUntilPeriod === 0 ? "Today"
                : daysUntilPeriod < 0 ? "Late"
                : `${daysUntilPeriod}d`
                : "—"}
              sub={cycleInfo.nextPeriodStart ? format(cycleInfo.nextPeriodStart, "MMM d") : "Log a period first"}
              color={
                daysUntilPeriod !== null && daysUntilPeriod <= 3 ? "text-rose-600" : "text-amber-600"
              }
            />
          </div>

          {/* Most common symptoms */}
          {data.logs.some(l => l.symptoms.length > 0) && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Most Logged Symptoms
              </p>
              {(() => {
                const counts: Record<string, number> = {};
                data.logs.forEach(l => l.symptoms.forEach(s => { counts[s] = (counts[s] ?? 0) + 1; }));
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
                const max = sorted[0]?.[1] ?? 1;
                return (
                  <div className="journal-page p-4 space-y-2.5">
                    {sorted.map(([sId, count]) => {
                      const s = SYMPTOMS.find(x => x.id === sId);
                      if (!s) return null;
                      const pct = (count / max) * 100;
                      return (
                        <div key={sId} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-foreground flex items-center gap-1.5">
                              {s.emoji} {s.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{count}×</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Mood distribution */}
          {data.logs.some(l => l.mood) && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mood Patterns
              </p>
              <div className="journal-page p-4">
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const counts: Record<string, number> = {};
                    data.logs.forEach(l => { if (l.mood) counts[l.mood] = (counts[l.mood] ?? 0) + 1; });
                    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([mId, count]) => {
                      const m = MOODS.find(x => x.id === mId);
                      if (!m) return null;
                      return (
                        <div key={mId} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
                          <span>{m.emoji}</span>
                          <span className="text-xs font-medium text-foreground">{m.label}</span>
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Cycle health tip */}
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-sm font-semibold text-rose-800">Cycle Wellness Tip</p>
            </div>
            <p className="text-xs text-rose-700/80 leading-relaxed">
              {cycleInfo.currentPhase === "follicular"
                ? "Your energy is building. Great time to exercise, start new projects, and try new foods. Your body is preparing for ovulation."
                : cycleInfo.currentPhase === "fertile" || cycleInfo.currentPhase === "ovulation"
                ? "Peak estrogen means peak energy and social confidence. Take advantage of your natural glow — this is your power week."
                : cycleInfo.currentPhase === "luteal"
                ? "Progesterone rises in this phase. Focus on nourishing foods, lighter exercise, and preparing for your period."
                : cycleInfo.currentPhase === "pms"
                ? "Be extra gentle with yourself. Reduce sugar, caffeine, and salt. Magnesium-rich foods can help ease PMS symptoms."
                : cycleInfo.currentPhase === "period"
                ? "Rest is productive. Your body is doing significant work. Stay hydrated, keep warm, and honor what you need."
                : "Track your period to unlock personalized cycle health tips."}
            </p>
          </div>

          {data.logs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Log at least one cycle to see personalized insights.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Log Day Modal */}
      {logModalDate && (
        <LogDayModal
          date={logModalDate}
          existing={data.logs.find(l => l.date === format(logModalDate, "yyyy-MM-dd"))}
          onSave={log => {
            upsertLog(log);
            setLogModalDate(null);
            setSelectedDate(logModalDate);
          }}
          onDelete={() => {
            deleteLog(format(logModalDate, "yyyy-MM-dd"));
            setLogModalDate(null);
          }}
          onClose={() => setLogModalDate(null)}
        />
      )}
    </div>
  );
}
