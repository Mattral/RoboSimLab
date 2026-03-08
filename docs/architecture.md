# 🏗️ Architecture Guide

Internal documentation for RoboSimLab's simulation engine, component architecture, and robotics implementation details.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  SimulationGallery (/)                              │
│  ├── Module Card Grid                               │
│  └── Navigation (react-router-dom)                  │
├─────────────────────────────────────────────────────┤
│  SimLayout                                          │
│  ├── Header (glass-panel, navigation, status)       │
│  ├── ErrorBoundary (crash recovery)                 │
│  │   └── Module Canvas / 3D Scene                   │
│  └── Controls Sidebar                               │
│      ├── ControlSection (collapsible panels)        │
│      └── SliderControl (precision inputs)           │
├─────────────────────────────────────────────────────┤
│  Simulation Modules (26 modules)                    │
│  ├── Canvas-based (2D): PID, Motion Planning,       │
│  │   Swarm, Navigation, Perception, SLAM, RL,       │
│  │   Multi-Agent, Sensor Fusion, Teleoperation,     │
│  │   Algorithm Comparison, Multi-Agent RL,          │
│  │   Differentiable Robotics, SLAM Viz, RL Intro,   │
│  │   Sim-to-Real, Neural Policy, Digital Twin       │
│  │   Builder, Control Architecture, Task Designer,  │
│  │   Digital Twin Dashboard                         │
│  └── Three.js (3D): Arm Kinematics, Humanoid,      │
│      Robot Dynamics, Robot Builder, Trajectory Opt   │
└─────────────────────────────────────────────────────┘
```

---

## Module Categories

### 2D Canvas Modules
- Use `requestAnimationFrame` loop for rendering
- Handle DPR scaling manually: `canvas.width = container.clientWidth * dpr`
- Clean up animation frames and event listeners in `useEffect` return
- Pattern: `useRef` for mutable simulation state, `useState` for UI-bound parameters

### 3D Three.js Modules
- Use `@react-three/fiber` Canvas with `@react-three/drei` helpers
- `OrbitControls` for camera interaction
- `Suspense` fallback for loading states
- Custom geometry via `THREE.BufferGeometry` for performance

---

## Robotics Implementation

### Forward Kinematics (FK)
The arm kinematics module implements a 3-DOF planar arm using rotation-translation chain:

```
T = R(θ₁) · T(L₁) · R(θ₂) · T(L₂) · R(θ₃) · T(L₃)

End effector position:
  x = sin(θ₂) · L₂ + sin(θ₂ + θ₃) · L₃
  y = L₁ + cos(θ₂) · L₂ + cos(θ₂ + θ₃) · L₃
```

### Inverse Kinematics (IK)
Analytical 2-link IK with geometric solution:

```
cos(θ₃) = (d² - L₂² - L₃²) / (2·L₂·L₃)
θ₃ = acos(clamp(cos(θ₃), -1, 1))
θ₂ = atan2(tx, ty-L₁) - atan2(L₃·sin(θ₃), L₂+L₃·cos(θ₃))
```

### Jacobian Matrix
2×3 Jacobian mapping joint velocities to end-effector velocities:

```
J = ∂(x,y) / ∂(θ₁, θ₂, θ₃)
```

The manipulability measure `w = sqrt(det(J·Jᵀ))` indicates robot dexterity at the current configuration. Near singularities, `w → 0`.

### Manipulability Ellipsoid
Computed from eigenvalues of `J·Jᵀ`:
- `σ₁, σ₂` = sqrt of eigenvalues
- Ellipsoid axes scaled by singular values
- Orientation from eigenvector angle

### PID Control
Second-order system with PID controller:

```
u(t) = Kp·e(t) + Ki·∫e(τ)dτ + Kd·de/dt

System: m·a = u - damping·v
Integration: Euler method, dt = 16ms
Integral windup clamped to [-10, 10]
```

### Boid Flocking (Swarm)
Each agent computes three steering forces:
1. **Separation**: Repel from nearby agents within separation distance
2. **Alignment**: Match average velocity of neighbors
3. **Cohesion**: Steer toward center of mass of neighbors

Perception radius controls which agents are considered neighbors.

### Q-Learning (RL Playground / Multi-Agent RL)
- State: grid cell (x, y)
- Actions: 4 cardinal directions
- Update: `Q(s,a) += α·(r + γ·max Q(s',a') - Q(s,a))`
- Exploration: ε-greedy policy
- Multi-agent variant: shared Q-table with cooperation bonus

### SLAM Exploration
Frontier-based strategy:
1. Sensor reveals cells via raycasting
2. Frontier cells = free cells adjacent to unknown cells
3. BFS pathfinding to nearest frontier
4. Repeat until environment fully explored

### Sensor Fusion
Complementary filter combining:
- **Lidar**: High accuracy position data (confidence 0.9)
- **Camera**: Object detection with bounding boxes (confidence 0.7)
- **IMU**: Dead reckoning with drift noise
- Fusion alpha controls IMU drift correction rate

---

## Shared Component API

### SimLayout
```tsx
<SimLayout title="Module Name" subtitle="Short Description" controls={<ControlPanel />}>
  <SimulationCanvas />
</SimLayout>
```

### ControlSection
```tsx
<ControlSection title="Parameters" defaultOpen={true}>
  <SliderControl label="Speed" value={speed} min={0} max={10} step={0.1} onChange={setSpeed} color="hsl(...)" />
</ControlSection>
```

### SliderControl
- Automatically clamps values to [min, max]
- Determines decimal places from step size
- Includes aria-label for accessibility

### DataExport
```tsx
import { exportToCSV } from "@/components/DataExport";
exportToCSV(dataArray, "filename_prefix");
```
Generates timestamped CSV files from any array of objects.

### ErrorBoundary
Wraps simulation canvases in SimLayout. On crash:
1. Logs error to console
2. Shows recovery UI with "Restart Module" button
3. Resets error state to re-render the module

---

## Design System

All colors use HSL via CSS custom properties in `index.css`:
- `--primary: 172 78% 47%` (teal/cyan)
- `--background: 228 16% 5%` (near-black)
- `--foreground: 210 20% 93%` (off-white)
- Accent colors: `--cyan-glow`, `--green-glow`, `--amber-glow`, `--red-glow`

Components use semantic tokens (`text-primary`, `bg-secondary`, etc.) — never raw colors.

### Glass Panels
```css
.glass-panel {
  background: hsl(var(--glass));
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid hsl(var(--glass-border));
}
```

### Animations
- Page enter: spring curve `cubic-bezier(0.16, 1, 0.3, 1)`
- Card stagger: 30ms delay per card
- Status indicator: 3s breathing pulse
- Slider thumb: scale on hover/active

---

## Performance Notes

- Canvas modules use `requestAnimationFrame` with DPR-aware rendering
- Heavy computations (pathfinding, Q-table updates) run inside the animation loop at reduced tick rates
- Three.js modules use `Suspense` for lazy loading
- Swarm simulations cap at 300 agents for smooth frame rates
- Map point arrays have age-based cleanup to prevent memory growth
- Trail arrays capped at 500-2000 points depending on module
