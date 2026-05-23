import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Activity, Pencil, X, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Condition = {
  id: number;
  name: string;
  person: string | null;
  status: string;
  diagnosedDate: string | null;
  doctor: string | null;
  severity: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ConditionForm = {
  name: string;
  person: string;
  status: string;
  diagnosedDate: string;
  doctor: string;
  severity: string;
  notes: string;
};

const emptyForm = (): ConditionForm => ({
  name: "",
  person: "",
  status: "active",
  diagnosedDate: "",
  doctor: "",
  severity: "",
  notes: "",
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-red-100 text-red-700 border-red-200" },
  managed: { label: "Managed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-200" },
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

async function fetchConditions(): Promise<Condition[]> {
  const res = await fetch("/api/trackers/conditions");
  if (!res.ok) throw new Error("Failed to fetch conditions");
  return res.json();
}

async function createCondition(data: ConditionForm): Promise<Condition> {
  const res = await fetch("/api/trackers/conditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      person: data.person || null,
      status: data.status,
      diagnosedDate: data.diagnosedDate || null,
      doctor: data.doctor || null,
      severity: data.severity || null,
      notes: data.notes || null,
    }),
  });
  if (!res.ok) throw new Error("Failed to create condition");
  return res.json();
}

async function updateCondition(id: number, data: Partial<ConditionForm>): Promise<Condition> {
  const res = await fetch(`/api/trackers/conditions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      person: data.person || null,
      status: data.status,
      diagnosedDate: data.diagnosedDate || null,
      doctor: data.doctor || null,
      severity: data.severity || null,
      notes: data.notes || null,
    }),
  });
  if (!res.ok) throw new Error("Failed to update condition");
  return res.json();
}

async function deleteCondition(id: number): Promise<void> {
  const res = await fetch(`/api/trackers/conditions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete condition");
}

export default function HealthConditions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ConditionForm>(emptyForm());

  const { data: conditions, isLoading } = useQuery({
    queryKey: ["healthConditions"],
    queryFn: fetchConditions,
  });

  const createMut = useMutation({
    mutationFn: createCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthConditions"] });
      setShowForm(false);
      setForm(emptyForm());
    },
    onError: () => toast({ title: "Couldn't add condition", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConditionForm> }) => updateCondition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthConditions"] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: () => toast({ title: "Couldn't update condition", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCondition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["healthConditions"] }),
    onError: () => toast({ title: "Couldn't delete condition", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId !== null) {
      updateMut.mutate({ id: editingId, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleEdit = (c: Condition) => {
    setForm({
      name: c.name,
      person: c.person ?? "",
      status: c.status,
      diagnosedDate: c.diagnosedDate ?? "",
      doctor: c.doctor ?? "",
      severity: c.severity ?? "",
      notes: c.notes ?? "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const active = conditions?.filter(c => c.status === "active") ?? [];
  const managed = conditions?.filter(c => c.status === "managed") ?? [];
  const resolved = conditions?.filter(c => c.status === "resolved") ?? [];

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Health Conditions</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">Track ongoing conditions and health history for you and your family</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Condition
          </Button>
        )}
      </header>

      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium text-foreground">
            {editingId !== null ? "Edit Condition" : "New Condition"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Condition Name *</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Anxiety..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">For (Person)</label>
                <Input value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} placeholder="e.g. Me, Mom, Husband..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Active</option>
                  <option value="managed">Managed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Diagnosed Date</label>
                <Input type="date" value={form.diagnosedDate} onChange={e => setForm(f => ({ ...f, diagnosedDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Doctor / Specialist</label>
                <Input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} placeholder="Dr. Smith" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Severity</label>
                <select
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Not specified —</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (treatments, medications, reminders)</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Current treatment, medications, next steps, or anything to remember..."
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!form.name.trim() || isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {editingId !== null ? "Save Changes" : "Add Condition"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <ConditionGroup title="Active" conditions={active} onEdit={handleEdit} onDelete={id => deleteMut.mutate(id)} />
          )}
          {managed.length > 0 && (
            <ConditionGroup title="Managed" conditions={managed} onEdit={handleEdit} onDelete={id => deleteMut.mutate(id)} />
          )}
          {resolved.length > 0 && (
            <ConditionGroup title="Resolved" conditions={resolved} onEdit={handleEdit} onDelete={id => deleteMut.mutate(id)} dimmed />
          )}

          {!conditions || conditions.length === 0 ? (
            <div className="journal-page p-12 text-center space-y-3">
              <Activity className="w-10 h-10 text-primary/30 mx-auto" />
              <p className="font-serif text-lg text-muted-foreground">No health conditions recorded</p>
              <p className="text-sm text-muted-foreground/60">Track conditions, diagnoses, and health history for you and your family</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ConditionGroup({
  title,
  conditions,
  onEdit,
  onDelete,
  dimmed = false,
}: {
  title: string;
  conditions: Condition[];
  onEdit: (c: Condition) => void;
  onDelete: (id: number) => void;
  dimmed?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-primary font-medium">{title}</h2>
      <div className={`space-y-3 ${dimmed ? "opacity-60" : ""}`}>
        {conditions.map(c => (
          <ConditionCard key={c.id} condition={c} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function ConditionCard({ condition: c, onEdit, onDelete }: {
  condition: Condition;
  onEdit: (c: Condition) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LABELS[c.status] ?? STATUS_LABELS.active;

  return (
    <div className="journal-page p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {c.person && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                <User className="w-3 h-3" /> {c.person}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
              {status.label}
            </span>
            {c.severity && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {SEVERITY_LABELS[c.severity] ?? c.severity}
              </span>
            )}
          </div>
          <h3 className="font-serif text-base font-medium text-foreground mt-1">{c.name}</h3>
          {c.doctor && <p className="text-xs text-muted-foreground mt-0.5">{c.doctor}</p>}
          {c.diagnosedDate && (
            <p className="text-xs text-muted-foreground/70">Diagnosed: {c.diagnosedDate}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(c)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(c.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {c.notes && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:text-primary/80 transition-colors">
            {expanded ? "Hide notes" : "Show notes"}
          </button>
          {expanded && (
            <div className="pt-1 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{c.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
