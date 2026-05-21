"use client";

import { useEffect, useState } from "react";
import {
  getPusherClient,
  setPusherIdentity,
  type PusherIdentity,
} from "@/lib/pusher-client";

const PRESENCE_CHANNEL = "presence-webinar";

type PresenceMember = { id: string; info?: { role?: string } };
type PresenceChannel = {
  members?: { each: (cb: (m: PresenceMember) => void) => void };
};

export function usePresence(identity: PusherIdentity): number {
  const [count, setCount] = useState(0);
  const { userId, nickname, role } = identity;

  useEffect(() => {
    setPusherIdentity({ userId, nickname, role });
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(PRESENCE_CHANNEL);

    const recount = () => {
      let n = 0;
      const members = (channel as unknown as PresenceChannel).members;
      members?.each((m) => {
        if (m.info?.role !== "admin") n++;
      });
      setCount(n);
    };

    channel.bind("pusher:subscription_succeeded", recount);
    channel.bind("pusher:member_added", recount);
    channel.bind("pusher:member_removed", recount);

    return () => {
      channel.unbind("pusher:subscription_succeeded", recount);
      channel.unbind("pusher:member_added", recount);
      channel.unbind("pusher:member_removed", recount);
      pusher.unsubscribe(PRESENCE_CHANNEL);
    };
  }, [userId, nickname, role]);

  return count;
}
