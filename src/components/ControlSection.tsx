import { ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";

interface ControlSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const ControlSection = ({ title, children, defaultOpen = true }: ControlSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="sim-panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-secondary/15 transition-colors duration-200"
      >
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">{title}</h3>
        <ChevronRight
          className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? "rotate-90" : "rotate-0"}`}
        />
      </button>
      <div
        className="transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
        style={{
          maxHeight: open ? "800px" : "0px",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-3.5 pb-3.5 space-y-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ControlSection;
