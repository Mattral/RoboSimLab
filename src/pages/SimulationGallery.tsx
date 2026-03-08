import { useNavigate } from "react-router-dom";
import {
  Cpu, Route, SlidersHorizontal, Users, PersonStanding, Navigation,
  Eye, Brain, Zap, Network, Wrench, ArrowRight, Sparkles, Activity, GitBranch
} from "lucide-react";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  tags: string[];
}

const modules: ModuleCard[] = [
  {
    id: "arm-kinematics",
    title: "Robotic Arm Kinematics",
    description: "Forward & inverse kinematics with Jacobian analysis, manipulability ellipsoids, and DH parameters",
    icon: Cpu,
    color: "hsl(172, 78%, 47%)",
    route: "/sim/arm-kinematics",
    tags: ["3D", "FK/IK", "Jacobian"],
  },
  {
    id: "motion-planning",
    title: "Motion Planning Studio",
    description: "A*, RRT, Dijkstra & Potential Field pathfinding with drawable obstacles and step-by-step visualization",
    icon: Route,
    color: "hsl(152, 68%, 42%)",
    route: "/sim/motion-planning",
    tags: ["A*", "RRT", "Dijkstra"],
  },
  {
    id: "pid-control",
    title: "PID Control Lab",
    description: "Classical control with real-time response curves, overshoot analysis, and CSV data export",
    icon: SlidersHorizontal,
    color: "hsl(38, 88%, 52%)",
    route: "/sim/pid-control",
    tags: ["Control", "Export"],
  },
  {
    id: "swarm",
    title: "Swarm Robotics",
    description: "300-agent 3D boids with separation, alignment, cohesion dynamics and orbit camera",
    icon: Users,
    color: "hsl(268, 58%, 52%)",
    route: "/sim/swarm",
    tags: ["3D", "Boids"],
  },
  {
    id: "humanoid-balance",
    title: "Humanoid Balance",
    description: "3D humanoid with inverted pendulum dynamics, CoM tracking, and PD stabilization control",
    icon: PersonStanding,
    color: "hsl(0, 62%, 50%)",
    route: "/sim/humanoid-balance",
    tags: ["3D", "Physics"],
  },
  {
    id: "navigation",
    title: "Autonomous Navigation",
    description: "Waypoint following with reactive obstacle avoidance and real-time SLAM-style mapping",
    icon: Navigation,
    color: "hsl(212, 78%, 52%)",
    route: "/sim/navigation",
    tags: ["SLAM", "Autonomy"],
  },
  {
    id: "perception",
    title: "Sensor & Perception Lab",
    description: "Lidar raycasting, depth profiling, camera FOV simulation, and environment mapping",
    icon: Eye,
    color: "hsl(322, 58%, 52%)",
    route: "/sim/perception",
    tags: ["Lidar", "SLAM"],
  },
  {
    id: "rl-playground",
    title: "RL Playground",
    description: "Q-learning grid world with policy arrows, value heatmaps, and learning curve analytics",
    icon: Brain,
    color: "hsl(48, 78%, 48%)",
    route: "/sim/rl-playground",
    tags: ["AI", "Q-Learn"],
  },
  {
    id: "dynamics",
    title: "Robot Dynamics & Torque",
    description: "3D arm with joint torque, velocity, acceleration, and total energy propagation analysis",
    icon: Zap,
    color: "hsl(15, 78%, 52%)",
    route: "/sim/dynamics",
    tags: ["3D", "Dynamics"],
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
  {
    id: "robot-builder",
    title: "Custom Robot Builder",
    description: "Design 1–7 DOF manipulators with configurable link geometry and JSON export",
    icon: Wrench,
    color: "hsl(32, 78%, 48%)",
    route: "/sim/robot-builder",
    tags: ["3D", "Builder"],
  },
];

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
      <header className="border-b border-border/30 px-6 py-3 glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                RoboSim<span className="text-primary">Lab</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-[0.08em]">Interactive Robotics Simulation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono bg-secondary/30 px-3 py-1.5 rounded-md border border-border/30">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-foreground font-semibold">{modules.length}</span> modules
            </div>
            <div className="flex items-center gap-2">
              <div className="status-indicator bg-primary" style={{ color: "hsl(172, 78%, 47%)" }} />
              <span className="text-[10px] text-muted-foreground font-mono tracking-[0.15em]">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-14">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-primary tracking-[0.2em] uppercase">Simulation Laboratory</span>
        </div>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-5 leading-[1.05]">
          Explore Robotics,<br />
          <span className="shimmer-text">Interactively.</span>
        </h2>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          A professional-grade robotics research environment. 
          Select any module below to begin real-time experimentation.
        </p>
      </div>

      {/* Module Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-fade">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => navigate(mod.route)}
                className="sim-panel card-lift p-5 text-left group relative overflow-hidden cursor-pointer"
              >
                {/* Gradient overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${mod.color.replace(')', ', 0.06)')} 0%, transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-350 group-hover:scale-110 group-hover:shadow-lg"
                      style={{
                        backgroundColor: mod.color.replace(')', ', 0.1)'),
                        color: mod.color,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex gap-1">
                      {mod.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-mono uppercase tracking-[0.1em] text-muted-foreground/70 bg-secondary/40 rounded px-1.5 py-0.5 border border-border/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-[13px] tracking-tight">{mod.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">{mod.description}</p>

                  <div className="flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                    <span>Launch module</span>
                    <ArrowRight className="w-3 h-3" />
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
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span className="tracking-wide">RoboSimLab — Browser-based Robotics Research</span>
          <span className="font-mono tracking-wider">v2.1</span>
        </div>
      </footer>
    </div>
  );
};

export default SimulationGallery;
