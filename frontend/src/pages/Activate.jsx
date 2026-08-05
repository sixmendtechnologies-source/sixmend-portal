import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { C } from "../utils/colors";

export default function Activate() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [tokenError, setTokenError] = useState("");
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/auth/invite/${token}`)
      .then((r) => {
        setInvite(r.data);
        setForm((f) => ({ ...f, name: r.data.name }));
      })
      .catch((e) => setTokenError(e.response?.data?.error || "Invalid or expired link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setFormError("Passwords do not match"); return; }
    if (form.password.length < 8) { setFormError("Password must be at least 8 characters"); return; }
    setFormError("");
    setSaving(true);
    try {
      await api.post("/auth/activate", { token, name: form.name, password: form.password });
      setDone(true);
    } catch (e) {
      setFormError(e.response?.data?.error || "Activation failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    color: C.textPrimary,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen" style={{ background: C.bg }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center justify-center w-screen h-screen" style={{ background: C.bg }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: C.green }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: C.textPrimary }}>Account Activated!</h2>
          <p className="text-[13px] mb-6" style={{ color: C.textMuted }}>
            Your account is ready. You can now sign in with your email and password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2.5 rounded-lg text-[14px] font-semibold transition-opacity"
            style={{ background: C.green, color: "var(--btn-primary-text)" }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-screen h-screen" style={{ background: C.bg }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex flex-col items-center mb-6">
          <img
            src="/sixmend-mark.png"
            alt="Sixmend"
            className="w-14 h-14 rounded-xl object-contain mb-3"
          />
          <h1 className="text-[22px] font-bold" style={{ color: C.textPrimary }}>Activate Account</h1>
          {invite && (
            <p className="text-[13px] mt-1" style={{ color: C.textMuted }}>{invite.email}</p>
          )}
        </div>

        {tokenError ? (
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "var(--badge-red-bg)", border: `1px solid ${C.red}` }}
          >
            <p className="text-[13px] font-medium mb-3" style={{ color: C.red }}>{tokenError}</p>
            <p className="text-[12px]" style={{ color: C.textMuted }}>
              Please contact your administrator to request a new invitation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[12px]" style={{ color: C.textMuted }}>Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = C.green)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px]" style={{ color: C.textMuted }}>Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
                className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = C.green)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px]" style={{ color: C.textMuted }}>Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter password"
                className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = C.green)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {formError && (
              <p className="text-[12px] text-center" style={{ color: C.red }}>{formError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 rounded-lg text-[14px] font-semibold mt-1 transition-opacity disabled:opacity-60"
              style={{ background: C.green, color: "var(--btn-primary-text)" }}
            >
              {saving ? "Activating…" : "Activate Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
