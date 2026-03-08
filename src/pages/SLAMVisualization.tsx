import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

const GRID = 60;
const CELL = 1;

interface Robot {
  x: number; y: number; angle: number;
  estX: number; estY: number; estAngle: number;
  path: { x: number; y: number }[];
  estPath: { x: number; y: number }[];
}

const SLAMVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mapRef = useRef<number[][]>([]);
  const occupancyRef = useRef<number[][]>([]);
  const robotRef = useRef<Robot>({ x: 10, y: 10, angle: 0, estX: 10, estY: 10, estAngle: 0, path: [], estPath: [] });
  const targetRef = useRef<{ r: number; c: number } | null>(null);

  const [running, setRunning] = useState(true);
  const [scanRays, setScanRays] = useState(36);
  const [scanRange, setScanRange] = useState(12);
  const [robotSpeed, setRobotSpeed] = useState(0.08);
  const [showTrue, setShowTrue] = useState(true);
  const [showEstimate, setShowEstimate] = useState(true);
  const [showScanRays, setShowScanRays] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [explored, setExplored] = useState(0);

  const initWorld = useCallback(() => {
    const map: number[][] = [];
    const occ: number[][] = [];
    for (let r = 0; r < GRID; r++) {
      map[r] = [];
      occ[r] = [];
      for (let c = 0; c < GRID; c++) {
        map[r][c] = (r === 0 || r === GRID - 1 || c === 0 || c === GRID - 1) ? 1 : 0;
        occ[r][c] = -1; // unknown
      }
    }
    // Random obstacles
    const rng = (n: number) => Math.floor(Math.sin(n * 127.1 + 311.7) * 43758.5453 % 1 * GRID);
    for (let i = 0; i < 25; i++) {
      const wr = 5 + (rng(i * 3) % (GRID - 10));
      const wc = 5 + (rng(i * 3 + 1) % (GRID - 10));
      const len = 3 + (rng(i * 3 + 2) % 6);
      const horiz = i % 2 === 0;
      for (let j = 0; j < len; j++) {
        const r = horiz ? wr : wr + j;
        const c = horiz ? wc + j : wc;
        if (r > 0 && r < GRID - 1 && c > 0 && c < GRID - 1) map[r][c] = 1;
      }
    }
    mapRef.current = map;
    occupancyRef.current = occ;
    robotRef.current = { x: 10, y: 10, angle: 0, estX: 10, estY: 10, estAngle: 0, path: [], estPath: [] };
    targetRef.current = null;
  }, []);

  useEffect(() => { initWorld(); }, [initWorld]);

  // Raycast
  const raycast = useCallback((ox: number, oy: number, angle: number, range: number): { hitR: number; hitC: number; dist: number } | null => {
    const map = mapRef.current;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = 0; d < range; d += 0.3) {
      const r = Math.floor(oy + dy * d);
      const c = Math.floor(ox + dx * d);
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) return { hitR: r, hitC: c, dist: d };
      if (map[r]?.[c] === 1) return { hitR: r, hitC: c, dist: d };
    }
    return null;
  }, []);

  // Find frontier
  const findFrontier = useCallback(() => {
    const occ = occupancyRef.current;
    const robot = robotRef.current;
    let bestR = -1, bestC = -1, bestDist = Infinity;
    for (let r = 1; r < GRID - 1; r++) {
      for (let c = 1; c < GRID - 1; c++) {
        if (occ[r][c] !== 0) continue; // must be known free
        const hasUnknown = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          return nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && occ[nr][nc] === -1;
        });
        if (!hasUnknown) continue;
        const dist = Math.abs(r - robot.y) + Math.abs(c - robot.x);
        if (dist < bestDist) { bestDist = dist; bestR = r; bestC = c; }
      }
    }
    return bestR >= 0 ? { r: bestR, c: bestC } : null;
  }, []);

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

      const map = mapRef.current;
      const occ = occupancyRef.current;
      const robot = robotRef.current;
      if (map.length === 0) return;

      const cellPx = Math.min((w * 0.48) / GRID, (h - 40) / GRID);
      const margin = 10;

      // Step simulation
      if (running) {
        // Scan
        for (let i = 0; i < scanRays; i++) {
          const angle = robot.angle + (i / scanRays) * Math.PI * 2;
          const hit = raycast(robot.x, robot.y, angle, scanRange);
          if (hit) {
            // Mark cells along ray as free
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            for (let d = 0; d < hit.dist; d += 0.5) {
              const r = Math.floor(robot.y + dy * d);
              const c = Math.floor(robot.x + dx * d);
              if (r >= 0 && r < GRID && c >= 0 && c < GRID) occ[r][c] = 0;
            }
            if (hit.hitR >= 0 && hit.hitR < GRID && hit.hitC >= 0 && hit.hitC < GRID) occ[hit.hitR][hit.hitC] = 1;
          } else {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            for (let d = 0; d < scanRange; d += 0.5) {
              const r = Math.floor(robot.y + dy * d);
              const c = Math.floor(robot.x + dx * d);
              if (r >= 0 && r < GRID && c >= 0 && c < GRID) occ[r][c] = 0;
            }
          }
        }

        // Navigate to frontier
        if (!targetRef.current) targetRef.current = findFrontier();
        const target = targetRef.current;
        if (target) {
          const dx = target.c - robot.x;
          const dy = target.r - robot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1.5) { targetRef.current = findFrontier(); }
          else {
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - robot.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            robot.angle += Math.max(-0.1, Math.min(0.1, angleDiff));
            const nx = robot.x + Math.cos(robot.angle) * robotSpeed;
            const ny = robot.y + Math.sin(robot.angle) * robotSpeed;
            const nr = Math.floor(ny);
            const nc = Math.floor(nx);
            if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && map[nr][nc] !== 1) {
              robot.x = nx; robot.y = ny;
            } else { targetRef.current = findFrontier(); }
          }
          // Estimated pose (with small drift)
          robot.estX += Math.cos(robot.angle) * robotSpeed + (Math.random() - 0.5) * 0.005;
          robot.estY += Math.sin(robot.angle) * robotSpeed + (Math.random() - 0.5) * 0.005;
          robot.estAngle = robot.angle + (Math.random() - 0.5) * 0.01;
        }

        robot.path.push({ x: robot.x, y: robot.y });
        robot.estPath.push({ x: robot.estX, y: robot.estY });
        if (robot.path.length > 2000) robot.path.shift();
        if (robot.estPath.length > 2000) robot.estPath.shift();

        // Count explored
        let exp = 0;
        for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (occ[r][c] >= 0) exp++;
        setExplored(Math.round((exp / (GRID * GRID)) * 100));
      }

      // Draw two panels: true world + occupancy grid
      const drawGrid = (ox: number, oy: number, label: string, drawFn: (r: number, c: number, px: number, py: number) => void) => {
        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "10px 'Inter'";
        ctx.textAlign = "center";
        ctx.fillText(label, ox + (GRID * cellPx) / 2, oy - 5);
        for (let r = 0; r < GRID; r++) {
          for (let c = 0; c < GRID; c++) {
            drawFn(r, c, ox + c * cellPx, oy + r * cellPx);
          }
        }
      };

      // True world
      drawGrid(margin, 20, "TRUE WORLD", (r, c, px, py) => {
        ctx.fillStyle = map[r][c] === 1 ? "hsl(228, 12%, 22%)" : "hsl(228, 14%, 7%)";
        ctx.fillRect(px, py, cellPx - 0.5, cellPx - 0.5);
      });

      // Occupancy grid
      const ox2 = margin + GRID * cellPx + 20;
      drawGrid(ox2, 20, "OCCUPANCY MAP (SLAM)", (r, c, px, py) => {
        const v = occ[r][c];
        ctx.fillStyle = v === -1 ? "hsl(228, 13%, 12%)" : v === 1 ? "hsl(228, 12%, 25%)" : "hsl(172, 30%, 10%)";
        ctx.fillRect(px, py, cellPx - 0.5, cellPx - 0.5);
      });

      // Scan rays
      if (showScanRays) {
        for (let i = 0; i < scanRays; i++) {
          const angle = robot.angle + (i / scanRays) * Math.PI * 2;
          const hit = raycast(robot.x, robot.y, angle, scanRange);
          const endDist = hit ? hit.dist : scanRange;
          const ex = robot.x + Math.cos(angle) * endDist;
          const ey = robot.y + Math.sin(angle) * endDist;

          // On true map
          ctx.strokeStyle = hit ? "hsla(0, 62%, 50%, 0.3)" : "hsla(172, 78%, 47%, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(margin + robot.x * cellPx, 20 + robot.y * cellPx);
          ctx.lineTo(margin + ex * cellPx, 20 + ey * cellPx);
          ctx.stroke();
        }
      }

      // Trajectory
      if (showTrajectory && robot.path.length > 1) {
        // True path
        if (showTrue) {
          ctx.strokeStyle = "hsla(172, 78%, 47%, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          robot.path.forEach((p, i) => {
            const sx = margin + p.x * cellPx;
            const sy = 20 + p.y * cellPx;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        }
        // Estimated path on occupancy
        if (showEstimate) {
          ctx.strokeStyle = "hsla(38, 88%, 52%, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          robot.estPath.forEach((p, i) => {
            const sx = ox2 + p.x * cellPx;
            const sy = 20 + p.y * cellPx;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        }
      }

      // Robot on true map
      if (showTrue) {
        const rx = margin + robot.x * cellPx;
        const ry = 20 + robot.y * cellPx;
        ctx.fillStyle = "hsl(172, 78%, 47%)";
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "hsl(172, 78%, 60%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(robot.angle) * 8, ry + Math.sin(robot.angle) * 8);
        ctx.stroke();
      }

      // Robot estimate on occupancy
      if (showEstimate) {
        const rx = ox2 + robot.estX * cellPx;
        const ry = 20 + robot.estY * cellPx;
        ctx.fillStyle = "hsl(38, 88%, 52%)";
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Frontier target
      const target = targetRef.current;
      if (target) {
        const tx = ox2 + target.c * cellPx;
        const ty = 20 + target.r * cellPx;
        ctx.strokeStyle = "hsl(268, 58%, 52%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx + cellPx / 2, ty + cellPx / 2, 6, 0, Math.PI * 2); ctx.stroke();
      }

      // HUD
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Explored: ${explored}%  Pos: (${robot.x.toFixed(1)}, ${robot.y.toFixed(1)})  ${running ? "▶ MAPPING" : "⏸ PAUSED"}`, 15, h - 10);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, scanRays, scanRange, robotSpeed, showTrue, showEstimate, showScanRays, showTrajectory, explored, raycast, findFrontier]);

  const controls = (
    <>
      <ControlSection title="Sensor Config">
        <SliderControl label="Scan Rays" value={scanRays} min={8} max={72} step={1} onChange={v => setScanRays(Math.round(v))} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Scan Range" value={scanRange} min={4} max={25} step={1} onChange={v => setScanRange(Math.round(v))} color="hsl(38, 88%, 52%)" />
        <SliderControl label="Robot Speed" value={robotSpeed} min={0.02} max={0.2} step={0.01} onChange={setRobotSpeed} color="hsl(152, 68%, 42%)" />
      </ControlSection>

      <ControlSection title="Display">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowTrue(!showTrue)} className={`sim-btn ${showTrue ? "sim-btn-active" : "sim-btn-inactive"}`}>True Pos</button>
          <button onClick={() => setShowEstimate(!showEstimate)} className={`sim-btn ${showEstimate ? "sim-btn-active" : "sim-btn-inactive"}`}>Estimate</button>
          <button onClick={() => setShowScanRays(!showScanRays)} className={`sim-btn ${showScanRays ? "sim-btn-active" : "sim-btn-inactive"}`}>Scan Rays</button>
          <button onClick={() => setShowTrajectory(!showTrajectory)} className={`sim-btn ${showTrajectory ? "sim-btn-active" : "sim-btn-inactive"}`}>Trajectory</button>
        </div>
      </ControlSection>

      <ControlSection title="Controls">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Explore"}</button>
          <button onClick={() => { initWorld(); }} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
      </ControlSection>

      <ControlSection title="Status">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Explored</span><span className="text-primary">{explored}%</span></div>
          <div className="flex justify-between"><span>True Position</span><span className="text-foreground">({robotRef.current.x.toFixed(1)}, {robotRef.current.y.toFixed(1)})</span></div>
          <div className="flex justify-between"><span>Est. Position</span><span className="text-amber-glow">({robotRef.current.estX.toFixed(1)}, {robotRef.current.estY.toFixed(1)})</span></div>
          <div className="flex justify-between"><span>Pose Error</span><span className="text-destructive">{Math.sqrt((robotRef.current.x - robotRef.current.estX) ** 2 + (robotRef.current.y - robotRef.current.estY) ** 2).toFixed(3)}</span></div>
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary">SLAM</span> (Simultaneous Localization and Mapping) builds a map while tracking position. 
          The <span className="text-primary">true world</span> shows ground truth. The <span className="text-amber-glow">occupancy grid</span> shows what the robot has discovered. 
          <span className="text-purple-glow"> Frontier targets</span> guide autonomous exploration toward unknown regions.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="SLAM Visualization" subtitle="Laser · Odometry · Occupancy · Frontier" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SLAMVisualization;
