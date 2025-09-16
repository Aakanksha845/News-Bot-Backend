import qdrant from "../config/qdrant.js";
import { askGemini } from "./geminiService.js";
import { generateEmbedding } from "../utils/ingestEmbeddings.js";

const COLLECTION_NAME = "news_articles";

export async function getRagAnswer(query, topK = 50) {
  const queryVector = await generateEmbedding(query);
  if (!queryVector) {
    return "Error: Could not generate embedding for the query.";
  }

  const searchResults = await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
  });

  if (!searchResults || searchResults.length === 0) {
    return "No relevant articles found.";
  }

  const context = searchResults
    .map((res, idx) => `${idx + 1}. ${res.payload.title} - ${res.payload.text}`)
    .join("\n\n");

  console.log("Context being passed to Gemini:\n", context);

  const answer = await askGemini(query, context);
  return answer;
}
