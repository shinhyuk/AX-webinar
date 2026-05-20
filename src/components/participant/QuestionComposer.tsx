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

  const canSend = text.trim().length > 0 && !sending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="ax-glass border-b border-line px-3 pt-3 pb-3"
    >
      <label className="px-1 text-[11px] font-semibold tracking-wide text-muted">
        발표자에게 질문하기
      </label>
      <div className="mt-1.5 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="궁금한 점을 자유롭게 남겨주세요"
          className="ax-input ax-scroll min-h-[64px] flex-1 resize-none rounded-2xl px-4 py-2.5 leading-relaxed"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="ax-btn-primary h-12 shrink-0 rounded-2xl px-4 text-sm font-bold"
        >
          등록
        </button>
      </div>
    </form>
  );
}
