import { z } from "zod";
import { STATUS_KEYS } from "./types";

const nickname = z
  .string()
  .trim()
  .min(1, "닉네임을 입력해주세요.")
  .max(12, "닉네임은 12자 이하로 입력해주세요.");

const userId = z.string().min(8).max(64);

const text = z.string().trim().min(1).max(500);

export const ChatMessageInput = z.object({
  userId,
  nickname,
  text,
});

export const QuestionInput = z.object({
  userId,
  nickname,
  text,
});

export const ReactionInput = z.object({
  userId,
  status: z.enum(STATUS_KEYS),
});

export const NicknameInput = z.object({ nickname });
