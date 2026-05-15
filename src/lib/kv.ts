import { Redis } from "@upstash/redis";

const url =
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL ??
  process.env.REDIS_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  if (!url || !token) {
    throw new Error(
      "Redis 자격증명이 없습니다. KV_REST_API_URL / KV_REST_API_TOKEN 또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수를 설정하세요.",
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

export const K = {
  chatMessages: "ax:chat:messages",
  questionsAll: "ax:questions:all",
  questionsPending: "ax:questions:pending",
  questionsAnswered: "ax:questions:answered",
  reactionsByUser: "ax:reactions:byUser",
  reactionsCounts: "ax:reactions:counts",
  chatRate: (userId: string) => `ax:ratelimit:chat:${userId}`,
} as const;

export const CHAT_HISTORY_LIMIT = 200;
export const CHAT_MAX_STORED = 500;
