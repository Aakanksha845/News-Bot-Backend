import "dotenv/config";
import client from "../config/redis.js";

async function main() {
  try {
    console.log("Redis URL:", process.env.REDIS_URL || "<composed>");
    const pong = await client.ping();
    console.log("PING:", pong);

    const key = "news-bot:test:key";
    const value = `hello-${Date.now()}`;
    await client.set(key, value, { EX: 30 });
    const got = await client.get(key);
    console.log("SET/GET:", { key, value, got, match: got === value });
  } catch (err) {
    console.error("Redis test failed:", err?.message || err);
  } finally {
    await client.quit();
  }
}

main();
