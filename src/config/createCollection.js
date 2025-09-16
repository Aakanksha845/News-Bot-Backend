import qdrant from "./qdrant.js";
import { generateEmbedding } from "../utils/ingestEmbeddings.js";

const COLLECTION_NAME = "news_articles";

async function createCollection() {
  try {
    const collections = await qdrant.getCollections();

    // Determine embedding dimension dynamically to ensure correctness
    // checking the dimension of the embedding so that the upsert will not fail due to mismatch in the dimension
    const sampleEmbedding = await generateEmbedding("dimension probe");
    const dimension = Array.isArray(sampleEmbedding)
      ? sampleEmbedding.length
      : 1536; // fallback to common size if probing fails so that the common size will be used to create the collection

    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: dimension,
        distance: "Cosine",
      },
    });

    console.log(`Collection '${COLLECTION_NAME}' created successfully`);
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log(`Collection '${COLLECTION_NAME}' already exists`);
    } else {
      console.error("Error creating collection:", error.message);
      console.error("Full error details:", error);
    }
  }
}

createCollection();
