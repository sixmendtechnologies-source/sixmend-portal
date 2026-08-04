import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./db/index.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import clientRoutes from "./routes/clients.js";
import enquiryRoutes from "./routes/enquiries.js";
import expenseRoutes from "./routes/expenses.js";
import clientDetailRoutes from "./routes/client-detail.js";
import publicRoutes from "./routes/public.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/clients/:id", clientDetailRoutes);
app.use("/api/public", publicRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, "db/migrate.sql"), "utf8");
    await pool.query(sql);
    console.log("Migrations applied");
  } catch (err) {
    console.error("Migration error:", err.message);
  }
}

async function seedAdmin() {
  try {
    const { rows } = await pool.query("SELECT id FROM users LIMIT 1");
    if (rows.length === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)",
        ["Admin", "admin@sixmend.com", hash, "admin"]
      );
      console.log("Default admin created: admin@sixmend.com / admin123");
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  await runMigrations();
  await seedAdmin();
});
