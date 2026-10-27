import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

// ─── Phases ──────────────────────────────────────────────────────────────────

router.get("/phases", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, COUNT(l.id)::int AS log_count
       FROM client_phases p
       LEFT JOIN phase_time_logs l ON l.phase_id = p.id
       WHERE p.client_id = $1
       GROUP BY p.id
       ORDER BY p.position, p.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/phases", requireAuth, async (req, res) => {
  const { title, description, status, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO client_phases (client_id, title, description, status, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, title, description || null, status || "todo", start_date || null, end_date || null]
    );
    res.status(201).json({ ...rows[0], log_count: 0 });
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.put("/phases/:phaseId", requireAuth, async (req, res) => {
  const { title, description, status, start_date, end_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE client_phases
       SET title=$1, description=$2, status=$3, start_date=$4, end_date=$5, updated_at=NOW()
       WHERE id=$6 AND client_id=$7 RETURNING *`,
      [title, description || null, status, start_date || null, end_date || null, req.params.phaseId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/phases/:phaseId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM client_phases WHERE id=$1 AND client_id=$2", [req.params.phaseId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Phase Time Logs ─────────────────────────────────────────────────────────

router.get("/phases/:phaseId/logs", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM phase_time_logs WHERE phase_id=$1 ORDER BY created_at DESC",
      [req.params.phaseId]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/phases/:phaseId/logs", requireAuth, async (req, res) => {
  const { message, created_by } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO phase_time_logs (phase_id, message, created_by) VALUES ($1,$2,$3) RETURNING *",
      [req.params.phaseId, message, created_by || "Admin"]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/phases/:phaseId/logs/:logId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM phase_time_logs WHERE id=$1 AND phase_id=$2", [req.params.logId, req.params.phaseId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Payments ─────────────────────────────────────────────────────────────────

router.get("/payments", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM client_payments WHERE client_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/payments", requireAuth, async (req, res) => {
  const { title, amount, payment_date, status, notes, mode } = req.body;
  if (!title || !amount) return res.status(400).json({ error: "Title and amount required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO client_payments (client_id, title, amount, payment_date, status, notes, mode) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [req.params.id, title, amount, payment_date || null, status || "pending", notes || null, mode || null]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.put("/payments/:paymentId", requireAuth, async (req, res) => {
  const { title, amount, payment_date, status, notes, mode } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE client_payments SET title=$1, amount=$2, payment_date=$3, status=$4, notes=$5, mode=$6, updated_at=NOW()
       WHERE id=$7 AND client_id=$8 RETURNING *`,
      [title, amount, payment_date || null, status, notes || null, mode || null, req.params.paymentId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/payments/:paymentId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM client_payments WHERE id=$1 AND client_id=$2", [req.params.paymentId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/payments/:paymentId/invoice", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT invoice_number, payment_date FROM client_payments WHERE id=$1 AND client_id=$2",
      [req.params.paymentId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    if (!rows[0].payment_date) return res.status(400).json({ error: "Payment date is required to generate an invoice" });

    let invoiceNumber = rows[0].invoice_number;
    if (!invoiceNumber) {
      const seq = await pool.query("SELECT nextval('invoice_number_seq')");
      const n = seq.rows[0].nextval;
      invoiceNumber = `SIXINV/${new Date().getFullYear()}/${String(n).padStart(3, "0")}`;
      await pool.query(
        "UPDATE client_payments SET invoice_number=$1, invoice_generated_at=NOW() WHERE id=$2",
        [invoiceNumber, req.params.paymentId]
      );
    }
    res.json({ invoice_number: invoiceNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/final-invoice", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM client_payments WHERE client_id=$1 AND status='paid'",
      [req.params.id]
    );
    if (parseInt(rows[0].count) === 0) {
      return res.status(400).json({ error: "No paid payments found for this client" });
    }
    const activeCheck = await pool.query(
      "SELECT invoice_number FROM client_tax_invoices WHERE client_id=$1 AND status='active'",
      [req.params.id]
    );
    if (activeCheck.rows[0]) {
      return res.status(409).json({
        error: `Invoice ${activeCheck.rows[0].invoice_number} is already active. Cancel it before generating a new invoice.`,
      });
    }
    const seq = await pool.query("SELECT nextval('invoice_number_seq')");
    const n = seq.rows[0].nextval;
    const invoiceNumber = `SIXINV/${new Date().getFullYear()}/${String(n).padStart(3, "0")}`;
    res.json({ invoice_number: invoiceNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Tax Invoice History ──────────────────────────────────────────────────────

router.get("/tax-invoices", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM client_tax_invoices WHERE client_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/tax-invoices", requireAuth, async (req, res) => {
  const { invoice_number, invoice_date, total_amount } = req.body;
  if (!invoice_number) return res.status(400).json({ error: "Invoice number required" });
  try {
    const existing = await pool.query(
      "SELECT id, status FROM client_tax_invoices WHERE client_id=$1 AND invoice_number=$2",
      [req.params.id, invoice_number]
    );
    if (existing.rows[0]) {
      if (existing.rows[0].status === "cancelled") {
        return res.status(409).json({ error: `Invoice ${invoice_number} was cancelled and cannot be reused.` });
      }
      return res.json(existing.rows[0]);
    }
    const { rows } = await pool.query(
      `INSERT INTO client_tax_invoices (client_id, invoice_number, invoice_date, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, invoice_number, invoice_date || null, total_amount || null, req.user?.name || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/tax-invoices/:invId/cancel", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE client_tax_invoices SET status='cancelled' WHERE id=$1 AND client_id=$2 RETURNING *",
      [req.params.invId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Documents ────────────────────────────────────────────────────────────────

router.get("/documents", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, client_id, name, file_url, file_name, file_type, uploaded_by, created_at FROM client_documents WHERE client_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.get("/documents/:docId/download", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT file_data, file_name, file_type FROM client_documents WHERE id=$1 AND client_id=$2",
      [req.params.docId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/documents", requireAuth, async (req, res) => {
  const { name, file_url, file_data, file_name, file_type, uploaded_by } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO client_documents (client_id, name, file_url, file_data, file_name, file_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, client_id, name, file_url, file_name, file_type, uploaded_by, created_at`,
      [req.params.id, name, file_url || null, file_data || null, file_name || null, file_type || null, uploaded_by || null]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/documents/:docId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM client_documents WHERE id=$1 AND client_id=$2", [req.params.docId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

router.get("/comments", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM client_comments WHERE client_id=$1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/comments", requireAuth, async (req, res) => {
  const { body } = req.body;
  const author = req.user?.name || "Unknown";
  if (!body) return res.status(400).json({ error: "Comment body required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO client_comments (client_id, author, body) VALUES ($1,$2,$3) RETURNING *",
      [req.params.id, author, body]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM client_comments WHERE id=$1 AND client_id=$2", [req.params.commentId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Client Expenses ──────────────────────────────────────────────────────────

router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM expenses WHERE client_id=$1 ORDER BY expense_date DESC, created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/expenses", requireAuth, async (req, res) => {
  const { title, category, amount, expense_date, description, status, type } = req.body;
  if (!title || !amount || !expense_date) return res.status(400).json({ error: "Title, amount and date required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (client_id, title, category, amount, expense_date, description, status, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, title, category || "Other", amount, expense_date, description || null, status || "pending", type || "debit"]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.put("/expenses/:expenseId", requireAuth, async (req, res) => {
  const { title, category, amount, expense_date, description, status, type } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE expenses SET title=$1, category=$2, amount=$3, expense_date=$4, description=$5, status=$6, type=$7, updated_at=NOW()
       WHERE id=$8 AND client_id=$9 RETURNING *`,
      [title, category || "General", amount, expense_date, description || null, status || "pending", type || "debit", req.params.expenseId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/expenses/:expenseId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1 AND client_id=$2", [req.params.expenseId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// ─── Services ────────────────────────────────────────────────────────────────

router.get("/services", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM client_services WHERE client_id=$1 ORDER BY renewal_date ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/services", requireAuth, async (req, res) => {
  const { name, type, renewal_date, reminder_days, cost, status, notes } = req.body;
  if (!name || !renewal_date) return res.status(400).json({ error: "Name and renewal date required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO client_services (client_id, name, type, renewal_date, reminder_days, cost, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, name, type || "other", renewal_date, reminder_days ?? 30, cost || null, status || "active", notes || null]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.put("/services/:serviceId", requireAuth, async (req, res) => {
  const { name, type, renewal_date, reminder_days, cost, status, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE client_services SET name=$1, type=$2, renewal_date=$3, reminder_days=$4,
       cost=$5, status=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 AND client_id=$9 RETURNING *`,
      [name, type || "other", renewal_date, reminder_days ?? 30, cost || null, status, notes || null, req.params.serviceId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.delete("/services/:serviceId", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM client_services WHERE id=$1 AND client_id=$2", [req.params.serviceId, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

export default router;
