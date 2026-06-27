import { useLocation } from "wouter";
import { Heart, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";

interface UpgradeGateProps {
  feature: string;
  children: React.ReactNode;
  isPremium: boolean;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

async function startDonationCheckout(amountCents: number, mode: "subscription" | "payment"): Promise<string | null> {
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, mode }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url: string };
    return data.url;
  } catch {
    return null;
  }
}

export function UpgradeGate({ feature, children, isPremium }: UpgradeGateProps) {
  if (isPremium) return <>{children}</>;
  return <SupportPrompt feature={feature} />;
}

function SupportPrompt({ feature }: { feature: string }) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<"monthly" | "once" | null>(null);

  const handleDonate = async (type: "monthly" | "once") => {
    setLoading(type);
    const url = await startDonationCheckout(500, type === "monthly" ? "subscription" : "payment");
    if (url) {
      window.location.href = url;
    } else {
      setLocation("/pricing");
    }
    setLoading(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="max-w-lg mx-auto p-8 md:p-12 text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.45, ease: EASE_OUT }}
        className="flex justify-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center premium-glow">
          <Heart className="w-7 h-7 text-primary" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: EASE_OUT }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-serif font-semibold text-foreground">{feature}</h2>
        <p className="text-muted-foreground leading-relaxed">
          This feature is available to supporters. A donation of any amount — starting at $5/month —
          unlocks the full app for you and helps fund access for someone who can't afford it.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.45, ease: EASE_OUT }}
        className="rounded-xl border border-border/50 bg-card p-5 text-left space-y-2"
      >
        <p className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-3">Every supporter gets</p>
        {[
          "Full access to every feature",
          "Daily Devotional & Weekly Plan Session",
          "Health Summary & Financial Coaching",
          "Your donation supports scholarship access",
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            {item}
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.45, ease: EASE_OUT }}
        className="flex flex-col gap-3"
      >
        <Button
          size="lg"
          className="w-full gap-2 shimmer-on-hover"
          onClick={() => handleDonate("monthly")}
          disabled={loading !== null}
        >
          {loading === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
          Give $5/month (or choose your amount)
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2"
          onClick={() => handleDonate("once")}
          disabled={loading !== null}
        >
          {loading === "once" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          One-time donation
        </Button>

        <button
          onClick={() => setLocation("/pricing")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Learn more or apply for a scholarship
        </button>
      </motion.div>
    </motion.div>
  );
}
