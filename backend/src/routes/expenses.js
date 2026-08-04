import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = "SELECT * FROM expenses WHERE 1=1";
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += " ORDER BY expense_date DESC, created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { title, category, amount, expense_date, description, status } = req.body;
  if (!title || !category || !amount || !expense_date) {
    return res.status(400).json({ error: "Title, category, amount and date are required" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO expenses (title, category, amount, expense_date, description, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [title, category, amount, expense_date, description, status || "pending"]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { title, category, amount, expense_date, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE expenses SET title=$1,category=$2,amount=$3,expense_date=$4,description=$5,status=$6,updated_at=NOW() WHERE id=$7 RETURNING *",
      [title, category, amount, expense_date, description, status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
