import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RobotTeleoperation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [sensorRange, setSensorRange] = useState(150);
  const [sensorRays, setSensorRays] = useState(48);
  const [showLidar, setShowLidar] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [robotSpeed, setRobotSpeed] = useState(2.5);
  const [turnSpeed, setTurnSpeed] = useState(0.04);

  const keysRef = useRef<Set<string>>(new Set());
  const stateRef = useRef({
    x: 0.15, y: 0.15, angle: 0, speed: 0, turnRate: 0,
    trail: [] as { x: number; y: number }[],
    mapPoints: [] as { x: number; y: number; age: number }[],
    collisionWarning: false,
    nearestObstDist: Infinity,
  });

  const obstaclesRef = useRef<Obstacle[]>([
    { x: 0.2, y: 0.15, w: 0.04, h: 0.3 },
    { x: 0.4, y: 0.0, w: 0.04, h: 0.25 },
    { x: 0.4, y: 0.4, w: 0.04, h: 0.2 },
    { x: 0.6, y: 0.2, w: 0.04, h: 0.35 },
    { x: 0.15, y: 0.55, w: 0.2, h: 0.04 },
    { x: 0.45, y: 0.7, w: 0.2, h: 0.04 },
    { x: 0.75, y: 0.1, w: 0.04, h: 0.4 },
    { x: 0.3, y: 0.85, w: 0.25, h: 0.04 },
    { x: 0.8, y: 0.6, w: 0.04, h: 0.3 },
    { x: 0.1, y: 0.75, w: 0.15, h: 0.04 },
    { x: 0.55, y: 0.55, w: 0.15, h: 0.04 },
    { x: 0.9, y: 0.0, w: 0.04, h: 0.5 },
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  const hitTest = useCallback((px: number, py: number, w: number, h: number) => {
    for (const obs of obstaclesRef.current) {
      if (px > obs.x * w && px < (obs.x + obs.w) * w && py > obs.y * h && py < (obs.y + obs.h) * h) return true;
    }
    return px < 5 || py < 5 || px > w - 5 || py > h - 5;
  }, []);

  const raycast = useCallback((ox: number, oy: number, angle: number, maxDist: number, w: number, h: number) => {
    const step = 2;
    for (let d = 0; d < maxDist; d += step) {
      const px = ox + Math.cos(angle) * d;
      const py = oy + Math.sin(angle) * d;
      if (hitTest(px, py, w, h)) return { x: px, y: py, dist: d, hit: true };
    }
    return { x: ox + Math.cos(angle) * maxDist, y: oy + Math.sin(angle) * maxDist, dist: maxDist, hit: false };
  }, [hitTest]);

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

    // Focus canvas for keyboard
    canvas.tabIndex = 0;
    canvas.focus();

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "hsl(220, 15%, 11%)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const s = stateRef.current;
      const keys = keysRef.current;

      // Input processing
      let accel = 0;
      let turn = 0;
      if (keys.has('w') || keys.has('arrowup')) accel += 1;
      if (keys.has('s') || keys.has('arrowdown')) accel -= 0.6;
      if (keys.has('a') || keys.has('arrowleft')) turn -= 1;
      if (keys.has('d') || keys.has('arrowright')) turn += 1;

      // Physics
      s.speed += accel * 0.15;
      s.speed *= 0.92; // friction
      s.speed = Math.max(-robotSpeed * 0.4, Math.min(robotSpeed, s.speed));
      s.turnRate = turn * turnSpeed * (0.5 + Math.abs(s.speed) * 0.3);
      s.angle += s.turnRate;

      // Move with collision check
      const rx = s.x * w;
      const ry = s.y * h;
      const nx = s.x + Math.cos(s.angle) * s.speed * 0.001;
      const ny = s.y + Math.sin(s.angle) * s.speed * 0.001;
      if (!hitTest(nx * w, ny * h, w, h)) {
        s.x = Math.max(0.02, Math.min(0.98, nx));
        s.y = Math.max(0.02, Math.min(0.98, ny));
      } else {
        s.speed *= -0.3;
        s.collisionWarning = true;
      }

      // Trail
      if (showTrail && Math.abs(s.speed) > 0.1) {
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 2000) s.trail.shift();
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
        for (let i = s.mapPoints.length - 1; i >= 0; i--) {
          s.mapPoints[i].age++;
          if (s.mapPoints[i].age > 600) { s.mapPoints.splice(i, 1); continue; }
        }
        for (const p of s.mapPoints) {
          const alpha = Math.max(0.05, 1 - p.age / 600);
          ctx.fillStyle = `hsla(150, 70%, 45%, ${alpha * 0.4})`;
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }

      // Trail
      if (showTrail && s.trail.length > 1) {
        ctx.strokeStyle = "hsla(175, 80%, 50%, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < s.trail.length; i++) {
          if (i === 0) ctx.moveTo(s.trail[i].x * w, s.trail[i].y * h);
          else ctx.lineTo(s.trail[i].x * w, s.trail[i].y * h);
        }
        ctx.stroke();
      }

      // Sensor rays
      const newRx = s.x * w;
      const newRy = s.y * h;
      let minDist = Infinity;
      if (showLidar) {
        for (let i = 0; i < sensorRays; i++) {
          const angle = s.angle + (i / sensorRays) * Math.PI * 2;
          const result = raycast(newRx, newRy, angle, sensorRange, w, h);
          if (result.dist < minDist) minDist = result.dist;
          const intensity = result.hit ? 1 - result.dist / sensorRange : 0.08;
          ctx.strokeStyle = result.hit
            ? `hsla(0, 70%, 55%, ${intensity * 0.5})`
            : `hsla(175, 80%, 50%, 0.05)`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(newRx, newRy); ctx.lineTo(result.x, result.y); ctx.stroke();
          if (result.hit) {
            ctx.fillStyle = `hsla(0, 70%, 55%, ${intensity * 0.7})`;
            ctx.beginPath(); ctx.arc(result.x, result.y, 2, 0, Math.PI * 2); ctx.fill();
            if (showMap && Math.random() < 0.15) {
              s.mapPoints.push({ x: result.x, y: result.y, age: 0 });
            }
          }
        }
      }
      s.nearestObstDist = minDist;
      s.collisionWarning = minDist < 30;

      // Robot body
      const danger = s.collisionWarning;
      ctx.fillStyle = danger ? "hsl(0, 70%, 55%)" : "hsl(175, 80%, 50%)";
      ctx.beginPath(); ctx.arc(newRx, newRy, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.beginPath(); ctx.arc(newRx, newRy, 8, 0, Math.PI * 2); ctx.fill();
      // Direction
      ctx.strokeStyle = danger ? "hsl(0, 70%, 55%)" : "hsl(175, 80%, 50%)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(newRx, newRy);
      ctx.lineTo(newRx + Math.cos(s.angle) * 22, newRy + Math.sin(s.angle) * 22);
      ctx.stroke();

      // Collision warning flash
      if (danger) {
        ctx.globalAlpha = 0.08 + Math.sin(Date.now() * 0.01) * 0.04;
        ctx.fillStyle = "hsl(0, 70%, 55%)";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // === HUD ===
      // Speed gauge (bottom left)
      const gaugeX = 15, gaugeY = h - 70, gaugeW = 120, gaugeH = 55;
      ctx.fillStyle = "hsla(220, 18%, 8%, 0.9)";
      ctx.strokeStyle = "hsla(220, 15%, 20%, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "8px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText("SPEED", gaugeX + 8, gaugeY + 14);
      const speedNorm = Math.abs(s.speed) / robotSpeed;
      ctx.fillStyle = speedNorm > 0.8 ? "hsl(40, 90%, 55%)" : "hsl(175, 80%, 50%)";
      ctx.fillRect(gaugeX + 8, gaugeY + 20, (gaugeW - 16) * speedNorm, 8);
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.fillText("HEADING", gaugeX + 8, gaugeY + 40);
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.fillText(`${((s.angle * 180 / Math.PI) % 360).toFixed(0)}°`, gaugeX + 60, gaugeY + 40);
      ctx.fillText(`${(s.speed * 100).toFixed(0)} u/s`, gaugeX + 60, gaugeY + 14);

      // Proximity gauge (bottom center-left)
      const proxX = 150, proxY = h - 70, proxW = 110, proxH = 55;
      ctx.fillStyle = "hsla(220, 18%, 8%, 0.9)";
      ctx.strokeStyle = danger ? "hsla(0, 70%, 55%, 0.5)" : "hsla(220, 15%, 20%, 0.5)";
      ctx.beginPath(); ctx.roundRect(proxX, proxY, proxW, proxH, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = danger ? "hsl(0, 70%, 55%)" : "hsl(215, 15%, 50%)";
      ctx.font = "8px 'JetBrains Mono'";
      ctx.fillText(danger ? "⚠ PROXIMITY" : "CLEARANCE", proxX + 8, proxY + 14);
      ctx.fillStyle = danger ? "hsl(0, 70%, 55%)" : "hsl(150, 70%, 50%)";
      ctx.font = "16px 'JetBrains Mono'";
      ctx.fillText(`${minDist.toFixed(0)}px`, proxX + 8, proxY + 38);

      // Controls hint (top right)
      ctx.fillStyle = "hsla(220, 18%, 8%, 0.85)";
      ctx.strokeStyle = "hsla(220, 15%, 20%, 0.4)";
      ctx.lineWidth = 1;
      const hintW = 100, hintH = 65, hintX = w - hintW - 12, hintY = 35;
      ctx.beginPath(); ctx.roundRect(hintX, hintY, hintW, hintH, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "8px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.fillText("CONTROLS", hintX + hintW / 2, hintY + 13);
      const keySize = 16;
      const drawKey = (label: string, kx: number, ky: number, active: boolean) => {
        ctx.fillStyle = active ? "hsla(175, 80%, 50%, 0.3)" : "hsla(220, 15%, 18%, 0.8)";
        ctx.strokeStyle = active ? "hsl(175, 80%, 50%)" : "hsla(220, 15%, 30%, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(kx, ky, keySize, keySize, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = active ? "hsl(175, 80%, 50%)" : "hsl(215, 15%, 50%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.fillText(label, kx + keySize / 2, ky + keySize / 2 + 3);
      };
      const kCenterX = hintX + hintW / 2;
      const kCenterY = hintY + 35;
      drawKey("W", kCenterX - keySize / 2, kCenterY - keySize - 2, keys.has('w') || keys.has('arrowup'));
      drawKey("A", kCenterX - keySize - keySize / 2 - 2, kCenterY, keys.has('a') || keys.has('arrowleft'));
      drawKey("S", kCenterX - keySize / 2, kCenterY, keys.has('s') || keys.has('arrowdown'));
      drawKey("D", kCenterX + keySize / 2 + 2, kCenterY, keys.has('d') || keys.has('arrowright'));

      // Minimap (top right below controls)
      if (showMinimap) {
        const mmSize = 90;
        const mmX = w - mmSize - 12;
        const mmY = hintY + hintH + 8;
        ctx.fillStyle = "hsla(220, 18%, 6%, 0.9)";
        ctx.strokeStyle = "hsla(220, 15%, 20%, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 4); ctx.fill(); ctx.stroke();
        // Obstacles on minimap
        for (const obs of obstaclesRef.current) {
          ctx.fillStyle = "hsl(220, 15%, 30%)";
          ctx.fillRect(mmX + obs.x * mmSize, mmY + obs.y * mmSize, obs.w * mmSize, obs.h * mmSize);
        }
        // Robot on minimap
        ctx.fillStyle = "hsl(175, 80%, 50%)";
        ctx.beginPath();
        ctx.arc(mmX + s.x * mmSize, mmY + s.y * mmSize, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // FOV on minimap
        ctx.strokeStyle = "hsla(175, 80%, 50%, 0.3)";
        ctx.lineWidth = 0.5;
        const fovLen = (sensorRange / Math.max(w, h)) * mmSize;
        ctx.beginPath();
        ctx.moveTo(mmX + s.x * mmSize, mmY + s.y * mmSize);
        ctx.lineTo(mmX + s.x * mmSize + Math.cos(s.angle - 0.5) * fovLen, mmY + s.y * mmSize + Math.sin(s.angle - 0.5) * fovLen);
        ctx.moveTo(mmX + s.x * mmSize, mmY + s.y * mmSize);
        ctx.lineTo(mmX + s.x * mmSize + Math.cos(s.angle + 0.5) * fovLen, mmY + s.y * mmSize + Math.sin(s.angle + 0.5) * fovLen);
        ctx.stroke();
        ctx.fillStyle = "hsl(215, 15%, 40%)";
        ctx.font = "7px 'JetBrains Mono'";
        ctx.textAlign = "left";
        ctx.fillText("MAP", mmX + 4, mmY + 10);
      }

      // Main HUD
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Teleoperation | Map: ${s.mapPoints.length} pts | Trail: ${s.trail.length}`, 15, 20);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [sensorRange, sensorRays, showLidar, showTrail, showMap, showMinimap, robotSpeed, turnSpeed, hitTest, raycast]);

  const reset = useCallback(() => {
    stateRef.current = {
      x: 0.15, y: 0.15, angle: 0, speed: 0, turnRate: 0,
      trail: [], mapPoints: [], collisionWarning: false, nearestObstDist: Infinity,
    };
  }, []);

  const controls = (
    <>
      <ControlSection title="Robot">
        <SliderControl label="Max Speed" value={robotSpeed} min={1} max={6} step={0.1} onChange={setRobotSpeed} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Turn Speed" value={turnSpeed} min={0.01} max={0.1} step={0.005} onChange={setTurnSpeed} color="hsl(40, 90%, 55%)" />
      </ControlSection>
      <ControlSection title="Sensors">
        <SliderControl label="Range" value={sensorRange} min={50} max={300} step={5} onChange={v => setSensorRange(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Rays" value={sensorRays} min={12} max={96} step={1} onChange={v => setSensorRays(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "Lidar", a: showLidar, t: () => setShowLidar(!showLidar) },
            { l: "Trail", a: showTrail, t: () => setShowTrail(!showTrail) },
            { l: "Map", a: showMap, t: () => setShowMap(!showMap) },
            { l: "Minimap", a: showMinimap, t: () => setShowMinimap(!showMinimap) },
          ].map(b => (
            <button key={b.l} onClick={b.t}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.a ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {b.l}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <button onClick={reset} className="w-full text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">↺ Reset Position</button>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Use <span className="text-primary font-semibold">W/A/S/D</span> or arrow keys to drive the robot. 
          The robot has simulated lidar sensors that build an occupancy map in real time. 
          A <span style={{ color: 'hsl(0, 70%, 55%)' }}>red flash</span> warns of proximity to obstacles. 
          Click the simulation canvas first to capture keyboard input.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robot Teleoperation" subtitle="WASD Keyboard Control with Sensor Feedback" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0 outline-none" tabIndex={0} />
      </div>
    </SimLayout>
  );
};

export default RobotTeleoperation;
