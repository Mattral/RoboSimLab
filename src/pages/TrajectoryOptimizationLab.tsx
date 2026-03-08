import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { RobotArm3D, RobotBase3D, SceneLighting } from "@/components/3d/RobotArm3D";
import * as THREE from "three";

interface Waypoint { j1: number; j2: number; j3: number; }

/** Simple cubic interpolation */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

const TrajectoryOptimizationLab = () => {
  const [startPose, setStartPose] = useState<Waypoint>({ j1: 0, j2: -1.2, j3: 0.8 });
  const [goalPose, setGoalPose] = useState<Waypoint>({ j1: 1.5, j2: 0.5, j3: -0.6 });
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [costHistory, setCostHistory] = useState<number[]>([]);
  const [speed, setSpeed] = useState(1);
  const [smoothness, setSmoothness] = useState(5);
  const [obstacleAvoid, setObstacleAvoid] = useState(1.0);
  const [showCostChart, setShowCostChart] = useState(true);

  const link1 = 1.2, link2 = 1.0, link3 = 0.8;
  const playRef = useRef(0);
  const animRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Current interpolated joint angles
  const currentJoints = useMemo(() => {
    if (waypoints.length === 0) {
      const t = smoothstep(progress);
      return {
        j1: lerp(startPose.j1, goalPose.j1, t),
        j2: lerp(startPose.j2, goalPose.j2, t),
        j3: lerp(startPose.j3, goalPose.j3, t),
      };
    }
    const allPts = [startPose, ...waypoints, goalPose];
    const segment = progress * (allPts.length - 1);
    const idx = Math.min(Math.floor(segment), allPts.length - 2);
    const t = smoothstep(segment - idx);
    return {
      j1: lerp(allPts[idx].j1, allPts[idx + 1].j1, t),
      j2: lerp(allPts[idx].j2, allPts[idx + 1].j2, t),
      j3: lerp(allPts[idx].j3, allPts[idx + 1].j3, t),
    };
  }, [progress, startPose, goalPose, waypoints]);

  // Trajectory trail points
  const trailPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const allPts = [startPose, ...waypoints, goalPose];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const segment = p * (allPts.length - 1);
      const idx = Math.min(Math.floor(segment), allPts.length - 2);
      const t = smoothstep(segment - idx);
      const j1 = lerp(allPts[idx].j1, allPts[idx + 1].j1, t);
      const j2 = lerp(allPts[idx].j2, allPts[idx + 1].j2, t);
      const j3 = lerp(allPts[idx].j3, allPts[idx + 1].j3, t);
      const endX = Math.sin(j2) * link2 + Math.sin(j2 + j3) * link3;
      const endY = link1 + Math.cos(j2) * link2 + Math.cos(j2 + j3) * link3;
      pts.push(new THREE.Vector3(endX, endY, 0));
    }
    return pts;
  }, [startPose, goalPose, waypoints]);

  // Cost function: smoothness + obstacle avoidance proxy
  const computeCost = useCallback((wps: Waypoint[]) => {
    const allPts = [startPose, ...wps, goalPose];
    let cost = 0;
    // Smoothness cost: sum of squared angular accelerations
    for (let i = 1; i < allPts.length - 1; i++) {
      const acc1 = allPts[i - 1].j1 - 2 * allPts[i].j1 + allPts[i + 1].j1;
      const acc2 = allPts[i - 1].j2 - 2 * allPts[i].j2 + allPts[i + 1].j2;
      const acc3 = allPts[i - 1].j3 - 2 * allPts[i].j3 + allPts[i + 1].j3;
      cost += smoothness * (acc1 * acc1 + acc2 * acc2 + acc3 * acc3);
    }
    // Obstacle proximity cost (penalize configs near origin in workspace)
    for (const wp of allPts) {
      const ex = Math.sin(wp.j2) * link2 + Math.sin(wp.j2 + wp.j3) * link3;
      const ey = link1 + Math.cos(wp.j2) * link2 + Math.cos(wp.j2 + wp.j3) * link3;
      const distToObstacle = Math.sqrt(ex * ex + (ey - 1.0) * (ey - 1.0));
      if (distToObstacle < 1.2) {
        cost += obstacleAvoid * (1.2 - distToObstacle) * 10;
      }
    }
    return cost;
  }, [startPose, goalPose, smoothness, obstacleAvoid]);

  // Gradient-free optimization (random perturbation)
  const optimize = useCallback(async () => {
    setOptimizing(true);
    const numWaypoints = 5;
    let best: Waypoint[] = [];
    for (let i = 0; i < numWaypoints; i++) {
      const t = (i + 1) / (numWaypoints + 1);
      best.push({
        j1: lerp(startPose.j1, goalPose.j1, t),
        j2: lerp(startPose.j2, goalPose.j2, t),
        j3: lerp(startPose.j3, goalPose.j3, t),
      });
    }
    let bestCost = computeCost(best);
    const history: number[] = [bestCost];

    for (let iter = 0; iter < 200; iter++) {
      const candidate = best.map(wp => ({
        j1: wp.j1 + (Math.random() - 0.5) * 0.3 * Math.exp(-iter / 80),
        j2: wp.j2 + (Math.random() - 0.5) * 0.3 * Math.exp(-iter / 80),
        j3: wp.j3 + (Math.random() - 0.5) * 0.3 * Math.exp(-iter / 80),
      }));
      const cost = computeCost(candidate);
      if (cost < bestCost) {
        best = candidate;
        bestCost = cost;
      }
      history.push(bestCost);
      if (iter % 10 === 0) {
        setWaypoints([...best]);
        setCostHistory([...history]);
        await new Promise(r => setTimeout(r, 30));
      }
    }
    setWaypoints([...best]);
    setCostHistory([...history]);
    setOptimizing(false);
  }, [startPose, goalPose, computeCost]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + 0.005 * speed;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [playing, speed]);

  // Cost chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartRef.current;
    if (!canvas || !container || !showCostChart || costHistory.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.resetTransform(); ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "hsl(228, 15%, 7%)"; ctx.fillRect(0, 0, w, h);

    const margin = { top: 20, right: 10, bottom: 15, left: 40 };
    const pW = w - margin.left - margin.right;
    const pH = h - margin.top - margin.bottom;
    const maxC = Math.max(...costHistory);
    const minC = Math.min(...costHistory);
    const range = maxC - minC || 1;

    ctx.fillStyle = "hsl(220, 10%, 42%)";
    ctx.font = "10px 'Inter'";
    ctx.textAlign = "left";
    ctx.fillText("COST FUNCTION", margin.left, 14);

    ctx.strokeStyle = "hsl(228, 13%, 16%)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, h - margin.bottom);
    ctx.lineTo(w - margin.right, h - margin.bottom);
    ctx.stroke();

    ctx.strokeStyle = "hsl(38, 88%, 52%)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < costHistory.length; i++) {
      const x = margin.left + (i / (costHistory.length - 1)) * pW;
      const y = margin.top + (1 - (costHistory[i] - minC) / range) * pH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "hsl(220, 10%, 40%)";
    ctx.font = "9px 'JetBrains Mono'";
    ctx.textAlign = "right";
    ctx.fillText(maxC.toFixed(1), margin.left - 4, margin.top + 8);
    ctx.fillText(minC.toFixed(1), margin.left - 4, h - margin.bottom);
  }, [costHistory, showCostChart]);

  const controls = (
    <>
      <ControlSection title="Start Pose">
        <SliderControl label="θ₁" value={startPose.j1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setStartPose(p => ({ ...p, j1: v }))} color="hsl(172, 78%, 47%)" />
        <SliderControl label="θ₂" value={startPose.j2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setStartPose(p => ({ ...p, j2: v }))} color="hsl(152, 68%, 42%)" />
        <SliderControl label="θ₃" value={startPose.j3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setStartPose(p => ({ ...p, j3: v }))} color="hsl(212, 78%, 52%)" />
      </ControlSection>
      <ControlSection title="Goal Pose">
        <SliderControl label="θ₁" value={goalPose.j1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setGoalPose(p => ({ ...p, j1: v }))} color="hsl(38, 88%, 52%)" />
        <SliderControl label="θ₂" value={goalPose.j2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setGoalPose(p => ({ ...p, j2: v }))} color="hsl(38, 88%, 52%)" />
        <SliderControl label="θ₃" value={goalPose.j3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => setGoalPose(p => ({ ...p, j3: v }))} color="hsl(38, 88%, 52%)" />
      </ControlSection>
      <ControlSection title="Optimization">
        <SliderControl label="Smoothness Weight" value={smoothness} min={0.1} max={20} step={0.1} onChange={setSmoothness} color="hsl(268, 58%, 52%)" />
        <SliderControl label="Obstacle Weight" value={obstacleAvoid} min={0} max={5} step={0.1} onChange={setObstacleAvoid} color="hsl(0, 62%, 50%)" />
        <button onClick={optimize} disabled={optimizing}
          className={`w-full sim-btn ${optimizing ? "sim-btn-active" : "sim-btn-inactive"}`}>
          {optimizing ? "⏳ Optimizing..." : "⚡ Optimize Trajectory"}
        </button>
        {costHistory.length > 0 && (
          <div className="text-[10px] font-mono text-muted-foreground">
            Final cost: <span className="text-primary">{costHistory[costHistory.length - 1]?.toFixed(3)}</span>
            {' · '}{waypoints.length} waypoints
          </div>
        )}
      </ControlSection>
      <ControlSection title="Playback">
        <SliderControl label="Progress" value={progress} min={0} max={1} step={0.001} onChange={setProgress} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Speed" value={speed} min={0.1} max={5} step={0.1} unit="x" onChange={setSpeed} color="hsl(212, 78%, 52%)" />
        <div className="flex gap-2">
          <button onClick={() => { setProgress(0); setPlaying(true); }}
            className={`flex-1 sim-btn ${playing ? "sim-btn-active" : "sim-btn-inactive"}`}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setProgress(0); setPlaying(false); }}
            className="flex-1 sim-btn sim-btn-inactive">↺ Reset</button>
        </div>
      </ControlSection>
      <ControlSection title="Visualization">
        <button onClick={() => setShowCostChart(!showCostChart)}
          className={`w-full sim-btn ${showCostChart ? "sim-btn-active" : "sim-btn-inactive"}`}>
          Cost Chart
        </button>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Trajectory Optimization" subtitle="Motion Planning · Cost Minimization" controls={controls}>
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 relative bg-background min-h-[300px]">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
            <Canvas shadows>
              <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
              <OrbitControls enableDamping dampingFactor={0.05} target={[0, 1.5, 0]} minDistance={2} maxDistance={12} />
              <SceneLighting />
              <RobotBase3D />
              <RobotArm3D
                joint1={currentJoints.j1} joint2={currentJoints.j2} joint3={currentJoints.j3}
                link1={link1} link2={link2} link3={link3}
                showDebug trailPoints={trailPoints}
              />
              {/* Obstacle zone visualization */}
              <mesh position={[0, 1.0, 0]}>
                <sphereGeometry args={[1.2, 24, 24]} />
                <meshBasicMaterial color="#ff4444" transparent opacity={0.03} wireframe />
              </mesh>
              {/* Start marker */}
              {(() => {
                const sx = Math.sin(startPose.j2) * link2 + Math.sin(startPose.j2 + startPose.j3) * link3;
                const sy = link1 + Math.cos(startPose.j2) * link2 + Math.cos(startPose.j2 + startPose.j3) * link3;
                return (
                  <mesh position={[sx, sy, 0]}>
                    <sphereGeometry args={[0.06, 12, 12]} />
                    <meshBasicMaterial color="#00d4aa" />
                  </mesh>
                );
              })()}
              {/* Goal marker */}
              {(() => {
                const gx = Math.sin(goalPose.j2) * link2 + Math.sin(goalPose.j2 + goalPose.j3) * link3;
                const gy = link1 + Math.cos(goalPose.j2) * link2 + Math.cos(goalPose.j2 + goalPose.j3) * link3;
                return (
                  <mesh position={[gx, gy, 0]}>
                    <sphereGeometry args={[0.06, 12, 12]} />
                    <meshBasicMaterial color="#f0a500" />
                  </mesh>
                );
              })()}
              <fog attach="fog" args={["hsl(228, 16%, 5%)", 8, 20]} />
            </Canvas>
          </Suspense>
          <div className="absolute top-3 left-3 glass-panel text-[10px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
            Progress: {(progress * 100).toFixed(0)}%
            <span className="ml-2 text-primary">{waypoints.length > 0 ? 'OPTIMIZED' : 'LINEAR'}</span>
            {optimizing && <span className="ml-2 text-amber-glow">COMPUTING</span>}
          </div>
        </div>
        {showCostChart && costHistory.length > 1 && (
          <div ref={chartRef} className="h-[140px] border-t border-border/30 relative shrink-0">
            <canvas ref={canvasRef} className="absolute inset-0" />
          </div>
        )}
      </div>
    </SimLayout>
  );
};

export default TrajectoryOptimizationLab;
