import { useState } from "react";
import { BookOpen, ChevronRight, Lightbulb, X } from "lucide-react";

interface EducationPanelProps {
  title: string;
  concept: string;
  explanation: string;
  keyPoints?: string[];
  formula?: string;
  tip?: string;
}

const EducationPanel = ({ title, concept, explanation, keyPoints, formula, tip }: EducationPanelProps) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[10px] font-medium text-primary/80 hover:text-primary transition-colors px-3 py-2 rounded-lg border border-primary/20 hover:border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06] w-full"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Learn: {title}</span>
        <ChevronRight className="w-3 h-3 ml-auto shrink-0" />
      </button>
    );
  }

  return (
    <div className="sim-panel overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-[10px] font-semibold text-primary uppercase tracking-[0.12em]">{title}</h4>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-3.5 py-3 space-y-2.5">
        <div>
          <span className="text-[10px] font-semibold text-foreground">{concept}</span>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{explanation}</p>
        </div>

        {formula && (
          <div className="bg-secondary/40 rounded-md px-3 py-2 font-mono text-[10px] text-primary">
            {formula}
          </div>
        )}

        {keyPoints && keyPoints.length > 0 && (
          <ul className="space-y-1">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}

        {tip && (
          <div className="flex items-start gap-2 bg-amber-500/[0.06] border border-amber-500/20 rounded-md px-2.5 py-2">
            <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-500/90 leading-relaxed">{tip}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationPanel;

/** Contextual tooltip that appears during interaction */
export const ContextHint = ({ message, visible }: { message: string; visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="absolute bottom-3 right-3 glass-panel px-3 py-2 rounded-lg text-[10px] text-muted-foreground max-w-[220px] animate-in fade-in-0 slide-in-from-bottom-1 duration-200 z-20">
      <div className="flex items-start gap-1.5">
        <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
        <span className="leading-relaxed">{message}</span>
      </div>
    </div>
  );
};
