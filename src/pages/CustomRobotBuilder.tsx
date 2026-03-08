import { useState, Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";
import { SceneLighting, RobotBase3D, CoordinateFrame } from "@/components/3d/RobotArm3D";
import * as THREE from "three";

interface LinkConfig {
  length: number;
  radius: number;
  color: string;
  jointType: "revolute" | "prismatic";
}

const COLORS = ["#00d4aa", "#00b894", "#0984e3", "#6c5ce7", "#fdcb6e", "#e17055", "#00cec9"];

const CustomLink = ({ length, radius, color }: { length: number; radius: number; color: string }) => (
  <group>
    <mesh position={[0, length / 2, 0]}>
      <capsuleGeometry args={[radius, length - radius * 2, 8, 16]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, length * 0.1, 0]}>
      <torusGeometry args={[radius + 0.01, 0.012, 8, 16]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
    </mesh>
  </group>
);

const CustomJoint = ({ radius, color, type }: { radius: number; color: string; type: string }) => (
  <group>
    {type === "revolute" ? (
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
    ) : (
      <mesh>
        <boxGeometry args={[radius * 1.5, radius * 1.5, radius * 1.5]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>
    )}
  </group>
);

const BuilderArm = ({ links, angles }: { links: LinkConfig[]; angles: number[] }) => {
  const renderChain = (index: number): React.ReactNode => {
    if (index >= links.length) return null;
    const link = links[index];
    const angle = angles[index] || 0;

    return (
      <group rotation={link.jointType === "revolute" ? [0, 0, angle] : [0, 0, 0]}
             position={link.jointType === "prismatic" ? [0, angle * 0.5, 0] : [0, 0, 0]}>
        <CustomJoint radius={link.radius * 1.3} color={link.color} type={link.jointType} />
        <CoordinateFrame size={link.length * 0.3} />
        <CustomLink length={link.length} radius={link.radius} color={link.color} />
        <group position={[0, link.length, 0]}>
          {renderChain(index + 1)}
        </group>
      </group>
    );
  };

  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.02, 8, 32]} />
        <meshStandardMaterial color="#00d4aa" metalness={0.5} roughness={0.3} emissive="#00d4aa" emissiveIntensity={0.2} />
      </mesh>
      {renderChain(0)}
    </group>
  );
};

const CustomRobotBuilder = () => {
  const [dof, setDof] = useState(3);
  const [links, setLinks] = useState<LinkConfig[]>([
    { length: 1.2, radius: 0.08, color: COLORS[0], jointType: "revolute" },
    { length: 1.0, radius: 0.07, color: COLORS[1], jointType: "revolute" },
    { length: 0.8, radius: 0.06, color: COLORS[2], jointType: "revolute" },
  ]);
  const [angles, setAngles] = useState<number[]>([0.3, -0.5, 0.2]);
  const [selectedJoint, setSelectedJoint] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);

  const updateDof = useCallback((newDof: number) => {
    const clamped = Math.max(1, Math.min(7, Math.round(newDof)));
    setDof(clamped);
    const newLinks = [...links];
    const newAngles = [...angles];
    while (newLinks.length < clamped) {
      const idx = newLinks.length;
      newLinks.push({
        length: 1.0 - idx * 0.1,
        radius: 0.08 - idx * 0.008,
        color: COLORS[idx % COLORS.length],
        jointType: "revolute",
      });
      newAngles.push(0);
    }
    setLinks(newLinks.slice(0, clamped));
    setAngles(newAngles.slice(0, clamped));
    if (selectedJoint >= clamped) setSelectedJoint(clamped - 1);
  }, [links, angles, selectedJoint]);

  const updateLink = useCallback((idx: number, key: keyof LinkConfig, value: number | string) => {
    setLinks(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l));
  }, []);

  const updateAngle = useCallback((idx: number, value: number) => {
    setAngles(prev => prev.map((a, i) => i === idx ? value : a));
  }, []);

  const exportConfig = useCallback(() => {
    const config = {
      dof,
      links: links.map((l, i) => ({
        joint: i + 1,
        type: l.jointType,
        length: l.length,
        radius: l.radius,
        angle_rad: angles[i],
        angle_deg: (angles[i] * 180 / Math.PI).toFixed(1),
      })),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `robot_config_${dof}dof.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dof, links, angles]);

  const sel = links[selectedJoint];

  const controls = (
    <>
      <ControlSection title="Robot Configuration">
        <SliderControl label="Degrees of Freedom" value={dof} min={1} max={7} step={1} onChange={updateDof} color="hsl(175, 80%, 50%)" />
        <div className="flex flex-wrap gap-1">
          {links.map((_, i) => (
            <button key={i} onClick={() => setSelectedJoint(i)}
              className={`text-xs font-mono py-1 px-2 rounded border transition-colors ${selectedJoint === i ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}
              style={selectedJoint === i ? { borderColor: links[i].color, color: links[i].color } : {}}>
              J{i + 1}
            </button>
          ))}
        </div>
      </ControlSection>
      {sel && (
        <ControlSection title={`Joint ${selectedJoint + 1} Properties`}>
          <SliderControl label="Link Length" value={sel.length} min={0.3} max={2} step={0.05} unit=" m" onChange={v => updateLink(selectedJoint, "length", v)} color={sel.color} />
          <SliderControl label="Link Radius" value={sel.radius} min={0.02} max={0.15} step={0.005} unit=" m" onChange={v => updateLink(selectedJoint, "radius", v)} color={sel.color} />
          <SliderControl label="Joint Angle" value={angles[selectedJoint]} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => updateAngle(selectedJoint, v)} color={sel.color} />
          <div className="flex gap-2">
            <button onClick={() => updateLink(selectedJoint, "jointType", "revolute")}
              className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${sel.jointType === "revolute" ? "border-primary text-primary" : "border-border text-foreground"}`}>
              Revolute
            </button>
            <button onClick={() => updateLink(selectedJoint, "jointType", "prismatic")}
              className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${sel.jointType === "prismatic" ? "border-primary text-primary" : "border-border text-foreground"}`}>
              Prismatic
            </button>
          </div>
        </ControlSection>
      )}
      <ControlSection title="All Joint Angles">
        {angles.map((a, i) => (
          <SliderControl key={i} label={`θ${i + 1}`} value={a} min={-Math.PI} max={Math.PI} step={0.01} unit=" rad" onChange={v => updateAngle(i, v)} color={links[i]?.color || "hsl(175, 80%, 50%)"} />
        ))}
      </ControlSection>
      <ControlSection title="Actions">
        <div className="flex gap-2">
          <button onClick={() => setAutoRotate(!autoRotate)}
            className={`flex-1 text-xs font-mono py-2 rounded border transition-colors ${autoRotate ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"}`}>
            Auto-Rotate
          </button>
          <button onClick={exportConfig}
            className="flex-1 text-xs font-mono py-2 rounded border border-border hover:border-primary/50 text-foreground transition-colors">
            📥 Export JSON
          </button>
        </div>
      </ControlSection>
      <ControlSection title="Guide">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Build custom robots with <span className="text-primary">1–7 DOF</span>. Select joints to adjust link length, radius, angle, and type 
          (<span className="text-green-glow">revolute</span> or <span className="text-blue-glow">prismatic</span>). 
          Export your configuration as JSON.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Robot Builder" subtitle="Custom Manipulator Design" controls={controls}>
      <div className="w-full h-full min-h-[400px] relative bg-[#0a0e17]">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">Loading 3D Scene...</div>}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 3, 4]} fov={50} />
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1} enableDamping dampingFactor={0.05} minDistance={2} maxDistance={12} target={[0, 1.5, 0]} />
            <SceneLighting />
            <RobotBase3D />
            <BuilderArm links={links} angles={angles} />
            <fog attach="fog" args={["#0a0e17", 8, 20]} />
          </Canvas>
        </Suspense>
        <div className="absolute top-3 left-3 text-xs font-mono text-muted-foreground bg-background/80 px-3 py-2 rounded border border-border">
          {dof}-DOF Robot | {links.map((l, i) => `θ${i + 1}=${(angles[i] * 180 / Math.PI).toFixed(0)}°`).join(" ")}
        </div>
      </div>
    </SimLayout>
  );
};

export default CustomRobotBuilder;
