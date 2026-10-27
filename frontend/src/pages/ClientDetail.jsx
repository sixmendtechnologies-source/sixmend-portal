import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, LayoutGrid, List,
  FileText, ExternalLink, Send, Clock, Download, Upload, FileDown,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import { C } from "../utils/colors";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Phase", "Payments", "Expenses", "Services", "Documents", "Comments"];

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
  if (n === 0) return "Indian Rupees Zero Only";
  return "Indian Rupees " + toWords(n).trim() + " Only";
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
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: C.textMuted }}>{label}</div>
      <div className="text-[13px]" style={{ color: isEmpty ? C.textMuted : C.textPrimary }}>{isEmpty ? "—" : value}</div>
    </div>
  );
}

// ─── Invoice HTML Generator ───────────────────────────────────────────────────

function buildInvoiceHTML(client, payment, form, ctx, logoBase64, co = {}) {
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
      <div style="font-size:14px;font-weight:700;color:#1a237e;margin-bottom:5px">${co.legal_name || "Sixmend Technologies"}</div>
      <div style="font-size:12px;color:#555;line-height:1.75">
        ${co.address ? `${co.address}<br>` : ""}
        ${(co.state || co.pin_code) ? `${[co.state, co.state_code ? `(${co.state_code})` : "", co.pin_code ? `— ${co.pin_code}` : ""].filter(Boolean).join(" ")}<br>` : ""}
        ${co.gstin ? `GSTIN: ${co.gstin}<br>` : ""}
        ${(co.phone || co.email) ? `${[co.phone, co.email].filter(Boolean).join(" · ")}<br>` : ""}
        ${co.website ? co.website : ""}
      </div>
    </td>
    <td style="vertical-align:top;text-align:right">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:8px">BILL TO</div>
      <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${client.name}</div>
      ${client.company ? `<div style="font-size:12px;color:#333;margin-bottom:2px">${client.company}</div>` : ""}
      ${client.address ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${client.address}</div>` : ""}
      ${(client.state || client.pin_code) ? `<div style="font-size:12px;color:#555;margin-bottom:2px">${[client.state, client.state_code ? `(${client.state_code})` : "", client.pin_code ? `— ${client.pin_code}` : ""].filter(Boolean).join(" ")}</div>` : ""}
      ${client.gstin   ? `<div style="font-size:12px;color:#555;margin-bottom:2px">GSTIN: ${client.gstin}</div>` : ""}
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
    <td style="padding:5px 16px;font-size:13px;color:#555">GST (${taxRate}%)</td>
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
        ${co.bank_account_name ? `<strong>A/C name:</strong> ${co.bank_account_name}<br>` : ""}
        ${co.bank_name ? `<strong>Bank:</strong> ${co.bank_name}<br>` : ""}
        ${co.account_number ? `<strong>A/C no:</strong> ${co.account_number}` : ""}${co.ifsc_code ? ` &nbsp;&nbsp;<strong>IFSC:</strong> ${co.ifsc_code}` : ""}${(co.account_number || co.ifsc_code) ? "<br>" : ""}
        ${form.mode ? `<strong>Mode:</strong> ${form.mode}<br>` : ""}
        ${co.payment_instructions ? `<span style="color:#777">${co.payment_instructions}</span>` : ""}
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

${(co.signatory_name || co.signatory_designation) ? `<div style="margin-bottom:20px;text-align:right">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:4px">AUTHORISED SIGNATORY</div>
  <div style="font-size:13px;font-weight:600;color:#333">${co.signatory_name || ""}</div>
  ${co.signatory_designation ? `<div style="font-size:11px;color:#777">${co.signatory_designation}</div>` : ""}
</div>` : ""}

<div style="border-top:1px solid #e8e8e8;padding-top:12px;text-align:center;font-size:11px;color:#aaa">
  ${co.legal_name || "Sixmend Technologies"}${co.website ? ` &middot; ${co.website}` : ""}${co.email ? ` &middot; ${co.email}` : ""}
</div>

</body></html>`;
}

// ─── Tax Invoice HTML Generator ───────────────────────────────────────────────

async function fetchLogoBase64(baseUrl) {
  try {
    const resp = await fetch(`${baseUrl}/sixmend-logo.png`);
    if (!resp.ok) return "";
    const blob = await resp.blob();
    return await new Promise(resolve => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch { return ""; }
}

function buildFinalInvoiceHTML(client, paidPayments, form, logoBase64, co = {}, invoiceUser = null, sigBase64 = null, baseUrl = "", sixmendLogoSrc = "") {
  const lineItems  = (form.items || []).filter(item => item.description || parseFloat(item.rate || item.amount || 0) > 0);
  const withCalc   = lineItems.map(item => {
    const qty     = parseFloat(item.qty || 1);
    const rate    = parseFloat(item.rate || item.amount || 0);
    const taxable = qty * rate;
    return { ...item, qty, rate, taxable };
  });
  const totalTaxable = withCalc.reduce((s, it) => s + it.taxable, 0);
  const taxRate      = parseFloat(form.tax_rate || 0);
  const isIntraState = !!(co.state && client.state && co.state.trim().toLowerCase() === client.state.trim().toLowerCase());
  const cgstRate     = isIntraState ? taxRate / 2 : 0;
  const sgstRate     = isIntraState ? taxRate / 2 : 0;
  const igstRate     = !isIntraState ? taxRate : 0;
  const cgstAmt      = totalTaxable * cgstRate / 100;
  const sgstAmt      = totalTaxable * sgstRate / 100;
  const invoiceTotal = totalTaxable + totalTaxable * taxRate / 100;

  const B  = "#0f3d73";
  const MU = "#5d6b7c";
  const LN = "#cfd6df";
  const TN = "#f2f6fb";

  const fmtN = n => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fr   = r => r % 1 === 0 ? String(r) : r.toFixed(2);

  const sigName = invoiceUser?.name || co.signatory_name || co.legal_name || "Sixmend Technologies";

  const coAddrLine = [
    co.address,
    [co.state, co.state_code ? `(${co.state_code})` : null, co.pin_code ? `– ${co.pin_code}` : null].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  const clientAddr = [
    client.company,
    client.address,
    [client.state, client.state_code ? `(${client.state_code})` : null, client.pin_code ? `– ${client.pin_code}` : null].filter(Boolean).join(" "),
  ].filter(Boolean);

  const payBullets = (form.payment_terms || "")
    .split("\n").filter(Boolean)
    .map(l => `<li style="margin:2px 0">${l.replace(/^[•\-]\s*/, "")}</li>`)
    .join("");

  const bankRows = [
    co.bank_account_name && ["Account name", co.bank_account_name],
    co.bank_name         && ["Bank",          co.bank_name],
    co.account_number    && ["Account no.",   co.account_number],
    co.ifsc_code         && ["IFSC",          co.ifsc_code],
    co.upi_id            && ["UPI",           co.upi_id],
  ].filter(Boolean);

  const placeOfSupply = form.place_of_supply
    || (client.state ? `${client.state}${client.state_code ? ` (${client.state_code})` : ""}` : "")
    || `<span style="color:#b3261e;font-weight:600">State name (code) – required</span>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Tax Invoice ${form.number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 portrait;margin:0}
body{font:13px/1.45 "Segoe UI",system-ui,Arial,sans-serif;color:#1b2430;background:#fff}
table{border-collapse:collapse;width:100%}
.sheet{width:794px;max-width:100%;margin:0 auto;padding:36px 40px 40px}
@media print{.sheet{padding:28px 32px 32px}}
</style>
</head><body><div class="sheet">

<!-- HEADER -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid ${B};padding-bottom:16px">
  <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0">
    <img src="${sixmendLogoSrc || baseUrl + '/sixmend-logo.png'}" alt="Sixmend Technologies"
     style="height:86px;width:auto;max-width:305px;object-fit:contain;object-position:left center;display:block;margin:0 0 0 -11px"
     onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
    <span style="display:none;font-size:30px;font-weight:800;letter-spacing:.04em;color:${B}">${(co.legal_name || "SIXMEND").toUpperCase()}</span>
    <div style="font-size:11.5px;color:${MU};line-height:1.6;margin:0">
      ${coAddrLine ? `${coAddrLine}<br>` : ""}${[co.gstin ? `GSTIN: ${co.gstin}` : null, co.pan ? `PAN: ${co.pan}` : null, co.phone, co.email].filter(Boolean).join("&nbsp;&nbsp;|&nbsp;&nbsp;")}
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0;padding-top:4px">
    <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:.08em;color:${B}">TAX INVOICE</h1>
    <div style="font-size:11px;color:${MU};margin-top:4px">Original for Recipient</div>
  </div>
</div>

<!-- META 4-col -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid ${LN};border-top:0;margin-bottom:0">
  <div style="padding:10px 12px;border-right:1px solid ${LN};font-size:11px;color:${MU}">Invoice No.<b style="display:block;color:#1b2430;font-size:13px;margin-top:3px">${form.number}</b></div>
  <div style="padding:10px 12px;border-right:1px solid ${LN};font-size:11px;color:${MU}">Invoice Date<b style="display:block;color:#1b2430;font-size:13px;margin-top:3px">${fmtDate(form.date)}</b></div>
  <div style="padding:10px 12px;border-right:1px solid ${LN};font-size:11px;color:${MU}">Due Date<b style="display:block;color:#1b2430;font-size:13px;margin-top:3px">${form.due_date ? fmtDate(form.due_date) : "—"}</b></div>
  <div style="padding:10px 12px;font-size:11px;color:${MU}">Reverse Charge<b style="display:block;color:#1b2430;font-size:13px;margin-top:3px">No</b></div>
</div>

<!-- PARTIES -->
<div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid ${LN};border-top:0;margin-bottom:0">
  <div style="padding:14px;font-size:12px">
    <div style="font-size:11px;color:${B};font-weight:700;margin-bottom:6px">Billed to</div>
    <p style="font-weight:700;font-size:13px;margin:2px 0">${client.name}</p>
    ${clientAddr.map(l => `<p style="margin:2px 0;color:#444">${l}</p>`).join("")}
    ${client.gstin ? `<p style="margin:2px 0;color:#444">GSTIN: ${client.gstin}</p>` : ""}
    ${(client.email || client.phone) ? `<p style="margin:2px 0;color:#444">${[client.email, client.phone ? `+91 ${client.phone}` : null].filter(Boolean).join("&nbsp;&nbsp;|&nbsp;&nbsp;")}</p>` : ""}
  </div>
  <div style="padding:14px;font-size:12px;border-left:1px solid ${LN}">
    <div style="font-size:11px;color:${B};font-weight:700;margin-bottom:6px">Supply details</div>
    ${form.project_name ? `<p style="margin:2px 0">Project: <b>${form.project_name}</b></p>` : ""}
    <p style="margin:2px 0;color:#444">Place of Supply: ${placeOfSupply}</p>
    <p style="margin:2px 0;color:#444">Date of Supply: ${fmtDate(form.handover_date || form.date)}</p>
    ${form.po_number ? `<p style="margin:2px 0;color:#444">PO Number: ${form.po_number}</p>` : ""}
  </div>
</div>

<!-- ITEMS TABLE -->
<table style="margin-top:18px;font-size:12px">
  <thead>
    <tr style="background:${B};color:#fff">
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:left;width:26px">#</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:left">Description</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:left;white-space:nowrap">HSN/SAC</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right">Qty</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right;white-space:nowrap">Rate (₹)</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right;white-space:nowrap">Taxable (₹)</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right">GST %</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right;white-space:nowrap">Tax (₹)</th>
      <th style="padding:8px 8px;font-weight:600;font-size:11px;text-align:right;white-space:nowrap">Total (₹)</th>
    </tr>
  </thead>
  <tbody>
    ${withCalc.map((it, i) => {
      const itemTax   = it.taxable * taxRate / 100;
      const itemTotal = it.taxable + itemTax;
      return `<tr>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN}">${i + 1}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN}">${it.description || "—"}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN}">${it.hsn || ""}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right">${it.qty}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right;white-space:nowrap">${fmtN(it.rate)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right;white-space:nowrap">${fmtN(it.taxable)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right">${taxRate}%</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right;white-space:nowrap">${fmtN(itemTax)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid ${LN};text-align:right;white-space:nowrap">${fmtN(itemTotal)}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>

<!-- SUMMARY -->
<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;margin-top:14px;align-items:start">
  <div>
    <div style="font-size:12px;padding:12px;background:${TN};border-left:3px solid ${B};line-height:1.6">
      <b>Amount in words:</b><br>${amountInWords(invoiceTotal)}
    </div>
  </div>
  <table style="font-size:12px">
    <tr><td style="border:0;padding:5px 8px;color:${MU}">Taxable value</td><td style="border:0;padding:5px 8px;text-align:right;white-space:nowrap">${inr(totalTaxable)}</td></tr>
    ${taxRate > 0 ? (isIntraState
      ? `<tr><td style="border:0;padding:5px 8px;color:${MU}">CGST @ ${fr(cgstRate)}%</td><td style="border:0;padding:5px 8px;text-align:right;white-space:nowrap">${inr(cgstAmt)}</td></tr>
         <tr><td style="border:0;padding:5px 8px;color:${MU}">SGST @ ${fr(sgstRate)}%</td><td style="border:0;padding:5px 8px;text-align:right;white-space:nowrap">${inr(sgstAmt)}</td></tr>`
      : `<tr><td style="border:0;padding:5px 8px;color:${MU}">IGST @ ${fr(igstRate)}%</td><td style="border:0;padding:5px 8px;text-align:right;white-space:nowrap">${inr(totalTaxable * igstRate / 100)}</td></tr>`)
      : ""}
    <tr>
      <td style="padding:8px;font-weight:700;font-size:14px;border-top:2px solid ${B}">Total invoice amount</td>
      <td style="padding:8px;font-weight:700;font-size:14px;text-align:right;white-space:nowrap;border-top:2px solid ${B}">${inr(invoiceTotal)}</td>
    </tr>
  </table>
</div>

${payBullets || bankRows.length > 0 ? `
<!-- PAYMENT TERMS + BANK DETAILS -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;font-size:11.5px">
  <div>
    ${payBullets ? `<div style="font-size:12px;color:${B};font-weight:700;margin-bottom:6px">Payment terms</div>
    <ul style="margin:0;padding-left:18px;line-height:1.7">${payBullets}</ul>` : ""}
  </div>
  <div>
    ${bankRows.length > 0 ? `<div style="font-size:12px;color:${B};font-weight:700;margin-bottom:6px">Bank details</div>
    <table style="margin:0">
      ${bankRows.map(([l, v]) => `<tr><td style="border:0;padding:2px 0;color:${MU};width:96px;vertical-align:top">${l}</td><td style="border:0;padding:2px 0">${v}</td></tr>`).join("")}
    </table>` : ""}
  </div>
</div>` : ""}

<!-- SIGNATURE -->
<div style="margin-top:24px;border:1px solid ${LN};padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-end;min-height:120px;font-size:11.5px">
  <div style="color:#444;line-height:1.6">
    Declaration: We certify that the particulars given are true and correct.<br>
    Subject to ${co.state || "Kottayam"} jurisdiction.
  </div>
  <div style="text-align:right">
    For <b>${(co.legal_name || "SIXMEND TECHNOLOGIES").toUpperCase()}</b>
    <div style="min-height:54px;display:flex;align-items:flex-end;justify-content:flex-end;gap:10px;margin:6px 0">
      ${sigBase64 ? `<img src="${sigBase64}" style="max-height:46px;max-width:114px;object-fit:contain;display:block">` : ""}
      ${co.seal_data ? `<img src="${co.seal_data}" style="max-height:58px;max-width:58px;object-fit:contain;display:block">` : ""}
    </div>
    Authorised Signatory<br>${sigName}${co.signatory_designation ? `, ${co.signatory_designation}` : ""}
  </div>
</div>

<!-- FOOTER -->
<div style="margin-top:16px;text-align:center;font-size:10.5px;color:${MU};border-top:1px solid ${LN};padding-top:10px">
  This is a computer-generated invoice. &nbsp;&nbsp; Thank you for your business. &nbsp;&nbsp; ${co.website || "www.sixmend.com"}
</div>

</div>

</body></html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function useCustomFields(module) {
  const [fields, setFields] = useState([]);
  useEffect(() => {
    api.get(`/custom-fields?module=${module}`).then((r) => setFields(r.data)).catch(() => {});
  }, [module]);
  return fields;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const customFields = useCustomFields("clients");

  const [client,    setClient]    = useState(null);
  const [phases,    setPhases]    = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comments,  setComments]  = useState([]);
  const [clientExpenses, setClientExpenses] = useState([]);
  const [services,  setServices]  = useState([]);
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

  // Client info editing
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm,    setClientForm]    = useState({});

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm,  setPaymentForm]  = useState(EMPTY_PAYMENT);

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState(null); // payment object
  const [invoiceForm,  setInvoiceForm]  = useState(() => mkInvoiceDefaults(null));

  // Final Invoice modal
  const [finalInvModal, setFinalInvModal] = useState(false);
  const [finalInvForm,  setFinalInvForm]  = useState({
    number: "", date: "", due_date: "", po_number: "",
    items: [{ description: "", hsn: "", qty: "1", rate: "" }],
    project_name: "", project_status: "Completed", handover_date: "",
    place_of_supply: "",
    tax_rate: "0",
    payment_terms: "• Balance payable on completion and handover, unless agreed otherwise in writing.\n• Pay by bank transfer or UPI and quote the invoice number.",
    notes: "",
  });

  // Project value modal
  const [valueModal, setValueModal] = useState(false);
  const [valueForm,  setValueForm]  = useState({ items: [{ description: "", amount: "" }], gst: "0" });

  // Document modal
  const [docModal,   setDocModal]   = useState(false);
  const [docForm,    setDocForm]    = useState(EMPTY_DOC);
  const [fileLabel,  setFileLabel]  = useState("");

  // Expense modal
  const [expModal,  setExpModal]  = useState(null); // null | "add" | expense object
  const TODAY_STR = new Date().toISOString().slice(0, 10);
  const EMPTY_EXP = { title: "", category: "General", amount: "", expense_date: TODAY_STR, description: "", status: "pending", type: "debit" };
  const [expForm,   setExpForm]   = useState(EMPTY_EXP);

  // Service modal
  const [svcModal,  setSvcModal]  = useState(null); // null | "add" | service object
  const EMPTY_SVC = { name: "", type: "domain", renewal_date: "", reminder_days: "30", cost: "", status: "active", notes: "" };
  const SVC_TYPES = ["domain", "ssl", "server", "mail", "other"];
  const [svcForm,   setSvcForm]   = useState(EMPTY_SVC);

  // Comment
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoBase64, setLogoBase64]     = useState("");
  const [companyCfg, setCompanyCfg]     = useState({});
  const [userSignature, setUserSignature] = useState(null);
  const [taxInvoices, setTaxInvoices]   = useState([]);

  // ─── Fetching ───────────────────────────────────────────────────────────────

  const fetchPhases    = () => api.get(`/clients/${id}/phases`).then((r) => setPhases(r.data));
  const fetchPayments  = () => api.get(`/clients/${id}/payments`).then((r) => setPayments(r.data));
  const fetchDocuments = () => api.get(`/clients/${id}/documents`).then((r) => setDocuments(r.data));
  const fetchComments  = () => api.get(`/clients/${id}/comments`).then((r) => setComments(r.data));
  const fetchClientExpenses = () => api.get(`/clients/${id}/expenses`).then((r) => setClientExpenses(r.data)).catch(() => {});
  const fetchServices      = () => api.get(`/clients/${id}/services`).then((r) => setServices(r.data)).catch(() => {});
  const fetchTaxInvoices   = () => api.get(`/clients/${id}/tax-invoices`).then((r) => setTaxInvoices(r.data)).catch(() => {});

  useEffect(() => {
    setLoading(true);
    api.get(`/clients/${id}`)
      .then((r) => setClient(r.data))
      .catch(() => setClient(null))
      .finally(() => setLoading(false));
    fetchPhases();
    fetchPayments();
    fetchDocuments();
    fetchComments();
    fetchClientExpenses();
    fetchServices();
    fetchTaxInvoices();
  }, [id]);

  useEffect(() => {
    api.get("/users/me").then((r) => setUserSignature(r.data.signature_data || null)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/settings/company")
      .then((r) => {
        setCompanyCfg(r.data || {});
        if (r.data?.logo_data) {
          setLogoBase64(r.data.logo_data);
        } else {
          fetch("/logo.jpeg")
            .then((res) => res.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => setLogoBase64(reader.result);
              reader.readAsDataURL(blob);
            })
            .catch(() => {});
        }
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
        message: logText.trim(), created_by: user?.name || "Admin",
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

  const openEditClient = () => {
    setClientForm({
      name:                  client.name                  || "",
      company:               client.company               || "",
      email:                 client.email                 || "",
      phone:                 client.phone                 || "",
      address:               client.address               || "",
      state:                 client.state                 || "",
      state_code:            client.state_code            || "",
      pin_code:              client.pin_code              || "",
      gstin:                 client.gstin                 || "",
      website:               client.website               || "",
      bank_account_name:     client.bank_account_name     || "",
      bank_name:             client.bank_name             || "",
      account_number:        client.account_number        || "",
      ifsc_code:             client.ifsc_code             || "",
      payment_instructions:  client.payment_instructions  || "",
      default_payment_terms: client.default_payment_terms || "",
      status:                client.status                || "active",
      notes:                 client.notes                 || "",
      custom_data:           client.custom_data           || {},
    });
    setEditingClient(true);
  };

  const handleSaveClientInfo = async (e) => {
    e.preventDefault();
    if (!clientForm.name?.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/clients/${id}`, {
        ...client,
        ...clientForm,
        total_value:      client.total_value,
        total_value_note: client.total_value_note,
      });
      setClient(data);
      setEditingClient(false);
    } catch { alert("Error saving client info"); }
    finally { setSaving(false); }
  };

  const handleSaveProjectValue = async (e) => {
    e.preventDefault();
    const items = (valueForm.items || []).filter(it => parseFloat(it.amount || 0) > 0);
    if (items.length === 0) { alert("Add at least one item with an amount"); return; }
    const subtotal = items.reduce((s, it) => s + parseFloat(it.amount || 0), 0);
    const gstPct   = parseFloat(valueForm.gst || 0);
    const gstAmt   = subtotal * gstPct / 100;
    const total    = subtotal + gstAmt;
    setSaving(true);
    try {
      const { data } = await api.put(`/clients/${id}`, {
        ...client,
        total_value:      total,
        total_value_note: `${items.length} item(s)${gstPct > 0 ? ` + ${gstPct}% GST` : ""}`,
        project_items:    items,
        project_gst:      gstPct || null,
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
      const defaults = mkInvoiceDefaults(payment);
      if (companyCfg.default_payment_terms) defaults.notes = companyCfg.default_payment_terms;
      setInvoiceForm({ ...defaults, number: data.invoice_number });
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
    const html = buildInvoiceHTML(client, invoiceModal, invoiceForm, ctx, logoBase64, companyCfg);
    const win = window.open("", "_blank", "width=900,height=1000");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 350);
  };

  const openFinalInvoice = async () => {
    const paidPayments = payments.filter((p) => p.status === "paid");
    try {
      const [settingsRes, userRes, taxInvRes] = await Promise.all([
        api.get("/settings/company"),
        api.get("/users/me"),
        api.get(`/clients/${id}/tax-invoices`),
      ]);
      const freshCo = settingsRes.data || {};
      setCompanyCfg(freshCo);
      if (freshCo.logo_data) setLogoBase64(freshCo.logo_data);
      setUserSignature(userRes.data.signature_data || null);
      const freshInvoices = taxInvRes.data || [];
      setTaxInvoices(freshInvoices);
      const activeInv = freshInvoices.find((inv) => inv.status === "active");
      if (activeInv) {
        alert(`Invoice ${activeInv.invoice_number} is currently active. Cancel it before generating a new invoice.`);
        return;
      }
    } catch {}
    try {
      const { data } = await api.post(`/clients/${id}/final-invoice`);
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);
      setFinalInvForm({
        number: data.invoice_number,
        date: today.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        po_number: "",
        items: Array.isArray(client.project_items) && client.project_items.length
          ? client.project_items.map(it => ({ description: it.description || "", hsn: it.hsn || "", qty: String(it.qty || "1"), rate: String(it.rate || it.amount || "") }))
          : [{ description: `Software Development, Implementation & Deployment for ${client.company || client.name}`, hsn: "", qty: "1", rate: String(client.total_value || "") }],
        project_name: client.company || client.name || "",
        project_status: "Completed",
        handover_date: today.toISOString().split("T")[0],
        place_of_supply: client.state ? `${client.state}${client.state_code ? ` (${client.state_code})` : ""}` : "",
        tax_rate: client.project_gst != null ? String(client.project_gst) : "0",
        payment_terms: companyCfg.default_payment_terms ||
          "• Balance payable on completion and handover, unless agreed otherwise in writing.\n• Pay by bank transfer or UPI and quote the invoice number.",
        notes: "",
      });
      setFinalInvModal(true);
    } catch (err) {
      alert(err.response?.data?.error || "Error generating tax invoice");
    }
  };

  const handlePrintFinalInvoice = async () => {
    const isCancelled = taxInvoices.some(
      (inv) => inv.invoice_number === finalInvForm.number && inv.status === "cancelled"
    );
    if (isCancelled) {
      alert(`Invoice ${finalInvForm.number} was cancelled. Close this modal and generate a new invoice.`);
      return;
    }
    const paidPayments = payments.filter((p) => p.status === "paid");
    let freshLogo = logoBase64;
    let freshCo = companyCfg;
    let freshSig = userSignature;
    try {
      const [settingsRes, userRes] = await Promise.all([
        api.get("/settings/company"),
        api.get("/users/me"),
      ]);
      freshCo = settingsRes.data || {};
      if (freshCo.logo_data) freshLogo = freshCo.logo_data;
      freshSig = userRes.data.signature_data || null;
    } catch {}
    const sixmendLogo = await fetchLogoBase64(window.location.origin);
    const html = buildFinalInvoiceHTML(client, paidPayments, finalInvForm, freshLogo, freshCo, user, freshSig, window.location.origin, sixmendLogo);
    const win = window.open("", "_blank", "width=900,height=1000");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 350);
    // Save to invoice history (silent — don't block print)
    const subtotal = (finalInvForm.items || []).reduce((s, it) => s + parseFloat(it.qty || 1) * parseFloat(it.rate || 0), 0);
    const taxRateN = parseFloat(finalInvForm.tax_rate || 0);
    const total = subtotal + subtotal * taxRateN / 100;
    try {
      await api.post(`/clients/${id}/tax-invoices`, {
        invoice_number: finalInvForm.number,
        invoice_date: finalInvForm.date,
        total_amount: total,
      });
      fetchTaxInvoices();
    } catch {}
  };

  const cancelTaxInvoice = async (invId) => {
    if (!confirm("Cancel this invoice? This action cannot be undone.")) return;
    try {
      await api.patch(`/clients/${id}/tax-invoices/${invId}/cancel`);
      fetchTaxInvoices();
    } catch { alert("Error cancelling invoice"); }
  };

  const downloadTaxInvoice = async (inv) => {
    let freshLogo = logoBase64;
    let freshCo = companyCfg;
    let freshSig = userSignature;
    let freshClient = client;
    try {
      const [settingsRes, userRes, clientRes] = await Promise.all([
        api.get("/settings/company"),
        api.get("/users/me"),
        api.get(`/clients/${id}`),
      ]);
      freshCo = settingsRes.data || {};
      if (freshCo.logo_data) freshLogo = freshCo.logo_data;
      freshSig = userRes.data.signature_data || null;
      if (clientRes.data) freshClient = clientRes.data;
    } catch {}
    const invDate = inv.invoice_date ? inv.invoice_date.split("T")[0] : "";
    const form = {
      number: inv.invoice_number,
      date: invDate,
      due_date: "",
      po_number: "",
      items: Array.isArray(freshClient.project_items) && freshClient.project_items.length
        ? freshClient.project_items.map((it) => ({ description: it.description || "", hsn: it.hsn || "", qty: String(it.qty || "1"), rate: String(it.rate || it.amount || "") }))
        : [{ description: `Software Development, Implementation & Deployment for ${freshClient.company || freshClient.name}`, hsn: "", qty: "1", rate: String(freshClient.total_value || "") }],
      project_name: freshClient.company || freshClient.name || "",
      project_status: "Completed",
      handover_date: invDate,
      place_of_supply: finalInvForm.place_of_supply || (freshClient.state ? `${freshClient.state}${freshClient.state_code ? ` (${freshClient.state_code})` : ""}` : ""),
      tax_rate: freshClient.project_gst != null ? String(freshClient.project_gst) : "0",
      payment_terms: freshCo.default_payment_terms ||
        "• Balance payable on completion and handover, unless agreed otherwise in writing.\n• Pay by bank transfer or UPI and quote the invoice number.",
      notes: "",
    };
    const paidPayments = payments.filter((p) => p.status === "paid");
    const sixmendLogo = await fetchLogoBase64(window.location.origin);
    const html = buildFinalInvoiceHTML(freshClient, paidPayments, form, freshLogo, freshCo, user, freshSig, window.location.origin, sixmendLogo);
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
      await api.post(`/clients/${id}/comments`, { author: user?.name || "Admin", body: commentText.trim() });
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
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Client Information</span>
            {!editingClient ? (
              <button onClick={openEditClient} className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: C.textMuted }}>
                <Pencil size={12} /> Edit
              </button>
            ) : null}
          </div>

          {editingClient ? (
            <form onSubmit={handleSaveClientInfo} className="flex flex-col gap-4">

              {/* Basic */}
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Basic Info</div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required placeholder="Client name" />
                <Input label="Legal Business Name" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} placeholder="Registered company name" />
                <Input label="Business Email" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} placeholder="email@example.com" />
                <Input label="Contact Number" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="+91 00000 00000" />
                <Input label="Website" value={clientForm.website} onChange={(e) => setClientForm({ ...clientForm, website: e.target.value })} placeholder="www.example.com" />
                <Select label="Status" value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </Select>
              </div>

              {/* Address */}
              <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Registered Address</div>
              </div>
              <Textarea label="Address" value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} rows={2} placeholder="Street, Building, Area" />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input label="State" value={clientForm.state} onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })} placeholder="e.g. Kerala" />
                </div>
                <Input label="State Code" value={clientForm.state_code} onChange={(e) => setClientForm({ ...clientForm, state_code: e.target.value })} placeholder="e.g. 32" />
              </div>
              <Input label="PIN Code" value={clientForm.pin_code} onChange={(e) => setClientForm({ ...clientForm, pin_code: e.target.value })} placeholder="e.g. 682001" />

              {/* Tax */}
              <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Tax Identity</div>
              </div>
              <Input label="GSTIN" value={clientForm.gstin} onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })} placeholder="e.g. 32AABCS1234A1Z5" />

              {/* Bank */}
              <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Bank Account Details</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Account Name" value={clientForm.bank_account_name} onChange={(e) => setClientForm({ ...clientForm, bank_account_name: e.target.value })} placeholder="Account holder name" />
                <Input label="Bank Name" value={clientForm.bank_name} onChange={(e) => setClientForm({ ...clientForm, bank_name: e.target.value })} placeholder="e.g. HDFC Bank" />
                <Input label="Account Number" value={clientForm.account_number} onChange={(e) => setClientForm({ ...clientForm, account_number: e.target.value })} placeholder="0000000000" />
                <Input label="IFSC Code" value={clientForm.ifsc_code} onChange={(e) => setClientForm({ ...clientForm, ifsc_code: e.target.value })} placeholder="HDFC0001234" />
              </div>
              <Textarea label="Payment Instructions" value={clientForm.payment_instructions} onChange={(e) => setClientForm({ ...clientForm, payment_instructions: e.target.value })} rows={2} placeholder="Additional payment instructions…" />

              {/* Invoice Defaults */}
              <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Invoice Defaults</div>
              </div>
              <Textarea label="Default Payment Terms" value={clientForm.default_payment_terms} onChange={(e) => setClientForm({ ...clientForm, default_payment_terms: e.target.value })} rows={2} placeholder="e.g. Payment due within 30 days of invoice date." />

              {/* Notes */}
              <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Notes</div>
              </div>
              <Textarea label="Internal Notes" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} rows={2} placeholder="Internal notes…" />

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <>
                  <div className="pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Additional Fields</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.map((f) => (
                      f.type === "textarea" ? (
                        <div key={f.id} className="col-span-2">
                          <Textarea label={f.label} value={clientForm.custom_data?.[f.field_key] || ""} onChange={(e) => setClientForm({ ...clientForm, custom_data: { ...clientForm.custom_data, [f.field_key]: e.target.value } })} rows={2} />
                        </div>
                      ) : f.type === "select" && Array.isArray(f.options) ? (
                        <Select key={f.id} label={f.label} value={clientForm.custom_data?.[f.field_key] || ""} onChange={(e) => setClientForm({ ...clientForm, custom_data: { ...clientForm.custom_data, [f.field_key]: e.target.value } })}>
                          <option value="">— Select —</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </Select>
                      ) : (
                        <Input key={f.id} label={f.label} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={clientForm.custom_data?.[f.field_key] || ""} onChange={(e) => setClientForm({ ...clientForm, custom_data: { ...clientForm.custom_data, [f.field_key]: e.target.value } })} />
                      )
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setEditingClient(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoField label="Name"               value={client.name} />
              <InfoField label="Legal Business Name" value={client.company} />
              <InfoField label="Business Email"      value={client.email} />
              <InfoField label="Contact Number"      value={client.phone} />
              <InfoField label="Website"             value={client.website} />
              <InfoField label="Status"              value={<Badge value={client.status} />} />
              {(client.address || client.state || client.pin_code) && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Registered Address</div>
                  </div>
                  <InfoField label="Address"    value={client.address} full />
                  <InfoField label="State"      value={client.state ? `${client.state}${client.state_code ? ` (${client.state_code})` : ""}` : null} />
                  <InfoField label="PIN Code"   value={client.pin_code} />
                </>
              )}
              {client.gstin && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Tax Identity</div>
                  </div>
                  <InfoField label="GSTIN" value={client.gstin} />
                </>
              )}
              {(client.bank_account_name || client.bank_name || client.account_number) && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Bank Account</div>
                  </div>
                  <InfoField label="Account Name"    value={client.bank_account_name} />
                  <InfoField label="Bank"            value={client.bank_name} />
                  <InfoField label="Account Number"  value={client.account_number} />
                  <InfoField label="IFSC"            value={client.ifsc_code} />
                  {client.payment_instructions && <InfoField label="Payment Instructions" value={client.payment_instructions} full />}
                </>
              )}
              {client.default_payment_terms && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Invoice Defaults</div>
                  </div>
                  <InfoField label="Default Payment Terms" value={client.default_payment_terms} full />
                </>
              )}
              {client.notes && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Notes</div>
                  </div>
                  <InfoField label="Internal Notes" value={client.notes} full />
                </>
              )}
              {customFields.length > 0 && client.custom_data && Object.keys(client.custom_data).length > 0 && (
                <>
                  <div className="col-span-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>Additional Fields</div>
                  </div>
                  {customFields.map((f) => (
                    <InfoField key={f.id} label={f.label} value={client.custom_data?.[f.field_key] || null} />
                  ))}
                </>
              )}
            </div>
          )}
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
            style={{ background: C.teal, color: "var(--btn-primary-text)" }}
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
          <tr style={{ borderBottom: `1px solid ${C.border}`, background: "var(--table-header-bg)" }}>
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
            {client.project_gst > 0 && (
              <div className="text-[10px]" style={{ color: C.textMuted }}>Amount incl. {client.project_gst}% GST</div>
            )}
            <button
              title="Edit project value"
              onClick={() => {
                setValueForm({
                  items: Array.isArray(client.project_items) && client.project_items.length
                    ? client.project_items.map(it => ({ description: it.description || "", amount: String(it.amount || "") }))
                    : [{ description: "", amount: "" }],
                  gst: client.project_gst != null ? String(client.project_gst) : "0",
                });
                setValueModal(true);
              }}
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
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={openFinalInvoice}>
            <span className="flex items-center gap-1.5"><FileDown size={13} /> Tax Invoice</span>
          </Button>
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
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: "var(--table-header-bg)" }}>
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
                          style={{ background: "var(--badge-green-bg)", color: C.green, border: "1px solid var(--color-green-border)" }}
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
        {/* ── Invoice History ── */}
        {taxInvoices.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>Invoice History</div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
              <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: "var(--table-header-bg)" }}>
                    {["Invoice #", "Date", "Amount", "By", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium" style={{ color: C.textMuted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taxInvoices.map((inv, i) => (
                    <tr key={inv.id} style={{ borderBottom: i < taxInvoices.length - 1 ? `1px solid ${C.border}` : "none", background: C.card }}>
                      <td className="px-4 py-3 font-medium" style={{ color: C.textPrimary }}>{inv.invoice_number}</td>
                      <td className="px-4 py-3" style={{ color: C.textMuted }}>{fmtDate(inv.invoice_date || inv.created_at)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: C.green }}>{inv.total_amount ? fmt(inv.total_amount) : "—"}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: C.textMuted }}>{inv.created_by || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: inv.status === "cancelled" ? `${C.red}22` : `${C.green}22`, color: inv.status === "cancelled" ? C.red : C.green }}>
                          {inv.status === "cancelled" ? "Cancelled" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status !== "cancelled" && (
                          <span className="flex items-center justify-end gap-3">
                            <button onClick={() => downloadTaxInvoice(inv)} className="flex items-center gap-1 text-[11px] hover:opacity-70 transition-opacity" style={{ color: C.textPrimary }}>
                              <Download size={12} /> Download
                            </button>
                            <button onClick={() => cancelTaxInvoice(inv.id)} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: C.red }}>
                              Cancel
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

  // ─── Client Expenses Tab ─────────────────────────────────────────────────────

  const handleSaveExp = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (expModal === "add") await api.post(`/clients/${id}/expenses`, expForm);
      else await api.put(`/clients/${id}/expenses/${expForm.id}`, expForm);
      setExpModal(null);
      setExpForm(EMPTY_EXP);
      fetchClientExpenses();
    } catch (err) { alert(err.response?.data?.error || "Error saving"); }
    finally { setSaving(false); }
  };

  const deleteClientExp = async (eid) => {
    if (!confirm("Delete this expense?")) return;
    try { await api.delete(`/clients/${id}/expenses/${eid}`); fetchClientExpenses(); }
    catch { alert("Error deleting"); }
  };

  const renderClientExpenses = () => {
    const expCats = ["General", ...new Set(clientExpenses.map((e) => e.category).filter(Boolean).filter((c) => c !== "General"))];
    return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px]" style={{ color: C.textMuted }}>
            {clientExpenses.length} record{clientExpenses.length !== 1 ? "s" : ""}
            {clientExpenses.length > 0 && (
              <> · Total: <span style={{ color: C.green, fontWeight: 600 }}>
                ₹{clientExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0).toLocaleString("en-IN")}
              </span></>
            )}
          </p>
        </div>
        <Button onClick={() => { setExpForm(EMPTY_EXP); setExpModal("add"); }}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Expense</span>
        </Button>
      </div>
      {clientExpenses.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: C.textMuted }}>No expenses yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clientExpenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: C.textPrimary }}>{exp.title}</div>
                <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: C.textMuted }}>
                  <Badge value={exp.category?.toLowerCase()} />
                  <span>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                </div>
              </div>
              <span className="text-[14px] font-bold" style={{ color: C.red }}>
                -₹{parseFloat(exp.amount).toLocaleString("en-IN")}
              </span>
              <Badge value={exp.status} />
              <button onClick={() => { setExpForm({ ...exp, expense_date: exp.expense_date?.slice(0, 10) || "" }); setExpModal(exp); }} style={{ color: C.textMuted }}><Pencil size={14} /></button>
              <button onClick={() => deleteClientExp(exp.id)} style={{ color: C.red }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {expModal && (
        <Modal title={expModal === "add" ? "Add Expense" : "Edit Expense"} onClose={() => setExpModal(null)} width="480px">
          <form onSubmit={handleSaveExp} className="flex flex-col gap-4">
            <Input label="Title" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} required placeholder="Expense description" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px]" style={{ color: C.textMuted }}>Category</label>
                <input
                  list="exp-cat-list"
                  value={expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                  placeholder="General"
                  className="px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                  style={{ background: "var(--color-bg)", border: `1px solid ${C.border}`, color: C.textPrimary }}
                  onFocus={(e) => (e.target.style.borderColor = C.green)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
                <datalist id="exp-cat-list">
                  {expCats.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <Input label="Amount (₹)" type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} required placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date" type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} required />
              <Select label="Status" value={expForm.status} onChange={(e) => setExpForm({ ...expForm, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
            <Textarea label="Notes" value={expForm.description || ""} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Additional notes…" />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setExpModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
  };

  // ─── Services Tab ─────────────────────────────────────────────────────────────

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const svcStatusColor = (svc) => {
    const d = daysUntil(svc.renewal_date);
    if (svc.status === "cancelled") return C.textMuted;
    if (d === null || d < 0) return C.red;
    if (d <= svc.reminder_days) return C.orange;
    return C.green;
  };

  const svcBadgeLabel = (svc) => {
    const d = daysUntil(svc.renewal_date);
    if (svc.status === "cancelled") return "Cancelled";
    if (d === null) return "—";
    if (d < 0) return "Expired";
    if (d === 0) return "Due today";
    if (d <= svc.reminder_days) return `Due in ${d}d`;
    return "Active";
  };

  const handleSaveSvc = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (svcModal === "add") await api.post(`/clients/${id}/services`, svcForm);
      else await api.put(`/clients/${id}/services/${svcModal.id}`, svcForm);
      setSvcModal(null);
      fetchServices();
    } catch (err) { alert(err.response?.data?.error || "Error saving"); }
    finally { setSaving(false); }
  };

  const deleteSvc = async (sid) => {
    if (!confirm("Delete this service?")) return;
    try { await api.delete(`/clients/${id}/services/${sid}`); fetchServices(); }
    catch { alert("Error deleting"); }
  };

  const renderServices = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px]" style={{ color: C.textMuted }}>{services.length} service{services.length !== 1 ? "s" : ""}</p>
        <Button onClick={() => { setSvcForm(EMPTY_SVC); setSvcModal("add"); }}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Add Service</span>
        </Button>
      </div>
      {services.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: C.textMuted }}>No services yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((svc) => {
            const d = daysUntil(svc.renewal_date);
            const color = svcStatusColor(svc);
            return (
              <div key={svc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: C.textPrimary }}>{svc.name}</div>
                  <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: C.textMuted }}>
                    <span className="capitalize">{svc.type}</span>
                    <span>·</span>
                    <span>Renews {svc.renewal_date ? new Date(svc.renewal_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                    {svc.cost && <><span>·</span><span>₹{parseFloat(svc.cost).toLocaleString("en-IN")}</span></>}
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{svcBadgeLabel(svc)}</span>
                <button onClick={() => { setSvcForm({ ...svc, renewal_date: svc.renewal_date?.slice(0, 10) || "", reminder_days: String(svc.reminder_days), cost: svc.cost || "" }); setSvcModal(svc); }} style={{ color: C.textMuted }}><Pencil size={14} /></button>
                <button onClick={() => deleteSvc(svc.id)} style={{ color: C.red }}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
      {svcModal && (
        <Modal title={svcModal === "add" ? "Add Service" : "Edit Service"} onClose={() => setSvcModal(null)} width="480px">
          <form onSubmit={handleSaveSvc} className="flex flex-col gap-4">
            <Input label="Service Name" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} required placeholder="e.g. example.com SSL" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={svcForm.type} onChange={(e) => setSvcForm({ ...svcForm, type: e.target.value })}>
                <option value="domain">Domain</option>
                <option value="ssl">SSL</option>
                <option value="server">Server</option>
                <option value="mail">Mail Account</option>
                <option value="other">Other</option>
              </Select>
              <Select label="Status" value={svcForm.status} onChange={(e) => setSvcForm({ ...svcForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Renewal Date" type="date" value={svcForm.renewal_date} onChange={(e) => setSvcForm({ ...svcForm, renewal_date: e.target.value })} required />
              <Input label="Remind (days before)" type="number" value={svcForm.reminder_days} onChange={(e) => setSvcForm({ ...svcForm, reminder_days: e.target.value })} placeholder="30" />
            </div>
            <Input label="Cost (₹)" type="number" value={svcForm.cost} onChange={(e) => setSvcForm({ ...svcForm, cost: e.target.value })} placeholder="Annual cost" />
            <Textarea label="Notes" value={svcForm.notes || ""} onChange={(e) => setSvcForm({ ...svcForm, notes: e.target.value })} placeholder="Provider, login info, etc…" />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setSvcModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Modal>
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
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#fb8c00", color: "#1a0800" }}>{(user?.name || "AD").slice(0, 2).toUpperCase()}</div>
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
            style={{ background: C.green, color: "var(--btn-primary-text)" }}>
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
        {tab === "Expenses"  && renderClientExpenses()}
        {tab === "Services"  && renderServices()}
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
              style={{ background: C.green, color: "var(--btn-primary-text)" }}>
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
                  <div className="grid gap-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ gridTemplateColumns: "1fr 120px 28px", background: "var(--table-header-bg)", color: C.textMuted }}>
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

      {/* ── Tax Invoice Modal ── */}
      {finalInvModal && (() => {
        const paidPayments   = payments.filter((p) => p.status === "paid");
        const subtotalAmt    = (finalInvForm.items || []).reduce((s, it) => s + parseFloat(it.qty || 1) * parseFloat(it.rate || 0), 0);
        const taxRate        = parseFloat(finalInvForm.tax_rate || 0);
        const tax            = subtotalAmt * (taxRate / 100);
        const invoiceTotal   = subtotalAmt + tax;
        const paidSoFar      = paidPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        const outstanding    = Math.max(0, invoiceTotal - paidSoFar);
        const setItem        = (idx, key, val) => {
          const items = finalInvForm.items.map((it, i) => i === idx ? { ...it, [key]: val } : it);
          setFinalInvForm({ ...finalInvForm, items });
        };
        const addItem        = () => setFinalInvForm({ ...finalInvForm, items: [...finalInvForm.items, { description: "", hsn: "", qty: "1", rate: "" }] });
        const removeItem     = (idx) => setFinalInvForm({ ...finalInvForm, items: finalInvForm.items.filter((_, i) => i !== idx) });
        return (
          <Modal title="Generate Tax Invoice" onClose={() => setFinalInvModal(false)} width="600px">
            <div className="flex flex-col gap-4">

              {/* Row 1: Invoice # + Issue Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Invoice Number</label>
                  <input readOnly value={finalInvForm.number} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Issue Date</label>
                  <input readOnly value={finalInvForm.date} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none cursor-not-allowed" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }} />
                </div>
              </div>

              {/* Row 2: Due Date + PO Number */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Due Date" type="date" value={finalInvForm.due_date} onChange={(e) => setFinalInvForm({ ...finalInvForm, due_date: e.target.value })} />
                <Input label="PO Number (optional)" value={finalInvForm.po_number} onChange={(e) => setFinalInvForm({ ...finalInvForm, po_number: e.target.value })} placeholder="e.g. PO-2024-001" />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium" style={{ color: C.textMuted }}>Invoice Items</label>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.green }}>
                    <Plus size={11} /> Add Row
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  <div className="grid text-[10px] font-semibold uppercase tracking-wide px-2 py-1.5" style={{ gridTemplateColumns: "1fr 80px 50px 100px 28px", background: "var(--table-header-bg)", color: C.textMuted }}>
                    <span>Description</span><span>HSN/SAC</span><span className="text-right">Qty</span><span className="text-right pr-2">Rate (₹)</span><span />
                  </div>
                  {(finalInvForm.items || []).map((item, idx) => (
                    <div key={idx} className="grid items-center" style={{ gridTemplateColumns: "1fr 80px 50px 100px 28px", borderTop: `1px solid ${C.border}` }}>
                      <input
                        value={item.description}
                        onChange={(e) => setItem(idx, "description", e.target.value)}
                        placeholder="e.g. Frontend Development"
                        className="px-2 py-2 text-[12px] outline-none bg-transparent"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <input
                        value={item.hsn || ""}
                        onChange={(e) => setItem(idx, "hsn", e.target.value)}
                        placeholder="998314"
                        className="px-2 py-2 text-[12px] outline-none bg-transparent"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => setItem(idx, "qty", e.target.value)}
                        placeholder="1"
                        className="px-2 py-2 text-[12px] outline-none bg-transparent text-right"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => setItem(idx, "rate", e.target.value)}
                        placeholder="0"
                        className="px-2 py-2 text-[12px] outline-none bg-transparent text-right"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <div className="flex items-center justify-center">
                        {(finalInvForm.items || []).length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} style={{ color: C.red }}>
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="grid px-2 py-2 text-[12px] font-semibold" style={{ gridTemplateColumns: "1fr 80px 50px 100px 28px", borderTop: `1px solid ${C.border}`, background: "var(--table-header-bg)" }}>
                    <span style={{ color: C.textMuted }}>Subtotal</span>
                    <span /><span /><span className="text-right pr-2" style={{ color: C.textPrimary }}>{fmt(subtotalAmt)}</span>
                    <span />
                  </div>
                </div>
              </div>

              {/* Project Name + Status */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Project Name" value={finalInvForm.project_name} onChange={(e) => setFinalInvForm({ ...finalInvForm, project_name: e.target.value })} placeholder="e.g. ERP System" />
                <div>
                  <label className="text-[12px] block mb-1" style={{ color: C.textMuted }}>Project Status</label>
                  <select value={finalInvForm.project_status} onChange={(e) => setFinalInvForm({ ...finalInvForm, project_status: e.target.value })} className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}>
                    <option>Completed</option>
                    <option>In Progress</option>
                    <option>Delivered</option>
                    <option>On Hold</option>
                  </select>
                </div>
              </div>

              {/* Handover Date */}
              <Input label="Completion / Handover Date" type="date" value={finalInvForm.handover_date} onChange={(e) => setFinalInvForm({ ...finalInvForm, handover_date: e.target.value })} />

              {/* Place of Supply */}
              <Input label="Place of Supply" value={finalInvForm.place_of_supply} onChange={(e) => setFinalInvForm({ ...finalInvForm, place_of_supply: e.target.value })} placeholder="e.g. Kerala (32)" />

              {/* GST Rate */}
              <Input label="GST / Tax Rate (%)" type="number" value={finalInvForm.tax_rate} onChange={(e) => setFinalInvForm({ ...finalInvForm, tax_rate: e.target.value })} placeholder="0" />

              {/* Payment Terms */}
              <Textarea label="Payment Terms" value={finalInvForm.payment_terms} onChange={(e) => setFinalInvForm({ ...finalInvForm, payment_terms: e.target.value })} rows={3} placeholder="• Payment terms…" />

              {/* Notes */}
              <Textarea label="Notes (optional)" value={finalInvForm.notes} onChange={(e) => setFinalInvForm({ ...finalInvForm, notes: e.target.value })} rows={2} placeholder="Any additional notes…" />

              {/* Summary + Download */}
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[12px]" style={{ color: C.textMuted }}>
                    Subtotal: <span style={{ color: C.textPrimary, fontWeight: 600 }}>{fmt(subtotalAmt)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="text-[11px]" style={{ color: C.textMuted }}>
                      GST ({taxRate}%): {fmt(tax)}
                    </div>
                  )}
                  <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                    Invoice Total: {fmt(invoiceTotal)}
                  </div>
                  <div className="text-[11px]" style={{ color: C.textMuted }}>
                    Paid: <span style={{ color: C.green, fontWeight: 500 }}>{fmt(paidSoFar)}</span>
                    &nbsp;·&nbsp; Balance Due: <span style={{ color: outstanding > 0 ? C.red : C.green, fontWeight: 500 }}>{fmt(outstanding)}</span>
                  </div>
                </div>
                <Button onClick={handlePrintFinalInvoice} disabled={subtotalAmt <= 0}>
                  <span className="flex items-center gap-1.5"><Download size={13} /> Download PDF</span>
                </Button>
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* ── Project Value Modal ── */}
      {valueModal && (() => {
        const vSubtotal = (valueForm.items || []).reduce((s, it) => s + parseFloat(it.amount || 0), 0);
        const vGst      = parseFloat(valueForm.gst || 0);
        const vGstAmt   = vSubtotal * vGst / 100;
        const vTotal    = vSubtotal + vGstAmt;
        const setVItem  = (idx, key, val) => {
          const items = valueForm.items.map((it, i) => i === idx ? { ...it, [key]: val } : it);
          setValueForm({ ...valueForm, items });
        };
        const addVItem  = () => setValueForm({ ...valueForm, items: [...valueForm.items, { description: "", amount: "" }] });
        const remVItem  = (idx) => setValueForm({ ...valueForm, items: valueForm.items.filter((_, i) => i !== idx) });
        return (
          <Modal title="Set Project Value" onClose={() => setValueModal(false)} width="520px">
            <form onSubmit={handleSaveProjectValue} className="flex flex-col gap-4">

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium" style={{ color: C.textMuted }}>Breakdown</label>
                  <button type="button" onClick={addVItem} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.green }}>
                    <Plus size={11} /> Add Row
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  <div className="grid text-[10px] font-semibold uppercase tracking-wide px-3 py-1.5" style={{ gridTemplateColumns: "1fr 130px 28px", background: "var(--table-header-bg)", color: C.textMuted }}>
                    <span>Description</span><span className="text-right pr-2">Amount (₹)</span><span />
                  </div>
                  {(valueForm.items || []).map((item, idx) => (
                    <div key={idx} className="grid items-center" style={{ gridTemplateColumns: "1fr 130px 28px", borderTop: `1px solid ${C.border}` }}>
                      <input
                        value={item.description}
                        onChange={(e) => setVItem(idx, "description", e.target.value)}
                        placeholder={`e.g. Module ${idx + 1}`}
                        className="px-3 py-2 text-[12.5px] outline-none bg-transparent"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => setVItem(idx, "amount", e.target.value)}
                        placeholder="0"
                        className="px-3 py-2 text-[12.5px] outline-none bg-transparent text-right"
                        style={{ color: C.textPrimary, borderRight: `1px solid ${C.border}` }}
                      />
                      <div className="flex items-center justify-center">
                        {(valueForm.items || []).length > 1 && (
                          <button type="button" onClick={() => remVItem(idx)} style={{ color: C.red }}><Trash2 size={11} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST + Live total */}
              <div className="flex items-end gap-3">
                <div style={{ width: 130 }}>
                  <Input label="GST %" type="number" value={valueForm.gst} onChange={(e) => setValueForm({ ...valueForm, gst: e.target.value })} placeholder="0" />
                </div>
                <div className="flex-1 rounded-lg px-4 py-3" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <div className="text-[11px]" style={{ color: C.textMuted }}>Subtotal: <span style={{ color: C.textPrimary }}>{fmt(vSubtotal)}</span></div>
                  {vGst > 0 && <div className="text-[11px]" style={{ color: C.textMuted }}>GST ({vGst}%): <span style={{ color: C.textPrimary }}>{fmt(vGstAmt)}</span></div>}
                  <div className="text-[14px] font-bold mt-0.5" style={{ color: C.blueLight }}>Total: {fmt(vTotal)}</div>
                  {vGst > 0 && <div className="text-[10px]" style={{ color: C.textMuted }}>Amount incl. GST</div>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setValueModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </Modal>
        );
      })()}

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
