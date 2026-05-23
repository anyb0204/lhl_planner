import { useState, useEffect, useRef } from "react";
import {
  useListFinancialEntries,
  useCreateFinancialEntry,
  useDeleteFinancialEntry,
  getListFinancialEntriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, DollarSign, X, Check, Heart, TrendingUp, TrendingDown, Gift, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type EntryType = "income" | "expense" | "tithe" | "giving" | "savings";

const TYPE_CONFIG: Record<EntryType, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  income: { label: "Income", color: "text-green-700", bg: "bg-green-100", icon: TrendingUp },
  expense: { label: "Expense", color: "text-red-600", bg: "bg-red-100", icon: TrendingDown },
  tithe: { label: "Tithe", color: "text-primary", bg: "bg-primary/10", icon: Heart },
  giving: { label: "Giving / Offering", color: "text-primary", bg: "bg-primary/10", icon: Gift },
  savings: { label: "Savings", color: "text-blue-600", bg: "bg-blue-100", icon: TrendingUp },
};

type FinForm = {
  date: string;
  type: EntryType;
  amount: string;
  description: string;
  category: string;
};

const todayInput = () => new Date().toLocaleDateString("en-CA");

const emptyForm = (): FinForm => ({
  date: todayInput(),
  type: "expense",
  amount: "",
  description: "",
  category: "",
});

const storageKey = (month: string) => `lhl-starting-balance-${month}`;

export default function FinancialTracker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FinForm>(emptyForm());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const [startingBalance, setStartingBalance] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey(format(new Date(), "yyyy-MM")));
    return saved ? parseFloat(saved) : 0;
  });
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(selectedMonth));
    setStartingBalance(saved ? parseFloat(saved) : 0);
  }, [selectedMonth]);

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm]);

  const openForm = (type: EntryType) => {
    setForm((f) => ({ ...f, type, date: todayInput() }));
    setShowForm(true);
  };

  const saveStartingBalance = () => {
    const val = parseFloat(balanceInput) || 0;
    localStorage.setItem(storageKey(selectedMonth), String(val));
    setStartingBalance(val);
    setEditingBalance(false);
  };

  const { data: entries, isLoading } = useListFinancialEntries({ month: selectedMonth });
  const create = useCreateFinancialEntry();
  const del = useDeleteFinancialEntry();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getListFinancialEntriesQueryKey({ month: selectedMonth }),
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount.trim() || !form.description.trim()) return;

    create.mutate(
      {
        data: {
          date: form.date,
          type: form.type,
          amount: form.amount,
          description: form.description,
          category: form.category || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setShowForm(false);
          setForm(emptyForm());
          toast({ title: "Entry added" });
        },
        onError: () => toast({ title: "Couldn't add entry", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    del.mutate(
      { id },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Couldn't delete entry", variant: "destructive" }),
      }
    );
  };

  const summary = (entries ?? []).reduce(
    (acc, e) => {
      const amt = parseFloat(e.amount) || 0;
      if (e.type === "income") acc.income += amt;
      else if (e.type === "expense") acc.expense += amt;
      else if (e.type === "tithe") acc.tithe += amt;
      else if (e.type === "giving") acc.giving += amt;
      else if (e.type === "savings") acc.savings += amt;
      return acc;
    },
    { income: 0, expense: 0, tithe: 0, giving: 0, savings: 0 }
  );

  const totalOut = summary.expense + summary.tithe + summary.giving + summary.savings;
  const endingBalance = startingBalance + summary.income - totalOut;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Financial Tracker</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-serif italic">Giving, tithing, income and expenses</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-44 text-sm border-border/50"
          />
          {!showForm && (
            <Button onClick={() => openForm("expense")} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          )}
        </div>
      </header>

      <div className="journal-page p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Starting Balance</p>
            {editingBalance ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-36 h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveStartingBalance();
                    if (e.key === "Escape") setEditingBalance(false);
                  }}
                />
                <Button size="sm" onClick={saveStartingBalance} className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingBalance(false)} className="h-8">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-semibold text-foreground">{fmt(startingBalance)}</span>
                <button
                  onClick={() => {
                    setBalanceInput(String(startingBalance));
                    setEditingBalance(true);
                  }}
                  className="text-muted-foreground/50 hover:text-primary transition-colors"
                  title="Edit starting balance"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground/60 mt-0.5">Money you had at the start of {selectedMonth}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Current Balance</p>
            <p className={`font-serif text-2xl font-semibold ${endingBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
              {fmt(endingBalance)}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {fmt(startingBalance)} + {fmt(summary.income)} income − {fmt(totalOut)} out
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(summary) as [string, number][]).map(([key, val]) => {
          const config = TYPE_CONFIG[key as EntryType];
          const Icon = config.icon;
          return (
            <div
              key={key}
              className={`journal-page p-4 text-center space-y-1 ${config.bg} cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md active:scale-[0.98]`}
              onClick={() => openForm(key as EntryType)}
              title={`Add ${config.label} entry`}
            >
              <Icon className={`w-5 h-5 mx-auto ${config.color}`} />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{config.label}</p>
              <p className={`font-serif text-lg font-semibold ${config.color}`}>{fmt(val)}</p>
            </div>
          );
        })}
      </div>

      <div className="journal-page p-5 border-l-4 border-l-primary/50 bg-primary/5">
        <h3 className="font-serif text-sm font-medium text-primary mb-1 flex items-center gap-2">
          <Heart className="w-4 h-4" /> Kingdom Giving This Month
        </h3>
        <p className="text-2xl font-serif font-semibold text-primary">{fmt(summary.tithe + summary.giving)}</p>
        <p className="text-xs text-muted-foreground mt-1">Tithe {fmt(summary.tithe)} + Offerings {fmt(summary.giving)}</p>
        {summary.income > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{(((summary.tithe + summary.giving) / summary.income) * 100).toFixed(1)}% of income given</p>
        )}
      </div>

      <section ref={formRef} className={`journal-page p-6 space-y-4 animate-in slide-in-from-top-2 duration-300 ${showForm ? "block" : "hidden"}`}>
        <h2 className="font-serif text-xl font-medium text-foreground">New Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG[EntryType]][]).map(([type, cfg]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    form.type === type ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Date *</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount *</label>
              <Input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. groceries..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description *</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What is this for?" required />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="submit" disabled={!form.amount.trim() || !form.description.trim() || create.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save Entry
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm()); }}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        </form>
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Entries</h2>
          <button
            type="button"
            onClick={() => openForm("expense")}
            className="text-xs px-3 py-2 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Add Expense
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => {
              const config = TYPE_CONFIG[entry.type as EntryType] ?? TYPE_CONFIG.expense;
              const Icon = config.icon;
              return (
                <div key={entry.id} className="journal-page p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.bg} shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(`${entry.date}T12:00:00`), "MMM d, yyyy")}
                      {entry.category && ` · ${entry.category}`}
                      {" · "}
                      <span className={`${config.color} font-medium`}>{config.label}</span>
                    </p>
                  </div>
                  <p className={`text-base font-serif font-semibold ${config.color} shrink-0`}>
                    {entry.type === "income" ? "+" : entry.type === "savings" ? "" : "-"}
                    {fmt(parseFloat(entry.amount) || 0)}
                  </p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="journal-page p-12 text-center space-y-3">
            <DollarSign className="w-10 h-10 text-primary/30 mx-auto" />
            <p className="font-serif text-lg text-muted-foreground">No entries for {selectedMonth}</p>
            <p className="text-sm text-muted-foreground/60">Track your giving, income, and expenses</p>
          </div>
        )}
      </div>
    </div>
  );
}
