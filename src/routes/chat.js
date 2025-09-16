import express from "express";
import { randomUUID } from "crypto";
import redisClient from "../config/redis.js";
import { getRagAnswer } from "../services/ragService.js";

const router = express.Router();

function safeParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return value;
}

function buildSessionKey(sessionId) {
  return `session:${sessionId}`;
}

async function loadSession(sessionId) {
  const key = buildSessionKey(sessionId);
  const raw = await redisClient.get(key);
  const parsed = safeParse(raw, null);
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.chats)) {
    return parsed;
  }

  const legacyRaw = await redisClient.get(sessionId);
  const legacyHistory = safeParse(legacyRaw, null);
  if (Array.isArray(legacyHistory)) {
    const now = new Date().toISOString();
    const session = {
      chats: [
        {
          chatId: "default",
          title: "Default Chat",
          createdAt: now,
          updatedAt: now,
          messages: legacyHistory,
        },
      ],
    };
    await saveSession(sessionId, session);
    await redisClient.del(sessionId);
    return session;
  }
  return { chats: [] };
}

async function saveSession(sessionId, session) {
  const key = buildSessionKey(sessionId);
  await redisClient.set(key, JSON.stringify(session), { EX: 60 * 60 * 24 });
}

function getChatIndex(session, chatId) {
  return session.chats.findIndex((c) => c.chatId === chatId);
}

router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await loadSession(sessionId);
  res.json({ session });
});

router.post("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const answer = await getRagAnswer(message);

    const session = await loadSession(sessionId);
    const now = new Date().toISOString();
    let idx = getChatIndex(session, "default");
    if (idx === -1) {
      session.chats.push({
        chatId: "default",
        title: "Default Chat",
        createdAt: now,
        updatedAt: now,
        messages: [],
      });
      idx = session.chats.length - 1;
    }
    session.chats[idx].messages.push({ role: "user", message });
    session.chats[idx].messages.push({ role: "bot", message: answer });
    session.chats[idx].updatedAt = now;
    await saveSession(sessionId, session);

    res.json({ answer, chatId: session.chats[idx].chatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  await redisClient.del(buildSessionKey(sessionId));
  res.json({ message: "Session cleared" });
});

router.post("/:sessionId/init", async (req, res) => {
  const { sessionId } = req.params;
  const key = buildSessionKey(sessionId);
  const existing = await redisClient.get(key);
  if (existing) {
    return res.status(200).json({ sessionId, created: false });
  }
  await saveSession(sessionId, { chats: [] });
  return res.status(201).json({ sessionId, created: true });
});

router.get("/:sessionId/chats", async (req, res) => {
  const { sessionId } = req.params;
  const session = await loadSession(sessionId);
  const chats = session.chats.map(
    ({ chatId, title, createdAt, updatedAt }) => ({
      chatId,
      title,
      createdAt,
      updatedAt,
    })
  );
  res.json({ chats });
});

router.post("/:sessionId/chats", async (req, res) => {
  const { sessionId } = req.params;
  const { title } = req.body || {};
  const chatId = randomUUID();
  const now = new Date().toISOString();
  const session = await loadSession(sessionId);
  const chat = {
    chatId,
    title: title || "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  session.chats.push(chat);
  await saveSession(sessionId, session);
  res.status(201).json({
    chatId,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  });
});

router.get("/:sessionId/chats/:chatId", async (req, res) => {
  const { sessionId, chatId } = req.params;
  const session = await loadSession(sessionId);
  const idx = getChatIndex(session, chatId);
  if (idx === -1) return res.status(404).json({ error: "Chat not found" });
  res.json({ chatId, messages: session.chats[idx].messages });
});

router.post("/:sessionId/chats/:chatId", async (req, res) => {
  const { sessionId, chatId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const session = await loadSession(sessionId);
    const idx = getChatIndex(session, chatId);
    if (idx === -1) return res.status(404).json({ error: "Chat not found" });

    const answer = await getRagAnswer(message);
    session.chats[idx].messages.push({ role: "user", message });
    session.chats[idx].messages.push({ role: "bot", message: answer });
    session.chats[idx].updatedAt = new Date().toISOString();
    await saveSession(sessionId, session);

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.delete("/:sessionId/chats/:chatId", async (req, res) => {
  const { sessionId, chatId } = req.params;
  const session = await loadSession(sessionId);
  const filtered = session.chats.filter((c) => c.chatId !== chatId);
  if (filtered.length === session.chats.length) {
    return res.status(404).json({ error: "Chat not found" });
  }
  session.chats = filtered;
  await saveSession(sessionId, session);
  res.json({ message: "Chat deleted", chatId });
});

export default router;
