"use client";

import { useCallback, useEffect, useState } from "react";
import { readIdentity, saveNickname } from "@/lib/identity";

export type Identity = { userId: string; nickname: string };

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { nickname, userId } = readIdentity();
    // localStorage는 SSR에서 접근 불가하므로 마운트 후 동기화
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(nickname ? { userId, nickname } : null);
    setReady(true);
  }, []);

  const setNickname = useCallback((nickname: string) => {
    const { userId } = readIdentity();
    saveNickname(nickname);
    setIdentity({ userId, nickname: nickname.trim() });
  }, []);

  return { identity, ready, setNickname };
}
