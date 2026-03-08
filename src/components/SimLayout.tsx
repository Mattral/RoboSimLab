import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Play, Square } from "lucide-react";

interface SimLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  controls?: ReactNode;
}

const SimLayout = ({ title, subtitle, children, controls }: SimLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      {/* Header — Apple-style minimal */}
      <header className="border-b border-border/50 px-5 py-3 flex items-center justify-between shrink-0 glass-panel">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="hidden sm:inline text-xs font-medium">Back</span>
          </button>
          <div className="w-px h-4 bg-border/50" />
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground tracking-tight">{title}</span>
              <span className="text-[11px] text-muted-foreground font-mono ml-2 hidden md:inline">{subtitle}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator bg-primary" style={{ color: "hsl(175, 80%, 50%)" }} />
          <span className="text-[11px] text-muted-foreground font-mono tracking-wide">LIVE</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main visualization */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>

        {/* Controls panel — frosted glass sidebar */}
        {controls && (
          <div className="lg:w-80 xl:w-[340px] border-t lg:border-t-0 lg:border-l border-border/40 overflow-y-auto bg-[hsl(var(--panel))]">
            <div className="p-4 space-y-3">
              {controls}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimLayout;
