import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { broadcast } from "./events.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT c.*,
      (SELECT COUNT(*)::int FROM client_services s
       WHERE s.client_id = c.id
       AND s.status != 'cancelled'
       AND s.renewal_date <= CURRENT_DATE + (s.reminder_days || ' days')::INTERVAL
      ) AS alert_count
      FROM clients c WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.company ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }
    query += " ORDER BY c.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
        (SELECT e.value FROM enquiries e
         WHERE e.client_id = c.id AND e.stage = 'client'
         ORDER BY e.updated_at DESC LIMIT 1) AS enquiry_value
       FROM clients c WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { name, company, email, phone, address, status, notes, custom_data } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO clients (name, company, email, phone, address, status, notes, custom_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [name, company, email, phone, address, status || "active", notes, JSON.stringify(custom_data || {})]
    );
    broadcast("clients");
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const {
    name, company, email, phone, address, status, notes,
    total_value, total_value_note, custom_data,
    state, state_code, pin_code, gstin, website,
    bank_account_name, bank_name, account_number, ifsc_code,
    payment_instructions, default_payment_terms,
    project_items, project_gst,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET
        name=$1, company=$2, email=$3, phone=$4, address=$5, status=$6, notes=$7,
        total_value=$8, total_value_note=$9, custom_data=$10,
        state=$11, state_code=$12, pin_code=$13, gstin=$14, website=$15,
        bank_account_name=$16, bank_name=$17, account_number=$18, ifsc_code=$19,
        payment_instructions=$20, default_payment_terms=$21,
        project_items=$22, project_gst=$23,
        updated_at=NOW()
       WHERE id=$24 RETURNING *`,
      [
        name, company, email, phone, address, status, notes,
        total_value ?? null, total_value_note ?? null, JSON.stringify(custom_data || {}),
        state ?? null, state_code ?? null, pin_code ?? null, gstin ?? null, website ?? null,
        bank_account_name ?? null, bank_name ?? null, account_number ?? null, ifsc_code ?? null,
        payment_instructions ?? null, default_payment_terms ?? null,
        project_items ? JSON.stringify(project_items) : null, project_gst ?? null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    broadcast("clients");
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id=$1", [req.params.id]);
    broadcast("clients");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
