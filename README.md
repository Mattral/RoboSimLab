# RoboSimLab

**Professional-grade multi-robot interactive simulation and education platform running entirely in the browser.**

Built with React, Three.js, TypeScript, and Tailwind CSS. Designed to Apple Human Interface standards with Boston Dynamics-style engineering visualization.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-browser-green)
![Modules](https://img.shields.io/badge/modules-29-brightgreen)
![Labs](https://img.shields.io/badge/labs-6-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Docker](https://img.shields.io/badge/docker-ready-blue)

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — that's it.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run test` | Run test suite |
| `npm run lint` | Lint with ESLint |

---

## 🧪 Simulation Labs (6 Labs · 29 Modules)

### 🦿 Locomotion Lab
| Module | Description |
|--------|-------------|
| **Quadruped Robot** 🆕 | Walking & trotting gaits, CoM stabilization, support polygon, footstep planning |
| **Humanoid Balance** | 3D inverted pendulum with PD control, CoM tracking, cinematic camera |
| **Swarm Robotics** | 300-agent 3D boids with flocking dynamics |

### 🦾 Manipulation Lab
| Module | Description |
|--------|-------------|
| **Robotic Arm Kinematics** | FK/IK, Jacobian, manipulability ellipsoid, DH params, trajectory trail |
| **Soft Robot Lab** 🆕 | Pneumatic chamber control, deformable body, continuum mechanics |
| **Robot Dynamics & Torque** | Joint torque/velocity/energy charts, velocity vectors, coordinate frames |
| **Trajectory Optimization** | Start/goal poses, cost minimization, collision avoidance |
| **Differentiable Robotics** | Real-time Jacobian, singularity detection, manipulability ellipsoids |
| **Custom Robot Builder** | 1–7 DOF manipulators, configurable links, JSON export |

### 🚁 Autonomy Lab
| Module | Description |
|--------|-------------|
| **Drone Simulator** 🆕 | Quadcopter attitude control, thrust vectors, waypoint navigation |
| **Autonomous Navigation** | Waypoint following, obstacle avoidance, SLAM mapping |
| **SLAM Exploration** | Frontier-based autonomous mapping with BFS pathfinding |
| **SLAM Visualization** | Autonomous exploration with laser scanning, occupancy grid |
| **Sensor & Perception Lab** | Lidar raycasting, depth profiles, camera FOV |
| **Sensor Fusion Lab** | Lidar + Camera + IMU unified perception with confidence heatmap |
| **Robot Teleoperation** | WASD keyboard control with lidar, minimap, collision HUD |

### ⚙️ Control Systems
| Module | Description |
|--------|-------------|
| **PID Control Lab** | Tunable P/I/D gains, real-time response curves, CSV export |
| **Motion Planning Studio** | A*, Dijkstra, RRT, PRM, Potential Field — step-by-step visualization |
| **Algorithm Comparison** | Side-by-side pathfinding analysis |
| **Control Architecture** | Visual sensor→perception→planning→control→actuator pipeline |
| **Multi-Agent Coordination** | Nearest-first & priority auction task allocation |

### 🧠 AI & Learning
| Module | Description |
|--------|-------------|
| **RL Playground** | Q-learning grid world, policy visualization, reward curves |
| **Multi-Agent RL** | Cooperative Q-learning with shared Q-tables |
| **RL Policy Introspection** | Policy entropy, state visitation heatmap, success rate dashboard |
| **Neural Policy Brain** | Neural network visualization with activations and signal flow |
| **Sim-to-Real Gap** | Ideal vs noisy trajectory comparison with configurable noise/delay |

### 🏗️ Digital Twin Lab
| Module | Description |
|--------|-------------|
| **Digital Twin Builder** | Modular robot assembly with links, joints, sensors |
| **Digital Twin Dashboard** | Real-time monitoring of torques, velocities, energy |
| **Robot Task Designer** | Custom task design with goals, obstacles, reward fields |

---

## 🤖 Robot Types

| Robot | Lab | Key Concepts |
|-------|-----|-------------|
| **Quadruped** | Locomotion | Gaits, CoM, support polygon, disturbance recovery |
| **Humanoid** | Locomotion | Inverted pendulum, PD control, ZMP |
| **Robotic Arm** | Manipulation | FK/IK, Jacobian, DH parameters, workspace |
| **Soft Robot** | Manipulation | Pneumatic actuation, continuum mechanics, deformation |
| **Drone** | Autonomy | Attitude control, thrust vectors, waypoint nav |
| **Mobile Robot** | Autonomy | SLAM, path planning, obstacle avoidance |
| **Swarm** | Locomotion | Boids, flocking, formation control |

---

## 🎓 Learning Mode

Every simulation module includes a **Learning Mode** toggle that transforms the simulator into an educational robotics lab:

- **Education Panels** — Concept explanations, formulas, key points, and practical tips
- **3D Tooltip Hotspots** — Hover over joints, sensors, and actuators for inline explanations
- **Contextual Hints** — Interactive tooltips that appear during specific interactions
- **Focus Mode** — Cinematic robot inspection with subsystem labels
- **Visual Overlays** — Debug frames, manipulability ellipsoids, velocity vectors

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── 3d/                # Three.js models (RobotArm3D, Humanoid3D, Quadruped3D, Drone3D, SoftRobot3D)
│   ├── ui/                # shadcn/ui component library
│   ├── SimLayout.tsx      # Shared layout with Learning Mode context
│   ├── FocusMode.tsx      # Cinematic inspection overlay
│   ├── TelemetryPanel.tsx # Context-aware telemetry display
│   ├── EducationPanel.tsx # Educational content panel + ContextHint
│   ├── ControlSection.tsx # Collapsible control panel
│   ├── SliderControl.tsx  # Apple-style parameter slider
│   └── DataExport.tsx     # CSV export utility
├── pages/                 # 29 simulation module pages
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities
└── index.css              # Design system tokens
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Three.js / R3F** | 3D rendering |
| **Tailwind CSS** | Styling & design tokens |
| **Vite** | Build tooling |
| **Vitest** | Testing |
| **shadcn/ui** | Component library |
| **Zustand** | State management |
| **Recharts** | Data visualization |

---

## 📦 Deployment

| Guide | Description |
|-------|-------------|
| [🐳 Docker](./docs/docker.md) | Multi-stage builds, Docker Compose, Nginx config |
| [☸️ Kubernetes](./docs/kubernetes.md) | Deployment, Service, Ingress, HPA, TLS |
| [⚙️ CI/CD](./docs/ci-cd.md) | GitHub Actions — lint, test, build, Docker push |
| [🏗️ Architecture](./docs/architecture.md) | Simulation engine, kinematics, control systems |

### Quick Deploy

```bash
docker build -t robosimlab .
docker run -d -p 8080:80 robosimlab
```

---

## 📋 Roadmap

See [roadmap.md](./roadmap.md) for detailed phase-by-phase progress tracking (11 phases complete).

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
