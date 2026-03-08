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
    <div className="min-h-screen bg-background flex flex-col page-enter">
      {/* Header — precision engineering bar */}
      <header className="px-5 py-2.5 flex items-center justify-between shrink-0 glass-panel border-b-0" style={{ borderBottom: '1px solid hsl(228, 13%, 11%)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-250 text-sm group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-250" />
            <span className="hidden sm:inline text-[11px] font-medium tracking-wide">Back</span>
          </button>
          <div className="w-px h-4 bg-border/40" />
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-foreground tracking-tight">{title}</span>
              <span className="text-[10px] text-muted-foreground font-mono hidden md:inline tracking-wider uppercase">{subtitle}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator bg-primary" style={{ color: "hsl(172, 78%, 47%)" }} />
          <span className="text-[10px] text-muted-foreground font-mono tracking-[0.15em]">LIVE</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main visualization */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>

        {/* Controls panel — frosted sidebar */}
        {controls && (
          <div className="lg:w-80 xl:w-[340px] border-t lg:border-t-0 lg:border-l border-border/30 overflow-y-auto bg-[hsl(var(--panel))]">
            <div className="p-3.5 space-y-2.5">
              {controls}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimLayout;
