import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

const JointMaterial = ({ color }: { color: string }) => (
  <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
);

const LinkSegment = ({ length, color, radius = 0.08 }: { length: number; color: string; radius?: number }) => (
  <group>
    <mesh position={[0, length / 2, 0]} castShadow>
      <cylinderGeometry args={[radius, radius * 0.9, length, 16]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, length * 0.15, 0]}>
      <torusGeometry args={[radius + 0.01, 0.015, 8, 16]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, length * 0.85, 0]}>
      <torusGeometry args={[radius + 0.01, 0.015, 8, 16]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
    </mesh>
  </group>
);

const JointSphere = ({ radius = 0.12, color }: { radius?: number; color: string }) => (
  <mesh castShadow>
    <sphereGeometry args={[radius, 24, 24]} />
    <JointMaterial color={color} />
  </mesh>
);

const EndEffector = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 2;
  });
  return (
    <group ref={ref}>
      {[-1, 1].map(side => (
        <group key={side} position={[side * 0.06, 0.08, 0]}>
          <mesh>
            <boxGeometry args={[0.02, 0.12, 0.04]} />
            <meshStandardMaterial color="#00d4aa" metalness={0.7} roughness={0.2} emissive="#00d4aa" emissiveIntensity={0.15} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.04, 12]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
};

const CoordinateFrame = ({ size = 0.2 }: { size?: number }) => (
  <group>
    <mesh position={[size / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[0.008, 0.008, size, 6]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
    <mesh position={[size / 2 + size * 0.15, 0, 0]}>
      <coneGeometry args={[0.02, 0.06, 6]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
    <mesh position={[0, size / 2, 0]}>
      <cylinderGeometry args={[0.008, 0.008, size, 6]} />
      <meshBasicMaterial color="#44ff44" />
    </mesh>
    <mesh position={[0, size / 2 + size * 0.15, 0]} rotation={[0, 0, 0]}>
      <coneGeometry args={[0.02, 0.06, 6]} />
      <meshBasicMaterial color="#44ff44" />
    </mesh>
    <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.008, 0.008, size, 6]} />
      <meshBasicMaterial color="#4488ff" />
    </mesh>
    <mesh position={[0, 0, size / 2 + size * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.02, 0.06, 6]} />
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

/** Trajectory trail rendered from stored world-space points */
const TrajectoryTrail = ({ points }: { points: THREE.Vector3[] }) => {
  const geometry = useMemo(() => {
    if (points.length < 2) return new THREE.BufferGeometry();
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#00d4aa" transparent opacity={0.4} linewidth={1} />
    </line>
  );
};

export const RobotArm3D = ({ joint1, joint2, joint3, link1 = 1.2, link2 = 1.0, link3 = 0.8, showDebug = false, trailPoints = [] }: RobotArmProps) => {
  return (
    <group>
      {/* Base platform */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 32]} />
        <meshStandardMaterial color="#0d1117" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Base rotation ring */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.025, 8, 32]} />
        <meshStandardMaterial color="#00d4aa" metalness={0.5} roughness={0.3} emissive="#00d4aa" emissiveIntensity={0.3} />
      </mesh>

      {/* Joint 1 - Base rotation */}
      <group rotation={[0, joint1, 0]}>
        <JointSphere radius={0.14} color="#00d4aa" />
        <CoordinateFrame size={0.3} />
        {showDebug && <JointArc angle={joint1} radius={0.35} color="#00d4aa" />}

        {/* Link 1 */}
        <LinkSegment length={link1} color="#00b894" radius={0.09} />

        {/* Joint 2 */}
        <group position={[0, link1, 0]} rotation={[0, 0, joint2]}>
          <JointSphere radius={0.12} color="#00b894" />
          <CoordinateFrame size={0.25} />
          {showDebug && <JointArc angle={joint2} radius={0.3} color="#00b894" />}

          {/* Link 2 */}
          <LinkSegment length={link2} color="#0984e3" radius={0.075} />

          {/* Joint 3 */}
          <group position={[0, link2, 0]} rotation={[0, 0, joint3]}>
            <JointSphere radius={0.1} color="#0984e3" />
            <CoordinateFrame size={0.2} />
            {showDebug && <JointArc angle={joint3} radius={0.25} color="#0984e3" />}

            {/* Link 3 */}
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
    <gridHelper args={[10, 20, "#1a2a3a", "#111827"]} position={[0, -0.15, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#0d1117" transparent opacity={0.8} />
    </mesh>
  </group>
);

export const SceneLighting = () => (
  <>
    <ambientLight intensity={0.3} />
    <directionalLight position={[5, 8, 5]} intensity={1} castShadow color="#ffffff"
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#00d4aa" />
    <pointLight position={[0, 5, 0]} intensity={0.5} color="#0984e3" />
    <hemisphereLight groundColor="#0d1117" color="#1a2a3a" intensity={0.5} />
  </>
);

export { CoordinateFrame };
