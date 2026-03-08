import { useNavigate } from "react-router-dom";
import {
  Cpu, Route, SlidersHorizontal, Users, PersonStanding, Navigation,
  Eye, Brain, Zap, Network, Wrench, ArrowRight, Sparkles
} from "lucide-react";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  phase: number;
  tags: string[];
}

const modules: ModuleCard[] = [
  {
    id: "arm-kinematics",
    title: "Robotic Arm Kinematics",
    description: "3D forward & inverse kinematics with interactive joint control and workspace visualization",
    icon: Cpu,
    color: "hsl(175, 80%, 50%)",
    route: "/sim/arm-kinematics",
    phase: 2,
    tags: ["3D", "FK/IK"],
  },
  {
    id: "motion-planning",
    title: "Motion Planning Studio",
    description: "A*, RRT & Dijkstra pathfinding with drawable obstacles and animated exploration",
    icon: Route,
    color: "hsl(150, 70%, 45%)",
    route: "/sim/motion-planning",
    phase: 2,
    tags: ["A*", "RRT", "Dijkstra"],
  },
  {
    id: "pid-control",
    title: "PID Control Lab",
    description: "Classical control systems with real-time response curves and parameter tuning",
    icon: SlidersHorizontal,
    color: "hsl(40, 90%, 55%)",
    route: "/sim/pid-control",
    phase: 2,
    tags: ["Control", "CSV Export"],
  },
  {
    id: "swarm",
    title: "Swarm Robotics",
    description: "Emergent collective behavior with 3D flocking, formation, and obstacle avoidance",
    icon: Users,
    color: "hsl(270, 60%, 55%)",
    route: "/sim/swarm",
    phase: 2,
    tags: ["3D", "Boids"],
  },
  {
    id: "humanoid-balance",
    title: "Humanoid Balance",
    description: "3D humanoid with inverted pendulum dynamics, CoM tracking, and PD stabilization",
    icon: PersonStanding,
    color: "hsl(0, 65%, 52%)",
    route: "/sim/humanoid-balance",
    phase: 4,
    tags: ["3D", "Physics"],
  },
  {
    id: "navigation",
    title: "Autonomous Navigation",
    description: "Waypoint following with reactive obstacle avoidance and SLAM-style mapping",
    icon: Navigation,
    color: "hsl(210, 80%, 55%)",
    route: "/sim/navigation",
    phase: 4,
    tags: ["SLAM", "Autonomy"],
  },
  {
    id: "perception",
    title: "Sensor & Perception Lab",
    description: "Lidar raycasting, depth profile, camera FOV, and environment mapping",
    icon: Eye,
    color: "hsl(320, 60%, 55%)",
    route: "/sim/perception",
    phase: 3,
    tags: ["Lidar", "SLAM"],
  },
  {
    id: "rl-playground",
    title: "RL Playground",
    description: "Q-learning grid world with policy visualization and learning curve analysis",
    icon: Brain,
    color: "hsl(50, 80%, 50%)",
    route: "/sim/rl-playground",
    phase: 5,
    tags: ["AI", "Q-Learning"],
  },
  {
    id: "dynamics",
    title: "Robot Dynamics & Torque",
    description: "3D arm with joint torque, velocity, acceleration, and energy propagation charts",
    icon: Zap,
    color: "hsl(15, 80%, 55%)",
    route: "/sim/dynamics",
    phase: 4,
    tags: ["3D", "Dynamics"],
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Coordination",
    description: "Distributed task allocation with nearest-first and priority auction strategies",
    icon: Network,
    color: "hsl(190, 70%, 50%)",
    route: "/sim/multi-agent",
    phase: 4,
    tags: ["Multi-Agent"],
  },
  {
    id: "robot-builder",
    title: "Custom Robot Builder",
    description: "Design 1–7 DOF manipulators with configurable links, joint types, and JSON export",
    icon: Wrench,
    color: "hsl(35, 80%, 50%)",
    route: "/sim/robot-builder",
    phase: 4,
    tags: ["3D", "Builder"],
  },
];

const SimulationGallery = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                RoboSim<span className="text-primary">Lab</span>
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Interactive Robotics Simulation Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-secondary/40 px-3 py-1.5 rounded-lg">
              <span className="text-foreground font-semibold">{modules.length}</span> modules active
            </div>
            <div className="flex items-center gap-2">
              <div className="status-indicator bg-primary" style={{ color: "hsl(175, 80%, 50%)" }} />
              <span className="text-[11px] text-muted-foreground font-mono tracking-wide">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-primary tracking-[0.15em] uppercase">Simulation Laboratory</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4 leading-[1.1]">
          Explore Robotics,<br />
          <span className="text-primary">Interactively.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg text-base leading-relaxed">
          A professional-grade robotics research environment running entirely in your browser.
          Select a module to begin experimentation.
        </p>
      </div>

      {/* Module Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => navigate(mod.route)}
                className="sim-panel p-5 text-left group relative overflow-hidden hover:glow-cyan cursor-pointer"
              >
                {/* Subtle gradient overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${mod.color}08 0%, transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${mod.color}12`, color: mod.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1.5">
                      {mod.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary/60 rounded-md px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-sm tracking-tight">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{mod.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-muted-foreground">
          <span>RoboSimLab — Browser-based Robotics Research</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default SimulationGallery;
