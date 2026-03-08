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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
