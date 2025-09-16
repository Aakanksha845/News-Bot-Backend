import Parser from "rss-parser";

const parser = new Parser();

/**
 * Fetch news articles from an RSS feed and normalize them
 * @param {string} feedUrl - The RSS feed URL
 * @returns {Promise<Array>} List of normalized articles
 */
export async function fetchRSSFeed(feedUrl) {
  try {
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);

    const articles = feed.items.map((item) => ({
      title: item.title || "Untitled",
      content: item.contentSnippet || item.content || "",
      url: item.link || "",
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source: feed.title || "Unknown Source",
    }));

    console.log(`Retrieved ${articles.length} articles from ${feed.title}`);
    return articles;
  } catch (error) {
    console.error("Error fetching RSS feed:", error.message);
    return [];
  }
}
