"use client";

import { useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { ChatTab } from "@/components/participant/ChatTab";
import { NicknameModal } from "@/components/participant/NicknameModal";
import { Plasma } from "@/components/ui/Plasma";
import { QnATab } from "@/components/participant/QnATab";
import { StatusTab } from "@/components/participant/StatusTab";
import { TabBar, type TabKey } from "@/components/participant/TabBar";
import { useIdentity } from "@/hooks/useIdentity";

export default function Home() {
  const { identity, ready, setNickname } = useIdentity();
  const [tab, setTab] = useState<TabKey>("chat");

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Plasma
          color="#00d4ff"
          speed={0.45}
          direction="forward"
          scale={1.6}
          opacity={0.85}
          mouseInteractive={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(5,8,22,0.35)_0%,rgba(5,8,22,0.85)_60%,rgba(5,8,22,0.95)_100%)]" />
      </div>

      <AppHeader />

      <main className="relative flex-1 overflow-hidden pb-[calc(env(safe-area-inset-bottom)+84px)]">
        {ready && identity ? (
          <>
            <ChatTab identity={identity} active={tab === "chat"} />
            <QnATab identity={identity} active={tab === "qna"} />
            <StatusTab identity={identity} active={tab === "status"} />
          </>
        ) : null}
      </main>

      <TabBar active={tab} onChange={setTab} />

      {ready && !identity ? <NicknameModal onSubmit={setNickname} /> : null}
    </div>
  );
}
