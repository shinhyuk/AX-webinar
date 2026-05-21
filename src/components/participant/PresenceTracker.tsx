"use client";

import { usePresence } from "@/hooks/usePresence";
import type { Identity } from "@/hooks/useIdentity";

export function PresenceTracker({ identity }: { identity: Identity }) {
  usePresence({
    userId: identity.userId,
    nickname: identity.nickname,
    role: "participant",
  });
  return null;
}
