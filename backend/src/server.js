import "dotenv/config";
import express from "express";
import cors from "cors";
import { auth } from "./middleware/auth.js";
import providers from "./routes/providers.js";
import clients from "./routes/clients.js";
import agents from "./routes/agents.js";
import knowledge from "./routes/knowledge.js";
import notes from "./routes/agent-notes.js";
import dashboard from "./routes/dashboard.js";
import webhook from "./routes/webhook.js";
import whatsapp from "./routes/whatsapp.js";
import conversations, { conversationsByAgent } from "./routes/conversations.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Webhook is PUBLIC — Evolution hits it without auth token
// Handle all sub-paths under /api/webhook/evolution
app.use("/api/webhook/evolution", webhook);

// Auth middleware for all other /api routes
app.use("/api", (req, res, next) => {
  // Extra safety: never auth the webhook route even if mount order is swapped
  if (req.path.startsWith("/webhook/evolution")) return next();
  auth(req, res, next);
});
app.use("/api/providers", providers);
app.use("/api/clients", clients);
app.use("/api/agents", agents);
app.use("/api/agents/:agentId/knowledge", knowledge);
app.use("/api/agents/:agentId/notes", notes);
app.use("/api/agents/:agentId/conversations", conversationsByAgent);
app.use("/api/dashboard", dashboard);
app.use("/api/whatsapp", whatsapp);
app.use("/api/conversations", conversations);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: String(err.message || err) });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`[rivo] backend on http://localhost:${port}`));
