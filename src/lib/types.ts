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
  "empathize",
  "amazing",
  "soso",
  "difficult",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export const STATUS_LABELS: Record<StatusKey, string> = {
  veryInteresting: "정말 흥미로워요",
  good: "좋아요",
  empathize: "공감돼요",
  amazing: "신기해요",
  soso: "그저그래요",
  difficult: "어려워요",
};

export const STATUS_EMOJI: Record<StatusKey, string> = {
  veryInteresting: "🤩",
  good: "👍",
  empathize: "🙌",
  amazing: "😮",
  soso: "😐",
  difficult: "🤯",
};

export const STATUS_COLORS: Record<StatusKey, string> = {
  veryInteresting: "var(--color-status-very)",
  good: "var(--color-status-good)",
  empathize: "#c084fc",
  amazing: "#34d399",
  soso: "var(--color-status-soso)",
  difficult: "var(--color-status-hard)",
};

export const STATUS_GRADIENTS: Record<StatusKey, string> = {
  veryInteresting: "linear-gradient(135deg, #ff7e3d 0%, #ff5a78 100%)",
  good: "linear-gradient(135deg, #00bdd6 0%, #0084c7 100%)",
  empathize: "linear-gradient(135deg, #c084fc 0%, #ec4899 100%)",
  amazing: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
  soso: "linear-gradient(135deg, #b0bcc9 0%, #7c8a99 100%)",
  difficult: "linear-gradient(135deg, #5b6577 0%, #34405a 100%)",
};

export type ReactionCounts = Record<StatusKey, number>;

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  veryInteresting: 0,
  good: 0,
  empathize: 0,
  amazing: 0,
  soso: 0,
  difficult: 0,
};
