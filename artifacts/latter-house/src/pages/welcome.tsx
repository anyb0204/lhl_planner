import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import {
  BookOpen, Calendar, CalendarDays, Brain, Sparkles,
  Pill, CalendarCheck, Activity, DollarSign, Target,
  HelpCircle, Mail, ArrowRight, ChevronDown, ChevronUp,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function greeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${time}, ${firstName}` : time;
}

const features = [
  {
    group: "Planning",
    color: "bg-primary/10 text-primary",
    items: [
      { icon: BookOpen, label: "Daily Planner", href: "/", desc: "Time-blocked schedule, priorities, tasks, gratitude & notes — all in one view." },
      { icon: Calendar, label: "Weekly View", href: "/weekly", desc: "See your full week at a glance and plan across days with ease." },
      { icon: CalendarDays, label: "Monthly View", href: "/monthly", desc: "Big-picture calendar so you can see patterns and upcoming events." },
    ],
  },
  {
    group: "AI Tools",
    color: "bg-amber-500/10 text-amber-700",
    items: [
      { icon: Brain, label: "Brain Dump", href: "/brain-dump", desc: "Pour out everything on your mind — AI organizes it into actionable tasks." },
      { icon: Sparkles, label: "Truth Generator", href: "/truth-generator", desc: "Name a lie or negative belief and receive a countering scripture + affirmation." },
    ],
  },
  {
    group: "Trackers",
    color: "bg-emerald-600/10 text-emerald-700",
    items: [
      { icon: Pill, label: "Medications", href: "/trackers/medications", desc: "Log medications, dosages, times, refill dates, and prescribing doctors." },
      { icon: CalendarCheck, label: "Appointments", href: "/trackers/appointments", desc: "Track medical, dental, legal, and any other appointments." },
      { icon: Activity, label: "Health Conditions", href: "/trackers/health", desc: "Keep a running log of ongoing health conditions and their status." },
      { icon: DollarSign, label: "Financial", href: "/trackers/financial", desc: "Track income, expenses, tithe, giving, and savings by month." },
      { icon: Target, label: "Goals", href: "/trackers/goals", desc: "Set goals with milestones, categories, and progress tracking." },
    ],
  },
];

const tips = [
  { title: "Navigate with the sidebar", body: "Use the menu on the left (or the top bar on mobile) to jump between any section instantly." },
  { title: "Your data is private", body: "Everything you enter is tied to your account only — no one else can see it." },
  { title: "Help Me Plan buttons", body: "On the Daily, Weekly, and Monthly pages you'll find a 'Help Me Plan' button that generates AI-powered planning suggestions for that specific view." },
  { title: "AI tools need a moment", body: "Brain Dump, Truth Generator, Scripture, and Encouragement all call AI. If one times out, just try again — it's usually a brief delay." },
  { title: "Manage your subscription", body: "Click 'Manage Billing' at the bottom of the sidebar at any time to update your payment method or cancel." },
];

export default function Welcome() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [tipsOpen, setTipsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-24 space-y-10 animate-in fade-in duration-500">

      {/* ── Hero ── */}
      <div className="text-center space-y-3 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Latter House Life</p>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground">
          {greeting(user?.firstName)}
        </h1>
        <p className="font-serif italic text-muted-foreground text-lg">
          "The glory of this present house will be greater than the former." — Haggai 2:9
        </p>
      </div>

      {/* ── Primary CTA ── */}
      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="text-base px-8 py-6 rounded-xl shadow-md gap-2 font-semibold"
          onClick={() => setLocation("/")}
        >
          Open My Planner <ArrowRight className="w-5 h-5" />
        </Button>
        <p className="text-xs text-muted-foreground">Goes to today's Daily Planner</p>
      </div>

      {/* ── Feature overview ── */}
      <div className="space-y-6">
        <h2 className="text-xl font-serif font-semibold text-foreground text-center">What's in the app</h2>

        {features.map(({ group, color, items }) => (
          <div key={group}>
            <p className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-3">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(({ icon: Icon, label, href, desc }) => (
                <button
                  key={label}
                  onClick={() => setLocation(href)}
                  className="text-left rounded-lg border border-border/50 bg-card p-4 space-y-2 hover:border-primary/40 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("p-1.5 rounded-md", color)}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tips (collapsible) ── */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <button
          onClick={() => setTipsOpen(!tipsOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Quick-start tips for new users
          </span>
          {tipsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {tipsOpen && (
          <div className="px-5 pb-5 grid gap-3 animate-in slide-in-from-top-2 duration-200">
            {tips.map(({ title, body }) => (
              <div key={title} className="rounded-lg bg-muted/30 px-4 py-3 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Help & contact ── */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
        <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" /> Need help?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click the <strong className="text-foreground">Help</strong> button in the sidebar (or top bar on mobile) for a quick guide to any feature. If you're running into an issue that needs personal attention, reach out to our support team — we're happy to help.
        </p>
        <a
          href="mailto:customerservice@latterhouselife.com"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          <Mail className="w-4 h-4" />
          customerservice@latterhouselife.com
        </a>
      </div>

      {/* ── Footer ── */}
      <div className="text-center space-y-3 pb-4">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button onClick={() => setLocation("/terms")} className="hover:text-foreground transition-colors">Terms & Conditions</button>
          <span className="text-border">·</span>
          <button onClick={() => setLocation("/privacy")} className="hover:text-foreground transition-colors">Privacy Policy</button>
          <span className="text-border">·</span>
          <button
            onClick={() => signOut()}
            className="hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
        <p className="text-xs text-muted-foreground/60 italic font-serif">
          Built with faith. Designed for your flourishing.
        </p>
      </div>

    </div>
  );
}
