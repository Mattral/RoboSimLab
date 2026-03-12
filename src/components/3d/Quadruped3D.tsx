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
  <meshStandardMaterial color={color} metalness={0.82} roughness={0.15} envMapIntensity={0.7}
    {...(emissive ? { emissive, emissiveIntensity: 0.06 } : {})} />
);

const Poly = ({ color = "#0a0c12" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
);

const Accent = ({ color, intensity = 0.25 }: { color: string; intensity?: number }) => (
  <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} emissive={color} emissiveIntensity={intensity} />
);

/** Enhanced leg with actuator housings, cable routing, and structural detail */
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
        {/* Hip joint with housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.045, 0.014, 10, 20]} />
          <meshStandardMaterial color="#00d4aa" metalness={0.65} roughness={0.18} emissive="#00d4aa" emissiveIntensity={0.2} />
        </mesh>
        {/* Hip housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.058, 0.008, 8, 20]} />
          <Poly color="#15181f" />
        </mesh>

        {/* Upper leg — tapered with actuator */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.22, 10, 20]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Actuator housing on upper leg */}
        <mesh position={[side * 0.025, -0.12, 0]} castShadow>
          <boxGeometry args={[0.04, 0.1, 0.05]} />
          <Metal color="#1a2535" emissive="#0984e3" />
        </mesh>
        {/* Actuator vents */}
        {[-0.02, 0, 0.02].map((y, i) => (
          <mesh key={i} position={[side * 0.047, -0.12 + y, 0]}>
            <boxGeometry args={[0.003, 0.008, 0.035]} />
            <Poly />
          </mesh>
        ))}
        {/* Cable routing channel */}
        <mesh position={[-side * 0.02, -0.15, 0.025]} castShadow>
          <boxGeometry args={[0.008, 0.15, 0.012]} />
          <Poly color="#12141a" />
        </mesh>
        {/* Structural ribs */}
        {[0.3, 0.55, 0.8].map((p, i) => (
          <mesh key={i} position={[0, -0.05 - p * 0.2, 0]}>
            <torusGeometry args={[0.037, 0.004, 6, 16]} />
            <Poly color="#15181f" />
          </mesh>
        ))}
        {/* Status LED on upper leg */}
        <mesh position={[side * 0.038, -0.06, 0.02]}>
          <sphereGeometry args={[0.004, 6, 6]} />
          <Accent color="#00d4aa" intensity={0.6} />
        </mesh>

        {/* Knee joint */}
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.012, 10, 20]} />
          <meshStandardMaterial color="#00b894" metalness={0.65} roughness={0.18} emissive="#00b894" emissiveIntensity={0.2} />
        </mesh>
        {/* Knee housing ring */}
        <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.048, 0.006, 8, 20]} />
          <Poly color="#15181f" />
        </mesh>

        {/* Lower leg — slightly thinner */}
        <mesh position={[0, -0.42, 0]} castShadow>
          <capsuleGeometry args={[0.028, 0.2, 10, 20]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Lower leg actuator */}
        <mesh position={[-side * 0.02, -0.38, 0]} castShadow>
          <boxGeometry args={[0.03, 0.08, 0.04]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Lower cable */}
        <mesh position={[side * 0.018, -0.42, 0.02]} castShadow>
          <boxGeometry args={[0.006, 0.12, 0.01]} />
          <Poly color="#12141a" />
        </mesh>

        {/* Foot with rubber pad and force sensor */}
        <mesh ref={footRef} position={[0, -0.55, 0]} castShadow>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshStandardMaterial color="#15181f" metalness={0.08} roughness={0.92} />
        </mesh>
        {/* Foot rubber pad */}
        <mesh position={[0, -0.575, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.005, 10]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.02} roughness={0.98} />
        </mesh>
        {/* Force sensor */}
        <mesh position={[0, -0.56, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.004, 8]} />
          <Accent color="#f0a500" intensity={0.3} />
        </mesh>
      </group>
    </group>
  );
};

/** LIDAR dome with spinning element */
const LidarDome = () => {
  const spinRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 4;
  });
  return (
    <group position={[0, 0.09, 0.2]}>
      {/* Base */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.035, 0.025, 14]} />
        <Metal color="#4a4e58" />
      </mesh>
      {/* Dome */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.025, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#282c34" metalness={0.7} roughness={0.15} transparent opacity={0.9} />
      </mesh>
      {/* Spinning ring */}
      <mesh ref={spinRef} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.02, 0.003, 6, 16]} />
        <Accent color="#00d4aa" intensity={0.5} />
      </mesh>
    </group>
  );
};

export const Quadruped3D = ({ gait, showCoM, showSupport, showFootsteps, disturbance }: QuadrupedProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!bodyRef.current) return;
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
        {/* Main body chassis — multi-layered */}
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.13, 0.62]} />
          <Metal color="#0a6abf" emissive="#0984e3" />
        </mesh>

        {/* Top plate with beveled edges */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.34, 0.01, 0.57]} />
          <Metal color="#282c34" />
        </mesh>

        {/* Bottom plate */}
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[0.34, 0.008, 0.55]} />
          <Poly color="#12141a" />
        </mesh>

        {/* Side panels — left and right */}
        {[-1, 1].map((s, i) => (
          <group key={i}>
            <mesh position={[s * 0.192, 0, 0]}>
              <boxGeometry args={[0.006, 0.1, 0.45]} />
              <Metal color="#1a2535" />
            </mesh>
            {/* Ventilation grilles */}
            {[-0.08, 0, 0.08].map((z, j) => (
              <mesh key={j} position={[s * 0.196, 0, z]}>
                <boxGeometry args={[0.003, 0.04, 0.05]} />
                <Poly color="#0a0c12" />
              </mesh>
            ))}
            {/* Side accent strip */}
            <mesh position={[s * 0.196, 0.035, 0]}>
              <boxGeometry args={[0.003, 0.004, 0.4]} />
              <Accent color="#00d4aa" intensity={0.15} />
            </mesh>
          </group>
        ))}

        {/* Front bumper panel */}
        <mesh position={[0, -0.01, 0.315]}>
          <boxGeometry args={[0.28, 0.06, 0.008]} />
          <Metal color="#1a2535" />
        </mesh>

        {/* Rear panel */}
        <mesh position={[0, -0.01, -0.315]}>
          <boxGeometry args={[0.28, 0.06, 0.008]} />
          <Metal color="#1a2535" />
        </mesh>

        {/* LIDAR dome */}
        <LidarDome />

        {/* Depth camera — front-facing */}
        <mesh position={[0, 0.03, 0.32]}>
          <boxGeometry args={[0.07, 0.04, 0.022]} />
          <meshStandardMaterial color="#00d4aa" metalness={0.35} roughness={0.08} emissive="#00d4aa" emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>
        {/* Camera lens */}
        <mesh position={[0.018, 0.03, 0.332]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.006, 10]} />
          <meshStandardMaterial color="#080a10" metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Camera lens inner */}
        <mesh position={[0.018, 0.03, 0.336]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.003, 10]} />
          <meshStandardMaterial color="#1a3050" emissive="#0984e3" emissiveIntensity={0.15} metalness={0.3} roughness={0.1} />
        </mesh>

        {/* GPS module */}
        <mesh position={[0.08, 0.08, -0.15]}>
          <cylinderGeometry args={[0.012, 0.012, 0.015, 8]} />
          <Metal color="#4a4e58" />
        </mesh>
        {/* GPS antenna */}
        <mesh position={[0.08, 0.1, -0.15]}>
          <cylinderGeometry args={[0.004, 0.004, 0.03, 6]} />
          <Metal color="#4a4e58" />
        </mesh>
        <mesh position={[0.08, 0.12, -0.15]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>

        {/* Communication antenna */}
        <mesh position={[-0.08, 0.08, -0.18]}>
          <cylinderGeometry args={[0.003, 0.003, 0.05, 6]} />
          <Metal color="#4a4e58" />
        </mesh>

        {/* Battery indicator */}
        <mesh position={[0.17, 0.04, -0.2]}>
          <boxGeometry args={[0.015, 0.008, 0.06]} />
          <Accent color="#00d4aa" intensity={0.3} />
        </mesh>

        {/* Status LEDs — 3 on right side */}
        {[-0.1, 0, 0.1].map((z, i) => (
          <mesh key={i} position={[0.195, 0.02, z]}>
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshStandardMaterial
              color={i === 1 ? "#00d4aa" : i === 0 ? "#f0a500" : "#4a4e58"}
              emissive={i === 1 ? "#00d4aa" : i === 0 ? "#f0a500" : "#4a4e58"}
              emissiveIntensity={i <= 1 ? 0.6 : 0.1}
            />
          </mesh>
        ))}

        {/* Mounting bolt circles — corners of top plate */}
        {[[-0.14, 0.076, 0.22], [0.14, 0.076, 0.22], [-0.14, 0.076, -0.22], [0.14, 0.076, -0.22]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <cylinderGeometry args={[0.008, 0.008, 0.008, 6]} />
            <Metal color="#4a4e58" />
          </mesh>
        ))}

        {/* Legs — enhanced */}
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
        <TooltipHotspot position={[0, 0.14, 0.2]} label="LIDAR Scanner" explanation="360° rotating laser measures distances at 20Hz, building real-time point clouds for navigation and obstacle avoidance using SLAM algorithms." color="#00d4aa" />
        <TooltipHotspot position={[0.22, 0, 0]} label="IMU Sensor" explanation="6-axis Inertial Measurement Unit detects body orientation and angular velocity at 1kHz, essential for maintaining balance during locomotion." color="#6c5ce7" />
        <TooltipHotspot position={[-0.22, -0.28, 0.3]} label="Knee Actuator" explanation="High-torque brushless servo motor (12 N·m) at the knee joint enables dynamic leg movement. Gait controllers coordinate all 8 joints." color="#00b894" />
        <TooltipHotspot position={[0, 0.06, 0.32]} label="Depth Camera" explanation="Intel RealSense-style stereo camera provides dense depth maps at 30fps for terrain analysis and obstacle detection." color="#0984e3" />
      </group>
    </group>
  );
};

export const QuadrupedSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.1} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.35} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.3} color="#00d4aa" />
    <pointLight position={[0, 4, 2]} intensity={0.4} color="#e8eaf0" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.5} />
    <ambientLight intensity={0.14} color="#c8d0e0" />
  </>
);
