import { useState, useEffect, useRef } from "react";
import { Search, X, CheckSquare, BookHeart, Flame, BookOpen } from "lucide-react";
import { useListTodos, useListPrayers, useListHabits } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  type: "todo" | "prayer" | "habit";
  title: string;
  sub?: string;
  href: string;
};

const TYPE_META = {
  todo:   { label: "Task",    icon: CheckSquare, color: "text-blue-600" },
  prayer: { label: "Prayer",  icon: BookHeart,   color: "text-purple-600" },
  habit:  { label: "Habit",   icon: Flame,       color: "text-amber-600" },
};

type Props = { open: boolean; onClose: () => void };

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const { data: todos = [] } = useListTodos();
  const { data: prayers = [] } = useListPrayers();
  const { data: habits = [] } = useListHabits();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) return;
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const results: Result[] = q
    ? [
        ...(todos as { id: number; text: string; notes?: string | null; completed: boolean }[])
          .filter(t => t.text.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
          .map(t => ({
            id: `todo-${t.id}`, type: "todo" as const,
            title: t.text,
            sub: t.completed ? "Completed" : "Active",
            href: "/tasks",
          })),
        ...(prayers as { id: number; body: string; title?: string | null; answered: boolean }[])
          .filter(p => p.body.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))
          .map(p => ({
            id: `prayer-${p.id}`, type: "prayer" as const,
            title: p.title || p.body.slice(0, 60),
            sub: p.answered ? "Answered" : "Active",
            href: "/prayer-journal",
          })),
        ...(habits as { id: number; name: string; description?: string | null }[])
          .filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q))
          .map(h => ({
            id: `habit-${h.id}`, type: "habit" as const,
            title: h.name,
            sub: h.description ?? undefined,
            href: "/habits",
          })),
      ].slice(0, 12)
    : [];

  const handleSelect = (result: Result) => {
    setLocation(result.href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, prayers, habits…"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none text-sm"
          />
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded border border-border font-mono hidden sm:block">ESC</kbd>
            <button onClick={onClose} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {q === "" ? (
            <div className="p-6 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-primary/30 mx-auto" />
              <p className="text-sm text-muted-foreground font-serif italic">Type to search across your tasks, prayers, and habits</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
            </div>
          ) : (
            <ul>
              {results.map(result => {
                const meta = TYPE_META[result.type];
                return (
                  <li key={result.id}>
                    <button
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                    >
                      <meta.icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{result.title}</p>
                        {result.sub && <p className="text-xs text-muted-foreground">{result.sub}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0 bg-muted px-1.5 py-0.5 rounded">{meta.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground/50">Press ↵ to open · ESC to close</p>
        </div>
      </div>
    </div>
  );
}
