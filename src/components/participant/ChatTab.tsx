"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import type { Identity } from "@/hooks/useIdentity";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";

type Props = {
  identity: Identity;
  active: boolean;
};

export function ChatTab({ identity, active }: Props) {
  const { messages, send, loading } = useChat();
  const [error, setError] = useState<string | null>(null);

  async function handleSend(text: string) {
    setError(null);
    try {
      await send({ ...identity, text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송 실패");
    }
  }

  return (
    <section
      className={"flex h-full flex-col " + (active ? "" : "hidden")}
      aria-hidden={!active}
    >
      <ChatMessageList
        messages={messages}
        myUserId={identity.userId}
        loading={loading}
      />
      {error ? (
        <div className="mx-3 mb-1 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
          {error}
        </div>
      ) : null}
      <ChatComposer onSend={handleSend} />
    </section>
  );
}
