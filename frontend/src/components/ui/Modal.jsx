import { X } from "lucide-react";
import { C } from "../../utils/colors";

export default function Modal({ title, onClose, children, width = "480px" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-xl w-full flex flex-col max-h-[90vh]"
        style={{ background: C.card, border: `1px solid ${C.border}`, maxWidth: width }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
