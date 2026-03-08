import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { exportToCSV } from "@/components/DataExport";

interface Agent3D {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  hue: number;
}

const SwarmSimulator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const agentsRef = useRef<Agent3D[]>([]);
  const frameDataRef = useRef<{ t: number; avgSpeed: number; avgDist: number; clusterCount: number }[]>([]);
  const frameRef = useRef(0);

  const [count, setCount] = useState(120);
  const [separation, setSeparation] = useState(25);
  const [alignment, setAlignment] = useState(0.05);
  const [cohesion, setCohesion] = useState(0.005);
  const [maxSpeed, setMaxSpeed] = useState(3);
  const [perceptionRadius, setPerceptionRadius] = useState(60);
  const [showVectors, setShowVectors] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [running, setRunning] = useState(true);

  const cameraRef = useRef({ rotY: 0.4, rotX: 0.3, zoom: 1 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });

  const initAgents = useCallback((n: number) => {
    const agents: Agent3D[] = [];
    const spread = 200;
    for (let i = 0; i < n; i++) {
      agents.push({
        x: (Math.random() - 0.5) * spread, y: (Math.random() - 0.5) * spread * 0.6, z: (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 4,
        hue: 155 + Math.random() * 60,
      });
    }
    return agents;
  }, []);

  const reset = useCallback(() => { agentsRef.current = initAgents(count); frameDataRef.current = []; frameRef.current = 0; }, [count, initAgents]);
  useEffect(() => { reset(); }, [count, reset]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      const container = containerRef.current; if (!container) return;
      const dpr = window.devicePixelRatio;
      canvas.width = container.clientWidth * dpr; canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + "px"; canvas.style.height = container.clientHeight + "px";
    };
    resize(); window.addEventListener("resize", resize);

    const onMouseDown = (e: MouseEvent) => { dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      cameraRef.current.rotY += (e.clientX - dragRef.current.lastX) * 0.005;
      cameraRef.current.rotX += (e.clientY - dragRef.current.lastY) * 0.005;
      cameraRef.current.rotX = Math.max(-1.2, Math.min(1.2, cameraRef.current.rotX));
      dragRef.current.lastX = e.clientX; dragRef.current.lastY = e.clientY;
    };
    const onMouseUp = () => { dragRef.current.active = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); cameraRef.current.zoom = Math.max(0.3, Math.min(3, cameraRef.current.zoom - e.deltaY * 0.001)); };

    canvas.addEventListener("mousedown", onMouseDown); canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp); canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    if (agentsRef.current.length === 0) reset();

    const project3D = (x: number, y: number, z: number, w: number, h: number) => {
      const cam = cameraRef.current;
      const cosY = Math.cos(cam.rotY), sinY = Math.sin(cam.rotY);
      const cosX = Math.cos(cam.rotX), sinX = Math.sin(cam.rotX);
      let rx = x * cosY - z * sinY; let rz = x * sinY + z * cosY;
      let ry = y * cosX - rz * sinX; rz = y * sinX + rz * cosX;
      const fov = 400 * cam.zoom; const depth = rz + 500; const scale = fov / Math.max(depth, 1);
      return { sx: w / 2 + rx * scale, sy: h / 2 - ry * scale, scale, depth: rz };
    };

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio; const w = canvas.width / dpr; const h = canvas.height / dpr;
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, "hsl(225, 15%, 8%)"); grad.addColorStop(1, "hsl(225, 15%, 4%)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      // Grid
      const gridSize = 200; const gridLines = 20;
      ctx.strokeStyle = "hsl(225, 12%, 11%)"; ctx.lineWidth = 0.5;
      for (let i = -gridLines / 2; i <= gridLines / 2; i++) {
        const pos = (i / gridLines) * gridSize * 2;
        const p1 = project3D(pos, -100, -gridSize, w, h); const p2 = project3D(pos, -100, gridSize, w, h);
        const p3 = project3D(-gridSize, -100, pos, w, h); const p4 = project3D(gridSize, -100, pos, w, h);
        if (p1.depth > -400 && p2.depth > -400) { ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke(); }
        if (p3.depth > -400 && p4.depth > -400) { ctx.beginPath(); ctx.moveTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy); ctx.stroke(); }
      }

      const agents = agentsRef.current; const bounds = 180;
      if (running) {
        let totalSpeed = 0;
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i]; let sepX = 0, sepY = 0, sepZ = 0, aliX = 0, aliY = 0, aliZ = 0, cohX = 0, cohY = 0, cohZ = 0, neighbors = 0;
          for (let j = 0; j < agents.length; j++) {
            if (i === j) continue; const b = agents[j];
            const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < perceptionRadius && dist > 0) {
              neighbors++;
              if (dist < separation) { sepX -= dx / dist; sepY -= dy / dist; sepZ -= dz / dist; }
              aliX += b.vx; aliY += b.vy; aliZ += b.vz;
              cohX += b.x; cohY += b.y; cohZ += b.z;
            }
          }
          if (neighbors > 0) {
            aliX = aliX / neighbors - a.vx; aliY = aliY / neighbors - a.vy; aliZ = aliZ / neighbors - a.vz;
            cohX = (cohX / neighbors - a.x) * cohesion; cohY = (cohY / neighbors - a.y) * cohesion; cohZ = (cohZ / neighbors - a.z) * cohesion;
          }
          a.vx += sepX * 0.5 + aliX * alignment + cohX; a.vy += sepY * 0.5 + aliY * alignment + cohY; a.vz += sepZ * 0.5 + aliZ * alignment + cohZ;
          if (a.x > bounds - 30) a.vx -= 0.3; if (a.x < -bounds + 30) a.vx += 0.3;
          if (a.y > bounds * 0.5 - 30) a.vy -= 0.3; if (a.y < -bounds * 0.5 + 30) a.vy += 0.3;
          if (a.z > bounds - 30) a.vz -= 0.3; if (a.z < -bounds + 30) a.vz += 0.3;
          const spd = Math.sqrt(a.vx ** 2 + a.vy ** 2 + a.vz ** 2);
          if (spd > maxSpeed) { a.vx = (a.vx / spd) * maxSpeed; a.vy = (a.vy / spd) * maxSpeed; a.vz = (a.vz / spd) * maxSpeed; }
          a.x += a.vx; a.y += a.vy; a.z += a.vz;
          totalSpeed += spd;
        }
        frameRef.current++;
        if (frameRef.current % 10 === 0) {
          frameDataRef.current.push({ t: frameRef.current * 0.016, avgSpeed: totalSpeed / agents.length, avgDist: 0, clusterCount: agents.length });
          if (frameDataRef.current.length > 500) frameDataRef.current.shift();
        }
      }

      const projected = agents.map((a) => { const p = project3D(a.x, a.y, a.z, w, h); return { ...p, agent: a }; }).filter(p => p.depth > -400).sort((a, b) => a.depth - b.depth);
      for (const p of projected) {
        const a = p.agent; const size = Math.max(2, 4 * p.scale * 0.8);
        const spd = Math.sqrt(a.vx ** 2 + a.vy ** 2 + a.vz ** 2);
        const depthAlpha = Math.max(0.2, Math.min(1, 1 - p.depth / 400));
        if (showVectors) {
          const vEnd = project3D(a.x + a.vx * 8, a.y + a.vy * 8, a.z + a.vz * 8, w, h);
          ctx.strokeStyle = `hsla(${a.hue}, 80%, 60%, ${depthAlpha * 0.4})`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(vEnd.sx, vEnd.sy); ctx.stroke();
        }
        const angle2D = Math.atan2(-a.vy * p.scale, a.vx * p.scale);
        const triSize = size + spd * 0.5;
        ctx.fillStyle = `hsla(${a.hue}, 80%, ${50 + spd * 3}%, ${depthAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p.sx + Math.cos(angle2D) * triSize, p.sy + Math.sin(angle2D) * triSize);
        ctx.lineTo(p.sx + Math.cos(angle2D + 2.5) * triSize * 0.5, p.sy + Math.sin(angle2D + 2.5) * triSize * 0.5);
        ctx.lineTo(p.sx + Math.cos(angle2D - 2.5) * triSize * 0.5, p.sy + Math.sin(angle2D - 2.5) * triSize * 0.5);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = depthAlpha * 0.08; ctx.fillStyle = `hsl(${a.hue}, 80%, 55%)`;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, triSize * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "11px 'Inter'"; ctx.textAlign = "left";
      ctx.fillText(`3D Swarm · ${agents.length} agents · ${running ? "RUNNING" : "PAUSED"}`, 15, 25);
    };
    loop();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onMouseDown); canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp); canvas.removeEventListener("mouseleave", onMouseUp); canvas.removeEventListener("wheel", onWheel); };
  }, [count, separation, alignment, cohesion, maxSpeed, perceptionRadius, showVectors, showRadius, running, reset]);

  const controls = (
    <>
      <ControlSection title="Swarm Parameters">
        <SliderControl label="Agent Count" value={count} min={20} max={300} step={1} onChange={v => setCount(Math.round(v))} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Max Speed" value={maxSpeed} min={1} max={8} step={0.1} onChange={setMaxSpeed} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Perception Radius" value={perceptionRadius} min={20} max={150} step={1} onChange={v => setPerceptionRadius(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Behavior Rules">
        <SliderControl label="Separation Dist" value={separation} min={5} max={80} step={1} onChange={v => setSeparation(Math.round(v))} color="hsl(0, 65%, 52%)" />
        <SliderControl label="Alignment" value={alignment} min={0} max={0.2} step={0.005} onChange={setAlignment} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Cohesion" value={cohesion} min={0} max={0.02} step={0.001} onChange={setCohesion} color="hsl(270, 60%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowVectors(!showVectors)} className={`flex-1 sim-btn ${showVectors ? "sim-btn-active" : "sim-btn-inactive"}`}>Velocities</button>
          <button onClick={() => setShowRadius(!showRadius)} className={`flex-1 sim-btn ${showRadius ? "sim-btn-active" : "sim-btn-inactive"}`}>Radius</button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={reset} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(frameDataRef.current, "swarm_data")} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Swarm Robotics" subtitle="3D Boids Flocking" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SwarmSimulator;
