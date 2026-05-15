export type ChatMessage = {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  ts: number;
};

export type Question = {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  ts: number;
  answered: boolean;
  answeredAt?: number;
};

export const STATUS_KEYS = [
  "veryInteresting",
  "good",
  "soso",
  "difficult",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export const STATUS_LABELS: Record<StatusKey, string> = {
  veryInteresting: "정말 흥미로워요",
  good: "좋아요",
  soso: "그저그래요",
  difficult: "어려워요",
};

export const STATUS_EMOJI: Record<StatusKey, string> = {
  veryInteresting: "🤩",
  good: "👍",
  soso: "😐",
  difficult: "🤯",
};

export const STATUS_COLORS: Record<StatusKey, string> = {
  veryInteresting: "var(--status-very)",
  good: "var(--status-good)",
  soso: "var(--status-soso)",
  difficult: "var(--status-hard)",
};

export type ReactionCounts = Record<StatusKey, number>;

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  veryInteresting: 0,
  good: 0,
  soso: 0,
  difficult: 0,
};
