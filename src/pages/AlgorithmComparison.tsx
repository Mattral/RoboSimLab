import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

type Cell = { x: number; y: number };
type AlgoResult = { path: Cell[]; visited: Cell[]; time: number; name: string };

const GRID = 30;

const AlgorithmComparison = () => {
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [algoLeft, setAlgoLeft] = useState<'astar' | 'dijkstra' | 'rrt' | 'bfs'>('astar');
  const [algoRight, setAlgoRight] = useState<'dijkstra' | 'astar' | 'rrt' | 'bfs'>('dijkstra');
  const [obstaclePercent, setObstaclePercent] = useState(25);
  const [animSpeed, setAnimSpeed] = useState(5);
  const [running, setRunning] = useState(false);

  const startRef = useRef<Cell>({ x: 1, y: 1 });
  const goalRef = useRef<Cell>({ x: GRID - 2, y: GRID - 2 });
  const wallsRef = useRef<boolean[][]>(Array.from({ length: GRID }, () => Array(GRID).fill(false)));
  const leftResultRef = useRef<AlgoResult | null>(null);
  const rightResultRef = useRef<AlgoResult | null>(null);
  const animStepRef = useRef(0);

  const generateWalls = useCallback((percent: number) => {
    const walls: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false));
    const count = Math.floor((GRID * GRID * percent) / 100);
    let placed = 0;
    while (placed < count) {
      const x = Math.floor(Math.random() * GRID);
      const y = Math.floor(Math.random() * GRID);
      if ((x === 1 && y === 1) || (x === GRID - 2 && y === GRID - 2)) continue;
      if (!walls[y][x]) { walls[y][x] = true; placed++; }
    }
    return walls;
  }, []);

  // Pathfinding algorithms
  const heuristic = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const runAStar = useCallback((walls: boolean[][], start: Cell, goal: Cell): AlgoResult => {
    const t0 = performance.now();
    const open: { cell: Cell; f: number; g: number; path: Cell[] }[] = [{ cell: start, f: heuristic(start, goal), g: 0, path: [start] }];
    const closed = new Set<string>();
    const visited: Cell[] = [];
    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift()!;
      const key = `${cur.cell.x},${cur.cell.y}`;
      if (closed.has(key)) continue;
      closed.add(key);
      visited.push(cur.cell);
      if (cur.cell.x === goal.x && cur.cell.y === goal.y) return { path: cur.path, visited, time: performance.now() - t0, name: 'A*' };
      for (const [dx, dy] of dirs) {
        const nx = cur.cell.x + dx, ny = cur.cell.y + dy;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || walls[ny][nx]) continue;
        const g = cur.g + 1;
        open.push({ cell: { x: nx, y: ny }, f: g + heuristic({ x: nx, y: ny }, goal), g, path: [...cur.path, { x: nx, y: ny }] });
      }
    }
    return { path: [], visited, time: performance.now() - t0, name: 'A*' };
  }, []);

  const runDijkstra = useCallback((walls: boolean[][], start: Cell, goal: Cell): AlgoResult => {
    const t0 = performance.now();
    const open: { cell: Cell; dist: number; path: Cell[] }[] = [{ cell: start, dist: 0, path: [start] }];
    const closed = new Set<string>();
    const visited: Cell[] = [];
    while (open.length > 0) {
      open.sort((a, b) => a.dist - b.dist);
      const cur = open.shift()!;
      const key = `${cur.cell.x},${cur.cell.y}`;
      if (closed.has(key)) continue;
      closed.add(key);
      visited.push(cur.cell);
      if (cur.cell.x === goal.x && cur.cell.y === goal.y) return { path: cur.path, visited, time: performance.now() - t0, name: 'Dijkstra' };
      for (const [dx, dy] of dirs) {
        const nx = cur.cell.x + dx, ny = cur.cell.y + dy;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || walls[ny][nx]) continue;
        open.push({ cell: { x: nx, y: ny }, dist: cur.dist + 1, path: [...cur.path, { x: nx, y: ny }] });
      }
    }
    return { path: [], visited, time: performance.now() - t0, name: 'Dijkstra' };
  }, []);

  const runBFS = useCallback((walls: boolean[][], start: Cell, goal: Cell): AlgoResult => {
    const t0 = performance.now();
    const queue: { cell: Cell; path: Cell[] }[] = [{ cell: start, path: [start] }];
    const closed = new Set<string>(`${start.x},${start.y}`);
    const visited: Cell[] = [];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      visited.push(cur.cell);
      if (cur.cell.x === goal.x && cur.cell.y === goal.y) return { path: cur.path, visited, time: performance.now() - t0, name: 'BFS' };
      for (const [dx, dy] of dirs) {
        const nx = cur.cell.x + dx, ny = cur.cell.y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || walls[ny][nx] || closed.has(key)) continue;
        closed.add(key);
        queue.push({ cell: { x: nx, y: ny }, path: [...cur.path, { x: nx, y: ny }] });
      }
    }
    return { path: [], visited, time: performance.now() - t0, name: 'BFS' };
  }, []);

  const runRRT = useCallback((walls: boolean[][], start: Cell, goal: Cell): AlgoResult => {
    const t0 = performance.now();
    const nodes: { cell: Cell; parent: number }[] = [{ cell: start, parent: -1 }];
    const visited: Cell[] = [start];
    for (let iter = 0; iter < 3000; iter++) {
      const target = Math.random() < 0.1 ? goal : { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      let nearestIdx = 0, nearestDist = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const d = heuristic(nodes[i].cell, target);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      const near = nodes[nearestIdx].cell;
      const dx = Math.sign(target.x - near.x), dy = Math.sign(target.y - near.y);
      const nx = near.x + dx, ny = near.y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || walls[ny][nx]) continue;
      nodes.push({ cell: { x: nx, y: ny }, parent: nearestIdx });
      visited.push({ x: nx, y: ny });
      if (nx === goal.x && ny === goal.y) {
        const path: Cell[] = [];
        let idx = nodes.length - 1;
        while (idx >= 0) { path.unshift(nodes[idx].cell); idx = nodes[idx].parent; }
        return { path, visited, time: performance.now() - t0, name: 'RRT' };
      }
    }
    return { path: [], visited, time: performance.now() - t0, name: 'RRT' };
  }, []);

  const runAlgo = useCallback((algo: string, walls: boolean[][], start: Cell, goal: Cell) => {
    switch (algo) {
      case 'astar': return runAStar(walls, start, goal);
      case 'dijkstra': return runDijkstra(walls, start, goal);
      case 'bfs': return runBFS(walls, start, goal);
      case 'rrt': return runRRT(walls, start, goal);
      default: return runAStar(walls, start, goal);
    }
  }, [runAStar, runDijkstra, runBFS, runRRT]);

  const startComparison = useCallback(() => {
    const walls = generateWalls(obstaclePercent);
    wallsRef.current = walls;
    leftResultRef.current = runAlgo(algoLeft, walls, startRef.current, goalRef.current);
    rightResultRef.current = runAlgo(algoRight, walls, startRef.current, goalRef.current);
    animStepRef.current = 0;
    setRunning(true);
  }, [algoLeft, algoRight, obstaclePercent, generateWalls, runAlgo]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, result: AlgoResult | null, step: number, label: string) => {
    const cellW = w / GRID;
    const cellH = h / GRID;
    const walls = wallsRef.current;

    // Background
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = walls[y][x] ? "hsl(220, 15%, 25%)" : "hsl(220, 12%, 10%)";
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // Grid lines
    ctx.strokeStyle = "hsla(220, 15%, 18%, 0.3)";
    ctx.lineWidth = 0.3;
    for (let x = 0; x <= GRID; x++) { ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, h); ctx.stroke(); }
    for (let y = 0; y <= GRID; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(w, y * cellH); ctx.stroke(); }

    if (result) {
      // Visited cells (animated)
      const visibleVisited = Math.min(step, result.visited.length);
      for (let i = 0; i < visibleVisited; i++) {
        const v = result.visited[i];
        const alpha = 0.15 + (i / result.visited.length) * 0.2;
        ctx.fillStyle = `hsla(210, 60%, 45%, ${alpha})`;
        ctx.fillRect(v.x * cellW + 1, v.y * cellH + 1, cellW - 2, cellH - 2);
      }

      // Path (show after visited animation)
      if (step >= result.visited.length && result.path.length > 0) {
        ctx.strokeStyle = "hsl(175, 80%, 50%)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < result.path.length; i++) {
          const p = result.path[i];
          if (i === 0) ctx.moveTo(p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
          else ctx.lineTo(p.x * cellW + cellW / 2, p.y * cellH + cellH / 2);
        }
        ctx.stroke();
      }
    }

    // Start & Goal
    const start = startRef.current, goal = goalRef.current;
    ctx.fillStyle = "hsl(150, 70%, 50%)";
    ctx.beginPath(); ctx.arc(start.x * cellW + cellW / 2, start.y * cellH + cellH / 2, cellW * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "hsl(0, 70%, 55%)";
    ctx.beginPath(); ctx.arc(goal.x * cellW + cellW / 2, goal.y * cellH + cellH / 2, cellW * 0.35, 0, Math.PI * 2); ctx.fill();

    // Label + stats
    ctx.fillStyle = "hsla(220, 18%, 8%, 0.85)";
    ctx.beginPath(); ctx.roundRect(6, 6, 140, result ? 55 : 25, 4); ctx.fill();
    ctx.fillStyle = "hsl(175, 80%, 50%)";
    ctx.font = "bold 11px 'JetBrains Mono'";
    ctx.textAlign = "left";
    ctx.fillText(label, 12, 22);
    if (result) {
      ctx.fillStyle = "hsl(215, 15%, 55%)";
      ctx.font = "9px 'JetBrains Mono'";
      ctx.fillText(`Visited: ${result.visited.length} cells`, 12, 37);
      ctx.fillText(`Path: ${result.path.length} steps`, 12, 49);
      ctx.fillText(`Time: ${result.time.toFixed(2)}ms`, 12, 61 - 4);
    }
  }, []);

  useEffect(() => {
    const canvasL = canvasLeftRef.current;
    const canvasR = canvasRightRef.current;
    if (!canvasL || !canvasR) return;
    const ctxL = canvasL.getContext("2d")!;
    const ctxR = canvasR.getContext("2d")!;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio;
      const cw = container.clientWidth / 2 - 2;
      const ch = container.clientHeight;
      [canvasL, canvasR].forEach(c => {
        c.width = cw * dpr; c.height = ch * dpr;
        c.style.width = cw + "px"; c.style.height = ch + "px";
      });
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const w = canvasL.width / dpr;
      const h = canvasL.height / dpr;

      [ctxL, ctxR].forEach(ctx => { ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h); });

      if (running) {
        animStepRef.current += animSpeed;
      }

      const leftR = leftResultRef.current;
      const rightR = rightResultRef.current;

      drawGrid(ctxL, w, h, leftR, animStepRef.current, leftR?.name || algoLeft.toUpperCase());
      drawGrid(ctxR, w, h, rightR, animStepRef.current, rightR?.name || algoRight.toUpperCase());

      // Check if animation is done
      if (leftR && rightR) {
        const maxVisited = Math.max(leftR.visited.length, rightR.visited.length);
        if (animStepRef.current > maxVisited + 30) {
          // Keep showing final state
        }
      }
    };

    loop();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [running, animSpeed, algoLeft, algoRight, drawGrid]);

  const algos = [
    { value: 'astar', label: 'A*' },
    { value: 'dijkstra', label: 'Dijkstra' },
    { value: 'bfs', label: 'BFS' },
    { value: 'rrt', label: 'RRT' },
  ];

  const controls = (
    <>
      <ControlSection title="Left Algorithm">
        <div className="grid grid-cols-2 gap-1.5">
          {algos.map(a => (
            <button key={a.value} onClick={() => setAlgoLeft(a.value as any)}
              className={`text-xs font-mono py-1.5 rounded border transition-colors ${algoLeft === a.value ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {a.label}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Right Algorithm">
        <div className="grid grid-cols-2 gap-1.5">
          {algos.map(a => (
            <button key={a.value} onClick={() => setAlgoRight(a.value as any)}
              className={`text-xs font-mono py-1.5 rounded border transition-colors ${algoRight === a.value ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {a.label}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Environment">
        <SliderControl label="Obstacles %" value={obstaclePercent} min={5} max={40} step={1} onChange={v => setObstaclePercent(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Anim Speed" value={animSpeed} min={1} max={20} step={1} onChange={v => setAnimSpeed(Math.round(v))} color="hsl(175, 80%, 50%)" />
      </ControlSection>
      <ControlSection title="Run">
        <button onClick={startComparison}
          className="w-full text-xs font-mono py-2.5 rounded border border-primary text-primary hover:bg-primary/10 transition-colors font-semibold">
          ▶ Run Comparison
        </button>
        <button onClick={() => { setRunning(false); leftResultRef.current = null; rightResultRef.current = null; animStepRef.current = 0; }}
          className="w-full text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors mt-1">
          ↺ Reset
        </button>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Select two algorithms and click <span className="text-primary">Run Comparison</span> to see them solve the same randomly-generated maze side by side.
          Compare <span style={{color:'hsl(210,60%,45%)'}}>visited cells</span>, path length, and execution time.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Algorithm Comparison" subtitle="Side-by-Side Pathfinding Analysis" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] flex gap-1">
        <canvas ref={canvasLeftRef} className="flex-1 rounded-sm" />
        <div className="w-px bg-border/30" />
        <canvas ref={canvasRightRef} className="flex-1 rounded-sm" />
      </div>
    </SimLayout>
  );
};

export default AlgorithmComparison;
