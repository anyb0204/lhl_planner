import { useState, useEffect, useCallback } from "react";
import { Brain, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Memory {
  id: number;
  kind: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const KIND_LABELS: Record<string, string> = {
  preference: "Preference",
  goal: "Goal",
  prayer_request: "Prayer",
  answered_prayer: "Answered Prayer",
  struggle: "Struggle",
  fact: "About Me",
};

export function MemoryCard() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [enabled, setEnabled] = useState(() => localStorage.getItem("lhl-memory-enabled") !== "false");
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      if (!res.ok) return;
      const data = await res.json() as Memory[];
      setMemories(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/memories/${id}`, { method: "DELETE" });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch { /* ignore */ }
  };

  const handleEdit = async (id: number) => {
    if (!editContent.trim()) return;
    try {
      await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent.trim() } : m));
      setEditingId(null);
    } catch { /* ignore */ }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem("lhl-memory-enabled", String(checked));
  };

  if (!enabled && memories.length === 0) {
    return (
      <div className="rounded-xl border p-5 space-y-3" style={{ background: "hsl(43,45%,95%)", borderColor: "hsl(43,40%,78%)" }}>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: "hsl(43,52%,50%)" }} />
          <span className="text-[13.5px] font-semibold" style={{ color: "hsl(43,45%,24%)" }}>What I remember</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Allow the companion to remember our conversations</p>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border p-5 space-y-3" style={{ background: "hsl(43,45%,95%)", borderColor: "hsl(43,40%,78%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: "hsl(43,52%,50%)" }} />
            <span className="text-[13.5px] font-semibold" style={{ color: "hsl(43,45%,24%)" }}>What I remember</span>
          </div>
          <button
            onClick={() => setManageOpen(true)}
            className="text-xs underline underline-offset-2"
            style={{ color: "hsl(43,52%,50%)" }}
          >
            Manage
          </button>
        </div>

        {memories.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: "hsl(43,45%,40%)" }}>
            Nothing remembered yet. Keep chatting and I'll learn what matters to you.
          </p>
        ) : (
          <ul className="space-y-1">
            {memories.slice(0, 6).map(m => (
              <li key={m.id} className="flex items-start gap-2 text-[12.5px]" style={{ color: "hsl(43,45%,24%)" }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(43,52%,50%)" }} />
                <span>{m.content}</span>
              </li>
            ))}
            {memories.length > 6 && (
              <li className="text-[11px] text-muted-foreground pl-3.5">+ {memories.length - 6} more…</li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "hsl(43,40%,84%)" }}>
          <p className="text-[11.5px]" style={{ color: "hsl(43,45%,40%)" }}>Allow the companion to remember our conversations</p>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Manage memories</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {memories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No memories yet.</p>
            )}
            {memories.map(m => (
              <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 group">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {KIND_LABELS[m.kind] ?? m.kind}
                  </span>
                  {editingId === m.id ? (
                    <div className="flex gap-1.5 mt-1">
                      <Input
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="text-xs h-7"
                        onKeyDown={e => { if (e.key === "Enter") handleEdit(m.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => handleEdit(m.id)} className="text-emerald-600 hover:text-emerald-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-foreground/80 mt-0.5">{m.content}</p>
                  )}
                </div>
                {editingId !== m.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(m.id); setEditContent(m.content); }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setManageOpen(false)} className="w-full mt-2">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
