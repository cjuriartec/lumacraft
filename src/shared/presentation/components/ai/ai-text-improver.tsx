"use client";

import { BrainCircuit, Briefcase, Gavel, Loader2, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";

import { type AITone } from "@/modules/ai/domain/types/ai-tone";
import { improveTextAction } from "@/modules/ai/presentation/actions/improve-text.action";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";

interface AITextImproverProps {
  value: string;
  onImprove: (newValue: string) => void;
  className?: string;
}

const TONES: { id: AITone; label: string; description: string; icon: React.ElementType }[] = [
  {
    id: "tecnico",
    label: "Técnico",
    description: "Preciso, experto e industrial",
    icon: Terminal,
  },
  {
    id: "elegante",
    label: "Elegante",
    description: "Sofisticado, fluido y premium",
    icon: Sparkles,
  },
  {
    id: "formal",
    label: "Formal",
    description: "Corporativo, serio y respetuoso",
    icon: Briefcase,
  },
  {
    id: "legal",
    label: "Legal",
    description: "Riguroso, normativo y jurídico",
    icon: Gavel,
  },
];

export function AITextImprover({ value, onImprove, className }: AITextImproverProps) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleImprove = async (tone: AITone) => {
    if (!currentWorkspace?.id || !value?.trim()) return;

    setOpen(false); // Close the menu immediately
    setLoading(true);
    try {
      const result = await improveTextAction(value, tone, currentWorkspace.id);
      if (result.ok && result.data) {
        onImprove(result.data);
      } else {
        console.error("AI Error:", result.error);
      }
    } catch (err) {
      console.error("AI Improvement failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all duration-300",
            loading && "animate-pulse text-primary",
            className,
          )}
          title="Mejorar con IA"
          disabled={loading || !value?.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-2 rounded-xl border-border/40 shadow-2xl backdrop-blur-md"
      >
        <div className="space-y-1">
          <div className="px-2 py-1.5 mb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Mejorar Redacción
            </h4>
          </div>
          {TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => handleImprove(tone.id)}
              disabled={loading}
              className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 text-left group transition-all duration-200"
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <tone.icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">
                  {tone.label}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {tone.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
