"use client";

import { useState } from "react";

type Props = {
  onSubmit: (text: string) => Promise<void>;
};

export function QuestionComposer({ onSubmit }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    try {
      await onSubmit(v);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="border-b border-[--ax-border] bg-white px-3 py-2"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="발표자에게 궁금한 점을 남겨주세요"
          className="ax-scroll min-h-[60px] flex-1 resize-none rounded-2xl border border-[--ax-border] bg-[--ax-bg] px-3 py-2 leading-relaxed outline-none focus:border-[--hyundai-blue]"
        />
        <button
          type="submit"
          disabled={sending || text.trim().length === 0}
          className="h-11 shrink-0 rounded-2xl bg-[--hyundai-blue] px-4 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[--hyundai-silver]"
        >
          질문 등록
        </button>
      </div>
    </form>
  );
}
