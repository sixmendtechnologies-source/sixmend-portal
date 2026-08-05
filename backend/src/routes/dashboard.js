import { Router } from "express";
import pool from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const [clients, enquiries, expenses, projectValue, payments] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM clients"),
      pool.query("SELECT status, COUNT(*) as count FROM enquiries GROUP BY status"),
      pool.query("SELECT SUM(amount) as total, category, SUM(amount) as cat_total FROM expenses GROUP BY category"),
      pool.query("SELECT COALESCE(SUM(total_value), 0) as total FROM clients WHERE total_value IS NOT NULL"),
      pool.query("SELECT status, COALESCE(SUM(amount), 0) as total FROM client_payments GROUP BY status"),
    ]);

    const enquiryStats = {};
    enquiries.rows.forEach((r) => { enquiryStats[r.status] = parseInt(r.count); });

    const expenseByCategory = {};
    let totalExpenses = 0;
    expenses.rows.forEach((r) => {
      expenseByCategory[r.category] = parseFloat(r.cat_total) || 0;
      totalExpenses += parseFloat(r.cat_total) || 0;
    });

    const totalProjectValue = parseFloat(projectValue.rows[0].total) || 0;
    const paymentByStatus = {};
    payments.rows.forEach((r) => { paymentByStatus[r.status] = parseFloat(r.total) || 0; });
    const totalPaid = paymentByStatus["paid"] || 0;
    const totalOverdue = paymentByStatus["overdue"] || 0;

    res.json({
      clients: parseInt(clients.rows[0].count),
      enquiries: enquiryStats,
      expenses: { total: totalExpenses, byCategory: expenseByCategory },
      payments: {
        totalProjectValue,
        totalPaid,
        remaining: totalProjectValue - totalPaid,
        overdue: totalOverdue,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
