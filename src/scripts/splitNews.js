import fs from "fs";
import path from "path";
import { splitText } from "../utils/textSplitter.js";

async function main() {
  const inputFile = path.resolve("news_full.json");
  const outputFile = path.resolve("news_chunks.json");

  // Load the processed articles
  const rawData = fs.readFileSync(inputFile, "utf-8");
  const articles = JSON.parse(rawData);

  const chunkedArticles = [];

  for (const article of articles) {
    // Filter only BBC News articles
    if (!article.source || article.source !== "BBC News") continue;

    // Skip if article has no content
    if (!article.content || article.content.trim() === "") continue;

    // Split content into smaller chunks
    const chunks = splitText(article.content, 500, 50);

    // Create chunk objects with metadata
    chunks.forEach((chunk, index) => {
      chunkedArticles.push({
        id: `${article.url || article.title}-${index}`,
        title: article.title,
        chunkIndex: index,
        text: chunk,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source,
      });
    });
  }

  // Save split chunks to a file
  fs.writeFileSync(
    outputFile,
    JSON.stringify(chunkedArticles, null, 2),
    "utf-8"
  );

  console.log(
    `📝 Created ${outputFile} with ${chunkedArticles.length} chunks (BBC News only)`
  );
}

main();
