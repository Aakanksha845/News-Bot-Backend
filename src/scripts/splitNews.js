import fs from "fs";
import { splitText } from "../utils/textSplitter.js";

async function main() {
  // Load the raw articles
  const rawData = fs.readFileSync("news.json", "utf-8");
  const articles = JSON.parse(rawData);

  const chunkedArticles = [];

  for (const article of articles) {
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
    "news_chunks.json",
    JSON.stringify(chunkedArticles, null, 2)
  );
  console.log(
    `📝 Created news_chunks.json with ${chunkedArticles.length} chunks`
  );
}

main();
