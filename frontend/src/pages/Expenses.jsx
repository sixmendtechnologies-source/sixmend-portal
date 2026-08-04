import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import api from "../utils/api";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";

const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY = { title: "", category: "Materials", amount: "", expense_date: TODAY, description: "", status: "pending" };

const CATEGORIES = ["Materials", "Labor", "Equipment", "Travel", "Other"];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchExpenses = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/expenses?${params}`)
      .then((r) => setExpenses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [search, categoryFilter, statusFilter]);

  const openAdd = () => { setForm(EMPTY); setModal("add"); };
  const openEdit = (row) => {
    setForm({
      ...row,
      expense_date: row.expense_date ? row.expense_date.slice(0, 10) : TODAY,
      amount: row.amount?.toString() || "",
    });
    setModal("edit");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "add") await api.post("/expenses", form);
      else await api.put(`/expenses/${form.id}`, form);
      setModal(null);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteId}`);
      setDeleteId(null);
      fetchExpenses();
    } catch {
      alert("Error deleting");
    }
  };

  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const columns = [
    { key: "id", label: "#", render: (v) => <span style={{ color: C.textMuted }}>#{v}</span> },
    { key: "title", label: "Title" },
    { key: "category", label: "Category", render: (v) => <Badge value={v?.toLowerCase()} /> },
    {
      key: "amount",
      label: "Amount",
      render: (v) => <span style={{ color: C.green, fontWeight: 600 }}>${parseFloat(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: "expense_date",
      label: "Date",
      render: (v) => v ? new Date(v).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    },
    { key: "status", label: "Status", render: (v) => <Badge value={v} /> },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} style={{ color: C.textMuted }}>
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
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: C.textPrimary }}>Expenses</h1>
          {expenses.length > 0 && (
            <p className="text-[12px] mt-0.5" style={{ color: C.textMuted }}>
              Total: <span style={{ color: C.green, fontWeight: 600 }}>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              {" "}across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Expense</span>
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
        </div>
      ) : (
        <Table columns={columns} data={expenses} />
      )}

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Add Expense" : "Edit Expense"} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input label="Title" value={form.title} onChange={field("title")} required placeholder="Expense description" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category" value={form.category} onChange={field("category")} required>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input label="Amount ($)" type="number" value={form.amount} onChange={field("amount")} required placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date" type="date" value={form.expense_date} onChange={field("expense_date")} required />
              <Select label="Status" value={form.status} onChange={field("status")}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <Textarea label="Notes" value={form.description || ""} onChange={field("description")} placeholder="Additional notes…" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Expense" onClose={() => setDeleteId(null)} width="360px">
          <p style={{ color: C.textMuted, fontSize: 13 }}>Are you sure you want to delete this expense?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
