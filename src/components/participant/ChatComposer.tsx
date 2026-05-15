"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string) => Promise<void>;
};

export function ChatComposer({ onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    try {
      await onSend(v);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSend();
      }}
      className="border-t border-[--ax-border] bg-white px-3 py-2"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          maxLength={500}
          placeholder="메시지를 입력하세요"
          className="ax-scroll max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[--ax-border] bg-[--ax-bg] px-3 py-2 leading-relaxed outline-none focus:border-[--hyundai-blue]"
        />
        <button
          type="submit"
          disabled={sending || text.trim().length === 0}
          className="h-11 shrink-0 rounded-2xl bg-[--hyundai-blue] px-4 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[--hyundai-silver]"
        >
          전송
        </button>
      </div>
    </form>
  );
}
