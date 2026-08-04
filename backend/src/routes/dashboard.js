import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const [clients, enquiries, expenses] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM clients"),
      pool.query("SELECT status, COUNT(*) as count FROM enquiries GROUP BY status"),
      pool.query("SELECT SUM(amount) as total, category, SUM(amount) as cat_total FROM expenses GROUP BY category"),
    ]);

    const enquiryStats = {};
    enquiries.rows.forEach((r) => { enquiryStats[r.status] = parseInt(r.count); });

    const expenseByCategory = {};
    let totalExpenses = 0;
    expenses.rows.forEach((r) => {
      expenseByCategory[r.category] = parseFloat(r.cat_total) || 0;
      totalExpenses += parseFloat(r.cat_total) || 0;
    });

    res.json({
      clients: parseInt(clients.rows[0].count),
      enquiries: enquiryStats,
      expenses: { total: totalExpenses, byCategory: expenseByCategory },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
