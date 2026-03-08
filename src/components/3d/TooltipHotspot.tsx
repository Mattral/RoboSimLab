import { useState, useRef } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface TooltipHotspotProps {
  position: [number, number, number];
  label: string;
  explanation: string;
  color?: string;
  size?: number;
}

/**
 * 3D hover tooltip — small glowing hotspot that reveals an educational explanation on hover.
 * Uses drei's Html for crisp 2D overlay anchored to 3D space.
 */
const TooltipHotspot = ({ position, label, explanation, color = "#00d4aa", size = 0.025 }: TooltipHotspotProps) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      {/* Hotspot ring — always visible */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={hovered ? 1 : 0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {/* Pulse ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 1.8, size * 0.15, 6, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.5 : 0.15} />
      </mesh>

      {/* HTML tooltip overlay */}
      {hovered && (
        <Html
          center
          distanceFactor={6}
          style={{ pointerEvents: "none", userSelect: "none" }}
          position={[0, size * 6, 0]}
        >
          <div
            style={{
              background: "hsla(225, 16%, 6%, 0.92)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${color}33`,
              borderRadius: "10px",
              padding: "10px 14px",
              maxWidth: "220px",
              minWidth: "160px",
              boxShadow: `0 4px 20px ${color}15`,
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "5px",
            }}>
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
              }} />
              <span style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: color,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}>
                {label}
              </span>
            </div>
            <p style={{
              fontSize: "11px",
              lineHeight: "1.5",
              color: "hsl(220, 15%, 72%)",
              margin: 0,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              {explanation}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
};

export default TooltipHotspot;
