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

const SOURCES = ["MechBook", "Stepney", "Sixmend", "CookBy", "General"];

const EMPTY = {
  title: "",
  description: "",
  source: "",
  contact_name: "",
  contact_number: "",
  gmail: "",
  priority: "medium",
  value: "",
  assigned_to: "",
};

export default function Enquiries() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchEnquiries = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (priorityFilter) params.set("priority", priorityFilter);
    api.get(`/enquiries?${params}`)
      .then((r) => {
        let data = r.data;
        if (stageFilter) data = data.filter((e) => e.stage === stageFilter);
        setEnquiries(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEnquiries(); }, [search, stageFilter, priorityFilter]);

  const openAdd = () => { setForm(EMPTY); setModal("add"); };
  const openEdit = (row, e) => {
    e.stopPropagation();
    setForm({
      ...row,
      source: row.source || "",
      contact_name: row.contact_name || "",
      contact_number: row.contact_number || "",
      gmail: row.gmail || "",
    });
    setModal("edit");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "add") await api.post("/enquiries", form);
      else await api.put(`/enquiries/${form.id}`, form);
      setModal(null);
      fetchEnquiries();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/enquiries/${deleteId}`);
      setDeleteId(null);
      fetchEnquiries();
    } catch {
      alert("Error deleting");
    }
  };

  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const columns = [
    { key: "id", label: "#", render: (v) => <span style={{ color: C.textMuted }}>#{v}</span> },
    { key: "title", label: "Subject" },
    { key: "source", label: "Source", render: (v) => v || <span style={{ color: C.textMuted }}>—</span> },
    { key: "stage", label: "Stage", render: (v) => <Badge value={v || "open"} /> },
    { key: "priority", label: "Priority", render: (v) => <Badge value={v} /> },
    {
      key: "value",
      label: "Value",
      render: (v) => v ? <span style={{ color: C.green }}>₹{parseFloat(v).toLocaleString("en-IN")}</span> : <span style={{ color: C.textMuted }}>—</span>,
    },
    { key: "assigned_to", label: "Assigned To", render: (v) => v || <span style={{ color: C.textMuted }}>—</span> },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => openEdit(row, e)} style={{ color: C.textMuted }}>
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
            style={{ color: C.red }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold" style={{ color: C.textPrimary }}>Enquiries</h1>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Enquiry</span>
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
            placeholder="Search enquiries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          <option value="open">Open</option>
          <option value="first_level_discussion">First Level Discussion</option>
          <option value="kick_off">Kick Off</option>
          <option value="agreement">Agreement</option>
          <option value="client">Client</option>
          <option value="lost">Lost</option>
        </select>
        <select
          className="px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={enquiries}
          onRowClick={(row) => navigate(`/enquiries/${row.id}`)}
        />
      )}

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Enquiry" : "Edit Enquiry"}
          onClose={() => setModal(null)}
          width="540px"
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input label="Subject" value={form.title} onChange={field("title")} required placeholder="Enquiry subject" />
            <Textarea label="Description" value={form.description || ""} onChange={field("description")} required placeholder="Describe the enquiry…" rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Source" value={form.source || ""} onChange={field("source")} required>
                <option value="">Select source</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Contact Name" value={form.contact_name || ""} onChange={field("contact_name")} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact Number" value={form.contact_number || ""} onChange={field("contact_number")} required placeholder="+91 98000 00000" />
              <Input label="Gmail" type="email" value={form.gmail || ""} onChange={field("gmail")} required placeholder="contact@gmail.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Priority" value={form.priority} onChange={field("priority")}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
              <Input label="Value (₹)" type="number" value={form.value} onChange={field("value")} placeholder="0.00" />
            </div>
            <Input label="Assigned To" value={form.assigned_to || ""} onChange={field("assigned_to")} placeholder="Team member name" />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Enquiry" onClose={() => setDeleteId(null)} width="360px">
          <p style={{ color: C.textMuted, fontSize: 13 }}>Are you sure you want to delete this enquiry?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
