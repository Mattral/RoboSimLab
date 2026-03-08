import { GraduationCap } from "lucide-react";

interface LearningModeToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

const LearningModeToggle = ({ enabled, onToggle }: LearningModeToggleProps) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-md border transition-all duration-250 ${
      enabled
        ? "border-amber-500/50 text-amber-500 bg-amber-500/[0.07]"
        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
    }`}
    title="Toggle Learning Mode"
  >
    <GraduationCap className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">{enabled ? "Learning" : "Learn"}</span>
  </button>
);

export default LearningModeToggle;
