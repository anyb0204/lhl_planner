import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import { useListReminders } from "@workspace/api-client-react";
import type { Reminder } from "@workspace/api-client-react";

const DISMISS_KEY = "lhl-dismissed-reminders";

function getSessionDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveSessionDismissed(ids: Set<string>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids])); } catch {}
}

interface RemindersContextValue {
  all: Reminder[];
  active: Reminder[];
  count: number;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const RemindersContext = createContext<RemindersContextValue>({
  all: [],
  active: [],
  count: 0,
  dismiss: () => undefined,
  dismissAll: () => undefined,
});

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Set<string>>(getSessionDismissed);
  const { data: reminders = [] } = useListReminders();

  const active = reminders.filter(r => !dismissed.has(r.id));

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveSessionDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const ids = new Set(reminders.map(r => r.id));
    setDismissed(ids);
    saveSessionDismissed(ids);
  }, [reminders]);

  return (
    <RemindersContext.Provider value={{ all: reminders, active, count: active.length, dismiss, dismissAll }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  return useContext(RemindersContext);
}
