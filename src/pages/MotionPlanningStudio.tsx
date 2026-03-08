import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import ControlSection from "@/components/ControlSection";
import SliderControl from "@/components/SliderControl";
import { exportToCSV } from "@/components/DataExport";

interface Cell {
  x: number;
  y: number;
  type: "empty" | "wall" | "start" | "goal" | "open" | "closed" | "path" | "rrt-tree" | "rrt-path" | "potential" | "prm-node" | "prm-edge" | "prm-path";
}

interface AStarNode {
  x: number; y: number; g: number; h: number; f: number; parent: AStarNode | null;
}

interface RRTNode {
  x: number; y: number; parent: RRTNode | null;
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
  const [algorithm, setAlgorithm] = useState<"astar" | "rrt" | "dijkstra" | "potential" | "prm">("astar");
  const [prmNodes, setPrmNodes] = useState(200);
  const [prmK, setPrmK] = useState(6);
  const [isRunning, setIsRunning] = useState(false);
  const [stepDelay, setStepDelay] = useState(20);
  const [rrtStepSize, setRrtStepSize] = useState(3);
  const [rrtMaxIter, setRrtMaxIter] = useState(3000);
  const [potentialAttractive, setPotentialAttractive] = useState(1.0);
  const [potentialRepulsive, setPotentialRepulsive] = useState(100);
  const paintingRef = useRef(false);

  const initGrid = useCallback(() => {
    const g: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
      g[y] = [];
      for (let x = 0; x < cols; x++) g[y][x] = { x, y, type: "empty" };
    }
    g[start.y][start.x].type = "start";
    g[goal.y][goal.x].type = "goal";
    return g;
  }, [rows, cols, start, goal]);

  useEffect(() => { setGrid(initGrid()); }, [initGrid]);

  const clearPath = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(cell =>
      ["open", "closed", "path", "rrt-tree", "rrt-path", "potential"].includes(cell.type)
        ? { ...cell, type: "empty" as const } : cell
    )));
  }, []);

  const runAStar = useCallback(async () => {
    setIsRunning(true); clearPath(); await new Promise(r => setTimeout(r, 50));
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
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || g[ny][nx].type === "wall" || closedSet.has(key(nx, ny))) continue;
        const cost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const ng = current.g + cost;
        const existing = openSet.find(n => n.x === nx && n.y === ny);
        if (!existing) {
          openSet.push({ x: nx, y: ny, g: ng, h: h(nx, ny), f: ng + h(nx, ny), parent: current });
          if (g[ny][nx].type !== "goal") g[ny][nx].type = "open";
        } else if (ng < existing.g) { existing.g = ng; existing.f = ng + existing.h; existing.parent = current; }
      }
      if (closedSet.size % 3 === 0) { setGrid(g.map(r => r.map(c => ({ ...c })))); await new Promise(r => setTimeout(r, stepDelay)); }
    }
    if (found) { let n: AStarNode | null = found; while (n) { if (g[n.y][n.x].type !== "start" && g[n.y][n.x].type !== "goal") g[n.y][n.x].type = "path"; n = n.parent; } }
    setGrid(g.map(r => r.map(c => ({ ...c })))); setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, clearPath]);

  const runDijkstra = useCallback(async () => {
    setIsRunning(true); clearPath(); await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const parent: ({ x: number; y: number } | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const visited = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    dist[start.y][start.x] = 0;
    const queue: { x: number; y: number; d: number }[] = [{ x: start.x, y: start.y, d: 0 }];
    const dirs = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found = false;
    while (queue.length > 0 && !found) {
      queue.sort((a, b) => a.d - b.d);
      const cur = queue.shift()!;
      if (visited.has(key(cur.x, cur.y))) continue;
      visited.add(key(cur.x, cur.y));
      if (cur.x === goal.x && cur.y === goal.y) { found = true; break; }
      if (g[cur.y][cur.x].type !== "start") g[cur.y][cur.x].type = "closed";
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || g[ny][nx].type === "wall") continue;
        const cost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const nd = cur.d + cost;
        if (nd < dist[ny][nx]) {
          dist[ny][nx] = nd; parent[ny][nx] = { x: cur.x, y: cur.y };
          queue.push({ x: nx, y: ny, d: nd });
          if (g[ny][nx].type !== "goal") g[ny][nx].type = "open";
        }
      }
      if (visited.size % 3 === 0) { setGrid(g.map(r => r.map(c => ({ ...c })))); await new Promise(r => setTimeout(r, stepDelay)); }
    }
    if (found) {
      let cx = goal.x, cy = goal.y;
      while (parent[cy][cx]) {
        if (g[cy][cx].type !== "start" && g[cy][cx].type !== "goal") g[cy][cx].type = "path";
        const p = parent[cy][cx]!; cx = p.x; cy = p.y;
      }
    }
    setGrid(g.map(r => r.map(c => ({ ...c })))); setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, clearPath]);

  const runPotentialField = useCallback(async () => {
    setIsRunning(true); clearPath(); await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const walls: { x: number; y: number }[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x].type === "wall") walls.push({ x, y });

    let px = start.x, py = start.y;
    const path: { x: number; y: number }[] = [{ x: px, y: py }];
    const maxSteps = 2000;
    const stepSize = 0.5;

    for (let step = 0; step < maxSteps; step++) {
      const distToGoal = Math.sqrt((px - goal.x) ** 2 + (py - goal.y) ** 2);
      if (distToGoal < 1) break;

      // Attractive force toward goal
      let fx = potentialAttractive * (goal.x - px) / distToGoal;
      let fy = potentialAttractive * (goal.y - py) / distToGoal;

      // Repulsive force from walls
      const repulseRange = 5;
      for (const w of walls) {
        const dx = px - w.x, dy = py - w.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < repulseRange && d > 0.1) {
          const strength = potentialRepulsive * (1 / d - 1 / repulseRange) / (d * d);
          fx += strength * dx / d;
          fy += strength * dy / d;
        }
      }

      const mag = Math.sqrt(fx * fx + fy * fy);
      if (mag > 0) { px += (fx / mag) * stepSize; py += (fy / mag) * stepSize; }
      px = Math.max(0, Math.min(cols - 1, px));
      py = Math.max(0, Math.min(rows - 1, py));
      path.push({ x: px, y: py });

      const ix = Math.round(px), iy = Math.round(py);
      if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type === "empty") g[iy][ix].type = "potential";

      if (step % 5 === 0) { setGrid(g.map(r => r.map(c => ({ ...c })))); await new Promise(r => setTimeout(r, stepDelay)); }
    }

    // Mark final path
    for (const p of path) {
      const ix = Math.round(p.x), iy = Math.round(p.y);
      if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type !== "start" && g[iy][ix].type !== "goal")
        g[iy][ix].type = "path";
    }
    setGrid(g.map(r => r.map(c => ({ ...c })))); setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, potentialAttractive, potentialRepulsive, clearPath]);

  const runRRT = useCallback(async () => {
    setIsRunning(true); clearPath(); await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const tree: RRTNode[] = [{ x: start.x, y: start.y, parent: null }];
    const isWall = (x: number, y: number) => { const ix = Math.round(x), iy = Math.round(y); return ix < 0 || iy < 0 || ix >= cols || iy >= rows || g[iy][ix].type === "wall"; };
    const lineCollision = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = Math.ceil(Math.sqrt((x2-x1)**2 + (y2-y1)**2));
      for (let i = 0; i <= steps; i++) { const t = i / Math.max(1, steps); if (isWall(x1+(x2-x1)*t, y1+(y2-y1)*t)) return true; }
      return false;
    };
    let found: RRTNode | null = null;
    for (let iter = 0; iter < rrtMaxIter && !found; iter++) {
      let rx: number, ry: number;
      if (Math.random() < 0.1) { rx = goal.x; ry = goal.y; } else { rx = Math.random() * cols; ry = Math.random() * rows; }
      let nearest = tree[0]; let minDist = Infinity;
      for (const node of tree) { const d = (node.x-rx)**2 + (node.y-ry)**2; if (d < minDist) { minDist = d; nearest = node; } }
      const dist = Math.sqrt((rx-nearest.x)**2 + (ry-nearest.y)**2);
      const step = Math.min(rrtStepSize, dist);
      const nx = nearest.x + (rx-nearest.x)/dist*step;
      const ny = nearest.y + (ry-nearest.y)/dist*step;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || lineCollision(nearest.x, nearest.y, nx, ny)) continue;
      const newNode: RRTNode = { x: nx, y: ny, parent: nearest };
      tree.push(newNode);
      const ix = Math.round(nx), iy = Math.round(ny);
      if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type === "empty") g[iy][ix].type = "rrt-tree";
      const goalDist = Math.sqrt((nx-goal.x)**2 + (ny-goal.y)**2);
      if (goalDist < rrtStepSize && !lineCollision(nx, ny, goal.x, goal.y)) found = { x: goal.x, y: goal.y, parent: newNode };
      if (iter % 10 === 0) { setGrid(g.map(r => r.map(c => ({ ...c })))); await new Promise(r => setTimeout(r, stepDelay)); }
    }
    if (found) {
      let node: RRTNode | null = found;
      while (node) { const ix = Math.round(node.x), iy = Math.round(node.y); if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type !== "start" && g[iy][ix].type !== "goal") g[iy][ix].type = "rrt-path"; node = node.parent; }
    }
    setGrid(g.map(r => r.map(c => ({ ...c })))); setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, rrtStepSize, rrtMaxIter, clearPath]);

  // PRM algorithm
  const runPRM = useCallback(async () => {
    setIsRunning(true); clearPath(); await new Promise(r => setTimeout(r, 50));
    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const isWall = (x: number, y: number) => {
      const ix = Math.round(x), iy = Math.round(y);
      return ix < 0 || iy < 0 || ix >= cols || iy >= rows || g[iy][ix].type === "wall";
    };
    const lineCollision = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = Math.ceil(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 2);
      for (let i = 0; i <= steps; i++) {
        const t = i / Math.max(1, steps);
        if (isWall(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
      }
      return false;
    };

    // Sample nodes
    interface PRMNode { x: number; y: number; neighbors: number[]; }
    const nodes: PRMNode[] = [
      { x: start.x, y: start.y, neighbors: [] },
      { x: goal.x, y: goal.y, neighbors: [] },
    ];
    for (let i = 0; i < prmNodes; i++) {
      const x = Math.random() * cols;
      const y = Math.random() * rows;
      if (!isWall(x, y)) nodes.push({ x, y, neighbors: [] });
    }

    // Mark nodes on grid
    for (let i = 2; i < nodes.length; i++) {
      const ix = Math.round(nodes[i].x), iy = Math.round(nodes[i].y);
      if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type === "empty") g[iy][ix].type = "prm-node";
    }
    setGrid(g.map(r => r.map(c => ({ ...c })))); await new Promise(r => setTimeout(r, stepDelay * 5));

    // Connect k-nearest neighbors
    for (let i = 0; i < nodes.length; i++) {
      const dists = nodes.map((n, j) => ({ j, d: Math.sqrt((n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2) }));
      dists.sort((a, b) => a.d - b.d);
      for (let k = 1; k <= Math.min(prmK, dists.length - 1); k++) {
        const j = dists[k].j;
        if (!lineCollision(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)) {
          if (!nodes[i].neighbors.includes(j)) nodes[i].neighbors.push(j);
          if (!nodes[j].neighbors.includes(i)) nodes[j].neighbors.push(i);
        }
      }
    }

    // Dijkstra on roadmap graph
    const dist = Array(nodes.length).fill(Infinity);
    const parent = Array(nodes.length).fill(-1);
    const visited = new Set<number>();
    dist[0] = 0;
    const queue = [{ idx: 0, d: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.d - b.d);
      const { idx } = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      if (idx === 1) break; // goal found
      for (const ni of nodes[idx].neighbors) {
        const nd = dist[idx] + Math.sqrt((nodes[ni].x - nodes[idx].x) ** 2 + (nodes[ni].y - nodes[idx].y) ** 2);
        if (nd < dist[ni]) {
          dist[ni] = nd;
          parent[ni] = idx;
          queue.push({ idx: ni, d: nd });
        }
      }
    }

    // Trace path
    if (dist[1] < Infinity) {
      let cur = 1;
      while (cur !== -1 && cur !== 0) {
        const ix = Math.round(nodes[cur].x), iy = Math.round(nodes[cur].y);
        if (ix >= 0 && iy >= 0 && ix < cols && iy < rows && g[iy][ix].type !== "start" && g[iy][ix].type !== "goal")
          g[iy][ix].type = "prm-path";
        cur = parent[cur];
      }
    }

    setGrid(g.map(r => r.map(c => ({ ...c })))); setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, prmNodes, prmK, clearPath]);

  const runAlgorithm = useCallback(() => {
    if (algorithm === "astar") runAStar();
    else if (algorithm === "dijkstra") runDijkstra();
    else if (algorithm === "potential") runPotentialField();
    else if (algorithm === "prm") runPRM();
    else runRRT();
  }, [algorithm, runAStar, runDijkstra, runPotentialField, runRRT, runPRM]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const render = () => {
      const container = containerRef.current; if (!container) return;
      const dpr = window.devicePixelRatio;
      const cw = container.clientWidth; const ch = container.clientHeight;
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, cw, ch);
      const cellW = Math.min(GRID_SIZE, cw / cols); const cellH = Math.min(GRID_SIZE, ch / rows);
      const cellSize = Math.min(cellW, cellH);
      const offsetX = (cw - cellSize * cols) / 2; const offsetY = (ch - cellSize * rows) / 2;
      const colors: Record<string, string> = {
        empty: "hsl(225, 14%, 9%)", wall: "hsl(225, 12%, 22%)", start: "hsl(175, 80%, 50%)",
        goal: "hsl(40, 90%, 55%)", open: "hsl(210, 55%, 22%)", closed: "hsl(225, 15%, 14%)",
        path: "hsl(150, 70%, 45%)", "rrt-tree": "hsl(270, 35%, 20%)", "rrt-path": "hsl(270, 60%, 50%)",
        potential: "hsl(15, 60%, 20%)",
      };
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid[y]?.[x]; if (!cell) continue;
          const px = offsetX + x * cellSize; const py = offsetY + y * cellSize;
          ctx.fillStyle = colors[cell.type] || colors.empty;
          ctx.beginPath(); ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, 2); ctx.fill();
        }
      }
      ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "11px 'Inter', sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`${algorithm.toUpperCase()} | ${cols}×${rows}`, 15, offsetY - 8);
    };
    render();
    const getCell = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cellSize = Math.min(Math.min(GRID_SIZE, rect.width / cols), rect.height / rows);
      const offsetX = (rect.width - cellSize * cols) / 2; const offsetY = (rect.height - cellSize * rows) / 2;
      const cx = Math.floor((e.clientX - rect.left - offsetX) / cellSize);
      const cy = Math.floor((e.clientY - rect.top - offsetY) / cellSize);
      return (cx >= 0 && cy >= 0 && cx < cols && cy < rows) ? { x: cx, y: cy } : null;
    };
    const paint = (e: MouseEvent) => {
      const c = getCell(e); if (!c || isRunning) return;
      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })));
        if (tool === "wall" && next[c.y][c.x].type === "empty") next[c.y][c.x].type = "wall";
        else if (tool === "erase" && next[c.y][c.x].type === "wall") next[c.y][c.x].type = "empty";
        else if (tool === "start") { for (const r of next) for (const cell of r) if (cell.type === "start") cell.type = "empty"; next[c.y][c.x].type = "start"; setStart({ x: c.x, y: c.y }); }
        else if (tool === "goal") { for (const r of next) for (const cell of r) if (cell.type === "goal") cell.type = "empty"; next[c.y][c.x].type = "goal"; setGoal({ x: c.x, y: c.y }); }
        return next;
      });
    };
    const onDown = (e: MouseEvent) => { paintingRef.current = true; paint(e); };
    const onMove = (e: MouseEvent) => { if (paintingRef.current) paint(e); };
    const onUp = () => { paintingRef.current = false; };
    canvas.addEventListener("mousedown", onDown); canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp); canvas.addEventListener("mouseleave", onUp);
    return () => { canvas.removeEventListener("mousedown", onDown); canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseup", onUp); canvas.removeEventListener("mouseleave", onUp); };
  }, [grid, cols, rows, tool, isRunning, algorithm]);

  const addRandomWalls = useCallback(() => {
    setGrid(prev => { const next = prev.map(r => r.map(c => ({ ...c }))); for (let i = 0; i < cols * rows * 0.25; i++) { const x = Math.floor(Math.random() * cols); const y = Math.floor(Math.random() * rows); if (next[y][x].type === "empty") next[y][x].type = "wall"; } return next; });
  }, [cols, rows]);

  const controls = (
    <>
      <ControlSection title="Tools">
        <div className="grid grid-cols-2 gap-2">
          {(["wall", "erase", "start", "goal"] as const).map(t => (
            <button key={t} onClick={() => setTool(t)} className={`sim-btn ${tool === t ? "sim-btn-active" : "sim-btn-inactive"} capitalize`}>
              {t === "wall" ? "🧱 Wall" : t === "erase" ? "🧹 Erase" : t === "start" ? "🟢 Start" : "🎯 Goal"}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Algorithm">
        <div className="grid grid-cols-2 gap-2">
          {(["astar", "dijkstra", "rrt", "potential"] as const).map(a => (
            <button key={a} onClick={() => setAlgorithm(a)}
              className={`sim-btn ${algorithm === a ? "sim-btn-active" : "sim-btn-inactive"}`}
              style={algorithm === a && a === "rrt" ? { borderColor: "hsl(270, 60%, 55%)", color: "hsl(270, 60%, 55%)" } : algorithm === a && a === "potential" ? { borderColor: "hsl(15, 80%, 55%)", color: "hsl(15, 80%, 55%)" } : {}}>
              {a === "astar" ? "A*" : a === "dijkstra" ? "Dijkstra" : a === "rrt" ? "RRT" : "Potential"}
            </button>
          ))}
        </div>
        {algorithm === "rrt" && (
          <div className="space-y-2 mt-2">
            <SliderControl label="Step Size" value={rrtStepSize} min={1} max={8} step={0.5} onChange={setRrtStepSize} color="hsl(270, 60%, 55%)" />
            <SliderControl label="Max Iterations" value={rrtMaxIter} min={500} max={10000} step={100} onChange={v => setRrtMaxIter(Math.round(v))} color="hsl(270, 60%, 55%)" />
          </div>
        )}
        {algorithm === "potential" && (
          <div className="space-y-2 mt-2">
            <SliderControl label="Attractive Gain" value={potentialAttractive} min={0.1} max={5} step={0.1} onChange={setPotentialAttractive} color="hsl(15, 80%, 55%)" />
            <SliderControl label="Repulsive Gain" value={potentialRepulsive} min={10} max={500} step={10} onChange={v => setPotentialRepulsive(Math.round(v))} color="hsl(15, 80%, 55%)" />
          </div>
        )}
      </ControlSection>
      <ControlSection title="Actions">
        <div className="flex flex-col gap-2">
          <button onClick={runAlgorithm} disabled={isRunning} className={`sim-btn w-full ${isRunning ? "opacity-50 border-border text-muted-foreground" : "sim-btn-active"}`}>
            {isRunning ? "⏳ Computing..." : "▶ Run Pathfinding"}
          </button>
          <div className="flex gap-2">
            <button onClick={addRandomWalls} disabled={isRunning} className="flex-1 sim-btn sim-btn-inactive">Random Walls</button>
            <button onClick={() => setGrid(initGrid())} disabled={isRunning} className="flex-1 sim-btn sim-btn-inactive">Clear All</button>
          </div>
          <button onClick={clearPath} disabled={isRunning} className="sim-btn sim-btn-inactive w-full">Clear Path Only</button>
        </div>
      </ControlSection>
      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary">A*</span> & <span className="text-blue-glow">Dijkstra</span>: optimal graph search.
          <span className="text-purple-glow"> RRT</span>: random tree exploration.
          <span style={{ color: "hsl(15, 80%, 55%)" }}> Potential Field</span>: gradient descent with attractive/repulsive forces.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Motion Planning Studio" subtitle="A* · Dijkstra · RRT · Potential Field" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default MotionPlanningStudio;
