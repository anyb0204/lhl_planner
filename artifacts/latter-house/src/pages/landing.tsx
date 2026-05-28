import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BookOpen, Calendar, Brain, Sparkles, Heart, Target,
  DollarSign, Flame, Star, ArrowRight, CheckCircle2, Menu, X,
  BookHeart, Activity, Pill, Users, Shield, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BookOpen,
    title: "Daily Planner",
    desc: "Time-blocked schedules, top priorities, gratitude, and reflection — all in one elegant view.",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    icon: Brain,
    title: "AI Brain Dump",
    desc: "Pour out everything on your mind and watch AI turn it into an organized, prioritized action plan.",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    icon: Sparkles,
    title: "Truth Generator",
    desc: "Name a lie or negative belief and receive a countering scripture with a personalized affirmation.",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  {
    icon: Heart,
    title: "Prayer Journal",
    desc: "Capture your prayers, track answered ones, and watch your faith story unfold over time.",
    color: "text-rose-700",
    bg: "bg-rose-50",
  },
  {
    icon: Target,
    title: "Goals Tracker",
    desc: "Set meaningful goals with milestones, categories, and progress tracking that keeps you moving.",
    color: "text-sky-700",
    bg: "bg-sky-50",
  },
  {
    icon: DollarSign,
    title: "Financial Tracker",
    desc: "Track income, expenses, tithe, giving, and savings month by month with clarity.",
    color: "text-lime-700",
    bg: "bg-lime-50",
  },
  {
    icon: Flame,
    title: "Habit Tracker",
    desc: "Build the routines that sustain your purpose with daily habit tracking and streak counting.",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  {
    icon: Activity,
    title: "Health Trackers",
    desc: "Manage medications, appointments, and health conditions all in one place.",
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
  {
    icon: BookHeart,
    title: "Daily Devotionals",
    desc: "Start each morning with a personalized scripture, reflection, and faith-filled encouragement.",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
  },
];

const testimonials = [
  {
    name: "Carol M.",
    age: 58,
    location: "Atlanta, GA",
    text: "Latter House Life helped me see that my best years weren't behind me — they were still ahead. The daily planner keeps me focused and the prayer journal has deepened my faith walk in ways I didn't expect.",
    stars: 5,
  },
  {
    name: "Denise W.",
    age: 62,
    location: "Houston, TX",
    text: "After my divorce at 55, I felt lost. This app gave me a system to rebuild — not just manage tasks, but actually design a life I love. The Truth Generator alone was worth the price.",
    stars: 5,
  },
  {
    name: "Patricia L.",
    age: 54,
    location: "Charlotte, NC",
    text: "I've tried every planner out there. This one actually understands what I need at this season of life. The financial tracker helped me start my small business and the weekly planner keeps everything organized.",
    stars: 5,
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    desc: "Sign up in seconds and access your personalized dashboard immediately.",
    icon: Users,
  },
  {
    number: "02",
    title: "Set your intentions",
    desc: "Start with your goals, habits, and what matters most in this season.",
    icon: Target,
  },
  {
    number: "03",
    title: "Live with purpose",
    desc: "Use your daily planner, AI tools, and trackers to build the life you were made for.",
    icon: Sparkles,
  },
];

const reasons = [
  "Built specifically for women 45–70 rebuilding and thriving",
  "Faith-centered with scripture and prayer tools",
  "AI-powered planning and encouragement",
  "Private, secure — your data belongs to you",
  "Works beautifully on any device",
  "Trusted by thousands of women in their next chapter",
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function AnimatedGradientBg({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden
    >
      <div
        className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(138,40%,55%) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, hsl(43,60%,65%) 0%, transparent 70%)",
          animation: "pulse 10s ease-in-out infinite 3s",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: var(--tw-opacity); }
          50% { transform: scale(1.1); opacity: calc(var(--tw-opacity) * 0.7); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .float-anim { animation: float 6s ease-in-out infinite; }
        .float-anim-2 { animation: float 8s ease-in-out infinite 2s; }
        .gradient-text {
          background: linear-gradient(135deg, hsl(152,40%,22%) 0%, hsl(43,52%,52%) 50%, hsl(152,40%,22%) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* ── Sticky Navigation ── */}
      <nav className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm"
          : "bg-transparent"
      )}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/lhl-logo.png"
              alt="Latter House Life"
              className="w-9 h-9 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span
              className="font-normal text-xl"
              style={{ fontFamily: "'Kapakana', cursive", color: "hsl(152,40%,22%)", wordSpacing: "-0.05em" }}
            >
              Latter House Life
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => document.getElementById("testimonials")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Stories
            </button>
            <button
              onClick={() => setLocation("/sign-in")}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </button>
            <Button
              onClick={() => setLocation("/sign-up")}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 shadow-sm"
            >
              Start Free
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border px-5 py-4 space-y-3">
            <button onClick={() => { document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }}
              className="block w-full text-left text-sm font-medium text-foreground py-2">
              Features
            </button>
            <button onClick={() => { document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }}
              className="block w-full text-left text-sm font-medium text-foreground py-2">
              How It Works
            </button>
            <button onClick={() => { document.getElementById("testimonials")?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); }}
              className="block w-full text-left text-sm font-medium text-foreground py-2">
              Stories
            </button>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setLocation("/sign-in")} className="flex-1">
                Sign In
              </Button>
              <Button size="sm" onClick={() => setLocation("/sign-up")} className="flex-1 bg-primary text-primary-foreground">
                Start Free
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <AnimatedGradientBg />

        {/* Decorative texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        <div className="relative max-w-5xl mx-auto px-5 py-20 text-center space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
            style={{ backgroundColor: "hsl(138,30%,88%)", color: "hsl(138,40%,28%)" }}>
            <Star className="w-3 h-3 fill-current" /> Your next chapter starts here
          </div>

          {/* Main headline */}
          <div className="space-y-3">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-serif font-normal leading-tight text-foreground"
            >
              The latter years can become{" "}
              <span className="gradient-text">the greatest years.</span>
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-serif italic">
            A beautiful digital life system for rebuilding, organizing, creating income,
            and rediscovering purpose — designed for women in the second half of life.
          </p>

          {/* Scripture badge */}
          <div className="inline-block rounded-xl px-6 py-3 max-w-lg mx-auto"
            style={{ backgroundColor: "hsl(138,26%,28%)", border: "1px solid hsl(138,22%,44%)" }}>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: "hsl(45,55%,88%)" }}>
              "The glory of this present house will be greater than the former."
            </p>
            <p className="text-xs tracking-widest uppercase mt-1" style={{ color: "hsl(43,52%,72%)" }}>
              — Haggai 2:9
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <Button
              size="lg"
              onClick={() => setLocation("/sign-up")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 py-6 rounded-xl shadow-lg gap-2 font-semibold min-w-[180px]"
            >
              Start Free <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-base px-8 py-6 rounded-xl border-foreground/20 text-foreground hover:bg-muted/50 min-w-[180px]"
            >
              Explore the Planner
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Start in 60 seconds
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary" /> Faith-centered design
            </span>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-24 px-5">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-widest font-medium text-primary">Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-serif font-semibold text-foreground">
              A complete life management system
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-serif italic">
              Thoughtfully designed for women who are rebuilding, reimagining, and rising
              into the fullness of who they were created to be.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border/50 bg-card p-6 space-y-3 hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-default"
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <h3 className="font-serif font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-5 relative overflow-hidden"
        style={{ backgroundColor: "hsl(138,24%,40%)" }}>
        <AnimatedGradientBg className="opacity-30" />

        <div className="relative max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "hsl(43,52%,72%)" }}>
              Simple by design
            </p>
            <h2 className="text-4xl md:text-5xl font-serif font-semibold" style={{ color: "hsl(45,55%,94%)" }}>
              Your journey starts in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ number, title, desc, icon: Icon }) => (
              <div key={number} className="text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: "hsl(138,26%,28%)", border: "1px solid hsl(138,22%,44%)" }}>
                    <Icon className="w-8 h-8" style={{ color: "hsl(43,52%,68%)" }} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-serif"
                    style={{ backgroundColor: "hsl(43,52%,68%)", color: "hsl(152,40%,10%)" }}>
                    {number.slice(1)}
                  </span>
                </div>
                <h3 className="font-serif font-semibold text-xl" style={{ color: "hsl(45,55%,94%)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(45,35%,78%)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Latter House ── */}
      <section className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden grid md:grid-cols-2 gap-0"
            style={{ border: "1px solid hsl(138,22%,72%)", backgroundColor: "hsl(138,20%,96%)" }}>

            <div className="p-10 md:p-14 space-y-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest font-medium text-primary">Why Latter House</p>
                <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground leading-tight">
                  Built for THIS season of your life
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Most planners are designed for busy 30-somethings. Latter House Life was created
                  for women in the second half — navigating transitions, rebuilding finances,
                  pursuing purpose, and walking deeper in faith.
                </p>
              </div>

              <div className="space-y-3">
                {reasons.map((reason) => (
                  <div key={reason} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{reason}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setLocation("/sign-up")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                Start Your Journey <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative hidden md:block p-10"
              style={{ background: "linear-gradient(135deg, hsl(138,24%,40%) 0%, hsl(138,30%,28%) 100%)" }}>
              <AnimatedGradientBg className="opacity-40" />
              <div className="relative space-y-5">
                {/* Mock planner card */}
                <div className="rounded-2xl p-5 space-y-3 float-anim"
                  style={{ backgroundColor: "hsl(138,26%,28%)", border: "1px solid hsl(138,22%,44%)" }}>
                  <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "hsl(43,52%,72%)" }}>
                    Today's Top 3
                  </p>
                  {["Complete weekly devotional", "Review financial goals", "Call my accountability partner"].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded border-2 shrink-0" style={{ borderColor: "hsl(43,52%,68%)" }} />
                      <span className="text-xs" style={{ color: "hsl(45,35%,82%)" }}>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Mock scripture card */}
                <div className="rounded-2xl p-4 float-anim-2"
                  style={{ backgroundColor: "hsl(138,20%,34%)", border: "1px solid hsl(138,18%,46%)" }}>
                  <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: "hsl(43,52%,72%)" }}>
                    Today's Scripture
                  </p>
                  <p className="font-serif italic text-xs leading-relaxed" style={{ color: "hsl(45,35%,88%)" }}>
                    "I can do all things through Christ who strengthens me."
                  </p>
                  <p className="text-[10px] mt-1.5 tracking-wider" style={{ color: "hsl(43,42%,60%)" }}>
                    Philippians 4:13
                  </p>
                </div>

                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Day Streak", value: "12" },
                    { label: "Goals", value: "5" },
                    { label: "Habits", value: "4/6" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: "hsl(138,26%,28%)" }}>
                      <p className="text-base font-serif font-semibold" style={{ color: "hsl(43,52%,68%)" }}>{stat.value}</p>
                      <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "hsl(45,25%,65%)" }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-5"
        style={{ backgroundColor: "hsl(138,22%,93%)" }}>
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-widest font-medium text-primary">Real stories</p>
            <h2 className="text-4xl md:text-5xl font-serif font-semibold text-foreground">
              Women reclaiming their next chapter
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, age, location, text, stars }) => (
              <div
                key={name}
                className="rounded-2xl bg-card border border-border/50 p-6 space-y-4 hover:shadow-md transition-shadow"
              >
                <StarRating count={stars} />
                <p className="font-serif italic text-sm text-foreground/85 leading-relaxed">
                  "{text}"
                </p>
                <div className="pt-2 border-t border-border/30">
                  <p className="font-medium text-sm text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{age} · {location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(138,30%,30%) 0%, hsl(138,36%,22%) 100%)" }}>
        <AnimatedGradientBg className="opacity-40" />

        <div className="relative max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "hsl(43,52%,72%)" }}>
              Your best chapter is not behind you
            </p>
            <h2
              className="text-4xl md:text-5xl font-serif font-semibold leading-tight"
              style={{ color: "hsl(45,55%,94%)" }}
            >
              The life you've dreamed about is still possible.
            </h2>
            <p className="text-lg leading-relaxed font-serif italic" style={{ color: "hsl(45,35%,78%)" }}>
              Start today. Free plan available. No credit card required.
              Your next chapter begins with a single step.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/sign-up")}
              className="text-base px-10 py-6 rounded-xl shadow-xl gap-2 font-semibold"
              style={{ backgroundColor: "hsl(43,52%,68%)", color: "hsl(152,40%,10%)" }}
            >
              Start Free Today <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setLocation("/sign-in")}
              className="text-base px-10 py-6 rounded-xl font-medium"
              style={{ color: "hsl(45,35%,82%)", border: "1px solid hsl(138,22%,44%)" }}
            >
              Sign In
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "hsl(43,52%,68%)" }} />
            <p className="text-sm font-medium" style={{ color: "hsl(45,35%,78%)" }}>
              Join thousands of women designing their greatest chapter.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-5 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/lhl-logo.png"
                alt=""
                className="w-8 h-8 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <p
                  className="font-normal text-lg"
                  style={{ fontFamily: "'Kapakana', cursive", color: "hsl(152,40%,22%)", wordSpacing: "-0.05em" }}
                >
                  Latter House Life
                </p>
                <p className="text-xs text-muted-foreground font-serif italic">
                  Built with faith. Designed for your flourishing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button
                onClick={() => setLocation("/terms")}
                className="hover:text-foreground transition-colors"
              >
                Terms
              </button>
              <button
                onClick={() => setLocation("/privacy")}
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </button>
              <a
                href="mailto:customerservice@latterhouselife.com"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Latter House Life. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
