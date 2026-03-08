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
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const trackColor = color || "hsl(172, 78%, 47%)";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</label>
        <span
          className="text-[11px] font-mono font-semibold tabular-nums"
          style={color ? { color } : { color: "hsl(210, 20%, 82%)" }}
        >
          {typeof value === 'number' ? value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2) : value}{unit}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-secondary/80">
          {/* Fill */}
          <div
            className="h-full rounded-full transition-[width] duration-75 ease-out"
            style={{ width: `${pct}%`, background: trackColor, opacity: 0.55 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="control-slider relative z-10 w-full"
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
};

export default SliderControl;
