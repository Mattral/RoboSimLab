import { useState, useEffect, ReactNode } from "react";
import { X, Focus, Maximize2 } from "lucide-react";

interface SubsystemLabel {
  name: string;
  value?: string;
  color?: string;
}

interface FocusModeProps {
  active: boolean;
  onToggle: () => void;
  labels?: SubsystemLabel[];
  robotName?: string;
  children?: ReactNode;
}

/**
 * FocusMode — Apple-style cinematic inspection overlay.
 * When active: dims background, shows subsystem labels with smooth fade.
 */
const FocusMode = ({ active, onToggle, labels = [], robotName = "Robot" }: FocusModeProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className={`absolute inset-0 z-30 pointer-events-none transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* Vignette overlay */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, hsl(228, 16%, 3% / 0.6) 100%)",
        pointerEvents: "none",
      }} />

      {/* Robot name badge — top center */}
      <div className={`absolute top-5 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-500 delay-200 ${visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2.5">
          <Focus className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground tracking-wide">{robotName}</span>
          <span className="text-[9px] text-muted-foreground font-mono tracking-widest ml-1">INSPECT</span>
          <button onClick={onToggle} className="ml-2 p-1 rounded-md hover:bg-secondary/30 transition-colors">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Subsystem labels — staggered appearance */}
      <div className={`absolute bottom-5 left-5 pointer-events-auto space-y-1.5 transition-all duration-500 delay-300 ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
        {labels.map((label, i) => (
          <div
            key={i}
            className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-300"
            style={{ transitionDelay: `${300 + i * 80}ms` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color || "hsl(172, 78%, 47%)" }} />
            <span className="text-[9px] font-medium text-muted-foreground tracking-wide uppercase">{label.name}</span>
            {label.value && (
              <span className="text-[9px] font-mono text-foreground ml-1">{label.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusMode;

/** Focus mode toggle button for control panels */
export const FocusToggleButton = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`sim-btn ${active ? "sim-btn-active" : "sim-btn-inactive"} flex items-center gap-1.5`}
  >
    <Maximize2 className="w-3 h-3" />
    <span>Focus</span>
  </button>
);
