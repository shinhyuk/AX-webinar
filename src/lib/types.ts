export type MessageStatus =
  | "pending"
  | "rejected"
  | "queued"
  | "dismissed"
  | "approved"
  | "answered";

export type Classification = {
  is_question: boolean;
  on_topic: boolean;
  safe: boolean;
  reason: string;
  normalized_question: string;
};

export type Message = {
  id: string;
  created_at: string;
  nickname: string | null;
  content: string;
  status: MessageStatus;
  classification: Classification | null;
  answer: string | null;
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
