import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, AlertTriangle, RotateCcw } from "lucide-react";
import api from "../utils/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { C } from "../utils/colors";

const STAGES = [
  { key: "open", label: "Open" },
  { key: "first_level_discussion", label: "First Level Discussion" },
  { key: "kick_off", label: "Kick Off" },
  { key: "agreement", label: "Agreement" },
  { key: "client", label: "Client" },
];

function DetailField({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: C.textMuted }}>{label}</div>
      <div className="text-[13px] leading-relaxed" style={{ color: value ? C.textPrimary : C.textMuted }}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get(`/enquiries/${id}`)
      .then((r) => setEnquiry(r.data))
      .catch(() => setEnquiry(null))
      .finally(() => setLoading(false));
  }, [id]);

  const moveStage = async (stage) => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/enquiries/${id}/stage`, { stage });
      setEnquiry(data);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p style={{ color: C.textMuted }}>Enquiry not found.</p>
        <Button variant="secondary" onClick={() => navigate("/enquiries")}>Back to Enquiries</Button>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === enquiry.stage);
  const isLost = enquiry.stage === "lost";
  const isClient = enquiry.stage === "client";
  const nextStage = !isLost && !isClient && currentIdx >= 0 ? STAGES[currentIdx + 1] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/enquiries")}
            className="flex items-center gap-1 text-[13px] hover:opacity-70 transition-opacity"
            style={{ color: C.textMuted }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: C.border }}>|</span>
          <h1 className="text-[17px] font-semibold" style={{ color: C.textPrimary }}>{enquiry.title}</h1>
          <Badge value={enquiry.stage} />
        </div>

        <div className="flex items-center gap-2">
          {isLost ? (
            <button
              onClick={() => moveStage("open")}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
              style={{ background: C.card, color: C.textMuted, border: `1px solid ${C.border}` }}
            >
              <RotateCcw size={12} /> Reopen
            </button>
          ) : (
            <button
              onClick={() => moveStage("lost")}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
              style={{ background: "var(--lost-bg)", color: C.red, border: "1px solid var(--lost-border)" }}
            >
              <AlertTriangle size={12} /> Mark as Lost
            </button>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: C.textMuted }}>
          Pipeline Stage
        </div>

        {isLost ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: "var(--lost-bg)", border: "1px solid var(--lost-border-light)" }}
          >
            <AlertTriangle size={15} style={{ color: C.red, flexShrink: 0 }} />
            <span className="text-[13px]" style={{ color: C.red }}>
              This enquiry has been marked as <strong>Lost</strong>. Click "Reopen" to move it back to Open.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Stepper */}
            <div className="flex items-start">
              {STAGES.map((stage, idx) => {
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                return (
                  <div key={stage.key} className="flex items-start flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      {/* Circle */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all"
                        style={{
                          background: done ? C.green : current ? C.green : C.border,
                          color: done || current ? "var(--btn-primary-text)" : C.textMuted,
                          boxShadow: current ? "0 0 0 4px var(--color-green-glow)" : "none",
                        }}
                      >
                        {done ? "✓" : idx + 1}
                      </div>
                      {/* Label */}
                      <span
                        className="text-[11px] text-center leading-tight px-1"
                        style={{ color: done || current ? C.textPrimary : C.textMuted }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    {/* Connector */}
                    {idx < STAGES.length - 1 && (
                      <div
                        className="h-[2px] flex-1 mt-4 mx-1 rounded-full"
                        style={{ background: idx < currentIdx ? C.green : C.border }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action */}
            <div className="flex justify-end">
              {isClient ? (
                <span className="text-[13px] font-medium" style={{ color: C.green }}>
                  ✓ Enquiry converted to a Client
                </span>
              ) : nextStage ? (
                <Button onClick={() => moveStage(nextStage.key)} disabled={updating}>
                  <span className="flex items-center gap-1.5">
                    Move to {nextStage.label} <ChevronRight size={14} />
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: C.textMuted }}>
          Enquiry Details
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Description" value={enquiry.description} full />
          <DetailField label="Source" value={enquiry.source} />
          <DetailField label="Contact Number" value={enquiry.contact_number} />
          <DetailField label="Gmail" value={enquiry.gmail} />
          <DetailField label="Client" value={enquiry.client_name} />
          <DetailField label="Assigned To" value={enquiry.assigned_to} />
          <DetailField
            label="Value"
            value={enquiry.value ? `₹${parseFloat(enquiry.value).toLocaleString("en-IN")}` : null}
          />
          <DetailField label="Priority" value={enquiry.priority} />
          <DetailField
            label="Created"
            value={new Date(enquiry.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          />
          <DetailField
            label="Last Updated"
            value={new Date(enquiry.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          />
        </div>
      </div>
    </div>
  );
}
