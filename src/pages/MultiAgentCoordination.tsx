import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Agent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  task: number | null;
  color: string;
  state: "idle" | "moving" | "working";
  workTimer: number;
}

interface Task {
  id: number;
  x: number;
  y: number;
  assigned: number | null;
  completed: boolean;
  priority: number;
  workRequired: number;
  workDone: number;
}

const COLORS = [
  "hsl(175, 80%, 50%)", "hsl(150, 70%, 45%)", "hsl(210, 80%, 55%)",
  "hsl(270, 60%, 55%)", "hsl(40, 90%, 55%)", "hsl(0, 70%, 55%)",
  "hsl(320, 60%, 55%)", "hsl(90, 60%, 45%)",
];

const MultiAgentCoordination = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [agentCount, setAgentCount] = useState(6);
  const [taskCount, setTaskCount] = useState(12);
  const [commRadius, setCommRadius] = useState(150);
  const [speed, setSpeed] = useState(2);
  const [running, setRunning] = useState(true);
  const [showComm, setShowComm] = useState(true);
  const [showAssignments, setShowAssignments] = useState(true);
  const [strategy, setStrategy] = useState<"nearest" | "auction">("nearest");
  const [completed, setCompleted] = useState(0);

  const agentsRef = useRef<Agent[]>([]);
  const tasksRef = useRef<Task[]>([]);

  const initSim = useCallback(() => {
    const agents: Agent[] = [];
    for (let i = 0; i < agentCount; i++) {
      agents.push({
        id: i, x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8,
        vx: 0, vy: 0, task: null, color: COLORS[i % COLORS.length],
        state: "idle", workTimer: 0,
      });
    }
    const tasks: Task[] = [];
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: i, x: 0.05 + Math.random() * 0.9, y: 0.05 + Math.random() * 0.9,
        assigned: null, completed: false, priority: 1 + Math.floor(Math.random() * 3),
        workRequired: 60 + Math.random() * 120, workDone: 0,
      });
    }
    agentsRef.current = agents;
    tasksRef.current = tasks;
    setCompleted(0);
  }, [agentCount, taskCount]);

  useEffect(() => { initSim(); }, [initSim]);

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

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "hsl(220, 15%, 11%)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const agents = agentsRef.current;
      const tasks = tasksRef.current;

      if (running) {
        // Task assignment
        for (const agent of agents) {
          if (agent.task !== null) continue;
          const availableTasks = tasks.filter(t => !t.completed && t.assigned === null);
          if (availableTasks.length === 0) continue;

          if (strategy === "nearest") {
            let best: Task | null = null;
            let bestDist = Infinity;
            for (const task of availableTasks) {
              const d = Math.hypot(task.x - agent.x, task.y - agent.y);
              if (d < bestDist) { bestDist = d; best = task; }
            }
            if (best) { agent.task = best.id; best.assigned = agent.id; agent.state = "moving"; }
          } else {
            // Auction: weighted by priority/distance
            let best: Task | null = null;
            let bestScore = -Infinity;
            for (const task of availableTasks) {
              const d = Math.max(0.01, Math.hypot(task.x - agent.x, task.y - agent.y));
              const score = task.priority / d;
              if (score > bestScore) { bestScore = score; best = task; }
            }
            if (best) { agent.task = best.id; best.assigned = agent.id; agent.state = "moving"; }
          }
        }

        // Movement & work
        for (const agent of agents) {
          if (agent.task === null) continue;
          const task = tasks.find(t => t.id === agent.task);
          if (!task || task.completed) { agent.task = null; agent.state = "idle"; continue; }

          const dx = task.x - agent.x;
          const dy = task.y - agent.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 0.02) {
            agent.state = "working";
            task.workDone += 1;
            if (task.workDone >= task.workRequired) {
              task.completed = true;
              agent.task = null;
              agent.state = "idle";
              setCompleted(prev => prev + 1);
            }
          } else {
            agent.state = "moving";
            const moveSpeed = speed * 0.001;
            agent.x += (dx / dist) * moveSpeed;
            agent.y += (dy / dist) * moveSpeed;
          }
        }
      }

      // Draw communication links
      if (showComm) {
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < agents.length; j++) {
            const d = Math.hypot((agents[i].x - agents[j].x) * w, (agents[i].y - agents[j].y) * h);
            if (d < commRadius) {
              const alpha = (1 - d / commRadius) * 0.2;
              ctx.strokeStyle = `hsla(175, 80%, 50%, ${alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(agents[i].x * w, agents[i].y * h);
              ctx.lineTo(agents[j].x * w, agents[j].y * h);
              ctx.stroke();
            }
          }
        }
      }

      // Draw tasks
      for (const task of tasks) {
        const tx = task.x * w, ty = task.y * h;
        if (task.completed) {
          ctx.strokeStyle = "hsla(150, 70%, 45%, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty - 4); ctx.lineTo(tx + 4, ty + 4);
          ctx.moveTo(tx + 4, ty - 4); ctx.lineTo(tx - 4, ty + 4);
          ctx.stroke();
          continue;
        }

        const size = 4 + task.priority * 2;
        const progress = task.workDone / task.workRequired;

        // Priority ring
        ctx.strokeStyle = task.assigned !== null ? "hsl(40, 90%, 55%)" : "hsl(215, 15%, 35%)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tx, ty, size + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Progress arc
        if (progress > 0) {
          ctx.strokeStyle = "hsl(150, 70%, 45%)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx, ty, size + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
          ctx.stroke();
        }

        // Task dot
        ctx.fillStyle = task.assigned !== null ? "hsl(40, 90%, 55%)" : "hsl(215, 15%, 40%)";
        ctx.beginPath();
        ctx.arc(tx, ty, size, 0, Math.PI * 2);
        ctx.fill();

        // Priority label
        ctx.fillStyle = "hsl(220, 20%, 7%)";
        ctx.font = "bold 9px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${task.priority}`, tx, ty);
      }

      // Assignment lines
      if (showAssignments) {
        for (const agent of agents) {
          if (agent.task === null) continue;
          const task = tasks.find(t => t.id === agent.task);
          if (!task) continue;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = agent.color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(agent.x * w, agent.y * h);
          ctx.lineTo(task.x * w, task.y * h);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      // Draw agents
      for (const agent of agents) {
        const ax = agent.x * w, ay = agent.y * h;

        // Communication radius
        if (showComm) {
          ctx.strokeStyle = `${agent.color}15`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ax, ay, commRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Agent body
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.arc(ax, ay, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "hsl(220, 20%, 7%)";
        ctx.beginPath();
        ctx.arc(ax, ay, 5, 0, Math.PI * 2);
        ctx.fill();

        // State indicator
        if (agent.state === "working") {
          ctx.strokeStyle = "hsl(150, 70%, 45%)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ax, ay, 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ID
        ctx.fillStyle = agent.color;
        ctx.font = "8px 'JetBrains Mono'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${agent.id + 1}`, ax, ay);
      }

      // Stats
      const completedCount = tasks.filter(t => t.completed).length;
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Agents: ${agents.length} | Tasks: ${completedCount}/${tasks.length} | Strategy: ${strategy.toUpperCase()}`, 15, 15);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, speed, commRadius, showComm, showAssignments, strategy, agentCount, taskCount]);

  const controls = (
    <>
      <ControlSection title="Configuration">
        <SliderControl label="Agents" value={agentCount} min={2} max={8} step={1} onChange={v => setAgentCount(Math.round(v))} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Tasks" value={taskCount} min={4} max={24} step={1} onChange={v => setTaskCount(Math.round(v))} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Comm Radius" value={commRadius} min={50} max={300} step={10} onChange={v => setCommRadius(Math.round(v))} color="hsl(210, 80%, 55%)" />
        <SliderControl label="Speed" value={speed} min={0.5} max={5} step={0.5} onChange={setSpeed} color="hsl(150, 70%, 45%)" />
      </ControlSection>
      <ControlSection title="Strategy">
        <div className="flex gap-2">
          {(["nearest", "auction"] as const).map(s => (
            <button key={s} onClick={() => setStrategy(s)}
              className={`flex-1 text-xs font-mono py-2 rounded border transition-colors capitalize ${strategy === s ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
              {s === "nearest" ? "Nearest First" : "Priority Auction"}
            </button>
          ))}
        </div>
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button onClick={() => setShowComm(!showComm)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${showComm ? "border-primary text-primary" : "border-border text-foreground"}`}>
            Comm Links
          </button>
          <button onClick={() => setShowAssignments(!showAssignments)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${showAssignments ? "border-primary text-primary" : "border-border text-foreground"}`}>
            Assignments
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">{running ? "⏸ Pause" : "▶ Play"}</button>
          <button onClick={initSim} className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">↺ Reset</button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Multiple <span className="text-primary">cooperative agents</span> coordinate to complete distributed tasks. 
          <span className="text-amber-glow"> Nearest-first</span> assigns by proximity, <span className="text-primary">Priority Auction</span> weighs task importance. 
          Numbers on tasks show priority level. Watch agents autonomously allocate, navigate, and complete work.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Multi-Agent Coordination" subtitle="Distributed Task Allocation" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default MultiAgentCoordination;
