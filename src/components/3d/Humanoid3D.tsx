import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import TooltipHotspot from "./TooltipHotspot";

interface HumanoidProps {
  theta: number;
  showCoM: boolean;
  showPolygon: boolean;
}

/** Brushed metal — premium finish */
const HMetal = ({ color, emissive }: { color: string; emissive?: string }) => (
  <meshStandardMaterial
    color={color}
    metalness={0.82}
    roughness={0.14}
    envMapIntensity={0.7}
    {...(emissive ? { emissive, emissiveIntensity: 0.06 } : {})}
  />
);

/** Hard polymer shell */
const HPoly = ({ color = "#0a0c12" }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
);

/** Rounded limb — capsule with shell panels and cable channels */
const LimbSegment = ({ length, radius, color, accentColor = "#00d4aa" }: { length: number; radius: number; color: string; accentColor?: string }) => (
  <group>
    <mesh position={[0, length / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, length - radius * 2, 12, 24]} />
      <HMetal color={color} />
    </mesh>
    {/* Shell panels — outer armor */}
    {[-1, 1].map((side, i) => (
      <mesh key={i} position={[side * (radius * 0.85), length / 2, 0]} castShadow>
        <boxGeometry args={[0.006, length * 0.55, radius * 1.4]} />
        <HPoly color="#15181f" />
      </mesh>
    ))}
    {/* Structural ring details */}
    {[0.2, 0.5, 0.8].map((p, i) => (
      <mesh key={i} position={[0, length * p, 0]}>
        <torusGeometry args={[radius * 1.04, 0.004, 8, 20]} />
        <HPoly color="#15181f" />
      </mesh>
    ))}
    {/* Accent line */}
    <mesh position={[0, length / 2, radius * 0.95]}>
      <boxGeometry args={[0.004, length * 0.4, 0.003]} />
      <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.15} metalness={0.3} roughness={0.3} />
    </mesh>
    {/* Cable channel */}
    <mesh position={[radius * 0.7, length / 2, 0]} castShadow>
      <boxGeometry args={[0.008, length * 0.5, 0.014]} />
      <HPoly color="#12141a" />
    </mesh>
  </group>
);

/** Joint actuator housing with encoder ring */
const JointRing = ({ radius, color }: { radius: number; color: string }) => {
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (innerRef.current) innerRef.current.rotation.z += delta * 0.4;
  });

  return (
    <group>
      {/* Main joint ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, radius * 0.28, 12, 28]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.15} emissive={color} emissiveIntensity={0.18} />
      </mesh>
      {/* Outer housing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.3, radius * 0.08, 8, 28]} />
        <HPoly color="#15181f" />
      </mesh>
      {/* Encoder ring */}
      <mesh ref={innerRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.6, 0.004, 6, 28]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

/** Center of mass marker */
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
        <ringGeometry args={[0.1, 0.13, 24]} />
        <meshBasicMaterial color="#f0a500" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Humanoid3D = ({ theta, showCoM, showPolygon }: HumanoidProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const scale = 1.5;

  useFrame(({ clock }) => {
    if (bodyRef.current) {
      bodyRef.current.position.x = Math.sin(clock.elapsedTime * 0.7) * 0.003;
      bodyRef.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.001;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.08;
      headRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.02;
    }
    // Subtle arm sway for balance
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = -0.15 + theta * 0.3 + Math.sin(clock.elapsedTime * 0.8) * 0.02;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = 0.15 + theta * 0.3 + Math.sin(clock.elapsedTime * 0.8 + Math.PI) * 0.02;
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

      {/* Feet */}
      {[-0.15, 0.15].map((xOff, i) => (
        <group key={i} position={[xOff, 0.03, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.055, 0.26]} />
            <HPoly color="#15181f" />
          </mesh>
          {/* Sole */}
          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[0.115, 0.008, 0.25]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.05} roughness={0.95} />
          </mesh>
          {/* Toe bumper */}
          <mesh position={[0, 0, 0.125]}>
            <boxGeometry args={[0.1, 0.04, 0.015]} />
            <HMetal color="#282c34" />
          </mesh>
          {/* Force sensors */}
          {[-0.03, 0.03].map((z, j) => (
            <mesh key={j} position={[0, -0.025, z + 0.04]}>
              <cylinderGeometry args={[0.012, 0.012, 0.005, 10]} />
              <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.25} metalness={0.3} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Body tilting group */}
      <group rotation={[0, 0, theta]}>
        <group ref={bodyRef}>
          {/* Legs */}
          {[-0.15, 0.15].map((xOff, i) => (
            <group key={i} position={[xOff, 0.06, 0]}>
              <LimbSegment length={0.45 * scale} radius={0.048} color="#282c34" accentColor="#00d4aa" />
              <JointRing radius={0.055} color="#00d4aa" />
              <group position={[0, 0.45 * scale, 0]}>
                <JointRing radius={0.055} color="#00b894" />
                <LimbSegment length={0.4 * scale} radius={0.052} color="#282c34" accentColor="#00b894" />
              </group>
            </group>
          ))}

          {/* Torso */}
          <group position={[0, 1.3 * scale, 0]}>
            {/* Main torso chassis */}
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.5 * scale, 0.2]} />
              <HMetal color="#1a2535" emissive="#0984e3" />
            </mesh>
            {/* Front chest plate — angled armor */}
            <mesh position={[0, 0.06, 0.101]}>
              <boxGeometry args={[0.26, 0.3, 0.008]} />
              <meshStandardMaterial color="#0d1117" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* Chest accent — glowing reactor */}
            <mesh position={[0, 0.04, 0.108]}>
              <boxGeometry args={[0.08, 0.08, 0.004]} />
              <meshStandardMaterial color="#00d4aa" metalness={0.3} roughness={0.1} emissive="#00d4aa" emissiveIntensity={0.4} />
            </mesh>
            {/* Chest ventilation */}
            {[-0.06, -0.02, 0.02].map((y, i) => (
              <mesh key={i} position={[0, y - 0.06, 0.106]}>
                <boxGeometry args={[0.16, 0.01, 0.003]} />
                <HPoly />
              </mesh>
            ))}
            {/* Core breathing light */}
            <CoreLight />
            {/* Side armor panels */}
            {[-1, 1].map((side, i) => (
              <group key={i}>
                <mesh position={[side * 0.176, 0, 0]}>
                  <boxGeometry args={[0.006, 0.28, 0.14]} />
                  <HMetal color="#1a2535" />
                </mesh>
                {/* Side accent */}
                <mesh position={[side * 0.18, 0.04, 0]}>
                  <boxGeometry args={[0.003, 0.1, 0.003]} />
                  <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.2} />
                </mesh>
              </group>
            ))}
            {/* Back panel detail */}
            <mesh position={[0, 0, -0.101]}>
              <boxGeometry args={[0.24, 0.3, 0.006]} />
              <HPoly color="#12141a" />
            </mesh>

            {/* Arms */}
            {[-1, 1].map((side, i) => (
              <group key={i} position={[side * 0.22, 0.2, 0]}
                ref={side === -1 ? leftArmRef : rightArmRef}>
                <JointRing radius={0.048} color="#6c5ce7" />
                <group>
                  <LimbSegment length={0.4 * scale} radius={0.038} color="#282c34" accentColor="#6c5ce7" />
                  <group position={[0, 0.4 * scale, 0]}>
                    <JointRing radius={0.038} color="#6c5ce7" />
                    <LimbSegment length={0.35 * scale} radius={0.033} color="#282c34" accentColor="#6c5ce7" />
                    <group position={[0, 0.35 * scale, 0]}>
                      {/* Hand — articulated */}
                      <mesh castShadow>
                        <boxGeometry args={[0.05, 0.06, 0.035]} />
                        <HMetal color="#282c34" />
                      </mesh>
                      {/* Finger segments */}
                      {[-0.015, 0, 0.015].map((z, j) => (
                        <group key={j}>
                          <mesh position={[0, 0.045, z]} castShadow>
                            <capsuleGeometry args={[0.006, 0.025, 4, 8]} />
                            <HMetal color="#4a4e58" />
                          </mesh>
                          <mesh position={[0, 0.07, z]} castShadow>
                            <capsuleGeometry args={[0.005, 0.015, 4, 8]} />
                            <HMetal color="#4a4e58" />
                          </mesh>
                        </group>
                      ))}
                      {/* Thumb */}
                      <mesh position={[0.03, 0.035, 0]} rotation={[0, 0, 0.5]} castShadow>
                        <capsuleGeometry args={[0.006, 0.02, 4, 8]} />
                        <HMetal color="#4a4e58" />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            ))}

            {/* Neck */}
            <group position={[0, 0.3 * scale, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.038, 0.05, 0.1, 14]} />
                <HMetal color="#282c34" />
              </mesh>
              {/* Neck cables */}
              {[0.025, -0.025].map((x, i) => (
                <mesh key={i} position={[x, 0, 0.025]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.08, 6]} />
                  <HPoly color="#12141a" />
                </mesh>
              ))}

              {/* Head */}
              <group ref={headRef} position={[0, 0.15, 0]}>
                {/* Main head shell — more rounded */}
                <mesh castShadow>
                  <boxGeometry args={[0.19, 0.2, 0.18]} />
                  <HPoly color="#15181f" />
                </mesh>
                {/* Head top dome */}
                <mesh position={[0, 0.1, 0]} castShadow>
                  <sphereGeometry args={[0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <HPoly color="#1a1e26" />
                </mesh>
                {/* Visor — bright teal strip */}
                <mesh position={[0, 0.02, 0.092]}>
                  <boxGeometry args={[0.15, 0.055, 0.008]} />
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
                {/* Camera lens */}
                <mesh position={[0.05, 0.02, 0.098]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.012, 14]} />
                  <meshStandardMaterial color="#080a10" metalness={0.95} roughness={0.05} />
                </mesh>
                <mesh position={[0.05, 0.02, 0.106]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.009, 0.009, 0.004, 14]} />
                  <meshStandardMaterial color="#1a3050" metalness={0.3} roughness={0.1} emissive="#0984e3" emissiveIntensity={0.2} />
                </mesh>
                {/* Depth sensor */}
                <mesh position={[-0.05, 0.02, 0.098]}>
                  <boxGeometry args={[0.026, 0.012, 0.01]} />
                  <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
                </mesh>
                {/* Chin sensor array */}
                <mesh position={[0, -0.06, 0.08]}>
                  <boxGeometry args={[0.08, 0.02, 0.015]} />
                  <HMetal color="#282c34" />
                </mesh>
                {/* LIDAR dome */}
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.02, 0.024, 0.04, 14]} />
                  <HMetal color="#4a4e58" />
                </mesh>
                <LidarSpin />
                {/* Antenna */}
                <mesh position={[-0.06, 0.14, 0]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.06, 6]} />
                  <HMetal color="#4a4e58" />
                </mesh>
                <mesh position={[-0.06, 0.175, 0]}>
                  <sphereGeometry args={[0.008, 8, 8]} />
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

          {/* Tooltips */}
          <TooltipHotspot position={[0, 2.05 * scale, 0.2]} label="LIDAR Scanner" explanation="Rotating laser scanner measures distances to nearby objects, building a 360° map of the environment for navigation and obstacle avoidance." color="#00d4aa" />
          <TooltipHotspot position={[0.15, 1.95 * scale, 0.15]} label="Stereo Camera" explanation="Dual cameras provide depth perception through triangulation, enabling the robot to estimate distances and recognize objects." color="#0984e3" />
          <TooltipHotspot position={[0, 1.3 * scale, 0.22]} label="IMU Sensor" explanation="The Inertial Measurement Unit detects body tilt and angular velocity. It's the primary input for the balance controller." color="#6c5ce7" />
          <TooltipHotspot position={[0.2, 0.8 * scale, 0]} label="Knee Actuator" explanation="High-torque servo motors at each knee joint provide the force needed to support body weight and absorb impact during walking." color="#00b894" />
          <TooltipHotspot position={[0, 0.03, 0.15]} label="Force Sensor" explanation="Pressure sensors under each foot measure ground reaction forces, critical for detecting foot contact and weight distribution." color="#f0a500" />
          {showCoM && (
            <TooltipHotspot position={[0.15, 1.1 * scale, 0.3]} label="Center of Mass" explanation="The balance point of the robot. The controller adjusts joint torques to keep it within the support polygon formed by the feet." color="#f0a500" size={0.03} />
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
    <mesh ref={ref} position={[0, 0, 0.112]}>
      <circleGeometry args={[0.025, 20]} />
      <meshBasicMaterial color="#00d4aa" transparent opacity={0.7} />
    </mesh>
  );
};

/** LIDAR spin indicator */
const LidarSpin = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 3;
  });
  return (
    <mesh ref={ref} position={[0, 0.175, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.018, 0.003, 6, 16]} />
      <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.4} metalness={0.3} roughness={0.4} />
    </mesh>
  );
};

export const HumanoidSceneLighting = () => (
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
