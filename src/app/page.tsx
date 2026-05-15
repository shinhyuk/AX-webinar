"use client";

import { useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { ChatTab } from "@/components/participant/ChatTab";
import { NicknameModal } from "@/components/participant/NicknameModal";
import { QnATab } from "@/components/participant/QnATab";
import { StatusTab } from "@/components/participant/StatusTab";
import { TabBar, type TabKey } from "@/components/participant/TabBar";
import { useIdentity } from "@/hooks/useIdentity";

export default function Home() {
  const { identity, ready, setNickname } = useIdentity();
  const [tab, setTab] = useState<TabKey>("chat");

  return (
    <div className="flex h-[100dvh] flex-col">
      <AppHeader />

      <main className="relative flex-1 overflow-hidden pb-[calc(env(safe-area-inset-bottom)+80px)]">
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
