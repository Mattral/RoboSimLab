import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface SensorHit {
  x: number;
  y: number;
  dist: number;
  hit: boolean;
  type: 'lidar' | 'camera' | 'imu';
}

interface FusedPoint {
  x: number;
  y: number;
  confidence: number;
  source: 'lidar' | 'camera' | 'fused';
  age: number;
}

const SensorFusionLab = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [robotX, setRobotX] = useState(0.5);
  const [robotY, setRobotY] = useState(0.5);
  const [robotAngle, setRobotAngle] = useState(0);
  const [lidarRays, setLidarRays] = useState(64);
  const [lidarRange, setLidarRange] = useState(180);
  const [cameraFOV, setCameraFOV] = useState(90);
  const [cameraRange, setCameraRange] = useState(220);
  const [imuNoise, setImuNoise] = useState(0.02);
  const [fusionAlpha, setFusionAlpha] = useState(0.7);
  const [showLidar, setShowLidar] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const [showIMU, setShowIMU] = useState(true);
  const [showFused, setShowFused] = useState(true);
  const [showConfidence, setShowConfidence] = useState(false);
  const [running, setRunning] = useState(true);

  const dragRef = useRef(false);
  const fusedMapRef = useRef<FusedPoint[]>([]);
  const imuEstRef = useRef({ x: 0.5, y: 0.5, angle: 0, vx: 0, vy: 0 });
  const prevPosRef = useRef({ x: 0.5, y: 0.5 });

  const obstaclesRef = useRef([
    { x: 0.2, y: 0.2, radius: 35 },
    { x: 0.75, y: 0.2, radius: 40 },
    { x: 0.3, y: 0.65, radius: 30 },
    { x: 0.8, y: 0.6, radius: 45 },
    { x: 0.5, y: 0.4, radius: 25 },
    { x: 0.15, y: 0.8, radius: 20 },
    { x: 0.65, y: 0.85, radius: 35 },
    { x: 0.9, y: 0.35, radius: 22 },
  ]);

  const raycast = useCallback((ox: number, oy: number, angle: number, maxDist: number, w: number, h: number) => {
    const step = 2;
    for (let d = 0; d < maxDist; d += step) {
      const px = ox + Math.cos(angle) * d;
      const py = oy + Math.sin(angle) * d;
      if (px < 0 || px > w || py < 0 || py > h) return { x: px, y: py, dist: d, hit: true };
      for (const obs of obstaclesRef.current) {
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

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.type === "mousedown") dragRef.current = true;
      if (e.type === "mouseup" || e.type === "mouseleave") dragRef.current = false;
      if (dragRef.current) {
        setRobotX(Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width)));
        setRobotY(Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height)));
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

      // Background grid
      ctx.strokeStyle = "hsl(220, 15%, 11%)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      if (running) {
        autoAngle += 0.006;
        setRobotAngle(autoAngle);
      }

      const rx = robotX * w;
      const ry = robotY * h;

      // IMU estimation (dead reckoning with drift)
      const imu = imuEstRef.current;
      const dx = robotX - prevPosRef.current.x;
      const dy = robotY - prevPosRef.current.y;
      imu.vx = dx + (Math.random() - 0.5) * imuNoise;
      imu.vy = dy + (Math.random() - 0.5) * imuNoise;
      imu.x += imu.vx;
      imu.y += imu.vy;
      imu.angle = autoAngle + (Math.random() - 0.5) * imuNoise * 2;
      // Complementary filter fusion with actual position
      imu.x = imu.x * (1 - fusionAlpha * 0.1) + robotX * (fusionAlpha * 0.1);
      imu.y = imu.y * (1 - fusionAlpha * 0.1) + robotY * (fusionAlpha * 0.1);
      prevPosRef.current = { x: robotX, y: robotY };

      // Draw obstacles
      for (const obs of obstaclesRef.current) {
        ctx.fillStyle = "hsl(220, 15%, 20%)";
        ctx.beginPath();
        ctx.arc(obs.x * w, obs.y * h, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "hsl(220, 15%, 28%)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Fused map
      if (showFused) {
        const points = fusedMapRef.current;
        for (let i = points.length - 1; i >= 0; i--) {
          points[i].age++;
          if (points[i].age > 400) { points.splice(i, 1); continue; }
        }
        for (const p of points) {
          const alpha = Math.max(0.05, 1 - p.age / 400);
          if (showConfidence) {
            const hue = p.confidence > 0.7 ? 150 : p.confidence > 0.4 ? 45 : 0;
            ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha * 0.6})`;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
          } else {
            const color = p.source === 'lidar' ? '0, 70%, 55%' : p.source === 'camera' ? '210, 80%, 55%' : '150, 70%, 50%';
            ctx.fillStyle = `hsla(${color}, ${alpha * 0.5})`;
            ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
          }
        }
      }

      // Lidar
      if (showLidar) {
        const angleStep = (Math.PI * 2) / lidarRays;
        for (let i = 0; i < lidarRays; i++) {
          const angle = autoAngle + i * angleStep;
          const result = raycast(rx, ry, angle, lidarRange, w, h);
          const intensity = result.hit ? 1 - result.dist / lidarRange : 0.1;
          ctx.strokeStyle = result.hit ? `hsla(0, 70%, 55%, ${intensity * 0.5})` : `hsla(175, 80%, 50%, 0.06)`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(result.x, result.y); ctx.stroke();
          if (result.hit) {
            ctx.fillStyle = `hsla(0, 70%, 55%, ${intensity * 0.8})`;
            ctx.beginPath(); ctx.arc(result.x, result.y, 2, 0, Math.PI * 2); ctx.fill();
            if (showFused && running && Math.random() < 0.2) {
              fusedMapRef.current.push({ x: result.x, y: result.y, confidence: 0.9, source: 'lidar', age: 0 });
            }
          }
        }
      }

      // Camera FOV with "detections"
      if (showCamera) {
        const fovRad = (cameraFOV * Math.PI) / 180;
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "hsl(210, 80%, 55%)";
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.arc(rx, ry, cameraRange, autoAngle - fovRad / 2, autoAngle + fovRad / 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "hsla(210, 80%, 55%, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(autoAngle - fovRad / 2) * cameraRange, ry + Math.sin(autoAngle - fovRad / 2) * cameraRange);
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(autoAngle + fovRad / 2) * cameraRange, ry + Math.sin(autoAngle + fovRad / 2) * cameraRange);
        ctx.stroke();
        ctx.setLineDash([]);

        // Camera object detection (bounding boxes)
        for (const obs of obstaclesRef.current) {
          const ox = obs.x * w, oy = obs.y * h;
          const toObs = Math.atan2(oy - ry, ox - rx);
          let angleDiff = toObs - autoAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          const dist = Math.sqrt((ox - rx) ** 2 + (oy - ry) ** 2);
          if (Math.abs(angleDiff) < fovRad / 2 && dist < cameraRange) {
            const r = obs.radius;
            ctx.strokeStyle = "hsla(210, 80%, 55%, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(ox - r, oy - r, r * 2, r * 2);
            ctx.fillStyle = "hsla(210, 80%, 55%, 0.8)";
            ctx.font = "8px 'JetBrains Mono'";
            ctx.textAlign = "center";
            ctx.fillText(`OBJ ${dist.toFixed(0)}px`, ox, oy - r - 4);
            if (showFused && running && Math.random() < 0.1) {
              fusedMapRef.current.push({ x: ox + (Math.random() - 0.5) * 8, y: oy + (Math.random() - 0.5) * 8, confidence: 0.7, source: 'camera', age: 0 });
            }
          }
        }
      }

      // IMU estimate visualization
      if (showIMU) {
        const ix = imu.x * w, iy = imu.y * h;
        // IMU estimated position (drifted)
        ctx.strokeStyle = "hsla(40, 90%, 55%, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(ix, iy, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Drift line
        ctx.strokeStyle = "hsla(40, 90%, 55%, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ix, iy); ctx.stroke();
        // Velocity arrow
        ctx.strokeStyle = "hsla(40, 90%, 55%, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix + imu.vx * w * 15, iy + imu.vy * h * 15);
        ctx.stroke();
        // IMU heading
        ctx.strokeStyle = "hsla(40, 90%, 55%, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix + Math.cos(imu.angle) * 25, iy + Math.sin(imu.angle) * 25);
        ctx.stroke();
      }

      // Robot body
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.beginPath(); ctx.arc(rx, ry, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsl(175, 80%, 50%)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(autoAngle) * 20, ry + Math.sin(autoAngle) * 20);
      ctx.stroke();

      // === Sensor panels (bottom) ===
      const panelH = 55;
      const panelW = w * 0.22;
      const panelY = h - panelH - 12;
      const panels = [
        { label: 'LIDAR DEPTH', color: '0, 70%, 55%', active: showLidar },
        { label: 'CAMERA RGB', color: '210, 80%, 55%', active: showCamera },
        { label: 'IMU ACCEL', color: '40, 90%, 55%', active: showIMU },
        { label: 'FUSED MAP', color: '150, 70%, 50%', active: showFused },
      ];

      panels.forEach((panel, idx) => {
        const px = 10 + idx * (panelW + 6);
        ctx.fillStyle = "hsla(220, 18%, 8%, 0.9)";
        ctx.strokeStyle = panel.active ? `hsla(${panel.color}, 0.4)` : "hsla(220, 15%, 20%, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px, panelY, panelW, panelH, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = `hsla(${panel.color}, 0.9)`;
        ctx.font = "8px 'JetBrains Mono'";
        ctx.textAlign = "left";
        ctx.fillText(panel.label, px + 6, panelY + 13);

        // Mini visualization per panel
        if (idx === 0 && showLidar) {
          // Depth bars
          const barsCount = 20;
          for (let i = 0; i < barsCount; i++) {
            const angle = autoAngle - Math.PI / 4 + (i / barsCount) * (Math.PI / 2);
            const result = raycast(rx, ry, angle, lidarRange, w, h);
            const norm = result.dist / lidarRange;
            const bh = norm * 28;
            ctx.fillStyle = `hsla(${result.hit ? 0 + norm * 175 : 175}, 70%, 50%, 0.7)`;
            ctx.fillRect(px + 6 + i * ((panelW - 12) / barsCount), panelY + panelH - 8 - bh, (panelW - 12) / barsCount - 1, bh);
          }
        } else if (idx === 1 && showCamera) {
          // Simulated camera feed (gradient)
          const grad = ctx.createLinearGradient(px + 6, panelY + 18, px + panelW - 6, panelY + panelH - 8);
          grad.addColorStop(0, "hsla(210, 40%, 20%, 0.6)");
          grad.addColorStop(0.5, "hsla(210, 40%, 35%, 0.6)");
          grad.addColorStop(1, "hsla(210, 40%, 15%, 0.6)");
          ctx.fillStyle = grad;
          ctx.fillRect(px + 6, panelY + 18, panelW - 12, panelH - 28);
          // Object markers
          let objCount = 0;
          for (const obs of obstaclesRef.current) {
            const toObs = Math.atan2(obs.y * h - ry, obs.x * w - rx);
            let ad = toObs - autoAngle; while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
            if (Math.abs(ad) < (cameraFOV * Math.PI / 360)) objCount++;
          }
          ctx.fillStyle = "hsla(210, 80%, 55%, 0.8)";
          ctx.font = "7px 'JetBrains Mono'";
          ctx.fillText(`${objCount} OBJECTS`, px + 6, panelY + panelH - 4);
        } else if (idx === 2 && showIMU) {
          // Accel graph
          const ax = imu.vx * 800, ay = imu.vy * 800;
          const centerX = px + panelW / 2, centerY = panelY + 36;
          ctx.strokeStyle = "hsla(40, 90%, 55%, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(px + 6, centerY); ctx.lineTo(px + panelW - 6, centerY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(centerX, panelY + 18); ctx.lineTo(centerX, panelY + panelH - 6); ctx.stroke();
          ctx.fillStyle = "hsla(40, 90%, 55%, 0.8)";
          ctx.beginPath(); ctx.arc(centerX + ax, centerY + ay, 3, 0, Math.PI * 2); ctx.fill();
          ctx.font = "7px 'JetBrains Mono'";
          ctx.fillText(`Drift: ${(Math.sqrt((imu.x - robotX) ** 2 + (imu.y - robotY) ** 2) * 100).toFixed(1)}%`, px + 6, panelY + panelH - 4);
        } else if (idx === 3 && showFused) {
          ctx.font = "7px 'JetBrains Mono'";
          ctx.fillStyle = "hsla(150, 70%, 50%, 0.8)";
          const lidarPts = fusedMapRef.current.filter(p => p.source === 'lidar').length;
          const camPts = fusedMapRef.current.filter(p => p.source === 'camera').length;
          ctx.fillText(`L:${lidarPts} C:${camPts}`, px + 6, panelY + 28);
          ctx.fillText(`Total: ${fusedMapRef.current.length}`, px + 6, panelY + 40);
          ctx.fillText(`α: ${fusionAlpha.toFixed(2)}`, px + 6, panelY + panelH - 4);
        }
      });

      // Info
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Sensor Fusion | α=${fusionAlpha.toFixed(2)} | Map: ${fusedMapRef.current.length} pts`, 15, 20);
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
  }, [robotX, robotY, robotAngle, lidarRays, lidarRange, cameraFOV, cameraRange, imuNoise, fusionAlpha, showLidar, showCamera, showIMU, showFused, showConfidence, running, raycast]);

  const controls = (
    <>
      <ControlSection title="Lidar">
        <SliderControl label="Rays" value={lidarRays} min={16} max={128} step={1} onChange={v => setLidarRays(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Range" value={lidarRange} min={60} max={300} step={5} onChange={v => setLidarRange(Math.round(v))} color="hsl(0, 70%, 55%)" />
      </ControlSection>
      <ControlSection title="Camera">
        <SliderControl label="FOV" value={cameraFOV} min={30} max={150} step={1} unit="°" onChange={v => setCameraFOV(Math.round(v))} color="hsl(210, 80%, 55%)" />
        <SliderControl label="Range" value={cameraRange} min={80} max={350} step={5} onChange={v => setCameraRange(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="IMU & Fusion">
        <SliderControl label="IMU Noise" value={imuNoise} min={0} max={0.1} step={0.005} onChange={setImuNoise} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Fusion Alpha" value={fusionAlpha} min={0} max={1} step={0.05} onChange={setFusionAlpha} color="hsl(150, 70%, 50%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Lidar", a: showLidar, t: () => setShowLidar(!showLidar) },
            { l: "Camera", a: showCamera, t: () => setShowCamera(!showCamera) },
            { l: "IMU", a: showIMU, t: () => setShowIMU(!showIMU) },
            { l: "Fused", a: showFused, t: () => setShowFused(!showFused) },
            { l: "Conf.", a: showConfidence, t: () => setShowConfidence(!showConfidence) },
          ].map(b => (
            <button key={b.l} onClick={b.t}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.a ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {b.l}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            {running ? "⏸ Pause" : "▶ Resume"}
          </button>
          <button onClick={() => { fusedMapRef.current = []; imuEstRef.current = { x: robotX, y: robotY, angle: robotAngle, vx: 0, vy: 0 }; }}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            Clear Map
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary">Drag</span> to move the robot. Combines <span style={{color:'hsl(0,70%,55%)'}}>lidar</span>, <span style={{color:'hsl(210,80%,55%)'}}>camera</span>, and <span style={{color:'hsl(40,90%,55%)'}}>IMU</span> into a unified <span style={{color:'hsl(150,70%,50%)'}}>fused map</span>. The fusion alpha controls how much IMU drift is corrected. Toggle "Conf." to see confidence heatmap coloring.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Sensor Fusion Lab" subtitle="Lidar + Camera + IMU Unified Perception" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SensorFusionLab;
