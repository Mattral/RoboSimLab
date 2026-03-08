# RoboSimLab

**Professional-grade interactive robotics simulation platform running entirely in the browser.**

Built with React, Three.js, TypeScript, and Tailwind CSS. Designed to Apple Human Interface standards with Boston Dynamics-style engineering visualization.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-browser-green)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🧪 Simulation Modules

| Module | Description | Phase |
|--------|-------------|-------|
| **Robotic Arm Kinematics** | FK/IK, Jacobian, manipulability ellipsoid, DH params, debug overlays, trajectory trail | 2 |
| **Motion Planning Studio** | A*, Dijkstra, RRT, PRM, Potential Field with step-by-step visualization | 2 |
| **PID Control Lab** | Tunable P/I/D gains, real-time response curves, CSV export | 2 |
| **Swarm Robotics** | 300-agent 3D boids with flocking, separation, alignment, cohesion | 2 |
| **Humanoid Balance** | 3D inverted pendulum with PD control, CoM tracking | 4 |
| **Autonomous Navigation** | Waypoint following, obstacle avoidance, SLAM mapping | 4 |
| **Sensor & Perception Lab** | Lidar raycasting, depth profiles, camera FOV | 3 |
| **RL Playground** | Q-learning grid world, policy visualization, reward curves | 5 |
| **Robot Dynamics & Torque** | Joint torque/velocity/energy charts, velocity vector arrows, debug overlays | 4 |
| **Multi-Agent Coordination** | Nearest-first & priority auction task allocation | 4 |
| **Custom Robot Builder** | 1–7 DOF manipulators, configurable links, JSON export | 4 |
| **Trajectory Optimization** | Start/goal poses, cost minimization, collision avoidance, animated playback | 6 |

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

## 🐳 Docker

### Development

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Production

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  robosimlab:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Build & Run

```bash
docker build -t robosimlab .
docker run -p 8080:80 robosimlab
```

---

## ☸️ Kubernetes

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: robosimlab
  labels:
    app: robosimlab
spec:
  replicas: 3
  selector:
    matchLabels:
      app: robosimlab
  template:
    metadata:
      labels:
        app: robosimlab
    spec:
      containers:
        - name: robosimlab
          image: robosimlab:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: robosimlab-service
spec:
  selector:
    app: robosimlab
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: robosimlab-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: robosimlab.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: robosimlab-service
                port:
                  number: 80
```

### Deploy Commands

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl get pods -l app=robosimlab
kubectl scale deployment robosimlab --replicas=5
```

---

## ⚙️ GitHub Actions CI/CD

### `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test -- --run

  docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      - run: kubectl rollout restart deployment/robosimlab
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Three.js / R3F** | 3D rendering |
| **Tailwind CSS** | Styling / design tokens |
| **Vite** | Build tooling |
| **Vitest** | Testing |
| **shadcn/ui** | Component library |
| **Zustand** | State management |
| **Recharts** | Data visualization |

---

## 📋 Roadmap

See [roadmap.md](./roadmap.md) for detailed phase-by-phase progress tracking.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
