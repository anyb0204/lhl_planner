import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useReminders } from "@/contexts/RemindersContext";
import type { Reminder } from "@workspace/api-client-react";

const urgencyColor: Record<Reminder["urgency"], string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low: "text-primary bg-primary/5 border-primary/20",
};

const typeIcon: Record<Reminder["type"], string> = {
  appointment: "🏥",
  refill: "💊",
  bill: "📋",
};

export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { active, count, dismiss, dismissAll } = useReminders();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative transition-colors",
            compact
              ? "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-md shrink-0 min-w-[58px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              : "flex items-center gap-3 px-4 py-3 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium w-full"
          )}
          aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
        >
          <span className="relative">
            <Bell className={compact ? "h-4 w-4" : "h-[18px] w-[18px] text-sidebar-foreground/60"} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </span>
          {compact ? (
            <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">Alerts</span>
          ) : (
            <span>Notifications</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0 bg-card border-border/60 shadow-xl"
        sideOffset={8}
      >
        <div className="p-4 border-b border-border/50 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-base font-medium text-foreground">
              Notifications {count > 0 && <span className="text-primary">({count})</span>}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Reminders for upcoming items</p>
          </div>
          {count > 0 && (
            <button
              onClick={dismissAll}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5 underline underline-offset-2"
            >
              Dismiss all
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-2xl">✨</p>
            <p className="font-serif text-sm text-foreground/70">You're all caught up!</p>
            <p className="text-xs text-muted-foreground">No upcoming reminders</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {active.map(n => (
              <div key={n.id} className="relative group">
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex gap-3 p-3 pr-8 hover:bg-accent/30 transition-colors cursor-pointer border-l-2",
                    urgencyColor[n.urgency]
                  )}
                >
                  <span className="text-base shrink-0 mt-0.5">{typeIcon[n.type]}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.subtitle}</p>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(n.id); }}
                  title="Dismiss"
                  className="absolute top-2 right-2 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-border/40 text-center">
          <p className="text-[10px] text-muted-foreground/60">Appointments · refills · bills</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
