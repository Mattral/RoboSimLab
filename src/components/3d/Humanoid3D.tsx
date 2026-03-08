import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HumanoidProps {
  theta: number;
  showCoM: boolean;
  showPolygon: boolean;
}

/** Brushed metal material */
const HMetal = ({ color, emissive }: { color: string; emissive?: string }) => (
  <meshStandardMaterial
    color={color}
    metalness={0.8}
    roughness={0.18}
    envMapIntensity={0.6}
    {...(emissive ? { emissive, emissiveIntensity: 0.06 } : {})}
  />
);

/** Polymer material */
const HPoly = ({ color = "#0a0c12" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
);

/** Limb segment with structural detail */
const LimbSegment = ({ length, radius, color }: { length: number; radius: number; color: string }) => (
  <group>
    <mesh position={[0, length / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, length - radius * 2, 10, 20]} />
      <HMetal color={color} />
    </mesh>
    {/* Structural ribs */}
    {[0.22, 0.5, 0.78].map((p, i) => (
      <mesh key={i} position={[0, length * p, 0]}>
        <torusGeometry args={[radius * 1.06, 0.005, 6, 16]} />
        <HPoly color="#15181f" />
      </mesh>
    ))}
    {/* Side cable channel */}
    <mesh position={[radius * 0.8, length / 2, 0]} castShadow>
      <boxGeometry args={[0.008, length * 0.5, 0.015]} />
      <HPoly color="#12141a" />
    </mesh>
  </group>
);

/** Joint ring with housing detail */
const JointRing = ({ radius, color }: { radius: number; color: string }) => {
  const innerRef = useRef<THREE.Mesh>(null);

  // Micro-rotation — encoder tick
  useFrame((_, delta) => {
    if (innerRef.current) innerRef.current.rotation.z += delta * 0.4;
  });

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, radius * 0.28, 10, 24]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.18} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Housing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.35, radius * 0.08, 8, 24]} />
        <HPoly color="#15181f" />
      </mesh>
      {/* Encoder ring */}
      <mesh ref={innerRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.65, 0.005, 6, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

/** Center of mass marker with slow spin */
const CoMMarker = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.2;
  });

  return (
    <group ref={ref}>
      <mesh>
        <octahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial color="#f0a500" metalness={0.45} roughness={0.3} emissive="#f0a500" emissiveIntensity={0.45} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <ringGeometry args={[0.1, 0.13, 20]} />
        <meshBasicMaterial color="#f0a500" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Humanoid3D = ({ theta, showCoM, showPolygon }: HumanoidProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const scale = 1.5;

  // Micro-stabilization — the robot is never perfectly still
  useFrame(({ clock }) => {
    if (bodyRef.current) {
      // Tiny torso sway — balancing micro-corrections
      bodyRef.current.position.x = Math.sin(clock.elapsedTime * 0.7) * 0.003;
      bodyRef.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.001;
    }
    if (headRef.current) {
      // Slow sensor scanning — head looks around slightly
      headRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.08;
      headRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group>
      {/* Support polygon */}
      {showPolygon && (
        <group position={[0, 0.008, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial color="#00b894" transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0.38, 0.4, 4]} />
            <meshBasicMaterial color="#00b894" transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* Feet — rubber-soled with grip texture */}
      {[-0.15, 0.15].map((xOff, i) => (
        <group key={i} position={[xOff, 0.03, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.055, 0.26]} />
            <HPoly color="#15181f" />
          </mesh>
          {/* Sole — rubber */}
          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[0.115, 0.008, 0.25]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.05} roughness={0.95} />
          </mesh>
          {/* Ankle sensor */}
          <mesh position={[0, 0.04, -0.09]}>
            <boxGeometry args={[0.035, 0.018, 0.018]} />
            <HMetal color="#4a4e58" />
          </mesh>
          {/* Force sensor — underfoot */}
          <mesh position={[0, -0.025, 0.06]}>
            <cylinderGeometry args={[0.013, 0.013, 0.005, 10]} />
            <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.25} metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Body tilting group */}
      <group rotation={[0, 0, theta]}>
        <group ref={bodyRef}>
          {/* Legs */}
          {[-0.15, 0.15].map((xOff, i) => (
            <group key={i} position={[xOff, 0.06, 0]}>
              <LimbSegment length={0.45 * scale} radius={0.048} color="#282c34" />
              <JointRing radius={0.055} color="#00d4aa" />
              <group position={[0, 0.45 * scale, 0]}>
                <JointRing radius={0.055} color="#00b894" />
                <LimbSegment length={0.4 * scale} radius={0.052} color="#282c34" />
              </group>
            </group>
          ))}

          {/* Torso — main chassis */}
          <group position={[0, 1.3 * scale, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.5 * scale, 0.2]} />
              <HMetal color="#0a6abf" emissive="#0984e3" />
            </mesh>
            {/* Chest plate — accent panel */}
            <mesh position={[0, 0.05, 0.101]}>
              <boxGeometry args={[0.24, 0.28, 0.008]} />
              <meshStandardMaterial color="#00d4aa" metalness={0.65} roughness={0.2} emissive="#00d4aa" emissiveIntensity={0.1} />
            </mesh>
            {/* Ventilation grille */}
            {[-0.08, -0.02, 0.04].map((y, i) => (
              <mesh key={i} position={[0, y - 0.08, 0.106]}>
                <boxGeometry args={[0.16, 0.012, 0.003]} />
                <HPoly />
              </mesh>
            ))}
            {/* Core status light — breathing */}
            <CoreLight />
            {/* Side panels */}
            {[-1, 1].map((side, i) => (
              <mesh key={i} position={[side * 0.176, 0, 0]}>
                <boxGeometry args={[0.005, 0.24, 0.11]} />
                <HMetal color="#1a2535" />
              </mesh>
            ))}

            {/* Arms */}
            {[-1, 1].map((side, i) => (
              <group key={i} position={[side * 0.22, 0.2, 0]}>
                <JointRing radius={0.048} color="#6c5ce7" />
                <group rotation={[0, 0, side * 0.15 + theta * 0.3]}>
                  <LimbSegment length={0.4 * scale} radius={0.038} color="#282c34" />
                  <group position={[0, 0.4 * scale, 0]}>
                    <JointRing radius={0.038} color="#6c5ce7" />
                    <LimbSegment length={0.35 * scale} radius={0.033} color="#282c34" />
                    <group position={[0, 0.35 * scale, 0]}>
                      {/* Hand */}
                      <mesh castShadow>
                        <sphereGeometry args={[0.038, 14, 14]} />
                        <HMetal color="#4a4e58" />
                      </mesh>
                      {/* Finger stubs */}
                      {[-0.018, 0, 0.018].map((z, j) => (
                        <mesh key={j} position={[0, 0.04, z]} castShadow>
                          <capsuleGeometry args={[0.006, 0.022, 4, 8]} />
                          <HMetal color="#4a4e58" />
                        </mesh>
                      ))}
                    </group>
                  </group>
                </group>
              </group>
            ))}

            {/* Neck */}
            <group position={[0, 0.3 * scale, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.038, 0.048, 0.1, 12]} />
                <HMetal color="#282c34" />
              </mesh>
              {/* Cable bundle */}
              {[0.025, -0.025].map((x, i) => (
                <mesh key={i} position={[x, 0, 0.02]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.08, 4]} />
                  <HPoly color="#12141a" />
                </mesh>
              ))}

              {/* Head — sensor housing */}
              <group ref={headRef} position={[0, 0.15, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.18, 0.19, 0.17]} />
                  <HPoly color="#15181f" />
                </mesh>
                {/* Head top plate */}
                <mesh position={[0, 0.098, 0]}>
                  <boxGeometry args={[0.17, 0.006, 0.16]} />
                  <HMetal color="#282c34" />
                </mesh>
                {/* Visor — glass-covered sensor array */}
                <mesh position={[0, 0.02, 0.086]}>
                  <boxGeometry args={[0.14, 0.055, 0.008]} />
                  <meshStandardMaterial
                    color="#00d4aa"
                    metalness={0.2}
                    roughness={0.05}
                    emissive="#00d4aa"
                    emissiveIntensity={0.7}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                {/* Camera lens — glass cover */}
                <mesh position={[0.048, 0.02, 0.092]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.014, 0.014, 0.01, 12]} />
                  <meshStandardMaterial color="#080a10" metalness={0.95} roughness={0.05} />
                </mesh>
                <mesh position={[0.048, 0.02, 0.098]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
                  <meshStandardMaterial color="#1a3050" metalness={0.3} roughness={0.1} emissive="#0984e3" emissiveIntensity={0.2} />
                </mesh>
                {/* Depth sensor */}
                <mesh position={[-0.048, 0.02, 0.092]}>
                  <boxGeometry args={[0.024, 0.01, 0.008]} />
                  <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.25} metalness={0.3} roughness={0.3} />
                </mesh>
                {/* LIDAR dome on top */}
                <mesh position={[0, 0.12, 0]}>
                  <cylinderGeometry args={[0.018, 0.022, 0.04, 12]} />
                  <HMetal color="#4a4e58" />
                </mesh>
                <LidarSpin />
                {/* Antenna */}
                <mesh position={[-0.06, 0.12, 0]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.05, 6]} />
                  <HMetal color="#4a4e58" />
                </mesh>
                <mesh position={[-0.06, 0.15, 0]}>
                  <sphereGeometry args={[0.01, 8, 8]} />
                  <meshBasicMaterial color="#ff3333" />
                </mesh>
              </group>
            </group>
          </group>

          {/* Center of Mass marker */}
          {showCoM && (
            <group position={[0, 1.1 * scale, 0.3]}>
              <CoMMarker />
              <mesh position={[0, -1.1 * scale / 2, 0]}>
                <cylinderGeometry args={[0.004, 0.004, 1.1 * scale, 4]} />
                <meshBasicMaterial color="#f0a500" transparent opacity={0.35} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

/** Core light — breathing glow on chest */
const CoreLight = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, 0.108]}>
      <circleGeometry args={[0.035, 18]} />
      <meshBasicMaterial color="#00d4aa" transparent opacity={0.7} />
    </mesh>
  );
};

/** LIDAR spin indicator on top of head */
const LidarSpin = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 3;
  });
  return (
    <mesh ref={ref} position={[0, 0.145, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.016, 0.003, 4, 12]} />
      <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.4} metalness={0.3} roughness={0.4} />
    </mesh>
  );
};

export const HumanoidSceneLighting = () => (
  <>
    {/* Key light — warm white */}
    <directionalLight position={[4, 9, 4]} intensity={1.0} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-bias={-0.0005}
    />
    {/* Fill — cool blue */}
    <directionalLight position={[-4, 5, -3]} intensity={0.3} color="#b8cce8" />
    {/* Rim — teal accent */}
    <directionalLight position={[0, 2, -4]} intensity={0.25} color="#00d4aa" />
    {/* Top */}
    <pointLight position={[0, 4, 2]} intensity={0.35} color="#e8eaf0" />
    {/* Hemisphere */}
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.45} />
    <ambientLight intensity={0.12} color="#c8d0e0" />
  </>
);
