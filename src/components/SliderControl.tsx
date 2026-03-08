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
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-foreground" style={color ? { color } : {}}>
          {typeof value === 'number' ? value.toFixed(2) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="control-slider"
        style={color ? { accentColor: color } : {}}
      />
    </div>
  );
};

export default SliderControl;
