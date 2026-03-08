import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

type CellState = 'unknown' | 'free' | 'occupied' | 'frontier';

const SLAMExploration = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const GRID = 80;
  const [robotSpeed, setRobotSpeed] = useState(1.2);
  const [sensorRange, setSensorRange] = useState(8);
  const [sensorRays, setSensorRays] = useState(32);
  const [showFrontiers, setShowFrontiers] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [running, setRunning] = useState(true);
  const [explored, setExplored] = useState(0);

  // Generate random obstacles on the grid
  const generateWorld = useCallback(() => {
    const world: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false));
    // Walls
    for (let x = 0; x < GRID; x++) { world[0][x] = true; world[GRID - 1][x] = true; }
    for (let y = 0; y < GRID; y++) { world[y][0] = true; world[y][GRID - 1] = true; }
    // Random rooms/walls
    const walls = [
      [15, 10, 15, 35], [30, 0, 30, 25], [30, 35, 30, 55], [50, 20, 50, 50],
      [10, 50, 40, 50], [60, 10, 60, 40], [20, 65, 55, 65], [70, 30, 70, 70],
      [40, 15, 60, 15], [15, 75, 65, 75],
    ];
    for (const [x1, y1, x2, y2] of walls) {
      const dx = x2 - x1, dy = y2 - y1;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= steps; i++) {
        const wx = Math.round(x1 + (dx * i) / Math.max(steps, 1));
        const wy = Math.round(y1 + (dy * i) / Math.max(steps, 1));
        if (wx >= 0 && wx < GRID && wy >= 0 && wy < GRID) world[wy][wx] = true;
      }
    }
    // Add some random block obstacles
    for (let i = 0; i < 15; i++) {
      const bx = 5 + Math.floor(Math.random() * (GRID - 10));
      const by = 5 + Math.floor(Math.random() * (GRID - 10));
      const bw = 2 + Math.floor(Math.random() * 3);
      const bh = 2 + Math.floor(Math.random() * 3);
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          if (by + dy < GRID && bx + dx < GRID) world[by + dy][bx + dx] = true;
        }
      }
    }
    // Ensure start area is free
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const sx = 5 + dx, sy = 5 + dy;
      if (sx >= 0 && sx < GRID && sy >= 0 && sy < GRID) world[sy][sx] = false;
    }
    return world;
  }, []);

  const worldRef = useRef<boolean[][]>(generateWorld());
  const mapRef = useRef<CellState[][]>(Array.from({ length: GRID }, () => Array(GRID).fill('unknown')));
  const robotRef = useRef({ x: 5, y: 5, angle: 0, targetX: -1, targetY: -1, path: [] as {x:number,y:number}[] });
  const trailRef = useRef<{x:number,y:number}[]>([]);

  const reset = useCallback(() => {
    worldRef.current = generateWorld();
    mapRef.current = Array.from({ length: GRID }, () => Array(GRID).fill('unknown'));
    robotRef.current = { x: 5, y: 5, angle: 0, targetX: -1, targetY: -1, path: [] };
    trailRef.current = [];
    setExplored(0);
  }, [generateWorld]);

  // Simple BFS pathfinding on the map
  const findPath = useCallback((sx: number, sy: number, tx: number, ty: number, map: CellState[][]) => {
    const visited = new Set<string>();
    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: Math.round(sx), y: Math.round(sy), path: [] }];
    visited.add(`${Math.round(sx)},${Math.round(sy)}`);
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === tx && cur.y === ty) return [...cur.path, { x: tx, y: ty }];
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
        if (visited.has(key)) continue;
        if (map[ny][nx] === 'occupied') continue;
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...cur.path, { x: cur.x, y: cur.y }] });
      }
    }
    return [];
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

    let tickCounter = 0;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);

      const cellW = cw / GRID;
      const cellH = ch / GRID;
      const world = worldRef.current;
      const map = mapRef.current;
      const robot = robotRef.current;

      if (running) {
        tickCounter++;

        // Sensor update — reveal cells
        for (let i = 0; i < sensorRays; i++) {
          const angle = (i / sensorRays) * Math.PI * 2;
          for (let d = 0; d <= sensorRange; d++) {
            const cx = Math.round(robot.x + Math.cos(angle) * d);
            const cy = Math.round(robot.y + Math.sin(angle) * d);
            if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) break;
            if (world[cy][cx]) {
              map[cy][cx] = 'occupied';
              break;
            }
            map[cy][cx] = 'free';
          }
        }

        // Find frontiers (free cells adjacent to unknown)
        const frontiers: { x: number; y: number }[] = [];
        for (let y = 1; y < GRID - 1; y++) {
          for (let x = 1; x < GRID - 1; x++) {
            if (map[y][x] !== 'free') continue;
            const hasUnknown = [[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy]) => map[y+dy]?.[x+dx] === 'unknown');
            if (hasUnknown) {
              map[y][x] = 'frontier';
              frontiers.push({ x, y });
            }
          }
        }

        // Navigate to nearest frontier
        if (tickCounter % 3 === 0) {
          if (robot.path.length === 0 || tickCounter % 30 === 0) {
            // Find nearest frontier
            let bestDist = Infinity;
            let bestFrontier: { x: number; y: number } | null = null;
            for (const f of frontiers) {
              const dist = Math.abs(f.x - robot.x) + Math.abs(f.y - robot.y);
              if (dist < bestDist && dist > 2) {
                bestDist = dist;
                bestFrontier = f;
              }
            }
            if (bestFrontier) {
              robot.targetX = bestFrontier.x;
              robot.targetY = bestFrontier.y;
              // Reset frontier markers for fresh detection
              for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
                if (map[y][x] === 'frontier') map[y][x] = 'free';
              }
              robot.path = findPath(robot.x, robot.y, robot.targetX, robot.targetY, map);
            }
          }

          // Move along path
          if (robot.path.length > 0) {
            const next = robot.path[0];
            const dx = next.x - robot.x;
            const dy = next.y - robot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            robot.angle = Math.atan2(dy, dx);
            if (dist < robotSpeed * 0.5) {
              robot.x = next.x;
              robot.y = next.y;
              robot.path.shift();
            } else {
              robot.x += (dx / dist) * robotSpeed * 0.4;
              robot.y += (dy / dist) * robotSpeed * 0.4;
            }
            trailRef.current.push({ x: robot.x, y: robot.y });
            if (trailRef.current.length > 2000) trailRef.current.shift();
          }
        }

        // Count explored
        let freeCount = 0, totalFree = 0;
        for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
          if (!world[y][x]) totalFree++;
          if (map[y][x] === 'free' || map[y][x] === 'frontier') freeCount++;
        }
        setExplored(Math.round((freeCount / totalFree) * 100));
      }

      // Draw map
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const state = map[y][x];
          if (state === 'unknown') {
            ctx.fillStyle = "hsl(220, 15%, 8%)";
          } else if (state === 'free') {
            ctx.fillStyle = "hsl(220, 12%, 15%)";
          } else if (state === 'occupied') {
            ctx.fillStyle = "hsl(220, 15%, 30%)";
          } else if (state === 'frontier') {
            ctx.fillStyle = showFrontiers ? "hsla(40, 90%, 50%, 0.4)" : "hsl(220, 12%, 15%)";
          }
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      // Grid lines (subtle)
      ctx.strokeStyle = "hsla(220, 15%, 20%, 0.15)";
      ctx.lineWidth = 0.3;
      for (let x = 0; x <= GRID; x++) { ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, ch); ctx.stroke(); }
      for (let y = 0; y <= GRID; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(cw, y * cellH); ctx.stroke(); }

      // Trail
      if (showPath && trailRef.current.length > 1) {
        ctx.strokeStyle = "hsla(175, 80%, 50%, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < trailRef.current.length; i++) {
          const p = trailRef.current[i];
          if (i === 0) ctx.moveTo(p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
          else ctx.lineTo(p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
        }
        ctx.stroke();
      }

      // Planned path
      if (showPath && robot.path.length > 0) {
        ctx.strokeStyle = "hsla(270, 60%, 55%, 0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(robot.x * cellW + cellW / 2, robot.y * cellH + cellH / 2);
        for (const p of robot.path) {
          ctx.lineTo(p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Sensor rays
      if (showSensors) {
        for (let i = 0; i < Math.min(sensorRays, 24); i++) {
          const angle = (i / Math.min(sensorRays, 24)) * Math.PI * 2;
          const ox = robot.x * cellW + cellW / 2;
          const oy = robot.y * cellH + cellH / 2;
          let endD = sensorRange;
          for (let d = 0; d <= sensorRange; d++) {
            const cx = Math.round(robot.x + Math.cos(angle) * d);
            const cy = Math.round(robot.y + Math.sin(angle) * d);
            if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID || world[cy]?.[cx]) { endD = d; break; }
          }
          ctx.strokeStyle = "hsla(175, 80%, 50%, 0.12)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(angle) * endD * cellW, oy + Math.sin(angle) * endD * cellH);
          ctx.stroke();
        }
      }

      // Target
      if (robot.targetX >= 0) {
        ctx.strokeStyle = "hsla(40, 90%, 55%, 0.6)";
        ctx.lineWidth = 1.5;
        const tx = robot.targetX * cellW + cellW / 2;
        const ty = robot.targetY * cellH + cellH / 2;
        ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx, ty - 4); ctx.lineTo(tx, ty + 4); ctx.stroke();
      }

      // Robot
      const rpx = robot.x * cellW + cellW / 2;
      const rpy = robot.y * cellH + cellH / 2;
      ctx.fillStyle = "hsl(175, 80%, 50%)";
      ctx.beginPath(); ctx.arc(rpx, rpy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.beginPath(); ctx.arc(rpx, rpy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsl(175, 80%, 50%)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rpx, rpy);
      ctx.lineTo(rpx + Math.cos(robot.angle) * 10, rpy + Math.sin(robot.angle) * 10);
      ctx.stroke();

      // HUD
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`SLAM Exploration | Explored: ${explored}% | Trail: ${trailRef.current.length}`, 15, 20);

      // Progress bar
      const barW = 150, barH = 6, barX = cw - barW - 15, barY = 15;
      ctx.fillStyle = "hsla(220, 15%, 15%, 0.8)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = explored >= 90 ? "hsl(150, 70%, 50%)" : "hsl(175, 80%, 50%)";
      ctx.fillRect(barX, barY, barW * (explored / 100), barH);
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "9px 'JetBrains Mono'";
      ctx.textAlign = "right";
      ctx.fillText(`${explored}%`, barX - 5, barY + 5);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, robotSpeed, sensorRange, sensorRays, showFrontiers, showPath, showSensors, explored, findPath]);

  const controls = (
    <>
      <ControlSection title="Robot">
        <SliderControl label="Speed" value={robotSpeed} min={0.3} max={3} step={0.1} onChange={setRobotSpeed} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Sensor Range" value={sensorRange} min={3} max={20} step={1} onChange={v => setSensorRange(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Sensor Rays" value={sensorRays} min={8} max={64} step={1} onChange={v => setSensorRays(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Frontier", a: showFrontiers, t: () => setShowFrontiers(!showFrontiers) },
            { l: "Path", a: showPath, t: () => setShowPath(!showPath) },
            { l: "Sensors", a: showSensors, t: () => setShowSensors(!showSensors) },
          ].map(b => (
            <button key={b.l} onClick={b.t}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.a ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {b.l}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Exploration">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Explored</span>
            <span className="text-primary font-semibold">{explored}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary/30 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${explored}%` }} />
          </div>
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
          A robot autonomously explores an unknown environment using <span className="text-primary">frontier-based exploration</span>. 
          <span style={{ color: 'hsl(40, 90%, 55%)' }}> Yellow cells</span> are frontiers (boundaries between known and unknown). 
          The robot navigates to the nearest frontier using BFS pathfinding to progressively map the entire space.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="SLAM Exploration" subtitle="Frontier-Based Autonomous Mapping" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SLAMExploration;
