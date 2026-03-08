import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";

/**
 * SimLayout — Shared layout wrapper for all simulation modules.
 * 
 * Provides:
 * - Consistent header with navigation, title, and live status indicator
 * - Responsive split view: main visualization (left) + controls sidebar (right)
 * - ErrorBoundary wrapping the simulation canvas for crash recovery
 * - Frosted glass panel aesthetics matching Apple HIG standards
 * 
 * @param title - Module name displayed in header
 * @param subtitle - Short description shown on desktop
 * @param children - Main simulation/visualization content
 * @param controls - Optional sidebar control panel content
 */
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
            aria-label="Back to gallery"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-250" />
            <span className="hidden sm:inline text-[11px] font-medium tracking-wide">Back</span>
          </button>
          <div className="w-px h-4 bg-border/40" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h1>
              <span className="text-[10px] text-muted-foreground font-mono hidden md:inline tracking-wider uppercase">{subtitle}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator bg-primary" style={{ color: "hsl(172, 78%, 47%)" }} aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground font-mono tracking-[0.15em]">LIVE</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main visualization — wrapped in ErrorBoundary for crash recovery */}
        <div className="flex-1 relative overflow-hidden">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>

        {/* Controls panel — frosted sidebar */}
        {controls && (
          <aside className="lg:w-80 xl:w-[340px] border-t lg:border-t-0 lg:border-l border-border/30 overflow-y-auto bg-[hsl(var(--panel))]">
            <div className="p-3.5 space-y-2.5">
              {controls}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default SimLayout;
