import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface RobotComponent {
  id: number;
  type: "link" | "revolute" | "prismatic" | "sensor";
  length: number;
  mass: number;
  jointMin: number;
  jointMax: number;
  angle: number;
  sensorType?: "lidar" | "camera" | "imu";
}

let nextId = 1;

const DigitalTwinBuilder = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [components, setComponents] = useState<RobotComponent[]>([
    { id: nextId++, type: "link", length: 1.2, mass: 2.0, jointMin: -Math.PI, jointMax: Math.PI, angle: 0 },
    { id: nextId++, type: "revolute", length: 1.0, mass: 1.5, jointMin: -Math.PI, jointMax: Math.PI, angle: -0.6 },
    { id: nextId++, type: "revolute", length: 0.8, mass: 1.0, jointMin: -Math.PI, jointMax: Math.PI, angle: 0.4 },
  ]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showSensors, setShowSensors] = useState(true);
  const [showMass, setShowMass] = useState(true);
  const [showLimits, setShowLimits] = useState(false);
  const [autoAnimate, setAutoAnimate] = useState(false);

  const addComponent = (type: RobotComponent["type"]) => {
    const comp: RobotComponent = {
      id: nextId++,
      type,
      length: type === "sensor" ? 0.3 : 0.8,
      mass: type === "sensor" ? 0.2 : 1.0,
      jointMin: -Math.PI,
      jointMax: Math.PI,
      angle: 0,
      sensorType: type === "sensor" ? "lidar" : undefined,
    };
    setComponents(prev => [...prev, comp]);
  };

  const removeComponent = (idx: number) => {
    if (components.length <= 1) return;
    setComponents(prev => prev.filter((_, i) => i !== idx));
    if (selectedIdx >= components.length - 1) setSelectedIdx(Math.max(0, components.length - 2));
  };

  const updateComponent = (idx: number, updates: Partial<RobotComponent>) => {
    setComponents(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;
    let time = 0;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      time += 0.016;

      const scale = Math.min(w, h) * 0.15;
      const cx = w * 0.4;
      const cy = h * 0.85;
      const toScreen = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];

      // Grid
      ctx.strokeStyle = "hsla(228, 13%, 13%, 0.4)";
      ctx.lineWidth = 0.5;
      for (let g = -4; g <= 4; g++) {
        const [sx] = toScreen(g, 0);
        const [, ey] = toScreen(0, 6);
        ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx, ey); ctx.stroke();
        if (g >= 0 && g <= 6) {
          const [gx] = toScreen(-4, 0);
          const [gx2] = toScreen(4, 0);
          ctx.beginPath(); ctx.moveTo(gx, cy - g * scale); ctx.lineTo(gx2, cy - g * scale); ctx.stroke();
        }
      }

      // Base
      const [bx, by] = toScreen(0, 0);
      ctx.fillStyle = "hsl(228, 13%, 18%)";
      ctx.fillRect(bx - 20, by - 5, 40, 10);

      // Draw robot chain
      let curX = 0, curY = 0, curAngle = -Math.PI / 2;
      const joints: { x: number; y: number; angle: number; comp: RobotComponent; idx: number }[] = [];

      components.forEach((comp, idx) => {
        const animAngle = autoAnimate ? comp.angle + Math.sin(time * (0.5 + idx * 0.3)) * 0.3 : comp.angle;
        const angle = comp.type === "link" && idx === 0 ? -Math.PI / 2 : curAngle + animAngle;
        const endX = curX + Math.cos(angle) * comp.length;
        const endY = curY - Math.sin(angle) * comp.length;

        const [sx, sy] = toScreen(curX, -curY);
        const [ex, ey] = toScreen(endX, -endY);

        // Link
        const colors: Record<string, string> = {
          link: "hsl(228, 13%, 30%)",
          revolute: "hsl(172, 60%, 35%)",
          prismatic: "hsl(38, 70%, 40%)",
          sensor: "hsl(268, 50%, 45%)",
        };
        ctx.strokeStyle = idx === selectedIdx ? "hsl(172, 78%, 47%)" : colors[comp.type];
        ctx.lineWidth = idx === selectedIdx ? 7 : 5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        // Joint
        ctx.fillStyle = idx === selectedIdx ? "hsl(172, 78%, 60%)" : "hsl(172, 78%, 47%)";
        ctx.beginPath(); ctx.arc(sx, sy, idx === selectedIdx ? 7 : 5, 0, Math.PI * 2); ctx.fill();

        // Mass indicator
        if (showMass) {
          const mx = (sx + ex) / 2;
          const my = (sy + ey) / 2;
          const massR = Math.max(3, comp.mass * 3);
          ctx.fillStyle = "hsla(38, 88%, 52%, 0.3)";
          ctx.beginPath(); ctx.arc(mx, my, massR, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "hsl(38, 88%, 52%)";
          ctx.font = "8px 'JetBrains Mono'";
          ctx.textAlign = "center";
          ctx.fillText(`${comp.mass.toFixed(1)}kg`, mx, my - massR - 3);
        }

        // Joint limits
        if (showLimits && (comp.type === "revolute" || comp.type === "prismatic")) {
          ctx.strokeStyle = "hsla(0, 62%, 50%, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 15, -(curAngle + comp.jointMin), -(curAngle + comp.jointMax), true);
          ctx.stroke();
        }

        // Sensor visualization
        if (comp.type === "sensor" && showSensors) {
          ctx.fillStyle = "hsla(268, 58%, 52%, 0.1)";
          ctx.strokeStyle = "hsla(268, 58%, 52%, 0.4)";
          ctx.lineWidth = 1;
          if (comp.sensorType === "lidar") {
            ctx.beginPath(); ctx.arc(ex, ey, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          } else if (comp.sensorType === "camera") {
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + Math.cos(angle - 0.5) * 40, ey - Math.sin(angle - 0.5) * 40);
            ctx.lineTo(ex + Math.cos(angle + 0.5) * 40, ey - Math.sin(angle + 0.5) * 40);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }

        joints.push({ x: curX, y: curY, angle, comp, idx });
        curX = endX;
        curY = endY;
        curAngle = angle;
      });

      // End effector
      const [eex, eey] = toScreen(curX, -curY);
      ctx.fillStyle = "hsl(40, 90%, 55%)";
      ctx.beginPath(); ctx.arc(eex, eey, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsla(40, 90%, 55%, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(eex, eey, 12, 0, Math.PI * 2); ctx.stroke();

      // Component list panel
      const panelX = w - 200;
      const panelY = 20;
      ctx.fillStyle = "hsla(228, 15%, 7%, 0.85)";
      ctx.strokeStyle = "hsl(228, 13%, 13%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(panelX - 5, panelY - 5, 190, Math.min(components.length * 22 + 30, 300), 6);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "9px 'Inter'";
      ctx.textAlign = "left";
      ctx.fillText("ROBOT COMPONENTS", panelX + 5, panelY + 10);

      components.forEach((comp, i) => {
        const y = panelY + 22 + i * 20;
        ctx.fillStyle = i === selectedIdx ? "hsl(172, 78%, 47%)" : "hsl(210, 20%, 75%)";
        ctx.font = "9px 'JetBrains Mono'";
        const icon = comp.type === "link" ? "━" : comp.type === "revolute" ? "⟲" : comp.type === "prismatic" ? "↕" : "◉";
        ctx.fillText(`${icon} ${comp.type} L=${comp.length.toFixed(1)} m=${comp.mass.toFixed(1)}`, panelX + 5, y);
      });

      // Total mass and DOF
      const totalMass = components.reduce((s, c) => s + c.mass, 0);
      const dof = components.filter(c => c.type === "revolute" || c.type === "prismatic").length;
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`DOF: ${dof}  Mass: ${totalMass.toFixed(1)}kg  Components: ${components.length}`, 15, h - 10);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [components, selectedIdx, showSensors, showMass, showLimits, autoAnimate]);

  const selected = components[selectedIdx];

  const controls = (
    <>
      <ControlSection title="Add Component">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => addComponent("link")} className="sim-btn sim-btn-inactive text-[10px]">+ Link</button>
          <button onClick={() => addComponent("revolute")} className="sim-btn sim-btn-inactive text-[10px]">+ Revolute</button>
          <button onClick={() => addComponent("prismatic")} className="sim-btn sim-btn-inactive text-[10px]">+ Prismatic</button>
          <button onClick={() => addComponent("sensor")} className="sim-btn sim-btn-inactive text-[10px]">+ Sensor</button>
        </div>
      </ControlSection>

      <ControlSection title={`Component ${selectedIdx + 1}: ${selected?.type}`}>
        {selected && (
          <>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))} className="flex-1 sim-btn sim-btn-inactive text-[10px]">← Prev</button>
              <button onClick={() => setSelectedIdx(Math.min(components.length - 1, selectedIdx + 1))} className="flex-1 sim-btn sim-btn-inactive text-[10px]">Next →</button>
            </div>
            <SliderControl label="Length" value={selected.length} min={0.2} max={2} step={0.05} unit=" m" onChange={v => updateComponent(selectedIdx, { length: v })} color="hsl(172, 78%, 47%)" />
            <SliderControl label="Mass" value={selected.mass} min={0.1} max={5} step={0.1} unit=" kg" onChange={v => updateComponent(selectedIdx, { mass: v })} color="hsl(38, 88%, 52%)" />
            <SliderControl label="Angle" value={selected.angle} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => updateComponent(selectedIdx, { angle: v })} color="hsl(152, 68%, 42%)" />
            {selected.type === "sensor" && (
              <div className="flex gap-1 mt-1">
                {(["lidar", "camera", "imu"] as const).map(s => (
                  <button key={s} onClick={() => updateComponent(selectedIdx, { sensorType: s })}
                    className={`flex-1 sim-btn text-[9px] ${selected.sensorType === s ? "sim-btn-active" : "sim-btn-inactive"}`}>{s}</button>
                ))}
              </div>
            )}
            <button onClick={() => removeComponent(selectedIdx)} className="w-full mt-2 sim-btn sim-btn-inactive text-destructive text-[10px]">Remove</button>
          </>
        )}
      </ControlSection>

      <ControlSection title="Display">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowSensors(!showSensors)} className={`sim-btn ${showSensors ? "sim-btn-active" : "sim-btn-inactive"}`}>Sensors</button>
          <button onClick={() => setShowMass(!showMass)} className={`sim-btn ${showMass ? "sim-btn-active" : "sim-btn-inactive"}`}>Mass</button>
          <button onClick={() => setShowLimits(!showLimits)} className={`sim-btn ${showLimits ? "sim-btn-active" : "sim-btn-inactive"}`}>Limits</button>
          <button onClick={() => setAutoAnimate(!autoAnimate)} className={`sim-btn ${autoAnimate ? "sim-btn-active" : "sim-btn-inactive"}`}>Animate</button>
        </div>
      </ControlSection>

      <ControlSection title="Robot Summary">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Components</span><span className="text-foreground">{components.length}</span></div>
          <div className="flex justify-between"><span>DOF</span><span className="text-primary">{components.filter(c => c.type === "revolute" || c.type === "prismatic").length}</span></div>
          <div className="flex justify-between"><span>Total Mass</span><span className="text-amber-glow">{components.reduce((s, c) => s + c.mass, 0).toFixed(1)} kg</span></div>
          <div className="flex justify-between"><span>Sensors</span><span className="text-purple-glow">{components.filter(c => c.type === "sensor").length}</span></div>
        </div>
      </ControlSection>

      <ControlSection title="Export">
        <button onClick={() => {
          const blob = new Blob([JSON.stringify({ components, timestamp: Date.now() }, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `digital_twin_${Date.now()}.json`; a.click();
          URL.revokeObjectURL(url);
        }} className="w-full sim-btn sim-btn-inactive">📥 Export JSON</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Digital Twin Builder" subtitle="Links · Joints · Sensors · Mass" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default DigitalTwinBuilder;
