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
 * Premium telemetry panel with mode indicator, value bars, and status colors.
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
      {/* Mode indicator strip with glow */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 relative">
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${modeColor}, transparent)`, opacity: 0.3 }} />
        <div className="w-2 h-2 rounded-full status-indicator" style={{ backgroundColor: modeColor, color: modeColor }} />
        <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: modeColor }}>{mode}</span>
      </div>
      {/* Telemetry grid */}
      <div className="px-3 py-2 space-y-1.5">
        {items.map((item, i) => {
          const isStatus = item.label.toLowerCase() === "stability" || item.label.toLowerCase() === "mode";
          const itemColor = item.color || (item.highlight ? modeColor : "hsl(210, 20%, 82%)");

          return (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground tracking-wide">{item.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${item.highlight ? "font-bold" : "font-medium"}`}
                  style={{ color: itemColor }}
                >
                  {item.value}{item.unit || ""}
                </span>
              </div>
              {/* Mini progress bar for numeric values */}
              {!isStatus && !isNaN(parseFloat(item.value)) && (
                <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(228, 13%, 12%)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${Math.min(100, Math.abs(parseFloat(item.value)) * (item.unit === "°" ? 2 : item.unit === "%" ? 1 : item.unit === " m" ? 33 : 10))}%`,
                      backgroundColor: itemColor,
                      opacity: 0.6,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TelemetryPanel;
