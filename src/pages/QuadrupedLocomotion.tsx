import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout, { useLearningMode } from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import EducationPanel from "@/components/EducationPanel";
import FocusMode, { FocusToggleButton } from "@/components/FocusMode";
import TelemetryPanel from "@/components/TelemetryPanel";
import { Quadruped3D, QuadrupedSceneLighting } from "@/components/3d/Quadruped3D";

const QuadrupedLocomotion = () => {
  const learningMode = useLearningMode();
  const [gait, setGait] = useState<"stand" | "walk" | "trot">("stand");
  const [showCoM, setShowCoM] = useState(true);
  const [showSupport, setShowSupport] = useState(true);
  const [showFootsteps, setShowFootsteps] = useState(false);
  const [disturbance, setDisturbance] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [cinematic, setCinematic] = useState(false);

  const controls = (
    <>
      <ControlSection title="Gait Control">
        <div className="flex gap-2">
          {(["stand", "walk", "trot"] as const).map(g => (
            <button key={g} onClick={() => setGait(g)}
              className={`flex-1 sim-btn ${gait === g ? "sim-btn-active" : "sim-btn-inactive"} capitalize`}>
              {g}
            </button>
          ))}
        </div>
      </ControlSection>

      <ControlSection title="Disturbance">
        <SliderControl label="Lateral Force" value={disturbance} min={-10} max={10} step={0.5} unit=" N" onChange={setDisturbance} color="hsl(0, 65%, 52%)" />
        <div className="flex gap-2">
          <button onClick={() => setDisturbance(-5)} className="flex-1 sim-btn sim-btn-inactive">← Push</button>
          <button onClick={() => setDisturbance(0)} className="flex-1 sim-btn sim-btn-inactive">Reset</button>
          <button onClick={() => setDisturbance(5)} className="flex-1 sim-btn sim-btn-inactive">Push →</button>
        </div>
      </ControlSection>

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowCoM(!showCoM)} className={`sim-btn ${showCoM ? "sim-btn-active" : "sim-btn-inactive"}`}>CoM</button>
          <button onClick={() => setShowSupport(!showSupport)} className={`sim-btn ${showSupport ? "sim-btn-active" : "sim-btn-inactive"}`}>Support</button>
          <button onClick={() => setShowFootsteps(!showFootsteps)} className={`sim-btn ${showFootsteps ? "sim-btn-active" : "sim-btn-inactive"}`}>Footsteps</button>
          <button onClick={() => setCinematic(!cinematic)} className={`sim-btn ${cinematic ? "sim-btn-active" : "sim-btn-inactive"}`}>Cinematic</button>
          <FocusToggleButton active={focusMode} onToggle={() => setFocusMode(!focusMode)} />
        </div>
      </ControlSection>

      {learningMode && (
        <>
          <EducationPanel
            title="Quadruped Locomotion"
            concept="How four-legged robots walk and balance"
            explanation="Quadruped robots use coordinated leg movements called gaits to walk. A walking gait moves one leg at a time (3 legs always on ground), while a trotting gait moves diagonal pairs simultaneously for speed."
            keyPoints={[
              "The support polygon is formed by feet touching the ground",
              "Center of mass must stay inside the support polygon for stability",
              "Trotting is faster but less stable than walking",
              "Real quadrupeds like Spot use model-predictive control",
            ]}
            tip="Switch between gaits and watch how the support polygon and footstep pattern change."
          />
          <EducationPanel
            title="Gait Cycles"
            concept="Coordinated leg movement patterns"
            explanation="A gait cycle defines the timing and sequence of leg movements. Phase offset between legs determines whether the robot walks, trots, or gallops."
            formula="Phase offset: Walk=π/2, Trot=π, Gallop=variable"
            keyPoints={[
              "Walk: each leg has 75% stance time (safe, slow)",
              "Trot: diagonal pairs move together (fast, dynamic)",
              "Gallop: all legs leave ground briefly (fastest, unstable)",
            ]}
          />
        </>
      )}
    </>
  );

  return (
    <SimLayout title="Quadruped Locomotion" subtitle="Gaits · CoM · Support Polygon" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[2, 1.5, 3]} fov={45} />
            <OrbitControls enableDamping dampingFactor={0.05} target={[0, 0.4, 0]} minDistance={1.5} maxDistance={8} autoRotate={cinematic} autoRotateSpeed={0.8} />
            <QuadrupedSceneLighting />
            <gridHelper args={[10, 20, "#1a2a3a", "#111827"]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#0d1117" transparent opacity={0.8} />
            </mesh>
            <Quadruped3D gait={gait} showCoM={showCoM} showSupport={showSupport} showFootsteps={showFootsteps} disturbance={disturbance} />
            <fog attach="fog" args={["hsl(225, 15%, 6%)", 6, 14]} />
          </Canvas>
        </Suspense>

        <FocusMode active={focusMode} onToggle={() => setFocusMode(false)} robotName="Quadruped Robot"
          labels={[
            { name: "Gait", value: gait.toUpperCase(), color: "hsl(172, 78%, 47%)" },
            { name: "LIDAR Scanner", color: "hsl(172, 78%, 47%)" },
            { name: "Depth Camera", color: "hsl(212, 78%, 52%)" },
            { name: "IMU (body)", color: "hsl(268, 58%, 52%)" },
            { name: "Force Sensors (feet)", color: "hsl(38, 88%, 52%)" },
          ]}
        />

        <div className="absolute top-3 right-3 w-[155px] z-20">
          <TelemetryPanel
            mode={gait === "stand" ? "Idle" : gait === "walk" ? "Walking" : "Balancing"}
            items={[
              { label: "Gait", value: gait.toUpperCase() },
              { label: "Legs Down", value: gait === "walk" ? "3" : gait === "trot" ? "2" : "4" },
              { label: "Disturbance", value: disturbance.toFixed(1), unit: " N", highlight: Math.abs(disturbance) > 3 },
              { label: "Stability", value: Math.abs(disturbance) < 3 ? "STABLE" : "RECOVERING", color: Math.abs(disturbance) < 3 ? "hsl(152, 68%, 42%)" : "hsl(38, 88%, 52%)" },
            ]}
          />
        </div>
      </div>
    </SimLayout>
  );
};

export default QuadrupedLocomotion;
