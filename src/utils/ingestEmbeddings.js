import fs from "fs";
import axios from "axios";
import qdrant from "../config/qdrant.js";
import dotenv from "dotenv";

dotenv.config();

const COLLECTION_NAME = "news_articles";
const JINA_API_KEY = process.env.JINA_API_KEY;

// Function to generate embedding using Jina
export async function generateEmbedding(text) {
  console.log("Generating embedding for query:", text); // <-- Add this

  if (!JINA_API_KEY) {
    console.error("Error generating embedding: JINA_API_KEY is not set");
    return null;
  }

  try {
    const input = typeof text === "string" ? text.slice(0, 10000) : "";

    const response = await axios.post(
      "https://api.jina.ai/v1/embeddings",
      {
        model: "jina-embeddings-v3",
        input,
      },
      {
        headers: {
          Authorization: `Bearer ${JINA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const embedding = response?.data?.data?.[0]?.embedding;

    if (!embedding) {
      console.error("Error generating embedding: Empty embedding response");
      return null;
    }

    console.log("Embedding length:", embedding.length); // Check size of vector
    return embedding;
  } catch (err) {
    const message = err?.response?.data || err.message;
    console.error("Error generating embedding:", message);
    return null;
  }
}

// function to ingest embeddings
export async function ingestNewsEmbeddings() {
  const newsData = JSON.parse(fs.readFileSync("news_chunks.json", "utf-8"));
  const points = [];

  for (let i = 0; i < newsData.length; i++) {
    const article = newsData[i];
    const textToEmbed = article.content;

    console.log(
      `Embedding article ${i + 1}/${newsData.length}: ${article.title}`
    );
    const vector = await generateEmbedding(textToEmbed);

    if (!vector) continue;

    points.push({
      id: i + 1,
      vector,
      payload: article,
    });
  }

  // Insert into Qdrant
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log(`Successfully ingested ${points.length} embeddings into Qdrant`);
}
