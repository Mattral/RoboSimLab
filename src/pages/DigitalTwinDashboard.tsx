import { useState, useRef, useEffect } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { exportToCSV } from "@/components/DataExport";

const DigitalTwinDashboard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [running, setRunning] = useState(true);
  const [dof, setDof] = useState(4);
  const [loadFactor, setLoadFactor] = useState(0.5);
  const [showTorque, setShowTorque] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [showEnergy, setShowEnergy] = useState(true);
  const [showController, setShowController] = useState(true);

  const torqueHistRef = useRef<number[][]>([]);
  const velHistRef = useRef<number[][]>([]);
  const energyHistRef = useRef<number[]>([]);
  const ctrlHistRef = useRef<number[]>([]);

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

      // Simulate robot data
      const torques: number[] = [];
      const vels: number[] = [];
      let totalEnergy = 0;
      let ctrlOutput = 0;

      for (let j = 0; j < dof; j++) {
        const freq = 0.5 + j * 0.3;
        const torque = Math.sin(t * freq) * (2 + j * 0.5) * loadFactor + (Math.random() - 0.5) * 0.3;
        const vel = Math.cos(t * freq * 1.1) * (1.5 + j * 0.3) + (Math.random() - 0.5) * 0.2;
        torques.push(torque);
        vels.push(vel);
        totalEnergy += Math.abs(torque * vel) * 0.5;
        ctrlOutput += Math.abs(torque) * 0.3;
      }

      if (running) {
        torqueHistRef.current.push(torques);
        velHistRef.current.push(vels);
        energyHistRef.current.push(totalEnergy);
        ctrlHistRef.current.push(ctrlOutput);
        if (torqueHistRef.current.length > 200) torqueHistRef.current.shift();
        if (velHistRef.current.length > 200) velHistRef.current.shift();
        if (energyHistRef.current.length > 200) energyHistRef.current.shift();
        if (ctrlHistRef.current.length > 200) ctrlHistRef.current.shift();
      }

      const margin = 15;
      const chartGap = 12;
      const numCharts = [showTorque, showVelocity, showEnergy, showController].filter(Boolean).length;
      if (numCharts === 0) return;
      const chartH = (h - margin * 2 - chartGap * (numCharts - 1)) / numCharts;
      let chartIdx = 0;

      const drawChart = (label: string, histData: number[][] | number[], colors: string[], labels: string[]) => {
        const y = margin + chartIdx * (chartH + chartGap);
        ctx.fillStyle = "hsla(228, 15%, 7%, 0.7)";
        ctx.strokeStyle = "hsl(228, 13%, 13%)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(margin, y, w - margin * 2, chartH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "10px 'Inter'";
        ctx.textAlign = "left";
        ctx.fillText(label, margin + 10, y + 16);

        const chartX = margin + 10;
        const chartW = w - margin * 2 - 20;
        const plotY = y + 25;
        const plotH = chartH - 35;

        // Multi-line or single-line
        const isMulti = Array.isArray(histData[0]);
        if (isMulti) {
          const data = histData as number[][];
          if (data.length < 2) { chartIdx++; return; }
          let maxV = 0.1;
          for (const frame of data) for (const v of frame) maxV = Math.max(maxV, Math.abs(v));

          colors.forEach((color, li) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let i = 0; i < data.length; i++) {
              if (li >= (data[i]?.length ?? 0)) continue;
              const x = chartX + (i / (data.length - 1)) * chartW;
              const val = data[i][li];
              const ny = plotY + plotH / 2 - (val / maxV) * (plotH / 2 - 5);
              if (i === 0) ctx.moveTo(x, ny); else ctx.lineTo(x, ny);
            }
            ctx.stroke();
          });

          // Legend - distribute across available width
          const legendStartX = w - margin - Math.min(colors.length * 35, chartW * 0.4);
          colors.forEach((color, li) => {
            if (li >= labels.length) return;
            ctx.fillStyle = color;
            ctx.font = "8px 'JetBrains Mono'";
            ctx.textAlign = "left";
            ctx.fillText(labels[li], legendStartX + li * 28, y + 14);
          });

          // Current values
          const last = data[data.length - 1];
          if (last) {
            ctx.font = "9px 'JetBrains Mono'";
            ctx.textAlign = "right";
            last.forEach((v, i) => {
              if (i >= colors.length) return;
              ctx.fillStyle = colors[i];
              ctx.fillText(v.toFixed(2), w - margin - 10, plotY + 10 + i * 12);
            });
          }
        } else {
          const data = histData as number[];
          if (data.length < 2) { chartIdx++; return; }
          const maxV = Math.max(0.1, ...data);
          ctx.strokeStyle = colors[0];
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = chartX + (i / (data.length - 1)) * chartW;
            const ny = plotY + plotH - (data[i] / maxV) * (plotH - 10);
            if (i === 0) ctx.moveTo(x, ny); else ctx.lineTo(x, ny);
          }
          ctx.stroke();

          // Fill
          ctx.lineTo(chartX + chartW, plotY + plotH);
          ctx.lineTo(chartX, plotY + plotH);
          ctx.closePath();
          ctx.fillStyle = `${colors[0].replace(")", ", 0.1)")}`;
          ctx.fill();

          // Current value
          const last = data[data.length - 1];
          ctx.fillStyle = colors[0];
          ctx.font = "11px 'JetBrains Mono'";
          ctx.textAlign = "right";
          ctx.fillText(last.toFixed(2), w - margin - 10, y + 16);
        }

        // Zero line
        ctx.strokeStyle = "hsla(228, 13%, 20%, 0.5)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX, plotY + plotH / 2);
        ctx.lineTo(chartX + chartW, plotY + plotH / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        chartIdx++;
      };

      const jointColors = ["hsl(172, 78%, 47%)", "hsl(38, 88%, 52%)", "hsl(152, 68%, 42%)", "hsl(212, 78%, 52%)", "hsl(268, 58%, 52%)", "hsl(322, 58%, 52%)", "hsl(0, 62%, 50%)"];
      const jointLabels = Array.from({ length: dof }, (_, i) => `J${i + 1}`);

      if (showTorque) drawChart("JOINT TORQUES (N·m)", torqueHistRef.current, jointColors.slice(0, dof), jointLabels);
      if (showVelocity) drawChart("JOINT VELOCITIES (rad/s)", velHistRef.current, jointColors.slice(0, dof), jointLabels);
      if (showEnergy) drawChart("TOTAL ENERGY (J)", energyHistRef.current, ["hsl(38, 88%, 52%)"], ["Energy"]);
      if (showController) drawChart("CONTROLLER OUTPUT", ctrlHistRef.current, ["hsl(152, 68%, 42%)"], ["Ctrl"]);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, dof, loadFactor, showTorque, showVelocity, showEnergy, showController]);

  const controls = (
    <>
      <ControlSection title="Robot Config">
        <SliderControl label="DOF" value={dof} min={2} max={7} step={1} onChange={v => setDof(Math.round(v))} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Load Factor" value={loadFactor} min={0.1} max={2} step={0.1} onChange={setLoadFactor} color="hsl(38, 88%, 52%)" />
      </ControlSection>

      <ControlSection title="Charts">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowTorque(!showTorque)} className={`sim-btn ${showTorque ? "sim-btn-active" : "sim-btn-inactive"}`}>Torque</button>
          <button onClick={() => setShowVelocity(!showVelocity)} className={`sim-btn ${showVelocity ? "sim-btn-active" : "sim-btn-inactive"}`}>Velocity</button>
          <button onClick={() => setShowEnergy(!showEnergy)} className={`sim-btn ${showEnergy ? "sim-btn-active" : "sim-btn-inactive"}`}>Energy</button>
          <button onClick={() => setShowController(!showController)} className={`sim-btn ${showController ? "sim-btn-active" : "sim-btn-inactive"}`}>Controller</button>
        </div>
      </ControlSection>

      <ControlSection title="Controls">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Run"}</button>
          <button onClick={() => {
            torqueHistRef.current = [];
            velHistRef.current = [];
            energyHistRef.current = [];
            ctrlHistRef.current = [];
            timeRef.current = 0;
          }} className="flex-1 sim-btn sim-btn-inactive">↺ Clear</button>
        </div>
        <button onClick={() => {
          const data = torqueHistRef.current.map((t, i) => ({
            frame: i,
            ...Object.fromEntries(t.map((v, j) => [`torque_j${j + 1}`, v])),
            energy: energyHistRef.current[i] ?? 0,
          }));
          exportToCSV(data, "digital_twin_telemetry");
        }} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>

      <ControlSection title="Live Readings">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Time</span><span className="text-primary">{timeRef.current.toFixed(1)}s</span></div>
          <div className="flex justify-between"><span>Energy</span><span className="text-amber-glow">{(energyHistRef.current[energyHistRef.current.length - 1] ?? 0).toFixed(2)} J</span></div>
          <div className="flex justify-between"><span>Samples</span><span className="text-foreground">{torqueHistRef.current.length}</span></div>
        </div>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Digital Twin Dashboard" subtitle="Torque · Velocity · Energy · Controller" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default DigitalTwinDashboard;
