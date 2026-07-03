export type MessageStatus =
  | "pending"
  | "rejected"
  | "queued"
  | "dismissed"
  | "approved"
  | "answered"
  | "chat";

export type Classification = {
  is_question: boolean;
  score?: number;
  reason?: string;
  unanswerable?: boolean;
  // 이전 스키마 호환
  on_topic?: boolean;
  safe?: boolean;
  normalized_question?: string;
};

export type Message = {
  id: string;
  created_at: string;
  nickname: string | null;
  content: string;
  status: MessageStatus;
  classification: Classification | null;
  answer: string | null;
  model: string | null;
  approved_at: string | null;
  answered_at: string | null;
};

export type Config = {
  id: 1;
  ppt_embed_url: string | null;
  kb_text: string | null;
  topic_desc: string | null;
  updated_at: string | null;
};

export type AnswerModel = "haiku" | "sonnet" | "opus";

export const ANSWER_MODEL_IDS: Record<AnswerModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-5",
  opus: "claude-opus-4-8",
};

export const ANSWER_MODEL_LABELS: Record<AnswerModel, string> = {
  haiku: "Haiku 4.5 (빠름)",
  sonnet: "Sonnet 5 (기본)",
  opus: "Opus 4.8 (최고 품질)",
};
