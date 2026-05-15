"use client";

import { useCallback, useEffect, useState } from "react";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import type { Question } from "@/lib/types";

type Buckets = { pending: Question[]; answered: Question[] };

function applyUpdate(prev: Buckets, q: Question): Buckets {
  const pending = prev.pending.filter((x) => x.id !== q.id);
  const answered = prev.answered.filter((x) => x.id !== q.id);
  if (q.answered) {
    answered.push(q);
    answered.sort((a, b) => (a.answeredAt ?? 0) - (b.answeredAt ?? 0));
  } else {
    pending.unshift(q);
    pending.sort((a, b) => b.ts - a.ts);
  }
  return { pending, answered };
}

function applyDelete(prev: Buckets, id: string): Buckets {
  return {
    pending: prev.pending.filter((q) => q.id !== id),
    answered: prev.answered.filter((q) => q.id !== id),
  };
}

export function useQuestions() {
  const [data, setData] = useState<Buckets>({ pending: [], answered: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/questions", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as Buckets;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePusherChannel<Question>("questions", "new-question", (q) => {
    setData((prev) => {
      if (prev.pending.some((x) => x.id === q.id)) return prev;
      const pending = [q, ...prev.pending].sort((a, b) => b.ts - a.ts);
      return { ...prev, pending };
    });
  });

  usePusherChannel<Question>("questions", "updated", (q) => {
    setData((prev) => applyUpdate(prev, q));
  });

  usePusherChannel<{ id: string }>("questions", "deleted", ({ id }) => {
    setData((prev) => applyDelete(prev, id));
  });

  usePusherChannel("admin", "reset", () =>
    setData({ pending: [], answered: [] }),
  );

  const submit = useCallback(
    async (input: { userId: string; nickname: string; text: string }) => {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "질문 등록에 실패했습니다.");
      }
    },
    [],
  );

  const markAnswered = useCallback(
    async (id: string, answered: boolean) => {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answered }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "상태 변경에 실패했습니다.");
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "삭제에 실패했습니다.");
    }
  }, []);

  return { ...data, loading, submit, markAnswered, remove, refresh };
}
