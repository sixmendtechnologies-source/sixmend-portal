import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const VALID_STAGES = ["open", "first_level_discussion", "kick_off", "agreement", "client", "lost"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, status, priority } = req.query;
    let query = `
      SELECT e.*, c.name as client_name
      FROM enquiries e
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.title ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND e.priority = $${params.length}`;
    }
    query += " ORDER BY e.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, c.name as client_name
       FROM enquiries e
       LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { title, description, source, contact_name, contact_number, gmail, priority, value, assigned_to, custom_data } = req.body;
  if (!title || !description || !source || !contact_number || !gmail) {
    return res.status(400).json({ error: "Subject, Description, Source, Contact Number, and Gmail are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO enquiries (title, description, source, contact_name, contact_number, gmail, status, priority, value, assigned_to, stage, custom_data)
       VALUES ($1,$2,$3,$4,$5,$6,'new',$7,$8,$9,'open',$10) RETURNING *`,
      [title, description, source, contact_name || null, contact_number, gmail, priority || "medium", value || null, assigned_to || null, JSON.stringify(custom_data || {})]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { title, description, source, contact_name, contact_number, gmail, client_id, status, priority, value, assigned_to, custom_data } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE enquiries
       SET title=$1, description=$2, source=$3, contact_name=$4, contact_number=$5, gmail=$6,
           client_id=$7, status=$8, priority=$9, value=$10, assigned_to=$11, custom_data=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, description, source, contact_name || null, contact_number, gmail, client_id || null, status || "new", priority || "medium", value || null, assigned_to || null, JSON.stringify(custom_data || {}), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/stage", requireAuth, async (req, res) => {
  const { stage } = req.body;
  if (!VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: "Invalid stage" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE enquiries SET stage=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [stage, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM enquiries WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
