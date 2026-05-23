import { useState } from "react";
import { useGenerateTruth } from "@workspace/api-client-react";
import { Loader2, Sparkles, Quote, Bookmark, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function TruthGenerator() {
  const [lie, setLie] = useState("");
  const { toast } = useToast();
  const generateTruth = useGenerateTruth();
  const [result, setResult] = useState<{
    lie: string;
    scriptureReference: string;
    scriptureText: string;
    affirmation: string;
    reflection: string;
  } | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lie.trim()) return;

    generateTruth.mutate(
      { data: { lie } },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: () => {
          toast({
            title: "Something went wrong",
            description: "The truth is still yours — try again in a moment.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const reset = () => {
    setLie("");
    setResult(null);
    generateTruth.reset();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in duration-500 py-12">

      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2 text-primary">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground">
          The Truth Will Set You Free
        </h1>
        <p className="text-lg text-muted-foreground font-serif italic max-w-xl mx-auto">
          Pour out the lies you've been carrying, and let God's Word wash over them with truth.
        </p>
      </div>

      {!result ? (
        <form onSubmit={handleGenerate} className="space-y-6 max-w-2xl mx-auto">
          <div className="journal-page p-8">
            <label htmlFor="lie" className="block text-sm font-medium text-foreground/80 mb-4 uppercase tracking-widest text-center">
              What lie have you been believing?
            </label>
            <Textarea
              id="lie"
              value={lie}
              onChange={(e) => setLie(e.target.value)}
              placeholder="e.g., I'm too late to start over, I've missed my calling, I'm not equipped for this..."
              className="min-h-[120px] text-lg font-serif border-0 border-b border-dashed border-border/60 bg-transparent resize-none p-4 text-center focus-visible:ring-0 focus-visible:border-primary/50 shadow-none placeholder:text-muted-foreground/30"
              disabled={generateTruth.isPending}
            />
          </div>

          {generateTruth.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md max-w-2xl mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Something went wrong. Please try again.</span>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-sm h-12 text-base font-medium transition-all hover:scale-[1.02]"
              disabled={!lie.trim() || generateTruth.isPending}
            >
              {generateTruth.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Seeking Truth...
                </>
              ) : (
                <>Reveal the Truth</>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="journal-page p-8 md:p-12 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <Quote className="absolute top-8 left-8 w-24 h-24 text-primary/5 rotate-180 pointer-events-none" />

            <div className="space-y-2 text-center relative z-10">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">The Lie You Believed</span>
              <p className="text-lg font-serif text-foreground/60 line-through decoration-primary/30 decoration-2">
                "{result.lie}"
              </p>
            </div>

            <div className="space-y-6 text-center relative z-10">
              <span className="text-xs uppercase tracking-widest text-primary font-medium">What God Says</span>
              <h2 className="text-3xl font-serif font-bold text-foreground">
                {result.scriptureReference}
              </h2>
              <blockquote className="text-2xl font-serif italic text-foreground leading-relaxed px-4 md:px-8 border-x border-primary/20">
                "{result.scriptureText}"
              </blockquote>
            </div>

            <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 relative z-10">
              <span className="block text-xs uppercase tracking-widest text-primary font-medium mb-3 text-center">Your Declaration</span>
              <p className="text-xl text-center font-medium text-foreground">
                {result.affirmation}
              </p>
            </div>

            <div className="space-y-3 relative z-10 border-t border-border/50 pt-8 mt-8">
              <span className="text-xs uppercase tracking-widest text-muted-foreground text-center block">Reflection</span>
              <p className="text-foreground/80 leading-relaxed font-serif text-center max-w-lg mx-auto">
                {result.reflection}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8">
            <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5" onClick={reset}>
              New Entry
            </Button>
            <Button variant="default" className="bg-foreground hover:bg-foreground/90 text-background">
              <Bookmark className="w-4 h-4 mr-2" />
              Save Truth
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
