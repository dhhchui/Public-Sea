import { Redis } from "@upstash/redis";

// 單例模式，確保全局只有一個 Redis 客戶端
let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}
