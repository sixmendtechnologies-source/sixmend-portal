import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, LayoutGrid, List,
  FileText, ExternalLink, Send, Clock, Download, Upload, FileDown,
} from "lucide-react";
import api from "../utils/api";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Phase", "Payments", "Documents", "Comments"];

const PHASE_COLS = [
  { key: "todo",       label: "To Do",      color: C.blueLight },
  { key: "inprogress", label: "In Progress", color: C.orange },
  { key: "hold",       label: "Hold",        color: C.textMuted },
  { key: "completed",  label: "Completed",   color: C.green },
];

const EMPTY_PHASE   = { title: "", description: "", status: "todo", start_date: "", end_date: "" };
const EMPTY_PAYMENT = { title: "", amount: "", payment_date: "", status: "pending", notes: "", mode: "" };
const EMPTY_DOC     = { name: "", file_url: "", file_data: "", file_name: "", uploaded_by: "" };

function mkInvoiceDefaults(payment) {
  return {
    number: "",
    date: payment?.payment_date ? payment.payment_date.split("T")[0] : "",
    tax_rate: "0",
    upi: "sixmend@upi",
    mode: payment?.mode || "",
    notes: "Payment due within 30 days of invoice date.",
    items: [{ description: payment?.title || "", qty: "1", rate: payment?.amount ? String(payment.amount) : "" }],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function amountInWords(amount) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function toWords(n) {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + "Thousand " + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + "Lakh " + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + "Crore " + toWords(n % 10000000);
  }
  const n = Math.round(parseFloat(amount) || 0);
  if (n === 0) return "Zero Rupees Only";
  return "Rupees " + toWords(n).trim() + " Only";
}

function inr(n) {
  return "₹" + parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: C.textMuted }}>{label}</div>
      <div className="text-[20px] font-bold leading-tight" style={{ color: color || C.textPrimary }}>{value}</div>
    </div>
  );
}

function InfoField({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: C.textMuted }}>{label}</div>
      <div className="text-[13px]" style={{ color: value ? C.textPrimary : C.textMuted }}>{value || "—"}</div>
    </div>
  );
}

// ─── Invoice HTML Generator ───────────────────────────────────────────────────

function buildInvoiceHTML(client, payment, form, ctx, logoBase64) {
  const items = form.items && form.items.length > 0
    ? form.items
    : [{ description: payment.title, qty: 1, rate: payment.amount || 0 }];

  const sub     = items.reduce((s, it) => s + parseFloat(it.rate || 0), 0);
  const taxRate = parseFloat(form.tax_rate || 0);
  const tax     = sub * (taxRate / 100);
  const total = sub + tax;

  const statusBg    = payment.status === "paid" ? "#1565C0" : payment.status === "overdue" ? "#c62828" : "#e65100";
  const statusLabel = (payment.status || "pending").toUpperCase();

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="Sixmend" style="height:110px;width:auto">`
    : `<table cellpadding="0" cellspacing="0" style="width:auto"><tr>
        <td style="padding-right:10px;vertical-align:middle">
          <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#29B6F6"/>
              <stop offset="45%" stop-color="#1565C0"/>
              <stop offset="100%" stop-color="#0D47A1"/>
            </linearGradient></defs>
            <polygon points="50,5 93.3,27.5 93.3,72.5 50,95 6.7,72.5 6.7,27.5" fill="url(#hg)"/>
            <text x="50" y="67" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="40" font-weight="900" fill="white">S</text>
          </svg>
        </td>
        <td style="vertical-align:middle">
          <div style="font-size:18px;font-weight:900;color:#1a237e;letter-spacing:1px;line-height:1.1">SIXMEND</div>
          <div style="font-size:9px;font-weight:700;color:#1565C0;letter-spacing:3.5px;margin-top:2px">TECHNOLOGIES</div>
        </td>
      </tr></table>`;

  const metaCells = [
    `<td style="padding:10px 16px;font-size:12px;color:#555;white-space:nowrap;border-right:1px solid #e8e8e8">Issue date: <strong>${fmtDate(form.date)}</strong></td>`,
    `<td style="padding:10px 16px;text-align:right;white-space:nowrap"><span style="background:${statusBg};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:0.5px">${statusLabel}</span></td>`,
  ].filter(Boolean).join("");

  const itemRows = items.map(it => {
    const amt = parseFloat(it.rate || 0);
    return `<tr>
      <td style="padding:13px 16px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0">${it.description || ""}</td>
      <td style="padding:13px 16px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0">${inr(amt)}</td>
      <td style="padding:13px 16px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0">${inr(amt)}</td>
    </tr>`;
  }).join("");


  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Invoice ${form.number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 portrait;margin:0}
  body{font-family:Arial,sans-serif;color:#333;background:#fff;padding:40px 50px;font-size:13px}
  table{border-collapse:collapse;width:100%}
</style>
</head><body>

<table style="margin-bottom:20px">
  <tr>
    <td style="vertical-align:middle">${logoHtml}</td>
    <td style="text-align:right;vertical-align:middle">
      <div style="font-size:26px;font-weight:900;color:#1565C0;letter-spacing:4px;line-height:1">INVOICE</div>
      <div style="font-size:13px;color:#666;margin-top:5px;font-weight:500">${form.number}</div>
    </td>
  </tr>
</table>

<div style="height:3px;background:linear-gradient(to right,#1565C0,#42A5F5);margin-bottom:22px"></div>

<table style="margin-bottom:22px">
  <tr>
    <td style="vertical-align:top;width:48%">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:8px">FROM</div>
      <div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:5px">Sixmend Technologies</div>
      <div style="font-size:12px;color:#555;line-height:1.75">
        Line 1 — street / building<br>
        City, Kerala — PIN<br>
        +91 00000 00000 · info@sixmend.com<br>
        www.sixmend.com
      </div>
    </td>
    <td style="vertical-align:top;text-align:right">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:8px">BILL TO</div>
      <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${client.name}</div>
      ${client.company ? `<div style="font-size:12px;color:#333;margin-bottom:2px">${client.company}</div>` : ""}
      ${client.address ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${client.address}</div>` : ""}
      ${client.email   ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${client.email}</div>`   : ""}
      ${client.phone   ? `<div style="font-size:12px;color:#555">${client.phone}</div>`                    : ""}
    </td>
  </tr>
</table>

<table style="margin-bottom:22px;border:1px solid #e8e8e8;border-radius:4px">
  <tr>${metaCells}</tr>
</table>

<table style="margin-bottom:22px">
  <thead>
    <tr style="background:#E3F2FD">
      <th style="padding:11px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#1565C0;letter-spacing:0.5px">Description</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#1565C0;width:150px">Rate</th>
      <th style="padding:11px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#1565C0;width:150px">Amount</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<table style="margin-left:auto;width:310px;margin-bottom:20px">
  ${taxRate > 0 ? `<tr>
    <td style="padding:5px 16px;font-size:13px;color:#555">Subtotal</td>
    <td style="padding:5px 16px;font-size:13px;color:#555;text-align:right">${inr(sub)}</td>
  </tr>
  <tr>
    <td style="padding:5px 16px;font-size:13px;color:#555">Tax (${taxRate}%)</td>
    <td style="padding:5px 16px;font-size:13px;color:#555;text-align:right">${inr(tax)}</td>
  </tr>` : ""}
  <tr style="border-top:1px solid #e0e0e0">
    <td style="padding:10px 16px;font-size:17px;font-weight:700;color:#222"><strong>Total</strong></td>
    <td style="padding:10px 16px;font-size:17px;font-weight:700;color:#222;text-align:right"><strong>${inr(total)}</strong></td>
  </tr>
</table>

<div style="font-size:12px;color:#555;margin-bottom:20px">
  Amount in words: <strong>${amountInWords(total)}</strong>
</div>

<div style="border:1px solid #e8e8e8;border-radius:4px;padding:13px 16px;margin-bottom:20px">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:10px">PAYMENT DETAILS</div>
  <table><tr>
    <td style="vertical-align:top;width:65%">
      <div style="font-size:12px;color:#555;line-height:1.9">
        <strong>A/C name:</strong> Sixmend Technologies<br>
        <strong>Bank:</strong> Bank name<br>
        <strong>A/C no:</strong> 0000000000 &nbsp;&nbsp;<strong>IFSC:</strong> XXXX0000000
        ${form.mode ? `<br><strong>Mode:</strong> ${form.mode}` : ""}
      </div>
    </td>
    ${form.mode === "UPI" ? `<td style="vertical-align:top;text-align:right">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:4px">UPI</div>
      <div style="font-size:14px;font-weight:700;color:#1565C0">${form.upi || "sixmend@upi"}</div>
    </td>` : "<td></td>"}
  </tr></table>
</div>

${form.notes ? `<div style="margin-bottom:20px">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:6px">NOTES &amp; TERMS</div>
  <div style="font-size:12px;color:#555;line-height:1.75">${form.notes}</div>
</div>` : ""}

<div style="border-top:1px solid #e8e8e8;padding-top:12px;text-align:center;font-size:11px;color:#aaa">
  Sixmend Technologies &middot; www.sixmend.com &middot; info@sixmend.com
</div>

</body></html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [client,    setClient]    = useState(null);
  const [phases,    setPhases]    = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comments,  setComments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("Overview");
  const [boardView, setBoardView] = useState(true);

  // Phase modal
  const [phaseModal, setPhaseModal] = useState(null);
  const [phaseForm,  setPhaseForm]  = useState(EMPTY_PHASE);

  // Time log modal
  const [logModal,  setLogModal]  = useState(null); // { phaseId, phaseTitle }
  const [phaseLogs, setPhaseLogs] = useState([]);
  const [logText,   setLogText]   = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm,  setPaymentForm]  = useState(EMPTY_PAYMENT);

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState(null); // payment object
  const [invoiceForm,  setInvoiceForm]  = useState(() => mkInvoiceDefaults(null));

  // Project value modal
  const [valueModal, setValueModal] = useState(false);
  const [valueForm,  setValueForm]  = useState({ total_value: "", note: "" });

  // Document modal
  const [docModal,   setDocModal]   = useState(false);
  const [docForm,    setDocForm]    = useState(EMPTY_DOC);
  const [fileLabel,  setFileLabel]  = useState("");

  // Comment
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoBase64, setLogoBase64] = useState("");

  // ─── Fetching ───────────────────────────────────────────────────────────────

  const fetchPhases    = () => api.get(`/clients/${id}/phases`).then((r) => setPhases(r.data));
  const fetchPayments  = () => api.get(`/clients/${id}/payments`).then((r) => setPayments(r.data));
  const fetchDocuments = () => api.get(`/clients/${id}/documents`).then((r) => setDocuments(r.data));
  const fetchComments  = () => api.get(`/clients/${id}/comments`).then((r) => setComments(r.data));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/clients/${id}`).then((r) => setClient(r.data)),
      fetchPhases(), fetchPayments(), fetchDocuments(), fetchComments(),
    ]).catch(() => setClient(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/logo.jpeg")
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  // ─── Phase Handlers ─────────────────────────────────────────────────────────

  const handleSavePhase = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (phaseModal.mode === "add") await api.post(`/clients/${id}/phases`, phaseForm);
      else await api.put(`/clients/${id}/phases/${phaseForm.id}`, phaseForm);
      setPhaseModal(null);
      fetchPhases();
    } catch (err) { alert(err.response?.data?.error || "Error saving"); }
    finally { setSaving(false); }
  };

  const updatePhaseStatus = async (phase, status) => {
    try {
      await api.put(`/clients/${id}/phases/${phase.id}`, { ...phase, status });
      fetchPhases();
    } catch { alert("Error updating"); }
  };

  const deletePhase = async (phaseId) => {
    if (!confirm("Delete this task?")) return;
    try { await api.delete(`/clients/${id}/phases/${phaseId}`); fetchPhases(); }
    catch { alert("Error deleting"); }
  };

  // ─── Time Log Handlers ──────────────────────────────────────────────────────

  const openLogModal = async (phase) => {
    setLogModal({ phaseId: phase.id, phaseTitle: phase.title });
    setLogLoading(true);
    try {
      const { data } = await api.get(`/clients/${id}/phases/${phase.id}/logs`);
      setPhaseLogs(data);
    } finally { setLogLoading(false); }
  };

  const addLog = async () => {
    if (!logText.trim()) return;
    try {
      await api.post(`/clients/${id}/phases/${logModal.phaseId}/logs`, {
        message: logText.trim(), created_by: "Admin",
      });
      setLogText("");
      const { data } = await api.get(`/clients/${id}/phases/${logModal.phaseId}/logs`);
      setPhaseLogs(data);
      fetchPhases();
    } catch { alert("Error adding log"); }
  };

  const deleteLog = async (logId) => {
    if (!confirm("Delete this log entry?")) return;
    try {
      await api.delete(`/clients/${id}/phases/${logModal.phaseId}/logs/${logId}`);
      setPhaseLogs((prev) => prev.filter((l) => l.id !== logId));
      fetchPhases();
    } catch { alert("Error deleting"); }
  };

  // ─── Payment Handlers ───────────────────────────────────────────────────────

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (paymentModal.mode === "add") await api.post(`/clients/${id}/payments`, paymentForm);
      else await api.put(`/clients/${id}/payments/${paymentForm.id}`, paymentForm);
      setPaymentModal(null);
      fetchPayments();
    } catch (err) { alert(err.response?.data?.error || "Error saving"); }
    finally { setSaving(false); }
  };

  const deletePayment = async (pid) => {
    if (!confirm("Delete this payment?")) return;
    try { await api.delete(`/clients/${id}/payments/${pid}`); fetchPayments(); }
    catch { alert("Error deleting"); }
  };

  const handleSaveProjectValue = async (e) => {
    e.preventDefault();
    if (!valueForm.note.trim()) { alert("Note is required"); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/clients/${id}`, {
        ...client,
        total_value: valueForm.total_value || null,
        total_value_note: valueForm.note.trim(),
      });
      setClient(data);
      setValueModal(false);
    } catch { alert("Error saving project value"); }
    finally { setSaving(false); }
  };

  const openInvoice = async (payment) => {
    if (!payment.payment_date) {
      alert("Please set a payment date before generating an invoice.");
      return;
    }
    try {
      const { data } = await api.post(`/clients/${id}/payments/${payment.id}/invoice`);
      setInvoiceForm({ ...mkInvoiceDefaults(payment), number: data.invoice_number });
      setInvoiceModal(payment);
    } catch (err) {
      alert(err.response?.data?.error || "Error generating invoice");
    }
  };

  const handlePrintInvoice = () => {
    const effectiveValue = client.total_value != null
      ? parseFloat(client.total_value)
      : (client.enquiry_value != null ? parseFloat(client.enquiry_value) : null);
    const previouslyPaid = payments
      .filter((p) => p.id !== invoiceModal.id && p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const ctx = effectiveValue != null ? { totalValue: effectiveValue, previouslyPaid } : null;
    const html = buildInvoiceHTML(client, invoiceModal, invoiceForm, ctx, logoBase64);
    const win = window.open("", "_blank", "width=900,height=1000");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 350);
  };

  // ─── Document Handlers ──────────────────────────────────────────────────────

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5 MB"); return; }
    setFileLabel(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDocForm((prev) => ({
        ...prev,
        file_data: ev.target.result,
        file_name: file.name,
        name: prev.name || file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDoc = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clients/${id}/documents`, docForm);
      setDocModal(false);
      setDocForm(EMPTY_DOC);
      setFileLabel("");
      fetchDocuments();
    } catch (err) { alert(err.response?.data?.error || "Error saving"); }
    finally { setSaving(false); }
  };

  const handleDownloadDoc = async (doc) => {
    if (doc.file_name) {
      const { data } = await api.get(`/clients/${id}/documents/${doc.id}/download`);
      if (data.file_data) {
        const link = document.createElement("a");
        link.href = data.file_data;
        link.download = data.file_name || doc.name;
        link.click();
        return;
      }
    }
    if (doc.file_url) window.open(doc.file_url, "_blank");
  };

  const deleteDoc = async (did) => {
    if (!confirm("Delete this document?")) return;
    try { await api.delete(`/clients/${id}/documents/${did}`); fetchDocuments(); }
    catch { alert("Error deleting"); }
  };

  // ─── Comment Handlers ────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/clients/${id}/comments`, { author: "Admin", body: commentText.trim() });
      setCommentText("");
      fetchComments();
    } catch { alert("Error posting comment"); }
  };

  const deleteComment = async (cid) => {
    if (!confirm("Delete this comment?")) return;
    try { await api.delete(`/clients/${id}/comments/${cid}`); fetchComments(); }
    catch { alert("Error deleting"); }
  };

  // ─── Tab Content ─────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const completedPhases = phases.filter((p) => p.status === "completed").length;
    const totalPaid    = payments.filter((p) => p.status === "paid").reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const totalPending = payments.filter((p) => p.status === "pending").reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-5 grid grid-cols-2 gap-x-8 gap-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="col-span-2 flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Client Information</span>
            <Badge value={client.status} />
          </div>
          <InfoField label="Company" value={client.company} />
          <InfoField label="Email"   value={client.email} />
          <InfoField label="Phone"   value={client.phone} />
          <InfoField label="Address" value={client.address} />
          {client.notes && <InfoField label="Notes" value={client.notes} full />}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Tasks" value={phases.length} />
          <StatCard label="Completed"   value={completedPhases} color={C.green} />
          <StatCard label="Total Paid"  value={fmt(totalPaid)}    color={C.green} />
          <StatCard label="Pending"     value={fmt(totalPending)} color={C.orange} />
        </div>
        {phases.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: C.textMuted }}>Recent Tasks</div>
            {phases.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < Math.min(phases.length, 5) - 1 ? `1px solid ${C.border}` : "none" }}>
                <span className="text-[13px]" style={{ color: C.textPrimary }}>{p.title}</span>
                <Badge value={p.status} />
              </div>
            ))}
          </div>
        )}
        {comments.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: C.textMuted }}>Recent Comments</div>
            {[...comments].slice(-3).map((c) => (
              <div key={c.id} className="flex flex-col gap-1 mb-4 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium" style={{ color: C.textPrimary }}>{c.author}</span>
                  <span className="text-[11px]" style={{ color: C.textMuted }}>{fmtDate(c.created_at)}</span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: C.textMuted }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Phase Card (shared between board/list) ────────────────────────────────

  const PhaseActions = ({ phase, compact }) => (
    <div className="flex items-center gap-1.5">
      <button
        title="Time Log"
        onClick={() => openLogModal(phase)}
        className="relative flex items-center justify-center rounded hover:opacity-80 transition-opacity"
        style={{ color: C.teal }}
      >
        <Clock size={compact ? 12 : 13} />
        {phase.log_count > 0 && (
          <span
            className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold"
            style={{ background: C.teal, color: "#001a1a" }}
          >
            {phase.log_count}
          </span>
        )}
      </button>
      <button onClick={() => { setPhaseForm({ ...phase, start_date: phase.start_date?.split("T")[0] || "", end_date: phase.end_date?.split("T")[0] || "" }); setPhaseModal({ mode: "edit" }); }} style={{ color: C.textMuted }}>
        <Pencil size={compact ? 12 : 13} />
      </button>
      <button onClick={() => deletePhase(phase.id)} style={{ color: C.red }}>
        <Trash2 size={compact ? 12 : 13} />
      </button>
    </div>
  );

  const renderBoard = () => (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3" style={{ minWidth: `${PHASE_COLS.length * 272}px` }}>
        {PHASE_COLS.map((col) => {
          const cards = phases.filter((p) => p.status === col.key);
          return (
            <div key={col.key} className="flex flex-col gap-3 flex-1 min-w-[260px]">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: C.border, color: C.textMuted }}>{cards.length}</span>
                </div>
                <button onClick={() => { setPhaseForm({ ...EMPTY_PHASE, status: col.key }); setPhaseModal({ mode: "add" }); }} className="hover:opacity-70" style={{ color: C.textMuted }}>
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((phase) => (
                  <div key={phase.id} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div className="text-[13px] font-medium leading-snug" style={{ color: C.textPrimary }}>{phase.title}</div>
                    {phase.description && (
                      <div className="text-[12px] leading-relaxed line-clamp-2" style={{ color: C.textMuted }}>{phase.description}</div>
                    )}
                    {(phase.start_date || phase.end_date) && (
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: C.textMuted }}>
                        {phase.start_date && <span>Start: {fmtDate(phase.start_date)}</span>}
                        {phase.end_date   && <span>End: {fmtDate(phase.end_date)}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={phase.status}
                        onChange={(e) => updatePhaseStatus(phase, e.target.value)}
                        className="text-[11px] rounded px-1.5 py-0.5 outline-none"
                        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }}
                      >
                        {PHASE_COLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <PhaseActions phase={phase} compact />
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="rounded-xl py-6 text-center text-[12px]" style={{ border: `1px dashed ${C.border}`, color: C.textMuted }}>No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = () => (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
      <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#0d1117" }}>
            {["Task", "Status", "Start", "End", "Description", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-medium" style={{ color: C.textMuted }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: C.textMuted, background: C.card }}>No tasks yet</td></tr>
          ) : phases.map((phase, i) => (
            <tr key={phase.id} style={{ borderBottom: i < phases.length - 1 ? `1px solid ${C.border}` : "none", background: C.card }}>
              <td className="px-4 py-3 font-medium" style={{ color: C.textPrimary }}>{phase.title}</td>
              <td className="px-4 py-3"><Badge value={phase.status} /></td>
              <td className="px-4 py-3 text-[12px]" style={{ color: C.textMuted }}>{fmtDate(phase.start_date)}</td>
              <td className="px-4 py-3 text-[12px]" style={{ color: C.textMuted }}>{fmtDate(phase.end_date)}</td>
              <td className="px-4 py-3 max-w-[200px]"><span className="truncate block text-[12px]" style={{ color: C.textMuted }}>{phase.description || "—"}</span></td>
              <td className="px-4 py-3"><div className="flex justify-end"><PhaseActions phase={phase} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPhase = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {[{ icon: LayoutGrid, label: "Board", val: true }, { icon: List, label: "List", val: false }].map(({ icon: Icon, label, val }) => (
            <button key={label} onClick={() => setBoardView(val)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
              style={{ background: boardView === val ? C.border : "transparent", color: boardView === val ? C.textPrimary : C.textMuted }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <Button onClick={() => { setPhaseForm(EMPTY_PHASE); setPhaseModal({ mode: "add" }); }}>
          <span className="flex items-center gap-1.5"><Plus size={13} /> Add Task</span>
        </Button>
      </div>
      {boardView ? renderBoard() : renderList()}
    </div>
  );

  const renderPayments = () => {
    const total   = payments.reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const paid    = payments.filter((p) => p.status === "paid").reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const pending = payments.filter((p) => p.status === "pending").reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const overdue = payments.filter((p) => p.status === "overdue").reduce((a, p) => a + parseFloat(p.amount || 0), 0);
    const effectiveValue = client.total_value != null
      ? parseFloat(client.total_value)
      : (client.enquiry_value != null ? parseFloat(client.enquiry_value) : null);
    const remaining = effectiveValue != null ? effectiveValue - paid : null;
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3">
          {/* Total Project Value — editable */}
          <div className="rounded-xl p-4 flex flex-col gap-1 relative" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: C.textMuted }}>Total Project Value</div>
            <div className="text-[20px] font-bold leading-tight" style={{ color: C.blueLight }}>
              {effectiveValue != null ? fmt(effectiveValue) : <span className="text-[13px]" style={{ color: C.textMuted }}>Not set</span>}
            </div>
            {client.total_value_note && (
              <div className="text-[10px] truncate" style={{ color: C.textMuted }}>{client.total_value_note}</div>
            )}
            <button
              title="Edit project value"
              onClick={() => { setValueForm({ total_value: effectiveValue != null ? String(effectiveValue) : "", note: "" }); setValueModal(true); }}
              className="absolute top-3 right-3 hover:opacity-70 transition-opacity"
              style={{ color: C.textMuted }}
            >
              <Pencil size={12} />
            </button>
          </div>
          <StatCard label="Paid"      value={fmt(paid)}                                            color={C.green} />
          <StatCard label="Remaining" value={remaining != null ? fmt(remaining) : fmt(pending)} color={C.orange} />
          <StatCard label="Overdue"   value={fmt(overdue)}                                       color={C.red} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => { setPaymentForm(EMPTY_PAYMENT); setPaymentModal({ mode: "add" }); }}>
            <span className="flex items-center gap-1.5"><Plus size={13} /> Add Payment</span>
          </Button>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-[13px]" style={{ color: C.textMuted }}>No payments yet</div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#0d1117" }}>
                  {["Title", "Amount", "Date", "Status", "Notes", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium" style={{ color: C.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? `1px solid ${C.border}` : "none", background: C.card }}>
                    <td className="px-4 py-3" style={{ color: C.textPrimary }}>{p.title}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: C.green }}>{fmt(p.amount)}</td>
                    <td className="px-4 py-3" style={{ color: C.textMuted }}>{fmtDate(p.payment_date)}</td>
                    <td className="px-4 py-3"><Badge value={p.status} /></td>
                    <td className="px-4 py-3 max-w-[160px]"><span className="truncate block" style={{ color: C.textMuted }}>{p.notes || "—"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          title="Generate Invoice"
                          onClick={() => openInvoice(p)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#1a2a1a", color: C.green, border: `1px solid ${C.green}30` }}
                        >
                          <FileDown size={12} /> Invoice
                        </button>
                        <button onClick={() => { setPaymentForm({ ...p, payment_date: p.payment_date ? p.payment_date.split("T")[0] : "" }); setPaymentModal({ mode: "edit" }); }} style={{ color: C.textMuted }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deletePayment(p.id)} style={{ color: C.red }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDocuments = () => (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => { setDocForm(EMPTY_DOC); setFileLabel(""); setDocModal(true); }}>
          <span className="flex items-center gap-1.5"><Plus size={13} /> Add Document</span>
        </Button>
      </div>
      {documents.length === 0 ? (
        <div className="text-center py-12 text-[13px]" style={{ color: C.textMuted }}>No documents yet</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <FileText size={18} style={{ color: C.blueLight }} />
                </div>
                <button onClick={() => deleteDoc(doc.id)} style={{ color: C.textMuted }}><Trash2 size={13} /></button>
              </div>
              <div>
                <div className="text-[13px] font-medium mb-0.5" style={{ color: C.textPrimary }}>{doc.name}</div>
                <div className="text-[11px]" style={{ color: C.textMuted }}>
                  {doc.file_name && <span className="mr-1.5">{doc.file_name}</span>}
                  {doc.uploaded_by && `by ${doc.uploaded_by}`}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: C.textMuted }}>{fmtDate(doc.created_at)}</span>
                {(doc.file_name || doc.file_url) && (
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity"
                    style={{ color: C.blueLight }}
                  >
                    {doc.file_name ? <Download size={11} /> : <ExternalLink size={11} />}
                    {doc.file_name ? "Download" : "Open"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderComments = () => (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && (
        <div className="text-center py-8 text-[13px]" style={{ color: C.textMuted }}>No comments yet. Start the conversation below.</div>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3 p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: C.border, color: C.textPrimary }}>
            {c.author?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>{c.author}</span>
              <span className="text-[11px]" style={{ color: C.textMuted }}>{fmtDate(c.created_at)}</span>
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textMuted }}>{c.body}</p>
          </div>
          <button onClick={() => deleteComment(c.id)} className="flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: C.textMuted }}><Trash2 size={12} /></button>
        </div>
      ))}
      <div className="flex gap-3 p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: C.orange, color: "#1a0800" }}>AD</div>
        <div className="flex-1 flex gap-2 items-end">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            placeholder="Write a comment… (Enter to submit)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary }}
            onFocus={(e) => (e.target.style.borderColor = C.green)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <button onClick={handleAddComment} disabled={!commentText.trim()}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
            style={{ background: C.green, color: "#0a1208" }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: C.green, borderTopColor: "transparent" }} />
    </div>
  );

  if (!client) return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p style={{ color: C.textMuted }}>Client not found.</p>
      <Button variant="secondary" onClick={() => navigate("/clients")}>Back to Clients</Button>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/clients")} className="flex items-center gap-1 text-[13px] hover:opacity-70 transition-opacity" style={{ color: C.textMuted }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ color: C.border }}>|</span>
        <h1 className="text-[17px] font-semibold" style={{ color: C.textPrimary }}>{client.name}</h1>
        {client.company && <span className="text-[13px]" style={{ color: C.textMuted }}>{client.company}</span>}
        <Badge value={client.status} />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center" style={{ borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2.5 text-[13px] font-medium relative transition-colors" style={{ color: tab === t ? C.textPrimary : C.textMuted }}>
            {t}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t" style={{ background: C.green }} />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === "Overview"  && renderOverview()}
        {tab === "Phase"     && renderPhase()}
        {tab === "Payments"  && renderPayments()}
        {tab === "Documents" && renderDocuments()}
        {tab === "Comments"  && renderComments()}
      </div>

      {/* ── Phase Modal ── */}
      {phaseModal && (
        <Modal title={phaseModal.mode === "add" ? "Add Task" : "Edit Task"} onClose={() => setPhaseModal(null)} width="520px">
          <form onSubmit={handleSavePhase} className="flex flex-col gap-4">
            <Input label="Title" value={phaseForm.title} onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })} required placeholder="Task title" />
            <Textarea label="Description" value={phaseForm.description || ""} onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })} placeholder="Task description…" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={phaseForm.start_date || ""} onChange={(e) => setPhaseForm({ ...phaseForm, start_date: e.target.value })} />
              <Input label="End Date"   type="date" value={phaseForm.end_date   || ""} onChange={(e) => setPhaseForm({ ...phaseForm, end_date:   e.target.value })} />
            </div>
            <Select label="Status" value={phaseForm.status} onChange={(e) => setPhaseForm({ ...phaseForm, status: e.target.value })}>
              {PHASE_COLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setPhaseModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Time Log Modal ── */}
      {logModal && (
        <Modal title={`Time Log — ${logModal.phaseTitle}`} onClose={() => { setLogModal(null); setPhaseLogs([]); setLogText(""); }} width="520px">
          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto">
            {logLoading && <div className="text-center py-4 text-[13px]" style={{ color: C.textMuted }}>Loading…</div>}
            {!logLoading && phaseLogs.length === 0 && (
              <div className="text-center py-4 text-[13px]" style={{ color: C.textMuted }}>No logs yet. Add the first update below.</div>
            )}
            {phaseLogs.map((log) => (
              <div key={log.id} className="flex gap-3 p-3 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: C.border, color: C.textPrimary }}>
                  {log.created_by?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium" style={{ color: C.textPrimary }}>{log.created_by}</span>
                    <span className="text-[10px]" style={{ color: C.textMuted }}>{fmtDate(log.created_at)}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textMuted }}>{log.message}</p>
                </div>
                <button onClick={() => deleteLog(log.id)} className="flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: C.textMuted }}><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end pt-1 border-t" style={{ borderColor: C.border }}>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addLog(); } }}
              placeholder="Add a status update… (Enter to submit)"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary }}
              onFocus={(e) => (e.target.style.borderColor = C.green)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <button onClick={addLog} disabled={!logText.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
              style={{ background: C.green, color: "#0a1208" }}>
              <Send size={14} />
            </button>
          </div>
        </Modal>
      )}

      {/* ── Payment Modal ── */}
      {paymentModal && (
        <Modal title={paymentModal.mode === "add" ? "Add Payment" : "Edit Payment"} onClose={() => setPaymentModal(null)}>
          <form onSubmit={handleSavePayment} className="flex flex-col gap-4">
            <Input label="Title" value={paymentForm.title} onChange={(e) => setPaymentForm({ ...paymentForm, title: e.target.value })} required placeholder="e.g. Milestone 1 payment" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount (₹)" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required placeholder="0.00" />
              <Input label="Date" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Status" value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
              <Select label="Mode" value={paymentForm.mode || ""} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                <option value="">Select mode</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="NetBanking">NetBanking</option>
                <option value="Cash">Cash</option>
              </Select>
            </div>
            <Textarea label="Notes" value={paymentForm.notes || ""} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Payment notes…" rows={2} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Invoice Modal ── */}
      {invoiceModal && (() => {
        const modalSub   = (invoiceForm.items || []).reduce((s, it) => s + parseFloat(it.rate || 0), 0);
        const modalTax   = modalSub * (parseFloat(invoiceForm.tax_rate || 0) / 100);
        const modalTotal = modalSub + modalTax;
        return (
          <Modal title="Generate Invoice" onClose={() => setInvoiceModal(null)} width="600px">
            <div className="flex flex-col gap-4">

              {/* Row 1: Invoice # + Issue Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Invoice Number</label>
                  <input readOnly value={invoiceForm.number} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Issue Date</label>
                  <input readOnly value={invoiceForm.date} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
              </div>

              {/* Row 2: Client + Mode (readonly) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Client Name</label>
                  <input readOnly value={client.name} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Payment Mode</label>
                  <input readOnly value={invoiceForm.mode || "—"} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium" style={{ color: C.textMuted }}>Line Items</label>
                  <button type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, items: [...(invoiceForm.items || []), { description: "", qty: "1", rate: "" }] })}
                    className="flex items-center gap-1 text-[12px] hover:opacity-70 transition-opacity"
                    style={{ color: C.green }}
                  >
                    <Plus size={12} /> Add row
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  <div className="grid gap-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ gridTemplateColumns: "1fr 120px 28px", background: "#0d1117", color: C.textMuted }}>
                    <span>Description</span><span className="text-right">Amount (₹)</span><span />
                  </div>
                  {(invoiceForm.items || []).map((item, idx) => (
                    <div key={idx} className="grid gap-0" style={{ gridTemplateColumns: "1fr 120px 28px", borderTop: `1px solid ${C.border}` }}>
                      <input
                        value={item.description}
                        onChange={(e) => { const its = [...invoiceForm.items]; its[idx] = { ...item, description: e.target.value }; setInvoiceForm({ ...invoiceForm, items: its }); }}
                        placeholder="Description"
                        className="px-3 py-2 text-[12px] outline-none bg-transparent"
                        style={{ color: C.textPrimary }}
                      />
                      <input
                        type="number" value={item.rate}
                        onChange={(e) => { const its = [...invoiceForm.items]; its[idx] = { ...item, rate: e.target.value }; setInvoiceForm({ ...invoiceForm, items: its }); }}
                        placeholder="0.00"
                        className="px-3 py-2 text-[12px] outline-none bg-transparent text-right"
                        style={{ color: C.textPrimary, borderLeft: `1px solid ${C.border}` }}
                      />
                      <div className="flex items-center justify-center" style={{ borderLeft: `1px solid ${C.border}` }}>
                        {(invoiceForm.items || []).length > 1 && (
                          <button type="button" onClick={() => { const its = invoiceForm.items.filter((_, i) => i !== idx); setInvoiceForm({ ...invoiceForm, items: its }); }} style={{ color: C.red }}>
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax + UPI */}
              <div className={`grid gap-3 ${invoiceForm.mode === "UPI" ? "grid-cols-2" : "grid-cols-1"}`}>
                <Input label="GST / Tax Rate (%)" type="number" value={invoiceForm.tax_rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })} placeholder="0" />
                {invoiceForm.mode === "UPI" && (
                  <Input label="UPI ID" value={invoiceForm.upi} onChange={(e) => setInvoiceForm({ ...invoiceForm, upi: e.target.value })} placeholder="sixmend@upi" />
                )}
              </div>

              <Textarea label="Notes & Terms" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={2} placeholder="Payment terms, notes…" />

              {/* Summary + Download */}
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div>
                  <div className="text-[12px] font-medium" style={{ color: C.textPrimary }}>
                    Total: {fmt(modalTotal)}
                  </div>
                  {parseFloat(invoiceForm.tax_rate || 0) > 0 && (
                    <div className="text-[11px]" style={{ color: C.textMuted }}>
                      Subtotal {fmt(modalSub)} + {invoiceForm.tax_rate}% tax = {fmt(modalTotal)}
                    </div>
                  )}
                </div>
                <Button onClick={handlePrintInvoice}>
                  <span className="flex items-center gap-1.5"><Download size={13} /> Download PDF</span>
                </Button>
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* ── Project Value Modal ── */}
      {valueModal && (
        <Modal title="Edit Project Value" onClose={() => setValueModal(false)} width="420px">
          <form onSubmit={handleSaveProjectValue} className="flex flex-col gap-4">
            <Input label="Total Project Value (₹)" type="number" value={valueForm.total_value} onChange={(e) => setValueForm({ ...valueForm, total_value: e.target.value })} placeholder="e.g. 500000" />
            <Textarea label="Reason / Note *" value={valueForm.note} onChange={(e) => setValueForm({ ...valueForm, note: e.target.value })} required placeholder="e.g. Value updated per signed agreement" rows={2} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setValueModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Document Modal ── */}
      {docModal && (
        <Modal title="Add Document" onClose={() => { setDocModal(false); setFileLabel(""); }} width="500px">
          <form onSubmit={handleSaveDoc} className="flex flex-col gap-4">
            <Input label="Document Name" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} required placeholder="e.g. Project Proposal v1" />

            {/* File upload */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px]" style={{ color: C.textMuted }}>Upload File <span style={{ color: C.textMuted }}>(max 5 MB)</span></label>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors hover:opacity-80"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: fileLabel ? C.textPrimary : C.textMuted }}
              >
                <Upload size={14} />
                {fileLabel || "Choose file…"}
              </button>
            </div>

            <Input label="URL / Link (optional)" value={docForm.file_url || ""} onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })} placeholder="https://drive.google.com/…" />
            <Input label="Uploaded By" value={docForm.uploaded_by || ""} onChange={(e) => setDocForm({ ...docForm, uploaded_by: e.target.value })} placeholder="Your name" />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => { setDocModal(false); setFileLabel(""); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
