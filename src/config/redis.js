import redis from "redis";

let client;

// Prefer Upstash REST if configured
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (upstashUrl && upstashToken) {
  const { Redis: UpstashRedis } = await import("@upstash/redis");
  const upstash = new UpstashRedis({ url: upstashUrl, token: upstashToken });

  client = {
    async ping() {
      return upstash.ping();
    },
    async set(key, value, options) {
      const normalized = {};
      if (options) {
        if (options.EX || options.ex)
          normalized.ex = Number(options.EX ?? options.ex);
        if (options.PX || options.px)
          normalized.px = Number(options.PX ?? options.px);
        if (options.NX || options.nx)
          normalized.nx = Boolean(options.NX ?? options.nx);
        if (options.XX || options.xx)
          normalized.xx = Boolean(options.XX ?? options.xx);
      }
      return upstash.set(key, value, normalized);
    },
    async get(key) {
      return upstash.get(key);
    },
    async del(key) {
      return upstash.del(key);
    },
    async quit() {
      return;
    },
  };
} else {
  function buildRedisOptions() {
    // Prefer REDIS_URL if provided. Otherwise compose from parts.
    const url = process.env.REDIS_URL;
    if (url) return { url };

    const host = process.env.REDIS_HOST || "localhost";
    const port = Number(process.env.REDIS_PORT || 6379);
    const username = process.env.REDIS_USERNAME; // optional
    const password = process.env.REDIS_PASSWORD; // optional
    const db = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;
    const useTls = String(process.env.REDIS_TLS || "0") === "1";

    const auth =
      username || password ? `${username || ""}:${password || ""}@` : "";
    const dbSuffix = Number.isFinite(db) ? `/${db}` : "";
    const scheme = useTls ? "rediss" : "redis";

    return { url: `${scheme}://${auth}${host}:${port}${dbSuffix}` };
  }

  const nodeClient = redis.createClient(buildRedisOptions());
  nodeClient.on("error", (err) => console.error("Redis Error:", err));
  await nodeClient.connect();
  client = nodeClient;
}

export default client;
