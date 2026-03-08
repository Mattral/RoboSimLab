import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Particle {
  x: number;
  y: number;
  age: number;
}

const AutonomousNavigation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [running, setRunning] = useState(true);
  const [robotSpeed, setRobotSpeed] = useState(1.5);
  const [sensorRange, setSensorRange] = useState(120);
  const [sensorRays, setSensorRays] = useState(32);
  const [showTrail, setShowTrail] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showSensors, setShowSensors] = useState(true);

  const stateRef = useRef({
    x: 0.15, y: 0.15, angle: 0,
    targetIdx: 0,
    trail: [] as { x: number; y: number }[],
    mapPoints: [] as Particle[],
  });

  const obstaclesRef = useRef([
    { x: 0.3, y: 0.3, w: 0.08, h: 0.25 },
    { x: 0.55, y: 0.15, w: 0.2, h: 0.06 },
    { x: 0.7, y: 0.4, w: 0.06, h: 0.3 },
    { x: 0.2, y: 0.65, w: 0.15, h: 0.06 },
    { x: 0.45, y: 0.55, w: 0.06, h: 0.2 },
    { x: 0.8, y: 0.75, w: 0.12, h: 0.06 },
    { x: 0.15, y: 0.85, w: 0.06, h: 0.1 },
    { x: 0.6, y: 0.8, w: 0.06, h: 0.15 },
  ]);

  const waypointsRef = useRef([
    { x: 0.15, y: 0.15 }, { x: 0.15, y: 0.5 }, { x: 0.45, y: 0.45 },
    { x: 0.85, y: 0.2 }, { x: 0.85, y: 0.6 }, { x: 0.5, y: 0.9 },
    { x: 0.15, y: 0.9 }, { x: 0.15, y: 0.15 },
  ]);

  const reset = useCallback(() => {
    stateRef.current = { x: 0.15, y: 0.15, angle: 0, targetIdx: 0, trail: [], mapPoints: [] };
  }, []);

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

    const hitTest = (px: number, py: number, w: number, h: number) => {
      for (const obs of obstaclesRef.current) {
        if (px > obs.x * w && px < (obs.x + obs.w) * w && py > obs.y * h && py < (obs.y + obs.h) * h) return true;
      }
      return px < 0 || py < 0 || px > w || py > h;
    };

    const raycast = (ox: number, oy: number, angle: number, maxDist: number, w: number, h: number) => {
      const step = 2;
      for (let d = 0; d < maxDist; d += step) {
        const px = ox + Math.cos(angle) * d;
        const py = oy + Math.sin(angle) * d;
        if (hitTest(px, py, w, h)) return { x: px, y: py, dist: d, hit: true };
      }
      return { x: ox + Math.cos(angle) * maxDist, y: oy + Math.sin(angle) * maxDist, dist: maxDist, hit: false };
    };

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

      const s = stateRef.current;
      const waypoints = waypointsRef.current;
      const rx = s.x * w, ry = s.y * h;

      if (running) {
        // Navigate to waypoint
        const target = waypoints[s.targetIdx];
        const dx = target.x - s.x;
        const dy = target.y - s.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        const desiredAngle = Math.atan2(dy, dx);

        // Obstacle avoidance using sensor readings
        let avoidX = 0, avoidY = 0;
        for (let i = 0; i < 8; i++) {
          const angle = s.angle + (i / 8) * Math.PI * 2;
          const result = raycast(rx, ry, angle, sensorRange * 0.6, w, h);
          if (result.hit && result.dist < sensorRange * 0.4) {
            const repulsion = 1 - result.dist / (sensorRange * 0.4);
            avoidX -= Math.cos(angle) * repulsion * 0.03;
            avoidY -= Math.sin(angle) * repulsion * 0.03;
          }
        }

        // Blend desired direction with avoidance
        let moveAngle = desiredAngle;
        if (Math.abs(avoidX) > 0.001 || Math.abs(avoidY) > 0.001) {
          const avoidAngle = Math.atan2(avoidY, avoidX);
          moveAngle = avoidAngle * 0.6 + desiredAngle * 0.4;
        }

        // Smooth turning
        let angleDiff = moveAngle - s.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        s.angle += angleDiff * 0.08;

        // Move
        const moveSpeed = robotSpeed * 0.001;
        const nx = s.x + Math.cos(s.angle) * moveSpeed;
        const ny = s.y + Math.sin(s.angle) * moveSpeed;
        if (!hitTest(nx * w, ny * h, w, h)) {
          s.x = nx; s.y = ny;
        } else {
          s.angle += 0.3; // turn when stuck
        }

        // Trail
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 1000) s.trail.shift();

        // Check waypoint reached
        if (distToTarget < 0.03) {
          s.targetIdx = (s.targetIdx + 1) % waypoints.length;
        }

        // Map building
        if (showMap) {
          for (let i = 0; i < sensorRays; i++) {
            const angle = s.angle + (i / sensorRays) * Math.PI * 2;
            const result = raycast(rx, ry, angle, sensorRange, w, h);
            if (result.hit && Math.random() < 0.15) {
              s.mapPoints.push({ x: result.x, y: result.y, age: 0 });
            }
          }
          for (let i = s.mapPoints.length - 1; i >= 0; i--) {
            s.mapPoints[i].age++;
            if (s.mapPoints[i].age > 500) s.mapPoints.splice(i, 1);
          }
        }
      }

      // Draw obstacles
      for (const obs of obstaclesRef.current) {
        ctx.fillStyle = "hsl(220, 15%, 22%)";
        ctx.fillRect(obs.x * w, obs.y * h, obs.w * w, obs.h * h);
        ctx.strokeStyle = "hsl(220, 15%, 30%)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x * w, obs.y * h, obs.w * w, obs.h * h);
      }

      // Map points
      if (showMap) {
        for (const p of s.mapPoints) {
          const alpha = Math.max(0.05, 1 - p.age / 500);
          ctx.fillStyle = `hsla(150, 70%, 45%, ${alpha * 0.5})`;
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }

      // Trail
      if (showTrail && s.trail.length > 1) {
        ctx.strokeStyle = "hsla(175, 80%, 50%, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < s.trail.length; i++) {
          const tx = s.trail[i].x * w, ty = s.trail[i].y * h;
          if (i === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      }

      // Waypoints
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const isTarget = i === s.targetIdx;
        ctx.fillStyle = isTarget ? "hsl(40, 90%, 55%)" : "hsla(40, 90%, 55%, 0.3)";
        ctx.beginPath();
        ctx.arc(wp.x * w, wp.y * h, isTarget ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        if (isTarget) {
          ctx.strokeStyle = "hsl(40, 90%, 55%)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(wp.x * w, wp.y * h, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, wp.x * w, wp.y * h + 3);
      }

      // Sensor rays
      if (showSensors) {
        for (let i = 0; i < sensorRays; i++) {
          const angle = s.angle + (i / sensorRays) * Math.PI * 2;
          const result = raycast(rx, ry, angle, sensorRange, w, h);
          ctx.strokeStyle = result.hit ? `hsla(0, 70%, 55%, ${0.3 * (1 - result.dist / sensorRange)})` : "hsla(175, 80%, 50%, 0.05)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(result.x, result.y);
          ctx.stroke();
          if (result.hit) {
            ctx.fillStyle = `hsla(0, 70%, 55%, ${0.6 * (1 - result.dist / sensorRange)})`;
            ctx.beginPath();
            ctx.arc(result.x, result.y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Robot
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.beginPath(); ctx.arc(rx, ry, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsl(175, 80%, 50%)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(s.angle) * 18, ry + Math.sin(s.angle) * 18);
      ctx.stroke();

      // Info
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Waypoint ${s.targetIdx + 1}/${waypoints.length} | Map: ${s.mapPoints.length} pts`, 15, 20);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, robotSpeed, sensorRange, sensorRays, showTrail, showMap, showSensors]);

  const controls = (
    <>
      <ControlSection title="Robot">
        <SliderControl label="Speed" value={robotSpeed} min={0.5} max={5} step={0.1} onChange={setRobotSpeed} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Sensor Range" value={sensorRange} min={40} max={250} step={5} onChange={v => setSensorRange(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Sensor Rays" value={sensorRays} min={8} max={64} step={1} onChange={v => setSensorRays(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Trail", a: showTrail, t: () => setShowTrail(!showTrail) },
            { l: "Map", a: showMap, t: () => setShowMap(!showMap) },
            { l: "Sensors", a: showSensors, t: () => setShowSensors(!showSensors) },
          ].map(b => (
            <button key={b.l} onClick={b.t}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.a ? "border-primary text-primary" : "border-border text-foreground"}`}>
              {b.l}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={reset} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">↺ Reset</button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          A robot autonomously navigates through <span className="text-amber-glow">waypoints</span> while avoiding obstacles using sensor-based 
          reactive control. The <span className="text-green-glow">green map</span> accumulates sensor data (SLAM-style), the 
          <span className="text-primary"> cyan trail</span> shows the path taken. Obstacles trigger local avoidance behavior.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Autonomous Navigation" subtitle="Waypoint Following & SLAM" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default AutonomousNavigation;
