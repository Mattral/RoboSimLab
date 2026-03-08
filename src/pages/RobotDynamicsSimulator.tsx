import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { RobotArm3D, RobotBase3D, SceneLighting } from "@/components/3d/RobotArm3D";
import { exportToCSV } from "@/components/DataExport";

interface DynamicsData {
  t: number; torque1: number; torque2: number; torque3: number;
  vel1: number; vel2: number; vel3: number; energy: number;
}

const RobotDynamicsSimulator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [load, setLoad] = useState(1.0);
  const [friction, setFriction] = useState(0.1);
  const [chartMode, setChartMode] = useState<"torque" | "velocity" | "energy">("torque");
  const stateRef = useRef({ j1: 0, j2: -0.5, j3: 0.3, v1: 0.5, v2: -0.3, v3: 0.8, t: 0 });
  const dataRef = useRef<DynamicsData[]>([]);
  const [joints, setJoints] = useState({ j1: 0, j2: -0.5, j3: 0.3 });

  const reset = useCallback(() => {
    stateRef.current = { j1: 0, j2: -0.5, j3: 0.3, v1: 0.5, v2: -0.3, v3: 0.8, t: 0 };
    dataRef.current = []; setJoints({ j1: 0, j2: -0.5, j3: 0.3 });
  }, []);

  useEffect(() => {
    if (!running) return;
    const dt = 0.016; const g = 9.81;
    const interval = setInterval(() => {
      const s = stateRef.current;
      for (let i = 0; i < speed; i++) {
        const t1 = -load * g * 1.2 * Math.sin(s.j1) - friction * s.v1;
        const t2 = -load * g * 1.0 * Math.sin(s.j1 + s.j2) * 0.7 - friction * s.v2;
        const t3 = -load * g * 0.8 * Math.sin(s.j1 + s.j2 + s.j3) * 0.4 - friction * s.v3;
        const target1 = Math.sin(s.t * 0.5) * 1.2;
        const target2 = Math.cos(s.t * 0.7) * 0.8;
        const target3 = Math.sin(s.t * 1.1) * 0.6;
        const ctrl1 = 20 * (target1 - s.j1) - 5 * s.v1;
        const ctrl2 = 15 * (target2 - s.j2) - 4 * s.v2;
        const ctrl3 = 10 * (target3 - s.j3) - 3 * s.v3;
        const totalT1 = t1 + ctrl1, totalT2 = t2 + ctrl2, totalT3 = t3 + ctrl3;
        s.v1 += totalT1 * dt / (load * 1.2); s.v2 += totalT2 * dt / (load * 1.0); s.v3 += totalT3 * dt / (load * 0.8);
        s.j1 += s.v1 * dt; s.j2 += s.v2 * dt; s.j3 += s.v3 * dt; s.t += dt;
        const ke = 0.5 * load * (s.v1 ** 2 * 1.2 + s.v2 ** 2 * 1.0 + s.v3 ** 2 * 0.8);
        const pe = load * g * (1.2 * (1 - Math.cos(s.j1)) + 1.0 * (1 - Math.cos(s.j1 + s.j2)) * 0.7);
        dataRef.current.push({ t: s.t, torque1: totalT1, torque2: totalT2, torque3: totalT3, vel1: s.v1, vel2: s.v2, vel3: s.v3, energy: ke + pe });
        if (dataRef.current.length > 500) dataRef.current.shift();
      }
      setJoints({ j1: s.j1, j2: s.j2, j3: s.j3 });
    }, 16);
    return () => clearInterval(interval);
  }, [running, speed, load, friction]);

  useEffect(() => {
    const canvas = canvasRef.current; const container = chartContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const dpr = window.devicePixelRatio; const w = container.clientWidth; const h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "hsl(225, 14%, 8%)"; ctx.fillRect(0, 0, w, h);
      const data = dataRef.current; if (data.length < 2) { requestAnimationFrame(draw); return; }
      const margin = { top: 25, right: 10, bottom: 20, left: 50 };
      const plotW = w - margin.left - margin.right; const plotH = h - margin.top - margin.bottom;
      const tMin = data[0].t, tMax = data[data.length - 1].t;
      const toX = (t: number) => margin.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
      const titles = { torque: "JOINT TORQUES (N·m)", velocity: "JOINT VELOCITIES (rad/s)", energy: "SYSTEM ENERGY (J)" };
      ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "10px 'Inter'"; ctx.textAlign = "left"; ctx.fillText(titles[chartMode], margin.left, 15);
      ctx.strokeStyle = "hsl(225, 12%, 18%)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, h - margin.bottom); ctx.lineTo(w - margin.right, h - margin.bottom); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(margin.left, margin.top + plotH / 2); ctx.lineTo(w - margin.right, margin.top + plotH / 2); ctx.stroke(); ctx.setLineDash([]);
      const drawLine = (getter: (d: DynamicsData) => number, color: string, maxVal: number) => {
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < data.length; i++) { const x = toX(data[i].t); const v = getter(data[i]); const y = margin.top + plotH / 2 - (v / maxVal) * (plotH / 2) * 0.8; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      };
      if (chartMode === "torque") {
        const maxV = Math.max(1, ...data.map(d => Math.max(Math.abs(d.torque1), Math.abs(d.torque2), Math.abs(d.torque3))));
        drawLine(d => d.torque1, "hsl(175, 80%, 50%)", maxV); drawLine(d => d.torque2, "hsl(150, 70%, 45%)", maxV); drawLine(d => d.torque3, "hsl(210, 80%, 55%)", maxV);
      } else if (chartMode === "velocity") {
        const maxV = Math.max(1, ...data.map(d => Math.max(Math.abs(d.vel1), Math.abs(d.vel2), Math.abs(d.vel3))));
        drawLine(d => d.vel1, "hsl(175, 80%, 50%)", maxV); drawLine(d => d.vel2, "hsl(150, 70%, 45%)", maxV); drawLine(d => d.vel3, "hsl(210, 80%, 55%)", maxV);
      } else {
        const maxV = Math.max(1, ...data.map(d => Math.abs(d.energy)));
        drawLine(d => d.energy, "hsl(40, 90%, 55%)", maxV * 1.5);
      }
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [chartMode, joints]);

  const controls = (
    <>
      <ControlSection title="Parameters">
        <SliderControl label="Payload Mass" value={load} min={0.1} max={5} step={0.1} unit=" kg" onChange={setLoad} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Joint Friction" value={friction} min={0} max={2} step={0.05} onChange={setFriction} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Speed" value={speed} min={0.5} max={5} step={0.5} unit="x" onChange={setSpeed} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Chart Mode">
        <div className="flex gap-2">
          {(["torque", "velocity", "energy"] as const).map(m => (
            <button key={m} onClick={() => setChartMode(m)} className={`flex-1 sim-btn ${chartMode === m ? "sim-btn-active" : "sim-btn-inactive"}`}>
              {m === "torque" ? "τ" : m === "velocity" ? "ω" : "E"}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={reset} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(dataRef.current, `dynamics_${chartMode}`)} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robot Dynamics" subtitle="Torque · Velocity · Energy" controls={controls}>
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 relative bg-background min-h-[250px]">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
            <Canvas shadows>
              <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
              <OrbitControls enableDamping dampingFactor={0.05} target={[0, 1.5, 0]} minDistance={2} maxDistance={10} />
              <SceneLighting />
              <RobotBase3D />
              <RobotArm3D joint1={joints.j1} joint2={joints.j2} joint3={joints.j3} />
              <fog attach="fog" args={["hsl(225, 15%, 6%)", 8, 20]} />
            </Canvas>
          </Suspense>
          <div className="absolute top-3 left-3 glass-panel text-[11px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
            Load: {load.toFixed(1)}kg | Friction: {friction.toFixed(2)}
          </div>
        </div>
        <div ref={chartContainerRef} className="h-[180px] border-t border-border/40 relative shrink-0">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
      </div>
    </SimLayout>
  );
};

export default RobotDynamicsSimulator;
