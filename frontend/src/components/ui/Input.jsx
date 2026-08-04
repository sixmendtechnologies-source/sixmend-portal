import { C } from "../../utils/colors";

export function Input({ label, type = "text", value, onChange, placeholder, required, name }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px]" style={{ color: C.textMuted }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
        }}
        onFocus={(e) => (e.target.style.borderColor = C.green)}
        onBlur={(e) => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

export function Select({ label, value, onChange, children, required, name }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px]" style={{ color: C.textMuted }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="px-3 py-2 rounded-lg text-[13px] outline-none"
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
        }}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, name, rows = 3 }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px]" style={{ color: C.textMuted }}>
          {label}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="px-3 py-2 rounded-lg text-[13px] outline-none resize-none transition-colors"
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
        }}
        onFocus={(e) => (e.target.style.borderColor = C.green)}
        onBlur={(e) => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}
