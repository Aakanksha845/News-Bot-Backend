import { fetchRSSFeed } from "../services/rssService.js";
import fs from "fs";

async function main() {
  const RSS_FEEDS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
  ];

  const MAX_ARTICLES = 50;
  let allArticles = [];

  for (const feed of RSS_FEEDS) {
    const articles = await fetchRSSFeed(feed);
    allArticles = allArticles.concat(articles);

    // fetch-max 50 articles
    if (allArticles.length >= MAX_ARTICLES) {
      allArticles = allArticles.slice(0, MAX_ARTICLES);
      break;
    }
  }

  fs.writeFileSync("news.json", JSON.stringify(allArticles, null, 2));
  console.log(`Saved ${allArticles.length} articles to news.json`);
}

main();
