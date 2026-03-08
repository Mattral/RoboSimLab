import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TooltipHotspot from "./TooltipHotspot";

interface SoftRobotProps {
  pressure: number[];   // 3 chambers, 0-1
  showMesh: boolean;
  showPressure: boolean;
}

/** Generate a deformable tube with pressure-based bending */
const useSoftBody = (pressure: number[], segments: number = 20) => {
  return useMemo(() => {
    const points: THREE.Vector3[] = [];
    let x = 0, y = 0, angle = -Math.PI / 2;
    const segLen = 0.08;

    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(x, y, 0));
      // Curvature from differential pressure
      const t = i / segments;
      let curvature = 0;
      if (t < 0.33) curvature = (pressure[0] - 0.5) * 2;
      else if (t < 0.66) curvature = (pressure[1] - 0.5) * 2;
      else curvature = (pressure[2] - 0.5) * 2;
      angle += curvature * 0.15;
      x += Math.cos(angle) * segLen;
      y += Math.sin(angle) * segLen;
    }
    return points;
  }, [pressure, segments]);
};

export const SoftRobot3D = ({ pressure, showMesh, showPressure }: SoftRobotProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(timeRef.current * 0.3) * 0.05;
    }
  });

  const spinePoints = useSoftBody(pressure);
  const tubeGeo = useMemo(() => {
    if (spinePoints.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(spinePoints);
    return new THREE.TubeGeometry(curve, 40, 0.06, 12, false);
  }, [spinePoints]);

  const wireGeo = useMemo(() => {
    if (spinePoints.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(spinePoints);
    return new THREE.TubeGeometry(curve, 40, 0.065, 12, false);
  }, [spinePoints]);

  // Chamber colors based on pressure
  const chamberColors = pressure.map(p =>
    p > 0.6 ? "#ff6b6b" : p > 0.4 ? "#f0a500" : "#00d4aa"
  );

  return (
    <group ref={bodyRef}>
      {/* Base mount */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.06, 20]} />
        <meshStandardMaterial color="#282c34" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.012, 8, 20]} />
        <meshStandardMaterial color="#00d4aa" metalness={0.5} roughness={0.2} emissive="#00d4aa" emissiveIntensity={0.15} />
      </mesh>

      {/* Soft body */}
      {tubeGeo && (
        <mesh geometry={tubeGeo} castShadow>
          <meshStandardMaterial
            color="#0984e3"
            metalness={0.05}
            roughness={0.85}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Wireframe overlay */}
      {showMesh && wireGeo && (
        <mesh geometry={wireGeo}>
          <meshBasicMaterial color="#00d4aa" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      {/* Pressure chamber indicators */}
      {showPressure && spinePoints.length > 6 && (
        <group>
          {[0.15, 0.5, 0.85].map((t, i) => {
            const idx = Math.floor(t * (spinePoints.length - 1));
            const pt = spinePoints[idx];
            if (!pt) return null;
            return (
              <group key={i} position={pt}>
                <mesh>
                  <sphereGeometry args={[0.02 + pressure[i] * 0.03, 8, 8]} />
                  <meshStandardMaterial
                    color={chamberColors[i]}
                    emissive={chamberColors[i]}
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.7}
                  />
                </mesh>
                {/* Pressure ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.04 + pressure[i] * 0.02, 0.004, 6, 12]} />
                  <meshBasicMaterial color={chamberColors[i]} transparent opacity={0.3} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Tip sensor */}
      {spinePoints.length > 2 && (
        <mesh position={spinePoints[spinePoints.length - 1]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshStandardMaterial color="#f0a500" metalness={0.3} roughness={0.4} emissive="#f0a500" emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Tooltips */}
      <TooltipHotspot position={[0, 0.05, 0.1]} label="Pneumatic Chamber" explanation="Soft robots use pressurized air chambers instead of rigid joints. Inflating chambers on one side causes the body to bend in the opposite direction." color="#0984e3" />
      <TooltipHotspot position={[0, -0.02, -0.15]} label="Silicone Body" explanation="The body is made of flexible silicone elastomer. Unlike rigid robots, soft robots can safely interact with humans and delicate objects." color="#00d4aa" />
      {spinePoints.length > 2 && (
        <TooltipHotspot position={[spinePoints[spinePoints.length - 1].x + 0.1, spinePoints[spinePoints.length - 1].y, 0]} label="Tip Sensor" explanation="Force/position sensor at the tip provides feedback for closed-loop control of the soft manipulator's shape." color="#f0a500" />
      )}
    </group>
  );
};

export const SoftRobotSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.0} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.35} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.25} color="#0984e3" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.45} />
    <ambientLight intensity={0.15} color="#c8d0e0" />
  </>
);
