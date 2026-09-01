import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, RotateCcw, Send, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../utils/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { C } from "../utils/colors";

function useCustomFields(module) {
  const [fields, setFields] = useState([]);
  useEffect(() => {
    api.get(`/custom-fields?module=${module}`).then((r) => setFields(r.data)).catch(() => {});
  }, [module]);
  return fields;
}

const STAGES = [
  { key: "open",                  label: "Open" },
  { key: "first_level_discussion", label: "Discussion" },
  { key: "kick_off",              label: "Kick Off" },
  { key: "agreement",             label: "Agreement" },
  { key: "client",                label: "Client" },
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

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const customFields = useCustomFields("enquiries");

  const fetchComments = () =>
    api.get(`/enquiries/${id}/comments`).then((r) => setComments(r.data)).catch(() => {});

  useEffect(() => {
    api.get(`/enquiries/${id}`)
      .then((r) => setEnquiry(r.data))
      .catch(() => setEnquiry(null))
      .finally(() => setLoading(false));
    fetchComments();
  }, [id]);

  const moveStage = async (stage) => {
    if (updating) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/enquiries/${id}/stage`, { stage });
      setEnquiry(data);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/enquiries/${id}/comments`, { author: "Admin", body: commentText.trim() });
      setCommentText("");
      fetchComments();
    } catch { alert("Error posting comment"); }
  };

  const deleteComment = async (cid) => {
    if (!confirm("Delete this comment?")) return;
    try { await api.delete(`/enquiries/${id}/comments/${cid}`); fetchComments(); }
    catch { alert("Error deleting"); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
    </div>
  );

  if (!enquiry) return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p style={{ color: C.textMuted }}>Enquiry not found.</p>
      <Button variant="secondary" onClick={() => navigate("/enquiries")}>Back to Enquiries</Button>
    </div>
  );

  const currentIdx = STAGES.findIndex((s) => s.key === enquiry.stage);
  const isLost   = enquiry.stage === "lost";
  const isClient = enquiry.stage === "client";
  const prevStage = currentIdx > 0 ? STAGES[currentIdx - 1] : null;
  const nextStage = !isLost && !isClient && currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;

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
            {/* Clickable Stepper */}
            <div className="flex items-start">
              {STAGES.map((stage, idx) => {
                const done    = idx < currentIdx;
                const current = idx === currentIdx;
                const clickable = idx !== currentIdx && !updating;
                return (
                  <div key={stage.key} className="flex items-start flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => clickable && moveStage(stage.key)}
                        disabled={!clickable}
                        title={clickable ? (idx < currentIdx ? `Revert to ${stage.label}` : `Move to ${stage.label}`) : undefined}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all disabled:cursor-default"
                        style={{
                          background: done ? C.green : current ? C.green : C.border,
                          color: done || current ? "var(--btn-primary-text)" : C.textMuted,
                          boxShadow: current ? "0 0 0 4px var(--color-green-glow)" : "none",
                          cursor: clickable ? "pointer" : "default",
                          opacity: updating ? 0.5 : 1,
                        }}
                      >
                        {done ? "✓" : idx + 1}
                      </button>
                      <span
                        className="text-[11px] text-center leading-tight px-1"
                        style={{ color: done || current ? C.textPrimary : C.textMuted }}
                      >
                        {stage.label}
                      </span>
                    </div>
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

            {/* Prev / Next action buttons */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {prevStage && (
                  <button
                    onClick={() => moveStage(prevStage.key)}
                    disabled={updating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
                    style={{ background: C.bg, color: C.textMuted, border: `1px solid ${C.border}` }}
                  >
                    <ChevronLeft size={13} /> {prevStage.label}
                  </button>
                )}
              </div>
              <div>
                {isClient ? (
                  <span className="text-[13px] font-medium" style={{ color: C.green }}>✓ Converted to Client</span>
                ) : nextStage ? (
                  <Button onClick={() => moveStage(nextStage.key)} disabled={updating}>
                    <span className="flex items-center gap-1.5">
                      {nextStage.label} <ChevronRight size={13} />
                    </span>
                  </Button>
                ) : null}
              </div>
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
          <DetailField label="Description"    value={enquiry.description} full />
          <DetailField label="Source"         value={enquiry.source} />
          <DetailField label="Contact Name"   value={enquiry.contact_name} />
          <DetailField label="Contact Number" value={enquiry.contact_number} />
          <DetailField label="Gmail"          value={enquiry.gmail} />
          <DetailField label="Client"         value={enquiry.client_name} />
          <DetailField label="Assigned To"    value={enquiry.assigned_to} />
          <DetailField label="Value"          value={enquiry.value ? `₹${parseFloat(enquiry.value).toLocaleString("en-IN")}` : null} />
          <DetailField label="Priority"       value={enquiry.priority} />
          <DetailField label="Created"        value={fmtDate(enquiry.created_at)} />
          <DetailField label="Last Updated"   value={fmtDate(enquiry.updated_at)} />
          {customFields.length > 0 && enquiry.custom_data && Object.keys(enquiry.custom_data).length > 0 && (
            <>
              <div className="col-span-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Additional Fields</div>
              </div>
              {customFields.map((f) => (
                <DetailField key={f.id} label={f.label} value={enquiry.custom_data?.[f.field_key] || null} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
          Comments &amp; Updates
        </div>

        {comments.length === 0 && (
          <p className="text-[13px] py-3" style={{ color: C.textMuted }}>No comments yet. Add the first update below.</p>
        )}

        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 p-3 rounded-xl" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: C.border, color: C.textPrimary }}
            >
              {c.author?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>{c.author}</span>
                <span className="text-[11px]" style={{ color: C.textMuted }}>{fmtDate(c.created_at)}</span>
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textMuted }}>{c.body}</p>
            </div>
            <button
              onClick={() => deleteComment(c.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: C.textMuted }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {/* Input */}
        <div className="flex gap-3 items-end pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: "#fb8c00", color: "#1a0800" }}
          >
            AD
          </div>
          <div className="flex-1 flex gap-2 items-end">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              placeholder="Write an update… (Enter to submit, Shift+Enter for new line)"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary }}
              onFocus={(e) => (e.target.style.borderColor = C.green)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
              style={{ background: C.green, color: "var(--btn-primary-text)" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
