import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { RobotArm3D, RobotBase3D, SceneLighting } from "@/components/3d/RobotArm3D";

const ArmKinematicsLab = () => {
  const [joint1, setJoint1] = useState(0.5);
  const [joint2, setJoint2] = useState(-0.8);
  const [joint3, setJoint3] = useState(0.3);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [ikMode, setIkMode] = useState(false);
  const [targetX, setTargetX] = useState(1.0);
  const [targetY, setTargetY] = useState(1.5);

  const link1 = 1.2, link2 = 1.0, link3 = 0.8;
  const totalAngle = joint1 + joint2 + joint3;
  const endY = link1 + Math.cos(joint2) * link2 + Math.cos(joint2 + joint3) * link3;
  const endX = Math.sin(joint2) * link2 + Math.sin(joint2 + joint3) * link3;

  // Simple 2-link IK (for the shoulder+elbow plane)
  const solveIK = (tx: number, ty: number) => {
    const adjustedTy = ty - link1; // remove base height
    const dist = Math.sqrt(tx * tx + adjustedTy * adjustedTy);
    const maxReach = link2 + link3;
    if (dist > maxReach) return; // out of reach
    const cosQ3 = (dist * dist - link2 * link2 - link3 * link3) / (2 * link2 * link3);
    if (Math.abs(cosQ3) > 1) return;
    const q3 = Math.acos(Math.max(-1, Math.min(1, cosQ3)));
    const alpha = Math.atan2(tx, adjustedTy);
    const beta = Math.atan2(link3 * Math.sin(q3), link2 + link3 * Math.cos(q3));
    const q2 = alpha - beta;
    setJoint2(q2);
    setJoint3(-q3);
  };

  // Apply IK when target changes
  const handleTargetChange = (axis: "x" | "y", val: number) => {
    if (axis === "x") { setTargetX(val); solveIK(val, targetY); }
    else { setTargetY(val); solveIK(targetX, val); }
  };

  const controls = (
    <>
      <ControlSection title="Mode">
        <div className="flex gap-2">
          <button onClick={() => setIkMode(false)}
            className={`flex-1 sim-btn ${!ikMode ? "sim-btn-active" : "sim-btn-inactive"}`}>
            FK Mode
          </button>
          <button onClick={() => setIkMode(true)}
            className={`flex-1 sim-btn ${ikMode ? "sim-btn-active" : "sim-btn-inactive"}`}>
            IK Mode
          </button>
        </div>
      </ControlSection>

      {ikMode ? (
        <ControlSection title="IK Target">
          <SliderControl label="Target X" value={targetX} min={-2} max={2} step={0.01} unit=" m" onChange={v => handleTargetChange("x", v)} color="hsl(40, 90%, 55%)" />
          <SliderControl label="Target Y" value={targetY} min={0.5} max={3} step={0.01} unit=" m" onChange={v => handleTargetChange("y", v)} color="hsl(40, 90%, 55%)" />
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
        </div>
      </ControlSection>

      <ControlSection title="View">
        <div className="flex gap-2">
          <button onClick={() => setAutoRotate(!autoRotate)}
            className={`flex-1 sim-btn ${autoRotate ? "sim-btn-active" : "sim-btn-inactive"}`}>
            Auto-Rotate
          </button>
          <button onClick={() => setShowWorkspace(!showWorkspace)}
            className={`flex-1 sim-btn ${showWorkspace ? "sim-btn-active" : "sim-btn-inactive"}`}>
            Workspace
          </button>
        </div>
      </ControlSection>

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
          Interactive <span className="text-primary">3D robotic arm</span> with 3 revolute joints. Switch between <span className="text-primary">FK</span> (direct joint control) and <span className="text-amber-glow">IK</span> (target-based positioning). Orbit with mouse, zoom with scroll.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robotic Arm Kinematics" subtitle="FK · IK · 3D Visualization" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1} enableDamping dampingFactor={0.05} minDistance={2} maxDistance={12} target={[0, 1.5, 0]} />
            <SceneLighting />
            <RobotBase3D />
            <RobotArm3D joint1={joint1} joint2={joint2} joint3={joint3} link1={link1} link2={link2} link3={link3} />
            {showWorkspace && (
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[link1 + link2 + link3, 24, 24]} />
                <meshBasicMaterial color="#00d4aa" transparent opacity={0.03} wireframe />
              </mesh>
            )}
            {/* IK target marker */}
            {ikMode && (
              <mesh position={[targetX, targetY, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#f0a500" />
              </mesh>
            )}
            <fog attach="fog" args={["hsl(225, 15%, 6%)", 8, 20]} />
          </Canvas>
        </Suspense>
        <div className="absolute top-3 left-3 glass-panel text-[11px] font-mono text-muted-foreground px-3 py-2 rounded-lg">
          θ₁={((joint1 * 180) / Math.PI).toFixed(1)}° θ₂={((joint2 * 180) / Math.PI).toFixed(1)}° θ₃={((joint3 * 180) / Math.PI).toFixed(1)}°
          <span className="ml-2 text-primary">{ikMode ? "IK" : "FK"}</span>
        </div>
      </div>
    </SimLayout>
  );
};

export default ArmKinematicsLab;
