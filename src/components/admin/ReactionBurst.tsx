"use client";

import { useState } from "react";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { STATUS_EMOJI, type StatusKey } from "@/lib/types";

export function ReactionBurst() {
  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(
    null,
  );

  usePusherChannel<{ status?: StatusKey }>("reactions", "updated", (data) => {
    const status = data?.status;
    if (status && STATUS_EMOJI[status]) {
      setBurst({ emoji: STATUS_EMOJI[status], key: Date.now() });
    }
  });

  if (!burst) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
      aria-hidden
    >
      <span
        key={burst.key}
        className="ax-emoji-burst select-none leading-none"
        style={{ fontSize: "min(42vh, 42vw)" }}
        onAnimationEnd={() => setBurst(null)}
      >
        {burst.emoji}
      </span>
    </div>
  );
}
