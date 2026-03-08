# RoboSimLab — Development Roadmap

## ✅ Completed

- [x] **Design System** — Dark research-lab theme with cyan/green accents, JetBrains Mono, semantic tokens
- [x] **Simulation Gallery** — Central hub with all 10 module cards, status badges, navigation
- [x] **PID Control Lab** — Real-time second-order system, tunable P/I/D gains, response curves, error/overshoot metrics
- [x] **Robotic Arm Kinematics Lab** — 3-DOF planar arm, forward/inverse kinematics, workspace visualization, coordinate frames, IK drag targeting
- [x] **Swarm Robotics Simulator** — Boids flocking (separation/alignment/cohesion), velocity vectors, perception radius, up to 200 agents
- [x] **Motion Planning Studio** — A* pathfinding + RRT algorithm, drawable obstacle grid, animated algorithm exploration, path visualization
- [x] **Sensor & Perception Lab** — Lidar raycasting, depth profile, camera FOV cone, SLAM-style environment mapping, draggable robot
- [x] **Humanoid Balance Simulator** — Inverted pendulum dynamics, PD balance control, CoM visualization, support polygon, disturbance forces, angle/torque charts
- [x] **RL Playground** — Q-learning grid world, epsilon-greedy exploration, policy arrows, Q-value heatmap, episode reward learning curve
- [x] **RRT Algorithm** — Added Rapidly-exploring Random Trees to Motion Planning Studio with step size & iteration controls
- [x] **Shared Components** — SimLayout, SliderControl, ControlSection reusable UI primitives

## 🔲 Outstanding

- [ ] **Autonomous Navigation Environment** — SLAM-based mapping, autonomous path following, dynamic obstacles
- [ ] **Robot Dynamics & Torque Simulator** — Joint torque, velocity, acceleration, energy propagation
- [ ] **Multi-Agent Coordination** — Distributed task allocation, consensus algorithms, cooperative planning
- [ ] **Potential Field Navigation** — Add potential field method to Motion Planning Studio
- [ ] **Probabilistic Roadmaps** — Add PRM algorithm to Motion Planning Studio
- [ ] **3D Visualization** — Migrate select modules to Three.js with orbit/pan/zoom, shadows, depth cues
- [ ] **Manipulability Ellipsoids** — Visualize dexterity at arm end-effector
- [ ] **Transformation Matrices Panel** — Display DH parameters, homogeneous transforms per joint
- [ ] **Scientific Plot Export** — Allow exporting time-series data as CSV or images
