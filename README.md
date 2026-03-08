# RoboSimLab

**Professional-grade interactive robotics simulation platform running entirely in the browser.**

Built with React, Three.js, TypeScript, and Tailwind CSS. Designed to Apple Human Interface standards with Boston Dynamics-style engineering visualization.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-browser-green)
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

## 🧪 Simulation Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Robotic Arm Kinematics** | FK/IK, Jacobian, manipulability ellipsoid, DH params, debug overlays, trajectory trail | ✅ |
| **Motion Planning Studio** | A*, Dijkstra, RRT, PRM, Potential Field — step-by-step visualization | ✅ |
| **PID Control Lab** | Tunable P/I/D gains, real-time response curves, CSV export | ✅ |
| **Swarm Robotics** | 300-agent 3D boids with flocking, separation, alignment, cohesion | ✅ |
| **Humanoid Balance** | 3D inverted pendulum with PD control, CoM tracking, cinematic camera | ✅ |
| **Autonomous Navigation** | Waypoint following, obstacle avoidance, SLAM mapping | ✅ |
| **Sensor & Perception Lab** | Lidar raycasting, depth profiles, camera FOV | ✅ |
| **RL Playground** | Q-learning grid world, policy visualization, reward curves | ✅ |
| **Robot Dynamics & Torque** | Joint torque/velocity/energy charts, velocity vectors, coordinate frames | ✅ |
| **Multi-Agent Coordination** | Nearest-first & priority auction task allocation | ✅ |
| **Custom Robot Builder** | 1–7 DOF manipulators, configurable links, JSON export | ✅ |
| **Trajectory Optimization** | Start/goal poses, cost minimization, collision avoidance, animated playback | ✅ |

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── 3d/              # Three.js robot models (RobotArm3D, Humanoid3D)
│   ├── ui/              # shadcn/ui component library
│   ├── SimLayout.tsx    # Shared simulation page layout
│   ├── ControlSection.tsx # Collapsible control panel
│   ├── SliderControl.tsx  # Apple-style parameter slider
│   └── DataExport.tsx   # CSV export utility
├── pages/               # Simulation module pages
├── hooks/               # Custom React hooks
├── lib/                 # Utilities
└── index.css            # Design system tokens
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

Full deployment documentation with production-ready configurations:

| Guide | Description |
|-------|-------------|
| [🐳 Docker](./docs/docker.md) | Multi-stage builds, Docker Compose, Nginx config, image optimization |
| [☸️ Kubernetes](./docs/kubernetes.md) | Deployment, Service, Ingress, HPA, TLS, production checklist |
| [⚙️ CI/CD](./docs/ci-cd.md) | GitHub Actions — lint, test, build, Docker push, K8s deploy, releases |
| [🏗️ Architecture](./docs/architecture.md) | Simulation engine, kinematics, control systems, component API |

### Quick Deploy with Docker

```bash
docker build -t robosimlab .
docker run -d -p 8080:80 robosimlab
```

### Quick Deploy with Docker Compose

```bash
docker compose up -d
```

---

## 📋 Roadmap

See [roadmap.md](./roadmap.md) for detailed phase-by-phase progress tracking.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
