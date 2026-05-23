import { useState } from "react";
import {
  useListMedications,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Pill, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const TIME_OPTIONS = ["Morning", "Noon", "Evening", "Bedtime", "With Food", "As Needed"];

type MedForm = {
  name: string;
  dose: string;
  times: string[];
  asNeeded: boolean;
  notes: string;
  refillDate: string;
  doctor: string;
};

const emptyForm = (): MedForm => ({
  name: "",
  dose: "",
  times: [],
  asNeeded: false,
  notes: "",
  refillDate: "",
  doctor: "",
});

export default function MedicationsTracker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MedForm>(emptyForm());

  const { data: medications, isLoading } = useListMedications();
  const createMed = useCreateMedication();
  const updateMed = useUpdateMedication();
  const deleteMed = useDeleteMedication();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listMedications"] });

  const handleTimeToggle = (time: string) => {
    setForm(f => ({
      ...f,
      times: f.times.includes(time) ? f.times.filter(t => t !== time) : [...f.times, time],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name,
      dose: form.dose || null,
      times: form.times.length > 0 ? form.times.join(", ") : null,
      asNeeded: form.asNeeded,
      notes: form.notes || null,
      refillDate: form.refillDate || null,
      doctor: form.doctor || null,
    };

    if (editingId !== null) {
      updateMed.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't update medication", variant: "destructive" }),
      });
    } else {
      createMed.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't add medication", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (med: NonNullable<typeof medications>[number]) => {
    setForm({
      name: med.name,
      dose: med.dose ?? "",
      times: med.times ? med.times.split(", ") : [],
      asNeeded: med.asNeeded,
      notes: med.notes ?? "",
      refillDate: med.refillDate ?? "",
      doctor: med.doctor ?? "",
    });
    setEditingId(med.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    deleteMed.mutate({ id }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't delete medication", variant: "destructive" }),
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Pill className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Medications</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">Your medication schedule at a glance</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Medication
          </Button>
        )}
      </header>

      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium text-foreground">
            {editingId !== null ? "Edit Medication" : "New Medication"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Medication Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Metformin" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Dose</label>
                <Input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 500mg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Prescribing Doctor</label>
                <Input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} placeholder="Dr. Smith" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Refill Date</label>
                <Input type="date" value={form.refillDate} onChange={e => setForm(f => ({ ...f, refillDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">When to Take</label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeToggle(time)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      form.times.includes(time)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.asNeeded}
                onCheckedChange={(c) => setForm(f => ({ ...f, asNeeded: c as boolean }))}
                className="border-primary/40 data-[state=checked]:bg-primary"
              />
              <label className="text-sm text-foreground">Take as needed (PRN)</label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes / Instructions</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Take with food, avoid grapefruit..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!form.name.trim() || createMed.isPending || updateMed.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {(createMed.isPending || updateMed.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {editingId !== null ? "Save Changes" : "Add Medication"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
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
      ) : medications && medications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map(med => (
            <div key={med.id} className="journal-page p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-lg font-medium text-foreground">{med.name}</h3>
                  {med.dose && <p className="text-sm text-primary font-medium">{med.dose}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit(med)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(med.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {med.times && (
                <div className="flex flex-wrap gap-1.5">
                  {med.times.split(", ").map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{t}</span>
                  ))}
                </div>
              )}

              {med.asNeeded && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">As Needed (PRN)</span>
              )}

              {(med.doctor || med.refillDate) && (
                <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                  {med.doctor && <p>Dr: {med.doctor}</p>}
                  {med.refillDate && <p>Refill: {med.refillDate}</p>}
                </div>
              )}

              {med.notes && (
                <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">{med.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="journal-page p-12 text-center space-y-3">
          <Pill className="w-10 h-10 text-primary/30 mx-auto" />
          <p className="font-serif text-lg text-muted-foreground">No medications added yet</p>
          <p className="text-sm text-muted-foreground/60">Keep track of your medications and those of your family</p>
        </div>
      )}
    </div>
  );
}
