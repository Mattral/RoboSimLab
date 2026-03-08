import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

const SensorPerceptionLab = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [robotX, setRobotX] = useState(0.5);
  const [robotY, setRobotY] = useState(0.5);
  const [robotAngle, setRobotAngle] = useState(0);
  const [lidarRays, setLidarRays] = useState(64);
  const [lidarRange, setLidarRange] = useState(200);
  const [fovAngle, setFovAngle] = useState(90);
  const [showLidar, setShowLidar] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [running, setRunning] = useState(true);
  const dragRef = useRef(false);

  const obstaclesRef = useRef<Obstacle[]>([
    { x: 0.25, y: 0.3, radius: 30 },
    { x: 0.7, y: 0.25, radius: 45 },
    { x: 0.35, y: 0.7, radius: 25 },
    { x: 0.8, y: 0.65, radius: 35 },
    { x: 0.15, y: 0.55, radius: 20 },
    { x: 0.6, y: 0.5, radius: 40 },
    { x: 0.5, y: 0.85, radius: 30 },
    { x: 0.9, y: 0.4, radius: 22 },
  ]);

  // Map accumulator
  const mapPointsRef = useRef<{ x: number; y: number; age: number }[]>([]);

  const raycast = useCallback((ox: number, oy: number, angle: number, maxDist: number, obstacles: Obstacle[], w: number, h: number) => {
    const step = 2;
    for (let d = 0; d < maxDist; d += step) {
      const px = ox + Math.cos(angle) * d;
      const py = oy + Math.sin(angle) * d;
      // Wall check
      if (px < 0 || px > w || py < 0 || py > h) return { x: px, y: py, dist: d, hit: true };
      // Obstacle check
      for (const obs of obstacles) {
        const dx = px - obs.x * w;
        const dy = py - obs.y * h;
        if (dx * dx + dy * dy < obs.radius * obs.radius) return { x: px, y: py, dist: d, hit: true };
      }
    }
    return { x: ox + Math.cos(angle) * maxDist, y: oy + Math.sin(angle) * maxDist, dist: maxDist, hit: false };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let autoAngle = robotAngle;

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

    // Mouse drag for robot position
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.type === "mousedown") dragRef.current = true;
      if (e.type === "mouseup" || e.type === "mouseleave") dragRef.current = false;
      if (dragRef.current) {
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        setRobotX(Math.max(0.05, Math.min(0.95, nx)));
        setRobotY(Math.max(0.05, Math.min(0.95, ny)));
      }
    };
    canvas.addEventListener("mousedown", handleMouse);
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseup", handleMouse);
    canvas.addEventListener("mouseleave", handleMouse);

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

      if (running) {
        autoAngle += 0.008;
        setRobotAngle(autoAngle);
      }

      const rx = robotX * w;
      const ry = robotY * h;
      const obstacles = obstaclesRef.current;

      // Draw obstacles
      for (const obs of obstacles) {
        ctx.fillStyle = "hsl(220, 15%, 22%)";
        ctx.beginPath();
        ctx.arc(obs.x * w, obs.y * h, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "hsl(220, 15%, 30%)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Accumulated map points
      if (showMap) {
        const points = mapPointsRef.current;
        // Age out old points
        for (let i = points.length - 1; i >= 0; i--) {
          points[i].age++;
          if (points[i].age > 300) points.splice(i, 1);
        }
        for (const p of points) {
          const alpha = Math.max(0.05, 1 - p.age / 300);
          ctx.fillStyle = `hsla(150, 70%, 45%, ${alpha * 0.4})`;
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }

      // Lidar
      if (showLidar) {
        const angleStep = (Math.PI * 2) / lidarRays;
        for (let i = 0; i < lidarRays; i++) {
          const angle = robotAngle + i * angleStep;
          const result = raycast(rx, ry, angle, lidarRange, obstacles, w, h);

          // Ray line
          const intensity = result.hit ? 1 - result.dist / lidarRange : 0.15;
          ctx.strokeStyle = result.hit
            ? `hsla(0, 70%, 55%, ${intensity * 0.6})`
            : `hsla(175, 80%, 50%, 0.1)`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(result.x, result.y);
          ctx.stroke();

          // Hit point
          if (result.hit) {
            ctx.fillStyle = `hsla(0, 70%, 55%, ${intensity})`;
            ctx.beginPath();
            ctx.arc(result.x, result.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Add to map
            if (showMap && running && Math.random() < 0.3) {
              mapPointsRef.current.push({ x: result.x, y: result.y, age: 0 });
            }
          }
        }
      }

      // Camera FOV cone
      if (showCamera) {
        const fovRad = (fovAngle * Math.PI) / 180;
        const camRange = lidarRange * 1.2;
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "hsl(210, 80%, 55%)";
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, camRange, robotAngle - fovRad / 2, robotAngle + fovRad / 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "hsl(210, 80%, 55%)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(robotAngle - fovRad / 2) * camRange, ry + Math.sin(robotAngle - fovRad / 2) * camRange);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(robotAngle + fovRad / 2) * camRange, ry + Math.sin(robotAngle + fovRad / 2) * camRange);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Robot body
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.beginPath();
      ctx.arc(rx, ry, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.beginPath();
      ctx.arc(rx, ry, 8, 0, Math.PI * 2);
      ctx.fill();
      // Direction indicator
      ctx.strokeStyle = "hsl(175, 80%, 50%)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(robotAngle) * 20, ry + Math.sin(robotAngle) * 20);
      ctx.stroke();

      // Depth bar visualization (bottom)
      if (showLidar) {
        const barH = 40;
        const barY = h - barH - 10;
        const barW = w * 0.6;
        const barX = (w - barW) / 2;
        ctx.fillStyle = "hsla(220, 18%, 10%, 0.85)";
        ctx.fillRect(barX - 5, barY - 15, barW + 10, barH + 25);
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.fillText("DEPTH PROFILE", w / 2, barY - 3);

        const frontRays = Math.min(lidarRays, 120);
        const stepW = barW / frontRays;
        for (let i = 0; i < frontRays; i++) {
          const angle = robotAngle - Math.PI / 3 + (i / frontRays) * (Math.PI * 2 / 3);
          const result = raycast(rx, ry, angle, lidarRange, obstacles, w, h);
          const norm = result.dist / lidarRange;
          const bh = norm * barH;
          const hue = result.hit ? 0 + norm * 175 : 175;
          ctx.fillStyle = `hsl(${hue}, 70%, ${30 + norm * 30}%)`;
          ctx.fillRect(barX + i * stepW, barY + barH - bh, stepW - 0.5, bh);
        }
      }

      // Info
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Lidar: ${lidarRays} rays @ ${lidarRange}px | FOV: ${fovAngle}°`, 15, 20);
      ctx.fillText(`Robot: (${(robotX * 100).toFixed(0)}%, ${(robotY * 100).toFixed(0)}%) θ=${(robotAngle * 180 / Math.PI % 360).toFixed(0)}°`, 15, 37);
      if (showMap) ctx.fillText(`Map points: ${mapPointsRef.current.length}`, 15, 54);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouse);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseup", handleMouse);
      canvas.removeEventListener("mouseleave", handleMouse);
    };
  }, [robotX, robotY, robotAngle, lidarRays, lidarRange, fovAngle, showLidar, showCamera, showMap, running, raycast]);

  const controls = (
    <>
      <ControlSection title="Lidar">
        <SliderControl label="Ray Count" value={lidarRays} min={8} max={180} step={1} onChange={v => setLidarRays(Math.round(v))} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Range (px)" value={lidarRange} min={50} max={400} step={5} onChange={v => setLidarRange(Math.round(v))} color="hsl(0, 70%, 55%)" />
      </ControlSection>
      <ControlSection title="Camera">
        <SliderControl label="Field of View" value={fovAngle} min={20} max={170} step={1} unit="°" onChange={v => setFovAngle(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Lidar", active: showLidar, toggle: () => setShowLidar(!showLidar) },
            { label: "Camera", active: showCamera, toggle: () => setShowCamera(!showCamera) },
            { label: "Map", active: showMap, toggle: () => setShowMap(!showMap) },
          ].map(b => (
            <button key={b.label} onClick={b.toggle}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.active ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            {running ? "⏸ Pause Rotation" : "▶ Resume"}
          </button>
          <button onClick={() => { mapPointsRef.current = []; }}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            Clear Map
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary">Click & drag</span> to move the robot. <span className="text-red-glow">Red rays</span> show lidar 
          hits, <span className="text-blue-glow">blue cone</span> is the camera FOV. The <span className="text-green-glow">green map</span> accumulates 
          detected obstacle points over time, simulating SLAM-style mapping.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Sensor & Perception Lab" subtitle="Lidar, Depth Sensing, Environment Mapping" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SensorPerceptionLab;
