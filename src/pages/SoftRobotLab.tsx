import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout, { useLearningMode } from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import EducationPanel from "@/components/EducationPanel";
import FocusMode, { FocusToggleButton } from "@/components/FocusMode";
import TelemetryPanel from "@/components/TelemetryPanel";
import { SoftRobot3D, SoftRobotSceneLighting } from "@/components/3d/SoftRobot3D";

const SoftRobotLab = () => {
  const learningMode = useLearningMode();
  const [p1, setP1] = useState(0.5);
  const [p2, setP2] = useState(0.5);
  const [p3, setP3] = useState(0.5);
  const [showMesh, setShowMesh] = useState(false);
  const [showPressure, setShowPressure] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [preset, setPreset] = useState<string>("neutral");

  const applyPreset = (name: string) => {
    setPreset(name);
    switch (name) {
      case "neutral": setP1(0.5); setP2(0.5); setP3(0.5); break;
      case "curl": setP1(0.8); setP2(0.8); setP3(0.8); break;
      case "reach": setP1(0.3); setP2(0.3); setP3(0.3); break;
      case "s-curve": setP1(0.8); setP2(0.2); setP3(0.8); break;
    }
  };

  const controls = (
    <>
      <ControlSection title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {["neutral", "curl", "reach", "s-curve"].map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`sim-btn ${preset === p ? "sim-btn-active" : "sim-btn-inactive"} capitalize`}>
              {p}
            </button>
          ))}
        </div>
      </ControlSection>

      <ControlSection title="Chamber Pressure">
        <SliderControl label="Chamber 1 (Base)" value={p1} min={0} max={1} step={0.01} onChange={(v) => { setP1(v); setPreset("custom"); }} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Chamber 2 (Mid)" value={p2} min={0} max={1} step={0.01} onChange={(v) => { setP2(v); setPreset("custom"); }} color="hsl(212, 78%, 52%)" />
        <SliderControl label="Chamber 3 (Tip)" value={p3} min={0} max={1} step={0.01} onChange={(v) => { setP3(v); setPreset("custom"); }} color="hsl(268, 58%, 52%)" />
      </ControlSection>

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowMesh(!showMesh)} className={`sim-btn ${showMesh ? "sim-btn-active" : "sim-btn-inactive"}`}>Mesh</button>
          <button onClick={() => setShowPressure(!showPressure)} className={`sim-btn ${showPressure ? "sim-btn-active" : "sim-btn-inactive"}`}>Pressure</button>
          <FocusToggleButton active={focusMode} onToggle={() => setFocusMode(!focusMode)} />
        </div>
      </ControlSection>

      {learningMode && (
        <>
          <EducationPanel
            title="Soft Robotics"
            concept="Robots built from flexible materials"
            explanation="Soft robots use compliant materials instead of rigid links and joints. They are actuated by pneumatic pressure, enabling safe interaction with humans and delicate objects."
            keyPoints={[
              "No rigid joints — deformation IS the motion",
              "Pneumatic chambers inflate to create bending",
              "Infinite degrees of freedom (continuum mechanics)",
              "Ideal for medical devices, food handling, exploration",
            ]}
            tip="Try the S-curve preset to see how differential pressure creates complex shapes impossible with rigid robots."
          />
          <EducationPanel
            title="Continuum Mechanics"
            concept="Modeling deformable bodies"
            explanation="Unlike rigid robots described by joint angles, soft robots require continuum models — the Cosserat rod model or constant curvature approximation describe bending as a function of applied pressure."
            formula="κ(s) = ΔP · r / (E · I)"
            keyPoints={[
              "Curvature κ is proportional to pressure difference",
              "Stiffness E and moment of inertia I resist bending",
              "Each chamber section acts like an independent actuator",
            ]}
          />
        </>
      )}
    </>
  );

  return (
    <SimLayout title="Soft Robot Lab" subtitle="Pneumatic · Deformable · Continuum" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[1.5, 1.5, 2]} fov={45} />
            <OrbitControls enableDamping dampingFactor={0.05} target={[0, 0.5, 0]} minDistance={1} maxDistance={6} />
            <SoftRobotSceneLighting />
            <gridHelper args={[6, 12, "#1a2a3a", "#111827"]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[6, 6]} />
              <meshStandardMaterial color="#0d1117" transparent opacity={0.8} />
            </mesh>
            <SoftRobot3D pressure={[p1, p2, p3]} showMesh={showMesh} showPressure={showPressure} />
            <fog attach="fog" args={["hsl(225, 15%, 6%)", 4, 10]} />
          </Canvas>
        </Suspense>

        <FocusMode active={focusMode} onToggle={() => setFocusMode(false)} robotName="Soft Pneumatic Robot"
          labels={[
            { name: "Chamber 1", value: `${(p1 * 100).toFixed(0)}%`, color: "hsl(172, 78%, 47%)" },
            { name: "Chamber 2", value: `${(p2 * 100).toFixed(0)}%`, color: "hsl(212, 78%, 52%)" },
            { name: "Chamber 3", value: `${(p3 * 100).toFixed(0)}%`, color: "hsl(268, 58%, 52%)" },
            { name: "Tip Sensor", color: "hsl(38, 88%, 52%)" },
          ]}
        />

        <div className="absolute top-3 right-3 w-[155px] z-20">
          <TelemetryPanel
            mode={preset === "neutral" ? "Idle" : "Planning"}
            items={[
              { label: "Ch. 1", value: `${(p1 * 100).toFixed(0)}%`, highlight: p1 > 0.7 },
              { label: "Ch. 2", value: `${(p2 * 100).toFixed(0)}%`, highlight: p2 > 0.7 },
              { label: "Ch. 3", value: `${(p3 * 100).toFixed(0)}%`, highlight: p3 > 0.7 },
              { label: "Shape", value: preset.toUpperCase(), color: "hsl(212, 78%, 52%)" },
            ]}
          />
        </div>
      </div>
    </SimLayout>
  );
};

export default SoftRobotLab;
