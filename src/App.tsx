import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SimulationGallery from "./pages/SimulationGallery";
import PIDControlLab from "./pages/PIDControlLab";
import ArmKinematicsLab from "./pages/ArmKinematicsLab";
import SwarmSimulator from "./pages/SwarmSimulator";
import MotionPlanningStudio from "./pages/MotionPlanningStudio";
import SensorPerceptionLab from "./pages/SensorPerceptionLab";
import HumanoidBalanceSimulator from "./pages/HumanoidBalanceSimulator";
import RLPlayground from "./pages/RLPlayground";
import RobotDynamicsSimulator from "./pages/RobotDynamicsSimulator";
import AutonomousNavigation from "./pages/AutonomousNavigation";
import MultiAgentCoordination from "./pages/MultiAgentCoordination";
import CustomRobotBuilder from "./pages/CustomRobotBuilder";
import TrajectoryOptimizationLab from "./pages/TrajectoryOptimizationLab";
import SensorFusionLab from "./pages/SensorFusionLab";
import SLAMExploration from "./pages/SLAMExploration";
import MultiAgentRL from "./pages/MultiAgentRL";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SimulationGallery />} />
          <Route path="/sim/pid-control" element={<PIDControlLab />} />
          <Route path="/sim/arm-kinematics" element={<ArmKinematicsLab />} />
          <Route path="/sim/swarm" element={<SwarmSimulator />} />
          <Route path="/sim/motion-planning" element={<MotionPlanningStudio />} />
          <Route path="/sim/perception" element={<SensorPerceptionLab />} />
          <Route path="/sim/humanoid-balance" element={<HumanoidBalanceSimulator />} />
          <Route path="/sim/rl-playground" element={<RLPlayground />} />
          <Route path="/sim/dynamics" element={<RobotDynamicsSimulator />} />
          <Route path="/sim/navigation" element={<AutonomousNavigation />} />
          <Route path="/sim/multi-agent" element={<MultiAgentCoordination />} />
          <Route path="/sim/robot-builder" element={<CustomRobotBuilder />} />
          <Route path="/sim/trajectory-optimization" element={<TrajectoryOptimizationLab />} />
          <Route path="/sim/sensor-fusion" element={<SensorFusionLab />} />
          <Route path="/sim/slam-exploration" element={<SLAMExploration />} />
          <Route path="/sim/multi-agent-rl" element={<MultiAgentRL />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
