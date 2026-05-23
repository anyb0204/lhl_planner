import { useLocation } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface UpgradeGateProps {
  feature: string;
  children: React.ReactNode;
  isPremium: boolean;
}

type BillingCycle = "monthly" | "yearly";

async function startPremiumCheckout(cycle: BillingCycle): Promise<string | null> {
  try {
    const products = await fetch("/api/stripe/products").then(r => r.json()) as {
      data: Array<{ metadata: Record<string, string>; prices: Array<{ id: string; recurring?: { interval: string } | null }> }>;
    };
    const premiumProduct = products.data.find(p => p.metadata?.tier === "premium");
    const interval = cycle === "yearly" ? "year" : "month";
    const price = premiumProduct?.prices.find(p => p.recurring?.interval === interval)
      ?? premiumProduct?.prices.find(p => p.recurring?.interval === "month");
    if (!price) return null;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: price.id }),
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
  return <UpgradePrompt feature={feature} />;
}

function UpgradePrompt({ feature }: { feature: string }) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<BillingCycle | null>(null);

  const handleUpgrade = async (cycle: BillingCycle) => {
    setLoading(cycle);
    const url = await startPremiumCheckout(cycle);
    if (url) {
      window.location.href = url;
    } else {
      setLocation("/pricing");
    }
    setLoading(null);
  };

  return (
    <div className="max-w-lg mx-auto p-8 md:p-12 text-center space-y-6 animate-in fade-in duration-400">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-semibold text-foreground">{feature}</h2>
        <p className="text-muted-foreground leading-relaxed">
          This is a Premium feature. Upgrade to unlock {feature.toLowerCase()} along with three other
          AI-powered tools designed for your latter-house season.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5 text-left space-y-2">
        <p className="text-xs uppercase tracking-widest font-medium text-muted-foreground mb-3">Premium includes</p>
        {[
          "Weekly AI Planning Session",
          "Health Summary for doctor visits",
          "Faith-based Financial Coaching",
          "Personalized Daily Devotional",
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            {item}
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 mt-3">
          Plus everything in Plus
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => handleUpgrade("monthly")}
          disabled={loading !== null}
        >
          {loading === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Monthly — $9.99/mo
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 relative"
          onClick={() => handleUpgrade("yearly")}
          disabled={loading !== null}
        >
          {loading === "yearly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Yearly — $99.99/yr
          <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
            Save 17%
          </span>
        </Button>

        <button
          onClick={() => setLocation("/pricing")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          See all plan details
        </button>
      </div>
    </div>
  );
}
