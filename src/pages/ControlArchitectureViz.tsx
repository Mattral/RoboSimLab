import { useState, useRef, useEffect } from "react";
import SimLayout from "@/components/SimLayout";
import ControlSection from "@/components/ControlSection";

interface PipelineModule {
  id: string;
  label: string;
  category: "input" | "processing" | "output";
  color: string;
  active: boolean;
  value: number;
}

const ControlArchitectureViz = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [running, setRunning] = useState(true);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [showLatency, setShowLatency] = useState(true);
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({
    lidar: true, camera: true, imu: true, perception: true,
    stateEst: true, planner: true, controller: true, actuators: true,
  });

  const toggleModule = (id: string) => {
    setActiveModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;

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

      if (running) timeRef.current += 0.016;
      const t = timeRef.current;

      // Pipeline modules layout
      const modules: { id: string; label: string; x: number; y: number; w: number; h: number; color: string; active: boolean }[] = [
        { id: "lidar", label: "Lidar", x: 40, y: h * 0.15, w: 100, h: 50, color: "hsl(172, 78%, 47%)", active: activeModules.lidar },
        { id: "camera", label: "Camera", x: 40, y: h * 0.38, w: 100, h: 50, color: "hsl(212, 78%, 52%)", active: activeModules.camera },
        { id: "imu", label: "IMU", x: 40, y: h * 0.61, w: 100, h: 50, color: "hsl(268, 58%, 52%)", active: activeModules.imu },
        { id: "perception", label: "Perception\nFusion", x: w * 0.25, y: h * 0.33, w: 110, h: 55, color: "hsl(152, 68%, 42%)", active: activeModules.perception },
        { id: "stateEst", label: "State\nEstimation", x: w * 0.42, y: h * 0.33, w: 110, h: 55, color: "hsl(38, 88%, 52%)", active: activeModules.stateEst },
        { id: "planner", label: "Motion\nPlanner", x: w * 0.59, y: h * 0.33, w: 110, h: 55, color: "hsl(322, 58%, 52%)", active: activeModules.planner },
        { id: "controller", label: "PID\nController", x: w * 0.76, y: h * 0.33, w: 110, h: 55, color: "hsl(0, 62%, 50%)", active: activeModules.controller },
        { id: "actuators", label: "Actuators", x: w - 140, y: h * 0.38, w: 100, h: 50, color: "hsl(48, 78%, 48%)", active: activeModules.actuators },
      ];

      // Connections
      const connections: [string, string][] = [
        ["lidar", "perception"], ["camera", "perception"], ["imu", "perception"],
        ["perception", "stateEst"], ["stateEst", "planner"],
        ["planner", "controller"], ["controller", "actuators"],
      ];

      // Draw connections
      connections.forEach(([fromId, toId]) => {
        const from = modules.find(m => m.id === fromId)!;
        const to = modules.find(m => m.id === toId)!;
        if (!from.active || !to.active) return;

        const fx = from.x + from.w;
        const fy = from.y + from.h / 2;
        const tx = to.x;
        const ty = to.y + to.h / 2;

        ctx.strokeStyle = "hsla(172, 78%, 47%, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        const mx = (fx + tx) / 2;
        ctx.bezierCurveTo(mx, fy, mx, ty, tx, ty);
        ctx.stroke();

        // Data flow particles
        if (showDataFlow) {
          const numParticles = 3;
          for (let p = 0; p < numParticles; p++) {
            const phase = ((t * 0.8 + p / numParticles) % 1);
            const px = fx + (tx - fx) * phase;
            // Approximate bezier y
            const py = fy + (ty - fy) * (3 * phase * phase - 2 * phase * phase * phase);
            ctx.fillStyle = `hsla(172, 78%, 60%, ${0.8 - phase * 0.5})`;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Draw modules
      modules.forEach(mod => {
        ctx.fillStyle = mod.active
          ? `${mod.color.replace(")", ", 0.15)")}`
          : "hsla(228, 13%, 10%, 0.6)";
        ctx.strokeStyle = mod.active ? mod.color : "hsl(228, 13%, 18%)";
        ctx.lineWidth = mod.active ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(mod.x, mod.y, mod.w, mod.h, 8);
        ctx.fill();
        ctx.stroke();

        // Pulse when active
        if (mod.active && running) {
          const pulse = Math.sin(t * 3 + modules.indexOf(mod)) * 0.5 + 0.5;
          ctx.strokeStyle = `${mod.color.replace(")", `, ${pulse * 0.3})`)}`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(mod.x - 2, mod.y - 2, mod.w + 4, mod.h + 4, 10);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = mod.active ? "hsl(210, 20%, 93%)" : "hsl(220, 10%, 35%)";
        ctx.font = "bold 10px 'Inter'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = mod.label.split("\n");
        lines.forEach((line, i) => {
          ctx.fillText(line, mod.x + mod.w / 2, mod.y + mod.h / 2 + (i - (lines.length - 1) / 2) * 14);
        });

        // Latency indicator
        if (showLatency && mod.active) {
          const latency = (Math.sin(t * 2 + modules.indexOf(mod) * 1.5) * 0.5 + 0.5) * 15 + 1;
          ctx.fillStyle = latency > 10 ? "hsl(0, 62%, 50%)" : latency > 5 ? "hsl(38, 88%, 52%)" : "hsl(152, 68%, 42%)";
          ctx.font = "8px 'JetBrains Mono'";
          ctx.textAlign = "center";
          ctx.fillText(`${latency.toFixed(1)}ms`, mod.x + mod.w / 2, mod.y + mod.h + 12);
        }
      });

      // Architecture labels
      ctx.fillStyle = "hsl(220, 10%, 35%)";
      ctx.font = "9px 'Inter'";
      ctx.textAlign = "center";
      ctx.fillText("SENSORS", 90, h * 0.08);
      ctx.fillText("PERCEPTION", w * 0.3, h * 0.22);
      ctx.fillText("ESTIMATION", w * 0.47, h * 0.22);
      ctx.fillText("PLANNING", w * 0.64, h * 0.22);
      ctx.fillText("CONTROL", w * 0.81, h * 0.22);
      ctx.fillText("OUTPUT", w - 90, h * 0.3);

      // Feedback loop arrow
      ctx.strokeStyle = "hsla(38, 88%, 52%, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const fbY = h * 0.78;
      ctx.moveTo(w - 90, h * 0.65);
      ctx.lineTo(w - 90, fbY);
      ctx.lineTo(90, fbY);
      ctx.lineTo(90, h * 0.72);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "hsl(38, 88%, 52%)";
      ctx.font = "9px 'Inter'";
      ctx.textAlign = "center";
      ctx.fillText("FEEDBACK LOOP (Sensor → Actuator)", w / 2, fbY - 6);

      // HUD
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      const activeCount = Object.values(activeModules).filter(Boolean).length;
      ctx.fillText(`Active: ${activeCount}/8  ${running ? "▶ RUNNING" : "⏸ PAUSED"}`, 15, h - 10);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, showDataFlow, showLatency, activeModules]);

  const controls = (
    <>
      <ControlSection title="Pipeline Modules">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(activeModules).map(([id, active]) => (
            <button key={id} onClick={() => toggleModule(id)}
              className={`sim-btn text-[9px] ${active ? "sim-btn-active" : "sim-btn-inactive"}`}>
              {id === "stateEst" ? "State Est." : id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </ControlSection>

      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowDataFlow(!showDataFlow)} className={`flex-1 sim-btn ${showDataFlow ? "sim-btn-active" : "sim-btn-inactive"}`}>Data Flow</button>
          <button onClick={() => setShowLatency(!showLatency)} className={`flex-1 sim-btn ${showLatency ? "sim-btn-active" : "sim-btn-inactive"}`}>Latency</button>
        </div>
      </ControlSection>

      <ControlSection title="Controls">
        <button onClick={() => setRunning(!running)} className={`w-full sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>
          {running ? "⏸ Pause" : "▶ Run"}
        </button>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This shows the <span className="text-primary">control architecture</span> of a typical robot system. 
          Data flows from <span className="text-primary">sensors</span> through <span className="text-green-glow">perception</span>, 
          <span className="text-amber-glow"> state estimation</span>, <span className="text-purple-glow">planning</span>, 
          and <span className="text-destructive">control</span> to <span className="text-amber-glow">actuators</span>. 
          Toggle modules to see how disabling subsystems affects the pipeline.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Control Architecture" subtitle="Sensor → Perception → Planning → Control → Actuator" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default ControlArchitectureViz;
