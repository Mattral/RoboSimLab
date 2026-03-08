import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TooltipHotspot from "./TooltipHotspot";

interface RobotArmProps {
  joint1: number;
  joint2: number;
  joint3: number;
  link1?: number;
  link2?: number;
  link3?: number;
  showDebug?: boolean;
  trailPoints?: THREE.Vector3[];
}

/** Brushed metal material — matte industrial finish */
const BrushedMetal = ({ color, emissive }: { color: string; emissive?: string }) => (
  <meshStandardMaterial
    color={color}
    metalness={0.82}
    roughness={0.18}
    envMapIntensity={0.6}
    {...(emissive ? { emissive, emissiveIntensity: 0.08 } : {})}
  />
);

/** Polymer/rubber material — matte dark finish */
const PolymerMat = ({ color = "#0d0d14" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.15} roughness={0.75} />
);

/** Accent/indicator material with glow */
const AccentMat = ({ color, intensity = 0.25 }: { color: string; intensity?: number }) => (
  <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} emissive={color} emissiveIntensity={intensity} />
);

/** Mechanical link with engineering-grade detail */
const LinkSegment = ({ length, color, radius = 0.08 }: { length: number; color: string; radius?: number }) => (
  <group>
    {/* Main structural tube — slightly tapered */}
    <mesh position={[0, length / 2, 0]} castShadow>
      <cylinderGeometry args={[radius, radius * 0.9, length, 24]} />
      <BrushedMetal color={color} />
    </mesh>
    {/* Inner structural core — visible through cutaway */}
    <mesh position={[0, length / 2, 0]} castShadow>
      <cylinderGeometry args={[radius * 0.55, radius * 0.5, length * 0.82, 10]} />
      <PolymerMat />
    </mesh>
    {/* Precision bolt flanges at each end */}
    {[0.06, 0.94].map((pos, i) => (
      <group key={i} position={[0, length * pos, 0]}>
        <mesh>
          <torusGeometry args={[radius + 0.015, 0.014, 10, 28]} />
          <BrushedMetal color="#1e2128" />
        </mesh>
        {/* Hex bolt studs — 6 per flange */}
        {Array.from({ length: 6 }).map((_, j) => {
          const angle = (j / 6) * Math.PI * 2;
          return (
            <mesh key={j} position={[Math.cos(angle) * (radius + 0.015), 0, Math.sin(angle) * (radius + 0.015)]}>
              <cylinderGeometry args={[0.007, 0.007, 0.012, 6]} />
              <BrushedMetal color="#3d4450" />
            </mesh>
          );
        })}
      </group>
    ))}
    {/* Cable routing channel — side rail */}
    <mesh position={[radius * 0.88, length / 2, 0]} castShadow>
      <boxGeometry args={[0.012, length * 0.55, 0.022]} />
      <PolymerMat color="#12141a" />
    </mesh>
    {/* Cable clip points */}
    {[0.3, 0.5, 0.7].map((p, i) => (
      <mesh key={i} position={[radius * 0.88, length * p, 0]}>
        <boxGeometry args={[0.018, 0.008, 0.028]} />
        <BrushedMetal color="#2a2d35" />
      </mesh>
    ))}
    {/* Actuator housing — servo motor block */}
    <group position={[-radius * 0.55, length * 0.42, 0]}>
      <mesh castShadow>
        <boxGeometry args={[radius * 0.55, length * 0.22, radius * 0.65]} />
        <BrushedMetal color="#1a2535" emissive="#0984e3" />
      </mesh>
      {/* Ventilation slots */}
      {[-0.03, 0, 0.03].map((y, i) => (
        <mesh key={i} position={[0, y, radius * 0.33]}>
          <boxGeometry args={[radius * 0.38, 0.006, 0.003]} />
          <PolymerMat />
        </mesh>
      ))}
      {/* Status LED */}
      <mesh position={[radius * 0.22, length * 0.08, radius * 0.33]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <AccentMat color="#00d4aa" intensity={0.6} />
      </mesh>
    </group>
  </group>
);

/** Joint sphere — precision revolute joint with housing */
const JointSphere = ({ radius = 0.12, color }: { radius?: number; color: string }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  // Subtle micro-rotation — joint never looks frozen
  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group>
      {/* Main joint body — precision bearing */}
      <mesh castShadow>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.78} roughness={0.15} envMapIntensity={0.7} />
      </mesh>
      {/* Outer housing ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.15, radius * 0.1, 10, 32]} />
        <BrushedMetal color="#1a1e28" />
      </mesh>
      {/* Inner encoder ring — slowly rotates */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.85, 0.008, 6, 32]} />
        <AccentMat color={color} intensity={0.4} />
      </mesh>
      {/* Rotation axis indicator */}
      <mesh position={[0, radius * 1.3, 0]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <AccentMat color={color} intensity={0.5} />
      </mesh>
      {/* Encoder tick marks */}
      {[0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * radius * 1.15, 0, Math.sin(a) * radius * 1.15]} rotation={[Math.PI / 2, 0, a]}>
          <boxGeometry args={[0.004, 0.004, radius * 0.15]} />
          <AccentMat color="#636e72" intensity={0.1} />
        </mesh>
      ))}
    </group>
  );
};

/** Animated gripper end effector with micro-motion */
const EndEffector = () => {
  const ref = useRef<THREE.Group>(null);
  const fingerRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      // Very subtle breathing rotation
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.02;
    }
    if (fingerRef.current) {
      // Tiny grip oscillation — servo correction
      fingerRef.current.position.x = Math.sin(clock.elapsedTime * 1.5) * 0.002;
    }
  });

  return (
    <group ref={ref}>
      {/* Gripper wrist plate */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.08, 0.045, 20]} />
        <BrushedMetal color="#1a2535" />
      </mesh>
      {/* Wrist bearing ring */}
      <mesh position={[0, 0.024, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.065, 0.006, 6, 20]} />
        <AccentMat color="#00d4aa" intensity={0.2} />
      </mesh>
      {/* Gripper fingers */}
      <group ref={fingerRef}>
        {[-1, 1].map(side => (
          <group key={side} position={[side * 0.052, 0.065, 0]}>
            {/* Finger body */}
            <mesh castShadow>
              <boxGeometry args={[0.02, 0.1, 0.035]} />
              <BrushedMetal color="#2d3848" />
            </mesh>
            {/* Finger inner face — rubber pad */}
            <mesh position={[side * -0.008, 0.02, 0]}>
              <boxGeometry args={[0.006, 0.06, 0.03]} />
              <meshStandardMaterial color="#00d4aa" metalness={0.1} roughness={0.85} emissive="#00d4aa" emissiveIntensity={0.08} />
            </mesh>
            {/* Finger tip — contact sensor */}
            <mesh position={[side * -0.004, 0.055, 0]}>
              <boxGeometry args={[0.014, 0.012, 0.028]} />
              <AccentMat color="#f0a500" intensity={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Tool center point (TCP) indicator */}
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.007, 10, 10]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
    </group>
  );
};

const CoordinateFrame = ({ size = 0.2 }: { size?: number }) => (
  <group>
    {/* X axis — red */}
    <mesh position={[size / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[0.006, 0.006, size, 8]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
    <mesh position={[size * 0.65, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[0.016, 0.05, 8]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
    {/* Y axis — green */}
    <mesh position={[0, size / 2, 0]}>
      <cylinderGeometry args={[0.006, 0.006, size, 8]} />
      <meshBasicMaterial color="#44ff44" />
    </mesh>
    <mesh position={[0, size * 0.65, 0]}>
      <coneGeometry args={[0.016, 0.05, 8]} />
      <meshBasicMaterial color="#44ff44" />
    </mesh>
    {/* Z axis — blue */}
    <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.006, 0.006, size, 8]} />
      <meshBasicMaterial color="#4488ff" />
    </mesh>
    <mesh position={[0, 0, size * 0.65]} rotation={[-Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.016, 0.05, 8]} />
      <meshBasicMaterial color="#4488ff" />
    </mesh>
  </group>
);

/** Joint rotation arc indicator */
const JointArc = ({ angle, radius = 0.2, color }: { angle: number; radius?: number; color: string }) => {
  const lineRef = useRef<THREE.Line>(null);
  const geometry = useMemo(() => {
    const segments = 32;
    const absAngle = Math.abs(angle);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * absAngle * (angle >= 0 ? 1 : -1);
      points.push(new THREE.Vector3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [angle, radius]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }), [color]);
  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />;
};

/** Trajectory trail with temporal fading */
const TrajectoryTrail = ({ points }: { points: THREE.Vector3[] }) => {
  const line = useMemo(() => {
    if (points.length < 2) return new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const alpha = i / points.length;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = alpha * 0.83;
      colors[i * 3 + 2] = alpha * 0.67;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 });
    return new THREE.Line(geometry, material);
  }, [points]);
  return <primitive object={line} />;
};

export const RobotArm3D = ({ joint1, joint2, joint3, link1 = 1.2, link2 = 1.0, link3 = 0.8, showDebug = false, trailPoints = [] }: RobotArmProps) => {
  const baseRef = useRef<THREE.Group>(null);

  // Subtle base micro-vibration — servo hum
  useFrame(({ clock }) => {
    if (baseRef.current) {
      baseRef.current.rotation.x = Math.sin(clock.elapsedTime * 2.1) * 0.0008;
      baseRef.current.rotation.z = Math.cos(clock.elapsedTime * 1.7) * 0.0008;
    }
  });

  return (
    <group ref={baseRef}>
      {/* Base platform — heavy machined aluminum */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.42, 0.08, 36]} />
        <BrushedMetal color="#1a1e28" />
      </mesh>
      {/* Base bottom plate */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.035, 36]} />
        <PolymerMat color="#0a0c12" />
      </mesh>
      {/* Mounting bolt circle */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.39, -0.08, Math.sin(a) * 0.39]}>
            <cylinderGeometry args={[0.013, 0.013, 0.025, 6]} />
            <BrushedMetal color="#4a4e58" />
          </mesh>
        );
      })}
      {/* Base rotation bearing — glowing accent ring */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.02, 10, 40]} />
        <AccentMat color="#00d4aa" intensity={0.25} />
      </mesh>
      {/* Base encoder ring */}
      <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.006, 6, 48]} />
        <BrushedMetal color="#4a4e58" />
      </mesh>
      {/* Logo plate */}
      <mesh position={[0.3, -0.04, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.035, 0.003]} />
        <AccentMat color="#00d4aa" intensity={0.15} />
      </mesh>

      {/* Joint 1 — Base rotation */}
      <group rotation={[0, joint1, 0]}>
        <JointSphere radius={0.14} color="#00d4aa" />
        <CoordinateFrame size={0.3} />
        {showDebug && <JointArc angle={joint1} radius={0.35} color="#00d4aa" />}

        <LinkSegment length={link1} color="#00b894" radius={0.09} />

        {/* Joint 2 — Shoulder */}
        <group position={[0, link1, 0]} rotation={[0, 0, joint2]}>
          <JointSphere radius={0.12} color="#00b894" />
          <CoordinateFrame size={0.25} />
          {showDebug && <JointArc angle={joint2} radius={0.3} color="#00b894" />}

          <LinkSegment length={link2} color="#0984e3" radius={0.075} />

          {/* Joint 3 — Elbow */}
          <group position={[0, link2, 0]} rotation={[0, 0, joint3]}>
            <JointSphere radius={0.1} color="#0984e3" />
            <CoordinateFrame size={0.2} />
            {showDebug && <JointArc angle={joint3} radius={0.25} color="#0984e3" />}

            <LinkSegment length={link3} color="#6c5ce7" radius={0.06} />

            {/* End effector */}
            <group position={[0, link3, 0]}>
              <EndEffector />
              {showDebug && <CoordinateFrame size={0.35} />}
            </group>
          </group>
        </group>
      </group>

      {/* Trajectory trail */}
      {trailPoints.length > 1 && <TrajectoryTrail points={trailPoints} />}
    </group>
  );
};

export const RobotBase3D = () => (
  <group>
    <gridHelper args={[12, 24, "#1a2838", "#0e1420"]} position={[0, -0.12, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#0a0c14" metalness={0.3} roughness={0.85} />
    </mesh>
    {/* Subtle ground shadow disc */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.105, 0]}>
      <circleGeometry args={[1.5, 32]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.3} />
    </mesh>
  </group>
);

export const SceneLighting = () => (
  <>
    {/* Key light — warm white from upper right */}
    <directionalLight position={[5, 8, 4]} intensity={1.1} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-camera-far={20} shadow-camera-near={0.5}
      shadow-camera-left={-5} shadow-camera-right={5}
      shadow-camera-top={5} shadow-camera-bottom={-5}
      shadow-bias={-0.0005}
    />
    {/* Fill light — cool blue from left */}
    <directionalLight position={[-4, 5, -3]} intensity={0.35} color="#b8cce8" />
    {/* Accent rim light — teal from behind */}
    <directionalLight position={[0, 3, -5]} intensity={0.3} color="#00d4aa" />
    {/* Top ambient */}
    <pointLight position={[0, 6, 0]} intensity={0.3} color="#e8eaf0" />
    {/* Hemisphere — ground bounce */}
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.5} />
    {/* Ambient fill */}
    <ambientLight intensity={0.15} color="#c8d0e0" />
  </>
);

export { CoordinateFrame };
