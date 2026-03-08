import { ReactNode } from "react";

interface ControlSectionProps {
  title: string;
  children: ReactNode;
}

const ControlSection = ({ title, children }: ControlSectionProps) => {
  return (
    <div className="sim-panel p-3 space-y-3">
      <h3 className="text-xs font-mono text-primary uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
};

export default ControlSection;
