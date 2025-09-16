import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { extract } from "@extractus/article-extractor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readJsonFile(filePath) {
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract article content from a URL
 * Uses primary extraction first, then falls back to Jina Reader
 */
async function extractContentFromUrl(url) {
  const domain = new URL(url).hostname;

  // Directly use Jina for known blocked domains
  const blockedDomains = ["nytimes.com", "wsj.com", "bloomberg.com"];
  if (blockedDomains.some((d) => domain.includes(d))) {
    return await fetchUsingJina(url);
  }

  // Otherwise, try normal extraction first
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 20000,
      maxRedirects: 5,
    });

    const html = response.data;
    const article = await extract(url, { html });

    const text = article?.textContent || article?.content || "";
    const content = article?.textContent ? text : stripHtml(text);

    if (content && content.length > 0) {
      return content;
    }
  } catch (err) {
    console.error(`Primary extraction failed for ${url}:`, err.message);
  }

  // Fallback to Jina
  return await fetchUsingJina(url);
}

async function fetchUsingJina(url) {
  try {
    const proxied = `https://r.jina.ai/http://${url.replace(
      /^https?:\/\//,
      ""
    )}`;
    const res = await axios.get(proxied, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 20000,
      maxRedirects: 5,
    });

    return typeof res.data === "string" ? res.data.trim() : "";
  } catch (err) {
    console.error(`Jina fallback failed for ${url}:`, err.message);
    return "";
  }
}

/**
 * Main function to process all articles in news.json
 */
async function main() {
  const projectRoot = path.resolve(__dirname, "../../");
  const inputPath = path.join(projectRoot, "news.json");
  const outputPath = path.join(projectRoot, "news_full.json");

  const items = await readJsonFile(inputPath);

  const results = [];

  for (const [index, item] of items.entries()) {
    const { title, content: summary, url, publishedAt, source } = item;
    console.log(`\n🔹 Processing ${index + 1}/${items.length}: ${title}`);

    let fullContent = "";
    if (url) {
      fullContent = await extractContentFromUrl(url);
    }

    // If extraction failed or was too short, fallback to summary
    const finalContent =
      fullContent && !fullContent.includes("Warning: Target URL returned error")
        ? fullContent
        : summary || "";

    results.push({
      title,
      content: finalContent,
      publishedAt,
      source,
    });
  }

  // Save results to file
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(
    `\nExtraction complete. Wrote ${results.length} items to ${outputPath}`
  );
}

// Run the script
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
