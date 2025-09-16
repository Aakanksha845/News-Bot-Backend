import qdrant from "./qdrant.js";
import { generateEmbedding } from "../utils/ingestEmbeddings.js";

const COLLECTION_NAME = "news_articles";

async function createCollection() {
  try {
    const collections = await qdrant.getCollections();

    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1024,
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
