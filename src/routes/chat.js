import express from "express";
import redisClient from "../config/redis.js";
import { getRagAnswer } from "../services/ragService.js";

const router = express.Router();

// Get chat history for a session
router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const history = await redisClient.get(sessionId);
  const parsed = history
    ? typeof history === "string"
      ? JSON.parse(history)
      : history
    : [];
  res.json({ history: parsed });
});

// Post a new query
router.post("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const answer = await getRagAnswer(message);

    // Store in Redis session
    const existing = await redisClient.get(sessionId);
    const sessionHistory = existing
      ? typeof existing === "string"
        ? JSON.parse(existing)
        : existing
      : [];
    sessionHistory.push({ role: "user", message });
    sessionHistory.push({ role: "bot", message: answer });

    await redisClient.set(sessionId, JSON.stringify(sessionHistory), {
      EX: 60 * 60 * 24, // TTL 24h
    });

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Reset session
router.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  await redisClient.del(sessionId);
  res.json({ message: "Session cleared" });
});

export default router;
