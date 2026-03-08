import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { exportToCSV } from "@/components/DataExport";

const GRID = 10;
type Action = 0 | 1 | 2 | 3;
const ACTIONS: Action[] = [0, 1, 2, 3];
const DIR = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const ARROWS = ["↑", "→", "↓", "←"];

const RLPolicyIntrospection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [lr, setLr] = useState(0.1);
  const [gamma, setGamma] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.15);
  const [speed, setSpeed] = useState(20);
  const [running, setRunning] = useState(false);
  const [episode, setEpisode] = useState(0);
  const [showPolicy, setShowPolicy] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [showVisitation, setShowVisitation] = useState(true);
  const [showEntropy, setShowEntropy] = useState(true);
  const [totalReward, setTotalReward] = useState(0);

  const worldRef = useRef<{ reward: number; wall: boolean; terminal: boolean }[][]>([]);
  const qTableRef = useRef<number[][][]>([]);
  const visitCountRef = useRef<number[][]>([]);
  const agentRef = useRef({ row: GRID - 1, col: 0 });
  const episodeRef = useRef(0);
  const rewardHistRef = useRef<number[]>([]);
  const entropyHistRef = useRef<number[]>([]);
  const successHistRef = useRef<boolean[]>([]);

  const initWorld = useCallback(() => {
    const world: typeof worldRef.current = [];
    const Q: number[][][] = [];
    const visits: number[][] = [];
    for (let r = 0; r < GRID; r++) {
      world[r] = []; Q[r] = []; visits[r] = [];
      for (let c = 0; c < GRID; c++) {
        world[r][c] = { reward: -0.1, wall: false, terminal: false };
        Q[r][c] = [0, 0, 0, 0];
        visits[r][c] = 0;
      }
    }
    world[0][GRID - 1] = { reward: 10, wall: false, terminal: true };
    world[GRID - 1][GRID - 1] = { reward: -5, wall: false, terminal: true };
    const walls = [[1, 3], [2, 3], [3, 3], [5, 1], [5, 2], [5, 3], [7, 5], [7, 6], [3, 7], [4, 7]];
    for (const [wr, wc] of walls) if (wr < GRID && wc < GRID) world[wr][wc] = { reward: 0, wall: true, terminal: false };
    worldRef.current = world;
    qTableRef.current = Q;
    visitCountRef.current = visits;
    agentRef.current = { row: GRID - 1, col: 0 };
    episodeRef.current = 0;
    rewardHistRef.current = [];
    entropyHistRef.current = [];
    successHistRef.current = [];
    setEpisode(0);
    setTotalReward(0);
  }, []);

  useEffect(() => { initWorld(); }, [initWorld]);

  const computeEntropy = useCallback(() => {
    let totalEntropy = 0;
    let count = 0;
    const Q = qTableRef.current;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (worldRef.current[r]?.[c]?.wall || worldRef.current[r]?.[c]?.terminal) continue;
        const qv = Q[r]?.[c];
        if (!qv) continue;
        const maxQ = Math.max(...qv);
        const exps = qv.map(q => Math.exp(q - maxQ));
        const sumExp = exps.reduce((a, b) => a + b, 0);
        const probs = exps.map(e => e / sumExp);
        let H = 0;
        for (const p of probs) { if (p > 0.001) H -= p * Math.log2(p); }
        totalEntropy += H;
        count++;
      }
    }
    return count > 0 ? totalEntropy / count : 0;
  }, []);

  const stepAgent = useCallback(() => {
    const world = worldRef.current;
    const Q = qTableRef.current;
    const agent = agentRef.current;
    const visits = visitCountRef.current;
    if (world.length === 0) return;

    if (world[agent.row]?.[agent.col]?.terminal) {
      const success = world[agent.row][agent.col].reward > 0;
      successHistRef.current.push(success);
      if (successHistRef.current.length > 200) successHistRef.current.shift();
      rewardHistRef.current.push(totalReward);
      if (rewardHistRef.current.length > 200) rewardHistRef.current.shift();
      entropyHistRef.current.push(computeEntropy());
      if (entropyHistRef.current.length > 200) entropyHistRef.current.shift();
      agent.row = GRID - 1; agent.col = 0;
      episodeRef.current++;
      setEpisode(episodeRef.current);
      setTotalReward(0);
      return;
    }

    visits[agent.row][agent.col]++;

    let action: Action;
    if (Math.random() < epsilon) action = ACTIONS[Math.floor(Math.random() * 4)];
    else { const qv = Q[agent.row][agent.col]; action = qv.indexOf(Math.max(...qv)) as Action; }

    const [dr, dc] = DIR[action];
    let nr = agent.row + dr, nc = agent.col + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || world[nr][nc].wall) { nr = agent.row; nc = agent.col; }

    const reward = world[nr][nc].reward;
    const maxNextQ = Math.max(...Q[nr][nc]);
    Q[agent.row][agent.col][action] += lr * (reward + gamma * maxNextQ - Q[agent.row][agent.col][action]);
    agent.row = nr; agent.col = nc;
    setTotalReward(prev => prev + reward);
  }, [lr, gamma, epsilon, totalReward, computeEntropy]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => { for (let i = 0; i < speed; i++) stepAgent(); }, 16);
    return () => clearInterval(interval);
  }, [running, speed, stepAgent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

      const world = worldRef.current;
      const Q = qTableRef.current;
      const visits = visitCountRef.current;
      const agent = agentRef.current;
      if (world.length === 0) return;

      const gridArea = Math.min(w * 0.45, h * 0.55);
      const cellSize = gridArea / GRID;
      const ox = 20, oy = 30;
      const maxVisit = Math.max(1, ...visits.flat());

      // Grid
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const cell = world[r][c];
          const px = ox + c * cellSize;
          const py = oy + r * cellSize;

          if (cell.wall) {
            ctx.fillStyle = "hsl(228, 12%, 18%)";
          } else if (cell.terminal && cell.reward > 0) {
            ctx.fillStyle = "hsl(150, 70%, 16%)";
          } else if (cell.terminal && cell.reward < 0) {
            ctx.fillStyle = "hsl(0, 50%, 14%)";
          } else if (showVisitation) {
            const v = visits[r][c] / maxVisit;
            ctx.fillStyle = `hsl(38, ${60 + v * 30}%, ${6 + v * 18}%)`;
          } else if (showValues && Q[r]?.[c]) {
            const maxQ = Math.max(...Q[r][c]);
            const norm = Math.max(-1, Math.min(1, maxQ / 10));
            ctx.fillStyle = norm > 0 ? `hsl(172, 60%, ${8 + norm * 18}%)` : `hsl(0, 50%, ${8 + Math.abs(norm) * 12}%)`;
          } else {
            ctx.fillStyle = "hsl(228, 14%, 7%)";
          }

          ctx.beginPath(); ctx.roundRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1, 2); ctx.fill();

          if (cell.terminal) {
            ctx.fillStyle = cell.reward > 0 ? "hsl(150, 70%, 55%)" : "hsl(0, 65%, 52%)";
            ctx.font = `${Math.max(9, cellSize * 0.3)}px 'Inter'`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(cell.reward > 0 ? "★" : "✕", px + cellSize / 2, py + cellSize / 2);
          }

          if (showPolicy && !cell.wall && !cell.terminal && Q[r]?.[c]) {
            const qv = Q[r][c]; const maxQ = Math.max(...qv);
            if (maxQ !== 0) {
              ctx.fillStyle = "hsla(172, 80%, 50%, 0.7)";
              ctx.font = `${Math.max(9, cellSize * 0.35)}px sans-serif`;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(ARROWS[qv.indexOf(maxQ)], px + cellSize / 2, py + cellSize / 2);
            }
          }
        }
      }

      // Agent
      const ax = ox + agent.col * cellSize + cellSize / 2;
      const ay = oy + agent.row * cellSize + cellSize / 2;
      ctx.fillStyle = "hsl(38, 90%, 55%)";
      ctx.beginPath(); ctx.arc(ax, ay, cellSize * 0.25, 0, Math.PI * 2); ctx.fill();

      // Dashboard area
      const dashX = ox + gridArea + 30;
      const dashW = w - dashX - 15;
      if (dashW < 80) return;

      // Reward curve
      const chartH = (h - 40) / 3 - 15;
      const drawChart = (data: number[], label: string, color: string, yOff: number, showAvg = true) => {
        if (data.length < 2) return;
        ctx.fillStyle = "hsla(228, 15%, 7%, 0.8)";
        ctx.strokeStyle = "hsl(228, 13%, 13%)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(dashX - 5, yOff - 5, dashW + 10, chartH + 20, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "9px 'Inter'";
        ctx.textAlign = "left";
        ctx.fillText(label, dashX + 3, yOff + 10);
        const maxV = Math.max(0.1, ...data.map(Math.abs));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        data.forEach((v, i) => {
          const x = dashX + (i / (data.length - 1)) * dashW;
          const y = yOff + chartH / 2 - (v / maxV) * (chartH / 2 - 10) + 5;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        if (showAvg && data.length > 10) {
          ctx.strokeStyle = "hsl(38, 88%, 52%)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const wS = 10;
          for (let i = wS; i < data.length; i++) {
            const avg = data.slice(i - wS, i).reduce((a, b) => a + b, 0) / wS;
            const x = dashX + (i / (data.length - 1)) * dashW;
            const y = yOff + chartH / 2 - (avg / maxV) * (chartH / 2 - 10) + 5;
            if (i === wS) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      };

      drawChart(rewardHistRef.current, "EPISODE REWARD", "hsl(172, 78%, 47%)", oy);
      drawChart(entropyHistRef.current, "POLICY ENTROPY", "hsl(268, 58%, 52%)", oy + chartH + 25, false);

      // Success rate
      const succHist = successHistRef.current;
      if (succHist.length > 5) {
        const rates: number[] = [];
        const wSize = Math.min(20, succHist.length);
        for (let i = wSize; i <= succHist.length; i++) {
          const slice = succHist.slice(i - wSize, i);
          rates.push(slice.filter(Boolean).length / wSize);
        }
        drawChart(rates, "SUCCESS RATE (moving avg)", "hsl(152, 68%, 42%)", oy + (chartH + 25) * 2, false);
      }

      // Bottom stats
      const statsY = h - 20;
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      const entropy = entropyHistRef.current[entropyHistRef.current.length - 1] ?? 0;
      const successRate = succHist.length > 10 ? (succHist.slice(-20).filter(Boolean).length / Math.min(20, succHist.length) * 100).toFixed(0) : "—";
      ctx.fillText(`Ep: ${episode}  H: ${entropy.toFixed(2)} bits  Success: ${successRate}%  ${running ? "▶ TRAINING" : "⏸ PAUSED"}`, 15, statsY);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [episode, running, showPolicy, showValues, showVisitation, showEntropy]);

  const controls = (
    <>
      <ControlSection title="Hyperparameters">
        <SliderControl label="Learning Rate (α)" value={lr} min={0.01} max={0.5} step={0.01} onChange={setLr} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Discount (γ)" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} color="hsl(152, 68%, 42%)" />
        <SliderControl label="Exploration (ε)" value={epsilon} min={0} max={1} step={0.01} onChange={setEpsilon} color="hsl(38, 88%, 52%)" />
        <SliderControl label="Steps/Frame" value={speed} min={1} max={100} step={1} onChange={v => setSpeed(Math.round(v))} color="hsl(212, 78%, 52%)" />
      </ControlSection>

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowPolicy(!showPolicy)} className={`sim-btn ${showPolicy ? "sim-btn-active" : "sim-btn-inactive"}`}>Policy</button>
          <button onClick={() => setShowValues(!showValues)} className={`sim-btn ${showValues ? "sim-btn-active" : "sim-btn-inactive"}`}>Values</button>
          <button onClick={() => setShowVisitation(!showVisitation)} className={`sim-btn ${showVisitation ? "sim-btn-active" : "sim-btn-inactive"}`}>Visitation</button>
          <button onClick={() => setShowEntropy(!showEntropy)} className={`sim-btn ${showEntropy ? "sim-btn-active" : "sim-btn-inactive"}`}>Entropy</button>
        </div>
      </ControlSection>

      <ControlSection title="Controls">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Train"}</button>
          <button onClick={() => { initWorld(); setRunning(false); }} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(rewardHistRef.current.map((r, i) => ({ episode: i, reward: r, entropy: entropyHistRef.current[i] ?? 0 })), "rl_introspection")} className="w-full sim-btn sim-btn-inactive mt-1">📥 Export CSV</button>
      </ControlSection>

      <ControlSection title="Dashboard">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Episodes</span><span className="text-foreground">{episode}</span></div>
          <div className="flex justify-between"><span>Policy Entropy</span><span className="text-purple-glow">{(entropyHistRef.current[entropyHistRef.current.length - 1] ?? 0).toFixed(3)} bits</span></div>
          <div className="flex justify-between"><span>Success Rate</span><span className="text-green-glow">{successHistRef.current.length > 10 ? (successHistRef.current.slice(-20).filter(Boolean).length / Math.min(20, successHistRef.current.length) * 100).toFixed(0) + "%" : "—"}</span></div>
          <div className="flex justify-between"><span>Avg Reward</span><span className="text-primary">{rewardHistRef.current.length > 0 ? (rewardHistRef.current.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, rewardHistRef.current.length)).toFixed(2) : "—"}</span></div>
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Deep RL introspection: <span className="text-amber-glow">Visitation heatmap</span> shows exploration patterns. 
          <span className="text-purple-glow"> Policy entropy</span> measures decision uncertainty — high entropy means random, low means converged. 
          <span className="text-green-glow">Success rate</span> tracks goal achievement over time.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="RL Policy Introspection" subtitle="Entropy · Visitation · Value · Success" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default RLPolicyIntrospection;
