import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

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
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors duration-150"
      >
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">{title}</h3>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? "600px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ControlSection;
