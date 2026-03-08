import { useState, useEffect, useRef, useCallback, Suspense } from "react";
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

  // FK computation for info display
  const link1 = 1.2, link2 = 1.0, link3 = 0.8;
  const totalAngle = joint1 + joint2 + joint3;
  const endY = link1 + Math.cos(joint2) * link2 + Math.cos(joint2 + joint3) * link3;
  const endX = Math.sin(joint2) * link2 + Math.sin(joint2 + joint3) * link3;

  const controls = (
    <>
      <ControlSection title="Joint Angles">
        <SliderControl label="Joint 1 — Base (θ₁)" value={joint1} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint1} color="hsl(175, 80%, 50%)" />
        <SliderControl label="Joint 2 — Shoulder (θ₂)" value={joint2} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint2} color="hsl(150, 70%, 45%)" />
        <SliderControl label="Joint 3 — Elbow (θ₃)" value={joint3} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={setJoint3} color="hsl(210, 80%, 55%)" />
      </ControlSection>
      <ControlSection title="End Effector">
        <div className="space-y-1 text-xs font-mono text-muted-foreground">
          <div className="flex justify-between">
            <span>Position X:</span>
            <span className="text-foreground">{endX.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Position Y:</span>
            <span className="text-foreground">{endY.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Angle:</span>
            <span className="text-foreground">{(totalAngle * 180 / Math.PI).toFixed(1)}°</span>
          </div>
        </div>
      </ControlSection>
      <ControlSection title="View">
        <div className="flex gap-2">
          <button onClick={() => setAutoRotate(!autoRotate)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${autoRotate ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
            Auto-Rotate
          </button>
          <button onClick={() => setShowWorkspace(!showWorkspace)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${showWorkspace ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
            Workspace
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Transformation Matrix">
        <div className="bg-secondary/50 rounded p-2 text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
          <div>T = R(θ₁)·T(L₁)·R(θ₂)·T(L₂)·R(θ₃)·T(L₃)</div>
          <div className="mt-1 text-primary">
            [{Math.cos(totalAngle).toFixed(2)}, {-Math.sin(totalAngle).toFixed(2)}, {endX.toFixed(2)}]
          </div>
          <div className="text-primary">
            [{Math.sin(totalAngle).toFixed(2)}, {Math.cos(totalAngle).toFixed(2)}, {endY.toFixed(2)}]
          </div>
          <div className="text-primary">[0.00, 0.00, 1.00]</div>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Interactive <span className="text-primary">3D robotic arm</span> with 3 revolute joints. Orbit with mouse drag, zoom with scroll. 
          Joint angles control forward kinematics. Coordinate frames show orientation at each joint. The transformation matrix updates in real-time.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robotic Arm Kinematics" subtitle="3D Forward Kinematics" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-[#0a0e17]">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
            <OrbitControls
              autoRotate={autoRotate}
              autoRotateSpeed={1}
              enableDamping
              dampingFactor={0.05}
              minDistance={2}
              maxDistance={12}
              target={[0, 1.5, 0]}
            />
            <SceneLighting />
            <RobotBase3D />
            <RobotArm3D joint1={joint1} joint2={joint2} joint3={joint3} link1={link1} link2={link2} link3={link3} />

            {/* Workspace sphere visualization */}
            {showWorkspace && (
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[link1 + link2 + link3, 24, 24]} />
                <meshBasicMaterial color="#00d4aa" transparent opacity={0.03} wireframe />
              </mesh>
            )}

            {/* Fog for depth */}
            <fog attach="fog" args={["#0a0e17", 8, 20]} />
          </Canvas>
        </Suspense>

        {/* Overlay info */}
        <div className="absolute top-3 left-3 text-xs font-mono text-muted-foreground bg-background/80 px-3 py-2 rounded border border-border">
          θ₁={((joint1 * 180) / Math.PI).toFixed(1)}° θ₂={((joint2 * 180) / Math.PI).toFixed(1)}° θ₃={((joint3 * 180) / Math.PI).toFixed(1)}°
        </div>
      </div>
    </SimLayout>
  );
};

export default ArmKinematicsLab;
