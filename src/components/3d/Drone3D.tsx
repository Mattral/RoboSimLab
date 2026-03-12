import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TooltipHotspot from "./TooltipHotspot";

interface DroneProps {
  thrust: number;
  roll: number;
  pitch: number;
  yaw: number;
  showThrust: boolean;
  showAxes: boolean;
  showTrajectory: boolean;
  waypoints: THREE.Vector3[];
  position: [number, number, number];
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

const Rotor = ({ position, spin }: { position: [number, number, number]; spin: number }) => {
  const bladeRef = useRef<THREE.Mesh>(null);
  const blade2Ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (bladeRef.current) bladeRef.current.rotation.y += delta * spin * 40;
    if (blade2Ref.current) blade2Ref.current.rotation.y += delta * spin * 40;
  });
  return (
    <group position={position}>
      {/* Motor housing — cylindrical with detail */}
      <mesh castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.045, 12]} />
        <Metal color="#282c34" />
      </mesh>
      {/* Motor top cap */}
      <mesh position={[0, 0.024, 0]}>
        <cylinderGeometry args={[0.028, 0.032, 0.008, 12]} />
        <Metal color="#1a2535" />
      </mesh>
      {/* Motor shaft */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
        <Metal color="#4a4e58" />
      </mesh>
      {/* Propeller disc — motion blur effect */}
      <mesh ref={bladeRef} position={[0, 0.038, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.003, 24]} />
        <meshBasicMaterial color="#00d4aa" transparent opacity={0.1} />
      </mesh>
      {/* Propeller blades — 2 blades */}
      <mesh ref={blade2Ref} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.32, 0.003, 0.022]} />
        <meshStandardMaterial color="#1a2535" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Motor base ring */}
      <mesh position={[0, -0.024, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.038, 0.005, 6, 12]} />
        <Poly color="#15181f" />
      </mesh>
    </group>
  );
};

/** Landing gear strut */
const LandingGear = ({ position, mirror }: { position: [number, number, number]; mirror: number }) => (
  <group position={position}>
    {/* Strut */}
    <mesh rotation={[0, 0, mirror * 0.15]} castShadow>
      <boxGeometry args={[0.008, 0.08, 0.008]} />
      <Metal color="#282c34" />
    </mesh>
    {/* Foot pad */}
    <mesh position={[mirror * 0.008, -0.04, 0]}>
      <sphereGeometry args={[0.012, 8, 8]} />
      <meshStandardMaterial color="#15181f" metalness={0.05} roughness={0.95} />
    </mesh>
  </group>
);

export const Drone3D = ({ thrust, roll, pitch, yaw, showThrust, showAxes, showTrajectory, waypoints, position }: DroneProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!bodyRef.current) return;
    bodyRef.current.position.set(position[0], position[1], position[2]);
    bodyRef.current.rotation.set(pitch * 0.3, yaw * 0.1, roll * 0.3);
    bodyRef.current.position.y += Math.sin(timeRef.current * 3) * 0.008;
  });

  const armPositions: [number, number, number][] = [
    [0.25, 0, 0.25], [-0.25, 0, 0.25], [-0.25, 0, -0.25], [0.25, 0, -0.25]
  ];

  const trajectoryLine = useMemo(() => {
    if (waypoints.length < 2) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(waypoints);
    const mat = new THREE.LineBasicMaterial({ color: "#00d4aa", transparent: true, opacity: 0.4 });
    return new THREE.Line(geo, mat);
  }, [waypoints]);

  return (
    <group>
      {showTrajectory && trajectoryLine && <primitive object={trajectoryLine} />}

      {waypoints.map((wp, i) => (
        <mesh key={i} position={wp}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#f0a500" transparent opacity={0.5} />
        </mesh>
      ))}

      <group ref={bodyRef}>
        {/* Central body — main chassis */}
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.045, 0.16]} />
          <Metal color="#0a6abf" emissive="#0984e3" />
        </mesh>
        {/* Top cover plate */}
        <mesh position={[0, 0.025, 0]}>
          <boxGeometry args={[0.14, 0.006, 0.14]} />
          <Metal color="#282c34" />
        </mesh>
        {/* Bottom plate */}
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[0.14, 0.005, 0.14]} />
          <Poly color="#12141a" />
        </mesh>

        {/* Battery pack */}
        <mesh position={[0, -0.04, 0]} castShadow>
          <boxGeometry args={[0.08, 0.025, 0.1]} />
          <meshStandardMaterial color="#15181f" metalness={0.1} roughness={0.8} />
        </mesh>
        {/* Battery indicator LEDs */}
        {[-0.02, 0, 0.02].map((z, i) => (
          <mesh key={i} position={[0.042, -0.035, z]}>
            <sphereGeometry args={[0.003, 6, 6]} />
            <Accent color={i < 2 ? "#00d4aa" : "#f0a500"} intensity={0.4} />
          </mesh>
        ))}

        {/* Camera gimbal assembly */}
        <group position={[0, -0.055, 0.04]}>
          {/* Gimbal frame */}
          <mesh>
            <boxGeometry args={[0.04, 0.02, 0.03]} />
            <Metal color="#282c34" />
          </mesh>
          {/* Camera body */}
          <mesh position={[0, -0.01, 0.005]}>
            <boxGeometry args={[0.025, 0.018, 0.02]} />
            <Poly color="#0a0c12" />
          </mesh>
          {/* Camera lens */}
          <mesh position={[0, -0.01, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 10]} />
            <meshStandardMaterial color="#080a10" metalness={0.95} roughness={0.05} />
          </mesh>
          {/* Lens inner */}
          <mesh position={[0, -0.01, 0.022]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.003, 10]} />
            <meshStandardMaterial color="#1a3050" emissive="#0984e3" emissiveIntensity={0.2} metalness={0.3} roughness={0.1} />
          </mesh>
        </group>

        {/* GPS module */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 10]} />
          <Metal color="#4a4e58" />
        </mesh>
        {/* GPS antenna mast */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.02, 6]} />
          <Metal color="#4a4e58" />
        </mesh>

        {/* Status LED — front */}
        <mesh position={[0, 0.028, 0.075]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <Accent color="#00d4aa" intensity={0.7} />
        </mesh>
        {/* Rear warning LED */}
        <mesh position={[0, 0.028, -0.075]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <Accent color="#ff3333" intensity={0.5} />
        </mesh>

        {/* Arms and rotors */}
        {armPositions.map((pos, i) => (
          <group key={i}>
            {/* Arm — structural tube */}
            <mesh position={[pos[0] / 2, 0, pos[2] / 2]} castShadow
              rotation={[0, Math.atan2(pos[0], pos[2]), 0]}>
              <boxGeometry args={[0.025, 0.018, Math.sqrt(pos[0] ** 2 + pos[2] ** 2)]} />
              <Metal color="#282c34" />
            </mesh>
            {/* Arm reinforcement — top rail */}
            <mesh position={[pos[0] / 2, 0.01, pos[2] / 2]} castShadow
              rotation={[0, Math.atan2(pos[0], pos[2]), 0]}>
              <boxGeometry args={[0.015, 0.004, Math.sqrt(pos[0] ** 2 + pos[2] ** 2) * 0.7]} />
              <Poly color="#15181f" />
            </mesh>
            {/* Motor guard ring */}
            <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.19, 0.006, 6, 24]} />
              <Poly color="#1a2535" />
            </mesh>
            <Rotor position={pos} spin={i % 2 === 0 ? 1 : -1} />
          </group>
        ))}

        {/* Landing gear */}
        <LandingGear position={[-0.1, -0.05, 0.12]} mirror={-1} />
        <LandingGear position={[0.1, -0.05, 0.12]} mirror={1} />
        <LandingGear position={[-0.1, -0.05, -0.12]} mirror={-1} />
        <LandingGear position={[0.1, -0.05, -0.12]} mirror={1} />
        {/* Landing gear rails */}
        <mesh position={[-0.1, -0.09, 0]} castShadow>
          <boxGeometry args={[0.006, 0.005, 0.2]} />
          <Metal color="#282c34" />
        </mesh>
        <mesh position={[0.1, -0.09, 0]} castShadow>
          <boxGeometry args={[0.006, 0.005, 0.2]} />
          <Metal color="#282c34" />
        </mesh>

        {/* Thrust vectors */}
        {showThrust && armPositions.map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1] - 0.06 - thrust * 0.02, pos[2]]}>
            <coneGeometry args={[0.035, thrust * 0.18 + 0.06, 8]} />
            <meshBasicMaterial color="#f0a500" transparent opacity={0.2} />
          </mesh>
        ))}

        {/* Orientation axes */}
        {showAxes && (
          <group>
            <mesh position={[0.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
              <meshBasicMaterial color="#44ff44" />
            </mesh>
            <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
              <meshBasicMaterial color="#4488ff" />
            </mesh>
          </group>
        )}

        {/* Tooltips */}
        <TooltipHotspot position={[0.27, 0.06, 0.27]} label="Brushless Motor" explanation="Each rotor is driven by a 2300KV brushless DC motor. Differential thrust between rotors controls roll, pitch, and yaw at 400Hz update rate." color="#00d4aa" />
        <TooltipHotspot position={[0, 0.08, 0]} label="Flight Controller" explanation="F7 flight controller runs PID stabilization at 8kHz. Fuses IMU, barometer, and GPS data for precise attitude and position hold." color="#0984e3" />
        <TooltipHotspot position={[0, -0.08, 0.04]} label="Camera Gimbal" explanation="3-axis brushless gimbal stabilizes the camera, compensating for drone movement to deliver smooth, steady footage during flight." color="#6c5ce7" />
      </group>
    </group>
  );
};

export const DroneSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.1} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.35} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.3} color="#00d4aa" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.5} />
    <ambientLight intensity={0.16} color="#c8d0e0" />
  </>
);
