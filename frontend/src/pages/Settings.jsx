import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, RefreshCw, UserX, UserCheck, KeyRound,
  Users, Palette, Sun, Moon, Sliders, Pencil, X, Building2, Upload,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";

const TABS = [
  { key: "users",    label: "User Management", icon: Users },
  { key: "appearance", label: "Appearance",   icon: Palette },
  { key: "fields",   label: "Field Update",   icon: Sliders },
  { key: "company",  label: "Company",         icon: Building2 },
];

const EMPTY_USER = { name: "", email: "", role: "member" };

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, toggle } = useTheme();

  const options = [
    { key: "dark", label: "Dark", description: "Easy on the eyes, great for low-light environments.", icon: Moon },
    { key: "light", label: "Light", description: "Clean and bright, ideal for well-lit workspaces.", icon: Sun },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h2 className="text-[15px] font-semibold mb-0.5" style={{ color: C.textPrimary }}>Theme</h2>
        <p className="text-[12px]" style={{ color: C.textMuted }}>Choose how the portal looks for you.</p>
      </div>
      <div className="flex flex-col gap-3">
        {options.map(({ key, label, description, icon: Icon }) => {
          const active = theme === key;
          return (
            <button
              key={key}
              onClick={() => !active && toggle()}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
              style={{
                background: active ? "var(--nav-active-bg)" : C.card,
                border: `1px solid ${active ? C.green : C.border}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: active ? C.green : C.border, color: active ? "var(--btn-primary-text)" : C.textMuted }}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{label}</div>
                <div className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>{description}</div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: active ? C.green : C.border }}>
                {active && <div className="w-2 h-2 rounded-full" style={{ background: C.green }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Field Update Tab ─────────────────────────────────────────────────────────

const FIELD_MODULES = [
  { key: "enquiries", label: "Enquiries" },
  { key: "clients", label: "Clients" },
  { key: "expenses", label: "Expenses" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "textarea", label: "Long Text" },
];

const EMPTY_FIELD = { label: "", type: "text", required: false, visible: true, options: [] };

function Toggle({ value, onChange }) {
  return (
    <div
      className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0 cursor-pointer"
      style={{ background: value ? C.green : C.border }}
      onClick={onChange}
    >
      <div
        className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all"
        style={{ left: value ? "18px" : "2px" }}
      />
    </div>
  );
}

function FieldUpdateTab() {
  const [module, setModule] = useState("enquiries");
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FIELD);
  const [editId, setEditId] = useState(null);
  const [isSystem, setIsSystem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optionInput, setOptionInput] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const fetchFields = (mod) => {
    setLoading(true);
    api.get(`/custom-fields?module=${mod}`)
      .then((r) => setFields(r.data))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFields(module); }, [module]);

  const openAdd = () => {
    setForm(EMPTY_FIELD); setEditId(null); setIsSystem(false); setOptionInput(""); setModal("form");
  };

  const openEdit = (f) => {
    setForm({
      label: f.label,
      type: f.type,
      required: !!f.required,
      visible: f.visible !== false,
      options: Array.isArray(f.options) ? f.options : [],
    });
    setEditId(f.id);
    setIsSystem(!!f.is_system);
    setOptionInput("");
    setModal("form");
  };

  const addOption = () => {
    const opt = optionInput.trim();
    if (!opt || form.options.includes(opt)) return;
    setForm({ ...form, options: [...form.options, opt] });
    setOptionInput("");
  };

  const removeOption = (opt) => setForm({ ...form, options: form.options.filter((o) => o !== opt) });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSystem && form.type === "select" && form.options.length === 0) {
      alert("Add at least one option for Dropdown fields");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/custom-fields/${editId}`, form);
      } else {
        await api.post("/custom-fields", { ...form, module });
      }
      setModal(null);
      fetchFields(module);
    } catch (err) {
      alert(err.response?.data?.error || "Error saving field");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/custom-fields/${deleteId}`);
      setDeleteId(null);
      fetchFields(module);
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting");
    }
  };

  const systemFields = fields.filter((f) => f.is_system);
  const customFields = fields.filter((f) => !f.is_system);

  const FieldRow = ({ f }) => (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        opacity: f.visible === false ? 0.5 : 1,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium" style={{ color: C.textPrimary }}>{f.label}</span>
          <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.border, color: C.textMuted }}>{f.field_key}</code>
          <Badge value={f.type} />
          {f.is_system && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--badge-blue-bg, #1e3a5f)", color: C.blueLight }}>
              Built-in
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => {
          api.put(`/custom-fields/${f.id}`, { ...f, visible: !f.visible, required: f.required })
            .then(() => fetchFields(module))
            .catch(() => alert("Error updating"));
        }}>
          <Toggle value={f.visible !== false} onChange={() => {}} />
          <span className="text-[11px]" style={{ color: C.textMuted }}>Visible</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => {
          api.put(`/custom-fields/${f.id}`, { ...f, required: !f.required, visible: f.visible !== false })
            .then(() => fetchFields(module))
            .catch(() => alert("Error updating"));
        }}>
          <Toggle value={!!f.required} onChange={() => {}} />
          <span className="text-[11px]" style={{ color: C.textMuted }}>Required</span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(f)} style={{ color: C.textMuted }}><Pencil size={13} /></button>
          {!f.is_system && (
            <button onClick={() => setDeleteId(f.id)} style={{ color: C.red }}><Trash2 size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold mb-0.5" style={{ color: C.textPrimary }}>Field Update</h2>
          <p className="text-[12px]" style={{ color: C.textMuted }}>
            Toggle visibility and required status of built-in fields, or add custom fields.
          </p>
        </div>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Field</span>
        </Button>
      </div>

      {/* Module sub-tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {FIELD_MODULES.map(({ key, label }) => {
          const active = module === key;
          return (
            <button key={key} onClick={() => setModule(key)}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium transition-all"
              style={{ background: active ? C.green : "transparent", color: active ? "var(--btn-primary-text)" : C.textMuted }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Built-in fields */}
          {systemFields.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest px-1" style={{ color: C.textMuted }}>Built-in Fields</div>
              {systemFields.map((f) => <FieldRow key={f.id} f={f} />)}
            </div>
          )}

          {/* Custom fields */}
          <div className="flex flex-col gap-2">
            {systemFields.length > 0 && (
              <div className="text-[11px] font-semibold uppercase tracking-widest px-1" style={{ color: C.textMuted }}>Custom Fields</div>
            )}
            {customFields.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: C.card, border: `1px dashed ${C.border}` }}>
                <p className="text-[13px]" style={{ color: C.textMuted }}>
                  No custom fields yet. Click <strong>Add Field</strong> to add one.
                </p>
              </div>
            ) : (
              customFields.map((f) => <FieldRow key={f.id} f={f} />)
            )}
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal === "form" && (
        <Modal
          title={!editId ? "Add Custom Field" : isSystem ? `Edit: ${form.label}` : "Edit Custom Field"}
          onClose={() => setModal(null)}
          width="440px"
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Field Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              placeholder="e.g. Project URL"
            />

            {/* Type: editable for custom, read-only badge for system */}
            {isSystem ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>Field Type</label>
                <div className="flex items-center gap-2">
                  <Badge value={form.type} />
                  <span className="text-[11px]" style={{ color: C.textMuted }}>(type cannot be changed for built-in fields)</span>
                </div>
              </div>
            ) : (
              <Select label="Field Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, options: [] })}>
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            )}

            {/* Options builder — for select type (both custom and system) */}
            {form.type === "select" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>
                  Options {form.options.length > 0 && <span className="normal-case font-normal">(click an option to edit it)</span>}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text" value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    placeholder="Type an option and press Enter"
                    className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary }}
                  />
                  <Button type="button" variant="secondary" onClick={addOption}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.options.map((opt) => (
                    <span key={opt} className="flex items-center gap-1 px-2 py-1 rounded text-[11px]" style={{ background: "var(--badge-teal-bg)", color: C.teal }}>
                      <button type="button" className="hover:underline" onClick={() => { setOptionInput(opt); removeOption(opt); }}>{opt}</button>
                      <button type="button" onClick={() => removeOption(opt)} className="hover:opacity-70 ml-0.5"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setForm({ ...form, required: !form.required })}>
              <Toggle value={form.required} onChange={() => {}} />
              <span className="text-[13px]" style={{ color: C.textPrimary }}>
                Required field <span className="text-[11px]" style={{ color: C.textMuted }}>{form.required ? "(mandatory)" : "(optional)"}</span>
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editId ? "Update" : "Add Field"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Field" onClose={() => setDeleteId(null)} width="360px">
          <p className="text-[13px]" style={{ color: C.textMuted }}>
            Deleting this field will not remove existing data stored against it.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [reinviteId, setReinviteId] = useState(null);
  const [resetId, setResetId] = useState(null);

  const sigInputRef = useRef(null);
  const [mySig, setMySig] = useState(null);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigSaved, setSigSaved] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    api.get("/users").then((r) => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    api.get("/users/me").then((r) => setMySig(r.data.signature_data || null)).catch(() => {});
  }, []);

  const handleSigUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { alert("Signature image must be under 1 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setMySig(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveSig = async () => {
    setSigSaving(true);
    try {
      await api.patch("/users/me/signature", { signature_data: mySig });
      setSigSaved(true);
      setTimeout(() => setSigSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || "Error saving signature");
    } finally { setSigSaving(false); }
  };

  const handleClearSig = async () => {
    setMySig(null);
    await api.patch("/users/me/signature", { signature_data: null }).catch(() => {});
  };

  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users/invite", form);
      setModal(null); setForm(EMPTY_USER); fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Error sending invite");
    } finally { setSaving(false); }
  };

  const handleReinvite = async (id) => {
    setReinviteId(id);
    try { await api.patch(`/users/${id}/reinvite`); alert("Activation link resent."); }
    catch (err) { alert(err.response?.data?.error || "Error resending invite"); }
    finally { setReinviteId(null); }
  };

  const handleResetPassword = async (id, name) => {
    if (!window.confirm(`Send a password reset link to ${name}? They will be logged out until they set a new password.`)) return;
    setResetId(id);
    try {
      await api.patch(`/users/${id}/reset-password`);
      alert("Password reset link sent. The user must click the link in their email to set a new password.");
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Error sending reset link");
    } finally { setResetId(null); }
  };

  const handleRole = async (id, role) => {
    try {
      const r = await api.patch(`/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? r.data : u)));
    } catch (err) { alert(err.response?.data?.error || "Error updating role"); }
  };

  const handleStatus = async (id, status) => {
    try {
      const r = await api.patch(`/users/${id}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === id ? r.data : u)));
    } catch (err) { alert(err.response?.data?.error || "Error updating status"); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/users/${deleteId}`); setDeleteId(null); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || "Error deleting user"); }
  };

  const columns = [
    {
      key: "name", label: "User",
      render: (v, row) => (
        <div>
          <div className="text-[13px] font-medium" style={{ color: C.textPrimary }}>{v}</div>
          <div className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{row.email}</div>
        </div>
      ),
    },
    {
      key: "role", label: "Role",
      render: (v, row) => row.id === me?.id ? <Badge value={v} /> : (
        <select value={v} onChange={(e) => handleRole(row.id, e.target.value)}
          className="text-[11px] px-2 py-1 rounded outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textMuted }}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      ),
    },
    { key: "status", label: "Status", render: (v) => <Badge value={v} /> },
    { key: "last_login_at", label: "Last Login", render: (v) => <span className="text-[12px]" style={{ color: C.textMuted }}>{fmtDate(v)}</span> },
    { key: "created_at", label: "Invited", render: (v) => <span className="text-[12px]" style={{ color: C.textMuted }}>{fmtDate(v)}</span> },
    {
      key: "actions", label: "",
      render: (_, row) => {
        const isSelf = row.id === me?.id;
        return (
          <div className="flex items-center gap-2 justify-end">
            {row.status === "invited" && (
              <button onClick={() => handleReinvite(row.id)} disabled={reinviteId === row.id}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded disabled:opacity-50"
                style={{ color: C.orange, background: "var(--badge-orange-bg)" }}>
                <RefreshCw size={11} />{reinviteId === row.id ? "Sending…" : "Resend"}
              </button>
            )}
            {!isSelf && (
              <button onClick={() => handleResetPassword(row.id, row.name)} disabled={resetId === row.id}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded disabled:opacity-50"
                style={{ color: C.blue, background: "var(--badge-blue-bg, #dbeafe)" }}>
                <KeyRound size={11} />{resetId === row.id ? "Sending…" : "Reset Password"}
              </button>
            )}
            {!isSelf && row.status === "active" && (
              <button onClick={() => handleStatus(row.id, "inactive")}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded"
                style={{ color: C.red, background: "var(--badge-red-bg)" }}>
                <UserX size={11} /> Deactivate
              </button>
            )}
            {!isSelf && row.status === "inactive" && (
              <button onClick={() => handleStatus(row.id, "active")}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded"
                style={{ color: C.green, background: "var(--badge-green-bg)" }}>
                <UserCheck size={11} /> Activate
              </button>
            )}
            {!isSelf && (
              <button onClick={() => setDeleteId(row.id)} style={{ color: C.red }}><Trash2 size={13} /></button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── My Profile Card ── */}
      <div className="p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="text-[13px] font-semibold mb-3" style={{ color: C.textPrimary }}>My Profile</div>
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>{me?.name}</div>
            <div className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>{me?.email}</div>
            <div className="mt-2"><Badge value={me?.role} /></div>
          </div>
          <div className="flex flex-col gap-2" style={{ minWidth: 220 }}>
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Invoice Signature</div>
            <div
              className="rounded-lg flex items-center justify-center overflow-hidden"
              style={{ height: 72, background: C.bg, border: `1px solid ${C.border}` }}
            >
              {mySig
                ? <img src={mySig} alt="Signature" style={{ maxHeight: 62, maxWidth: "100%", objectFit: "contain" }} />
                : <span className="text-[11px]" style={{ color: C.textMuted }}>No signature uploaded</span>
              }
            </div>
            <div className="flex gap-2">
              <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }}
              >
                <Upload size={11} /> Upload
              </button>
              {mySig && (
                <button
                  type="button"
                  onClick={handleSaveSig}
                  disabled={sigSaving}
                  className="flex-1 flex items-center justify-center text-[11px] px-2 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: C.green, color: "#fff" }}
                >
                  {sigSaved ? "Saved!" : sigSaving ? "Saving…" : "Save"}
                </button>
              )}
              {mySig && (
                <button type="button" onClick={handleClearSig} style={{ color: C.red }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-[10px]" style={{ color: C.textMuted }}>Used as Authorized Signatory on Tax Invoices</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: C.textMuted }}>Invite team members and manage their access.</p>
        <Button onClick={() => { setForm(EMPTY_USER); setModal("invite"); }}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Invite User</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : <Table columns={columns} data={users} />}

      {modal === "invite" && (
        <Modal title="Invite User" onClose={() => setModal(null)} width="420px">
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <Input label="Full Name" value={form.name} onChange={field("name")} required placeholder="Jane Doe" />
            <Input label="Email" type="email" value={form.email} onChange={field("email")} required placeholder="jane@example.com" />
            <Select label="Role" value={form.role} onChange={field("role")}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <p className="text-[12px]" style={{ color: C.textMuted }}>An activation link will be sent to this email. Expires in 7 days.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Sending…" : "Send Invite"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete User" onClose={() => setDeleteId(null)} width="360px">
          <p style={{ color: C.textMuted, fontSize: 13 }}>This will permanently delete the user and revoke their access.</p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Company Tab ─────────────────────────────────────────────────────────────

const EMPTY_COMPANY = {
  legal_name: "", address: "", state: "", state_code: "", pin_code: "",
  gstin: "", email: "", phone: "", website: "",
  bank_account_name: "", bank_name: "", account_number: "", ifsc_code: "", upi_id: "",
  payment_instructions: "", default_payment_terms: "",
  signatory_name: "", signatory_designation: "", logo_data: "", seal_data: "",
};

function SectionHeading({ children }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-widest pt-2" style={{ color: C.textMuted }}>
      {children}
    </div>
  );
}

function CompanyTab() {
  const [form, setForm]     = useState(EMPTY_COMPANY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  const [saved, setSaved]    = useState(false);
  const logoInputRef         = useRef(null);
  const sealInputRef         = useRef(null);

  useEffect(() => {
    api.get("/settings/company")
      .then((r) => setForm({ ...EMPTY_COMPANY, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, logo_data: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSealUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Seal must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, seal_data: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/settings/company", form);
      setForm({ ...EMPTY_COMPANY, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || "Error saving company settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h2 className="text-[15px] font-semibold mb-0.5" style={{ color: C.textPrimary }}>Company Configuration</h2>
        <p className="text-[12px]" style={{ color: C.textMuted }}>These details appear on all generated invoices.</p>
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-2">
        <SectionHeading>Company Logo</SectionHeading>
        <div className="flex items-center gap-4">
          {form.logo_data ? (
            <img src={form.logo_data} alt="Logo" className="h-16 w-auto rounded-lg object-contain" style={{ border: `1px solid ${C.border}`, background: C.card, padding: 6 }} />
          ) : (
            <div className="h-16 w-24 rounded-lg flex items-center justify-center" style={{ border: `1px dashed ${C.border}`, background: C.card }}>
              <Building2 size={24} style={{ color: C.textMuted }} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button type="button" variant="secondary" onClick={() => logoInputRef.current?.click()}>
              <span className="flex items-center gap-1.5"><Upload size={13} /> {form.logo_data ? "Change Logo" : "Upload Logo"}</span>
            </Button>
            {form.logo_data && (
              <button type="button" className="text-[11px] hover:underline text-left" style={{ color: C.red }} onClick={() => setForm((f) => ({ ...f, logo_data: "" }))}>
                Remove
              </button>
            )}
            <span className="text-[11px]" style={{ color: C.textMuted }}>Max 2 MB · PNG, JPG, SVG</span>
          </div>
        </div>
      </div>

      {/* Business Identity */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Business Identity</SectionHeading>
        <Input label="Legal Business Name" value={form.legal_name} onChange={field("legal_name")} placeholder="e.g. Sixmend Technologies" />
        <Input label="GSTIN" value={form.gstin} onChange={field("gstin")} placeholder="e.g. 32AABCS1234A1Z5" />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="State" value={form.state} onChange={field("state")} placeholder="e.g. Kerala" />
          </div>
          <Input label="State Code" value={form.state_code} onChange={field("state_code")} placeholder="e.g. 32" />
        </div>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Registered Address</SectionHeading>
        <Textarea label="Address" value={form.address} onChange={field("address")} placeholder="Street, Building, Area" rows={2} />
        <Input label="PIN Code" value={form.pin_code} onChange={field("pin_code")} placeholder="e.g. 682001" />
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Contact Details</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Business Email" type="email" value={form.email} onChange={field("email")} placeholder="info@sixmend.com" />
          <Input label="Contact Number" value={form.phone} onChange={field("phone")} placeholder="+91 00000 00000" />
        </div>
        <Input label="Website" value={form.website} onChange={field("website")} placeholder="www.sixmend.com" />
      </div>

      {/* Bank Details */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Bank Account Details</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Account Name" value={form.bank_account_name} onChange={field("bank_account_name")} placeholder="Sixmend Technologies" />
          <Input label="Bank Name" value={form.bank_name} onChange={field("bank_name")} placeholder="e.g. HDFC Bank" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Account Number" value={form.account_number} onChange={field("account_number")} placeholder="0000000000" />
          <Input label="IFSC Code" value={form.ifsc_code} onChange={field("ifsc_code")} placeholder="HDFC0001234" />
        </div>
        <Input label="UPI ID" value={form.upi_id} onChange={field("upi_id")} placeholder="e.g. sixmend@hdfcbank" />
        <Textarea label="Payment Instructions" value={form.payment_instructions} onChange={field("payment_instructions")} placeholder="Additional payment instructions shown on invoices…" rows={2} />
      </div>

      {/* Invoice Defaults */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Invoice Defaults</SectionHeading>
        <Textarea label="Default Payment Terms" value={form.default_payment_terms} onChange={field("default_payment_terms")} placeholder="e.g. Payment due within 30 days of invoice date." rows={2} />
      </div>

      {/* Signatory */}
      <div className="flex flex-col gap-3">
        <SectionHeading>Authorised Signatory</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Signatory Name" value={form.signatory_name} onChange={field("signatory_name")} placeholder="e.g. Arun Kumar" />
          <Input label="Designation" value={form.signatory_designation} onChange={field("signatory_designation")} placeholder="e.g. Managing Director" />
        </div>
      </div>

      {/* Company Seal */}
      <div className="flex flex-col gap-2">
        <SectionHeading>Company Seal</SectionHeading>
        <p className="text-[11px]" style={{ color: C.textMuted }}>Appears next to the signature on Tax Invoices. Use a transparent PNG for best results.</p>
        <div className="flex items-center gap-4">
          {form.seal_data ? (
            <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.card }}>
              <img src={form.seal_data} alt="Seal" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: `2px dashed ${C.border}`, background: C.card }}>
              <Building2 size={22} style={{ color: C.textMuted }} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={handleSealUpload} />
            <Button type="button" variant="secondary" onClick={() => sealInputRef.current?.click()}>
              <span className="flex items-center gap-1.5"><Upload size={13} /> {form.seal_data ? "Change Seal" : "Upload Seal"}</span>
            </Button>
            {form.seal_data && (
              <button type="button" className="text-[11px] hover:underline text-left" style={{ color: C.red }} onClick={() => setForm((f) => ({ ...f, seal_data: "" }))}>
                Remove
              </button>
            )}
            <span className="text-[11px]" style={{ color: C.textMuted }}>Max 2 MB · PNG (transparent recommended)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        {saved && <span className="text-[12px]" style={{ color: C.green }}>Saved successfully</span>}
      </div>
    </form>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[18px] font-semibold" style={{ color: C.textPrimary }}>Settings</h1>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{ background: active ? C.green : "transparent", color: active ? "var(--btn-primary-text)" : C.textMuted }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "users"      && <UsersTab />}
        {activeTab === "appearance" && <AppearanceTab />}
        {activeTab === "fields"     && <FieldUpdateTab />}
        {activeTab === "company"    && <CompanyTab />}
      </div>
    </div>
  );
}
