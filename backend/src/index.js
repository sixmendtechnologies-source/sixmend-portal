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
import userRoutes from "./routes/users.js";
import customFieldRoutes from "./routes/custom-fields.js";
import eventsRoutes from "./routes/events.js";

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
app.use("/api/users", userRoutes);
app.use("/api/custom-fields", customFieldRoutes);
app.use("/api/events", eventsRoutes);

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

const SYSTEM_FIELDS = [
  { module: "enquiries", field_key: "title",          label: "Subject",        type: "text",     required: true,  position: 0 },
  { module: "enquiries", field_key: "description",    label: "Description",    type: "textarea", required: true,  position: 1 },
  { module: "enquiries", field_key: "source",         label: "Source",         type: "select",   required: true,  position: 2, options: ["MechBook","Stepney","Sixmend","CookBy","General"] },
  { module: "enquiries", field_key: "contact_name",   label: "Contact Name",   type: "text",     required: false, position: 3 },
  { module: "enquiries", field_key: "contact_number", label: "Contact Number", type: "text",     required: true,  position: 4 },
  { module: "enquiries", field_key: "gmail",          label: "Gmail",          type: "text",     required: true,  position: 5 },
  { module: "enquiries", field_key: "priority",       label: "Priority",       type: "select",   required: false, position: 6 },
  { module: "enquiries", field_key: "value",          label: "Value (₹)",      type: "number",   required: false, position: 7 },
  { module: "enquiries", field_key: "assigned_to",    label: "Assigned To",    type: "text",     required: false, position: 8 },
  { module: "clients",   field_key: "name",           label: "Name",           type: "text",     required: true,  position: 0 },
  { module: "clients",   field_key: "company",        label: "Company",        type: "text",     required: false, position: 1 },
  { module: "clients",   field_key: "email",          label: "Email",          type: "text",     required: false, position: 2 },
  { module: "clients",   field_key: "phone",          label: "Phone",          type: "text",     required: false, position: 3 },
  { module: "clients",   field_key: "address",        label: "Address",        type: "text",     required: false, position: 4 },
  { module: "clients",   field_key: "status",         label: "Status",         type: "select",   required: false, position: 5 },
  { module: "clients",   field_key: "notes",          label: "Notes",          type: "textarea", required: false, position: 6 },
  { module: "expenses",  field_key: "title",          label: "Title",          type: "text",     required: true,  position: 0 },
  { module: "expenses",  field_key: "category",       label: "Category",       type: "select",   required: true,  position: 1, options: ["Materials","Labor","Equipment","Travel","Other"] },
  { module: "expenses",  field_key: "amount",         label: "Amount (₹)",     type: "number",   required: true,  position: 2 },
  { module: "expenses",  field_key: "expense_date",   label: "Date",           type: "date",     required: true,  position: 3 },
  { module: "expenses",  field_key: "description",    label: "Notes",          type: "textarea", required: false, position: 4 },
  { module: "expenses",  field_key: "status",         label: "Status",         type: "select",   required: false, position: 5 },
];

async function seedSystemFields() {
  try {
    for (const f of SYSTEM_FIELDS) {
      const opts = f.options ? JSON.stringify(f.options) : null;
      await pool.query(
        `INSERT INTO custom_fields (module, label, field_key, type, required, position, is_system, visible, options)
         VALUES ($1,$2,$3,$4,$5,$6,true,true,$7)
         ON CONFLICT (module, field_key) DO UPDATE SET
           options = CASE WHEN custom_fields.options IS NULL THEN EXCLUDED.options ELSE custom_fields.options END`,
        [f.module, f.label, f.field_key, f.type, f.required, f.position, opts]
      );
    }
    console.log("System fields seeded");
  } catch (err) {
    console.error("System fields seed error:", err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  await runMigrations();
  await seedAdmin();
  await seedSystemFields();
});
