import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function pingGemini() {
  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const { data } = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with: pong" }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "<no text>";
  } catch (error) {
    const detail = error?.response?.data || error.message;
    console.error("Error calling Gemini:", detail);
    throw error;
  }
}

export async function askGemini(question, context) {
  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const prompt = `You are a news assistant. Use only the provided context.\n\nQuestion: ${question}\n\nContext:\n${context}\n\nFinal Answer:`;

    const { data } = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "<empty response>";
  } catch (error) {
    const detail = error?.response?.data || error.message;
    console.error("Error calling Gemini:", detail);
    return "Error: Could not get an answer from Gemini.";
  }
}
