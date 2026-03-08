import { useState, useEffect, useRef, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Agent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

const SwarmSimulator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);

  const [count, setCount] = useState(80);
  const [separation, setSeparation] = useState(25);
  const [alignment, setAlignment] = useState(0.05);
  const [cohesion, setCohesion] = useState(0.005);
  const [maxSpeed, setMaxSpeed] = useState(3);
  const [perceptionRadius, setPerceptionRadius] = useState(60);
  const [showVectors, setShowVectors] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [running, setRunning] = useState(true);

  const initAgents = useCallback((n: number, w: number, h: number) => {
    const agents: Agent[] = [];
    for (let i = 0; i < n; i++) {
      agents.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        hue: 175 + Math.random() * 40 - 20,
      });
    }
    return agents;
  }, []);

  const reset = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    agentsRef.current = initAgents(count, container.clientWidth, container.clientHeight);
  }, [count, initAgents]);

  useEffect(() => {
    reset();
  }, [count, reset]);

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

    if (agentsRef.current.length === 0) reset();

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
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const agents = agentsRef.current;

      if (running) {
        // Update boids
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i];
          let sepX = 0, sepY = 0;
          let aliX = 0, aliY = 0;
          let cohX = 0, cohY = 0;
          let neighbors = 0;

          for (let j = 0; j < agents.length; j++) {
            if (i === j) continue;
            const b = agents[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < perceptionRadius && dist > 0) {
              neighbors++;
              // Separation
              if (dist < separation) {
                sepX -= dx / dist;
                sepY -= dy / dist;
              }
              // Alignment
              aliX += b.vx;
              aliY += b.vy;
              // Cohesion
              cohX += b.x;
              cohY += b.y;
            }
          }

          if (neighbors > 0) {
            aliX = aliX / neighbors - a.vx;
            aliY = aliY / neighbors - a.vy;
            cohX = (cohX / neighbors - a.x) * cohesion;
            cohY = (cohY / neighbors - a.y) * cohesion;
          }

          a.vx += sepX * 0.5 + aliX * alignment + cohX;
          a.vy += sepY * 0.5 + aliY * alignment + cohY;

          // Clamp speed
          const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
          if (speed > maxSpeed) {
            a.vx = (a.vx / speed) * maxSpeed;
            a.vy = (a.vy / speed) * maxSpeed;
          }

          a.x += a.vx;
          a.y += a.vy;

          // Wrap around
          if (a.x < 0) a.x += w;
          if (a.x > w) a.x -= w;
          if (a.y < 0) a.y += h;
          if (a.y > h) a.y -= h;
        }
      }

      // Draw agents
      for (const a of agents) {
        const angle = Math.atan2(a.vy, a.vx);
        const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);

        // Perception radius
        if (showRadius) {
          ctx.strokeStyle = `hsla(${a.hue}, 60%, 50%, 0.08)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(a.x, a.y, perceptionRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Velocity vector
        if (showVectors) {
          ctx.strokeStyle = `hsla(${a.hue}, 80%, 60%, 0.4)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + a.vx * 8, a.y + a.vy * 8);
          ctx.stroke();
        }

        // Agent triangle
        const size = 5 + speed;
        ctx.fillStyle = `hsl(${a.hue}, 80%, 55%)`;
        ctx.beginPath();
        ctx.moveTo(a.x + Math.cos(angle) * size, a.y + Math.sin(angle) * size);
        ctx.lineTo(a.x + Math.cos(angle + 2.5) * size * 0.5, a.y + Math.sin(angle + 2.5) * size * 0.5);
        ctx.lineTo(a.x + Math.cos(angle - 2.5) * size * 0.5, a.y + Math.sin(angle - 2.5) * size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Glow
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = `hsl(${a.hue}, 80%, 55%)`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Stats
      ctx.fillStyle = "hsl(215, 15%, 50%)";
      ctx.font = "11px 'JetBrains Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`Agents: ${agents.length}`, 15, 25);
      ctx.fillText(`Status: ${running ? "RUNNING" : "PAUSED"}`, 15, 42);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [count, separation, alignment, cohesion, maxSpeed, perceptionRadius, showVectors, showRadius, running, reset]);

  const controls = (
    <>
      <ControlSection title="Swarm Parameters">
        <SliderControl label="Agent Count" value={count} min={10} max={200} step={1} onChange={(v) => setCount(Math.round(v))} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Max Speed" value={maxSpeed} min={1} max={8} step={0.1} onChange={setMaxSpeed} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Perception Radius" value={perceptionRadius} min={20} max={150} step={1} onChange={(v) => setPerceptionRadius(Math.round(v))} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="Behavior Rules">
        <SliderControl label="Separation Dist" value={separation} min={5} max={80} step={1} onChange={(v) => setSeparation(Math.round(v))} color="hsl(0, 70%, 55%)" />
        <SliderControl label="Alignment" value={alignment} min={0} max={0.2} step={0.005} onChange={setAlignment} color="hsl(40, 90%, 55%)" />
        <SliderControl label="Cohesion" value={cohesion} min={0} max={0.02} step={0.001} onChange={setCohesion} color="hsl(270, 60%, 55%)" />
      </ControlSection>
      <ControlSection title="Display">
        <div className="flex gap-2">
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${
              showVectors ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            Velocities
          </button>
          <button
            onClick={() => setShowRadius(!showRadius)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${
              showRadius ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            Radius
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Simulation">
        <div className="flex gap-2">
          <button
            onClick={() => setRunning(!running)}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
          >
            {running ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={reset}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Observe emergent flocking behavior from three simple rules: <span className="text-red-glow">separation</span>, 
          <span className="text-amber-glow"> alignment</span>, and <span className="text-purple-glow"> cohesion</span>. 
          Adjust parameters to see how local interactions create global patterns.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Swarm Robotics" subtitle="Emergent Collective Behavior" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default SwarmSimulator;
