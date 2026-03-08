import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface TrajectoryPoint { x: number; y: number; t: number; }

const SimToRealLab = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [sensorNoise, setSensorNoise] = useState(0.15);
  const [actuatorDelay, setActuatorDelay] = useState(0.08);
  const [jointFriction, setJointFriction] = useState(0.12);
  const [controlLatency, setControlLatency] = useState(0.05);
  const [envRandomness, setEnvRandomness] = useState(0.1);
  const [running, setRunning] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  const idealTrailRef = useRef<TrajectoryPoint[]>([]);
  const noisyTrailRef = useRef<TrajectoryPoint[]>([]);
  const errorHistRef = useRef<number[]>([]);

  const reset = useCallback(() => {
    timeRef.current = 0;
    idealTrailRef.current = [];
    noisyTrailRef.current = [];
    errorHistRef.current = [];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;

    let noisyX = 0, noisyY = 0;
    let noisyVx = 0, noisyVy = 0;
    let delayBuffer: { x: number; y: number }[] = [];

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

      // Ideal trajectory: figure-8
      const idealX = Math.sin(t * 0.8) * 1.5;
      const idealY = Math.sin(t * 1.6) * 0.8 + 1.5;

      // Ideal velocity for target
      const idealVx = Math.cos(t * 0.8) * 0.8 * 1.5;
      const idealVy = Math.cos(t * 1.6) * 1.6 * 0.8;

      // Noisy: add sensor noise, actuator delay, friction, latency
      if (running) {
        const sensedX = idealX + (Math.random() - 0.5) * sensorNoise * 2;
        const sensedY = idealY + (Math.random() - 0.5) * sensorNoise * 2;

        // Actuator delay buffer
        delayBuffer.push({ x: sensedX, y: sensedY });
        const delayFrames = Math.max(1, Math.round(actuatorDelay * 60));
        while (delayBuffer.length > delayFrames) delayBuffer.shift();
        const delayed = delayBuffer[0];

        // Control with latency
        const targetX = delayed.x + (Math.random() - 0.5) * controlLatency * 3;
        const targetY = delayed.y + (Math.random() - 0.5) * controlLatency * 3;

        // PD controller with friction
        const kp = 4, kd = 2;
        const errX = targetX - noisyX;
        const errY = targetY - noisyY;
        const ax = kp * errX - kd * noisyVx - jointFriction * noisyVx + (Math.random() - 0.5) * envRandomness;
        const ay = kp * errY - kd * noisyVy - jointFriction * noisyVy + (Math.random() - 0.5) * envRandomness;
        noisyVx += ax * 0.016;
        noisyVy += ay * 0.016;
        noisyX += noisyVx * 0.016;
        noisyY += noisyVy * 0.016;

        idealTrailRef.current.push({ x: idealX, y: idealY, t });
        noisyTrailRef.current.push({ x: noisyX, y: noisyY, t });
        if (idealTrailRef.current.length > 600) idealTrailRef.current.shift();
        if (noisyTrailRef.current.length > 600) noisyTrailRef.current.shift();

        const err = Math.sqrt((idealX - noisyX) ** 2 + (idealY - noisyY) ** 2);
        errorHistRef.current.push(err);
        if (errorHistRef.current.length > 300) errorHistRef.current.shift();
      }

      const scale = Math.min(w, h) * 0.18;
      const halfW = w / 2;

      // Draw function for each panel
      const drawPanel = (ox: number, oy: number, pw: number, ph: number, label: string, trail: TrajectoryPoint[], isNoisy: boolean) => {
        ctx.fillStyle = "hsla(228, 15%, 7%, 0.6)";
        ctx.strokeStyle = "hsl(228, 13%, 13%)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(ox, oy, pw, ph, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = isNoisy ? "hsl(0, 62%, 50%)" : "hsl(172, 78%, 47%)";
        ctx.font = "bold 11px 'Inter'";
        ctx.textAlign = "center";
        ctx.fillText(label, ox + pw / 2, oy + 20);

        const cx = ox + pw / 2;
        const cy = oy + ph / 2 + 10;

        // Grid
        ctx.strokeStyle = "hsla(228, 13%, 13%, 0.5)";
        ctx.lineWidth = 0.5;
        for (let g = -2; g <= 2; g++) {
          ctx.beginPath(); ctx.moveTo(cx + g * scale, cy - 2 * scale); ctx.lineTo(cx + g * scale, cy + 2 * scale); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 2 * scale, cy + g * scale); ctx.lineTo(cx + 2 * scale, cy + g * scale); ctx.stroke();
        }

        // Trail
        if (trail.length > 1) {
          ctx.strokeStyle = isNoisy ? "hsla(0, 62%, 50%, 0.4)" : "hsla(172, 78%, 47%, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          trail.forEach((p, i) => {
            const sx = cx + p.x * scale;
            const sy = cy - (p.y - 1.5) * scale;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        }

        // Current position
        const lastP = trail[trail.length - 1];
        if (lastP) {
          const px = cx + lastP.x * scale;
          const py = cy - (lastP.y - 1.5) * scale;
          ctx.fillStyle = isNoisy ? "hsl(0, 62%, 50%)" : "hsl(172, 78%, 47%)";
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
        }

        // Ideal path ghost on noisy panel
        if (isNoisy && showComparison && idealTrailRef.current.length > 1) {
          ctx.strokeStyle = "hsla(172, 78%, 47%, 0.2)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          idealTrailRef.current.forEach((p, i) => {
            const sx = cx + p.x * scale;
            const sy = cy - (p.y - 1.5) * scale;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };

      const margin = 10;
      const panelW = showComparison ? (w - margin * 3) / 2 : w - margin * 2;
      const panelH = h * 0.6;
      const panelY = 10;

      if (showComparison) {
        drawPanel(margin, panelY, panelW, panelH, "IDEAL SIMULATION", idealTrailRef.current, false);
        drawPanel(margin * 2 + panelW, panelY, panelW, panelH, "REAL-WORLD (NOISY)", noisyTrailRef.current, true);
      } else {
        drawPanel(margin, panelY, panelW, panelH, "REAL-WORLD (NOISY)", noisyTrailRef.current, true);
      }

      // Error plot
      const errHist = errorHistRef.current;
      if (errHist.length > 1) {
        const chartX = margin + 10;
        const chartY = panelY + panelH + 20;
        const chartW = w - margin * 2 - 20;
        const chartH = h - chartY - 30;

        ctx.fillStyle = "hsla(228, 15%, 7%, 0.6)";
        ctx.strokeStyle = "hsl(228, 13%, 13%)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(chartX - 5, chartY - 5, chartW + 10, chartH + 10, 4); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "10px 'Inter'";
        ctx.textAlign = "left";
        ctx.fillText("TRACKING ERROR (Sim-to-Real Gap)", chartX + 5, chartY + 10);

        const maxErr = Math.max(0.1, ...errHist);
        ctx.strokeStyle = "hsl(38, 88%, 52%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        errHist.forEach((e, i) => {
          const x = chartX + (i / (errHist.length - 1)) * chartW;
          const y = chartY + chartH - (e / maxErr) * (chartH - 20);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Average line
        const avg = errHist.reduce((a, b) => a + b, 0) / errHist.length;
        const avgY = chartY + chartH - (avg / maxErr) * (chartH - 20);
        ctx.strokeStyle = "hsla(0, 62%, 50%, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(chartX, avgY); ctx.lineTo(chartX + chartW, avgY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "hsl(0, 62%, 60%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "right";
        ctx.fillText(`avg: ${avg.toFixed(3)}`, chartX + chartW - 5, avgY - 4);
      }

      // HUD
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`t=${timeRef.current.toFixed(1)}s  ${running ? "▶ RUNNING" : "⏸ PAUSED"}`, 15, h - 10);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, sensorNoise, actuatorDelay, jointFriction, controlLatency, envRandomness, showComparison]);

  const controls = (
    <>
      <ControlSection title="Realism Factors">
        <SliderControl label="Sensor Noise" value={sensorNoise} min={0} max={1} step={0.01} onChange={setSensorNoise} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Actuator Delay" value={actuatorDelay} min={0} max={0.5} step={0.01} unit=" s" onChange={setActuatorDelay} color="hsl(38, 88%, 52%)" />
        <SliderControl label="Joint Friction" value={jointFriction} min={0} max={1} step={0.01} onChange={setJointFriction} color="hsl(152, 68%, 42%)" />
        <SliderControl label="Control Latency" value={controlLatency} min={0} max={0.3} step={0.01} unit=" s" onChange={setControlLatency} color="hsl(212, 78%, 52%)" />
        <SliderControl label="Env Randomness" value={envRandomness} min={0} max={1} step={0.01} onChange={setEnvRandomness} color="hsl(268, 58%, 52%)" />
      </ControlSection>

      <ControlSection title="Controls">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>
            {running ? "⏸ Pause" : "▶ Run"}
          </button>
          <button onClick={() => { reset(); }} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => setShowComparison(!showComparison)} className={`w-full mt-2 sim-btn ${showComparison ? "sim-btn-active" : "sim-btn-inactive"}`}>
          Side-by-Side View
        </button>
      </ControlSection>

      <ControlSection title="Metrics">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Avg Error</span><span className="text-foreground">{errorHistRef.current.length > 0 ? (errorHistRef.current.reduce((a, b) => a + b, 0) / errorHistRef.current.length).toFixed(3) : "—"}</span></div>
          <div className="flex justify-between"><span>Max Error</span><span className="text-foreground">{errorHistRef.current.length > 0 ? Math.max(...errorHistRef.current).toFixed(3) : "—"}</span></div>
          <div className="flex justify-between"><span>Time</span><span className="text-primary">{timeRef.current.toFixed(1)}s</span></div>
        </div>
      </ControlSection>

      <ControlSection title="Presets">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setSensorNoise(0); setActuatorDelay(0); setJointFriction(0); setControlLatency(0); setEnvRandomness(0); }} className="sim-btn sim-btn-inactive text-[10px]">Perfect</button>
          <button onClick={() => { setSensorNoise(0.1); setActuatorDelay(0.05); setJointFriction(0.08); setControlLatency(0.03); setEnvRandomness(0.05); }} className="sim-btn sim-btn-inactive text-[10px]">Mild</button>
          <button onClick={() => { setSensorNoise(0.3); setActuatorDelay(0.15); setJointFriction(0.25); setControlLatency(0.1); setEnvRandomness(0.2); }} className="sim-btn sim-btn-inactive text-[10px]">Moderate</button>
          <button onClick={() => { setSensorNoise(0.8); setActuatorDelay(0.4); setJointFriction(0.7); setControlLatency(0.25); setEnvRandomness(0.8); }} className="sim-btn sim-btn-inactive text-[10px]">Extreme</button>
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <span className="text-primary">Sim-to-Real gap</span> is one of the greatest challenges in robotics. 
          Policies trained in <span className="text-primary">ideal simulation</span> often fail in the real world due to 
          <span className="text-destructive"> sensor noise</span>, <span className="text-amber-glow">actuator delays</span>, 
          and <span className="text-purple-glow">environmental randomness</span>. 
          Adjust parameters to see how each factor degrades trajectory tracking.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Sim-to-Real Gap" subtitle="Noise · Delay · Friction · Domain Randomization" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SimToRealLab;
