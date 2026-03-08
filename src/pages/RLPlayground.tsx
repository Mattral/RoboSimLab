import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { exportToCSV } from "@/components/DataExport";

const GRID = 12;
type Action = 0 | 1 | 2 | 3;
const ACTIONS: Action[] = [0, 1, 2, 3];
const DIR = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const ARROWS = ["↑", "→", "↓", "←"];

interface CellType { reward: number; wall: boolean; terminal: boolean; }

const RLPlayground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [lr, setLr] = useState(0.1);
  const [gamma, setGamma] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.2);
  const [speed, setSpeed] = useState(10);
  const [running, setRunning] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [showPolicy, setShowPolicy] = useState(true);
  const [episode, setEpisode] = useState(0);
  const [totalReward, setTotalReward] = useState(0);

  const worldRef = useRef<CellType[][]>([]);
  const qTableRef = useRef<number[][][]>([]);
  const agentRef = useRef({ row: GRID - 1, col: 0 });
  const episodeRef = useRef(0);
  const rewardHistRef = useRef<number[]>([]);

  const initWorld = useCallback(() => {
    const world: CellType[][] = []; const qTable: number[][][] = [];
    for (let r = 0; r < GRID; r++) { world[r] = []; qTable[r] = []; for (let c = 0; c < GRID; c++) { world[r][c] = { reward: -0.1, wall: false, terminal: false }; qTable[r][c] = [0, 0, 0, 0]; } }
    world[0][GRID - 1] = { reward: 10, wall: false, terminal: true };
    world[GRID - 2][GRID - 2] = { reward: -5, wall: false, terminal: true };
    world[Math.floor(GRID / 2)][Math.floor(GRID / 2)] = { reward: -5, wall: false, terminal: true };
    const walls = [[2,2],[2,3],[2,4],[3,4],[5,1],[5,2],[7,5],[7,6],[7,7],[4,8],[4,9],[8,3],[1,6],[9,7],[9,8]];
    for (const [wr, wc] of walls) if (wr < GRID && wc < GRID) world[wr][wc] = { reward: 0, wall: true, terminal: false };
    world[0][GRID - 2] = { reward: 1, wall: false, terminal: false };
    world[1][GRID - 1] = { reward: 1, wall: false, terminal: false };
    worldRef.current = world; qTableRef.current = qTable;
    agentRef.current = { row: GRID - 1, col: 0 }; episodeRef.current = 0; rewardHistRef.current = [];
    setEpisode(0); setTotalReward(0);
  }, []);

  useEffect(() => { initWorld(); }, [initWorld]);

  const stepAgent = useCallback(() => {
    const world = worldRef.current; const Q = qTableRef.current; const agent = agentRef.current;
    if (world.length === 0) return;
    if (world[agent.row]?.[agent.col]?.terminal) {
      rewardHistRef.current.push(totalReward); if (rewardHistRef.current.length > 200) rewardHistRef.current.shift();
      agent.row = GRID - 1; agent.col = 0; episodeRef.current++; setEpisode(episodeRef.current); setTotalReward(0); return;
    }
    let action: Action;
    if (Math.random() < epsilon) action = ACTIONS[Math.floor(Math.random() * 4)];
    else { const qValues = Q[agent.row][agent.col]; action = qValues.indexOf(Math.max(...qValues)) as Action; }
    const [dr, dc] = DIR[action];
    let nr = agent.row + dr, nc = agent.col + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || world[nr][nc].wall) { nr = agent.row; nc = agent.col; }
    const reward = world[nr][nc].reward; const maxNextQ = Math.max(...Q[nr][nc]);
    Q[agent.row][agent.col][action] += lr * (reward + gamma * maxNextQ - Q[agent.row][agent.col][action]);
    agent.row = nr; agent.col = nc; setTotalReward(prev => prev + reward);
  }, [lr, gamma, epsilon, totalReward]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => { for (let i = 0; i < speed; i++) stepAgent(); }, 16);
    return () => clearInterval(interval);
  }, [running, speed, stepAgent]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const container = containerRef.current; if (!container) return;
      const dpr = window.devicePixelRatio; const w = container.clientWidth; const h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      const world = worldRef.current; const Q = qTableRef.current; const agent = agentRef.current;
      if (world.length === 0) return;
      const gridArea = Math.min(w * 0.55, h * 0.85); const cellSize = gridArea / GRID;
      const offsetX = 30; const offsetY = (h - gridArea) / 2;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const cell = world[r][c]; const px = offsetX + c * cellSize; const py = offsetY + r * cellSize;
          if (cell.wall) ctx.fillStyle = "hsl(225, 12%, 20%)";
          else if (cell.terminal && cell.reward > 0) ctx.fillStyle = "hsl(150, 70%, 18%)";
          else if (cell.terminal && cell.reward < 0) ctx.fillStyle = "hsl(0, 50%, 16%)";
          else if (showValues && Q[r]?.[c]) {
            const maxQ = Math.max(...Q[r][c]); const range = Math.max(0.1, Math.abs(maxQ));
            const norm = Math.max(-1, Math.min(1, maxQ / (range + 5)));
            ctx.fillStyle = norm > 0 ? `hsla(175, 70%, ${10 + norm * 20}%, 1)` : `hsla(0, 50%, ${10 + Math.abs(norm) * 15}%, 1)`;
          } else ctx.fillStyle = "hsl(225, 14%, 9%)";
          ctx.beginPath(); ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, 2); ctx.fill();
          if (cell.terminal) {
            ctx.fillStyle = cell.reward > 0 ? "hsl(150, 70%, 55%)" : "hsl(0, 65%, 52%)";
            ctx.font = `${Math.max(10, cellSize * 0.3)}px 'Inter'`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(cell.reward > 0 ? "★" : "✕", px + cellSize / 2, py + cellSize / 2);
          }
          if (showPolicy && !cell.wall && !cell.terminal && Q[r]?.[c]) {
            const qValues = Q[r][c]; const maxQ = Math.max(...qValues);
            if (maxQ !== 0) {
              ctx.fillStyle = "hsla(175, 80%, 50%, 0.7)"; ctx.font = `${Math.max(10, cellSize * 0.35)}px sans-serif`;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(ARROWS[qValues.indexOf(maxQ)], px + cellSize / 2, py + cellSize / 2);
            }
          }
          if (showValues && !cell.wall && !cell.terminal && Q[r]?.[c]) {
            const maxQ = Math.max(...Q[r][c]);
            if (Math.abs(maxQ) > 0.01) {
              ctx.fillStyle = "hsla(220, 10%, 50%, 0.6)"; ctx.font = `${Math.max(7, cellSize * 0.15)}px 'JetBrains Mono'`;
              ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(maxQ.toFixed(1), px + cellSize / 2, py + cellSize - 3);
            }
          }
        }
      }
      // Agent
      const ax = offsetX + agent.col * cellSize + cellSize / 2; const ay = offsetY + agent.row * cellSize + cellSize / 2;
      ctx.fillStyle = "hsl(40, 90%, 55%)"; ctx.beginPath(); ctx.arc(ax, ay, cellSize * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsl(40, 90%, 75%)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, cellSize * 0.3, 0, Math.PI * 2); ctx.stroke();
      // Learning curve
      const chartX = offsetX + gridArea + 40; const chartY = offsetY; const chartW = w - chartX - 20; const chartH = gridArea * 0.5;
      if (chartW > 80) {
        ctx.fillStyle = "hsla(225, 14%, 8%, 0.9)"; ctx.fillRect(chartX - 5, chartY - 5, chartW + 10, chartH + 30);
        ctx.strokeStyle = "hsl(225, 12%, 16%)"; ctx.lineWidth = 1; ctx.strokeRect(chartX - 5, chartY - 5, chartW + 10, chartH + 30);
        ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "10px 'Inter'"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("EPISODE REWARD", chartX, chartY + 3);
        const hist = rewardHistRef.current;
        if (hist.length > 1) {
          const maxR = Math.max(1, ...hist.map(Math.abs));
          ctx.strokeStyle = "hsl(175, 80%, 50%)"; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let i = 0; i < hist.length; i++) { const x = chartX + (i / (hist.length - 1)) * chartW; const y = chartY + chartH / 2 - (hist[i] / maxR) * (chartH / 2) * 0.8 + 10; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
          if (hist.length > 10) {
            ctx.strokeStyle = "hsl(40, 90%, 55%)"; ctx.lineWidth = 2; ctx.beginPath(); const wSize = 10;
            for (let i = wSize; i < hist.length; i++) { const avg = hist.slice(i - wSize, i).reduce((a, b) => a + b, 0) / wSize; const x = chartX + (i / (hist.length - 1)) * chartW; const y = chartY + chartH / 2 - (avg / maxR) * (chartH / 2) * 0.8 + 10; if (i === wSize) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
          }
        }
        ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "9px 'Inter'"; ctx.textAlign = "left";
        ctx.fillText(`Episode: ${episode}`, chartX, chartY + chartH + 35);
        ctx.fillText(`ε: ${epsilon.toFixed(2)}  γ: ${gamma.toFixed(2)}  α: ${lr.toFixed(2)}`, chartX, chartY + chartH + 50);
      }
      ctx.fillStyle = "hsl(220, 10%, 42%)"; ctx.font = "11px 'Inter'"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`Q-Learning · Episode ${episode} · ${running ? "TRAINING" : "PAUSED"}`, 15, 15);
    };
    draw(); return () => cancelAnimationFrame(animRef.current);
  }, [episode, running, showValues, showPolicy, epsilon, gamma, lr]);

  const controls = (
    <>
      <ControlSection title="Hyperparameters">
        <SliderControl label="Learning Rate (α)" value={lr} min={0.01} max={0.5} step={0.01} onChange={setLr} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Discount (γ)" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Exploration (ε)" value={epsilon} min={0} max={1} step={0.01} onChange={setEpsilon} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Steps/Frame" value={speed} min={1} max={100} step={1} onChange={v => setSpeed(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowValues(!showValues)} className={`flex-1 sim-btn ${showValues ? "sim-btn-active" : "sim-btn-inactive"}`}>Q-Values</button>
          <button onClick={() => setShowPolicy(!showPolicy)} className={`flex-1 sim-btn ${showPolicy ? "sim-btn-active" : "sim-btn-inactive"}`}>Policy</button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Train"}</button>
          <button onClick={() => { initWorld(); setRunning(false); }} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(rewardHistRef.current.map((r, i) => ({ episode: i, reward: r })), "rl_rewards")} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="RL Playground" subtitle="Q-Learning Grid World" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default RLPlayground;
