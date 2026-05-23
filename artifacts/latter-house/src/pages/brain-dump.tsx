import { useState } from "react";
import { format } from "date-fns";
import { useCreateBrainDump, useBrainDumpHelp, useCreateTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Brain, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function BrainDump() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [date] = useState(() => format(new Date(), "yyyy-MM-dd"));
  
  const createDump = useCreateBrainDump();
  const dumpHelp = useBrainDumpHelp();
  const createTask = useCreateTask();

  const [results, setResults] = useState<{
    tasks: { text: string; priority?: string }[];
    followUpQuestions: string[];
    encouragement: string;
  } | null>(null);

  const [addedTasks, setAddedTasks] = useState<Set<number>>(new Set());

  const CHAR_LIMIT = 3000;

  const handleOrganize = () => {
    if (!text.trim() || text.length > CHAR_LIMIT) return;
    
    // Save it first
    createDump.mutate({ data: { date, rawText: text } });
    
    // Then get help
    dumpHelp.mutate({ data: { date, text } }, {
      onSuccess: (data) => {
        setResults(data);
      }
    });
  };

  const handleAddTask = (taskText: string, priority: string | undefined, index: number) => {
    createTask.mutate({ data: { date, text: taskText, priority, source: "brain-dump" } }, {
      onSuccess: () => {
        setAddedTasks(prev => new Set(prev).add(index));
        toast({
          title: "Task added",
          description: "Added to your daily planner.",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Brain className="w-10 h-10 text-primary opacity-80" />
          Brain Dump
        </h1>
        <p className="text-lg text-muted-foreground mt-4 font-serif italic max-w-2xl">
          Pour it all out. Everything that's swirling. Every task, every worry, every thing you haven't done. This is your safe space to empty your mind.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="journal-page p-1 h-[600px] flex flex-col">
            <Textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing here..."
              maxLength={CHAR_LIMIT}
              className="flex-1 border-0 bg-transparent resize-none p-6 text-base md:text-lg leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 font-serif"
            />
            <div className="px-6 pb-3 flex justify-end">
              <span className={`text-xs tabular-nums ${text.length >= CHAR_LIMIT ? "text-destructive font-medium" : "text-muted-foreground/50"}`}>
                {text.length.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              size="lg" 
              onClick={handleOrganize}
              disabled={!text.trim() || dumpHelp.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {dumpHelp.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Organize My Thoughts
            </Button>
          </div>
        </div>

        <div>
          {dumpHelp.isPending ? (
            <div className="h-[600px] journal-page flex flex-col items-center justify-center text-center p-8 opacity-70">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="font-serif text-lg text-foreground">Sifting through your thoughts...</p>
              <p className="text-sm text-muted-foreground mt-2">Finding the order in the chaos.</p>
            </div>
          ) : results ? (
            <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
              
              {/* Encouragement */}
              <div className="journal-page p-6 border-l-4 border-l-primary bg-primary/5">
                <p className="font-serif text-lg text-foreground italic">
                  {results.encouragement}
                </p>
              </div>

              {/* Tasks */}
              {results.tasks && results.tasks.length > 0 && (
                <div className="journal-page p-6 space-y-4">
                  <h3 className="font-serif text-xl font-medium text-foreground flex items-center gap-2">
                    Extracted Tasks
                  </h3>
                  <div className="space-y-3">
                    {results.tasks.map((task, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-background/50 rounded border border-border/50">
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">{task.text}</p>
                          {task.priority && (
                            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                              {task.priority} Priority
                            </span>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={addedTasks.has(i) ? "secondary" : "outline"}
                          className="shrink-0 h-8 text-xs"
                          disabled={addedTasks.has(i) || createTask.isPending}
                          onClick={() => handleAddTask(task.text, task.priority, i)}
                        >
                          {addedTasks.has(i) ? (
                            <><Check className="w-3 h-3 mr-1" /> Added</>
                          ) : (
                            <><ArrowRight className="w-3 h-3 mr-1" /> Add to Day</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow Up */}
              {results.followUpQuestions && results.followUpQuestions.length > 0 && (
                <div className="journal-page p-6 space-y-4">
                  <h3 className="font-serif text-xl font-medium text-foreground flex items-center gap-2">
                    Questions to Consider
                  </h3>
                  <div className="space-y-3">
                    {results.followUpQuestions.map((q, i) => (
                      <Card key={i} className="bg-background/50 shadow-none border-border/50">
                        <CardContent className="p-4">
                          <p className="text-sm text-foreground/90">{q}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] journal-page flex flex-col items-center justify-center text-center p-8 opacity-50">
              <Sparkles className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="font-serif text-lg text-foreground">Your organized thoughts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
