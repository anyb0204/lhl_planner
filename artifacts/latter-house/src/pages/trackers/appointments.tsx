import { useState } from "react";
import {
  useListHealthAppointments,
  useCreateHealthAppointment,
  useUpdateHealthAppointment,
  useDeleteHealthAppointment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, CalendarCheck, Pencil, X, Check, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isBefore, startOfToday } from "date-fns";

type ApptForm = {
  person: string;
  doctor: string;
  specialty: string;
  appointmentDate: string;
  location: string;
  notes: string;
  questions: string;
};

const emptyForm = (): ApptForm => ({
  person: "",
  doctor: "",
  specialty: "",
  appointmentDate: "",
  location: "",
  notes: "",
  questions: "",
});

export default function AppointmentsTracker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ApptForm>(emptyForm());

  const { data: appointments, isLoading } = useListHealthAppointments();
  const create = useCreateHealthAppointment();
  const update = useUpdateHealthAppointment();
  const del = useDeleteHealthAppointment();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listHealthAppointments"] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person.trim() && !form.doctor.trim() && !form.appointmentDate) return;

    const payload = {
      person: form.person,
      doctor: form.doctor,
      specialty: form.specialty || null,
      appointmentDate: form.appointmentDate,
      location: form.location || null,
      notes: form.notes || null,
      questions: form.questions || null,
    };

    if (editingId !== null) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't update appointment", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(emptyForm()); },
        onError: () => toast({ title: "Couldn't add appointment", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (appt: NonNullable<typeof appointments>[number]) => {
    setForm({
      person: appt.person,
      doctor: appt.doctor,
      specialty: appt.specialty ?? "",
      appointmentDate: appt.appointmentDate,
      location: appt.location ?? "",
      notes: appt.notes ?? "",
      questions: appt.questions ?? "",
    });
    setEditingId(appt.id);
    setShowForm(true);
  };

  const handleToggleComplete = (appt: NonNullable<typeof appointments>[number]) => {
    update.mutate({ id: appt.id, data: { completed: !appt.completed } }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't update appointment", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    del.mutate({ id }, {
      onSuccess: () => invalidate(),
      onError: () => toast({ title: "Couldn't delete appointment", variant: "destructive" }),
    });
  };

  const today = startOfToday();
  const upcoming = appointments?.filter(a => !a.completed && !isBefore(parseISO(a.appointmentDate), today)) ?? [];
  const past = appointments?.filter(a => a.completed || isBefore(parseISO(a.appointmentDate), today)) ?? [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Appointments</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">All appointments — medical, legal, personal, and more</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Appointment
          </Button>
        )}
      </header>

      {showForm && (
        <section className="journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <h2 className="font-serif text-xl font-medium text-foreground">
            {editingId !== null ? "Edit Appointment" : "New Appointment"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">For (Person) *</label>
                <Input value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} placeholder="e.g. Me, Mom, Husband..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Provider / Contact</label>
                <Input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} placeholder="Dr. Williams, Attorney Jones..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category / Type</label>
                <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Medical, Legal, Financial, Dental..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Appointment Date *</label>
                <Input type="date" value={form.appointmentDate} onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Location / Address</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Office address, telehealth link, or phone number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Questions / Items to Discuss</label>
              <Textarea value={form.questions} onChange={e => setForm(f => ({ ...f, questions: e.target.value }))} placeholder="Questions you want to remember to ask..." className="min-h-[80px] resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What to bring, insurance info, follow-up reminders..." className="min-h-[80px] resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={(!form.person.trim() && !form.doctor.trim() && !form.appointmentDate) || create.isPending || update.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {(create.isPending || update.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {editingId !== null ? "Save Changes" : "Add Appointment"}
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
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-primary font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map(appt => (
                  <AppointmentCard key={appt.id} appt={appt} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Past / Completed</h2>
              <div className="space-y-3 opacity-60">
                {past.map(appt => (
                  <AppointmentCard key={appt.id} appt={appt} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} />
                ))}
              </div>
            </div>
          )}

          {!appointments || appointments.length === 0 ? (
            <div className="journal-page p-12 text-center space-y-3">
              <CalendarCheck className="w-10 h-10 text-primary/30 mx-auto" />
              <p className="font-serif text-lg text-muted-foreground">No appointments yet</p>
              <p className="text-sm text-muted-foreground/60">Track appointments of any kind — medical, legal, financial, personal, and more</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Appt = {
  id: number;
  person: string;
  doctor: string;
  specialty?: string | null;
  appointmentDate: string;
  location?: string | null;
  notes?: string | null;
  questions?: string | null;
  completed: boolean;
  createdAt: string;
};

function AppointmentCard({ appt, onEdit, onDelete, onToggle }: {
  appt: Appt;
  onEdit: (a: Appt) => void;
  onDelete: (id: number) => void;
  onToggle: (a: Appt) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`journal-page p-4 space-y-2 ${appt.completed ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              <User className="w-3 h-3" /> {appt.person}
            </span>
            {appt.specialty && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{appt.specialty}</span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {format(parseISO(appt.appointmentDate), "MMM d, yyyy")}
            </span>
          </div>
          <h3 className="font-serif text-base font-medium text-foreground mt-1">{appt.doctor}</h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Mark complete" onClick={() => onToggle(appt)}>
            <Check className={`h-3.5 w-3.5 ${appt.completed ? 'text-primary' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(appt)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(appt.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {appt.location && <p className="text-xs text-muted-foreground">{appt.location}</p>}

      {(appt.questions || appt.notes) && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:text-primary/80 transition-colors">
          {expanded ? "Hide details" : "Show questions & notes"}
        </button>
      )}

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
          {appt.questions && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Questions / Items to Discuss</p>
              <p className="text-sm font-serif italic text-foreground/80">{appt.questions}</p>
            </div>
          )}
          {appt.notes && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground/80">{appt.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
