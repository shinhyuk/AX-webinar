"use client";

import { useCallback, useEffect, useState } from "react";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import {
  EMPTY_REACTION_COUNTS,
  type ReactionCounts,
  type StatusKey,
} from "@/lib/types";

const MINE_KEY = "ax.myReaction";

function readMine(): StatusKey | null {
  try {
    const v = window.localStorage.getItem(MINE_KEY);
    return (v as StatusKey) ?? null;
  } catch {
    return null;
  }
}

function saveMine(v: StatusKey | null) {
  try {
    if (v) window.localStorage.setItem(MINE_KEY, v);
    else window.localStorage.removeItem(MINE_KEY);
  } catch {
    /* ignore */
  }
}

export function useReactions() {
  const [counts, setCounts] = useState<ReactionCounts>(EMPTY_REACTION_COUNTS);
  const [total, setTotal] = useState(0);
  const [mine, setMine] = useState<StatusKey | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/reactions", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        counts: ReactionCounts;
        total: number;
      };
      setCounts(json.counts);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // localStorage는 SSR에서 접근 불가하므로 마운트 후 동기화
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMine(readMine());
    void refresh();
  }, [refresh]);

  usePusherChannel<{ counts: ReactionCounts; total: number }>(
    "reactions",
    "updated",
    ({ counts, total }) => {
      setCounts(counts);
      setTotal(total);
    },
  );

  usePusherChannel("admin", "reset", () => {
    setCounts(EMPTY_REACTION_COUNTS);
    setTotal(0);
    saveMine(null);
    setMine(null);
  });

  const select = useCallback(
    async (userId: string, status: StatusKey) => {
      const prevMine = mine;
      setMine(status);
      saveMine(status);
      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, status }),
        });
        if (!res.ok) throw new Error("반응 등록 실패");
        const json = (await res.json()) as {
          counts: ReactionCounts;
          total: number;
        };
        setCounts(json.counts);
        setTotal(json.total);
      } catch (e) {
        setMine(prevMine);
        saveMine(prevMine);
        throw e;
      }
    },
    [mine],
  );

  return { counts, total, mine, loading, select, refresh };
}
