import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경변수가 없습니다. 서버 라우트에서만 호출하세요.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODELS = {
  classify: "claude-haiku-4-5-20251001",
  answer: "claude-sonnet-4-6",
} as const;
