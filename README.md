# RoboSimLab

**Professional-grade interactive robotics simulation and education platform running entirely in the browser.**

Built with React, Three.js, TypeScript, and Tailwind CSS. Designed to Apple Human Interface standards with Boston Dynamics-style engineering visualization.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-browser-green)
![Modules](https://img.shields.io/badge/modules-26-brightgreen)
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

## 🧪 Simulation Modules (26)

### Core Robotics
| Module | Description |
|--------|-------------|
| **Robotic Arm Kinematics** | FK/IK, Jacobian, manipulability ellipsoid, DH params, trajectory trail |
| **Robot Dynamics & Torque** | Joint torque/velocity/energy charts, velocity vectors, coordinate frames |
| **Humanoid Balance** | 3D inverted pendulum with PD control, CoM tracking, cinematic camera |
| **Custom Robot Builder** | 1–7 DOF manipulators, configurable links, JSON export |
| **Trajectory Optimization** | Start/goal poses, cost minimization, collision avoidance |

### Planning & Navigation
| Module | Description |
|--------|-------------|
| **Motion Planning Studio** | A*, Dijkstra, RRT, PRM, Potential Field — step-by-step visualization |
| **Autonomous Navigation** | Waypoint following, obstacle avoidance, SLAM mapping |
| **Algorithm Comparison** | Side-by-side pathfinding analysis (A*, Dijkstra, BFS, RRT) |

### Perception & Sensors
| Module | Description |
|--------|-------------|
| **Sensor & Perception Lab** | Lidar raycasting, depth profiles, camera FOV |
| **Sensor Fusion Lab** | Lidar + Camera + IMU unified perception with confidence heatmap |
| **SLAM Exploration** | Frontier-based autonomous mapping with BFS pathfinding |

### Control & Multi-Agent
| Module | Description |
|--------|-------------|
| **PID Control Lab** | Tunable P/I/D gains, real-time response curves, CSV export |
| **Swarm Robotics** | 300-agent 3D boids with flocking dynamics |
| **Multi-Agent Coordination** | Nearest-first & priority auction task allocation |
| **Robot Teleoperation** | WASD keyboard control with lidar, minimap, collision HUD |

### AI & Learning
| Module | Description |
|--------|-------------|
| **RL Playground** | Q-learning grid world, policy visualization, reward curves |
| **Multi-Agent RL** | Cooperative Q-learning with shared Q-tables |

### Research Capabilities
| Module | Description |
|--------|-------------|
| **Differentiable Robotics** | Real-time Jacobian, singularity detection, manipulability/velocity ellipsoids |
| **SLAM Visualization** | Autonomous frontier exploration with laser scanning, occupancy grid |
| **RL Policy Introspection** | Policy entropy, state visitation heatmap, success rate dashboard |
| **Sim-to-Real Gap** | Ideal vs noisy trajectory comparison with configurable noise/delay |
| **Neural Policy Brain** | Neural network visualization with activations and signal flow |

### Digital Twin Lab
| Module | Description |
|--------|-------------|
| **Digital Twin Builder** | Modular robot assembly with links, joints, sensors, mass distribution |
| **Control Architecture** | Visual sensor→perception→planning→control→actuator pipeline |
| **Robot Task Designer** | Custom task design with goals, obstacles, reward fields |
| **Digital Twin Dashboard** | Real-time monitoring of torques, velocities, energy |

---

## 🎓 Learning Mode

Every simulation module includes a **Learning Mode** toggle in the header that transforms the simulator into an educational robotics lab:

- **Education Panels** — Concept explanations, formulas, key points, and practical tips
- **Contextual Hints** — Interactive tooltips that appear during specific interactions
- **Visual Overlays** — Debug frames, manipulability ellipsoids, velocity vectors

Topics covered: robot kinematics, dynamics, PID control, reinforcement learning, SLAM, sensor fusion, and more.

---

## 🤖 Robot Visual Design

Robot models feature engineering-grade mechanical detail:

- **Links** — Structural tubes with bolt rings, cable channels, and actuator housings
- **Joints** — Rotation indicator rings, axis markers, encoder rings, sensor mounts
- **End Effectors** — Gripper fingers with contact pads and tool center point
- **Humanoid** — Camera lens, depth sensor, ventilation grille, structural ribbing

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── 3d/                # Three.js robot models (RobotArm3D, Humanoid3D)
│   ├── ui/                # shadcn/ui component library
│   ├── SimLayout.tsx      # Shared layout with Learning Mode context
│   ├── ControlSection.tsx # Collapsible control panel
│   ├── SliderControl.tsx  # Apple-style parameter slider
│   ├── EducationPanel.tsx # Educational content panel + ContextHint
│   ├── LearningModeToggle.tsx # Learning mode header toggle
│   ├── ErrorBoundary.tsx  # Crash recovery wrapper
│   └── DataExport.tsx     # CSV export utility
├── pages/                 # 26 simulation module pages
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

See [roadmap.md](./roadmap.md) for detailed phase-by-phase progress tracking (9 phases, all complete).

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
