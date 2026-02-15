import { useEffect } from "react";
import { WatcherEvent } from "../shared/watcherEvents";

function resolveWsUrl() {
  const cfg = window.configAPI?.getConfig?.();
  const host = cfg?.wsHost ?? "127.0.0.1";
  const port = cfg?.wsPort ?? 8765;
  return `ws://${host}:${port}`;
}

export function useWatcherSocket(dispatch: React.Dispatch<WatcherEvent>) {
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimeout: number | null = null;

    const connect = () => {
      const WS_URL = resolveWsUrl();
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log("[Watcher] connected", WS_URL);
      };

      socket.onmessage = (msg) => {
        const event: WatcherEvent = JSON.parse(msg.data);
        dispatch(event);
      };

      socket.onerror = () => {
        console.warn("[Watcher] socket error — retrying");
        socket?.close();
      };

      socket.onclose = () => {
        retryTimeout = window.setTimeout(connect, 1000);
      };
    };

    // Delay first connect slightly to let renderer settle
    const initialTimeout = window.setTimeout(connect, 500);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      clearTimeout(initialTimeout);
      socket?.close();
    };
  }, [dispatch]);
}
