import { useState } from "react";
import { format } from "date-fns";
import { Plus, Check, Loader2 } from "lucide-react";
import { useCreateTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddSuggestionTask({ suggestion }: { suggestion: string }) {
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createTask = useCreateTask();

  const handleAdd = () => {
    createTask.mutate(
      { data: { date, text: suggestion } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listTasks"] });
          setAdded(true);
          setExpanded(false);
          const displayDate = date === format(new Date(), "yyyy-MM-dd") ? "today" : format(new Date(date + "T12:00:00"), "MMM d");
          toast({ title: `Task added for ${displayDate}` });
        },
        onError: () => {
          toast({ title: "Couldn't add task", variant: "destructive" });
        },
      }
    );
  };

  if (added) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
        <Check className="w-3 h-3" /> Added
      </span>
    );
  }

  return (
    <div className="mt-2">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="w-3 h-3" /> Add as Task
        </button>
      ) : (
        <div className={cn("flex items-center gap-2 animate-in slide-in-from-top-1 duration-150")}>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-7 text-xs w-36 border-primary/30 focus-visible:ring-primary/30"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={createTask.isPending}
            className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3"
          >
            {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </Button>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
