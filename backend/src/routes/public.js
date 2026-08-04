import { Router } from "express";
import pool from "../db/index.js";

const router = Router();

const VALID_SOURCES = ["MechBook", "Stepney", "Sixmend", "CookBy", "General"];

router.post("/enquiry", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.ENQUIRY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { source, contact_name, contact_number, gmail, title, description } = req.body;

  if (!source || !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` });
  }
  if (!contact_number || !gmail) {
    return res.status(400).json({ error: "contact_number and gmail are required" });
  }

  const subject = title || `Enquiry from ${source} website`;
  const body    = description || "Submitted via contact form";

  try {
    const { rows } = await pool.query(
      `INSERT INTO enquiries
         (title, description, source, contact_name, contact_number, gmail, status, priority, stage)
       VALUES ($1,$2,$3,$4,$5,$6,'new','medium','open')
       RETURNING id, title, source, contact_name, contact_number, gmail, stage, created_at`,
      [subject, body, source, contact_name || null, contact_number, gmail]
    );
    res.status(201).json({ success: true, enquiry_id: rows[0].id });
  } catch (err) {
    console.error("Public enquiry error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
