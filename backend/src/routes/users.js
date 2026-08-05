import { Router } from "express";
import crypto from "crypto";
import pool from "../db/index.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendActivationEmail } from "../utils/email.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, status, last_login_at, created_at FROM users ORDER BY created_at ASC"
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/invite", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows[0]) return res.status(400).json({ error: "A user with this email already exists" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, role, status, invite_token, invite_expires_at)
       VALUES ($1,$2,$3,'invited',$4,$5)
       RETURNING id, name, email, role, status, created_at`,
      [name, email, role || "member", token, expires]
    );

    await sendActivationEmail({ to: email, name, token });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or member" });
  }
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Cannot change your own role" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, status",
      [role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Status must be active or inactive" });
  }
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Cannot change your own status" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE users SET status=$1 WHERE id=$2 RETURNING id, name, email, role, status",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/reinvite", requireAuth, requireAdmin, async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `UPDATE users SET invite_token=$1, invite_expires_at=$2, status='invited'
       WHERE id=$3 RETURNING name, email`,
      [token, expires, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });

    await sendActivationEmail({ to: rows[0].email, name: rows[0].name, token });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
