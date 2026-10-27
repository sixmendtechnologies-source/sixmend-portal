import express from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const FIELDS = [
  "legal_name", "address", "state", "state_code", "pin_code", "gstin",
  "email", "phone", "website", "bank_account_name", "bank_name",
  "account_number", "ifsc_code", "payment_instructions",
  "default_payment_terms", "signatory_name", "signatory_designation", "logo_data", "seal_data",
];

router.get("/company", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM company_settings WHERE id = 1");
    res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/company", requireAuth, async (req, res) => {
  try {
    const vals = FIELDS.map((f) => req.body[f] ?? null);
    const setClauses = FIELDS.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `INSERT INTO company_settings (id, ${FIELDS.join(", ")}, updated_at)
       VALUES (1, ${FIELDS.map((_, i) => `$${i + 1}`).join(", ")}, NOW())
       ON CONFLICT (id) DO UPDATE SET ${setClauses}, updated_at = NOW()
       RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
