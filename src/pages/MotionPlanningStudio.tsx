import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import ControlSection from "@/components/ControlSection";

interface Cell {
  x: number;
  y: number;
  type: "empty" | "wall" | "start" | "goal" | "open" | "closed" | "path";
}

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const GRID_SIZE = 30;

const MotionPlanningStudio = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [cols, setCols] = useState(40);
  const [rows, setRows] = useState(25);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [start, setStart] = useState({ x: 2, y: 2 });
  const [goal, setGoal] = useState({ x: 37, y: 22 });
  const [tool, setTool] = useState<"wall" | "start" | "goal" | "erase">("wall");
  const [algorithm, setAlgorithm] = useState<"astar" | "rrt">("astar");
  const [isRunning, setIsRunning] = useState(false);
  const [stepDelay, setStepDelay] = useState(20);
  const paintingRef = useRef(false);
  const stepsRef = useRef<{ open: Cell[]; closed: Cell[]; path: Cell[] }>({ open: [], closed: [], path: [] });

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
    stepsRef.current = { open: [], closed: [], path: [] };
    return g;
  }, [rows, cols, start, goal]);

  useEffect(() => {
    setGrid(initGrid());
  }, [initGrid]);

  const clearPath = useCallback(() => {
    setGrid(prev => prev.map(row => row.map(cell =>
      cell.type === "open" || cell.type === "closed" || cell.type === "path"
        ? { ...cell, type: "empty" as const }
        : cell
    )));
    stepsRef.current = { open: [], closed: [], path: [] };
  }, []);

  const runAStar = useCallback(async () => {
    setIsRunning(true);
    clearPath();

    await new Promise(r => setTimeout(r, 50));

    const g = grid.map(row => row.map(cell => ({ ...cell })));
    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;

    const h = (x: number, y: number) =>
      Math.abs(x - goal.x) + Math.abs(y - goal.y);

    openSet.push({ x: start.x, y: start.y, g: 0, h: h(start.x, start.y), f: h(start.x, start.y), parent: null });

    const dirs = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    let found: Node | null = null;

    while (openSet.length > 0 && !found) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      closedSet.add(key(current.x, current.y));

      if (current.x === goal.x && current.y === goal.y) {
        found = current;
        break;
      }

      // Visualize
      if (g[current.y][current.x].type !== "start") {
        g[current.y][current.x].type = "closed";
      }

      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (g[ny][nx].type === "wall") continue;
        if (closedSet.has(key(nx, ny))) continue;

        const isDiag = dx !== 0 && dy !== 0;
        const cost = isDiag ? 1.414 : 1;
        const ng = current.g + cost;

        const existing = openSet.find(n => n.x === nx && n.y === ny);
        if (!existing) {
          const node: Node = { x: nx, y: ny, g: ng, h: h(nx, ny), f: ng + h(nx, ny), parent: current };
          openSet.push(node);
          if (g[ny][nx].type !== "goal") g[ny][nx].type = "open";
        } else if (ng < existing.g) {
          existing.g = ng;
          existing.f = ng + existing.h;
          existing.parent = current;
        }
      }

      // Update display periodically
      if (closedSet.size % 3 === 0) {
        setGrid(g.map(row => row.map(cell => ({ ...cell }))));
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }

    // Trace path
    if (found) {
      let node: Node | null = found;
      while (node) {
        if (g[node.y][node.x].type !== "start" && g[node.y][node.x].type !== "goal") {
          g[node.y][node.x].type = "path";
        }
        node = node.parent;
      }
    }

    setGrid(g.map(row => row.map(cell => ({ ...cell }))));
    setIsRunning(false);
  }, [grid, start, goal, cols, rows, stepDelay, clearPath]);

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
        empty: "hsl(220, 18%, 10%)",
        wall: "hsl(220, 15%, 25%)",
        start: "hsl(175, 80%, 50%)",
        goal: "hsl(40, 90%, 55%)",
        open: "hsl(210, 60%, 25%)",
        closed: "hsl(220, 20%, 16%)",
        path: "hsl(150, 70%, 45%)",
      };

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid[y]?.[x];
          if (!cell) continue;
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;

          ctx.fillStyle = colors[cell.type] || colors.empty;
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Grid lines
          ctx.strokeStyle = "hsl(220, 15%, 12%)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }

      // Labels
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Algorithm: ${algorithm.toUpperCase()} | Grid: ${cols}×${rows}`, 15, offsetY - 8);
    };

    render();

    // Mouse handling
    const getCell = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      const cellSize = Math.min(Math.min(GRID_SIZE, cw / cols), ch / rows);
      const offsetX = (cw - cellSize * cols) / 2;
      const offsetY = (ch - cellSize * rows) / 2;
      const mx = e.clientX - rect.left - offsetX;
      const my = e.clientY - rect.top - offsetY;
      const cx = Math.floor(mx / cellSize);
      const cy = Math.floor(my / cellSize);
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) return { x: cx, y: cy };
      return null;
    };

    const paint = (e: MouseEvent) => {
      const c = getCell(e);
      if (!c || isRunning) return;
      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell })));
        if (tool === "wall" && next[c.y][c.x].type === "empty") {
          next[c.y][c.x].type = "wall";
        } else if (tool === "erase" && next[c.y][c.x].type === "wall") {
          next[c.y][c.x].type = "empty";
        } else if (tool === "start") {
          // Remove old start
          for (const row of next) for (const cell of row) if (cell.type === "start") cell.type = "empty";
          next[c.y][c.x].type = "start";
          setStart({ x: c.x, y: c.y });
        } else if (tool === "goal") {
          for (const row of next) for (const cell of row) if (cell.type === "goal") cell.type = "empty";
          next[c.y][c.x].type = "goal";
          setGoal({ x: c.x, y: c.y });
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
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`text-xs font-mono py-2 rounded border transition-colors capitalize ${
                tool === t ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
              }`}
            >
              {t === "wall" ? "🧱 Wall" : t === "erase" ? "🧹 Erase" : t === "start" ? "🟢 Start" : "🎯 Goal"}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Algorithm">
        <div className="flex gap-2">
          <button
            onClick={() => setAlgorithm("astar")}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${
              algorithm === "astar" ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            A* Search
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Actions">
        <div className="flex flex-col gap-2">
          <button
            onClick={runAStar}
            disabled={isRunning}
            className={`text-xs font-mono py-2 rounded border transition-colors ${
              isRunning ? "opacity-50 border-border text-muted-foreground" : "border-primary text-primary hover:bg-primary/10"
            }`}
          >
            {isRunning ? "⏳ Computing..." : "▶ Run Pathfinding"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={addRandomWalls}
              disabled={isRunning}
              className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
            >
              Random Walls
            </button>
            <button
              onClick={() => setGrid(initGrid())}
              disabled={isRunning}
              className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
            >
              Clear All
            </button>
          </div>
          <button
            onClick={clearPath}
            disabled={isRunning}
            className="text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
          >
            Clear Path Only
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Draw walls on the grid, place start and goal positions, then run <span className="text-primary">A* pathfinding</span>. 
          Watch the algorithm explore the space — <span className="text-blue-glow">blue</span> cells are explored, 
          <span className="text-green-glow"> green</span> shows the optimal path.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Motion Planning Studio" subtitle="Path Planning Algorithms" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default MotionPlanningStudio;
