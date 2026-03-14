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
  <meshStandardMaterial color={color} metalness={0.82} roughness={0.14} envMapIntensity={0.7}
    {...(emissive ? { emissive, emissiveIntensity: 0.06 } : {})} />
);

const Poly = ({ color = "#0a0c12" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
);

const Accent = ({ color, intensity = 0.25 }: { color: string; intensity?: number }) => (
  <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} emissive={color} emissiveIntensity={intensity} />
);

/** Realistic Spot-style leg with upper/lower segments and actuator housings */
const Leg = ({ side, front, phase, gait, time }: {
  side: number; front: number; phase: number; gait: string; time: number;
}) => {
  const upperRef = useRef<THREE.Group>(null);
  const lowerRef = useRef<THREE.Group>(null);
  const footRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!upperRef.current || !lowerRef.current) return;
    if (gait === "stand") {
      upperRef.current.rotation.x = 0.2;
      lowerRef.current.rotation.x = -0.4;
      return;
    }
    const speed = gait === "trot" ? 6 : 4;
    const amplitude = gait === "trot" ? 0.3 : 0.2;
    const t = time * speed + phase;
    upperRef.current.rotation.x = 0.2 + Math.sin(t) * amplitude;
    lowerRef.current.rotation.x = -0.4 + Math.cos(t) * amplitude * 0.6;
    if (footRef.current) {
      const lift = Math.max(0, Math.sin(t)) * 0.06;
      footRef.current.position.y = -0.2 + lift;
    }
  });

  const xOff = side * 0.2;
  const zOff = front * 0.28;

  return (
    <group position={[xOff, -0.06, zOff]}>
      {/* Hip joint — large actuator */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 14]} />
        <Metal color="#282c34" />
      </mesh>
      {/* Hip accent ring */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.035, 0.005, 8, 16]} />
        <Accent color="#00d4aa" intensity={0.3} />
      </mesh>

      {/* Upper leg group */}
      <group ref={upperRef}>
        {/* Upper leg main segment */}
        <mesh position={[0, -0.13, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.2, 10, 20]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Actuator housing — side-mounted */}
        <mesh position={[side * 0.025, -0.1, 0]} castShadow>
          <boxGeometry args={[0.04, 0.1, 0.05]} />
          <Metal color="#282c34" emissive="#0984e3" />
        </mesh>
        {/* Actuator end cap */}
        <mesh position={[side * 0.025, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.042, 10]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Cable routing */}
        <mesh position={[-side * 0.015, -0.12, 0.022]} castShadow>
          <boxGeometry args={[0.006, 0.12, 0.01]} />
          <Poly color="#12141a" />
        </mesh>
        {/* Status LED */}
        <mesh position={[side * 0.035, -0.06, 0.018]}>
          <sphereGeometry args={[0.004, 6, 6]} />
          <Accent color="#00d4aa" intensity={0.6} />
        </mesh>

        {/* Knee joint */}
        <group position={[0, -0.25, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.05, 14]} />
            <Metal color="#282c34" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.028, 0.004, 8, 16]} />
            <Accent color="#00b894" intensity={0.3} />
          </mesh>

          {/* Lower leg group */}
          <group ref={lowerRef}>
            <mesh position={[0, -0.12, 0]} castShadow>
              <capsuleGeometry args={[0.024, 0.18, 10, 20]} />
              <Metal color="#1a2535" />
            </mesh>
            {/* Lower actuator */}
            <mesh position={[-side * 0.018, -0.08, 0]} castShadow>
              <boxGeometry args={[0.03, 0.07, 0.038]} />
              <Metal color="#282c34" />
            </mesh>
            {/* Lower cable */}
            <mesh position={[side * 0.015, -0.12, 0.018]} castShadow>
              <boxGeometry args={[0.005, 0.1, 0.008]} />
              <Poly color="#12141a" />
            </mesh>
            {/* Foot — rubber pad */}
            <mesh ref={footRef} position={[0, -0.2, 0]} castShadow>
              <sphereGeometry args={[0.024, 14, 14]} />
              <meshStandardMaterial color="#15181f" metalness={0.08} roughness={0.92} />
            </mesh>
            {/* Rubber sole */}
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.005, 10]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.02} roughness={0.98} />
            </mesh>
            {/* Force sensor */}
            <mesh position={[0, -0.215, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.004, 8]} />
              <Accent color="#f0a500" intensity={0.3} />
            </mesh>
          </group>
        </group>
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
    <group position={[0, 0.1, 0.15]}>
      <mesh>
        <cylinderGeometry args={[0.028, 0.032, 0.025, 16]} />
        <Metal color="#4a4e58" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.023, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#282c34" metalness={0.7} roughness={0.15} transparent opacity={0.85} />
      </mesh>
      <mesh ref={spinRef} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.018, 0.003, 6, 16]} />
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
    bodyRef.current.position.y = 0.6 + (speed > 0 ? Math.sin(timeRef.current * speed * 2) * 0.012 : 0);
    bodyRef.current.rotation.z = disturbance * 0.02 + Math.sin(timeRef.current * 0.7) * 0.003;
    bodyRef.current.rotation.x = (speed > 0 ? Math.sin(timeRef.current * speed) * 0.025 : 0) + Math.sin(timeRef.current * 0.5) * 0.002;
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
          {[[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.28], [0.2, -0.28]].map(([x, z], i) => (
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
        {/* === MAIN BODY — Spot-inspired chassis === */}
        {/* Core body — slightly rounded */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.12, 0.6]} />
          <Metal color="#1a2535" emissive="#0984e3" />
        </mesh>

        {/* Top shell — slightly domed */}
        <mesh position={[0, 0.065, 0]} castShadow>
          <boxGeometry args={[0.32, 0.01, 0.55]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Top rounded edge */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.17, 0.008, 20]} />
          <Metal color="#282c34" />
        </mesh>

        {/* Bottom plate */}
        <mesh position={[0, -0.065, 0]}>
          <boxGeometry args={[0.32, 0.008, 0.52]} />
          <Poly color="#12141a" />
        </mesh>

        {/* Side armor panels */}
        {[-1, 1].map((s, i) => (
          <group key={i}>
            <mesh position={[s * 0.178, 0, 0]}>
              <boxGeometry args={[0.006, 0.09, 0.42]} />
              <Metal color="#1a2535" />
            </mesh>
            {/* Ventilation grilles */}
            {[-0.08, 0, 0.08].map((z, j) => (
              <mesh key={j} position={[s * 0.183, 0, z]}>
                <boxGeometry args={[0.003, 0.035, 0.045]} />
                <Poly color="#0a0c12" />
              </mesh>
            ))}
            {/* Side accent strip — glowing */}
            <mesh position={[s * 0.183, 0.035, 0]}>
              <boxGeometry args={[0.003, 0.004, 0.38]} />
              <Accent color="#00d4aa" intensity={0.2} />
            </mesh>
          </group>
        ))}

        {/* Front bumper — angled */}
        <mesh position={[0, 0, 0.305]}>
          <boxGeometry args={[0.26, 0.065, 0.01]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Front accent strip */}
        <mesh position={[0, 0.02, 0.312]}>
          <boxGeometry args={[0.2, 0.004, 0.003]} />
          <Accent color="#00d4aa" intensity={0.3} />
        </mesh>

        {/* Rear panel */}
        <mesh position={[0, 0, -0.305]}>
          <boxGeometry args={[0.26, 0.065, 0.01]} />
          <Metal color="#1a2535" />
        </mesh>
        {/* Rear warning lights */}
        {[-0.06, 0.06].map((x, i) => (
          <mesh key={i} position={[x, 0.02, -0.312]}>
            <boxGeometry args={[0.04, 0.01, 0.004]} />
            <Accent color="#ff3333" intensity={0.3} />
          </mesh>
        ))}

        {/* LIDAR dome */}
        <LidarDome />

        {/* Depth camera — front */}
        <mesh position={[0, 0.03, 0.315]}>
          <boxGeometry args={[0.065, 0.035, 0.018]} />
          <meshStandardMaterial color="#00d4aa" metalness={0.35} roughness={0.08} emissive="#00d4aa" emissiveIntensity={0.4} transparent opacity={0.85} />
        </mesh>
        {/* Camera lenses */}
        {[-0.015, 0.015].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 0.03, 0.326]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.005, 12]} />
              <meshStandardMaterial color="#080a10" metalness={0.95} roughness={0.05} />
            </mesh>
            <mesh position={[x, 0.03, 0.33]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
              <meshStandardMaterial color="#1a3050" emissive="#0984e3" emissiveIntensity={0.15} metalness={0.3} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* GPS module + antenna */}
        <mesh position={[0.07, 0.08, -0.15]}>
          <cylinderGeometry args={[0.014, 0.014, 0.015, 10]} />
          <Metal color="#4a4e58" />
        </mesh>
        <mesh position={[0.07, 0.1, -0.15]}>
          <cylinderGeometry args={[0.004, 0.004, 0.03, 6]} />
          <Metal color="#4a4e58" />
        </mesh>
        <mesh position={[0.07, 0.12, -0.15]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>

        {/* Handle on top */}
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.008, 0.15]} />
          <Metal color="#4a4e58" />
        </mesh>
        {[-0.04, 0.04].map((x, i) => (
          <mesh key={i} position={[x, 0.075, 0]}>
            <boxGeometry args={[0.008, 0.015, 0.15]} />
            <Metal color="#4a4e58" />
          </mesh>
        ))}

        {/* Battery indicator */}
        <mesh position={[0.16, 0.04, -0.2]}>
          <boxGeometry args={[0.012, 0.008, 0.05]} />
          <Accent color="#00d4aa" intensity={0.3} />
        </mesh>

        {/* Status LEDs — right side */}
        {[-0.1, 0, 0.1].map((z, i) => (
          <mesh key={i} position={[0.185, 0.02, z]}>
            <sphereGeometry args={[0.005, 8, 8]} />
            <meshStandardMaterial
              color={i === 1 ? "#00d4aa" : i === 0 ? "#f0a500" : "#4a4e58"}
              emissive={i === 1 ? "#00d4aa" : i === 0 ? "#f0a500" : "#4a4e58"}
              emissiveIntensity={i <= 1 ? 0.6 : 0.1}
            />
          </mesh>
        ))}

        {/* Mounting bolts */}
        {[[-0.13, 0.072, 0.2], [0.13, 0.072, 0.2], [-0.13, 0.072, -0.2], [0.13, 0.072, -0.2]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <cylinderGeometry args={[0.007, 0.007, 0.008, 8]} />
            <Metal color="#4a4e58" />
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

        {/* Tooltips */}
        <TooltipHotspot position={[0, 0.15, 0.15]} label="LIDAR Scanner" explanation="360° rotating laser measures distances at 20Hz, building real-time point clouds for navigation and obstacle avoidance using SLAM algorithms." color="#00d4aa" />
        <TooltipHotspot position={[0.2, 0, 0]} label="IMU Sensor" explanation="6-axis Inertial Measurement Unit detects body orientation and angular velocity at 1kHz, essential for maintaining balance during locomotion." color="#6c5ce7" />
        <TooltipHotspot position={[-0.2, -0.2, 0.28]} label="Knee Actuator" explanation="High-torque brushless servo motor (12 N·m) at the knee joint enables dynamic leg movement. Gait controllers coordinate all 8 joints." color="#00b894" />
        <TooltipHotspot position={[0, 0.06, 0.32]} label="Depth Camera" explanation="Intel RealSense-style stereo camera provides dense depth maps at 30fps for terrain analysis and obstacle detection." color="#0984e3" />
      </group>
    </group>
  );
};

export const QuadrupedSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.2} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.4} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.35} color="#00d4aa" />
    <pointLight position={[0, 4, 2]} intensity={0.45} color="#e8eaf0" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.5} />
    <ambientLight intensity={0.16} color="#c8d0e0" />
  </>
);
