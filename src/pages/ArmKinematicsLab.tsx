import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

const ArmKinematicsLab = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [joint1, setJoint1] = useState(0.5);
  const [joint2, setJoint2] = useState(-0.8);
  const [joint3, setJoint3] = useState(0.3);
  const [link1] = useState(120);
  const [link2] = useState(100);
  const [link3] = useState(80);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [targetMode, setTargetMode] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef(false);

  // Simple IK using gradient descent
  const solveIK = useCallback((tx: number, ty: number, originX: number, originY: number) => {
    let a1 = joint1, a2 = joint2, a3 = joint3;
    const lr = 0.005;

    for (let iter = 0; iter < 100; iter++) {
      const x1 = originX + link1 * Math.cos(a1);
      const y1 = originY - link1 * Math.sin(a1);
      const x2 = x1 + link2 * Math.cos(a1 + a2);
      const y2 = y1 - link2 * Math.sin(a1 + a2);
      const ex = x2 + link3 * Math.cos(a1 + a2 + a3);
      const ey = y2 - link3 * Math.sin(a1 + a2 + a3);

      const dx = tx - ex;
      const dy = ty - ey;
      if (dx * dx + dy * dy < 4) break;

      // Numerical Jacobian approximation
      const eps = 0.001;
      for (let j = 0; j < 3; j++) {
        const angles = [a1, a2, a3];
        angles[j] += eps;
        const [aa1, aa2, aa3] = angles;
        const px1 = originX + link1 * Math.cos(aa1);
        const py1 = originY - link1 * Math.sin(aa1);
        const px2 = px1 + link2 * Math.cos(aa1 + aa2);
        const py2 = py1 - link2 * Math.sin(aa1 + aa2);
        const pex = px2 + link3 * Math.cos(aa1 + aa2 + aa3);
        const pey = py2 - link3 * Math.sin(aa1 + aa2 + aa3);

        const gradX = (pex - ex) / eps;
        const gradY = (pey - ey) / eps;
        const delta = lr * (dx * gradX + dy * gradY);

        if (j === 0) a1 += delta;
        else if (j === 1) a2 += delta;
        else a3 += delta;
      }
    }
    return { a1, a2, a3 };
  }, [joint1, joint2, joint3, link1, link2, link3]);

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

    const handleMouse = (e: MouseEvent) => {
      if (!targetMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.type === "mousedown") {
        dragRef.current = true;
        setTarget({ x, y });
      } else if (e.type === "mousemove" && dragRef.current) {
        setTarget({ x, y });
      } else if (e.type === "mouseup") {
        dragRef.current = false;
      }
    };

    canvas.addEventListener("mousedown", handleMouse);
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseup", handleMouse);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouse);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseup", handleMouse);
    };
  }, [targetMode]);

  // IK solving effect
  useEffect(() => {
    if (!target || !targetMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const originX = w / 2;
    const originY = h * 0.65;

    const { a1, a2, a3 } = solveIK(target.x, target.y, originX, originY);
    setJoint1(a1);
    setJoint2(a2);
    setJoint3(a3);
  }, [target, targetMode, solveIK]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "hsl(220, 15%, 12%)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const originX = w / 2;
      const originY = h * 0.65;

      // Workspace visualization
      if (showWorkspace) {
        const maxR = link1 + link2 + link3;
        const minR = Math.abs(link1 - link2 - link3);
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "hsl(175, 80%, 50%)";
        ctx.beginPath();
        ctx.arc(originX, originY, maxR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "hsl(175, 80%, 50%)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(originX, originY, maxR, 0, Math.PI * 2);
        ctx.stroke();
        if (minR > 0) {
          ctx.beginPath();
          ctx.arc(originX, originY, minR, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Base
      ctx.fillStyle = "hsl(220, 15%, 20%)";
      ctx.fillRect(originX - 25, originY, 50, 15);
      ctx.strokeStyle = "hsl(220, 15%, 30%)";
      ctx.strokeRect(originX - 25, originY, 50, 15);

      // FK
      const p0 = { x: originX, y: originY };
      const p1 = {
        x: p0.x + link1 * Math.cos(joint1),
        y: p0.y - link1 * Math.sin(joint1),
      };
      const p2 = {
        x: p1.x + link2 * Math.cos(joint1 + joint2),
        y: p1.y - link2 * Math.sin(joint1 + joint2),
      };
      const p3 = {
        x: p2.x + link3 * Math.cos(joint1 + joint2 + joint3),
        y: p2.y - link3 * Math.sin(joint1 + joint2 + joint3),
      };

      // Links
      const drawLink = (from: { x: number; y: number }, to: { x: number; y: number }, color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      };

      drawLink(p0, p1, "hsl(175, 80%, 50%)", 8);
      drawLink(p1, p2, "hsl(150, 70%, 45%)", 7);
      drawLink(p2, p3, "hsl(210, 80%, 55%)", 6);

      // Joints
      const drawJoint = (p: { x: number; y: number }, radius: number, color: string) => {
        ctx.fillStyle = "hsl(220, 18%, 10%)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      };

      drawJoint(p0, 8, "hsl(175, 80%, 50%)");
      drawJoint(p1, 7, "hsl(150, 70%, 45%)");
      drawJoint(p2, 6, "hsl(210, 80%, 55%)");

      // End effector
      ctx.fillStyle = "hsl(40, 90%, 55%)";
      ctx.beginPath();
      ctx.arc(p3.x, p3.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "hsl(40, 90%, 55%)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(p3.x, p3.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Coordinate frames at each joint
      const drawFrame = (p: { x: number; y: number }, angle: number, size: number) => {
        ctx.lineWidth = 1.5;
        // X axis (red)
        ctx.strokeStyle = "hsl(0, 70%, 55%)";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + size * Math.cos(angle), p.y - size * Math.sin(angle));
        ctx.stroke();
        // Y axis (green)
        ctx.strokeStyle = "hsl(120, 70%, 45%)";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + size * Math.cos(angle + Math.PI / 2), p.y - size * Math.sin(angle + Math.PI / 2));
        ctx.stroke();
      };

      drawFrame(p0, joint1, 25);
      drawFrame(p1, joint1 + joint2, 22);
      drawFrame(p2, joint1 + joint2 + joint3, 20);

      // Target
      if (target && targetMode) {
        ctx.strokeStyle = "hsl(40, 90%, 55%)";
        ctx.lineWidth = 2;
        const s = 8;
        ctx.beginPath();
        ctx.moveTo(target.x - s, target.y); ctx.lineTo(target.x + s, target.y);
        ctx.moveTo(target.x, target.y - s); ctx.lineTo(target.x, target.y + s);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(target.x, target.y, s + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Info overlay
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`End Effector: (${(p3.x - originX).toFixed(1)}, ${(originY - p3.y).toFixed(1)})`, 15, 25);
      ctx.fillText(`θ₁=${(joint1 * 180 / Math.PI).toFixed(1)}° θ₂=${(joint2 * 180 / Math.PI).toFixed(1)}° θ₃=${(joint3 * 180 / Math.PI).toFixed(1)}°`, 15, 42);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [joint1, joint2, joint3, link1, link2, link3, showWorkspace, target, targetMode]);

  const controls = (
    <>
      <ControlSection title="Joint Angles">
        <SliderControl label="Joint 1 (θ₁)" value={joint1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint1} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Joint 2 (θ₂)" value={joint2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint2} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Joint 3 (θ₃)" value={joint3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint3} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Mode">
        <div className="flex gap-2">
          <button
            onClick={() => setTargetMode(!targetMode)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${
              targetMode ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            {targetMode ? "IK Mode ✓" : "Enable IK"}
          </button>
          <button
            onClick={() => setShowWorkspace(!showWorkspace)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${
              showWorkspace ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            Workspace
          </button>
        </div>
        {targetMode && (
          <p className="text-[10px] text-muted-foreground">Click and drag on the canvas to set target position</p>
        )}
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Manipulate a 3-DOF planar robotic arm. Adjust joint angles directly or enable <span className="text-primary">IK mode</span> to 
          click a target and watch the arm solve inverse kinematics. Coordinate frames show orientation at each joint.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robotic Arm Kinematics" subtitle="Forward & Inverse Kinematics" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default ArmKinematicsLab;
