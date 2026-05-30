import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useUser, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { TierContext, type Tier } from "@/contexts/TierContext";
import LandingPage from "@/pages/landing";

import DailyPlanner from "@/pages/daily";
import DayAtAGlance from "@/pages/day-at-a-glance";
import WeeklyPlanner from "@/pages/weekly";
import MonthlyPlanner from "@/pages/monthly";
import BrainDump from "@/pages/brain-dump";
import TruthGenerator from "@/pages/truth-generator";
import MedicationsTracker from "@/pages/trackers/medications";
import AppointmentsTracker from "@/pages/trackers/appointments";
import HealthConditions from "@/pages/trackers/health";
import FinancialTracker from "@/pages/trackers/financial";
import GoalsTracker from "@/pages/trackers/goals";
import PricingPage from "@/pages/pricing";
import WelcomePage from "@/pages/welcome";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import FreePlannerPage from "@/pages/free-planner";
import WeeklyPlanPage from "@/pages/premium/weekly-plan";
import HealthSummaryPage from "@/pages/premium/health-summary";
import FinancialCoachingPage from "@/pages/premium/financial-coaching";
import DevotionalPage from "@/pages/premium/devotional";
import TasksPage from "@/pages/tasks";
import PrayerJournalPage from "@/pages/prayer-journal";
import HabitsPage from "@/pages/habits";
import DashboardPage from "@/pages/dashboard";
import YearAtAGlance from "@/pages/year-at-a-glance";
import AccountSettingsPage from "@/pages/account-settings";
import OnboardingPage from "@/pages/onboarding";
import SideHustlePage from "@/pages/side-hustle/index";
import AIAssistantPage from "@/pages/ai-assistant";
import VisionBoardPage from "@/pages/vision-board";
import MenstrualTrackerPage from "@/pages/menstrual-tracker";
import { RemindersProvider } from "@/contexts/RemindersContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/lhl-logo.png`,
  },
  variables: {
    colorPrimary: "#1F6A63",
    colorForeground: "#4A4A47",
    colorMutedForeground: "#5E6A65",
    colorDanger: "hsl(0, 60%, 50%)",
    colorBackground: "#FFFFFF",
    colorInput: "#F4F1E9",
    colorInputForeground: "#4A4A47",
    colorNeutral: "#C8C5BD",
    fontFamily: "'Aptos', 'Inter', system-ui, sans-serif",
    borderRadius: "0.3rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-xl w-full max-w-[440px] overflow-hidden shadow-xl border border-[#C8C5BD]",
    card: "!shadow-none !border-0 !rounded-none",
    footer: "!shadow-none !border-0 !rounded-none",
    headerTitle: "font-serif text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-foreground",
    logoBox: "flex justify-center",
    logoImage: "h-16 w-16 object-contain",
    socialButtonsBlockButton: "border-border",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    formFieldInput: "bg-input border-border text-foreground",
    footerAction: "bg-transparent",
    dividerLine: "bg-border",
    alert: "border-border",
    otpCodeFieldInput: "border-border",
    formFieldRow: "",
    main: "",
  },
};

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function LoginScreen() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10" style={{ backgroundColor: "#1F6A63" }}>
      <div className="w-full max-w-sm text-center space-y-7">
        <div className="flex flex-col items-center gap-4">
          <img src="/lhl-logo.png" alt="Latter House Life" className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <h1 className="font-normal leading-tight" style={{ color: "#CDBE8A", fontFamily: "'Kapakana', cursive", wordSpacing: "-0.1em", fontSize: "clamp(2.2rem, 10vw, 3.75rem)" }}>
              Latter House Life
            </h1>
            <p className="font-serif italic text-base sm:text-lg mt-1" style={{ color: "#F4F1E9" }}>
              Your faith-filled planning companion
            </p>
          </div>
        </div>
        <div className="rounded-lg px-5 py-5 space-y-2" style={{ backgroundColor: "#2F4F3E", border: "1px solid #1F6A63" }}>
          <p className="font-serif italic text-base leading-relaxed" style={{ color: "#F4F1E9" }}>
            "The glory of this present house will be greater than the former."
          </p>
          <p className="text-xs tracking-widest uppercase" style={{ color: "#CDBE8A" }}>— Haggai 2:9</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#A8B8A2" }}>
            Sign in to access your personal planner, trackers, and daily encouragement.
          </p>
          <button onClick={() => setLocation("/sign-in")}
            className="w-full font-medium py-3.5 px-6 rounded-lg text-base shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#CDBE8A", color: "#2F4F3E" }}>
            Sign In
          </button>
          <button onClick={() => setLocation("/sign-up")}
            className="w-full font-medium py-3.5 px-6 rounded-lg text-base transition-all hover:opacity-90"
            style={{ backgroundColor: "transparent", border: "1px solid #CDBE8A", color: "#F4F1E9" }}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "#1F6A63" }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={clerkAppearance} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "#1F6A63" }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={clerkAppearance} />
    </div>
  );
}

// ── Tier cache ───────────────────────────────────────────────────────────────
// Cache confirmed paid tiers for 1 hour to prevent flicker on reload.
// "free" is never cached — always re-verified fresh.

const TIER_CACHE_KEY = "lhl_sub_tier_v2";
const TIER_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function readTierCache(): "regular" | "premium" | null {
  try {
    // Migrate away from old boolean cache
    localStorage.removeItem("lhl_sub_active_v1");
    const raw = localStorage.getItem(TIER_CACHE_KEY);
    if (!raw) return null;
    const { tier, at } = JSON.parse(raw) as { tier: string; at: number };
    if (Date.now() - at > TIER_CACHE_TTL) { localStorage.removeItem(TIER_CACHE_KEY); return null; }
    if (tier === "regular" || tier === "premium") return tier;
    return null;
  } catch { return null; }
}

function writeTierCache(tier: Tier) {
  try {
    if (tier === "regular" || tier === "premium") {
      localStorage.setItem(TIER_CACHE_KEY, JSON.stringify({ tier, at: Date.now() }));
    } else {
      localStorage.removeItem(TIER_CACHE_KEY);
    }
  } catch {}
}

async function fetchTier(): Promise<Tier | null> {
  try {
    const r = await fetch("/api/stripe/subscription-status");
    if (r.status === 503) return null;
    if (!r.ok) return null;
    const data = await r.json() as { tier?: string };
    if (data.tier === "regular" || data.tier === "premium") return data.tier;
    if (data.tier === "free") return "free";
    // Legacy response shape fallback ({ active: boolean })
    if (typeof (data as { active?: boolean }).active === "boolean") {
      return (data as { active?: boolean }).active ? "regular" : "free";
    }
    return "free";
  } catch { return null; }
}

function useSubscriptionTier(isSignedIn: boolean | undefined) {
  const cachedTier = readTierCache();
  const [tier, setTier] = useState<"loading" | Tier>(cachedTier ?? "loading");

  useEffect(() => {
    if (!isSignedIn) { setTier("loading"); return; }
    let cancelled = false;

    async function verify() {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2500));
        const result = await fetchTier();
        if (cancelled) return;
        if (result !== null) {
          writeTierCache(result);
          setTier(result);
          return;
        }
        // null = transient error, retry
      }
      // All retries failed — fall back to cache or free
      if (!cancelled) {
        const cached = readTierCache();
        setTier(cached ?? "free");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [isSignedIn]);

  return tier;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/settings" component={AccountSettingsPage} />
        <Route path="/welcome" component={WelcomePage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/free-planner" component={FreePlannerPage} />
        <Route path="/premium/weekly-plan" component={WeeklyPlanPage} />
        <Route path="/premium/health-summary" component={HealthSummaryPage} />
        <Route path="/premium/financial-coaching" component={FinancialCoachingPage} />
        <Route path="/premium/devotional" component={DevotionalPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/prayer-journal" component={PrayerJournalPage} />
        <Route path="/habits" component={HabitsPage} />
        <Route path="/day/:date" component={DayAtAGlance} />
        <Route path="/" component={DayAtAGlance} />
        <Route path="/planner/:date" component={DailyPlanner} />
        <Route path="/planner" component={DailyPlanner} />
        <Route path="/weekly" component={WeeklyPlanner} />
        <Route path="/monthly" component={MonthlyPlanner} />
        <Route path="/year" component={YearAtAGlance} />
        <Route path="/brain-dump" component={BrainDump} />
        <Route path="/truth-generator" component={TruthGenerator} />
        <Route path="/trackers/medications" component={MedicationsTracker} />
        <Route path="/trackers/appointments" component={AppointmentsTracker} />
        <Route path="/trackers/health" component={HealthConditions} />
        <Route path="/trackers/financial" component={FinancialTracker} />
        <Route path="/trackers/goals" component={GoalsTracker} />
        <Route path="/side-hustle" component={SideHustlePage} />
        <Route path="/ai-assistant" component={AIAssistantPage} />
        <Route path="/vision-board" component={VisionBoardPage} />
        <Route path="/cycle-tracker" component={MenstrualTrackerPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function FreePlannerRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/welcome" component={WelcomePage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route component={FreePlannerPage} />
      </Switch>
    </AppLayout>
  );
}

function AppRouter() {
  const { isSignedIn, isLoaded } = useUser();
  const [timedOut, setTimedOut] = useState(false);
  const tierStatus = useSubscriptionTier(isSignedIn);
  const [location, setLocation] = useLocation();
  const justSubscribed = location.includes("subscribed=true");

  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [isLoaded]);

  // After Stripe checkout success, poll until subscription is confirmed then reload
  useEffect(() => {
    if (!justSubscribed || !isSignedIn) return;
    setLocation("/", { replace: true });
    const delays = [1500, 3500, 7000, 12000];
    const timers = delays.map(delay =>
      setTimeout(async () => {
        const result = await fetchTier();
        if (result && result !== "free") {
          writeTierCache(result);
          window.location.reload();
        }
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [justSubscribed, isSignedIn, setLocation]);

  if (!isLoaded && !timedOut) return <Spinner />;
  // Show landing page for non-authenticated visitors (auth routes handled by parent Switch)
  if (!isSignedIn) return <LandingPage />;
  if (tierStatus === "loading") return <Spinner />;

  const tier: Tier = tierStatus;

  const onboardingDone = localStorage.getItem("lhl-onboarding-done") === "true";
  if (tier !== "free" && !onboardingDone && location !== "/onboarding" && !location.startsWith("/sign")) {
    return (
      <TierContext.Provider value={tier}>
        <RemindersProvider>
          <OnboardingPage />
        </RemindersProvider>
      </TierContext.Provider>
    );
  }

  return (
    <TierContext.Provider value={tier}>
      {tier === "free" ? <FreePlannerRouter /> : <RemindersProvider><Router /></RemindersProvider>}
    </TierContext.Provider>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qClient.clear();
        writeTierCache("free");
        localStorage.removeItem(TIER_CACHE_KEY);
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Latter House Life planner" } },
        signUp: { start: { title: "Create your account", subtitle: "Start your faith-filled planning journey" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route>
              <AppRouter />
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
