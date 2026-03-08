import { useState, useEffect, useRef } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

const HumanoidBalanceSimulator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [kp, setKp] = useState(50);
  const [kd, setKd] = useState(15);
  const [disturbance, setDisturbance] = useState(0);
  const [running, setRunning] = useState(true);
  const [showCoM, setShowCoM] = useState(true);
  const [showPolygon, setShowPolygon] = useState(true);

  // Inverted pendulum state
  const stateRef = useRef({ theta: 0.05, omega: 0, torque: 0 });
  const historyRef = useRef<{ t: number; theta: number; torque: number }[]>([]);
  const tRef = useRef(0);

  const reset = () => {
    stateRef.current = { theta: 0.05, omega: 0, torque: 0 };
    historyRef.current = [];
    tRef.current = 0;
  };

  const applyPush = (force: number) => {
    stateRef.current.omega += force;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + "px";
      canvas.style.height = container.clientHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const dt = 0.016;
    const g = 9.81;
    const L = 1.0; // pendulum length (normalized)
    const m = 1.0;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "hsl(220, 15%, 11%)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const state = stateRef.current;

      if (running) {
        // PD control torque
        const controlTorque = -kp * state.theta - kd * state.omega;
        state.torque = controlTorque + disturbance;

        // Inverted pendulum dynamics: theta'' = (g/L)*sin(theta) + torque/(m*L^2)
        const alpha = (g / L) * Math.sin(state.theta) + state.torque / (m * L * L);
        state.omega += alpha * dt;
        state.omega *= 0.999; // small damping
        state.theta += state.omega * dt;

        // Clamp
        state.theta = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.theta));

        tRef.current += dt;
        historyRef.current.push({ t: tRef.current, theta: state.theta, torque: state.torque });
        if (historyRef.current.length > 400) historyRef.current.shift();
      }

      // Drawing
      const baseY = h * 0.6;
      const baseX = w * 0.35;
      const scale = Math.min(w, h) * 0.25;

      // Ground
      ctx.strokeStyle = "hsl(220, 15%, 25%)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(baseX - 120, baseY + 5);
      ctx.lineTo(baseX + 120, baseY + 5);
      ctx.stroke();

      // Support polygon
      if (showPolygon) {
        const footW = 60;
        ctx.fillStyle = "hsla(150, 70%, 45%, 0.15)";
        ctx.fillRect(baseX - footW, baseY, footW * 2, 8);
        ctx.strokeStyle = "hsl(150, 70%, 45%)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(baseX - footW, baseY, footW * 2, 8);

        // Support polygon label
        ctx.fillStyle = "hsl(150, 70%, 45%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.fillText("SUPPORT POLYGON", baseX, baseY + 22);
      }

      // Humanoid body (simplified stick figure)
      const theta = state.theta;
      
      // Legs
      const hipY = baseY;
      const kneeY = baseY - scale * 0.4;
      ctx.strokeStyle = "hsl(220, 15%, 45%)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      // Left leg
      ctx.beginPath();
      ctx.moveTo(baseX - 15, hipY);
      ctx.lineTo(baseX - 10 + Math.sin(theta) * scale * 0.1, kneeY);
      ctx.stroke();
      // Right leg
      ctx.beginPath();
      ctx.moveTo(baseX + 15, hipY);
      ctx.lineTo(baseX + 10 + Math.sin(theta) * scale * 0.1, kneeY);
      ctx.stroke();

      // Torso
      const shoulderX = baseX + Math.sin(theta) * scale * 0.6;
      const shoulderY = kneeY - scale * 0.5;
      ctx.strokeStyle = "hsl(175, 60%, 45%)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(baseX + Math.sin(theta) * scale * 0.1, kneeY);
      ctx.lineTo(shoulderX, shoulderY);
      ctx.stroke();

      // Head
      const headX = shoulderX + Math.sin(theta) * scale * 0.15;
      const headY = shoulderY - scale * 0.2;
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.beginPath();
      ctx.arc(headX, headY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.strokeStyle = "hsl(220, 15%, 40%)";
      ctx.lineWidth = 4;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(shoulderX - 5, shoulderY + 5);
      ctx.lineTo(shoulderX - 30 + Math.sin(theta) * 15, shoulderY + scale * 0.3);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(shoulderX + 5, shoulderY + 5);
      ctx.lineTo(shoulderX + 30 + Math.sin(theta) * 15, shoulderY + scale * 0.3);
      ctx.stroke();

      // Center of Mass
      if (showCoM) {
        const comX = baseX + Math.sin(theta) * scale * 0.35;
        const comY = kneeY - scale * 0.2;

        // CoM marker
        ctx.fillStyle = "hsl(40, 90%, 55%)";
        ctx.beginPath();
        ctx.arc(comX, comY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "hsl(40, 90%, 55%)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(comX, comY, 10, 0, Math.PI * 2);
        ctx.stroke();

        // CoM projection line to ground
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "hsl(40, 90%, 55%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(comX, comY);
        ctx.lineTo(comX, baseY + 8);
        ctx.stroke();
        ctx.setLineDash([]);

        // Projection dot on ground
        ctx.fillStyle = "hsl(40, 90%, 55%)";
        ctx.beginPath();
        ctx.arc(comX, baseY + 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = "hsl(40, 90%, 55%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "left";
        ctx.fillText("CoM", comX + 14, comY + 4);

        // Warning if CoM outside support
        if (Math.abs(comX - baseX) > 55) {
          ctx.fillStyle = "hsl(0, 70%, 55%)";
          ctx.font = "12px 'JetBrains Mono'";
          ctx.textAlign = "center";
          ctx.fillText("⚠ UNSTABLE", baseX, baseY + 40);
        }
      }

      // Torque arrow
      if (Math.abs(state.torque) > 0.5) {
        const arrowDir = state.torque > 0 ? -1 : 1;
        const arrowSize = Math.min(50, Math.abs(state.torque) * 2);
        ctx.strokeStyle = "hsl(270, 60%, 55%)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        const ay = kneeY;
        ctx.moveTo(baseX - arrowDir * 30, ay);
        ctx.lineTo(baseX - arrowDir * (30 + arrowSize), ay);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = "hsl(270, 60%, 55%)";
        ctx.beginPath();
        const tip = baseX - arrowDir * (30 + arrowSize);
        ctx.moveTo(tip, ay);
        ctx.lineTo(tip + arrowDir * 8, ay - 5);
        ctx.lineTo(tip + arrowDir * 8, ay + 5);
        ctx.closePath();
        ctx.fill();
      }

      // Chart area (right side)
      const chartX = w * 0.6;
      const chartY = 30;
      const chartW = w * 0.35;
      const chartH = h * 0.4;

      ctx.fillStyle = "hsla(220, 18%, 9%, 0.9)";
      ctx.fillRect(chartX - 10, chartY - 10, chartW + 20, chartH + 30);
      ctx.strokeStyle = "hsl(220, 15%, 18%)";
      ctx.lineWidth = 1;
      ctx.strokeRect(chartX - 10, chartY - 10, chartW + 20, chartH + 30);

      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText("ANGLE / TORQUE", chartX, chartY + 5);

      const hist = historyRef.current;
      if (hist.length > 2) {
        const tMin = hist[0].t;
        const tMax = hist[hist.length - 1].t;
        const toChX = (t: number) => chartX + ((t - tMin) / (tMax - tMin || 1)) * chartW;

        // Theta curve
        ctx.strokeStyle = "hsl(175, 80%, 50%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < hist.length; i++) {
          const x = toChX(hist[i].t);
          const y = chartY + chartH / 2 - (hist[i].theta / (Math.PI / 2)) * (chartH / 2);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Torque curve
        ctx.strokeStyle = "hsl(270, 60%, 55%)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const maxT = Math.max(1, ...hist.map(h => Math.abs(h.torque)));
        for (let i = 0; i < hist.length; i++) {
          const x = toChX(hist[i].t);
          const y = chartY + chartH / 2 - (hist[i].torque / maxT) * (chartH / 2) * 0.5;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Zero line
        ctx.strokeStyle = "hsl(220, 15%, 20%)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartH / 2);
        ctx.lineTo(chartX + chartW, chartY + chartH / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Legend
        const ly = chartY + chartH + 15;
        ctx.fillStyle = "hsl(175, 80%, 50%)";
        ctx.fillRect(chartX, ly, 10, 2);
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.fillText("θ", chartX + 14, ly + 4);
        ctx.fillStyle = "hsl(270, 60%, 55%)";
        ctx.fillRect(chartX + 40, ly, 10, 2);
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.fillText("τ", chartX + 54, ly + 4);
      }

      // Info
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`θ=${(state.theta * 180 / Math.PI).toFixed(1)}°  ω=${state.omega.toFixed(2)} rad/s  τ=${state.torque.toFixed(1)} N·m`, 15, 20);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [kp, kd, disturbance, running, showCoM, showPolygon]);

  const controls = (
    <>
      <ControlSection title="Balance Controller">
        <SliderControl label="Stiffness (Kp)" value={kp} min={0} max={150} step={1} onChange={setKp} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Damping (Kd)" value={kd} min={0} max={50} step={0.5} onChange={setKd} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Disturbance">
        <SliderControl label="Constant Force" value={disturbance} min={-20} max={20} step={0.5} unit=" N" onChange={setDisturbance} color="hsl(0, 70%, 55%)" />
        <div className="flex gap-2">
          <button onClick={() => applyPush(-2)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            ← Push Left
          </button>
          <button onClick={() => applyPush(2)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            Push Right →
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowCoM(!showCoM)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${showCoM ? "border-primary text-primary" : "border-border text-foreground"}`}>
            CoM
          </button>
          <button onClick={() => setShowPolygon(!showPolygon)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${showPolygon ? "border-primary text-primary" : "border-border text-foreground"}`}>
            Support
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            {running ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={reset}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            ↺ Reset
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          An inverted pendulum model of humanoid balance. The <span className="text-primary">PD controller</span> stabilizes the body. 
          Apply <span className="text-red-glow">disturbances</span> and watch the <span className="text-amber-glow">center of mass</span> stay 
          within the <span className="text-green-glow">support polygon</span>. The chart shows angle (θ) and control torque (τ) over time.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Humanoid Balance" subtitle="Balance Stabilization & CoM Control" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default HumanoidBalanceSimulator;
