let client;
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
}
export default client;
