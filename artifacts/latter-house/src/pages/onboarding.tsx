import { useState } from "react";
import { useUser } from "@clerk/react";
import { BookOpen, CheckSquare, BookHeart, Flame, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to Latter House Life",
    subtitle: '"The glory of this present house will be greater than the former." — Haggai 2:9',
    body: "You've taken a powerful step. This planner is designed to help you align your daily life with your faith — planning with purpose, praying intentionally, and building habits that honor God.",
    action: "Get Started",
  },
  {
    id: "planner",
    icon: BookOpen,
    title: "Your Daily Command Center",
    subtitle: "Plan your day with faith at the center",
    body: "The Daily Planner is your home base — time-blocked schedule, priorities, tasks, and a space for gratitude and reflection. Start each morning here to set your intention.",
    action: "Next",
  },
  {
    id: "tasks",
    icon: CheckSquare,
    title: "Never Drop the Ball",
    subtitle: "A running task list across all of life",
    body: "Beyond daily tasks, the Task List keeps your larger to-dos in one place with priority levels, due dates, and categories — so nothing slips through the cracks.",
    action: "Next",
  },
  {
    id: "prayer",
    icon: BookHeart,
    title: "Journal Your Prayer Life",
    subtitle: "Track what you're believing God for",
    body: "Your Prayer Journal lets you record requests, praises, and intercessions — and mark them answered when God moves. It becomes a living record of His faithfulness.",
    action: "Next",
  },
  {
    id: "habits",
    icon: Flame,
    title: "Build Disciplines That Last",
    subtitle: "Small daily choices, compounded over time",
    body: "The Habit Tracker helps you build and maintain spiritual and personal disciplines — daily Bible reading, prayer time, exercise, hydration, or anything that matters to you.",
    action: "Finish Setup",
  },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setCompleting(true);
      localStorage.setItem("lhl-onboarding-done", "true");
      window.location.reload();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("lhl-onboarding-done", "true");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ padding: "clamp(1rem, 4vw, 2rem)" }}>
      <div className="flex-1 flex flex-col justify-center w-full" style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step ? "w-10 bg-primary" : i < step ? "w-5 bg-primary/50" : "w-5 bg-muted-foreground/20"
              )} />
          ))}
        </div>

        {/* Card */}
        <div className="journal-page space-y-6" style={{ padding: "clamp(1.25rem, 5vw, 2rem)" }} key={currentStep.id}>
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <currentStep.icon className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <h1 className="font-serif font-semibold text-foreground leading-snug" style={{ fontSize: "clamp(1.35rem, 5.5vw, 1.875rem)" }}>{currentStep.title}</h1>
            <p className="font-serif italic text-primary" style={{ fontSize: "clamp(0.9rem, 3.5vw, 1rem)" }}>{currentStep.subtitle}</p>
            <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "clamp(0.95rem, 3.8vw, 1.05rem)" }}>{currentStep.body}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleNext}
              disabled={completing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              style={{ height: "clamp(2.75rem, 10vw, 3rem)", fontSize: "clamp(1rem, 4vw, 1.05rem)" }}
            >
              {isLast ? (
                completing ? "Setting up…" : <><Check className="w-4 h-4 mr-2" /> {currentStep.action}</>
              ) : (
                <>{currentStep.action} <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
                style={{ fontSize: "clamp(0.9rem, 3.5vw, 1rem)" }}>
                Back
              </button>
            )}
          </div>
        </div>

        {/* Skip + footer */}
        <div className="text-center mt-5 space-y-3">
          <button onClick={handleSkip}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2 block w-full"
            style={{ fontSize: "clamp(0.875rem, 3.5vw, 0.95rem)" }}>
            Skip introduction
          </button>
          <p className="font-serif italic text-muted-foreground/40" style={{ fontSize: "clamp(0.75rem, 3vw, 0.8rem)" }}>
            Walking by faith, not by sight. — 2 Corinthians 5:7
          </p>
        </div>
      </div>
    </div>
  );
}
