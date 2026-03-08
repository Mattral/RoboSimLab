import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu } from "lucide-react";

interface SimLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  controls?: ReactNode;
}

const SimLayout = ({ title, subtitle, children, controls }: SimLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono hidden md:inline">{subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator bg-primary" style={{ color: "hsl(175, 80%, 50%)" }} />
          <span className="text-xs text-muted-foreground font-mono">RUNNING</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main visualization */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>

        {/* Controls panel */}
        {controls && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-[hsl(var(--panel))]">
            <div className="p-4 space-y-4">
              {controls}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimLayout;
