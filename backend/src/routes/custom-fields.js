import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const VALID_MODULES = ["enquiries", "clients", "expenses"];
const VALID_TYPES = ["text", "number", "date", "select", "textarea"];

function toFieldKey(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// List fields for a module — all authenticated users
router.get("/", requireAuth, async (req, res) => {
  const { module } = req.query;
  if (!module || !VALID_MODULES.includes(module)) {
    return res.status(400).json({ error: "Valid module required (enquiries, clients, expenses)" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM custom_fields WHERE module=$1 ORDER BY position, created_at",
      [module]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Create field — admin only
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { module, label, type, required, options } = req.body;
  if (!module || !VALID_MODULES.includes(module)) {
    return res.status(400).json({ error: "Valid module required" });
  }
  if (!label) return res.status(400).json({ error: "Label is required" });
  if (!VALID_TYPES.includes(type || "text")) {
    return res.status(400).json({ error: "Invalid field type" });
  }

  const field_key = toFieldKey(label);
  if (!field_key) return res.status(400).json({ error: "Label must contain alphanumeric characters" });

  const { rows: maxRows } = await pool.query(
    "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM custom_fields WHERE module=$1",
    [module]
  );

  try {
    const optionsValue = Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null;
    const { rows } = await pool.query(
      `INSERT INTO custom_fields (module, label, field_key, type, options, required, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [module, label, field_key, type || "text", optionsValue, !!required, maxRows[0].next_pos]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating custom field:", err);
    if (err.code === "23505") return res.status(400).json({ error: `A field with key "${field_key}" already exists in this module` });
    res.status(500).json({ error: "Server error" });
  }
});

// Update field — admin only
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await pool.query("SELECT * FROM custom_fields WHERE id=$1", [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: "Not found" });

    if (existing[0].is_system) {
      // System fields: only required and visible can change
      const { required, visible } = req.body;
      const { rows } = await pool.query(
        "UPDATE custom_fields SET required=$1, visible=$2 WHERE id=$3 RETURNING *",
        [!!required, visible !== false, req.params.id]
      );
      return res.json(rows[0]);
    }

    const { label, type, required, options, visible } = req.body;
    if (!label) return res.status(400).json({ error: "Label is required" });
    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: "Invalid field type" });
    const optionsValue = Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null;
    const { rows } = await pool.query(
      `UPDATE custom_fields SET label=$1, type=$2, required=$3, options=$4, visible=$5 WHERE id=$6 RETURNING *`,
      [label, type || "text", !!required, optionsValue, visible !== false, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating custom field:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete field — admin only (system fields cannot be deleted)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT is_system FROM custom_fields WHERE id=$1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    if (rows[0].is_system) return res.status(400).json({ error: "Built-in fields cannot be deleted" });
    await pool.query("DELETE FROM custom_fields WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
