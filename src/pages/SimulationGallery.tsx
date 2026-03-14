import { useNavigate } from "react-router-dom";
import {
  Cpu, Route, SlidersHorizontal, Users, PersonStanding, Navigation,
  Eye, Brain, Zap, Network, Wrench, ArrowRight, Sparkles, Activity, GitBranch,
  Layers, Map, Bot, Gamepad2, GitCompareArrows, Sigma, Radar, Search, Shuffle, CircuitBoard,
  Blocks, Workflow, Target, BarChart3, Dog, Plane, Worm
} from "lucide-react";

// Gallery images
import droneImg from "@/assets/gallery/drone.jpg";
import humanoidImg from "@/assets/gallery/humanoid.jpg";
import quadrupedImg from "@/assets/gallery/quadruped.jpg";
import armImg from "@/assets/gallery/arm.jpg";
import softRobotImg from "@/assets/gallery/soft-robot.jpg";
import swarmImg from "@/assets/gallery/swarm.jpg";
import navigationImg from "@/assets/gallery/navigation.jpg";
import controlImg from "@/assets/gallery/control.jpg";
import aiImg from "@/assets/gallery/ai.jpg";
import digitalTwinImg from "@/assets/gallery/digital-twin.jpg";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  tags: string[];
  image?: string;
}

interface LabSection {
  title: string;
  description: string;
  color: string;
  modules: ModuleCard[];
}

const labs: LabSection[] = [
  {
    title: "Locomotion Lab",
    description: "Balance, gaits, and dynamic walking",
    color: "hsl(172, 78%, 47%)",
    modules: [
      {
        id: "quadruped",
        title: "Quadruped Robot",
        description: "Walking & trotting gaits, center of mass, support polygon, footstep planning, disturbance recovery",
        icon: Dog,
        color: "hsl(172, 78%, 47%)",
        route: "/sim/quadruped",
        tags: ["3D", "Gait", "NEW"],
        image: quadrupedImg,
      },
      {
        id: "humanoid-balance",
        title: "Humanoid Balance",
        description: "3D humanoid with inverted pendulum dynamics, CoM tracking, and PD stabilization control",
        icon: PersonStanding,
        color: "hsl(0, 62%, 50%)",
        route: "/sim/humanoid-balance",
        tags: ["3D", "Physics"],
        image: humanoidImg,
      },
      {
        id: "swarm",
        title: "Swarm Robotics",
        description: "300-agent 3D boids with separation, alignment, cohesion dynamics and orbit camera",
        icon: Users,
        color: "hsl(268, 58%, 52%)",
        route: "/sim/swarm",
        tags: ["3D", "Boids"],
        image: swarmImg,
      },
    ],
  },
  {
    title: "Manipulation Lab",
    description: "Kinematics, trajectory, and object interaction",
    color: "hsl(212, 78%, 52%)",
    modules: [
      {
        id: "arm-kinematics",
        title: "Robotic Arm Kinematics",
        description: "Forward & inverse kinematics with Jacobian analysis, manipulability ellipsoids, and DH parameters",
        icon: Cpu,
        color: "hsl(172, 78%, 47%)",
        route: "/sim/arm-kinematics",
        tags: ["3D", "FK/IK", "Jacobian"],
        image: armImg,
      },
      {
        id: "soft-robot",
        title: "Soft Robot Lab",
        description: "Deformable pneumatic robot with chamber pressure control, continuum mechanics, and shape presets",
        icon: Worm,
        color: "hsl(268, 58%, 52%)",
        route: "/sim/soft-robot",
        tags: ["3D", "Soft", "NEW"],
        image: softRobotImg,
      },
      {
        id: "dynamics",
        title: "Robot Dynamics & Torque",
        description: "3D arm with joint torque, velocity, acceleration, and total energy propagation analysis",
        icon: Zap,
        color: "hsl(15, 78%, 52%)",
        route: "/sim/dynamics",
        tags: ["3D", "Dynamics"],
        image: armImg,
      },
      {
        id: "trajectory-optimization",
        title: "Trajectory Optimization",
        description: "Define start/goal poses, optimize trajectories with cost minimization and collision avoidance",
        icon: GitBranch,
        color: "hsl(292, 58%, 50%)",
        route: "/sim/trajectory-optimization",
        tags: ["3D", "Optimize"],
        image: armImg,
      },
      {
        id: "differentiable-robotics",
        title: "Differentiable Robotics",
        description: "Real-time Jacobian, manipulability ellipsoid, singularity detection, and joint sensitivity visualization",
        icon: Sigma,
        color: "hsl(20, 75%, 55%)",
        route: "/sim/differentiable-robotics",
        tags: ["Jacobian", "Research"],
      },
      {
        id: "robot-builder",
        title: "Custom Robot Builder",
        description: "Design 1–7 DOF manipulators with configurable link geometry and JSON export",
        icon: Wrench,
        color: "hsl(32, 78%, 48%)",
        route: "/sim/robot-builder",
        tags: ["3D", "Builder"],
      },
    ],
  },
  {
    title: "Autonomy Lab",
    description: "Navigation, perception, and SLAM",
    color: "hsl(38, 88%, 52%)",
    modules: [
      {
        id: "drone",
        title: "Drone Simulator",
        description: "Quadcopter attitude control with thrust vectors, roll/pitch/yaw, waypoint navigation",
        icon: Plane,
        color: "hsl(38, 88%, 52%)",
        route: "/sim/drone",
        tags: ["3D", "PID", "NEW"],
        image: droneImg,
      },
      {
        id: "navigation",
        title: "Autonomous Navigation",
        description: "Waypoint following with reactive obstacle avoidance and real-time SLAM-style mapping",
        icon: Navigation,
        color: "hsl(212, 78%, 52%)",
        route: "/sim/navigation",
        tags: ["SLAM", "Autonomy"],
        image: navigationImg,
      },
      {
        id: "slam-exploration",
        title: "SLAM Exploration",
        description: "Frontier-based autonomous mapping — a robot explores unknown environments using BFS pathfinding",
        icon: Map,
        color: "hsl(200, 70%, 50%)",
        route: "/sim/slam-exploration",
        tags: ["SLAM", "Autonomy"],
        image: navigationImg,
      },
      {
        id: "slam-visualization",
        title: "SLAM Visualization",
        description: "Autonomous frontier-based exploration with laser scanning, occupancy grid mapping, and pose estimation",
        icon: Radar,
        color: "hsl(190, 70%, 48%)",
        route: "/sim/slam-visualization",
        tags: ["SLAM", "Mapping"],
        image: navigationImg,
      },
      {
        id: "perception",
        title: "Sensor & Perception Lab",
        description: "Lidar raycasting, depth profiling, camera FOV simulation, and environment mapping",
        icon: Eye,
        color: "hsl(322, 58%, 52%)",
        route: "/sim/perception",
        tags: ["Lidar", "SLAM"],
        image: navigationImg,
      },
      {
        id: "sensor-fusion",
        title: "Sensor Fusion Lab",
        description: "Combine lidar, camera, and IMU data into a unified perception map with confidence visualization",
        icon: Layers,
        color: "hsl(150, 70%, 45%)",
        route: "/sim/sensor-fusion",
        tags: ["Fusion", "Perception"],
      },
      {
        id: "teleoperation",
        title: "Robot Teleoperation",
        description: "Drive a robot with WASD keyboard controls through obstacle courses with real-time lidar and minimap",
        icon: Gamepad2,
        color: "hsl(340, 65%, 52%)",
        route: "/sim/teleoperation",
        tags: ["WASD", "Interactive"],
      },
    ],
  },
  {
    title: "Control Systems",
    description: "PID, planning algorithms, and architecture",
    color: "hsl(152, 68%, 42%)",
    modules: [
      {
        id: "pid-control",
        title: "PID Control Lab",
        description: "Classical control with real-time response curves, overshoot analysis, and CSV data export",
        icon: SlidersHorizontal,
        color: "hsl(38, 88%, 52%)",
        route: "/sim/pid-control",
        tags: ["Control", "Export"],
        image: controlImg,
      },
      {
        id: "motion-planning",
        title: "Motion Planning Studio",
        description: "A*, RRT, Dijkstra & Potential Field pathfinding with drawable obstacles and step-by-step visualization",
        icon: Route,
        color: "hsl(152, 68%, 42%)",
        route: "/sim/motion-planning",
        tags: ["A*", "RRT", "Dijkstra"],
        image: controlImg,
      },
      {
        id: "algorithm-comparison",
        title: "Algorithm Comparison",
        description: "Run two pathfinding algorithms side-by-side on the same maze for direct performance analysis",
        icon: GitCompareArrows,
        color: "hsl(45, 80%, 50%)",
        route: "/sim/algorithm-comparison",
        tags: ["Compare", "Analysis"],
      },
      {
        id: "control-architecture",
        title: "Control Architecture",
        description: "Visualize the sensor→perception→planning→control→actuator pipeline with real-time data flow",
        icon: Workflow,
        color: "hsl(220, 70%, 55%)",
        route: "/sim/control-architecture",
        tags: ["Pipeline", "System"],
      },
      {
        id: "multi-agent",
        title: "Multi-Agent Coordination",
        description: "Distributed task allocation with nearest-first and priority auction strategies",
        icon: Network,
        color: "hsl(192, 68%, 48%)",
        route: "/sim/multi-agent",
        tags: ["Multi-Agent"],
      },
    ],
  },
  {
    title: "AI & Learning",
    description: "Reinforcement learning and neural policies",
    color: "hsl(268, 58%, 52%)",
    modules: [
      {
        id: "rl-playground",
        title: "RL Playground",
        description: "Q-learning grid world with policy arrows, value heatmaps, and learning curve analytics",
        icon: Brain,
        color: "hsl(48, 78%, 48%)",
        route: "/sim/rl-playground",
        tags: ["AI", "Q-Learn"],
        image: aiImg,
      },
      {
        id: "multi-agent-rl",
        title: "Multi-Agent RL",
        description: "Swarm agents learn cooperative task completion through shared Q-tables and reward shaping",
        icon: Bot,
        color: "hsl(280, 60%, 55%)",
        route: "/sim/multi-agent-rl",
        tags: ["AI", "MARL"],
        image: aiImg,
      },
      {
        id: "rl-introspection",
        title: "RL Policy Introspection",
        description: "Deep Q-learning analysis with policy entropy, state visitation heatmap, value landscape, and success tracking",
        icon: Search,
        color: "hsl(310, 55%, 50%)",
        route: "/sim/rl-introspection",
        tags: ["AI", "Entropy"],
      },
      {
        id: "neural-policy",
        title: "Neural Policy Brain",
        description: "Visualize neural network decision-making with real-time activations, signal flow, and weight connections",
        icon: CircuitBoard,
        color: "hsl(260, 65%, 55%)",
        route: "/sim/neural-policy",
        tags: ["Neural", "AI"],
        image: aiImg,
      },
      {
        id: "sim-to-real",
        title: "Sim-to-Real Gap",
        description: "Compare ideal vs noisy robot behavior with configurable sensor noise, actuator delay, and domain randomization",
        icon: Shuffle,
        color: "hsl(355, 65%, 50%)",
        route: "/sim/sim-to-real",
        tags: ["Realism", "Research"],
      },
    ],
  },
  {
    title: "Digital Twin Lab",
    description: "Build, monitor, and design robot tasks",
    color: "hsl(28, 80%, 52%)",
    modules: [
      {
        id: "digital-twin-builder",
        title: "Digital Twin Builder",
        description: "Assemble modular robots from links, joints, and sensors with configurable mass and geometry",
        icon: Blocks,
        color: "hsl(170, 65%, 45%)",
        route: "/sim/digital-twin-builder",
        tags: ["Builder", "Twin"],
        image: digitalTwinImg,
      },
      {
        id: "digital-twin-dashboard",
        title: "Digital Twin Dashboard",
        description: "Real-time monitoring of joint torques, velocities, energy consumption, and controller output",
        icon: BarChart3,
        color: "hsl(28, 80%, 52%)",
        route: "/sim/digital-twin-dashboard",
        tags: ["Monitor", "Telemetry"],
        image: digitalTwinImg,
      },
      {
        id: "task-designer",
        title: "Robot Task Designer",
        description: "Design custom robot tasks with goal positions, obstacles, reward fields, and gradient navigation",
        icon: Target,
        color: "hsl(135, 60%, 42%)",
        route: "/sim/task-designer",
        tags: ["Tasks", "Design"],
      },
    ],
  },
];

const totalModules = labs.reduce((acc, lab) => acc + lab.modules.length, 0);

const SimulationGallery = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background page-enter relative noise-overlay">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse, hsl(172, 78%, 47%), transparent 70%)' }} />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 px-4 sm:px-6 py-3 glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                RoboSim<span className="text-primary">Lab</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-[0.08em] hidden sm:block">Multi-Robot Research Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono bg-secondary/30 px-3 py-1.5 rounded-md border border-border/30">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-foreground font-semibold">{totalModules}</span> modules
            </div>
            <div className="flex items-center gap-2">
              <div className="status-indicator bg-primary" style={{ color: "hsl(172, 78%, 47%)" }} />
              <span className="text-[10px] text-muted-foreground font-mono tracking-[0.15em]">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-primary tracking-[0.2em] uppercase">Multi-Robot Research Platform</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 leading-[1.05]">
          Explore Robotics,<br />
          <span className="shimmer-text">Interactively.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
          A professional-grade robotics research environment with {labs.length} labs covering locomotion, manipulation, autonomy, and AI. Select any module to begin.
        </p>
      </div>

      {/* Lab Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-20 space-y-12">
        {labs.map((lab) => (
          <section key={lab.title}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: lab.color }} />
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">{lab.title}</h3>
                <p className="text-[11px] text-muted-foreground">{lab.description}</p>
              </div>
              <div className="ml-auto text-[9px] font-mono text-muted-foreground/60 bg-secondary/30 px-2 py-1 rounded">
                {lab.modules.length} modules
              </div>
            </div>

            {/* Module grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lab.modules.map((mod) => {
                const Icon = mod.icon;
                const isNew = mod.tags.includes("NEW");
                return (
                  <button
                    key={mod.id}
                    onClick={() => navigate(mod.route)}
                    className="sim-panel card-lift text-left group relative overflow-hidden cursor-pointer"
                  >
                    {/* Thumbnail image */}
                    {mod.image && (
                      <div className="relative h-32 sm:h-36 overflow-hidden rounded-t-xl">
                        <img
                          src={mod.image}
                          alt={mod.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                        {/* New badge on image */}
                        {isNew && (
                          <div className="absolute top-2.5 right-2.5 text-[8px] font-bold tracking-wider text-background px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: mod.color }}>
                            NEW
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 pt-3">
                      {/* New badge (no image variant) */}
                      {isNew && !mod.image && (
                        <div className="absolute top-3 right-3 text-[8px] font-bold tracking-wider text-background px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: mod.color }}>
                          NEW
                        </div>
                      )}

                      {/* Gradient overlay on hover */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: `radial-gradient(ellipse at top left, ${mod.color.replace(')', ', 0.08)')} 0%, transparent 60%)`,
                        }}
                      />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-350 group-hover:scale-110 group-hover:shadow-lg"
                            style={{
                              backgroundColor: mod.color.replace(')', ', 0.1)'),
                              color: mod.color,
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex gap-1">
                            {mod.tags.filter(t => t !== "NEW").map(tag => (
                              <span key={tag} className="text-[8px] font-mono uppercase tracking-[0.1em] text-muted-foreground/70 bg-secondary/40 rounded px-1.5 py-0.5 border border-border/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 text-[13px] tracking-tight">{mod.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{mod.description}</p>

                        <div className="flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                          <span>Launch module</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom accent */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                      style={{ background: `linear-gradient(90deg, ${mod.color}, transparent 80%)` }}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span className="tracking-wide">RoboSimLab — Browser-based Multi-Robot Research Platform</span>
          <span className="font-mono tracking-wider">v6.0</span>
        </div>
      </footer>
    </div>
  );
};

export default SimulationGallery;
