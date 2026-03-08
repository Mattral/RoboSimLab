import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TooltipHotspot from "./TooltipHotspot";

interface QuadrupedProps {
  gait: "stand" | "walk" | "trot";
  showCoM: boolean;
  showSupport: boolean;
  showFootsteps: boolean;
  disturbance: number;
}

const Metal = ({ color, emissive }: { color: string; emissive?: string }) => (
  <meshStandardMaterial color={color} metalness={0.8} roughness={0.18} envMapIntensity={0.6}
    {...(emissive ? { emissive, emissiveIntensity: 0.06 } : {})} />
);

const Poly = ({ color = "#0a0c12" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
);

/** Single leg with upper/lower segments and foot */
const Leg = ({ side, front, phase, gait, time }: {
  side: number; front: number; phase: number; gait: string; time: number;
}) => {
  const ref = useRef<THREE.Group>(null);
  const footRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    if (gait === "stand") {
      ref.current.rotation.x = 0;
      return;
    }
    const speed = gait === "trot" ? 6 : 4;
    const amplitude = gait === "trot" ? 0.25 : 0.15;
    ref.current.rotation.x = Math.sin(time * speed + phase) * amplitude;
    if (footRef.current) {
      const lift = Math.max(0, Math.sin(time * speed + phase)) * 0.08;
      footRef.current.position.y = -0.55 + lift;
    }
  });

  const xOff = side * 0.22;
  const zOff = front * 0.3;

  return (
    <group position={[xOff, -0.08, zOff]}>
      <group ref={ref}>
        {/* Hip joint */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.012, 8, 16]} />
          <meshStandardMaterial color="#00d4aa" metalness={0.6} roughness={0.2} emissive="#00d4aa" emissiveIntensity={0.15} />
        </mesh>
        {/* Upper leg */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.2, 8, 16]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Knee joint */}
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.03, 0.01, 8, 16]} />
          <meshStandardMaterial color="#00b894" metalness={0.6} roughness={0.2} emissive="#00b894" emissiveIntensity={0.15} />
        </mesh>
        {/* Lower leg */}
        <mesh position={[0, -0.42, 0]} castShadow>
          <capsuleGeometry args={[0.025, 0.2, 8, 16]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Foot */}
        <mesh ref={footRef} position={[0, -0.55, 0]} castShadow>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#15181f" metalness={0.1} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

export const Quadruped3D = ({ gait, showCoM, showSupport, showFootsteps, disturbance }: QuadrupedProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!bodyRef.current) return;
    // Body sway
    const speed = gait === "trot" ? 6 : gait === "walk" ? 4 : 0;
    bodyRef.current.position.y = 0.6 + (speed > 0 ? Math.sin(timeRef.current * speed * 2) * 0.01 : 0);
    bodyRef.current.rotation.z = disturbance * 0.02 + Math.sin(timeRef.current * 0.7) * 0.003;
    bodyRef.current.rotation.x = (speed > 0 ? Math.sin(timeRef.current * speed) * 0.02 : 0) + Math.sin(timeRef.current * 0.5) * 0.002;
  });

  return (
    <group>
      {/* Support polygon */}
      {showSupport && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshBasicMaterial color="#00b894" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Footstep markers */}
      {showFootsteps && gait !== "stand" && (
        <group>
          {[[-0.22, 0.3], [0.22, 0.3], [-0.22, -0.3], [0.22, -0.3]].map(([x, z], i) => (
            <group key={i}>
              {[1, 2, 3].map(step => (
                <mesh key={step} position={[x as number, 0.003, (z as number) + step * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.02, 0.03, 8]} />
                  <meshBasicMaterial color="#00d4aa" transparent opacity={0.3 / step} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      <group ref={bodyRef} position={[0, 0.6, 0]}>
        {/* Main body chassis */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.12, 0.6]} />
          <Metal color="#0a6abf" emissive="#0984e3" />
        </mesh>
        {/* Top plate */}
        <mesh position={[0, 0.065, 0]}>
          <boxGeometry args={[0.32, 0.008, 0.55]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Side panels */}
        {[-1, 1].map((s, i) => (
          <mesh key={i} position={[s * 0.178, 0, 0]}>
            <boxGeometry args={[0.005, 0.08, 0.4]} />
            <Poly color="#15181f" />
          </mesh>
        ))}
        {/* LIDAR dome */}
        <mesh position={[0, 0.09, 0.2]}>
          <cylinderGeometry args={[0.025, 0.03, 0.04, 12]} />
          <Metal color="#4a4e58" />
        </mesh>
        {/* Camera */}
        <mesh position={[0, 0.03, 0.31]}>
          <boxGeometry args={[0.06, 0.035, 0.02]} />
          <meshStandardMaterial color="#00d4aa" metalness={0.3} roughness={0.1} emissive="#00d4aa" emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>
        {/* Status LEDs */}
        {[-0.1, 0, 0.1].map((z, i) => (
          <mesh key={i} position={[0.176, 0.02, z]}>
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshStandardMaterial color={i === 1 ? "#00d4aa" : "#4a4e58"} emissive={i === 1 ? "#00d4aa" : "#4a4e58"} emissiveIntensity={i === 1 ? 0.6 : 0.1} />
          </mesh>
        ))}

        {/* Legs */}
        <Leg side={-1} front={1} phase={0} gait={gait} time={timeRef.current} />
        <Leg side={1} front={1} phase={Math.PI} gait={gait} time={timeRef.current} />
        <Leg side={-1} front={-1} phase={Math.PI} gait={gait} time={timeRef.current} />
        <Leg side={1} front={-1} phase={0} gait={gait} time={timeRef.current} />

        {/* CoM marker */}
        {showCoM && (
          <group position={[0, 0.15, 0]}>
            <mesh>
              <octahedronGeometry args={[0.04, 0]} />
              <meshStandardMaterial color="#f0a500" metalness={0.4} roughness={0.3} emissive="#f0a500" emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[0, -0.75, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.6, 4]} />
              <meshBasicMaterial color="#f0a500" transparent opacity={0.3} />
            </mesh>
          </group>
        )}

        {/* Tooltip hotspots */}
        <TooltipHotspot position={[0, 0.12, 0.2]} label="LIDAR Scanner" explanation="Rotating laser measures distances to objects in 360°, building a real-time map for navigation and obstacle avoidance." color="#00d4aa" />
        <TooltipHotspot position={[0.2, 0, 0]} label="IMU Sensor" explanation="Inertial Measurement Unit detects body orientation and angular velocity, essential for maintaining balance during locomotion." color="#6c5ce7" />
        <TooltipHotspot position={[-0.22, -0.28, 0.3]} label="Knee Actuator" explanation="High-torque servo motor at the knee joint enables dynamic leg movement. Gait controllers coordinate all 8 knee and hip joints." color="#00b894" />
        <TooltipHotspot position={[0, 0.05, 0.31]} label="Depth Camera" explanation="Stereo camera provides depth perception for terrain analysis and obstacle detection during locomotion." color="#0984e3" />
      </group>
    </group>
  );
};

export const QuadrupedSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.0} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.3} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.25} color="#00d4aa" />
    <pointLight position={[0, 4, 2]} intensity={0.35} color="#e8eaf0" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.45} />
    <ambientLight intensity={0.12} color="#c8d0e0" />
  </>
);
