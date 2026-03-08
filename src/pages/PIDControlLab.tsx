import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout, { useLearningMode } from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import EducationPanel from "@/components/EducationPanel";
import { exportToCSV } from "@/components/DataExport";

interface DataPoint {
  t: number;
  setpoint: number;
  output: number;
  error: number;
}

const PIDControlLab = () => {
  const [kp, setKp] = useState(1.5);
  const [ki, setKi] = useState(0.3);
  const [kd, setKd] = useState(0.5);
  const [setpoint, setSetpoint] = useState(1.0);
  const [running, setRunning] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<DataPoint[]>([]);
  const simRef = useRef({ t: 0, output: 0, integral: 0, prevError: 0, velocity: 0 });
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    dataRef.current = [];
    simRef.current = { t: 0, output: 0, integral: 0, prevError: 0, velocity: 0 };
  }, []);

  useEffect(() => {
    reset();
  }, [kp, ki, kd, setpoint, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const dt = 0.016;
    const maxPoints = 600;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth * window.devicePixelRatio;
      canvas.height = container.clientHeight * window.devicePixelRatio;
      canvas.style.width = container.clientWidth + "px";
      canvas.style.height = container.clientHeight + "px";
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      if (running) {
        const sim = simRef.current;
        const error = setpoint - sim.output;
        sim.integral += error * dt;
        sim.integral = Math.max(-10, Math.min(10, sim.integral));
        const derivative = (error - sim.prevError) / dt;
        const controlSignal = kp * error + ki * sim.integral + kd * derivative;

        // Second-order system simulation
        const damping = 0.3;
        const mass = 1.0;
        sim.velocity += (controlSignal - damping * sim.velocity) / mass * dt;
        sim.output += sim.velocity * dt;
        sim.prevError = error;
        sim.t += dt;

        dataRef.current.push({ t: sim.t, setpoint, output: sim.output, error });
        if (dataRef.current.length > maxPoints) dataRef.current.shift();
      }

      // Draw
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "hsl(220, 15%, 14%)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const data = dataRef.current;
      if (data.length < 2) return;

      const margin = { top: 40, right: 20, bottom: 40, left: 60 };
      const plotW = w - margin.left - margin.right;
      const plotH = h - margin.top - margin.bottom;

      // Compute ranges
      const tMin = data[0].t;
      const tMax = data[data.length - 1].t;
      let yMin = -0.5, yMax = 2;
      for (const d of data) {
        yMin = Math.min(yMin, d.output, d.setpoint, d.error);
        yMax = Math.max(yMax, d.output, d.setpoint, d.error);
      }
      yMin -= 0.2; yMax += 0.2;

      const toX = (t: number) => margin.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
      const toY = (v: number) => margin.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

      // Axes
      ctx.strokeStyle = "hsl(220, 15%, 25%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, h - margin.bottom);
      ctx.lineTo(w - margin.right, h - margin.bottom);
      ctx.stroke();

      // Labels
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.fillText("Time (s)", w / 2, h - 8);
      ctx.save();
      ctx.translate(15, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Amplitude", 0, 0);
      ctx.restore();

      // Y ticks
      ctx.textAlign = "right";
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const v = yMin + (yMax - yMin) * (i / ySteps);
        const y = toY(v);
        ctx.fillStyle = "hsl(215, 15%, 40%)";
        ctx.fillText(v.toFixed(1), margin.left - 8, y + 4);
        ctx.strokeStyle = "hsl(220, 15%, 12%)";
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(w - margin.right, y); ctx.stroke();
      }

      // Setpoint line (dashed)
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "hsl(40, 90%, 55%)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(toX(tMin), toY(setpoint));
      ctx.lineTo(toX(tMax), toY(setpoint));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw curves
      const drawCurve = (key: "output" | "error", color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = toX(data[i].t);
          const y = toY(data[i][key]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawCurve("error", "hsl(0, 70%, 55%)", 1.5);
      drawCurve("output", "hsl(175, 80%, 50%)", 2.5);

      // Legend
      ctx.font = "11px 'JetBrains Mono'";
      const legendY = margin.top - 15;
      const items = [
        { label: "Output", color: "hsl(175, 80%, 50%)" },
        { label: "Setpoint", color: "hsl(40, 90%, 55%)" },
        { label: "Error", color: "hsl(0, 70%, 55%)" },
      ];
      let lx = margin.left;
      for (const item of items) {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx, legendY - 4, 12, 3);
        ctx.fillStyle = "hsl(215, 15%, 60%)";
        ctx.textAlign = "left";
        ctx.fillText(item.label, lx + 16, legendY);
        lx += 90;
      }

      // Stats
      if (data.length > 1) {
        const last = data[data.length - 1];
        const overshoot = Math.max(0, ...data.map(d => d.output)) - setpoint;
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.font = "10px 'JetBrains Mono'";
        ctx.textAlign = "right";
        ctx.fillText(`Output: ${last.output.toFixed(3)}`, w - margin.right, margin.top - 5);
        ctx.fillText(`Overshoot: ${(overshoot * 100).toFixed(1)}%`, w - margin.right, margin.top + 10);
      }
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [kp, ki, kd, setpoint, running]);

  const controls = (
    <>
      <ControlSection title="PID Gains">
        <SliderControl label="Proportional (Kp)" value={kp} min={0} max={10} step={0.1} onChange={setKp} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Integral (Ki)" value={ki} min={0} max={5} step={0.05} onChange={setKi} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Derivative (Kd)" value={kd} min={0} max={5} step={0.05} onChange={setKd} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Reference">
        <SliderControl label="Setpoint" value={setpoint} min={-2} max={3} step={0.1} unit="" onChange={setSetpoint} color="hsl(40, 90%, 55%)" />
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button
            onClick={() => setRunning(!running)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
          >
            {running ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={reset}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        <button
          onClick={() => exportToCSV(dataRef.current, `pid_kp${kp}_ki${ki}_kd${kd}`)}
          className="w-full text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
        >
          📥 Export CSV
        </button>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tune the PID gains to control a second-order system. The <span className="text-primary">cyan</span> curve shows system output, 
          <span className="text-amber-glow"> amber</span> is the setpoint, and <span className="text-red-glow">red</span> shows the error signal.
          Try increasing Kp for faster response, Ki to eliminate steady-state error, and Kd to reduce overshoot.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="PID Control Lab" subtitle="Classical Control Systems" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default PIDControlLab;
