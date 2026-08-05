import { useState, useEffect } from "react";
import api from "../../utils/api";
import { Input, Select, Textarea } from "./Input";
import { C } from "../../utils/colors";

export default function CustomFieldsSection({ module, values = {}, onChange }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    api.get(`/custom-fields?module=${module}`)
      .then((r) => setFields(r.data))
      .catch(() => {});
  }, [module]);

  if (fields.length === 0) return null;

  const set = (key, value) => onChange({ ...values, [key]: value });

  return (
    <>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest pt-1"
        style={{ color: C.textMuted, borderTop: `1px solid ${C.border}` }}
      >
        Additional Fields
      </div>
      {fields.map((f) => {
        const val = values[f.field_key] ?? "";
        if (f.type === "textarea") {
          return (
            <Textarea
              key={f.id}
              label={f.label}
              value={val}
              onChange={(e) => set(f.field_key, e.target.value)}
              required={f.required}
              placeholder={f.label}
            />
          );
        }
        if (f.type === "select") {
          return (
            <Select
              key={f.id}
              label={f.label}
              value={val}
              onChange={(e) => set(f.field_key, e.target.value)}
              required={f.required}
            >
              <option value="">Select {f.label}</option>
              {(f.options || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          );
        }
        return (
          <Input
            key={f.id}
            label={f.label}
            type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
            value={val}
            onChange={(e) => set(f.field_key, e.target.value)}
            required={f.required}
            placeholder={f.label}
          />
        );
      })}
    </>
  );
}
