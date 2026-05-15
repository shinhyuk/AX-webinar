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

  const canSend = text.trim().length > 0 && !sending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSend();
      }}
      className="border-t border-line-soft bg-surface/95 px-3 pt-2.5 pb-3 backdrop-blur"
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
          className="ax-scroll max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-line bg-background px-4 py-2.5 leading-relaxed outline-none transition-colors focus:border-hyundai focus:bg-surface focus:ring-4 focus:ring-hyundai/10"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="전송"
          className={
            "flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full transition-all " +
            (canSend
              ? "bg-hyundai text-white shadow-md shadow-hyundai/25 active:scale-95"
              : "bg-line text-muted")
          }
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
