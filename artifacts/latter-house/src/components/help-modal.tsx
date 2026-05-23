import { HelpCircle, BookOpen, Calendar, Brain, Sparkles, Pill, CalendarCheck, Activity, DollarSign, Target, Shield, Smartphone, Share2, MoreHorizontal, PlusSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Section = "planner" | "ai" | "trackers" | "install";

const sections: Array<{ id: Section; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "planner", label: "Planning", icon: BookOpen },
  { id: "ai", label: "AI Tools", icon: Sparkles },
  { id: "trackers", label: "Trackers", icon: Target },
  { id: "install", label: "Install App", icon: Smartphone },
];

export function HelpModal({
  compact = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [active, setActive] = useState<Section>("planner");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  return (
    <>
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "transition-colors",
            compact
              ? "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-md shrink-0 min-w-[58px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              : "flex items-center gap-3 px-4 py-3 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium w-full"
          )}
          aria-label="Help"
        >
          <HelpCircle className={compact ? "h-4 w-4" : "h-[18px] w-[18px] text-sidebar-foreground/60"} />
          {compact ? (
            <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">Help</span>
          ) : (
            <span>Help & Guide</span>
          )}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-primary/20 shadow-xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-serif text-2xl font-medium text-primary flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> How to Use Latter House Life
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Your faith-filled planning companion — a quick guide to every feature.</p>
          </DialogHeader>

          <div className="flex gap-1 px-6 pt-4 shrink-0 border-b border-border/50 pb-0 overflow-x-auto">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap shrink-0",
                  active === s.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {active === "planner" && (
              <>
                <HelpSection icon={BookOpen} title="Daily Planner">
                  <HelpItem title="Today's intention">
                    Write your "I am called to be someone who…" statement at the top. Speak who God is calling you to be today.
                  </HelpItem>
                  <HelpItem title="Top Priorities">
                    List 1–3 things that calling requires today. Keep it focused and faith-aligned.
                  </HelpItem>
                  <HelpItem title="Schedule">
                    Click any time slot and type what's happening. Your entries auto-save when you click away.
                  </HelpItem>
                  <HelpItem title="Tasks — any date" highlight>
                    Use the task form at the bottom of the Tasks section. The date picker defaults to today — change it to add a task to any future date. The task will appear on that day's view.
                  </HelpItem>
                  <HelpItem title="Gratitude & Notes">
                    End your day here — three things you're grateful for, then reflection notes at the bottom.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Calendar} title="Weekly & Monthly Views">
                  <HelpItem title="Weekly View">
                    See all 7 days side by side. Navigate weeks with the arrows. Tasks show with a completion ratio so you can see how the week is going at a glance.
                  </HelpItem>
                  <HelpItem title="Monthly Calendar">
                    Click any day on the calendar to jump to it. Priorities and tasks appear as dots on each day.
                  </HelpItem>
                  <HelpItem title="Adding suggestions to your schedule" highlight>
                    After clicking Weekly Help or Monthly Help, each suggestion has an "+ Add as Task" button. Pick a date and it drops right onto your planner.
                  </HelpItem>
                </HelpSection>
              </>
            )}

            {active === "ai" && (
              <>
                <HelpSection icon={Sparkles} title="Scripture & Encouragement">
                  <HelpItem title="Today's Word">
                    Tap on the Daily Planner to get a fresh scripture for the day. A new verse draws each time — save the ones that speak to you by writing them in your notes.
                  </HelpItem>
                  <HelpItem title="Encouragement">
                    A personalized word of encouragement based on where you are. Tap it anytime you need a lift.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Shield} title="Arm Yourself with Truth">
                  <HelpItem title="Name the lie">
                    Write a negative thought or lie you're fighting — "I'm too far behind," "I'm not enough." God's Word will replace it with truth.
                  </HelpItem>
                  <HelpItem title="God's response">
                    You'll receive a scripture, an affirmation, and a reflection tailored to that specific lie. Read it slowly. Let it settle.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Brain} title="Brain Dump">
                  <HelpItem title="Empty your mind">
                    Go to Brain Dump and type everything swirling in your head — tasks, worries, ideas, errands. Don't filter it.
                  </HelpItem>
                  <HelpItem title="AI organizes it">
                    Hit "Organize My Thoughts" and the AI will sort it into prioritized tasks, follow-up questions, and an encouraging word.
                  </HelpItem>
                  <HelpItem title="Add tasks to planner">
                    Check the tasks you want and they'll be added to your Daily Planner automatically.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Sparkles} title="Planning Help (Daily / Weekly / Monthly)">
                  <HelpItem title="Context-aware guidance">
                    The Help buttons read your current schedule and tasks, then give you faith-based suggestions for what to prioritize, protect, or let go of.
                  </HelpItem>
                  <HelpItem title="Add suggestions as tasks" highlight>
                    Each suggestion has an "+ Add as Task" button. Choose a date and the suggestion is added to your planner so you don't lose it.
                  </HelpItem>
                </HelpSection>
              </>
            )}

            {active === "trackers" && (
              <>
                <HelpSection icon={Pill} title="Medications">
                  <HelpItem title="Adding medications">
                    Tap "Add Medication" and fill in the name, dose, and when to take it. Only the name is required — add details over time.
                  </HelpItem>
                  <HelpItem title="Refill reminders" highlight>
                    Set a refill date and you'll see a reminder in the notification bell (🔔) 7 days before it's due.
                  </HelpItem>
                  <HelpItem title="Family medications">
                    Track medications for your whole household — add a note in the medication name or notes field for who it belongs to.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={CalendarCheck} title="Appointments">
                  <HelpItem title="Any kind of appointment">
                    Track medical, legal, financial, personal, or any other appointments — for yourself or anyone in your care. Use the "Category / Type" field to distinguish them.
                  </HelpItem>
                  <HelpItem title="Upcoming reminders" highlight>
                    Appointments in the next 7 days show up in the notification bell with urgency color coding — same-day in red, within 2 days in amber, the rest in gold.
                  </HelpItem>
                  <HelpItem title="Questions / Items to Discuss">
                    Use that field before any appointment — so you don't forget what you wanted to bring up.
                  </HelpItem>
                  <HelpItem title="Marking complete">
                    After the appointment, tap the checkmark (✓) to mark it done. It moves to Past/Completed and fades out.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Activity} title="Health Conditions">
                  <HelpItem title="Tracking conditions">
                    Add ongoing conditions, diagnoses, or health history for yourself or family members. Include the doctor, diagnosed date, and severity if you know them.
                  </HelpItem>
                  <HelpItem title="Status tracking">
                    Mark each condition as Active, Managed, or Resolved. Conditions sort by status so active ones stay at the top.
                  </HelpItem>
                  <HelpItem title="Notes">
                    Use the notes field for current treatments, medications related to that condition, or anything you want to remember at the next appointment.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={DollarSign} title="Financial Tracker">
                  <HelpItem title="Starting balance">
                    Set the money you had at the start of the month. This is stored just for you on this device.
                  </HelpItem>
                  <HelpItem title="Types of entries">
                    Income, Expense, Tithe, Giving/Offering, and Savings. The Kingdom Giving section highlights your tithe + offerings for the month.
                  </HelpItem>
                  <HelpItem title="Balance alerts" highlight>
                    If your balance drops below $100 or goes negative, a warning appears in the notification bell so you can address it quickly.
                  </HelpItem>
                  <HelpItem title="Switching months">
                    Use the month picker to review past months. Each month has its own starting balance.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={Target} title="Goal Tracker">
                  <HelpItem title="Creating a goal">
                    Only the title is required. Add a category, target date, description, and milestones as you have them — partial goals are fine.
                  </HelpItem>
                  <HelpItem title="Categories">
                    Filter your goals by Spiritual, Personal, Health, Business, Family, or Kingdom. Each color-codes goals for easy scanning.
                  </HelpItem>
                  <HelpItem title="Progress">
                    Update progress from Not Started → In Progress → Completed. Check the checkbox to mark fully done.
                  </HelpItem>
                </HelpSection>
              </>
            )}

            {active === "install" && (
              <div className="space-y-6">
                <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 space-y-2">
                  <p className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary shrink-0" />
                    Save Latter House Life to your home screen
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Once saved, it opens full-screen like a real app — no browser bar, no distractions. Your data stays safe in the cloud and nothing is stored on the phone itself.
                  </p>
                </div>

                <HelpSection icon={Share2} title="iPhone / iPad (Safari)">
                  <HelpItem title="Step 1 — Open in Safari">
                    The app must be open in Safari (not Chrome or another browser). If you're in a different browser, copy the link and paste it into Safari.
                  </HelpItem>
                  <HelpItem title="Step 2 — Tap the Share button" highlight>
                    At the bottom of Safari, tap the box with the arrow pointing up (⬆). This is the Share button.
                  </HelpItem>
                  <HelpItem title="Step 3 — Add to Home Screen">
                    Scroll down in the share sheet and tap <strong>Add to Home Screen</strong>. You'll see "Latter House" as the name — tap <strong>Add</strong> in the top right.
                  </HelpItem>
                  <HelpItem title="Step 4 — Done!">
                    A Latter House icon will appear on your home screen. Tap it anytime to open the planner full-screen.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={PlusSquare} title="Android (Chrome)">
                  <HelpItem title="Step 1 — Open in Chrome">
                    Make sure you're using the Chrome browser on your Android phone.
                  </HelpItem>
                  <HelpItem title="Step 2 — Tap the three-dot menu" highlight>
                    In the top-right corner of Chrome, tap the three dots (⋮) to open the menu.
                  </HelpItem>
                  <HelpItem title="Step 3 — Add to Home screen">
                    Tap <strong>Add to Home screen</strong> (or "Install app" if you see that option instead). Confirm by tapping <strong>Add</strong>.
                  </HelpItem>
                  <HelpItem title="Step 4 — Done!">
                    The Latter House icon will appear on your home screen and in your app drawer. It opens full-screen, just like a native app.
                  </HelpItem>
                </HelpSection>

                <HelpSection icon={MoreHorizontal} title="Chromebook">
                  <HelpItem title="From Chrome browser">
                    In Chrome, click the three dots (⋮) in the top-right corner, then look for <strong>Save and share → Create shortcut</strong> or <strong>Install Latter House Life</strong>. Click it and the app will open in its own window without browser chrome.
                  </HelpItem>
                </HelpSection>

                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Share this with your users:</strong> Once they install it, the planner lives on their home screen and loads instantly. Their account and all their data are tied to their login — not the device — so they can uninstall and reinstall without losing anything.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HelpSection({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        {title}
      </h3>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

function HelpItem({ title, highlight, children }: {
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "space-y-0.5 p-2 rounded-md",
      highlight ? "bg-primary/5 border border-primary/15" : ""
    )}>
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        {highlight && <span className="text-primary text-[10px] uppercase tracking-wider font-bold">Tip · </span>}
        {title}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
