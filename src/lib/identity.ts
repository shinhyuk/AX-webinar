"use client";

const NICK_KEY = "ax.nickname";
const UID_KEY = "ax.userId";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readIdentity(): { nickname: string | null; userId: string } {
  const nickname = safeGet(NICK_KEY);
  let userId = safeGet(UID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    safeSet(UID_KEY, userId);
  }
  return { nickname, userId };
}

export function saveNickname(nickname: string) {
  safeSet(NICK_KEY, nickname.trim());
}

export function clearIdentity() {
  try {
    window.localStorage.removeItem(NICK_KEY);
    window.localStorage.removeItem(UID_KEY);
  } catch {
    /* ignore */
  }
}
