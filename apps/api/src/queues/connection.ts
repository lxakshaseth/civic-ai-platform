import { env } from "config/env";

const redisUrl = new URL(env.REDIS_URL);

export const bullMqConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: redisUrl.pathname && redisUrl.pathname !== "/" ? Number(redisUrl.pathname.slice(1)) : 0,
  tls: redisUrl.protocol === "rediss:" ? {} : undefined
};

export const closeBullMqConnection = async () => undefined;
