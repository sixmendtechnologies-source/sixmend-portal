import { Maximize2, Settings, HelpCircle } from "lucide-react";
import { C } from "../../utils/colors";

export function CardHeader({ title, actions }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>
        {title}
      </h2>
      <div className="flex items-center gap-2" style={{ color: C.textMuted }}>
        {actions}
        <Maximize2 size={13} />
        <Settings size={13} />
        <HelpCircle size={13} />
      </div>
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {children}
    </div>
  );
}
