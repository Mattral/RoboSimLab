import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { Humanoid3D, HumanoidSceneLighting } from "@/components/3d/Humanoid3D";
import { exportToCSV } from "@/components/DataExport";

const HumanoidBalanceSimulator = () => {
  const [cinematic, setCinematic] = useState(false);
  const [kp, setKp] = useState(50);
  const [kd, setKd] = useState(15);
  const [disturbance, setDisturbance] = useState(0);
  const [running, setRunning] = useState(true);
  const [showCoM, setShowCoM] = useState(true);
  const [showPolygon, setShowPolygon] = useState(true);
  const [theta, setTheta] = useState(0.05);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ theta: 0.05, omega: 0, torque: 0 });
  const historyRef = useRef<{ t: number; theta: number; torque: number; omega: number }[]>([]);
  const tRef = useRef(0);

  const reset = () => { stateRef.current = { theta: 0.05, omega: 0, torque: 0 }; historyRef.current = []; tRef.current = 0; setTheta(0.05); };
  const applyPush = (force: number) => { stateRef.current.omega += force; };

  useEffect(() => {
    if (!running) return;
    const dt = 0.016; const g = 9.81; const L = 1.0; const m = 1.0;
    const interval = setInterval(() => {
      const state = stateRef.current;
      const controlTorque = -kp * state.theta - kd * state.omega;
      state.torque = controlTorque + disturbance;
      const alpha = (g / L) * Math.sin(state.theta) + state.torque / (m * L * L);
      state.omega += alpha * dt; state.omega *= 0.999;
      state.theta += state.omega * dt;
      state.theta = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.theta));
      tRef.current += dt;
      historyRef.current.push({ t: tRef.current, theta: state.theta, torque: state.torque, omega: state.omega });
      if (historyRef.current.length > 400) historyRef.current.shift();
      setTheta(state.theta);
    }, 16);
    return () => clearInterval(interval);
  }, [kp, kd, disturbance, running]);

  useEffect(() => {
    const canvas = canvasRef.current; const container = chartContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const dpr = window.devicePixelRatio; const w = container.clientWidth; const h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "hsl(225, 14%, 8%)"; ctx.fillRect(0, 0, w, h);
      const hist = historyRef.current; if (hist.length < 2) { requestAnimationFrame(draw); return; }
      const margin = { top: 25, right: 10, bottom: 25, left: 45 };
      const plotW = w - margin.left - margin.right; const plotH = h - margin.top - margin.bottom;
      const tMin = hist[0].t, tMax = hist[hist.length - 1].t;
      ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "10px 'Inter'"; ctx.textAlign = "left"; ctx.fillText("ANGLE (θ) & TORQUE (τ)", margin.left, 15);
      ctx.strokeStyle = "hsl(225, 12%, 18%)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, h - margin.bottom); ctx.lineTo(w - margin.right, h - margin.bottom); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(margin.left, margin.top + plotH / 2); ctx.lineTo(w - margin.right, margin.top + plotH / 2); ctx.stroke(); ctx.setLineDash([]);
      const toX = (t: number) => margin.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
      ctx.strokeStyle = "hsl(175, 80%, 50%)"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < hist.length; i++) { const x = toX(hist[i].t); const y = margin.top + plotH / 2 - (hist[i].theta / (Math.PI / 2)) * (plotH / 2); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      const maxT = Math.max(1, ...hist.map(h => Math.abs(h.torque)));
      ctx.strokeStyle = "hsl(270, 60%, 55%)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < hist.length; i++) { const x = toX(hist[i].t); const y = margin.top + plotH / 2 - (hist[i].torque / maxT) * (plotH / 2) * 0.5; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      ctx.fillStyle = "hsl(175, 80%, 50%)"; ctx.fillRect(margin.left, h - 12, 10, 2);
      ctx.fillStyle = "hsl(220, 10%, 46%)"; ctx.font = "9px 'Inter'"; ctx.fillText("θ", margin.left + 14, h - 8);
      ctx.fillStyle = "hsl(270, 60%, 55%)"; ctx.fillRect(margin.left + 35, h - 12, 10, 2);
      ctx.fillStyle = "hsl(220, 10%, 46%)"; ctx.fillText("τ", margin.left + 49, h - 8);
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [theta]);

  const controls = (
    <>
      <ControlSection title="Balance Controller">
        <SliderControl label="Stiffness (Kp)" value={kp} min={0} max={150} step={1} onChange={setKp} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Damping (Kd)" value={kd} min={0} max={50} step={0.5} onChange={setKd} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Disturbance">
        <SliderControl label="Constant Force" value={disturbance} min={-20} max={20} step={0.5} unit=" N" onChange={setDisturbance} color="hsl(0, 65%, 52%)" />
        <div className="flex gap-2">
          <button onClick={() => applyPush(-2)} className="flex-1 sim-btn sim-btn-inactive">← Push Left</button>
          <button onClick={() => applyPush(2)} className="flex-1 sim-btn sim-btn-inactive">Push Right →</button>
        </div>
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowCoM(!showCoM)} className={`flex-1 sim-btn ${showCoM ? "sim-btn-active" : "sim-btn-inactive"}`}>CoM</button>
          <button onClick={() => setShowPolygon(!showPolygon)} className={`flex-1 sim-btn ${showPolygon ? "sim-btn-active" : "sim-btn-inactive"}`}>Support</button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={reset} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(historyRef.current, "humanoid_balance")} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Humanoid Balance" subtitle="3D Inverted Pendulum PD Control" controls={controls}>
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 relative bg-background min-h-[300px]">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
            <Canvas shadows>
              <PerspectiveCamera makeDefault position={[3, 2.5, 4]} fov={45} />
              <OrbitControls enableDamping dampingFactor={0.05} target={[0, 1.5, 0]} minDistance={2} maxDistance={10} />
              <HumanoidSceneLighting />
              <gridHelper args={[10, 20, "#1a2a3a", "#111827"]} position={[0, 0, 0]} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#0d1117" transparent opacity={0.8} /></mesh>
              <Humanoid3D theta={theta} showCoM={showCoM} showPolygon={showPolygon} />
              <fog attach="fog" args={["hsl(225, 15%, 6%)", 8, 18]} />
            </Canvas>
          </Suspense>
          <div className="absolute top-3 left-3 glass-panel text-[11px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
            θ={(theta * 180 / Math.PI).toFixed(1)}° ω={stateRef.current.omega.toFixed(2)} rad/s τ={stateRef.current.torque.toFixed(1)} N·m
          </div>
        </div>
        <div ref={chartContainerRef} className="h-[160px] border-t border-border/40 relative shrink-0">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
      </div>
    </SimLayout>
  );
};

export default HumanoidBalanceSimulator;
