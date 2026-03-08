import { useState, Suspense, useCallback, useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { RobotArm3D, RobotBase3D, SceneLighting } from "@/components/3d/RobotArm3D";
import * as THREE from "three";

interface DemoFrame {
  j1: number;
  j2: number;
  j3: number;
  t: number;
}

const ArmKinematicsLab = () => {
  const [joint1, setJoint1] = useState(0.5);
  const [joint2, setJoint2] = useState(-0.8);
  const [joint3, setJoint3] = useState(0.3);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [mode, setMode] = useState<"fk" | "ik" | "imitation">("fk");
  const [targetX, setTargetX] = useState(1.0);
  const [targetY, setTargetY] = useState(1.5);
  const [showJacobian, setShowJacobian] = useState(false);
  const [showEllipsoid, setShowEllipsoid] = useState(false);
  const [showDH, setShowDH] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const trailRef = useRef<THREE.Vector3[]>([]);

  // Imitation learning state
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const demoRef = useRef<DemoFrame[]>([]);
  const playIdxRef = useRef(0);
  const recordTimerRef = useRef(0);

  const link1 = 1.2, link2 = 1.0, link3 = 0.8;
  const totalAngle = joint1 + joint2 + joint3;
  const endY = link1 + Math.cos(joint2) * link2 + Math.cos(joint2 + joint3) * link3;
  const endX = Math.sin(joint2) * link2 + Math.sin(joint2 + joint3) * link3;

  // Jacobian computation (2x3 for planar arm, rows = [dx, dy], cols = joints)
  const J = [
    [0, -Math.cos(joint2) * link2 - Math.cos(joint2 + joint3) * link3, -Math.cos(joint2 + joint3) * link3],
    [0, -Math.sin(joint2) * link2 - Math.sin(joint2 + joint3) * link3, -Math.sin(joint2 + joint3) * link3],
  ];

  // Manipulability = sqrt(det(J * J^T))
  const JJT00 = J[0][0] ** 2 + J[0][1] ** 2 + J[0][2] ** 2;
  const JJT01 = J[0][0] * J[1][0] + J[0][1] * J[1][1] + J[0][2] * J[1][2];
  const JJT11 = J[1][0] ** 2 + J[1][1] ** 2 + J[1][2] ** 2;
  const detJJT = JJT00 * JJT11 - JJT01 * JJT01;
  const manipulability = Math.sqrt(Math.max(0, detJJT));

  // Eigenvalues for ellipsoid
  const trace = JJT00 + JJT11;
  const disc = Math.sqrt(Math.max(0, trace * trace - 4 * detJJT));
  const eig1 = Math.sqrt(Math.max(0.01, (trace + disc) / 2));
  const eig2 = Math.sqrt(Math.max(0.01, (trace - disc) / 2));
  const eigAngle = Math.atan2(2 * JJT01, JJT00 - JJT11) / 2;

  // DH Parameters for display
  const dhParams = [
    { i: 1, theta: joint1, d: 0, a: 0, alpha: Math.PI / 2, desc: "Base rotation" },
    { i: 2, theta: joint2, d: 0, a: link1, alpha: 0, desc: "Shoulder" },
    { i: 3, theta: joint3, d: 0, a: link2, alpha: 0, desc: "Elbow" },
  ];

  // IK solver
  const solveIK = (tx: number, ty: number) => {
    const adjustedTy = ty - link1;
    const dist = Math.sqrt(tx * tx + adjustedTy * adjustedTy);
    const maxReach = link2 + link3;
    if (dist > maxReach) return;
    const cosQ3 = (dist * dist - link2 * link2 - link3 * link3) / (2 * link2 * link3);
    if (Math.abs(cosQ3) > 1) return;
    const q3 = Math.acos(Math.max(-1, Math.min(1, cosQ3)));
    const alpha = Math.atan2(tx, adjustedTy);
    const beta = Math.atan2(link3 * Math.sin(q3), link2 + link3 * Math.cos(q3));
    const q2 = alpha - beta;
    setJoint2(q2);
    setJoint3(-q3);
  };

  const handleTargetChange = (axis: "x" | "y", val: number) => {
    if (axis === "x") { setTargetX(val); solveIK(val, targetY); }
    else { setTargetY(val); solveIK(targetX, val); }
  };

  // Imitation learning
  const startRecording = () => {
    demoRef.current = [];
    recordTimerRef.current = 0;
    setRecording(true);
    setPlaying(false);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const playDemo = () => {
    if (demoRef.current.length === 0) return;
    playIdxRef.current = 0;
    setPlaying(true);
    setRecording(false);
  };

  // Record frames while recording
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      recordTimerRef.current += 0.05;
      demoRef.current.push({ j1: joint1, j2: joint2, j3: joint3, t: recordTimerRef.current });
    }, 50);
    return () => clearInterval(interval);
  }, [recording, joint1, joint2, joint3]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const demo = demoRef.current;
      if (playIdxRef.current >= demo.length) {
        playIdxRef.current = 0; // loop
      }
      const frame = demo[playIdxRef.current];
      setJoint1(frame.j1);
      setJoint2(frame.j2);
      setJoint3(frame.j3);
      playIdxRef.current++;
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

  const controls = (
    <>
      <ControlSection title="Mode">
        <div className="flex gap-2">
          {(["fk", "ik", "imitation"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setPlaying(false); setRecording(false); }}
              className={`flex-1 sim-btn ${mode === m ? "sim-btn-active" : "sim-btn-inactive"}`}>
              {m === "fk" ? "FK" : m === "ik" ? "IK" : "Learn"}
            </button>
          ))}
        </div>
      </ControlSection>

      {mode === "ik" ? (
        <ControlSection title="IK Target">
          <SliderControl label="Target X" value={targetX} min={-2} max={2} step={0.01} unit=" m" onChange={v => handleTargetChange("x", v)} color="hsl(40, 90%, 55%)" />
          <SliderControl label="Target Y" value={targetY} min={0.5} max={3} step={0.01} unit=" m" onChange={v => handleTargetChange("y", v)} color="hsl(40, 90%, 55%)" />
        </ControlSection>
      ) : mode === "imitation" ? (
        <ControlSection title="Imitation Learning">
          <p className="text-[11px] text-muted-foreground mb-2">Move joints manually, record, then replay the learned trajectory.</p>
          <div className="flex gap-2">
            {!recording ? (
              <button onClick={startRecording} className="flex-1 sim-btn sim-btn-inactive">⏺ Record</button>
            ) : (
              <button onClick={stopRecording} className="flex-1 sim-btn" style={{ borderColor: "hsl(0, 65%, 52%)", color: "hsl(0, 65%, 52%)" }}>⏹ Stop</button>
            )}
            <button onClick={playDemo} disabled={demoRef.current.length === 0}
              className={`flex-1 sim-btn ${playing ? "sim-btn-active" : "sim-btn-inactive"}`}>
              {playing ? "⏸ Playing" : "▶ Replay"}
            </button>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1">
            {recording && <span className="text-red-glow">● Recording... ({demoRef.current.length} frames)</span>}
            {!recording && demoRef.current.length > 0 && <span>{demoRef.current.length} frames recorded</span>}
          </div>
          <SliderControl label="Base (θ₁)" value={joint1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint1} color="hsl(175, 80%, 50%)" />
          <SliderControl label="Shoulder (θ₂)" value={joint2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint2} color="hsl(150, 70%, 45%)" />
          <SliderControl label="Elbow (θ₃)" value={joint3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint3} color="hsl(210, 80%, 55%)" />
        </ControlSection>
      ) : (
        <ControlSection title="Joint Angles">
          <SliderControl label="Base (θ₁)" value={joint1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint1} color="hsl(175, 80%, 50%)" />
          <SliderControl label="Shoulder (θ₂)" value={joint2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint2} color="hsl(150, 70%, 45%)" />
          <SliderControl label="Elbow (θ₃)" value={joint3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint3} color="hsl(210, 80%, 55%)" />
        </ControlSection>
      )}

      <ControlSection title="End Effector">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          <div className="flex justify-between"><span>X Position</span><span className="text-foreground">{endX.toFixed(3)} m</span></div>
          <div className="flex justify-between"><span>Y Position</span><span className="text-foreground">{endY.toFixed(3)} m</span></div>
          <div className="flex justify-between"><span>Orientation</span><span className="text-foreground">{(totalAngle * 180 / Math.PI).toFixed(1)}°</span></div>
          <div className="flex justify-between"><span>Manipulability</span><span className="text-primary">{manipulability.toFixed(3)}</span></div>
        </div>
      </ControlSection>

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowDebug(!showDebug)} className={`sim-btn ${showDebug ? "sim-btn-active" : "sim-btn-inactive"}`}>Debug</button>
          <button onClick={() => setShowTrail(!showTrail)} className={`sim-btn ${showTrail ? "sim-btn-active" : "sim-btn-inactive"}`}>Trail</button>
          <button onClick={() => setShowJacobian(!showJacobian)} className={`sim-btn ${showJacobian ? "sim-btn-active" : "sim-btn-inactive"}`}>Jacobian</button>
          <button onClick={() => setShowEllipsoid(!showEllipsoid)} className={`sim-btn ${showEllipsoid ? "sim-btn-active" : "sim-btn-inactive"}`}>Ellipsoid</button>
          <button onClick={() => setShowDH(!showDH)} className={`sim-btn ${showDH ? "sim-btn-active" : "sim-btn-inactive"}`}>DH Params</button>
          <button onClick={() => setShowWorkspace(!showWorkspace)} className={`sim-btn ${showWorkspace ? "sim-btn-active" : "sim-btn-inactive"}`}>Workspace</button>
          <button onClick={() => setAutoRotate(!autoRotate)} className={`sim-btn ${autoRotate ? "sim-btn-active" : "sim-btn-inactive"}`}>Auto-Rotate</button>
          <button onClick={() => { trailRef.current = []; setShowTrail(false); setTimeout(() => setShowTrail(true), 10); }} className="sim-btn sim-btn-inactive">Clear Trail</button>
        </div>
      </ControlSection>

      {showJacobian && (
        <ControlSection title="Jacobian Matrix">
          <div className="bg-secondary/40 rounded-lg p-3 text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
            <div className="text-[9px] mb-1 opacity-60">J = ∂(x,y)/∂(θ₁,θ₂,θ₃)</div>
            <div className="text-primary">[{J[0].map(v => v.toFixed(3)).join(", ")}]</div>
            <div className="text-primary">[{J[1].map(v => v.toFixed(3)).join(", ")}]</div>
            <div className="mt-2 text-[9px]">
              <span className="opacity-60">Manipulability w = </span>
              <span className="text-amber-glow">{manipulability.toFixed(4)}</span>
            </div>
            <div className="text-[9px]">
              <span className="opacity-60">σ₁ = </span><span className="text-primary">{eig1.toFixed(3)}</span>
              <span className="opacity-60 ml-2">σ₂ = </span><span className="text-primary">{eig2.toFixed(3)}</span>
            </div>
          </div>
        </ControlSection>
      )}

      {showDH && (
        <ControlSection title="DH Parameters">
          <div className="bg-secondary/40 rounded-lg p-3 overflow-x-auto">
            <table className="w-full text-[9px] font-mono text-muted-foreground">
              <thead>
                <tr className="text-primary">
                  <th className="text-left pb-1">i</th>
                  <th className="text-right pb-1">θ (rad)</th>
                  <th className="text-right pb-1">d</th>
                  <th className="text-right pb-1">a</th>
                  <th className="text-right pb-1">α</th>
                </tr>
              </thead>
              <tbody>
                {dhParams.map(p => (
                  <tr key={p.i}>
                    <td className="text-foreground">{p.i}</td>
                    <td className="text-right">{p.theta.toFixed(2)}</td>
                    <td className="text-right">{p.d.toFixed(1)}</td>
                    <td className="text-right">{p.a.toFixed(1)}</td>
                    <td className="text-right">{(p.alpha * 180 / Math.PI).toFixed(0)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ControlSection>
      )}

      <ControlSection title="Transformation Matrix">
        <div className="bg-secondary/40 rounded-lg p-3 text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
          <div className="text-[9px] mb-1 opacity-60">T = R(θ₁)·T(L₁)·R(θ₂)·T(L₂)·R(θ₃)·T(L₃)</div>
          <div className="text-primary">[{Math.cos(totalAngle).toFixed(2)}, {-Math.sin(totalAngle).toFixed(2)}, {endX.toFixed(2)}]</div>
          <div className="text-primary">[{Math.sin(totalAngle).toFixed(2)}, {Math.cos(totalAngle).toFixed(2)}, {endY.toFixed(2)}]</div>
          <div className="text-primary">[0.00, 0.00, 1.00]</div>
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary">FK</span>: Direct joint control. <span className="text-amber-glow">IK</span>: Target-based positioning.
          <span className="text-red-glow"> Learn</span>: Record demonstrations & replay. Toggle <span className="text-primary">Jacobian</span>, 
          <span className="text-amber-glow"> Ellipsoid</span> (manipulability), and <span className="text-blue-glow">DH params</span> for analysis.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robotic Arm Kinematics" subtitle="FK · IK · Jacobian · Imitation" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1} enableDamping dampingFactor={0.05} minDistance={2} maxDistance={12} target={[0, 1.5, 0]} />
            <SceneLighting />
            <RobotBase3D />
            <RobotArm3D joint1={joint1} joint2={joint2} joint3={joint3} link1={link1} link2={link2} link3={link3} showDebug={showDebug} trailPoints={showTrail ? trailRef.current : []} />
            {showWorkspace && (
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[link1 + link2 + link3, 24, 24]} />
                <meshBasicMaterial color="#00d4aa" transparent opacity={0.03} wireframe />
              </mesh>
            )}
            {/* IK target marker */}
            {mode === "ik" && (
              <mesh position={[targetX, targetY, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#f0a500" />
              </mesh>
            )}
            {/* Manipulability ellipsoid at end effector */}
            {showEllipsoid && (
              <group position={[endX, endY, 0]} rotation={[0, 0, eigAngle]}>
                <mesh>
                  <sphereGeometry args={[1, 24, 24]} />
                  <meshBasicMaterial color="#f0a500" transparent opacity={0.15} wireframe />
                </mesh>
                <group scale={[eig1 * 0.5, eig2 * 0.5, Math.min(eig1, eig2) * 0.3]}>
                  <mesh>
                    <sphereGeometry args={[1, 24, 24]} />
                    <meshBasicMaterial color="#f0a500" transparent opacity={0.12} />
                  </mesh>
                </group>
              </group>
            )}
            <fog attach="fog" args={["hsl(225, 15%, 6%)", 8, 20]} />
          </Canvas>
        </Suspense>
        <div className="absolute top-3 left-3 glass-panel text-[11px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
          θ₁={((joint1 * 180) / Math.PI).toFixed(1)}° θ₂={((joint2 * 180) / Math.PI).toFixed(1)}° θ₃={((joint3 * 180) / Math.PI).toFixed(1)}°
          <span className="ml-2 text-primary">{mode.toUpperCase()}</span>
          {recording && <span className="ml-2 text-red-glow">● REC</span>}
          {playing && <span className="ml-2 text-green-glow">▶ PLAY</span>}
        </div>
        {showEllipsoid && (
          <div className="absolute bottom-3 left-3 glass-panel text-[10px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
            w = {manipulability.toFixed(3)} | σ₁={eig1.toFixed(2)} σ₂={eig2.toFixed(2)}
          </div>
        )}
      </div>
    </SimLayout>
  );
};

export default ArmKinematicsLab;
