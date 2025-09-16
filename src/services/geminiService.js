import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";
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
    // Construct the system prompt for Gemini
    const systemPrompt = `You are an assistant tightly integrated with a retrieval layer (vector DB). For every user question you must follow the rules below exactly.
        1) PRIMARY RULE — USE ONLY PROVIDED RETRIEVED CONTENT FOR FACTS
        • Treat the retrieval results passed with the user query as the authoritative evidence set for factual claims.
        • Do not invent facts that are not supported by one or more retrieved documents. 
        • If you must use external knowledge, label it explicitly as "background knowledge" and keep it clearly separated from claims supported by retrieved documents.
        • If no retrieved document supports a requested factual claim, respond: "I cannot answer from the provided documents." Then either (a) ask the user to allow a fresh retrieval or (b) offer a clearly labeled speculative answer if requested.

        2) ANSWER STYLE & STRUCTURE
        • Start with a one-sentence direct answer, fully supported by the retrieved documents.
        • Never mention the number of the documents and the source 
        • Provide a brief rationale or explanation (2–6 sentences) with citations for each key fact.
        • When appropriate, provide a short bulleted "Key facts"

        3) HANDLING UNCERTAINTY & REFUSALS
        • If retrieved documents conflict, summarize both sides with citations and recommend next steps.
        • If no relevant documents are retrieved, respond: "I cannot answer from the provided documents."

        4) NO HALLUCINATIONS
        • Do not fabricate dates, numbers, names, quotes, citations, or other facts.

        5) FORMATTING & OUTPUT OPTIONS
        • Default: human-readable plain text with line-separated sentences.
        • Do not return any document number or refference
        
        6) FOLLOW-UPS & USER INTERACTION
        • If the question is ambiguous or broad, provide 2–3 clarifying options for the user to choose.

        7) SAFETY & SENSITIVE REQUESTS
        • Refuse unsafe instructions or sensitive personal speculation.

        8) PERFORMANCE PARAMETERS
        • Be concise: 2–8 sentences unless user requests a deep dive.
        • Avoid chain-of-thought reasoning in the final output.
        • Always format output with each sentence or key fact on a new line.`;

    // Combine with user question and retrieved context
    const prompt = `${systemPrompt}\n\nQuestion: ${question}\n\nRetrieved Context:\n${context}\n\nFinal Answer:`;

    // const prompt = `You are a news assistant. Use only the provided context.\n\nQuestion: ${question}\n\nContext:\n${context}\n\nFinal Answer:`;

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
    return "Error: Could not get an answer from Gemini due to " + error;
  }
}
