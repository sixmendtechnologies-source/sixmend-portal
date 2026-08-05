import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { C } from "../utils/colors";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center w-screen h-screen"
      style={{ background: C.bg }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex flex-col items-center mb-8">
          <img
            src="/sixmend-mark.png"
            alt="Sixmend"
            className="w-14 h-14 rounded-xl object-contain mb-3"
          />
          <h1 className="text-[22px] font-bold" style={{ color: C.textPrimary }}>
            SixPortal
          </h1>
          <p className="text-[13px] mt-1" style={{ color: C.textMuted }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px]" style={{ color: C.textMuted }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@sixmend.com"
              required
              className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.green)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px]" style={{ color: C.textMuted }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              className="px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.green)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>

          {error && (
            <p className="text-[12px] text-center" style={{ color: C.red }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 rounded-lg text-[14px] font-semibold mt-2 transition-opacity disabled:opacity-60"
            style={{ background: C.green, color: "var(--btn-primary-text)" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

      </div>
    </div>
  );
}
