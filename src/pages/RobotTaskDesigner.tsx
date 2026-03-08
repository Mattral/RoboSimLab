import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Obstacle { x: number; y: number; r: number; }
interface Goal { x: number; y: number; type: "reach" | "push" | "navigate"; }

const GRID = 40;

const RobotTaskDesigner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [obstacles, setObstacles] = useState<Obstacle[]>([
    { x: 15, y: 10, r: 2 }, { x: 25, y: 20, r: 3 }, { x: 10, y: 28, r: 2 },
  ]);
  const [goal, setGoal] = useState<Goal>({ x: 35, y: 5, type: "reach" });
  const [robotX, setRobotX] = useState(5);
  const [robotY, setRobotY] = useState(35);
  const [running, setRunning] = useState(false);
  const [taskType, setTaskType] = useState<"reach" | "push" | "navigate">("reach");
  const [rewardRadius, setRewardRadius] = useState(3);
  const [penaltyWeight, setPenaltyWeight] = useState(1);
  const [stepCount, setStepCount] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [showRewardField, setShowRewardField] = useState(true);
  const [showPath, setShowPath] = useState(true);

  const pathRef = useRef<{ x: number; y: number }[]>([]);
  const agentRef = useRef({ x: 5, y: 35, vx: 0, vy: 0 });

  const reset = useCallback(() => {
    agentRef.current = { x: robotX, y: robotY, vx: 0, vy: 0 };
    pathRef.current = [];
    setStepCount(0);
    setTotalReward(0);
    setRunning(false);
  }, [robotX, robotY]);

  const computeReward = useCallback((x: number, y: number) => {
    const goalDist = Math.sqrt((x - goal.x) ** 2 + (y - goal.y) ** 2);
    let reward = -goalDist * 0.1; // Distance penalty
    if (goalDist < rewardRadius) reward += 10 * (1 - goalDist / rewardRadius);
    // Obstacle penalty
    for (const obs of obstacles) {
      const d = Math.sqrt((x - obs.x) ** 2 + (y - obs.y) ** 2);
      if (d < obs.r + 1) reward -= penaltyWeight * (obs.r + 1 - d);
    }
    return reward;
  }, [goal, obstacles, rewardRadius, penaltyWeight]);

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

      const cellW = (w - 20) / GRID;
      const cellH = (h - 40) / GRID;
      const ox = 10, oy = 20;

      // Reward field heatmap
      if (showRewardField) {
        for (let r = 0; r < GRID; r++) {
          for (let c = 0; c < GRID; c++) {
            const reward = computeReward(c, r);
            const norm = Math.max(-1, Math.min(1, reward / 5));
            if (norm > 0) {
              ctx.fillStyle = `hsla(152, 70%, ${10 + norm * 25}%, 0.8)`;
            } else {
              ctx.fillStyle = `hsla(0, 50%, ${6 + Math.abs(norm) * 12}%, 0.8)`;
            }
            ctx.fillRect(ox + c * cellW, oy + r * cellH, cellW, cellH);
          }
        }
      } else {
        ctx.fillStyle = "hsl(228, 14%, 7%)";
        ctx.fillRect(ox, oy, GRID * cellW, GRID * cellH);
      }

      // Grid
      ctx.strokeStyle = "hsla(228, 13%, 13%, 0.3)";
      ctx.lineWidth = 0.3;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(ox + i * cellW, oy); ctx.lineTo(ox + i * cellW, oy + GRID * cellH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, oy + i * cellH); ctx.lineTo(ox + GRID * cellW, oy + i * cellH); ctx.stroke();
      }

      // Obstacles
      obstacles.forEach(obs => {
        const px = ox + obs.x * cellW;
        const py = oy + obs.y * cellH;
        ctx.fillStyle = "hsla(0, 62%, 50%, 0.3)";
        ctx.beginPath(); ctx.arc(px, py, obs.r * cellW, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "hsl(0, 62%, 50%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, obs.r * cellW, 0, Math.PI * 2); ctx.stroke();
      });

      // Goal
      const gx = ox + goal.x * cellW;
      const gy = oy + goal.y * cellH;
      ctx.fillStyle = "hsla(152, 70%, 45%, 0.2)";
      ctx.beginPath(); ctx.arc(gx, gy, rewardRadius * cellW, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsl(152, 70%, 45%)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(gx, gy, rewardRadius * cellW, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "hsl(152, 70%, 55%)";
      ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "hsl(152, 70%, 55%)";
      ctx.font = "9px 'Inter'";
      ctx.textAlign = "center";
      ctx.fillText("★ GOAL", gx, gy - 12);

      // Agent step
      if (running) {
        const agent = agentRef.current;
        // Simple gradient-based navigation
        const dx = goal.x - agent.x;
        const dy = goal.y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let fx = dx / Math.max(0.1, dist) * 0.15;
        let fy = dy / Math.max(0.1, dist) * 0.15;
        // Obstacle repulsion
        for (const obs of obstacles) {
          const odx = agent.x - obs.x;
          const ody = agent.y - obs.y;
          const od = Math.sqrt(odx * odx + ody * ody);
          if (od < obs.r + 2) {
            const force = penaltyWeight * 0.3 / Math.max(0.1, od - obs.r);
            fx += (odx / od) * force;
            fy += (ody / od) * force;
          }
        }
        agent.vx = agent.vx * 0.8 + fx;
        agent.vy = agent.vy * 0.8 + fy;
        agent.x += agent.vx;
        agent.y += agent.vy;
        agent.x = Math.max(0, Math.min(GRID - 1, agent.x));
        agent.y = Math.max(0, Math.min(GRID - 1, agent.y));
        pathRef.current.push({ x: agent.x, y: agent.y });
        if (pathRef.current.length > 2000) pathRef.current.shift();
        setStepCount(s => s + 1);
        setTotalReward(r => r + computeReward(agent.x, agent.y) * 0.01);
        if (dist < rewardRadius * 0.5) {
          setRunning(false);
        }
      }

      // Task completed overlay
      {
        const ag = agentRef.current;
        const goalDist = Math.sqrt((ag.x - goal.x) ** 2 + (ag.y - goal.y) ** 2);
        if (!running && stepCount > 0 && goalDist < rewardRadius * 0.5) {
          ctx.fillStyle = "hsla(152, 70%, 45%, 0.15)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "hsl(152, 70%, 55%)";
          ctx.font = "bold 18px 'Inter'";
          ctx.textAlign = "center";
          ctx.fillText("✓ TASK COMPLETE", w / 2, h / 2 - 10);
          ctx.font = "12px 'JetBrains Mono'";
          ctx.fillStyle = "hsl(220, 10%, 70%)";
          ctx.fillText(`${stepCount} steps · reward: ${totalReward.toFixed(2)}`, w / 2, h / 2 + 15);
        }
      }

      // Path
      if (showPath && pathRef.current.length > 1) {
        ctx.strokeStyle = "hsla(38, 88%, 52%, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pathRef.current.forEach((p, i) => {
          const px = ox + p.x * cellW;
          const py = oy + p.y * cellH;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Robot
      const curAgent = agentRef.current;
      const rx = ox + curAgent.x * cellW;
      const ry = oy + curAgent.y * cellH;
      ctx.fillStyle = "hsl(38, 90%, 55%)";
      ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "hsla(38, 90%, 55%, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, 10, 0, Math.PI * 2); ctx.stroke();

      // HUD
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Steps: ${stepCount}  Reward: ${totalReward.toFixed(2)}  Task: ${taskType}  ${running ? "▶" : "⏸"}`, 15, h - 8);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, obstacles, goal, rewardRadius, penaltyWeight, showRewardField, showPath, taskType, computeReward]);

  const controls = (
    <>
      <ControlSection title="Task Type">
        <div className="flex gap-2">
          {(["reach", "push", "navigate"] as const).map(t => (
            <button key={t} onClick={() => { setTaskType(t); setGoal(g => ({ ...g, type: t })); }}
              className={`flex-1 sim-btn text-[10px] ${taskType === t ? "sim-btn-active" : "sim-btn-inactive"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </ControlSection>

      <ControlSection title="Goal Position">
        <SliderControl label="Goal X" value={goal.x} min={0} max={GRID - 1} step={1} onChange={v => setGoal(g => ({ ...g, x: v }))} color="hsl(152, 68%, 42%)" />
        <SliderControl label="Goal Y" value={goal.y} min={0} max={GRID - 1} step={1} onChange={v => setGoal(g => ({ ...g, y: v }))} color="hsl(152, 68%, 42%)" />
        <SliderControl label="Reward Radius" value={rewardRadius} min={1} max={8} step={0.5} onChange={setRewardRadius} color="hsl(38, 88%, 52%)" />
        <SliderControl label="Penalty Weight" value={penaltyWeight} min={0} max={5} step={0.1} onChange={setPenaltyWeight} color="hsl(0, 62%, 50%)" />
      </ControlSection>

      <ControlSection title="Robot Start">
        <SliderControl label="Start X" value={robotX} min={0} max={GRID - 1} step={1} onChange={v => { setRobotX(v); agentRef.current.x = v; }} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Start Y" value={robotY} min={0} max={GRID - 1} step={1} onChange={v => { setRobotY(v); agentRef.current.y = v; }} color="hsl(172, 78%, 47%)" />
      </ControlSection>

      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowRewardField(!showRewardField)} className={`flex-1 sim-btn ${showRewardField ? "sim-btn-active" : "sim-btn-inactive"}`}>Reward Field</button>
          <button onClick={() => setShowPath(!showPath)} className={`flex-1 sim-btn ${showPath ? "sim-btn-active" : "sim-btn-inactive"}`}>Path</button>
        </div>
      </ControlSection>

      <ControlSection title="Controls">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className={`flex-1 sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Run"}</button>
          <button onClick={reset} className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
        <button onClick={() => {
          setObstacles([
            { x: 5 + Math.random() * 30, y: 5 + Math.random() * 30, r: 1.5 + Math.random() * 2 },
            { x: 5 + Math.random() * 30, y: 5 + Math.random() * 30, r: 1.5 + Math.random() * 2 },
            { x: 5 + Math.random() * 30, y: 5 + Math.random() * 30, r: 1.5 + Math.random() * 2 },
            { x: 5 + Math.random() * 30, y: 5 + Math.random() * 30, r: 1.5 + Math.random() * 2 },
          ]);
          reset();
        }} className="w-full mt-1 sim-btn sim-btn-inactive">🔀 Randomize</button>
      </ControlSection>

      <ControlSection title="Metrics">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>Steps</span><span className="text-foreground">{stepCount}</span></div>
          <div className="flex justify-between"><span>Total Reward</span><span className="text-primary">{totalReward.toFixed(3)}</span></div>
          <div className="flex justify-between"><span>Goal Dist</span><span className="text-amber-glow">{Math.sqrt((agentRef.current.x - goal.x) ** 2 + (agentRef.current.y - goal.y) ** 2).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Obstacles</span><span className="text-destructive">{obstacles.length}</span></div>
        </div>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robot Task Designer" subtitle="Goals · Obstacles · Rewards · Navigation" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default RobotTaskDesigner;
