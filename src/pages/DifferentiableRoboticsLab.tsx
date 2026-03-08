import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

const DifferentiableRoboticsLab = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [j1, setJ1] = useState(0.5);
  const [j2, setJ2] = useState(-0.6);
  const [j3, setJ3] = useState(0.4);
  const [showJacobian, setShowJacobian] = useState(true);
  const [showEllipsoid, setShowEllipsoid] = useState(true);
  const [showSensitivity, setShowSensitivity] = useState(true);
  const [showVelocity, setShowVelocity] = useState(false);
  const [showSingularity, setShowSingularity] = useState(true);
  const [mathMode, setMathMode] = useState(false);

  // IK target
  const [targetX, setTargetX] = useState(0.8);
  const [targetY, setTargetY] = useState(1.5);
  const [useIK, setUseIK] = useState(false);

  const L1 = 1.2, L2 = 1.0, L3 = 0.8;

  // FK
  const fk = useMemo(() => {
    const x1 = 0, y1 = L1;
    const x2 = x1 + Math.sin(j2) * L2;
    const y2 = y1 + Math.cos(j2) * L2;
    const x3 = x2 + Math.sin(j2 + j3) * L3;
    const y3 = y2 + Math.cos(j2 + j3) * L3;
    return { x1, y1, x2, y2, x3, y3 };
  }, [j1, j2, j3]);

  // Jacobian (2x3 for planar: d(x,y)/d(j1,j2,j3))
  const jacobian = useMemo(() => {
    const J = [
      [0, Math.cos(j2) * L2 + Math.cos(j2 + j3) * L3, Math.cos(j2 + j3) * L3],
      [0, -Math.sin(j2) * L2 - Math.sin(j2 + j3) * L3, -Math.sin(j2 + j3) * L3],
    ];
    // JJT
    const a = J[0][0] ** 2 + J[0][1] ** 2 + J[0][2] ** 2;
    const b = J[0][0] * J[1][0] + J[0][1] * J[1][1] + J[0][2] * J[1][2];
    const d = J[1][0] ** 2 + J[1][1] ** 2 + J[1][2] ** 2;
    const det = a * d - b * b;
    const manipulability = Math.sqrt(Math.max(0, det));
    const trace = a + d;
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    const eig1 = Math.sqrt(Math.max(0.001, (trace + disc) / 2));
    const eig2 = Math.sqrt(Math.max(0.001, (trace - disc) / 2));
    const eigAngle = Math.atan2(2 * b, a - d) / 2;
    // Joint sensitivity: column norms of J
    const sens = [0, 1, 2].map(i => Math.sqrt(J[0][i] ** 2 + J[1][i] ** 2));
    const conditionNumber = eig1 / Math.max(0.001, eig2);
    const isSingular = manipulability < 0.05;
    const nearSingular = manipulability < 0.2;
    return { J, manipulability, eig1, eig2, eigAngle, sens, conditionNumber, isSingular, nearSingular };
  }, [j1, j2, j3]);

  // IK solver
  const solveIK = useCallback((tx: number, ty: number) => {
    const aty = ty - L1;
    const dist = Math.sqrt(tx * tx + aty * aty);
    if (dist > L2 + L3) return;
    const cosQ3 = (dist * dist - L2 * L2 - L3 * L3) / (2 * L2 * L3);
    if (Math.abs(cosQ3) > 1) return;
    const q3 = Math.acos(Math.max(-1, Math.min(1, cosQ3)));
    const alpha = Math.atan2(tx, aty);
    const beta = Math.atan2(L3 * Math.sin(q3), L2 + L3 * Math.cos(q3));
    setJ2(alpha - beta);
    setJ3(-q3);
  }, []);

  useEffect(() => {
    if (useIK) solveIK(targetX, targetY);
  }, [targetX, targetY, useIK, solveIK]);

  // Render
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

      // World transform: center-bottom
      const scale = Math.min(w, h) * 0.22;
      const cx = w * 0.35;
      const cy = h * 0.85;

      const toScreen = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];

      // Grid
      ctx.strokeStyle = "hsla(228, 13%, 13%, 0.5)";
      ctx.lineWidth = 0.5;
      for (let i = -3; i <= 3; i++) {
        const [sx, sy] = toScreen(i, 0);
        const [, ey] = toScreen(0, 4);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, ey); ctx.stroke();
        const [gx, gy] = toScreen(-3, i > 0 ? i : 0);
        const [gx2] = toScreen(3, 0);
        if (i >= 0 && i <= 4) { ctx.beginPath(); ctx.moveTo(gx, cy - i * scale); ctx.lineTo(gx2, cy - i * scale); ctx.stroke(); }
      }

      // Workspace circle
      ctx.strokeStyle = "hsla(172, 78%, 47%, 0.08)";
      ctx.lineWidth = 1;
      const [wcx, wcy] = toScreen(0, L1);
      ctx.beginPath(); ctx.arc(wcx, wcy, (L2 + L3) * scale, 0, Math.PI * 2); ctx.stroke();

      // Robot arm
      const [bx, by] = toScreen(0, 0);
      const [e1x, e1y] = toScreen(fk.x1, fk.y1);
      const [e2x, e2y] = toScreen(fk.x2, fk.y2);
      const [e3x, e3y] = toScreen(fk.x3, fk.y3);

      // Links
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = "hsl(228, 13%, 25%)";
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(e1x, e1y); ctx.stroke();
      ctx.strokeStyle = "hsl(172, 60%, 35%)";
      ctx.beginPath(); ctx.moveTo(e1x, e1y); ctx.lineTo(e2x, e2y); ctx.stroke();
      ctx.strokeStyle = "hsl(152, 50%, 30%)";
      ctx.beginPath(); ctx.moveTo(e2x, e2y); ctx.lineTo(e3x, e3y); ctx.stroke();

      // Joints
      [toScreen(0, 0), toScreen(fk.x1, fk.y1), toScreen(fk.x2, fk.y2)].forEach(([jx, jy], i) => {
        ctx.fillStyle = jacobian.sens[i] > 0.8 ? "hsl(38, 88%, 52%)" : "hsl(172, 78%, 47%)";
        ctx.beginPath(); ctx.arc(jx, jy, 6, 0, Math.PI * 2); ctx.fill();
      });

      // End effector
      ctx.fillStyle = jacobian.isSingular ? "hsl(0, 62%, 50%)" : "hsl(40, 90%, 55%)";
      ctx.beginPath(); ctx.arc(e3x, e3y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsla(40, 90%, 55%, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e3x, e3y, 12, 0, Math.PI * 2); ctx.stroke();

      // IK target
      if (useIK) {
        const [tx, ty] = toScreen(targetX, targetY);
        ctx.strokeStyle = "hsl(38, 88%, 52%)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx - 6, ty); ctx.lineTo(tx + 6, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx, ty - 6); ctx.lineTo(tx, ty + 6); ctx.stroke();
      }

      // Manipulability ellipsoid
      if (showEllipsoid) {
        const [ex, ey] = toScreen(fk.x3, fk.y3);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(-jacobian.eigAngle);
        const sc1 = jacobian.eig1 * scale * 0.4;
        const sc2 = jacobian.eig2 * scale * 0.4;
        ctx.strokeStyle = jacobian.nearSingular ? "hsla(0, 62%, 50%, 0.6)" : "hsla(38, 88%, 52%, 0.5)";
        ctx.fillStyle = jacobian.nearSingular ? "hsla(0, 62%, 50%, 0.08)" : "hsla(38, 88%, 52%, 0.06)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, sc1, sc2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Principal axes
        ctx.strokeStyle = "hsla(38, 88%, 52%, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(-sc1, 0); ctx.lineTo(sc1, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -sc2); ctx.lineTo(0, sc2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Velocity ellipsoid
      if (showVelocity) {
        const [ex, ey] = toScreen(fk.x3, fk.y3);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(-jacobian.eigAngle);
        const sc1 = jacobian.eig1 * scale * 0.25;
        const sc2 = jacobian.eig2 * scale * 0.25;
        ctx.strokeStyle = "hsla(212, 78%, 52%, 0.5)";
        ctx.fillStyle = "hsla(212, 78%, 52%, 0.05)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, sc1, sc2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Joint sensitivity bars
      if (showSensitivity) {
        const barX = w - 140;
        const barY = 60;
        const barW = 100;
        const barH = 14;
        const maxSens = Math.max(0.1, ...jacobian.sens);
        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "10px 'Inter'";
        ctx.textAlign = "left";
        ctx.fillText("JOINT SENSITIVITY", barX, barY - 8);
        const colors = ["hsl(172, 78%, 47%)", "hsl(152, 68%, 42%)", "hsl(212, 78%, 52%)"];
        const labels = ["θ₁ Base", "θ₂ Shoulder", "θ₃ Elbow"];
        jacobian.sens.forEach((s, i) => {
          const y = barY + i * (barH + 8);
          ctx.fillStyle = "hsl(228, 13%, 10%)";
          ctx.fillRect(barX, y, barW, barH);
          ctx.fillStyle = colors[i];
          ctx.fillRect(barX, y, (s / maxSens) * barW, barH);
          ctx.fillStyle = "hsl(210, 20%, 93%)";
          ctx.font = "9px 'JetBrains Mono'";
          ctx.textAlign = "left";
          ctx.fillText(`${labels[i]}  ${s.toFixed(3)}`, barX, y - 2);
        });
      }

      // Singularity warning
      if (showSingularity && jacobian.nearSingular) {
        const warnX = w * 0.5;
        const warnY = 30;
        ctx.textAlign = "center";
        if (jacobian.isSingular) {
          ctx.fillStyle = "hsl(0, 62%, 50%)";
          ctx.font = "bold 13px 'Inter'";
          ctx.fillText("⚠ SINGULARITY DETECTED", warnX, warnY);
          ctx.font = "10px 'JetBrains Mono'";
          ctx.fillStyle = "hsl(0, 62%, 65%)";
          ctx.fillText(`w = ${jacobian.manipulability.toFixed(4)} · κ = ${jacobian.conditionNumber.toFixed(1)}`, warnX, warnY + 16);
        } else {
          ctx.fillStyle = "hsl(38, 88%, 52%)";
          ctx.font = "bold 11px 'Inter'";
          ctx.fillText("⚠ NEAR SINGULARITY", warnX, warnY);
          ctx.font = "10px 'JetBrains Mono'";
          ctx.fillStyle = "hsl(38, 88%, 65%)";
          ctx.fillText(`w = ${jacobian.manipulability.toFixed(4)}`, warnX, warnY + 14);
        }
      }

      // Math mode: Jacobian matrix display
      if (mathMode) {
        const mx = 20;
        const my = h - 180;
        ctx.fillStyle = "hsla(228, 15%, 7%, 0.92)";
        ctx.strokeStyle = "hsl(228, 13%, 13%)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(mx, my, 260, 170, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "hsl(172, 78%, 47%)";
        ctx.font = "bold 10px 'Inter'";
        ctx.textAlign = "left";
        ctx.fillText("JACOBIAN MATRIX  J = ∂(x,y)/∂(θ₁,θ₂,θ₃)", mx + 10, my + 18);

        ctx.font = "11px 'JetBrains Mono'";
        ctx.fillStyle = "hsl(210, 20%, 85%)";
        ctx.fillText(`[${jacobian.J[0].map(v => v.toFixed(3).padStart(7)).join(",")}]`, mx + 12, my + 40);
        ctx.fillText(`[${jacobian.J[1].map(v => v.toFixed(3).padStart(7)).join(",")}]`, mx + 12, my + 56);

        ctx.font = "9px 'JetBrains Mono'";
        ctx.fillStyle = "hsl(220, 10%, 50%)";
        const metrics = [
          `Manipulability  w = ${jacobian.manipulability.toFixed(4)}`,
          `Condition №     κ = ${jacobian.conditionNumber.toFixed(2)}`,
          `σ₁ = ${jacobian.eig1.toFixed(3)}    σ₂ = ${jacobian.eig2.toFixed(3)}`,
          `det(JJᵀ) = ${(jacobian.eig1 ** 2 * jacobian.eig2 ** 2).toFixed(4)}`,
          `Sensitivity: [${jacobian.sens.map(s => s.toFixed(2)).join(", ")}]`,
        ];
        metrics.forEach((m, i) => {
          ctx.fillStyle = i === 0 ? "hsl(38, 88%, 52%)" : "hsl(220, 10%, 50%)";
          ctx.fillText(m, mx + 12, my + 80 + i * 16);
        });
      }

      // Top-left HUD
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`EE: (${fk.x3.toFixed(2)}, ${fk.y3.toFixed(2)})  w=${jacobian.manipulability.toFixed(3)}`, 15, 15);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [j1, j2, j3, fk, jacobian, showEllipsoid, showVelocity, showSensitivity, showSingularity, mathMode, useIK, targetX, targetY]);

  const controls = (
    <>
      <ControlSection title="Mode">
        <div className="flex gap-2">
          <button onClick={() => setUseIK(false)} className={`flex-1 sim-btn ${!useIK ? "sim-btn-active" : "sim-btn-inactive"}`}>FK</button>
          <button onClick={() => setUseIK(true)} className={`flex-1 sim-btn ${useIK ? "sim-btn-active" : "sim-btn-inactive"}`}>IK</button>
        </div>
      </ControlSection>

      {useIK ? (
        <ControlSection title="IK Target">
          <SliderControl label="Target X" value={targetX} min={-2} max={2} step={0.01} unit=" m" onChange={setTargetX} color="hsl(38, 88%, 52%)" />
          <SliderControl label="Target Y" value={targetY} min={0.5} max={3} step={0.01} unit=" m" onChange={setTargetY} color="hsl(38, 88%, 52%)" />
        </ControlSection>
      ) : (
        <ControlSection title="Joint Angles">
          <SliderControl label="Base (θ₁)" value={j1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJ1} color="hsl(172, 78%, 47%)" />
          <SliderControl label="Shoulder (θ₂)" value={j2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJ2} color="hsl(152, 68%, 42%)" />
          <SliderControl label="Elbow (θ₃)" value={j3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJ3} color="hsl(212, 78%, 52%)" />
        </ControlSection>
      )}

      <ControlSection title="Visualizations">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowJacobian(!showJacobian)} className={`sim-btn ${showJacobian ? "sim-btn-active" : "sim-btn-inactive"}`}>Jacobian</button>
          <button onClick={() => setShowEllipsoid(!showEllipsoid)} className={`sim-btn ${showEllipsoid ? "sim-btn-active" : "sim-btn-inactive"}`}>Ellipsoid</button>
          <button onClick={() => setShowVelocity(!showVelocity)} className={`sim-btn ${showVelocity ? "sim-btn-active" : "sim-btn-inactive"}`}>Vel. Ellipsoid</button>
          <button onClick={() => setShowSensitivity(!showSensitivity)} className={`sim-btn ${showSensitivity ? "sim-btn-active" : "sim-btn-inactive"}`}>Sensitivity</button>
          <button onClick={() => setShowSingularity(!showSingularity)} className={`sim-btn ${showSingularity ? "sim-btn-active" : "sim-btn-inactive"}`}>Singularity</button>
          <button onClick={() => setMathMode(!mathMode)} className={`sim-btn ${mathMode ? "sim-btn-active" : "sim-btn-inactive"}`}>Math Mode</button>
        </div>
      </ControlSection>

      <ControlSection title="Jacobian Matrix">
        <div className="bg-secondary/40 rounded-lg p-3 text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
          <div className="text-[9px] mb-1 opacity-60">J = ∂(x,y)/∂(θ₁,θ₂,θ₃)</div>
          <div className="text-primary">[{jacobian.J[0].map(v => v.toFixed(3)).join(", ")}]</div>
          <div className="text-primary">[{jacobian.J[1].map(v => v.toFixed(3)).join(", ")}]</div>
          <div className="mt-2 space-y-0.5 text-[9px]">
            <div><span className="opacity-60">Manipulability w = </span><span className={jacobian.nearSingular ? "text-destructive" : "text-amber-glow"}>{jacobian.manipulability.toFixed(4)}</span></div>
            <div><span className="opacity-60">Condition κ = </span><span className="text-primary">{jacobian.conditionNumber.toFixed(2)}</span></div>
            <div><span className="opacity-60">σ₁ = </span><span className="text-primary">{jacobian.eig1.toFixed(3)}</span><span className="opacity-60 ml-2">σ₂ = </span><span className="text-primary">{jacobian.eig2.toFixed(3)}</span></div>
          </div>
          {jacobian.isSingular && <div className="mt-1 text-destructive font-semibold text-[9px]">⚠ SINGULAR CONFIGURATION</div>}
        </div>
      </ControlSection>

      <ControlSection title="Joint Sensitivity">
        <div className="space-y-2">
          {["Base θ₁", "Shoulder θ₂", "Elbow θ₃"].map((label, i) => {
            const maxS = Math.max(0.1, ...jacobian.sens);
            const pct = (jacobian.sens[i] / maxS) * 100;
            const colors = ["hsl(172, 78%, 47%)", "hsl(152, 68%, 42%)", "hsl(212, 78%, 52%)"];
            return (
              <div key={i}>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                  <span>{label}</span>
                  <span className="text-foreground">{jacobian.sens[i].toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, backgroundColor: colors[i] }} />
                </div>
              </div>
            );
          })}
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <span className="text-amber-glow">manipulability ellipsoid</span> shows how easily the end-effector can move in each direction. 
          When it collapses to a line, the robot is at a <span className="text-destructive">singularity</span> — motion is restricted. 
          <span className="text-primary"> Joint sensitivity</span> bars show which joints have the most influence. 
          Enable <span className="text-primary">Math Mode</span> for the full Jacobian overlay.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Differentiable Robotics" subtitle="Jacobian · Singularity · Manipulability" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default DifferentiableRoboticsLab;
