/**
 * SliderControl — Apple-style precision parameter slider.
 * 
 * Features:
 * - Custom track with color fill showing current value
 * - Tabular numeric display for precision readouts
 * - Configurable range, step, unit, and accent color
 * - Input clamping to prevent out-of-range values
 * 
 * Used across all simulation modules for parameter tuning.
 */
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
  // Clamp percentage to prevent visual overflow
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const trackColor = color || "hsl(172, 78%, 47%)";

  // Determine decimal places from step size
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    // Clamp to valid range to prevent NaN or out-of-bounds
    const clamped = Math.max(min, Math.min(max, isNaN(raw) ? min : raw));
    onChange(clamped);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</label>
        <span
          className="text-[11px] font-mono font-semibold tabular-nums"
          style={color ? { color } : { color: "hsl(210, 20%, 82%)" }}
        >
          {value.toFixed(decimals)}{unit}
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
          onChange={handleChange}
          className="control-slider relative z-10 w-full"
          style={{ background: "transparent" }}
          aria-label={label}
        />
      </div>
    </div>
  );
};

export default SliderControl;
