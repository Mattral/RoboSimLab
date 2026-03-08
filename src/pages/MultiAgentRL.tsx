import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { exportToCSV } from "@/components/DataExport";

interface SwarmAgent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  assignedTask: number;
  hue: number;
}

interface Task {
  x: number;
  y: number;
  reward: number;
  completed: boolean;
  id: number;
}

const GRID_SIZE = 20;
const ACTIONS = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // up, down, right, left

const MultiAgentRL = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [agentCount, setAgentCount] = useState(5);
  const [taskCount, setTaskCount] = useState(8);
  const [learningRate, setLearningRate] = useState(0.15);
  const [discountFactor, setDiscountFactor] = useState(0.9);
  const [epsilon, setEpsilon] = useState(0.3);
  const [showQValues, setShowQValues] = useState(false);
  const [showComms, setShowComms] = useState(true);
  const [showPolicy, setShowPolicy] = useState(true);
  const [running, setRunning] = useState(true);
  const [episode, setEpisode] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

  // Shared Q-table: [x][y][action] → value
  const qTableRef = useRef<number[][][]>([]);
  const agentsRef = useRef<SwarmAgent[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const rewardHistoryRef = useRef<{ episode: number; reward: number; success: number }[]>([]);
  const episodeRewardRef = useRef(0);
  const episodeStepsRef = useRef(0);
  const completedCountRef = useRef(0);

  const initQTable = useCallback(() => {
    const q: number[][][] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      q[x] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        q[x][y] = [0, 0, 0, 0];
      }
    }
    return q;
  }, []);

  const initAgents = useCallback((n: number) => {
    const agents: SwarmAgent[] = [];
    for (let i = 0; i < n; i++) {
      agents.push({
        x: 1 + Math.floor(Math.random() * (GRID_SIZE - 2)),
        y: 1 + Math.floor(Math.random() * (GRID_SIZE - 2)),
        vx: 0, vy: 0,
        id: i,
        assignedTask: -1,
        hue: 155 + (i / n) * 80,
      });
    }
    return agents;
  }, []);

  const initTasks = useCallback((n: number) => {
    const tasks: Task[] = [];
    for (let i = 0; i < n; i++) {
      tasks.push({
        x: 2 + Math.floor(Math.random() * (GRID_SIZE - 4)),
        y: 2 + Math.floor(Math.random() * (GRID_SIZE - 4)),
        reward: 5 + Math.floor(Math.random() * 10),
        completed: false,
        id: i,
      });
    }
    return tasks;
  }, []);

  const reset = useCallback(() => {
    qTableRef.current = initQTable();
    agentsRef.current = initAgents(agentCount);
    tasksRef.current = initTasks(taskCount);
    rewardHistoryRef.current = [];
    episodeRewardRef.current = 0;
    episodeStepsRef.current = 0;
    completedCountRef.current = 0;
    setEpisode(0);
    setTotalReward(0);
    setSuccessRate(0);
  }, [agentCount, taskCount, initQTable, initAgents, initTasks]);

  useEffect(() => { reset(); }, [agentCount, taskCount, reset]);

  const resetEpisode = useCallback(() => {
    const agents = agentsRef.current;
    for (const a of agents) {
      a.x = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
      a.y = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
      a.assignedTask = -1;
    }
    const tasks = tasksRef.current;
    for (const t of tasks) {
      t.completed = false;
      t.x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
      t.y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
    }
    const completed = completedCountRef.current;
    const total = tasks.length;
    rewardHistoryRef.current.push({
      episode: rewardHistoryRef.current.length,
      reward: episodeRewardRef.current,
      success: completed / total,
    });
    if (rewardHistoryRef.current.length > 500) rewardHistoryRef.current.shift();
    episodeRewardRef.current = 0;
    episodeStepsRef.current = 0;
    completedCountRef.current = 0;
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

    let tickCount = 0;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);

      const cellW = cw / GRID_SIZE;
      const cellH = ch / GRID_SIZE;
      const Q = qTableRef.current;
      const agents = agentsRef.current;
      const tasks = tasksRef.current;

      if (Q.length === 0) return;

      // RL step
      if (running) {
        tickCount++;
        if (tickCount % 2 === 0) {
          for (const agent of agents) {
            const sx = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(agent.x)));
            const sy = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(agent.y)));

            // Epsilon-greedy action selection
            let actionIdx: number;
            if (Math.random() < epsilon) {
              actionIdx = Math.floor(Math.random() * 4);
            } else {
              actionIdx = Q[sx][sy].indexOf(Math.max(...Q[sx][sy]));
            }

            const [dx, dy] = ACTIONS[actionIdx];
            const nx = Math.max(0, Math.min(GRID_SIZE - 1, sx + dx));
            const ny = Math.max(0, Math.min(GRID_SIZE - 1, sy + dy));

            // Reward calculation
            let reward = -0.1; // step penalty
            // Check if reached a task
            for (const task of tasks) {
              if (!task.completed && nx === task.x && ny === task.y) {
                reward += task.reward;
                task.completed = true;
                completedCountRef.current++;
              }
            }
            // Cooperative bonus: reward for being near other agents near tasks
            for (const other of agents) {
              if (other.id === agent.id) continue;
              const dist = Math.abs(other.x - nx) + Math.abs(other.y - ny);
              if (dist < 3) reward += 0.1; // cooperation bonus
            }

            // Q-learning update (shared Q-table)
            const maxNextQ = Math.max(...Q[nx][ny]);
            Q[sx][sy][actionIdx] += learningRate * (reward + discountFactor * maxNextQ - Q[sx][sy][actionIdx]);

            agent.vx = nx - agent.x;
            agent.vy = ny - agent.y;
            agent.x = nx;
            agent.y = ny;
            episodeRewardRef.current += reward;
          }

          episodeStepsRef.current++;

          // Check episode end
          const allDone = tasks.every(t => t.completed);
          if (allDone || episodeStepsRef.current > 200) {
            setEpisode(prev => prev + 1);
            setTotalReward(Math.round(episodeRewardRef.current * 10) / 10);
            const hist = rewardHistoryRef.current;
            const recent = hist.slice(-20);
            setSuccessRate(recent.length > 0 ? Math.round(recent.reduce((s, r) => s + r.success, 0) / recent.length * 100) : 0);
            resetEpisode();
          }
        }
      }

      // Draw grid
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          // Q-value heatmap
          if (showQValues && Q[x]?.[y]) {
            const maxQ = Math.max(...Q[x][y]);
            const intensity = Math.min(1, Math.max(0, maxQ / 10));
            ctx.fillStyle = `hsla(175, 70%, ${10 + intensity * 30}%, ${0.3 + intensity * 0.4})`;
          } else {
            ctx.fillStyle = "hsl(220, 12%, 10%)";
          }
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
        }
      }

      // Grid lines
      ctx.strokeStyle = "hsla(220, 15%, 18%, 0.4)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= GRID_SIZE; x++) { ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, ch); ctx.stroke(); }
      for (let y = 0; y <= GRID_SIZE; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(cw, y * cellH); ctx.stroke(); }

      // Policy arrows
      if (showPolicy) {
        for (let x = 0; x < GRID_SIZE; x++) {
          for (let y = 0; y < GRID_SIZE; y++) {
            if (!Q[x]?.[y]) continue;
            const maxQ = Math.max(...Q[x][y]);
            if (maxQ <= 0) continue;
            const bestAction = Q[x][y].indexOf(maxQ);
            const [dx, dy] = ACTIONS[bestAction];
            const cx = x * cellW + cellW / 2;
            const cy = y * cellH + cellH / 2;
            const len = Math.min(cellW, cellH) * 0.3;
            ctx.strokeStyle = "hsla(175, 80%, 50%, 0.25)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx * len, cy + dy * len);
            ctx.stroke();
            // Arrow head
            const angle = Math.atan2(dy, dx);
            ctx.beginPath();
            ctx.moveTo(cx + dx * len, cy + dy * len);
            ctx.lineTo(cx + dx * len - Math.cos(angle - 0.5) * 3, cy + dy * len - Math.sin(angle - 0.5) * 3);
            ctx.moveTo(cx + dx * len, cy + dy * len);
            ctx.lineTo(cx + dx * len - Math.cos(angle + 0.5) * 3, cy + dy * len - Math.sin(angle + 0.5) * 3);
            ctx.stroke();
          }
        }
      }

      // Tasks
      for (const task of tasks) {
        if (task.completed) {
          ctx.fillStyle = "hsla(150, 70%, 50%, 0.2)";
          ctx.beginPath();
          ctx.arc(task.x * cellW + cellW / 2, task.y * cellH + cellH / 2, cellW * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "hsla(40, 90%, 55%, 0.8)";
          ctx.beginPath();
          ctx.arc(task.x * cellW + cellW / 2, task.y * cellH + cellH / 2, cellW * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "hsl(220, 20%, 7%)";
          ctx.font = `${Math.max(8, cellW * 0.3)}px 'JetBrains Mono'`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${task.reward}`, task.x * cellW + cellW / 2, task.y * cellH + cellH / 2 + 1);
        }
      }

      // Communication lines between nearby agents
      if (showComms) {
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < agents.length; j++) {
            const dist = Math.abs(agents[i].x - agents[j].x) + Math.abs(agents[i].y - agents[j].y);
            if (dist < 6) {
              ctx.strokeStyle = `hsla(${agents[i].hue}, 50%, 50%, ${0.15 * (1 - dist / 6)})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(agents[i].x * cellW + cellW / 2, agents[i].y * cellH + cellH / 2);
              ctx.lineTo(agents[j].x * cellW + cellW / 2, agents[j].y * cellH + cellH / 2);
              ctx.stroke();
            }
          }
        }
      }

      // Agents
      for (const agent of agents) {
        const ax = agent.x * cellW + cellW / 2;
        const ay = agent.y * cellH + cellH / 2;
        // Glow
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = `hsl(${agent.hue}, 80%, 55%)`;
        ctx.beginPath(); ctx.arc(ax, ay, cellW * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Body
        ctx.fillStyle = `hsl(${agent.hue}, 80%, 55%)`;
        ctx.beginPath(); ctx.arc(ax, ay, cellW * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "hsl(220, 20%, 7%)";
        ctx.beginPath(); ctx.arc(ax, ay, cellW * 0.18, 0, Math.PI * 2); ctx.fill();
        // Direction
        if (agent.vx !== 0 || agent.vy !== 0) {
          ctx.strokeStyle = `hsl(${agent.hue}, 80%, 55%)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + agent.vx * cellW * 0.4, ay + agent.vy * cellH * 0.4);
          ctx.stroke();
        }
        // ID
        ctx.fillStyle = `hsl(${agent.hue}, 80%, 75%)`;
        ctx.font = `${Math.max(7, cellW * 0.22)}px 'JetBrains Mono'`;
        ctx.textAlign = "center";
        ctx.fillText(`${agent.id}`, ax, ay - cellW * 0.4);
      }

      // Reward curve (bottom-right)
      const hist = rewardHistoryRef.current;
      if (hist.length > 2) {
        const chartW = Math.min(200, cw * 0.3);
        const chartH = 50;
        const chartX = cw - chartW - 12;
        const chartY = ch - chartH - 12;
        ctx.fillStyle = "hsla(220, 18%, 8%, 0.9)";
        ctx.strokeStyle = "hsla(220, 15%, 20%, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(chartX - 5, chartY - 15, chartW + 10, chartH + 25, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "hsl(215, 15%, 50%)";
        ctx.font = "8px 'JetBrains Mono'";
        ctx.textAlign = "left";
        ctx.fillText("REWARD CURVE", chartX, chartY - 4);

        const maxR = Math.max(...hist.map(h => h.reward), 1);
        const minR = Math.min(...hist.map(h => h.reward), 0);
        ctx.strokeStyle = "hsl(175, 80%, 50%)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < hist.length; i++) {
          const hx = chartX + (i / (hist.length - 1)) * chartW;
          const hy = chartY + chartH - ((hist[i].reward - minR) / (maxR - minR + 0.001)) * chartH;
          if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
      }

      // HUD
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Multi-Agent RL | Ep: ${episode} | Reward: ${totalReward} | Success: ${successRate}%`, 15, 20);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, epsilon, learningRate, discountFactor, showQValues, showComms, showPolicy, episode, totalReward, successRate, resetEpisode]);

  const controls = (
    <>
      <ControlSection title="Agents & Tasks">
        <SliderControl label="Agents" value={agentCount} min={2} max={12} step={1} onChange={v => setAgentCount(Math.round(v))} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Tasks" value={taskCount} min={3} max={15} step={1} onChange={v => setTaskCount(Math.round(v))} color="hsl(40, 90%, 55%)" />
      </ControlSection>
      <ControlSection title="Learning">
        <SliderControl label="Learning Rate" value={learningRate} min={0.01} max={0.5} step={0.01} onChange={setLearningRate} color="hsl(150, 70%, 50%)" />
        <SliderControl label="Discount γ" value={discountFactor} min={0.5} max={0.99} step={0.01} onChange={setDiscountFactor} color="hsl(210, 80%, 55%)" />
        <SliderControl label="Epsilon ε" value={epsilon} min={0.01} max={0.8} step={0.01} onChange={setEpsilon} color="hsl(270, 60%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Q-Map", a: showQValues, t: () => setShowQValues(!showQValues) },
            { l: "Comms", a: showComms, t: () => setShowComms(!showComms) },
            { l: "Policy", a: showPolicy, t: () => setShowPolicy(!showPolicy) },
          ].map(b => (
            <button key={b.l} onClick={b.t}
              className={`text-xs font-mono py-2 rounded border transition-colors ${b.a ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {b.l}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Stats">
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between"><span className="text-muted-foreground">Episode</span><span className="text-foreground">{episode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Last Reward</span><span className="text-primary">{totalReward}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Success Rate</span><span className="text-primary">{successRate}%</span></div>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={reset} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">↺ Reset</button>
        </div>
        <button onClick={() => exportToCSV(rewardHistoryRef.current, "marl_rewards")} className="w-full text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors mt-1">📥 Export CSV</button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Multi-Agent RL" subtitle="Cooperative Q-Learning with Shared Q-Tables" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default MultiAgentRL;
