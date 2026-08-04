import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import api from "../utils/api";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";

const EMPTY = { name: "", company: "", email: "", phone: "", address: "", status: "prospect", notes: "" };

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchClients = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/clients?${params}`)
      .then((r) => setClients(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [search, statusFilter]);

  const openAdd = () => { setForm(EMPTY); setModal("add"); };
  const openEdit = (row, e) => { e.stopPropagation(); setForm(row); setModal("edit"); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "add") await api.post("/clients", form);
      else await api.put(`/clients/${form.id}`, form);
      setModal(null);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/clients/${deleteId}`);
      setDeleteId(null);
      fetchClients();
    } catch {
      alert("Error deleting");
    }
  };

  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const columns = [
    { key: "id", label: "#", render: (v) => <span style={{ color: C.textMuted }}>#{v}</span> },
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status", render: (v) => <Badge value={v} /> },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => openEdit(row, e)} style={{ color: C.textMuted }}>
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }} style={{ color: C.red }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold" style={{ color: C.textPrimary }}>Clients</h1>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Client</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : (
        <Table columns={columns} data={clients} onRowClick={(row) => navigate(`/clients/${row.id}`)} />
      )}

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Add Client" : "Edit Client"} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name" value={form.name} onChange={field("name")} required placeholder="Full name" />
              <Input label="Company" value={form.company || ""} onChange={field("company")} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email" type="email" value={form.email || ""} onChange={field("email")} placeholder="email@example.com" />
              <Input label="Phone" value={form.phone || ""} onChange={field("phone")} placeholder="+1 234 567 8900" />
            </div>
            <Input label="Address" value={form.address || ""} onChange={field("address")} placeholder="Street, City, Country" />
            <Select label="Status" value={form.status} onChange={field("status")}>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Textarea label="Notes" value={form.notes || ""} onChange={field("notes")} placeholder="Any additional notes…" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Client" onClose={() => setDeleteId(null)} width="360px">
          <p style={{ color: C.textMuted, fontSize: 13 }}>Are you sure you want to delete this client? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
