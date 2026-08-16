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
  const { name, company, email, phone, address, status, notes, total_value, total_value_note, custom_data } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET name=$1,company=$2,email=$3,phone=$4,address=$5,status=$6,notes=$7,
       total_value=$8,total_value_note=$9,custom_data=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [name, company, email, phone, address, status, notes,
       total_value ?? null, total_value_note ?? null, JSON.stringify(custom_data || {}), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    broadcast("clients");
    res.json(rows[0]);
  } catch {
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
