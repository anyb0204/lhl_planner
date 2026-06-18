import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Lock } from "lucide-react";
import { useTier } from "@/contexts/TierContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
}

type BillingCycle = "monthly" | "yearly";

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/stripe/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json() as { data: Product[] };
  return data.data ?? [];
}

async function startCheckout(priceId: string): Promise<string> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  if (!res.ok) throw new Error("Failed to create checkout session");
  const data = await res.json() as { url: string };
  return data.url;
}

const FREE_FEATURES = [
  "Daily planner (fill & print)",
  "Save as PDF from your browser",
  "No data stored in the cloud",
];

const REGULAR_FEATURES = [
  "Daily, weekly & monthly planner",
  "All data saved to your account",
  "Brain Dump with AI organisation",
  "Truth Generator — faith-based lie breaking",
  "Medications & appointments tracker",
  "Health conditions tracker",
  "Financial tracker",
  "Goals tracker with milestones",
  "AI scripture & encouragement",
  "Help Me Plan on every view",
  "Your data is 100% private",
];

const PREMIUM_FEATURES = [
  "Everything in Plus",
  "Weekly AI Planning Session",
  "Health Summary for doctor visits",
  "Faith-based Financial Coaching",
  "Personalized Daily Devotional",
  "Priority support",
];

const REGULAR_MONTHLY = 5.99;
const REGULAR_YEARLY = 59.99;
const PREMIUM_MONTHLY = 9.99;
const PREMIUM_YEARLY = 99.99;

function savingsPercent(monthly: number, yearly: number): number {
  return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
}

const REGULAR_SAVINGS = savingsPercent(REGULAR_MONTHLY, REGULAR_YEARLY);
const PREMIUM_SAVINGS = savingsPercent(PREMIUM_MONTHLY, PREMIUM_YEARLY);

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const pageVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

const featureItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export default function PricingPage() {
  const tier = useTier();
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [regularCycle, setRegularCycle] = useState<BillingCycle>("monthly");
  const [premiumCycle, setPremiumCycle] = useState<BillingCycle>("monthly");

  const checkout = useMutation({
    mutationFn: startCheckout,
    onSuccess: (url) => { window.location.href = url; },
  });

  const loadAndCheckout = async (tierTarget: "regular" | "premium", cycle: BillingCycle) => {
    let prods = products;
    if (!prods) {
      setLoadingProducts(true);
      try {
        prods = await fetchProducts();
        setProducts(prods);
      } catch {
        setLoadError(true);
        return;
      } finally {
        setLoadingProducts(false);
      }
    }
    setLoadError(false);
    const product = prods.find(p => p.metadata?.tier === tierTarget);
    const interval = cycle === "yearly" ? "year" : "month";
    const price = product?.prices.find(p => p.recurring?.interval === interval)
      ?? product?.prices.find(p => p.recurring?.interval === "month");
    if (price) checkout.mutate(price.id);
  };

  const isCurrentTier = (t: string) => tier === t;
  const isPending = checkout.isPending || loadingProducts;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8 pb-24" style={{ backgroundColor: "hsl(138, 26%, 34%)" }}>
      <motion.div
        className="w-full max-w-5xl space-y-8 mt-4"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center space-y-3">
          <motion.img
            src="/lhl-logo.png"
            alt="Latter House Life"
            className="w-14 h-14 object-contain mx-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <h1 className="text-3xl font-serif font-semibold" style={{ color: "hsl(45, 55%, 92%)" }}>
            Choose Your Plan
          </h1>
          <p className="text-sm" style={{ color: "hsl(138, 20%, 78%)" }}>
            Start free. Upgrade when you're ready.
          </p>
        </motion.div>

        {/* Quote */}
        <motion.div
          variants={fadeUp}
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: "hsl(138, 26%, 28%)", border: "1px solid hsl(138, 22%, 44%)" }}
        >
          <p className="font-serif italic text-sm" style={{ color: "hsl(45, 55%, 88%)" }}>
            "The glory of this present house will be greater than the former." — Haggai 2:9
          </p>
        </motion.div>

        {/* Plans grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.13 } } }}
        >
          <motion.div variants={cardVariants}>
            <PlanCard
              name="Free"
              price="$0"
              period="forever"
              description="Try it out. Fill in your planner and print it to keep."
              features={FREE_FEATURES}
              isCurrent={isCurrentTier("free")}
              badge={null}
              ctaLabel={isCurrentTier("free") ? "You're on Free" : "Get Started Free"}
              ctaDisabled={isCurrentTier("free")}
              onCta={() => setLocation("/free-planner")}
              highlight={false}
              billingToggle={null}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <PlanCard
              name="Plus"
              price={regularCycle === "yearly" ? `$${REGULAR_YEARLY}` : `$${REGULAR_MONTHLY.toFixed(2)}`}
              period={regularCycle === "yearly" ? "per year" : "per month"}
              description="The full planner — save your data, use all trackers, and unlock AI tools."
              features={REGULAR_FEATURES}
              isCurrent={isCurrentTier("regular")}
              badge={regularCycle === "yearly" ? `Save ${REGULAR_SAVINGS}%` : null}
              ctaLabel={
                isCurrentTier("regular") ? "Current Plan" :
                isCurrentTier("premium") ? "Downgrade" :
                isPending ? (checkout.isPending ? "Redirecting…" : "Loading…") :
                regularCycle === "yearly" ? "Start Plus — $59.99/yr" : "Start Plus"
              }
              ctaDisabled={isCurrentTier("regular") || isCurrentTier("premium") || isPending}
              onCta={() => loadAndCheckout("regular", regularCycle)}
              highlight={false}
              billingToggle={{
                cycle: regularCycle,
                savingsPercent: REGULAR_SAVINGS,
                onChange: setRegularCycle,
              }}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <PlanCard
              name="Premium"
              price={premiumCycle === "yearly" ? `$${PREMIUM_YEARLY}` : `$${PREMIUM_MONTHLY.toFixed(2)}`}
              period={premiumCycle === "yearly" ? "per year" : "per month"}
              description="Everything in Regular, plus four powerful AI features for your latter-house season."
              features={PREMIUM_FEATURES}
              isCurrent={isCurrentTier("premium")}
              badge={premiumCycle === "yearly" ? `Save ${PREMIUM_SAVINGS}%` : "Best Value"}
              ctaLabel={
                isCurrentTier("premium") ? "Current Plan" :
                isPending ? (checkout.isPending ? "Redirecting…" : "Loading…") :
                premiumCycle === "yearly" ? "Upgrade to Premium — $99.99/yr" : "Upgrade to Premium"
              }
              ctaDisabled={isCurrentTier("premium") || isPending}
              onCta={() => loadAndCheckout("premium", premiumCycle)}
              highlight={true}
              billingToggle={{
                cycle: premiumCycle,
                savingsPercent: PREMIUM_SAVINGS,
                onChange: setPremiumCycle,
              }}
            />
          </motion.div>
        </motion.div>

        {loadError && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-sm"
            style={{ color: "hsl(0, 60%, 75%)" }}
          >
            Couldn't load payment options. Please refresh and try again.
          </motion.p>
        )}
        {checkout.isError && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-sm"
            style={{ color: "hsl(0, 60%, 75%)" }}
          >
            Something went wrong starting checkout. Please try again.
          </motion.p>
        )}

        <motion.p variants={fadeUp} className="text-center text-xs" style={{ color: "hsl(138, 20%, 60%)" }}>
          Secure payment via Stripe · Cancel anytime · No hidden fees
        </motion.p>
      </motion.div>
    </div>
  );
}

interface BillingToggleProps {
  cycle: BillingCycle;
  savingsPercent: number;
  onChange: (c: BillingCycle) => void;
}

function BillingToggle({ cycle, savingsPercent, onChange }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "hsl(138, 18%, 93%)" }}>
      <button
        onClick={() => onChange("monthly")}
        className="flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all"
        style={cycle === "monthly"
          ? { backgroundColor: "hsl(0, 0%, 100%)", color: "hsl(152, 40%, 14%)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
          : { backgroundColor: "transparent", color: "hsl(152, 22%, 50%)" }
        }
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("yearly")}
        className="flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1"
        style={cycle === "yearly"
          ? { backgroundColor: "hsl(0, 0%, 100%)", color: "hsl(152, 40%, 14%)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
          : { backgroundColor: "transparent", color: "hsl(152, 22%, 50%)" }
        }
      >
        Yearly
        {cycle !== "yearly" && (
          <span className="px-1 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)", fontSize: "9px" }}>
            -{savingsPercent}%
          </span>
        )}
      </button>
    </div>
  );
}

function PlanCard({
  name, price, period, description, features,
  isCurrent, badge, ctaLabel, ctaDisabled, onCta, highlight, billingToggle,
}: {
  name: string; price: string; period: string; description: string; features: string[];
  isCurrent: boolean; badge: string | null; ctaLabel: string; ctaDisabled: boolean;
  onCta: () => void; highlight: boolean;
  billingToggle: BillingToggleProps | null;
}) {
  const isLoading = ctaLabel === "Redirecting…" || ctaLabel === "Loading…";

  return (
    <motion.div
      whileHover={!ctaDisabled ? { y: -7, boxShadow: "0 24px 48px -10px rgba(0,0,0,0.22)" } : {}}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`rounded-xl p-6 space-y-4 flex flex-col relative h-full ${highlight ? "ring-2 ring-primary premium-glow" : ""}`}
      style={{ backgroundColor: "hsl(0, 0%, 100%)" }}
    >
      {badge && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.7, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 18 }}
        >
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
            style={{ backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)" }}
          >
            <Sparkles className="w-3 h-3" /> {badge}
          </span>
        </motion.div>
      )}

      <div className="space-y-1">
        <h2 className="text-lg font-semibold" style={{ color: "hsl(152, 40%, 14%)" }}>{name}</h2>
        <div className="flex items-baseline gap-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={price}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="text-3xl font-bold font-serif"
              style={{ color: "hsl(152, 40%, 14%)" }}
            >
              {price}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm" style={{ color: "hsl(152, 22%, 50%)" }}>{period}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "hsl(152, 22%, 45%)" }}>{description}</p>
      </div>

      {billingToggle && (
        <BillingToggle
          cycle={billingToggle.cycle}
          savingsPercent={billingToggle.savingsPercent}
          onChange={billingToggle.onChange}
        />
      )}

      <motion.ul
        className="space-y-2 flex-1"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.055, delayChildren: 0.15 } } }}
        initial="hidden"
        animate="visible"
      >
        {features.map((f, i) => (
          <motion.li key={i} variants={featureItem} className="flex items-start gap-2 text-sm" style={{ color: "hsl(152, 40%, 18%)" }}>
            {f === "Everything in Plus" ? (
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            ) : (
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "hsl(43, 52%, 68%)" }} />
            )}
            <span className={f === "Everything in Plus" ? "font-medium" : ""}>{f}</span>
          </motion.li>
        ))}
      </motion.ul>

      <motion.button
        onClick={onCta}
        disabled={ctaDisabled}
        whileHover={!ctaDisabled ? { scale: 1.02 } : {}}
        whileTap={!ctaDisabled ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shimmer-on-hover"
        style={highlight
          ? { backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)" }
          : isCurrent
            ? { backgroundColor: "hsl(138, 18%, 88%)", color: "hsl(152, 22%, 40%)" }
            : { border: "1.5px solid hsl(43, 52%, 68%)", color: "hsl(43, 52%, 52%)", backgroundColor: "transparent" }
        }
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {ctaLabel}
      </motion.button>
    </motion.div>
  );
}
