import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status === "invited") {
      return res.status(403).json({ error: "Account not activated. Check your email for the activation link." });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account has been deactivated. Contact an administrator." });
    }

    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await pool.query("UPDATE users SET last_login_at=NOW() WHERE id=$1", [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Validate invite token — public endpoint
router.get("/invite/:token", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT name, email, status FROM users WHERE invite_token=$1 AND invite_expires_at > NOW()",
      [req.params.token]
    );
    if (!rows[0]) return res.status(400).json({ error: "Invalid or expired invitation link" });
    if (rows[0].status === "active") return res.status(400).json({ error: "Account already activated. Please sign in." });
    res.json({ name: rows[0].name, email: rows[0].email });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Activate account — public endpoint
router.post("/activate", async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) {
    return res.status(400).json({ error: "Token, name, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE invite_token=$1 AND invite_expires_at > NOW() AND status='invited'",
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: "Invalid or expired invitation link" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "UPDATE users SET name=$1, password_hash=$2, status='active', invite_token=NULL, invite_expires_at=NULL WHERE id=$3",
      [name, hash, rows[0].id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
