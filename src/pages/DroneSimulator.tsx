import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout, { useLearningMode } from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import EducationPanel from "@/components/EducationPanel";
import FocusMode, { FocusToggleButton } from "@/components/FocusMode";
import TelemetryPanel from "@/components/TelemetryPanel";
import { Drone3D, DroneSceneLighting } from "@/components/3d/Drone3D";
import * as THREE from "three";

const DroneSimulator = () => {
  const learningMode = useLearningMode();
  const [thrust, setThrust] = useState(0.5);
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [showThrust, setShowThrust] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState<"manual" | "waypoint">("manual");

  // Simple position integration
  const posRef = useRef<[number, number, number]>([0, 1.5, 0]);
  const [pos, setPos] = useState<[number, number, number]>([0, 1.5, 0]);
  const waypointIdx = useRef(0);

  const waypoints = [
    new THREE.Vector3(0, 1.5, 0),
    new THREE.Vector3(1, 2, 1),
    new THREE.Vector3(-1, 1.8, 1.5),
    new THREE.Vector3(-1, 2.2, -1),
    new THREE.Vector3(1, 1.5, -1),
    new THREE.Vector3(0, 1.5, 0),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const p = posRef.current;
      if (mode === "manual") {
        const targetY = thrust * 3;
        p[1] += (targetY - p[1]) * 0.05;
        p[0] += roll * 0.02;
        p[2] += pitch * 0.02;
      } else {
        // Waypoint following
        const wp = waypoints[waypointIdx.current];
        const dx = wp.x - p[0], dy = wp.y - p[1], dz = wp.z - p[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.1) {
          waypointIdx.current = (waypointIdx.current + 1) % waypoints.length;
        }
        p[0] += dx * 0.03;
        p[1] += dy * 0.03;
        p[2] += dz * 0.03;
      }
      posRef.current = [...p] as [number, number, number];
      setPos([...p] as [number, number, number]);
    }, 16);
    return () => clearInterval(interval);
  }, [mode, thrust, roll, pitch]);

  const controls = (
    <>
      <ControlSection title="Flight Mode">
        <div className="flex gap-2">
          {(["manual", "waypoint"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); waypointIdx.current = 0; }}
              className={`flex-1 sim-btn ${mode === m ? "sim-btn-active" : "sim-btn-inactive"} capitalize`}>
              {m}
            </button>
          ))}
        </div>
      </ControlSection>

      {mode === "manual" ? (
        <ControlSection title="Flight Controls">
          <SliderControl label="Thrust" value={thrust} min={0} max={1} step={0.01} onChange={setThrust} color="hsl(38, 88%, 52%)" />
          <SliderControl label="Roll" value={roll} min={-1} max={1} step={0.01} onChange={setRoll} color="hsl(0, 65%, 52%)" />
          <SliderControl label="Pitch" value={pitch} min={-1} max={1} step={0.01} onChange={setPitch} color="hsl(212, 78%, 52%)" />
          <SliderControl label="Yaw" value={yaw} min={-1} max={1} step={0.01} onChange={setYaw} color="hsl(268, 58%, 52%)" />
        </ControlSection>
      ) : (
        <ControlSection title="Waypoint Info">
          <p className="text-[11px] text-muted-foreground">Drone follows {waypoints.length} waypoints automatically. PID controller handles attitude stabilization.</p>
          <div className="text-[10px] font-mono text-primary mt-1">
            Waypoint {waypointIdx.current + 1}/{waypoints.length}
          </div>
        </ControlSection>
      )}

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowThrust(!showThrust)} className={`sim-btn ${showThrust ? "sim-btn-active" : "sim-btn-inactive"}`}>Thrust</button>
          <button onClick={() => setShowAxes(!showAxes)} className={`sim-btn ${showAxes ? "sim-btn-active" : "sim-btn-inactive"}`}>Axes</button>
          <button onClick={() => setShowTrajectory(!showTrajectory)} className={`sim-btn ${showTrajectory ? "sim-btn-active" : "sim-btn-inactive"}`}>Trajectory</button>
          <FocusToggleButton active={focusMode} onToggle={() => setFocusMode(!focusMode)} />
        </div>
      </ControlSection>

      {learningMode && (
        <>
          <EducationPanel
            title="Quadcopter Dynamics"
            concept="How drones achieve stable flight"
            explanation="A quadcopter uses four rotors to generate lift. By varying the speed of individual rotors, the drone controls roll (side tilt), pitch (forward tilt), yaw (rotation), and altitude."
            formula="F_total = Σ(ω²ᵢ · kₜ) — mg"
            keyPoints={[
              "Opposite rotors spin in different directions to cancel torque",
              "Roll: increase left rotors, decrease right rotors",
              "Pitch: increase rear rotors, decrease front rotors",
              "Yaw: increase CW rotors, decrease CCW rotors",
            ]}
            tip="Try manual mode and observe how thrust vectors change when you adjust roll and pitch."
          />
          <EducationPanel
            title="PID Attitude Control"
            concept="Stabilizing drone orientation"
            explanation="Each axis (roll, pitch, yaw) has its own PID controller that reads IMU data and adjusts motor speeds to maintain the desired orientation."
            formula="u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de/dt"
            keyPoints={[
              "Inner loop (1000Hz): attitude stabilization",
              "Outer loop (100Hz): position/velocity tracking",
              "Cascaded PID enables precise waypoint following",
            ]}
          />
        </>
      )}
    </>
  );

  return (
    <SimLayout title="Drone Simulator" subtitle="Attitude · Thrust · Waypoints" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 2.5, 3]} fov={45} />
            <OrbitControls enableDamping dampingFactor={0.05} target={[0, 1.5, 0]} minDistance={1.5} maxDistance={10} />
            <DroneSceneLighting />
            <gridHelper args={[10, 20, "#1a2a3a", "#111827"]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#0d1117" transparent opacity={0.8} />
            </mesh>
            <Drone3D thrust={thrust} roll={roll} pitch={pitch} yaw={yaw}
              showThrust={showThrust} showAxes={showAxes} showTrajectory={showTrajectory}
              waypoints={waypoints} position={pos} />
            <fog attach="fog" args={["hsl(225, 15%, 6%)", 8, 18]} />
          </Canvas>
        </Suspense>

        <FocusMode active={focusMode} onToggle={() => setFocusMode(false)} robotName="Quadcopter Drone"
          labels={[
            { name: "Flight Controller", color: "hsl(172, 78%, 47%)" },
            { name: "IMU + Gyroscope", color: "hsl(268, 58%, 52%)" },
            { name: "GPS Module", color: "hsl(38, 88%, 52%)" },
            { name: "Camera Gimbal", color: "hsl(212, 78%, 52%)" },
            { name: "Brushless Motors ×4", color: "hsl(0, 65%, 52%)" },
          ]}
        />

        <div className="absolute top-3 right-3 w-[155px] z-20">
          <TelemetryPanel
            mode={mode === "waypoint" ? "Planning" : "Balancing"}
            items={[
              { label: "Altitude", value: pos[1].toFixed(2), unit: " m" },
              { label: "Thrust", value: (thrust * 100).toFixed(0), unit: "%" },
              { label: "Roll", value: (roll * 45).toFixed(1), unit: "°" },
              { label: "Pitch", value: (pitch * 45).toFixed(1), unit: "°" },
              { label: "Mode", value: mode.toUpperCase(), color: mode === "waypoint" ? "hsl(38, 88%, 52%)" : "hsl(172, 78%, 47%)" },
            ]}
          />
        </div>
      </div>
    </SimLayout>
  );
};

export default DroneSimulator;
