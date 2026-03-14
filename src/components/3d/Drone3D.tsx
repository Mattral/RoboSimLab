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

/** Carbon fiber material */
const Carbon = ({ color = "#1a1d24", roughness = 0.25 }: { color?: string; roughness?: number }) => (
  <meshStandardMaterial color={color} metalness={0.7} roughness={roughness} envMapIntensity={0.8} />
);

/** Accent glow material */
const Glow = ({ color, intensity = 0.4 }: { color: string; intensity?: number }) => (
  <meshStandardMaterial color={color} metalness={0.3} roughness={0.2} emissive={color} emissiveIntensity={intensity} />
);

/** Single rotor assembly with realistic blade geometry */
const Rotor = ({ position, spin, thrust }: { position: [number, number, number]; spin: number; thrust: number }) => {
  const bladeGroupRef = useRef<THREE.Group>(null);
  const blurRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (bladeGroupRef.current) bladeGroupRef.current.rotation.y += delta * spin * 50;
    if (blurRef.current) {
      const mat = blurRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + thrust * 0.08;
    }
  });

  return (
    <group position={position}>
      {/* Motor bell housing - brushless outrunner */}
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.05, 16]} />
        <Carbon color="#1a1d24" roughness={0.12} />
      </mesh>
      {/* Motor bell top with ventilation cuts */}
      <mesh position={[0, 0.028, 0]}>
        <cylinderGeometry args={[0.034, 0.038, 0.01, 16]} />
        <meshStandardMaterial color="#282c34" metalness={0.85} roughness={0.1} />
      </mesh>
      {/* Motor stator rings (visible detail) */}
      {[0.008, -0.008].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.042, 0.003, 6, 20]} />
          <meshStandardMaterial color="#0d0f14" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Motor shaft */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.018, 8]} />
        <meshStandardMaterial color="#6a6e78" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Propeller hub */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 12]} />
        <Carbon color="#0d0f14" />
      </mesh>

      {/* Spinning blade group */}
      <group ref={bladeGroupRef} position={[0, 0.048, 0]}>
        {/* 2 blades — tapered aerofoil shape */}
        {[0, Math.PI].map((rot, i) => (
          <group key={i} rotation={[0, rot, 0]}>
            <mesh position={[0.09, 0, 0]} rotation={[0.08, 0, 0]}>
              <boxGeometry args={[0.16, 0.0025, 0.028]} />
              <meshStandardMaterial color="#1a2030" metalness={0.45} roughness={0.35} />
            </mesh>
            {/* Blade tip */}
            <mesh position={[0.175, 0, 0]} rotation={[0.06, 0, 0]}>
              <boxGeometry args={[0.015, 0.002, 0.02]} />
              <Glow color="#00d4aa" intensity={0.15} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Motion blur disc */}
      <mesh ref={blurRef} position={[0, 0.047, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.002, 32]} />
        <meshBasicMaterial color="#00d4aa" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/** Arm connecting body to motor */
const MotorArm = ({ from, to }: { from: [number, number, number]; to: [number, number, number] }) => {
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]}
      rotation={[0, angle, 0]}>
      {/* Main arm tube — carbon fiber */}
      <mesh castShadow>
        <boxGeometry args={[0.028, 0.02, len]} />
        <Carbon />
      </mesh>
      {/* Top reinforcement rail */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.018, 0.004, len * 0.8]} />
        <meshStandardMaterial color="#0d0f14" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Wire channel underneath */}
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[0.01, 0.006, len * 0.6]} />
        <meshStandardMaterial color="#12141a" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  );
};

/** Landing gear assembly */
const LandingGearAssembly = () => (
  <group>
    {[-1, 1].map(side => (
      <group key={side}>
        {/* Vertical struts */}
        {[-0.11, 0.11].map((z, i) => (
          <group key={i} position={[side * 0.1, -0.05, z]}>
            <mesh rotation={[0, 0, side * 0.18]} castShadow>
              <capsuleGeometry args={[0.005, 0.07, 6, 12]} />
              <Carbon />
            </mesh>
          </group>
        ))}
        {/* Cross rail */}
        <mesh position={[side * 0.115, -0.095, 0]} castShadow>
          <capsuleGeometry args={[0.005, 0.22, 6, 12]} />
          <Carbon />
        </mesh>
        {/* Rubber feet */}
        {[-0.1, 0.1].map((z, i) => (
          <mesh key={i} position={[side * 0.115, -0.1, z]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.95} metalness={0.02} />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

export const Drone3D = ({ thrust, roll, pitch, yaw, showThrust, showAxes, showTrajectory, waypoints, position }: DroneProps) => {
  const bodyRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const ledRef = useRef<THREE.Mesh>(null);
  const rearLedRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!bodyRef.current) return;
    bodyRef.current.position.set(position[0], position[1], position[2]);
    bodyRef.current.rotation.set(pitch * 0.3, yaw * 0.1, roll * 0.3);
    bodyRef.current.position.y += Math.sin(timeRef.current * 3) * 0.006;

    // Pulsing LEDs
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(timeRef.current * 4) * 0.3;
    }
    if (rearLedRef.current) {
      const mat = rearLedRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(timeRef.current * 2) * 0.2;
    }
  });

  const armPositions: [number, number, number][] = [
    [0.28, 0, 0.28], [-0.28, 0, 0.28], [-0.28, 0, -0.28], [0.28, 0, -0.28]
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
        {/* === CENTRAL BODY — aerodynamic shell === */}
        {/* Main body — rounded top shell */}
        <mesh castShadow position={[0, 0.008, 0]}>
          <boxGeometry args={[0.18, 0.05, 0.18]} />
          <Carbon color="#1a1d24" roughness={0.15} />
        </mesh>
        {/* Top dome — aerodynamic cover */}
        <mesh position={[0, 0.038, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Carbon color="#1e2128" roughness={0.12} />
        </mesh>
        {/* Bottom plate — PCB/electronics cover */}
        <mesh position={[0, -0.018, 0]}>
          <boxGeometry args={[0.16, 0.006, 0.16]} />
          <meshStandardMaterial color="#0d0f14" metalness={0.2} roughness={0.7} />
        </mesh>

        {/* Battery pack — prominent belly */}
        <mesh position={[0, -0.035, 0]} castShadow>
          <boxGeometry args={[0.09, 0.03, 0.11]} />
          <meshStandardMaterial color="#15181f" metalness={0.15} roughness={0.75} />
        </mesh>
        {/* Battery LED strip */}
        {[-0.025, 0, 0.025].map((z, i) => (
          <mesh key={i} position={[0.047, -0.032, z]}>
            <boxGeometry args={[0.004, 0.004, 0.015]} />
            <Glow color={i < 2 ? "#00d4aa" : "#f0a500"} intensity={0.5} />
          </mesh>
        ))}

        {/* Camera gimbal assembly — realistic */}
        <group position={[0, -0.055, 0.05]}>
          {/* Gimbal Y-bracket */}
          <mesh>
            <boxGeometry args={[0.05, 0.025, 0.035]} />
            <Carbon color="#1a1d24" />
          </mesh>
          {/* Camera body */}
          <mesh position={[0, -0.015, 0.005]}>
            <boxGeometry args={[0.03, 0.022, 0.024]} />
            <meshStandardMaterial color="#0a0c12" metalness={0.6} roughness={0.15} />
          </mesh>
          {/* Camera lens barrel */}
          <mesh position={[0, -0.015, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.008, 14]} />
            <meshStandardMaterial color="#050608" metalness={0.95} roughness={0.05} />
          </mesh>
          {/* Lens glass */}
          <mesh position={[0, -0.015, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.003, 14]} />
            <meshStandardMaterial color="#1a3050" emissive="#0984e3" emissiveIntensity={0.15} metalness={0.2} roughness={0.05} transparent opacity={0.85} />
          </mesh>
        </group>

        {/* GPS/antenna mast */}
        <mesh position={[0, 0.06, -0.02]}>
          <cylinderGeometry args={[0.022, 0.022, 0.014, 12]} />
          <Carbon color="#282c34" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.075, -0.02]}>
          <cylinderGeometry args={[0.004, 0.004, 0.022, 6]} />
          <meshStandardMaterial color="#4a4e58" metalness={0.8} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.088, -0.02]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshStandardMaterial color="#4a4e58" metalness={0.8} roughness={0.15} />
        </mesh>

        {/* Front status LED */}
        <mesh ref={ledRef} position={[0, 0.012, 0.092]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshStandardMaterial color="#00d4aa" emissive="#00d4aa" emissiveIntensity={0.6} />
        </mesh>
        {/* Rear warning LED */}
        <mesh ref={rearLedRef} position={[0, 0.012, -0.092]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.4} />
        </mesh>

        {/* Side accent strips — teal glow lines */}
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * 0.09, 0.015, 0]}>
            <boxGeometry args={[0.003, 0.003, 0.12]} />
            <Glow color="#00d4aa" intensity={0.2} />
          </mesh>
        ))}

        {/* Arms and rotors */}
        {armPositions.map((pos, i) => (
          <group key={i}>
            <MotorArm from={[0, 0, 0]} to={pos} />
            {/* Motor guard ring — protective */}
            <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.005, 8, 28]} />
              <meshStandardMaterial color="#1a2030" metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Guard support spokes */}
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, j) => (
              <mesh key={j} position={[
                pos[0] + Math.cos(angle) * 0.1,
                pos[1],
                pos[2] + Math.sin(angle) * 0.1,
              ]}>
                <boxGeometry args={[0.004, 0.008, 0.004]} />
                <Carbon />
              </mesh>
            ))}
            <Rotor position={pos} spin={i % 2 === 0 ? 1 : -1} thrust={thrust} />
          </group>
        ))}

        {/* Landing gear */}
        <LandingGearAssembly />

        {/* Thrust vectors */}
        {showThrust && armPositions.map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1] - 0.06 - thrust * 0.02, pos[2]]}>
            <coneGeometry args={[0.035, thrust * 0.18 + 0.06, 8]} />
            <meshBasicMaterial color="#f0a500" transparent opacity={0.18} />
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
        <TooltipHotspot position={[0.3, 0.06, 0.3]} label="Brushless Motor" explanation="Each rotor is driven by a 2300KV brushless DC motor. Differential thrust between rotors controls roll, pitch, and yaw at 400Hz update rate." color="#00d4aa" />
        <TooltipHotspot position={[0, 0.1, 0]} label="Flight Controller" explanation="F7 flight controller runs PID stabilization at 8kHz. Fuses IMU, barometer, and GPS data for precise attitude and position hold." color="#0984e3" />
        <TooltipHotspot position={[0, -0.08, 0.05]} label="Camera Gimbal" explanation="3-axis brushless gimbal stabilizes the camera, compensating for drone movement to deliver smooth, steady footage during flight." color="#6c5ce7" />
      </group>
    </group>
  );
};

export const DroneSceneLighting = () => (
  <>
    <directionalLight position={[4, 9, 4]} intensity={1.2} castShadow color="#faf8f5"
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} />
    <directionalLight position={[-4, 5, -3]} intensity={0.4} color="#b8cce8" />
    <directionalLight position={[0, 2, -4]} intensity={0.35} color="#00d4aa" />
    <pointLight position={[0, 3, 0]} intensity={0.3} color="#00d4aa" />
    <hemisphereLight groundColor="#080a10" color="#1a2a3a" intensity={0.5} />
    <ambientLight intensity={0.18} color="#c8d0e0" />
  </>
);
