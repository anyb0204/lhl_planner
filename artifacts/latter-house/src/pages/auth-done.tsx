import { useEffect } from "react";

export default function AuthDone() {
  useEffect(() => {
    if (window.opener) {
      // Signal the main window that auth is complete, then close
      window.opener.postMessage("lhl-auth-complete", "*");
      window.close();
    } else {
      // Not in a popup — just go home
      window.location.replace("/");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="font-serif text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
