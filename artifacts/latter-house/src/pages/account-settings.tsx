import { useUser, useClerk } from "@clerk/react";
import { useState } from "react";
import { User, Mail, CreditCard, Moon, Sun, Bell, Shield, ChevronRight, Check, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useTier } from "@/contexts/TierContext";
import { cn } from "@/lib/utils";

async function openBillingPortal() {
  const res = await fetch("/api/stripe/portal", { method: "POST" });
  if (!res.ok) return;
  const { url } = await res.json() as { url: string };
  if (url) window.location.href = url;
}

export default function AccountSettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const tier = useTier();
  const isPremium = tier === "premium";

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await user.reload();
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Couldn't update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBilling = async () => {
    setBillingLoading(true);
    await openBillingPortal();
    setBillingLoading(false);
  };

  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-foreground">Account Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your profile, subscription, and preferences</p>
          </div>
        </div>
      </header>

      {/* Profile */}
      <section className="journal-page p-6 space-y-5">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg font-medium">Profile</h2>
        </div>

        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-serif text-xl font-medium">
                {(user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress[0] ?? "?").toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{user?.fullName || "No name set"}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3" /> {email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">First Name</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <Input value={email ?? ""} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground/60">Email is managed by your sign-in provider.</p>
          </div>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Saving…" : <><Check className="w-4 h-4 mr-2" /> Save Profile</>}
          </Button>
        </form>
      </section>

      {/* Subscription */}
      <section className="journal-page p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg font-medium">Subscription</h2>
        </div>
        <div className={cn(
          "flex items-center justify-between rounded-lg p-4 border",
          isPremium ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
        )}>
          <div className="space-y-0.5">
            <p className="font-medium text-foreground flex items-center gap-2">
              {isPremium ? <><Sparkles className="w-4 h-4 text-primary" /> Premium Plan</> : "Free Plan"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isPremium ? "Full access to all features including AI tools and premium reports." : "Upgrade to unlock the full planner and all trackers."}
            </p>
          </div>
          {isPremium ? (
            <Button variant="outline" onClick={handleBilling} disabled={billingLoading} className="shrink-0 ml-4">
              {billingLoading ? "Loading…" : "Manage Billing"}
            </Button>
          ) : (
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 ml-4">
              <a href="/pricing">Upgrade</a>
            </Button>
          )}
        </div>
        {isPremium && (
          <p className="text-xs text-muted-foreground">
            To cancel or update your payment method, click "Manage Billing" above.
          </p>
        )}
      </section>

      {/* Preferences */}
      <section className="journal-page p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-lg font-medium">Preferences</h2>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark appearance</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none",
              theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
              theme === "dark" ? "translate-x-6" : "translate-x-1"
            )} />
          </button>
        </div>

        {/* Security - just links to Clerk */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Security</p>
              <p className="text-xs text-muted-foreground">Change password and manage security settings</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </div>
      </section>

      {/* Danger zone */}
      <section className="journal-page p-6 space-y-4 border-destructive/20">
        <h2 className="font-serif text-lg font-medium text-foreground">Sign Out</h2>
        <p className="text-sm text-muted-foreground">You'll need to sign back in to access your planner.</p>
        <Button variant="outline" onClick={() => signOut()} className="text-destructive border-destructive/30 hover:bg-destructive/5">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </section>
    </div>
  );
}
