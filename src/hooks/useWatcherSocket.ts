import { useEffect } from "react";
import { WatcherEvent } from "../shared/watcherEvents";

const WS_URL = "ws://127.0.0.1:8765";

export function useWatcherSocket(
  dispatch: React.Dispatch<WatcherEvent>
) {
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimeout: number | null = null;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log("[Watcher] connected");
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
