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

const Metal = ({ color }: { color: string }) => (
  <meshStandardMaterial color={color} metalness={0.8} roughness={0.18} />
);

const Rotor = ({ position, spin }: { position: [number, number, number]; spin: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * spin * 40;
  });
  return (
    <group position={position}>
      {/* Motor housing */}
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.04, 10]} />
        <Metal color="#282c34" />
      </mesh>
      {/* Propeller disc */}
      <mesh ref={ref} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.005, 20]} />
        <meshBasicMaterial color="#00d4aa" transparent opacity={0.15} />
      </mesh>
      {/* Propeller blades */}
      <mesh ref={ref} position={[0, 0.028, 0]}>
        <boxGeometry args={[0.28, 0.003, 0.02]} />
        <meshStandardMaterial color="#1a2535" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
};

export const Drone3D = ({ thrust, roll, pitch, yaw, showThrust, showAxes, showTrajectory, waypoints, position }: DroneProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!bodyRef.current) return;
    bodyRef.current.position.set(position[0], position[1], position[2]);
    bodyRef.current.rotation.set(pitch * 0.3, yaw * 0.1, roll * 0.3);
    // Micro hover oscillation
    bodyRef.current.position.y += Math.sin(timeRef.current * 3) * 0.008;
  });

  const armPositions: [number, number, number][] = [
    [0.2, 0, 0.2], [-0.2, 0, 0.2], [-0.2, 0, -0.2], [0.2, 0, -0.2]
  ];

  // Trajectory line
  const trajectoryLine = useMemo(() => {
    if (waypoints.length < 2) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(waypoints);
    const mat = new THREE.LineBasicMaterial({ color: "#00d4aa", transparent: true, opacity: 0.4 });
    return new THREE.Line(geo, mat);
  }, [waypoints]);

  return (
    <group>
      {showTrajectory && trajectoryLine && <primitive object={trajectoryLine} />}

      {/* Waypoint markers */}
      {waypoints.map((wp, i) => (
        <mesh key={i} position={wp}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#f0a500" transparent opacity={0.5} />
        </mesh>
      ))}

      <group ref={bodyRef}>
        {/* Central body */}
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.04, 0.12]} />
          <Metal color="#0a6abf" />
        </mesh>
        {/* Battery */}
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[0.06, 0.02, 0.08]} />
          <meshStandardMaterial color="#15181f" metalness={0.1} roughness={0.8} />
        </mesh>
        {/* Camera gimbal */}
        <mesh position={[0, -0.04, 0.03]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#080a10" metalness={0.9} roughness={0.05} />
        </mesh>
        {/* GPS module */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.01, 8]} />
          <meshStandardMaterial color="#4a4e58" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Status LED */}
        <mesh position={[0, 0.025, 0.06]}>
          <sphereGeometry args={[0.005, 6, 6]} />
          <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.6} />
        </mesh>

        {/* Arms and rotors */}
        {armPositions.map((pos, i) => (
          <group key={i}>
            {/* Arm */}
            <mesh position={[pos[0] / 2, 0, pos[2] / 2]} castShadow
              rotation={[0, Math.atan2(pos[0], pos[2]), 0]}>
              <boxGeometry args={[0.02, 0.015, Math.sqrt(pos[0] ** 2 + pos[2] ** 2)]} />
              <Metal color="#282c34" />
            </mesh>
            <Rotor position={pos} spin={i % 2 === 0 ? 1 : -1} />
          </group>
        ))}

        {/* Thrust vectors */}
        {showThrust && armPositions.map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1] - 0.05 - thrust * 0.02, pos[2]]}>
            <coneGeometry args={[0.03, thrust * 0.15 + 0.05, 8]} />
            <meshBasicMaterial color="#f0a500" transparent opacity={0.25} />
          </mesh>
        ))}

        {/* Orientation axes */}
        {showAxes && (
          <group>
            <mesh position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 4]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 4]} />
              <meshBasicMaterial color="#44ff44" />
            </mesh>
            <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 4]} />
              <meshBasicMaterial color="#4488ff" />
            </mesh>
          </group>
        )}

        {/* Tooltips */}
        <TooltipHotspot position={[0.22, 0.05, 0.22]} label="Brushless Motor" explanation="Each rotor is driven by a brushless DC motor. Differential thrust between rotors controls roll, pitch, and yaw." color="#00d4aa" />
        <TooltipHotspot position={[0, 0.06, 0]} label="Flight Controller" explanation="The onboard IMU and PID controllers stabilize attitude at 1000Hz, adjusting motor speeds to maintain desired orientation." color="#0984e3" />
        <TooltipHotspot position={[0, -0.06, 0.03]} label="Camera Gimbal" explanation="Stabilized camera mount compensates for drone movement, keeping the image steady during flight maneuvers." color="#6c5ce7" />
      </group>
    </group>
  );
};

export const DroneSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.0} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.3} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.25} color="#00d4aa" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.45} />
    <ambientLight intensity={0.15} color="#c8d0e0" />
  </>
);
