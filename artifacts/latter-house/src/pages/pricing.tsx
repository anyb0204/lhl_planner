import { useState, useEffect } from "react";
import { Check, Loader2, Sparkles, Heart, BookOpen, Brain, Flame, Sun, HeartPulse, TrendingUp, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useTier } from "@/contexts/TierContext";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const pageVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const featureItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

const PRESET_AMOUNTS = [5, 10, 15, 25];

const ALL_FEATURES = [
  { icon: BookOpen, label: "Daily, weekly, monthly & year-at-a-glance planner" },
  { icon: Brain, label: "Brain Dump with AI organisation" },
  { icon: Sparkles, label: "Truth Generator — faith-based lie breaking" },
  { icon: Flame, label: "Habit Tracker with streaks" },
  { icon: Sun, label: "Personalized Daily Devotional" },
  { icon: Calendar, label: "Weekly AI Planning Session" },
  { icon: HeartPulse, label: "Health Summary for doctor visits" },
  { icon: TrendingUp, label: "Faith-based Financial Coaching" },
];

type DonationMode = "monthly" | "once";
type ScholarshipStatus = "none" | "pending" | "approved" | "waitlisted";

async function startCheckout(amountCents: number, mode: DonationMode): Promise<string> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents, mode: mode === "monthly" ? "subscription" : "payment" }),
  });
  if (!res.ok) throw new Error("Checkout failed");
  const data = await res.json() as { url: string };
  return data.url;
}

async function fetchScholarshipStatus(): Promise<{ scholarshipStatus: string | null; applicationExists: boolean }> {
  const res = await fetch("/api/scholarship/status");
  if (!res.ok) return { scholarshipStatus: null, applicationExists: false };
  return res.json() as Promise<{ scholarshipStatus: string | null; applicationExists: boolean }>;
}

async function applyForScholarship(story: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/scholarship/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ story }),
  });
  if (!res.ok) {
    const data = await res.json() as { error?: string };
    return { success: false, error: data.error };
  }
  return { success: true };
}

export default function PricingPage() {
  const tier = useTier();
  const isFree = tier === "free";
  const isSupporter = !isFree;

  const [mode, setMode] = useState<DonationMode>("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  const [scholarshipStatus, setScholarshipStatus] = useState<ScholarshipStatus>("none");
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  const [story, setStory] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    fetchScholarshipStatus().then(({ scholarshipStatus: s, applicationExists }) => {
      if (s === "approved") setScholarshipStatus("approved");
      else if (s === "waitlisted") setScholarshipStatus("waitlisted");
      else if (applicationExists || s === "pending") setScholarshipStatus("pending");
    });
  }, []);

  const effectiveAmount = useCustom
    ? Math.round((parseFloat(customAmount) || 0) * 100)
    : selectedAmount * 100;

  const isValidAmount = effectiveAmount >= 500;
  const displayAmount = useCustom
    ? (parseFloat(customAmount) || 0).toFixed(2)
    : selectedAmount.toFixed(2);

  const handleCheckout = async () => {
    if (!isValidAmount) return;
    setCheckoutLoading(true);
    setCheckoutError(false);
    try {
      const url = await startCheckout(effectiveAmount, mode);
      window.location.href = url;
    } catch {
      setCheckoutError(true);
      setCheckoutLoading(false);
    }
  };

  const handleApply = async () => {
    setApplyLoading(true);
    setApplyError(null);
    const result = await applyForScholarship(story);
    setApplyLoading(false);
    if (result.success) {
      setApplySuccess(true);
      setScholarshipStatus("pending");
    } else {
      setApplyError(result.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8 pb-24" style={{ backgroundColor: "hsl(138, 26%, 34%)" }}>
      <motion.div
        className="w-full max-w-2xl space-y-8 mt-4"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center space-y-3">
          <motion.img
            src="/logo.png"
            alt="Latter House Life"
            className="w-14 h-14 object-contain mx-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          />
          <h1 className="text-3xl font-serif font-semibold" style={{ color: "hsl(45, 55%, 92%)" }}>
            Support Latter House Life
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(138, 20%, 78%)" }}>
            No tiers. No paywalls between plans. Every supporter gets full access —
            and part of every donation goes toward someone who needs it but can't pay yet.
          </p>
        </motion.div>

        {/* Scripture */}
        <motion.div
          variants={fadeUp}
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: "hsl(138, 26%, 28%)", border: "1px solid hsl(138, 22%, 44%)" }}
        >
          <p className="font-serif italic text-sm" style={{ color: "hsl(45, 55%, 88%)" }}>
            "The glory of this present house will be greater than the former." — Haggai 2:9
          </p>
        </motion.div>

        {/* Current supporter status */}
        {isSupporter && (
          <motion.div
            variants={fadeUp}
            className="rounded-xl p-5 text-center space-y-1"
            style={{ backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 fill-current" />
              <span className="font-semibold font-serif text-lg">Thank you for your support</span>
            </div>
            <p className="text-sm opacity-80">You have full access to every feature.</p>
          </motion.div>
        )}

        {/* What every supporter gets */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: "hsl(0, 0%, 100%)" }}
        >
          <h2 className="text-base font-semibold font-serif" style={{ color: "hsl(152, 40%, 14%)" }}>
            Every supporter gets full access
          </h2>
          <motion.ul
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } } }}
            initial="hidden"
            animate="visible"
          >
            {ALL_FEATURES.map(({ icon: Icon, label }) => (
              <motion.li key={label} variants={featureItem} className="flex items-start gap-2 text-sm" style={{ color: "hsl(152, 40%, 18%)" }}>
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "hsl(43, 52%, 58%)" }} />
                <span>{label}</span>
              </motion.li>
            ))}
            <motion.li variants={featureItem} className="flex items-start gap-2 text-sm" style={{ color: "hsl(152, 40%, 18%)" }}>
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "hsl(43, 52%, 58%)" }} />
              <span>Your donation funds scholarship access for others</span>
            </motion.li>
          </motion.ul>
        </motion.div>

        {/* Donation section */}
        {!isSupporter && (
          <motion.div
            variants={fadeUp}
            className="rounded-xl p-6 space-y-5"
            style={{ backgroundColor: "hsl(0, 0%, 100%)" }}
          >
            <h2 className="text-base font-semibold font-serif" style={{ color: "hsl(152, 40%, 14%)" }}>
              Choose how you want to give
            </h2>

            {/* Monthly / One-time toggle */}
            <div className="flex items-center p-1 rounded-lg gap-1" style={{ backgroundColor: "hsl(138, 18%, 93%)" }}>
              {(["monthly", "once"] as DonationMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all"
                  style={mode === m
                    ? { backgroundColor: "hsl(0, 0%, 100%)", color: "hsl(152, 40%, 14%)", boxShadow: "0 1px 3px rgba(0,0,0,0.10)" }
                    : { backgroundColor: "transparent", color: "hsl(152, 22%, 50%)" }
                  }
                >
                  {m === "monthly" ? "Monthly" : "One-time"}
                </button>
              ))}
            </div>

            {/* Amount presets */}
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <motion.button
                    key={amt}
                    onClick={() => { setSelectedAmount(amt); setUseCustom(false); }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="py-2 rounded-lg text-sm font-semibold transition-all"
                    style={(!useCustom && selectedAmount === amt)
                      ? { backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)" }
                      : { border: "1.5px solid hsl(43, 52%, 78%)", color: "hsl(43, 42%, 46%)", backgroundColor: "transparent" }
                    }
                  >
                    ${amt}
                  </motion.button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "hsl(152, 22%, 50%)" }}>$</span>
                <input
                  type="number"
                  min="5"
                  step="1"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setUseCustom(true);
                  }}
                  onFocus={() => setUseCustom(true)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg text-sm border outline-none transition-all"
                  style={{
                    border: useCustom ? "1.5px solid hsl(43, 52%, 68%)" : "1.5px solid hsl(138, 18%, 80%)",
                    color: "hsl(152, 40%, 14%)",
                    backgroundColor: "hsl(138, 18%, 98%)",
                  }}
                />
              </div>
              {useCustom && effectiveAmount > 0 && effectiveAmount < 500 && (
                <p className="text-xs" style={{ color: "hsl(0, 55%, 55%)" }}>Minimum donation is $5.00</p>
              )}
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleCheckout}
              disabled={!isValidAmount || checkoutLoading}
              whileHover={isValidAmount && !checkoutLoading ? { scale: 1.02 } : {}}
              whileTap={isValidAmount && !checkoutLoading ? { scale: 0.97 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shimmer-on-hover premium-glow"
              style={{ backgroundColor: "hsl(43, 52%, 68%)", color: "hsl(152, 40%, 10%)" }}
            >
              {checkoutLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Heart className="w-4 h-4" />
              }
              {checkoutLoading
                ? "Redirecting…"
                : mode === "monthly"
                  ? `Give $${displayAmount}/month`
                  : `Give $${displayAmount} one time`
              }
            </motion.button>

            {checkoutError && (
              <p className="text-center text-xs" style={{ color: "hsl(0, 55%, 55%)" }}>
                Something went wrong. Please try again.
              </p>
            )}

            <p className="text-center text-xs" style={{ color: "hsl(152, 22%, 55%)" }}>
              Secure payment via Stripe · Cancel monthly donations anytime
            </p>
          </motion.div>
        )}

        {/* Already a supporter — manage billing */}
        {isSupporter && (
          <motion.div variants={fadeUp} className="text-center">
            <button
              onClick={async () => {
                const res = await fetch("/api/stripe/portal", { method: "POST" });
                if (res.ok) {
                  const { url } = await res.json() as { url: string };
                  if (url) window.location.href = url;
                }
              }}
              className="text-sm underline-offset-2 hover:underline transition-colors"
              style={{ color: "hsl(45, 55%, 88%)" }}
            >
              Manage your donation or billing
            </button>
          </motion.div>
        )}

        {/* Scholarship section */}
        <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={{ backgroundColor: "hsl(0, 0%, 100%)" }}>
          <button
            onClick={() => setScholarshipOpen(o => !o)}
            className="w-full flex items-center justify-between p-6 text-left"
            style={{ color: "hsl(152, 40%, 14%)" }}
          >
            <div>
              <h2 className="text-base font-semibold font-serif">Can't afford it right now?</h2>
              <p className="text-sm mt-0.5" style={{ color: "hsl(152, 22%, 50%)" }}>Apply for a scholarship — your access gets funded by other donors.</p>
            </div>
            {scholarshipOpen
              ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "hsl(152, 22%, 50%)" }} />
              : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "hsl(152, 22%, 50%)" }} />
            }
          </button>

          <AnimatePresence initial={false}>
            {scholarshipOpen && (
              <motion.div
                key="scholarship-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-4 border-t" style={{ borderColor: "hsl(138, 18%, 88%)" }}>
                  <p className="text-sm leading-relaxed pt-4" style={{ color: "hsl(152, 22%, 45%)" }}>
                    When donors give more than the minimum, that surplus goes into a scholarship pool.
                    Approved scholarship users get the same full access as every paying supporter.
                    There's no second-class version of this app.
                  </p>

                  {scholarshipStatus === "approved" && (
                    <div className="rounded-lg p-4 text-center space-y-1" style={{ backgroundColor: "hsl(138, 30%, 94%)", border: "1px solid hsl(138, 26%, 78%)" }}>
                      <p className="font-semibold text-sm" style={{ color: "hsl(138, 40%, 28%)" }}>Your scholarship is active</p>
                      <p className="text-xs" style={{ color: "hsl(138, 28%, 42%)" }}>You have full access. Thank you for being part of this community.</p>
                    </div>
                  )}

                  {scholarshipStatus === "pending" && !applySuccess && (
                    <div className="rounded-lg p-4 text-center space-y-1" style={{ backgroundColor: "hsl(43, 50%, 96%)", border: "1px solid hsl(43, 45%, 80%)" }}>
                      <p className="font-semibold text-sm" style={{ color: "hsl(43, 42%, 38%)" }}>Application received</p>
                      <p className="text-xs" style={{ color: "hsl(43, 32%, 52%)" }}>We'll review your application and notify you by email.</p>
                    </div>
                  )}

                  {scholarshipStatus === "waitlisted" && (
                    <div className="rounded-lg p-4 text-center space-y-1" style={{ backgroundColor: "hsl(220, 30%, 96%)", border: "1px solid hsl(220, 26%, 82%)" }}>
                      <p className="font-semibold text-sm" style={{ color: "hsl(220, 36%, 36%)" }}>You're on the waitlist</p>
                      <p className="text-xs" style={{ color: "hsl(220, 26%, 52%)" }}>As scholarship funding becomes available, you'll be notified.</p>
                    </div>
                  )}

                  {scholarshipStatus === "none" && !applySuccess && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "hsl(152, 28%, 40%)" }}>
                          Share a little about your situation (optional)
                        </label>
                        <textarea
                          rows={4}
                          placeholder="You don't have to explain yourself, but feel free to share anything that feels right…"
                          value={story}
                          onChange={(e) => setStory(e.target.value)}
                          maxLength={2000}
                          className="w-full p-3 rounded-lg text-sm resize-none outline-none transition-all"
                          style={{
                            border: "1.5px solid hsl(138, 18%, 80%)",
                            color: "hsl(152, 40%, 14%)",
                            backgroundColor: "hsl(138, 18%, 98%)",
                          }}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: "hsl(152, 18%, 62%)" }}>{story.length}/2000</p>
                      </div>

                      {applyError && (
                        <p className="text-xs" style={{ color: "hsl(0, 55%, 55%)" }}>{applyError}</p>
                      )}

                      <motion.button
                        onClick={handleApply}
                        disabled={applyLoading}
                        whileHover={!applyLoading ? { scale: 1.02 } : {}}
                        whileTap={!applyLoading ? { scale: 0.97 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ border: "1.5px solid hsl(43, 52%, 68%)", color: "hsl(43, 42%, 46%)", backgroundColor: "transparent" }}
                      >
                        {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                        {applyLoading ? "Submitting…" : "Apply for scholarship access"}
                      </motion.button>
                    </div>
                  )}

                  {applySuccess && scholarshipStatus !== "approved" && (
                    <div className="rounded-lg p-4 text-center space-y-1" style={{ backgroundColor: "hsl(138, 30%, 94%)", border: "1px solid hsl(138, 26%, 78%)" }}>
                      <p className="font-semibold text-sm" style={{ color: "hsl(138, 40%, 28%)" }}>Application submitted</p>
                      <p className="text-xs" style={{ color: "hsl(138, 28%, 42%)" }}>We'll be in touch. Thank you for reaching out.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p variants={fadeUp} className="text-center text-xs pb-4" style={{ color: "hsl(138, 20%, 60%)" }}>
          Payments are secure and processed by Stripe · Monthly donations cancel anytime
        </motion.p>
      </motion.div>
    </div>
  );
}
