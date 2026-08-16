import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import api from "../utils/api";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";
import CustomFieldsSection from "../components/ui/CustomFieldsSection";

const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY = { title: "", category: "Materials", amount: "", expense_date: TODAY, description: "", status: "pending", type: "debit", custom_data: {} };

const CATEGORIES = ["Materials", "Labor", "Equipment", "Travel", "Other"];

function useFieldCfg(module) {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    api.get(`/custom-fields?module=${module}`)
      .then((r) => {
        const map = {};
        r.data.filter((f) => f.is_system).forEach((f) => {
          map[f.field_key] = {
            visible: f.visible !== false,
            required: !!f.required,
            label: f.label,
            options: Array.isArray(f.options) ? f.options : [],
          };
        });
        setCfg(map);
      })
      .catch(() => setCfg({}));
  }, [module]);
  return (key, defReq = false) => ({
    visible: cfg === null || (cfg[key]?.visible ?? true),
    required: cfg === null ? defReq : (cfg[key]?.required ?? defReq),
    label: cfg?.[key]?.label ?? null,
    options: cfg?.[key]?.options ?? [],
  });
}

export default function Expenses() {
  const fc = useFieldCfg("expenses");
  const [activeTab, setActiveTab] = useState("debit");
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
    params.set("type", activeTab);
    api.get(`/expenses?${params}`)
      .then((r) => setExpenses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [search, categoryFilter, statusFilter, activeTab]);

  useEffect(() => {
    const handler = (e) => { if (e.detail.module === "expenses") fetchExpenses(); };
    window.addEventListener("sixportal:update", handler);
    return () => window.removeEventListener("sixportal:update", handler);
  }, [search, categoryFilter, statusFilter, activeTab]);

  const openAdd = () => { setForm({ ...EMPTY, type: activeTab }); setModal("add"); };
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
  const isDebit = activeTab === "debit";

  const columns = [
    { key: "id", label: "#", render: (v) => <span style={{ color: C.textMuted }}>#{v}</span> },
    { key: "title", label: "Title" },
    { key: "category", label: "Category", render: (v) => <Badge value={v?.toLowerCase()} /> },
    {
      key: "amount",
      label: "Amount",
      render: (v) => (
        <span style={{ color: isDebit ? C.red : C.green, fontWeight: 600 }}>
          {isDebit ? "-" : "+"}₹{parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
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
              Total: <span style={{ color: isDebit ? C.red : C.green, fontWeight: 600 }}>
                {isDebit ? "-" : "+"}₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              {" "}across {expenses.length} record{expenses.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add {isDebit ? "Debit" : "Credit"}</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center" style={{ borderBottom: `1px solid ${C.border}` }}>
        {["debit", "credit"].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCategoryFilter(""); setStatusFilter(""); setSearch(""); }}
            className="px-5 py-2.5 text-[13px] font-medium relative capitalize transition-colors"
            style={{ color: activeTab === tab ? C.textPrimary : C.textMuted }}
          >
            {tab === "debit" ? "Debit (Out)" : "Credit (In)"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: tab === "debit" ? C.red : C.green }} />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
            placeholder={`Search ${activeTab}s…`}
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
          {(fc("category").options.length > 0 ? fc("category").options : CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
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
        <Modal title={modal === "add" ? `Add ${form.type === "debit" ? "Debit" : "Credit"}` : "Edit Expense"} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Type selector */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
              {["debit", "credit"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className="flex-1 py-2 text-[13px] font-medium capitalize transition-colors"
                  style={{
                    background: form.type === t ? (t === "debit" ? C.red : C.green) : C.card,
                    color: form.type === t ? "#fff" : C.textMuted,
                  }}
                >
                  {t === "debit" ? "Debit (Out)" : "Credit (In)"}
                </button>
              ))}
            </div>

            {fc("title", true).visible && <Input label="Title" value={form.title} onChange={field("title")} required={fc("title", true).required} placeholder="Description" />}
            {(fc("category", true).visible || fc("amount", true).visible) && (
              <div className="grid grid-cols-2 gap-3">
                {fc("category", true).visible && (
                  <Select label={fc("category", true).label || "Category"} value={form.category} onChange={field("category")} required={fc("category", true).required}>
                    {(fc("category", true).options.length > 0 ? fc("category", true).options : CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
                {fc("amount", true).visible && <Input label="Amount (₹)" type="number" value={form.amount} onChange={field("amount")} required={fc("amount", true).required} placeholder="0.00" />}
              </div>
            )}
            {(fc("expense_date", true).visible || fc("status").visible) && (
              <div className="grid grid-cols-2 gap-3">
                {fc("expense_date", true).visible && <Input label="Date" type="date" value={form.expense_date} onChange={field("expense_date")} required={fc("expense_date", true).required} />}
                {fc("status").visible && (
                  <Select label="Status" value={form.status} onChange={field("status")} required={fc("status").required}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                )}
              </div>
            )}
            {fc("description").visible && <Textarea label="Notes" value={form.description || ""} onChange={field("description")} required={fc("description").required} placeholder="Additional notes…" />}
            <CustomFieldsSection
              module="expenses"
              values={form.custom_data || {}}
              onChange={(cd) => setForm({ ...form, custom_data: cd })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Record" onClose={() => setDeleteId(null)} width="360px">
          <p style={{ color: C.textMuted, fontSize: 13 }}>Are you sure you want to delete this record?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
