import { useNavigate } from "react-router-dom";
import { 
  Cpu, Route, SlidersHorizontal, Users, PersonStanding, Navigation, 
  Eye, Brain, Zap, Network 
} from "lucide-react";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
  status: "active" | "coming-soon";
}

const modules: ModuleCard[] = [
  {
    id: "arm-kinematics",
    title: "Robotic Arm Kinematics",
    description: "Forward & inverse kinematics with interactive joint control and workspace visualization",
    icon: Cpu,
    color: "hsl(175, 80%, 50%)",
    route: "/sim/arm-kinematics",
    status: "active",
  },
  {
    id: "motion-planning",
    title: "Motion Planning Studio",
    description: "A* pathfinding, RRT, and potential fields with obstacle placement",
    icon: Route,
    color: "hsl(150, 70%, 45%)",
    route: "/sim/motion-planning",
    status: "active",
  },
  {
    id: "pid-control",
    title: "PID Control Lab",
    description: "Classical control systems with real-time response curves and parameter tuning",
    icon: SlidersHorizontal,
    color: "hsl(40, 90%, 55%)",
    route: "/sim/pid-control",
    status: "active",
  },
  {
    id: "swarm",
    title: "Swarm Robotics",
    description: "Emergent collective behavior with flocking, formation, and obstacle avoidance",
    icon: Users,
    color: "hsl(270, 60%, 55%)",
    route: "/sim/swarm",
    status: "active",
  },
  {
    id: "humanoid-balance",
    title: "Humanoid Balance",
    description: "Center of mass visualization, support polygon, and balance stabilization",
    icon: PersonStanding,
    color: "hsl(0, 70%, 55%)",
    route: "/sim/humanoid-balance",
    status: "active",
  },
  {
    id: "navigation",
    title: "Autonomous Navigation",
    description: "SLAM-based mapping and autonomous path following in dynamic environments",
    icon: Navigation,
    color: "hsl(210, 80%, 55%)",
    route: "/sim/navigation",
    status: "coming-soon",
  },
  {
    id: "perception",
    title: "Sensor & Perception Lab",
    description: "Lidar, depth sensing, camera FOV, and environment mapping visualization",
    icon: Eye,
    color: "hsl(320, 60%, 55%)",
    route: "/sim/perception",
    status: "active",
  },
  {
    id: "rl-playground",
    title: "RL Playground",
    description: "Reinforcement learning with state space, reward signals, and policy evolution",
    icon: Brain,
    color: "hsl(50, 80%, 50%)",
    route: "/sim/rl-playground",
    status: "coming-soon",
  },
  {
    id: "dynamics",
    title: "Robot Dynamics & Torque",
    description: "Joint torque, velocity, acceleration, and energy propagation visualization",
    icon: Zap,
    color: "hsl(15, 80%, 55%)",
    route: "/sim/dynamics",
    status: "coming-soon",
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Coordination",
    description: "Distributed task allocation, consensus algorithms, and cooperative planning",
    icon: Network,
    color: "hsl(190, 70%, 50%)",
    route: "/sim/multi-agent",
    status: "coming-soon",
  },
];

const SimulationGallery = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                RoboSim<span className="text-primary">Lab</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">Interactive Robotics Research Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-indicator bg-primary" style={{ color: "hsl(175, 80%, 50%)" }} />
            <span className="text-xs text-muted-foreground font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-2">
          <span className="text-xs font-mono text-primary tracking-widest uppercase">Simulation Modules</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Research Laboratory</h2>
        <p className="text-muted-foreground max-w-xl">
          Explore robotics, control systems, and AI through interactive real-time simulations.
          Select a module to begin experimentation.
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = mod.status === "active";
            return (
              <button
                key={mod.id}
                onClick={() => isActive && navigate(mod.route)}
                disabled={!isActive}
                className={`sim-panel p-5 text-left transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "hover:border-primary/40 cursor-pointer hover:glow-cyan"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${mod.color}15`, color: mod.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {!isActive && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5">
                      Coming Soon
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/30 rounded px-2 py-0.5">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{mod.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: mod.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SimulationGallery;
