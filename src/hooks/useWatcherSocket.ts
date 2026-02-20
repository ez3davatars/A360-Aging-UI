import { useEffect, type Dispatch } from "react";
import { WatcherEvent } from "../shared/watcherEvents";

type AnyRecord = Record<string, any>;

function buildWsUrlCandidates(): string[] {
  const cfg = (window as any)?.configAPI?.getConfig?.();

  const explicit =
    cfg?.wsUrl ??
    cfg?.watcherWsUrl ??
    cfg?.watcherWSUrl ??
    cfg?.watcherSocketUrl ??
    null;

  const port = cfg?.wsPort ?? 8765;
  const host = cfg?.wsHost ?? null;

  const urls: string[] = [];

  if (typeof explicit === "string" && explicit.trim()) {
    urls.push(explicit.trim());
  }

  if (typeof host === "string" && host.trim()) {
    urls.push(`ws://${host.trim()}:${port}`);
  }

  // Robust local fallbacks (covers IPv4-only + IPv6-only watchers)
  urls.push(`ws://127.0.0.1:${port}`);
  urls.push(`ws://localhost:${port}`);
  urls.push(`ws://[::1]:${port}`);

  return Array.from(new Set(urls));
}

function normalizeWatcherEvent(raw: unknown): WatcherEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as AnyRecord;

  // Some emitters wrap payload under "data"
  const base: AnyRecord = r.data && typeof r.data === "object" ? { ...r, ...r.data } : { ...r };

  const typeRaw = base.type ?? base.event ?? base.kind ?? base.action ?? base.name;
  const type = typeof typeRaw === "string" ? typeRaw.toUpperCase() : typeRaw;

  const subjectId = base.subjectId ?? base.subject_id ?? base.subjectID ?? base.subject ?? base.id;

  const path =
    base.path ??
    base.filePath ??
    base.file_path ??
    base.file ??
    base.filename ??
    base.full_path;

  if (!type) return null;

  const normalized: AnyRecord = { ...base, type };

  // Keep both keys to satisfy older reducers/UI consumers
  if (subjectId != null) {
    normalized.subjectId = subjectId;
    normalized.subject_id = subjectId;
  }

  if (path != null) {
    normalized.path = path;
    normalized.filePath = path;
    normalized.file_path = path;
  }

  return normalized as WatcherEvent;
}

async function readMessageData(data: any): Promise<string | null> {
  if (typeof data === "string") return data;

  // ArrayBuffer
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }

  // Blob
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return await data.text();
  }

  return null;
}

export function useWatcherSocket(dispatch: Dispatch<WatcherEvent>) {
  useEffect(() => {
    const urls = buildWsUrlCandidates();
    let preferredUrl: string | null = null;
    let urlIndex = 0;

    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let connectTimeout: number | null = null;

    let retryMs = 750;
    let unmounted = false;

    const scheduleReconnect = (rotateHost: boolean) => {
      if (retryTimer) window.clearTimeout(retryTimer);
      if (connectTimeout) window.clearTimeout(connectTimeout);

      if (rotateHost) {
        preferredUrl = null;
        urlIndex = (urlIndex + 1) % urls.length;
      }

      retryMs = Math.min(Math.round(retryMs * 1.5), 5000);
      retryTimer = window.setTimeout(connect, retryMs);
    };

    const connect = () => {
      if (unmounted) return;

      const url = preferredUrl ?? urls[urlIndex] ?? `ws://127.0.0.1:8765`;

      let opened = false;

      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect(true);
        return;
      }

      // If it never opens, force-close and rotate
      connectTimeout = window.setTimeout(() => {
        if (!opened) {
          try {
            socket?.close();
          } catch { }
        }
      }, 2000);

      socket.onopen = () => {
        opened = true;
        retryMs = 750;
        preferredUrl = url;
        console.log("[Watcher] connected", url);
      };

      socket.onmessage = async (msg) => {
        try {
          const text = await readMessageData(msg.data);
          if (!text) return;

          const raw = JSON.parse(text);
          const evt = normalizeWatcherEvent(raw);
          if (!evt) return;

          dispatch(evt);
        } catch (e) {
          console.warn("[Watcher] message parse failed", e);
        }
      };

      socket.onerror = () => {
        console.warn("[Watcher] socket error");
      };

      socket.onclose = () => {
        if (unmounted) return;

        // If we never opened, rotate host candidate (covers ::1 vs 127.0.0.1 mismatch)
        scheduleReconnect(!opened);
      };
    };

    const initial = window.setTimeout(connect, 200);

    return () => {
      unmounted = true;
      window.clearTimeout(initial);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (connectTimeout) window.clearTimeout(connectTimeout);
      try {
        socket?.close();
      } catch { }
    };
  }, [dispatch]);
}
