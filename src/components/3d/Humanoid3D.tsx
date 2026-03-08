import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HumanoidProps {
  theta: number;
  showCoM: boolean;
  showPolygon: boolean;
}

const LimbSegment = ({ length, radius, color }: { length: number; radius: number; color: string }) => (
  <group>
    <mesh position={[0, length / 2, 0]}>
      <capsuleGeometry args={[radius, length - radius * 2, 8, 16]} />
      <meshStandardMaterial color={color} metalness={0.65} roughness={0.25} />
    </mesh>
    {/* Structural ribbing */}
    {[0.25, 0.5, 0.75].map((p, i) => (
      <mesh key={i} position={[0, length * p, 0]}>
        <torusGeometry args={[radius * 1.05, 0.004, 6, 12]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.85} roughness={0.15} />
      </mesh>
    ))}
  </group>
);

const JointRing = ({ radius, color }: { radius: number; color: string }) => (
  <group>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, radius * 0.3, 8, 20]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.2} />
    </mesh>
    {/* Joint housing */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 1.3, radius * 0.1, 6, 20]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.85} roughness={0.15} />
    </mesh>
    {/* Rotation axis indicator */}
    <mesh position={[0, radius * 1.5, 0]}>
      <sphereGeometry args={[0.008, 6, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  </group>
);

const CoMMarker = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.5;
  });

  return (
    <group ref={ref}>
      <mesh>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#f0a500" metalness={0.5} roughness={0.3} emissive="#f0a500" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <ringGeometry args={[0.12, 0.15, 16]} />
        <meshBasicMaterial color="#f0a500" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Humanoid3D = ({ theta, showCoM, showPolygon }: HumanoidProps) => {
  const scale = 1.5;

  return (
    <group>
      {/* Support polygon (feet area) */}
      {showPolygon && (
        <group position={[0, 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial color="#00b894" transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0.38, 0.4, 4]} />
            <meshBasicMaterial color="#00b894" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Feet with tread pattern */}
      {[-0.15, 0.15].map((xOff, i) => (
        <group key={i} position={[xOff, 0.03, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.06, 0.25]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Ankle sensor mount */}
          <mesh position={[0, 0.04, -0.08]}>
            <boxGeometry args={[0.04, 0.02, 0.02]} />
            <meshStandardMaterial color="#636e72" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Foot contact sensor */}
          <mesh position={[0, -0.028, 0.05]}>
            <cylinderGeometry args={[0.015, 0.015, 0.005, 8]} />
            <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Body tilting group */}
      <group rotation={[0, 0, theta]}>
        {/* Legs */}
        {[-0.15, 0.15].map((xOff, i) => (
          <group key={i} position={[xOff, 0.06, 0]}>
            <LimbSegment length={0.45 * scale} radius={0.05} color="#2d3436" />
            <JointRing radius={0.06} color="#00d4aa" />
            <group position={[0, 0.45 * scale, 0]}>
              <JointRing radius={0.06} color="#00b894" />
              <LimbSegment length={0.4 * scale} radius={0.055} color="#2d3436" />
            </group>
          </group>
        ))}

        {/* Torso */}
        <group position={[0, 1.3 * scale, 0]}>
          <mesh>
            <boxGeometry args={[0.35, 0.5 * scale, 0.2]} />
            <meshStandardMaterial color="#0984e3" metalness={0.55} roughness={0.28} />
          </mesh>
          {/* Chest plate with details */}
          <mesh position={[0, 0.05, 0.101]}>
            <boxGeometry args={[0.25, 0.3, 0.01]} />
            <meshStandardMaterial color="#00d4aa" metalness={0.7} roughness={0.2} emissive="#00d4aa" emissiveIntensity={0.15} />
          </mesh>
          {/* Ventilation grille */}
          {[-0.08, 0, 0.08].map((y, i) => (
            <mesh key={i} position={[0, y - 0.1, 0.105]}>
              <boxGeometry args={[0.18, 0.015, 0.003]} />
              <meshStandardMaterial color="#0d1117" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}
          {/* Core light */}
          <mesh position={[0, 0, 0.11]}>
            <circleGeometry args={[0.04, 16]} />
            <meshBasicMaterial color="#00d4aa" />
          </mesh>
          {/* Side sensor panels */}
          {[-1, 1].map((side, i) => (
            <mesh key={i} position={[side * 0.176, 0, 0]}>
              <boxGeometry args={[0.005, 0.25, 0.12]} />
              <meshStandardMaterial color="#1a2a3a" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}

          {/* Arms */}
          {[-1, 1].map((side, i) => (
            <group key={i} position={[side * 0.22, 0.2, 0]}>
              <JointRing radius={0.05} color="#6c5ce7" />
              <group rotation={[0, 0, side * 0.15 + theta * 0.3]}>
                <LimbSegment length={0.4 * scale} radius={0.04} color="#2d3436" />
                <group position={[0, 0.4 * scale, 0]}>
                  <JointRing radius={0.04} color="#6c5ce7" />
                  <LimbSegment length={0.35 * scale} radius={0.035} color="#2d3436" />
                  <group position={[0, 0.35 * scale, 0]}>
                    <mesh>
                      <sphereGeometry args={[0.04, 12, 12]} />
                      <meshStandardMaterial color="#636e72" metalness={0.7} roughness={0.2} />
                    </mesh>
                    {/* Finger stubs */}
                    {[-0.02, 0, 0.02].map((z, j) => (
                      <mesh key={j} position={[0, 0.04, z]}>
                        <capsuleGeometry args={[0.006, 0.02, 4, 6]} />
                        <meshStandardMaterial color="#636e72" metalness={0.6} roughness={0.3} />
                      </mesh>
                    ))}
                  </group>
                </group>
              </group>
            </group>
          ))}

          {/* Neck */}
          <group position={[0, 0.3 * scale, 0]}>
            <mesh>
              <cylinderGeometry args={[0.04, 0.05, 0.1, 8]} />
              <meshStandardMaterial color="#2d3436" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Neck cable bundle */}
            <mesh position={[0.03, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
              <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Head */}
            <group position={[0, 0.15, 0]}>
              <mesh>
                <boxGeometry args={[0.18, 0.2, 0.18]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.2} />
              </mesh>
              {/* Visor */}
              <mesh position={[0, 0.02, 0.091]}>
                <boxGeometry args={[0.14, 0.06, 0.01]} />
                <meshStandardMaterial color="#00d4aa" metalness={0.3} roughness={0.1} emissive="#00d4aa" emissiveIntensity={0.8} />
              </mesh>
              {/* Camera lens */}
              <mesh position={[0.05, 0.02, 0.095]}>
                <cylinderGeometry args={[0.012, 0.012, 0.008, 8]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#0d1117" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Depth sensor */}
              <mesh position={[-0.05, 0.02, 0.095]}>
                <boxGeometry args={[0.025, 0.01, 0.008]} />
                <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.3} />
              </mesh>
              {/* Antenna */}
              <mesh position={[0, 0.13, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
                <meshStandardMaterial color="#636e72" metalness={0.8} roughness={0.1} />
              </mesh>
              <mesh position={[0, 0.17, 0]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color="#ff4444" />
              </mesh>
            </group>
          </group>
        </group>

        {/* Center of Mass marker */}
        {showCoM && (
          <group position={[0, 1.1 * scale, 0.3]}>
            <CoMMarker />
            <mesh position={[0, -1.1 * scale / 2, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 1.1 * scale, 4]} />
              <meshBasicMaterial color="#f0a500" transparent opacity={0.4} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

export const HumanoidSceneLighting = () => (
  <>
    <ambientLight intensity={0.25} />
    <directionalLight position={[4, 8, 4]} intensity={0.9} castShadow color="#ffffff" />
    <directionalLight position={[-3, 5, -2]} intensity={0.3} color="#0984e3" />
    <pointLight position={[0, 3, 2]} intensity={0.4} color="#00d4aa" />
    <hemisphereLight groundColor="#0d1117" color="#1a2a3a" intensity={0.4} />
  </>
);
