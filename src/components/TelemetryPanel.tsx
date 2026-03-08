import { useMemo } from "react";

interface TelemetryItem {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  highlight?: boolean;
}

interface TelemetryPanelProps {
  mode: string;
  items: TelemetryItem[];
}

/**
 * Context-aware telemetry panel — adapts display based on robot mode.
 * Minimal, semi-transparent, smoothly animated.
 */
const TelemetryPanel = ({ mode, items }: TelemetryPanelProps) => {
  const modeColor = useMemo(() => {
    switch (mode.toLowerCase()) {
      case "balancing": return "hsl(172, 78%, 47%)";
      case "walking": return "hsl(152, 68%, 42%)";
      case "learning": return "hsl(268, 58%, 52%)";
      case "planning": return "hsl(38, 88%, 52%)";
      case "idle": return "hsl(220, 10%, 44%)";
      default: return "hsl(172, 78%, 47%)";
    }
  }, [mode]);

  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {/* Mode indicator strip */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/15">
        <div className="w-1.5 h-1.5 rounded-full status-indicator" style={{ backgroundColor: modeColor, color: modeColor }} />
        <span className="text-[9px] font-semibold tracking-[0.16em] uppercase" style={{ color: modeColor }}>{mode}</span>
      </div>
      {/* Telemetry grid */}
      <div className="px-3 py-2 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground tracking-wide">{item.label}</span>
            <span
              className={`text-[10px] font-mono tabular-nums ${item.highlight ? "font-semibold" : ""}`}
              style={{ color: item.color || (item.highlight ? modeColor : "hsl(210, 20%, 82%)") }}
            >
              {item.value}{item.unit || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelemetryPanel;
