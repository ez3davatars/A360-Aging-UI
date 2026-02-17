import { useEffect } from "react";
import { WatcherEvent, WatcherStage, WatcherStatus } from "../shared/watcherEvents";

function resolveWsUrl() {
  const cfg = window.configAPI?.getConfig?.();
  const host = cfg?.wsHost ?? "127.0.0.1";
  const port = cfg?.wsPort ?? 8765;
  return `ws://${host}:${port}`;
}

function padAge(age: number) {
  const s = String(age);
  return s.length === 1 ? `0${s}` : s;
}

function extractAgeFromString(s: string): number | null {
  // Matches ..._A25... or ...A25...
  const m = s.match(/\bA(\d{1,3})\b/i) || s.match(/_A(\d{1,3})/i) || s.match(/\bage(\d{2,3})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function normalizeWatcherEvent(raw: any): WatcherEvent | null {
  const subjectId =
    raw?.subjectId ??
    raw?.subject_id ??
    raw?.SubjectID ??
    raw?.subject ??
    null;

  if (!subjectId) return null;

  const status: WatcherStatus =
    (raw?.status ??
      raw?.type ??
      raw?.event ??
      "DETECTED") as WatcherStatus;

  const age: number | null =
    typeof raw?.age === "number"
      ? raw.age
      : typeof raw?.age === "string" && raw.age.trim()
      ? Number(raw.age)
      : raw?.filename
      ? extractAgeFromString(String(raw.filename))
      : raw?.path
      ? extractAgeFromString(String(raw.path))
      : raw?.dest
      ? extractAgeFromString(String(raw.dest))
      : null;

  // We no longer use PROMPT_OUTPUT/ANCHOR in the UI monitor.
  // Everything is treated as COMFY_OUTPUT and rendered in the timeline row.
  const stage: WatcherStage = "COMFY_OUTPUT";

  // Key: ComfyTimeline expects "A25.png"
  let imageKey = raw?.image as string | undefined;
  if (!imageKey && age != null && Number.isFinite(age)) {
    imageKey = `A${padAge(age)}.png`;
  }
  if (!imageKey && raw?.filename) {
    const a = extractAgeFromString(String(raw.filename));
    imageKey = a != null ? `A${padAge(a)}.png` : String(raw.filename);
  }
  if (!imageKey) return null;

  // Path mapping:
  // For the dashboard confirmation row, we only care about "stored" paths.
  // DETECTED/VALIDATED often point to Comfy staging files; don't surface those here.
  let path: string | undefined =
    raw?.dest ??
    raw?.dest_path ??
    (status === "STORED" || status === "INGESTED" ? raw?.path : undefined) ??
    undefined;

  const timestamp: string =
    raw?.timestamp ??
    raw?.ts ??
    raw?.ts_utc ??
    new Date().toISOString();

  const evt: WatcherEvent = {
    subjectId: String(subjectId),
    stage,
    image: String(imageKey),
    status,
    path,
    timestamp,
  };

  return evt;
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
        try {
          const raw = JSON.parse(msg.data);
          const event = normalizeWatcherEvent(raw);
          if (event) dispatch(event);
        } catch (e) {
          console.warn("[Watcher] bad message", e);
        }
      };

      socket.onerror = () => {
        console.warn("[Watcher] socket error — retrying");
        socket?.close();
      };

      socket.onclose = () => {
        retryTimeout = window.setTimeout(connect, 1000);
      };
    };

    const initialTimeout = window.setTimeout(connect, 500);

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      clearTimeout(initialTimeout);
      socket?.close();
    };
  }, [dispatch]);
}
