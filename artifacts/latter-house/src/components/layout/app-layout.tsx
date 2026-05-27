import { Link, useLocation } from "wouter";
import {
  BookOpen, Calendar, CalendarDays, CalendarRange, Brain, Sparkles,
  Pill, DollarSign, Target, CalendarCheck, Activity,
  CreditCard, Home, LogOut, Sun, HeartPulse, TrendingUp, Lock,
  CheckSquare, BookHeart, Flame, Moon, Search, LayoutDashboard, Settings,
  Menu, X, ScrollText, HelpCircle, ShoppingBag, Wand2, ImageIcon, Droplets,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useClerk } from "@clerk/react";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notification-center";
import { HelpModal } from "@/components/help-modal";
import { useTier } from "@/contexts/TierContext";
import { useTheme } from "@/contexts/ThemeContext";
import { SearchModal } from "@/components/search-modal";

const mainNavigation = [
  { name: "Dashboard", short: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Day at a Glance", short: "Today", href: "/", icon: BookOpen },
  { name: "Declarations", short: "Declare", href: "/planner", icon: ScrollText },
  { name: "Weekly View", short: "Weekly", href: "/weekly", icon: Calendar },
  { name: "Monthly View", short: "Monthly", href: "/monthly", icon: CalendarDays },
  { name: "Year at a Glance", short: "Year", href: "/year", icon: CalendarRange },
  { name: "Task List", short: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Prayer Journal", short: "Prayer", href: "/prayer-journal", icon: BookHeart },
  { name: "Habit Tracker", short: "Habits", href: "/habits", icon: Flame },
  { name: "Brain Dump", short: "Brain", href: "/brain-dump", icon: Brain },
  { name: "Truth Generator", short: "Truth", href: "/truth-generator", icon: Sparkles },
  { name: "Side Hustle Hub", short: "Hustle", href: "/side-hustle", icon: ShoppingBag },
  { name: "AI Assistant", short: "AI", href: "/ai-assistant", icon: Wand2 },
  { name: "Vision Board", short: "Vision", href: "/vision-board", icon: ImageIcon },
  { name: "Cycle Tracker", short: "Cycle", href: "/cycle-tracker", icon: Droplets },
];

const trackerNavigation = [
  { name: "Medications", short: "Meds", href: "/trackers/medications", icon: Pill },
  { name: "Appointments", short: "Appts", href: "/trackers/appointments", icon: CalendarCheck },
  { name: "Health Conditions", short: "Health", href: "/trackers/health", icon: Activity },
  { name: "Financial", short: "Finance", href: "/trackers/financial", icon: DollarSign },
  { name: "Goals", short: "Goals", href: "/trackers/goals", icon: Target },
];

const premiumNavigation = [
  { name: "Daily Devotional", short: "Devotional", href: "/premium/devotional", icon: Sun },
  { name: "Weekly Plan Session", short: "Wk Plan", href: "/premium/weekly-plan", icon: Calendar },
  { name: "Health Summary", short: "Hlth Sum", href: "/premium/health-summary", icon: HeartPulse },
  { name: "Financial Coaching", short: "Fin Coach", href: "/premium/financial-coaching", icon: TrendingUp },
];

const allNavigation = [...mainNavigation, ...trackerNavigation];

async function openBillingPortal() {
  const res = await fetch("/api/stripe/portal", { method: "POST" });
  if (!res.ok) return;
  const { url } = await res.json() as { url: string };
  if (url) window.location.href = url;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const tier = useTier();
  const isPremium = tier === "premium";
  const isFree = tier === "free";
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [trackersOpen, setTrackersOpen] = useState(
    trackerNavigation.some(t => location.startsWith(t.href))
  );
  const [premiumOpen, setPremiumOpen] = useState(
    premiumNavigation.some(t => location.startsWith(t.href))
  );

  useEffect(() => {
    if (trackerNavigation.some(t => location.startsWith(t.href))) setTrackersOpen(true);
    if (premiumNavigation.some(t => location.startsWith(t.href))) setPremiumOpen(true);
  }, [location]);

  // Global Cmd+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(s => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const NavItem = ({ item, compact = false }: { item: typeof mainNavigation[0]; compact?: boolean }) => {
    const isActive = item.href === "/"
      ? (location === "/" || location.startsWith("/day/"))
      : location.startsWith(item.href);
    if (compact) {
      return (
        <Link href={item.href} className={cn(
          "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-md shrink-0 min-w-[58px] transition-all duration-200",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}>
          <item.icon className="h-4 w-4" />
          <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">{item.short}</span>
        </Link>
      );
    }
    return (
      <Link href={item.href} className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-all duration-300",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
      )}>
        <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60")} />
        <span className="flex-1">{item.name}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <nav className="space-y-1.5">
      {/* Search button */}
      {!isFree && (
        <button onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 font-medium">
          <Search className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/50" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="text-[9px] text-sidebar-foreground/30 bg-sidebar-accent px-1.5 py-0.5 rounded hidden md:block font-mono">⌘K</kbd>
        </button>
      )}

      {/* Main nav */}
      {(isFree ? [mainNavigation[0]] : mainNavigation).map((item) => (
        <NavItem key={item.name} item={item} />
      ))}

      {/* Trackers */}
      {!isFree && (
        <div className="space-y-1">
          <button onClick={() => setTrackersOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-all duration-200 font-medium">
            <span className="flex-1 text-left text-sidebar-foreground/50 text-xs uppercase tracking-wider">Trackers</span>
            <span className="text-sidebar-foreground/40 text-xs">{trackersOpen ? "▴" : "▾"}</span>
          </button>
          {trackersOpen && (
            <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
              {trackerNavigation.map(item => <NavItem key={item.name} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* Premium */}
      {!isFree && (
        <div className="space-y-1">
          <button onClick={() => setPremiumOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-all duration-200 font-medium">
            <span className="flex items-center gap-1.5 text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Premium
            </span>
            <span className="text-sidebar-foreground/40 text-xs">{premiumOpen ? "▴" : "▾"}</span>
          </button>
          {premiumOpen && (
            <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
              {premiumNavigation.map(item => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.name} href={item.href} className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-all duration-300",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
                  )}>
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60")} />
                    <span className="flex-1">{item.name}</span>
                    {!isPremium && <Lock className="w-3 h-3 text-sidebar-foreground/30 shrink-0" />}
                  </Link>
                );
              })}
              {!isPremium && (
                <Link href="/pricing" className="flex items-center gap-2 px-4 py-2 text-xs text-primary/80 hover:text-primary transition-colors">
                  <Sparkles className="w-3 h-3" /> Upgrade to Premium
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom utilities */}
      <div className="pt-3 border-t border-sidebar-border/50 space-y-1">
        {isFree && (
          <Link href="/pricing"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-primary hover:bg-sidebar-accent transition-all duration-300 font-semibold">
            <Sparkles className="h-[18px] w-[18px] shrink-0" />
            Upgrade Plan
          </Link>
        )}
        {!isFree && (
          <>
            <NotificationCenter compact={false} />
            <HelpModal compact={false} />
            {/* Settings */}
            <Link href="/settings" className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-all duration-300 font-medium",
              location === "/settings"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              <Settings className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
              Account Settings
            </Link>
            {/* Dark mode toggle */}
            <button onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 font-medium">
              {theme === "dark"
                ? <Sun className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
                : <Moon className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={openBillingPortal}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 font-medium"
            >
              <CreditCard className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
              Manage Billing
            </button>
          </>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-300 font-medium"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
          Sign Out
        </button>
      </div>
    </nav>
  );

  const bottomNavItems = [
    { name: "Today", href: "/", icon: BookOpen, isActive: location === "/" || location.startsWith("/day/") },
    { name: "Weekly", href: "/weekly", icon: Calendar, isActive: location === "/weekly" },
    { name: "Monthly", href: "/monthly", icon: CalendarDays, isActive: location === "/monthly" },
    { name: "Year", href: "/year", icon: CalendarRange, isActive: location === "/year" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Mobile top header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-20 shadow-sm">
        <span className="font-serif text-base font-medium text-sidebar-foreground tracking-wide">Latter House Life</span>
        <div className="flex items-center gap-1">
          {!isFree && (
            <button onClick={() => setSearchOpen(true)} className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
              <Search className="h-4 w-4" />
            </button>
          )}
          <button onClick={toggleTheme} className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!isFree && <NotificationCenter compact={true} />}
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      {!isFree && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-sidebar border-t border-sidebar-border shadow-lg">
          <div className="flex items-stretch">
            {bottomNavItems.map(item => (
              <Link key={item.href} href={item.href} className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
                item.isActive
                  ? "text-sidebar-primary-foreground bg-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            ))}
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
                drawerOpen ? "text-sidebar-primary-foreground bg-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}>
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile "More" drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-sidebar rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border/50">
              <span className="font-serif text-base font-medium text-sidebar-foreground">Menu</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3 space-y-0.5" onClick={() => setDrawerOpen(false)}>
              {[
                { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                { name: "Declarations", href: "/planner", icon: ScrollText },
                { name: "Task List", href: "/tasks", icon: CheckSquare },
                { name: "Prayer Journal", href: "/prayer-journal", icon: BookHeart },
                { name: "Habit Tracker", href: "/habits", icon: Flame },
                { name: "Brain Dump", href: "/brain-dump", icon: Brain },
                { name: "Truth Generator", href: "/truth-generator", icon: Sparkles },
                { name: "Side Hustle Hub", href: "/side-hustle", icon: ShoppingBag },
                { name: "AI Assistant", href: "/ai-assistant", icon: Wand2 },
                { name: "Vision Board", href: "/vision-board", icon: ImageIcon },
                { name: "Cycle Tracker", href: "/cycle-tracker", icon: Droplets },
              ].map(item => (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.startsWith(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              ))}

              <div className="pt-2 pb-1 px-4">
                <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium">Trackers</p>
              </div>
              {trackerNavigation.map(item => (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.startsWith(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              ))}

              <div className="pt-2 pb-1 px-4">
                <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Premium</p>
              </div>
              {premiumNavigation.map(item => (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.startsWith(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                  {!isPremium && <Lock className="w-3 h-3 ml-auto text-sidebar-foreground/30" />}
                </Link>
              ))}

              <div className="border-t border-sidebar-border/40 mt-2 pt-2 space-y-0.5">
                <Link href="/settings" className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location === "/settings" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                )}>
                  <Settings className="h-4 w-4 shrink-0" /> Account Settings
                </Link>
                <button onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
                  {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); openBillingPortal(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
                  <CreditCard className="h-4 w-4 shrink-0" /> Manage Billing
                </button>
                <button onClick={() => { setDrawerOpen(false); setHelpOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
                  <HelpCircle className="h-4 w-4 shrink-0" /> Help & Guide
                </button>
                <button onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
                  <LogOut className="h-4 w-4 shrink-0" /> Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r border-sidebar-border bg-sidebar z-10">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <img src="/logo.png" alt="Latter House Life" className="w-28 h-28 object-contain mb-1" />
          </div>
          <SidebarContent />
        </div>
        <div className="p-8 border-t border-sidebar-border/50">
          <p className="text-xs text-sidebar-foreground/40 italic font-serif leading-relaxed text-center">
            "The glory of this present house will be greater than the former."
            <br />— Haggai 2:9
          </p>
        </div>
      </div>

      <main className="flex-1 md:pl-64 overflow-y-auto w-full relative z-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
