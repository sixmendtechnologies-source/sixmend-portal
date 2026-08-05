import { useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, UserX, UserCheck,
  Users, Palette, Sun, Moon, Sliders, Pencil, X,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Input, Select } from "../components/ui/Input";
import { C } from "../utils/colors";

const TABS = [
  { key: "users", label: "User Management", icon: Users },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "fields", label: "Field Update", icon: Sliders },
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

const EMPTY_FIELD = { label: "", type: "text", required: false, options: [] };

function FieldUpdateTab() {
  const [module, setModule] = useState("enquiries");
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // "add" | "edit"
  const [form, setForm] = useState(EMPTY_FIELD);
  const [editId, setEditId] = useState(null);
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

  const openAdd = () => { setForm(EMPTY_FIELD); setEditId(null); setOptionInput(""); setModal("form"); };
  const openEdit = (f) => {
    setForm({ label: f.label, type: f.type, required: f.required, options: f.options || [] });
    setEditId(f.id);
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
    if (form.type === "select" && form.options.length === 0) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold mb-0.5" style={{ color: C.textPrimary }}>Field Update</h2>
          <p className="text-[12px]" style={{ color: C.textMuted }}>
            Add custom fields to module forms. They appear in the Add/Edit modal of each section.
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
            <button
              key={key}
              onClick={() => setModule(key)}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium transition-all"
              style={{
                background: active ? C.green : "transparent",
                color: active ? "var(--btn-primary-text)" : C.textMuted,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Fields list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : fields.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <p className="text-[13px]" style={{ color: C.textMuted }}>
            No custom fields yet for <strong>{FIELD_MODULES.find((m) => m.key === module)?.label}</strong>.
            Click <strong>Add Field</strong> to get started.
          </p>
        </div>
      ) : (
        <Table
          columns={[
            { key: "label", label: "Field Label", render: (v) => <span className="font-medium" style={{ color: C.textPrimary }}>{v}</span> },
            { key: "field_key", label: "Key", render: (v) => <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: C.border, color: C.textMuted }}>{v}</code> },
            { key: "type", label: "Type", render: (v) => <Badge value={v} /> },
            {
              key: "options", label: "Options",
              render: (v) => v?.length ? (
                <span className="text-[11px]" style={{ color: C.textMuted }}>{v.join(", ")}</span>
              ) : <span style={{ color: C.textMuted }}>—</span>,
            },
            {
              key: "required", label: "Required",
              render: (v) => <Badge value={v ? "yes" : "no"} />,
            },
            {
              key: "actions", label: "",
              render: (_, row) => (
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => openEdit(row)} style={{ color: C.textMuted }}><Pencil size={13} /></button>
                  <button onClick={() => setDeleteId(row.id)} style={{ color: C.red }}><Trash2 size={13} /></button>
                </div>
              ),
            },
          ]}
          data={fields}
        />
      )}

      {/* Add / Edit modal */}
      {modal === "form" && (
        <Modal title={editId ? "Edit Field" : "Add Custom Field"} onClose={() => setModal(null)} width="440px">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Field Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
              placeholder="e.g. Project URL"
            />
            <Select label="Field Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, options: [] })}>
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>

            {/* Options builder — only for select */}
            {form.type === "select" && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>
                  Options
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={optionInput}
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
                    <span
                      key={opt}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px]"
                      style={{ background: "var(--badge-teal-bg)", color: C.teal }}
                    >
                      {opt}
                      <button type="button" onClick={() => removeOption(opt)} className="hover:opacity-70">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Required toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-9 h-5 rounded-full relative transition-colors"
                style={{ background: form.required ? C.green : C.border }}
                onClick={() => setForm({ ...form, required: !form.required })}
              >
                <div
                  className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all"
                  style={{ left: form.required ? "18px" : "2px" }}
                />
              </div>
              <span className="text-[13px]" style={{ color: C.textPrimary }}>Required field</span>
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
            Deleting this field will not remove existing data stored against it. The field will no longer appear in the form.
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

  const fetchUsers = () => {
    setLoading(true);
    api.get("/users").then((r) => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

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
        {activeTab === "users" && <UsersTab />}
        {activeTab === "appearance" && <AppearanceTab />}
        {activeTab === "fields" && <FieldUpdateTab />}
      </div>
    </div>
  );
}
