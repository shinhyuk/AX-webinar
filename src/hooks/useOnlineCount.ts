"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const CLIENT_KEY = "ax.clientId";

function clientId(): string {
  try {
    let v = window.localStorage.getItem(CLIENT_KEY);
    if (!v) {
      v = crypto.randomUUID();
      window.localStorage.setItem(CLIENT_KEY, v);
    }
    return v;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/**
 * Supabase Realtime Presence 기반 접속자 수.
 * track=true(청중)는 자신을 presence에 등록하고, false(스테이지/운영자)는 보기만 한다.
 * presence key를 브라우저 단위 고정 id로 써서 같은 사람의 다중 탭은 1명으로 센다.
 */
export function useOnlineCount(track: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const key = track
      ? clientId()
      : `viewer-${Math.random().toString(36).slice(2)}`;

    const channel = supabase.channel("online-users", {
      config: { presence: { key } },
    });

    const recount = () => {
      const state = channel.presenceState();
      let n = 0;
      for (const k of Object.keys(state)) {
        const metas = state[k] as Array<{ role?: string }>;
        if (metas.some((m) => m.role === "audience")) n++;
      }
      setCount(n);
    };

    channel
      .on("presence", { event: "sync" }, recount)
      .on("presence", { event: "join" }, recount)
      .on("presence", { event: "leave" }, recount)
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && track) {
          void channel.track({ role: "audience" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [track]);

  return count;
}
