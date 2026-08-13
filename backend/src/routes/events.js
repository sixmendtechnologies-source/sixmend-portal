import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const clients = new Set();

router.get("/", (req, res) => {
  const token = req.query.token;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("event: connected\ndata: {}\n\n");

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 25000);

  clients.add(res);
  req.on("close", () => {
    clients.delete(res);
    clearInterval(heartbeat);
  });
});

export function broadcast(module) {
  const payload = `event: update\ndata: ${JSON.stringify({ module })}\n\n`;
  for (const client of clients) {
    try { client.write(payload); } catch {}
  }
}

export default router;
