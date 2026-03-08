interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  color?: string;
}

const SliderControl = ({ label, value, min, max, step = 0.01, unit = "", onChange, color }: SliderControlProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  const trackColor = color || "hsl(175, 80%, 50%)";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</label>
        <span
          className="text-[11px] font-mono font-medium tabular-nums"
          style={color ? { color } : { color: "hsl(210, 20%, 80%)" }}
        >
          {typeof value === 'number' ? value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2) : value}{unit}
        </span>
      </div>
      <div className="relative">
        <div className="absolute inset-0 h-1.5 rounded-full bg-secondary top-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{ width: `${pct}%`, background: trackColor, opacity: 0.6 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="control-slider relative z-10"
          style={{ accentColor: trackColor, background: "transparent" }}
        />
      </div>
    </div>
  );
};

export default SliderControl;
