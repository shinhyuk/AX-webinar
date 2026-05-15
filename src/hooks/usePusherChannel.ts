"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";

type Handler<T> = (data: T) => void;

export function usePusherChannel<T>(
  channelName: string,
  eventName: string,
  handler: Handler<T>,
) {
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(channelName);
    const wrapped = (data: T) => handler(data);
    channel.bind(eventName, wrapped);
    return () => {
      channel.unbind(eventName, wrapped);
      // 채널 자체는 다른 핸들러가 쓸 수도 있으니 unsubscribe하지 않음
    };
  }, [channelName, eventName, handler]);
}
