import { C } from "../../utils/colors";

const VARIANTS = {
  primary: { background: C.green, color: "var(--btn-primary-text)", border: "none" },
  secondary: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  danger: { background: C.red, color: "#fff", border: "none" },
};

export default function Button({ children, variant = "primary", onClick, type = "button", disabled = false, className = "" }) {
  const style = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity disabled:opacity-50 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
