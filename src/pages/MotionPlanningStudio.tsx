import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import ControlSection from "@/components/ControlSection";
import SliderControl from "@/components/SliderControl";

interface Cell {
  x: number;
  y: number;
  type: "empty" | "wall" | "start" | "goal" | "open" | "closed" | "path" | "rrt-tree" | "rrt-path";
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

interface RRTNode {
  x: number;
  y: number;
  parent: RRTNode | null;
}

const GRID_SIZE = 30;

const MotionPlanningStudio = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols] = useState(40);
  const [rows] = useState(25);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [start, setStart] = useState({ x: 2, y: 2 });
  const [goal, setGoal] = useState({ x: 37, y: 22 });
  const [tool, setTool] = useState<"wall" | "start" | "goal" | "erase">("wall");
  const [algorithm, setAlgorithm] = useState<"astar" | "rrt" | "dijkstra">("astar");
  const [isRunning, setIsRunning] = useState(false);
  const [stepDelay, setStepDelay] = useState(20);
  const [rrtStepSize, setRrtStepSize] = useState(3);
  const [rrtMaxIter, setRrtMaxIter] = useState(3000);
  const paintingRef = useRef(false);

  const initGrid = useCallback(() => {
    const g: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
      g[y] = [];
      for (let x = 0; x < cols; x++) {
        g[y][x] = { x, y, type: "empty" };
      }
    }
    g[start.y][start.x].type = "start";
    g[goal.y][goal.x].type = "goal";
    return g;
  }, [rows, cols, start, goal]);

  useEffect(() => { setGrid(initGrid()); }, [initGrid]);

  const clearPath = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(cell =>
      ["open", "closed", "path", "rrt-tree", "rrt-path"].includes(cell.type)
        ? { ...cell, type: "empty" as const }
        : cell
    )));
  }, []);

  const runAStar = useCallback(async () => {
    setIsRunning(true);
    clearPath();
    await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    const h = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y);
    openSet.push({ x: start.x, y: start.y, g: 0, h: h(start.x, start.y), f: h(start.x, start.y), parent: null });
    const dirs = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found: AStarNode | null = null;
    while (openSet.length > 0 && !found) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      closedSet.add(key(current.x, current.y));
      if (current.x === goal.x && current.y === goal.y) { found = current; break; }
      if (g[current.y][current.x].type !== "start") g[current.y][current.x].type = "closed";
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx, ny = current.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (g[ny][nx].type === "wall") continue;
        if (closedSet.has(key(nx, ny))) continue;
        const cost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const ng = current.g + cost;
        const existing = openSet.find(n => n.x === nx && n.y === ny);
        if (!existing) {
          openSet.push({ x: nx, y: ny, g: ng, h: h(nx, ny), f: ng + h(nx, ny), parent: current });
          if (g[ny][nx].type !== "goal") g[ny][nx].type = "open";
        } else if (ng < existing.g) {
          existing.g = ng; existing.f = ng + existing.h; existing.parent = current;
        }
      }
      if (closedSet.size % 3 === 0) {
        setGrid(g.map(row => row.map(cell => ({ ...cell }))));
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }
    if (found) {
      let node: AStarNode | null = found;
      while (node) {
        if (g[node.y][node.x].type !== "start" && g[node.y][node.x].type !== "goal") g[node.y][node.x].type = "path";
        node = node.parent;
      }
    }
    setGrid(g.map(row => row.map(cell => ({ ...cell }))));
    setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, clearPath]);

  const runDijkstra = useCallback(async () => {
    setIsRunning(true);
    clearPath();
    await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const parent: (AStarNode | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const visited = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    dist[start.y][start.x] = 0;
    const queue: { x: number; y: number; d: number }[] = [{ x: start.x, y: start.y, d: 0 }];
    const dirs = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found = false;
    while (queue.length > 0 && !found) {
      queue.sort((a, b) => a.d - b.d);
      const cur = queue.shift()!;
      const k = key(cur.x, cur.y);
      if (visited.has(k)) continue;
      visited.add(k);
      if (cur.x === goal.x && cur.y === goal.y) { found = true; break; }
      if (g[cur.y][cur.x].type !== "start") g[cur.y][cur.x].type = "closed";
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (g[ny][nx].type === "wall") continue;
        const cost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const nd = cur.d + cost;
        if (nd < dist[ny][nx]) {
          dist[ny][nx] = nd;
          parent[ny][nx] = { x: cur.x, y: cur.y, g: 0, h: 0, f: 0, parent: null };
          queue.push({ x: nx, y: ny, d: nd });
          if (g[ny][nx].type !== "goal") g[ny][nx].type = "open";
        }
      }
      if (visited.size % 3 === 0) {
        setGrid(g.map(row => row.map(cell => ({ ...cell }))));
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }
    if (found) {
      let cx = goal.x, cy = goal.y;
      while (parent[cy][cx]) {
        if (g[cy][cx].type !== "start" && g[cy][cx].type !== "goal") g[cy][cx].type = "path";
        const p = parent[cy][cx]!;
        cx = p.x; cy = p.y;
      }
    }
    setGrid(g.map(row => row.map(cell => ({ ...cell }))));
    setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, clearPath]);

  const runRRT = useCallback(async () => {
    setIsRunning(true);
    clearPath();
    await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const tree: RRTNode[] = [{ x: start.x, y: start.y, parent: null }];
    const isWall = (x: number, y: number) => {
      const ix = Math.round(x), iy = Math.round(y);
      if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) return true;
      return g[iy][ix].type === "wall";
    };
    const lineCollision = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = Math.ceil(Math.sqrt((x2-x1)**2 + (y2-y1)**2));
      for (let i = 0; i <= steps; i++) {
        const t = i / Math.max(1, steps);
        if (isWall(x1 + (x2-x1)*t, y1 + (y2-y1)*t)) return true;
      }
      return false;
    };
    let found: RRTNode | null = null;
    for (let iter = 0; iter < rrtMaxIter && !found; iter++) {
      let rx: number, ry: number;
      if (Math.random() < 0.1) { rx = goal.x; ry = goal.y; }
      else { rx = Math.random() * cols; ry = Math.random() * rows; }
      let nearest = tree[0]; let minDist = Infinity;
      for (const node of tree) {
        const d = (node.x-rx)**2 + (node.y-ry)**2;
        if (d < minDist) { minDist = d; nearest = node; }
      }
      const dist = Math.sqrt((rx-nearest.x)**2 + (ry-nearest.y)**2);
      const step = Math.min(rrtStepSize, dist);
      const nx = nearest.x + (rx-nearest.x) / dist * step;
      const ny = nearest.y + (ry-nearest.y) / dist * step;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (lineCollision(nearest.x, nearest.y, nx, ny)) continue;
      const newNode: RRTNode = { x: nx, y: ny, parent: nearest };
      tree.push(newNode);
      const ix = Math.round(nx), iy = Math.round(ny);
      if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type === "empty") g[iy][ix].type = "rrt-tree";
      const goalDist = Math.sqrt((nx-goal.x)**2 + (ny-goal.y)**2);
      if (goalDist < rrtStepSize && !lineCollision(nx, ny, goal.x, goal.y)) {
        found = { x: goal.x, y: goal.y, parent: newNode };
      }
      if (iter % 10 === 0) {
        setGrid(g.map(row => row.map(cell => ({ ...cell }))));
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }
    if (found) {
      let node: RRTNode | null = found;
      while (node) {
        const ix = Math.round(node.x), iy = Math.round(node.y);
        if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type !== "start" && g[iy][ix].type !== "goal") g[iy][ix].type = "rrt-path";
        node = node.parent;
      }
    }
    setGrid(g.map(row => row.map(cell => ({ ...cell }))));
    setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, rrtStepSize, rrtMaxIter, clearPath]);

  const runAlgorithm = useCallback(() => {
    if (algorithm === "astar") runAStar();
    else if (algorithm === "dijkstra") runDijkstra();
    else runRRT();
  }, [algorithm, runAStar, runDijkstra, runRRT]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const render = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);
      const cellW = Math.min(GRID_SIZE, cw / cols);
      const cellH = Math.min(GRID_SIZE, ch / rows);
      const cellSize = Math.min(cellW, cellH);
      const offsetX = (cw - cellSize * cols) / 2;
      const offsetY = (ch - cellSize * rows) / 2;
      const colors: Record<string, string> = {
        empty: "hsl(225, 14%, 9%)",
        wall: "hsl(225, 12%, 22%)",
        start: "hsl(175, 80%, 50%)",
        goal: "hsl(40, 90%, 55%)",
        open: "hsl(210, 55%, 22%)",
        closed: "hsl(225, 15%, 14%)",
        path: "hsl(150, 70%, 45%)",
        "rrt-tree": "hsl(270, 35%, 20%)",
        "rrt-path": "hsl(270, 60%, 50%)",
      };
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid[y]?.[x];
          if (!cell) continue;
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;
          ctx.fillStyle = colors[cell.type] || colors.empty;
          const r = 2;
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, r);
          ctx.fill();
        }
      }
      ctx.fillStyle = "hsl(220, 10%, 42%)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${algorithm.toUpperCase()} | ${cols}×${rows}`, 15, offsetY - 8);
    };
    render();
    const getCell = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cw = rect.width; const ch = rect.height;
      const cellSize = Math.min(Math.min(GRID_SIZE, cw / cols), ch / rows);
      const offsetX = (cw - cellSize * cols) / 2;
      const offsetY = (ch - cellSize * rows) / 2;
      const cx = Math.floor((e.clientX - rect.left - offsetX) / cellSize);
      const cy = Math.floor((e.clientY - rect.top - offsetY) / cellSize);
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) return { x: cx, y: cy };
      return null;
    };
    const paint = (e: MouseEvent) => {
      const c = getCell(e);
      if (!c || isRunning) return;
      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })));
        if (tool === "wall" && next[c.y][c.x].type === "empty") next[c.y][c.x].type = "wall";
        else if (tool === "erase" && next[c.y][c.x].type === "wall") next[c.y][c.x].type = "empty";
        else if (tool === "start") {
          for (const row of next) for (const cell of row) if (cell.type === "start") cell.type = "empty";
          next[c.y][c.x].type = "start"; setStart({ x: c.x, y: c.y });
        } else if (tool === "goal") {
          for (const row of next) for (const cell of row) if (cell.type === "goal") cell.type = "empty";
          next[c.y][c.x].type = "goal"; setGoal({ x: c.x, y: c.y });
        }
        return next;
      });
    };
    const onDown = (e: MouseEvent) => { paintingRef.current = true; paint(e); };
    const onMove = (e: MouseEvent) => { if (paintingRef.current) paint(e); };
    const onUp = () => { paintingRef.current = false; };
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
    };
  }, [grid, cols, rows, tool, isRunning, algorithm]);

  const addRandomWalls = useCallback(() => {
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      for (let i = 0; i < cols * rows * 0.25; i++) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (next[y][x].type === "empty") next[y][x].type = "wall";
      }
      return next;
    });
  }, [cols, rows]);

  const controls = (
    <>
      <ControlSection title="Tools">
        <div className="grid grid-cols-2 gap-2">
          {(["wall", "erase", "start", "goal"] as const).map(t => (
            <button key={t} onClick={() => setTool(t)}
              className={`sim-btn ${tool === t ? "sim-btn-active" : "sim-btn-inactive"} capitalize`}>
              {t === "wall" ? "🧱 Wall" : t === "erase" ? "🧹 Erase" : t === "start" ? "🟢 Start" : "🎯 Goal"}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Algorithm">
        <div className="flex gap-2">
          {(["astar", "dijkstra", "rrt"] as const).map(a => (
            <button key={a} onClick={() => setAlgorithm(a)}
              className={`flex-1 sim-btn ${algorithm === a ? "sim-btn-active" : "sim-btn-inactive"}`}
              style={algorithm === a && a === "rrt" ? { borderColor: "hsl(270, 60%, 55%)", color: "hsl(270, 60%, 55%)" } : {}}>
              {a === "astar" ? "A*" : a === "dijkstra" ? "Dijkstra" : "RRT"}
            </button>
          ))}
        </div>
        {algorithm === "rrt" && (
          <div className="space-y-2 mt-2">
            <SliderControl label="Step Size" value={rrtStepSize} min={1} max={8} step={0.5} onChange={setRrtStepSize} color="hsl(270, 60%, 55%)" />
            <SliderControl label="Max Iterations" value={rrtMaxIter} min={500} max={10000} step={100} onChange={v => setRrtMaxIter(Math.round(v))} color="hsl(270, 60%, 55%)" />
          </div>
        )}
      </ControlSection>
      <ControlSection title="Actions">
        <div className="flex flex-col gap-2">
          <button onClick={runAlgorithm} disabled={isRunning}
            className={`sim-btn w-full ${isRunning ? "opacity-50 border-border text-muted-foreground" : "sim-btn-active"}`}>
            {isRunning ? "⏳ Computing..." : "▶ Run Pathfinding"}
          </button>
          <div className="flex gap-2">
            <button onClick={addRandomWalls} disabled={isRunning} className="flex-1 sim-btn sim-btn-inactive">Random Walls</button>
            <button onClick={() => setGrid(initGrid())} disabled={isRunning} className="flex-1 sim-btn sim-btn-inactive">Clear All</button>
          </div>
          <button onClick={clearPath} disabled={isRunning} className="sim-btn sim-btn-inactive w-full">Clear Path Only</button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Draw walls, set start/goal, then run pathfinding. <span className="text-primary">A*</span> and <span className="text-blue-glow">Dijkstra</span> find optimal paths.
          <span className="text-purple-glow"> RRT</span> builds a random tree — feasible but not optimal.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Motion Planning Studio" subtitle="A* · Dijkstra · RRT" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default MotionPlanningStudio;
