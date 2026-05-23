import { useState, useEffect } from "react";

const PASSWORD = "LHL2026";
const STORAGE_KEY = "lhl_access_granted";

function checkAccess(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === "true";
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setGranted(checkAccess());
    setChecking(false);
  }, []);

  if (checking) return null;
  if (granted) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setGranted(true);
    } else {
      setError(true);
      setValue("");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="texture-overlay" />
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary/5 translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 max-w-sm w-full text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/lhl-logo.png"
            alt="Latter House Life"
            className="w-24 h-24 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <h1 className="text-4xl font-serif font-semibold text-foreground tracking-tight">
              Latter House Life
            </h1>
            <p className="text-primary font-serif italic text-lg mt-1">
              Your faith-filled planning companion
            </p>
          </div>
        </div>

        <div className="journal-page p-6 space-y-2">
          <p className="font-serif italic text-foreground/80 text-base leading-relaxed">
            "The glory of this present house will be greater than the former."
          </p>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">— Haggai 2:9</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              placeholder="Enter access code"
              autoFocus
              className="w-full border border-border rounded-lg px-4 py-3 text-center text-base bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && (
              <p className="text-destructive text-xs">Incorrect access code. Please try again.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium py-3 px-6 rounded-lg text-base shadow-sm"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
