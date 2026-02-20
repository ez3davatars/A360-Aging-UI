import { useEffect, useMemo, useRef, useState } from "react";
import ImageTile from "./ImageTile";

type Props = {
  outputs: Record<string, any>;
  subjectId?: string | null;
  timelineDir?: string | null;
};

const AGES = ["A20", "A25", "A30", "A35", "A40", "A45", "A50", "A55", "A60", "A65", "A70"];

function winPath(p: string) {
  return p.replace(/\//g, "\\");
}

function dirname(p: string) {
  const s = winPath(p);
  const i = s.lastIndexOf("\\");
  return i >= 0 ? s.slice(0, i) : "";
}

function inferSubjectAndDir(outputs: Record<string, any>) {
  for (const v of Object.values(outputs ?? {})) {
    const p = v?.path;
    if (typeof p !== "string" || !p) continue;

    const wp = winPath(p);
    const file = wp.split("\\").pop() ?? "";
    const m = /^(S\d{3})_A\d{1,3}(_.*)?\.png$/i.exec(file);
    if (!m) continue;

    return { subjectId: m[1].toUpperCase(), timelineDir: dirname(wp) };
  }
  return { subjectId: null as string | null, timelineDir: null as string | null };
}

function pathExists(p: string) {
  const fn = (window.promptAPI as any)?.pathExists;
  if (typeof fn !== "function") return false;
  return !!fn(p);
}

export default function ComfyTimeline({ outputs, subjectId: propSubjectId, timelineDir: propTimelineDir }: Props) {
  const inferred = useMemo(() => inferSubjectAndDir(outputs), [outputs]);
  const subjectId = propSubjectId || inferred.subjectId;
  const timelineDir = propTimelineDir || inferred.timelineDir;

  // Build the image map for tiles:
  const tiles = useMemo(() => {
    const map: Record<string, any> = {};
    const baseDir = timelineDir ? winPath(timelineDir).replace(/\\+$/, "") : null;
    const sid = subjectId?.toUpperCase();

    for (const age of AGES) {
      const key = `${age}.png`;
      const existing = outputs?.[key];

      // Canonical path in TimelineA (S001_A20.png)
      const canonicalPath = (baseDir && sid) ? `${baseDir}\\${sid}_${age}.png` : null;
      let canonicalExists = canonicalPath ? pathExists(canonicalPath) : false;

      // Fallback path check (subject001_A20.png)
      let finalPath = canonicalPath;
      if (!canonicalExists && baseDir && sid) {
        const num = sid.replace(/\D/g, "");
        const fallbackPath = `${baseDir}\\subject${num}_${age}.png`;
        if (pathExists(fallbackPath)) {
          finalPath = fallbackPath;
          canonicalExists = true;
        }
      }

      // Use canonical if it exists, otherwise fall back to reported path or none
      const p = canonicalExists ? finalPath : (existing?.path || null);
      const isDone = canonicalExists || ["INGESTED", "DONE", "STORED"].includes(existing?.status?.toUpperCase() || "");

      map[age] = {
        status: isDone ? "DONE" : (existing?.status ?? "WAITING"),
        path: p,
      };
    }
    return map;
  }, [outputs, subjectId, timelineDir]);

  const timelineComplete = useMemo(() => {
    if (!subjectId || !timelineDir) return false;
    return AGES.every((age) => pathExists(`${timelineDir}\\${subjectId}_${age}.png`));
  }, [subjectId, timelineDir, outputs]);

  // Auto-manifest generation when Timeline Complete appears
  const [manifestState, setManifestState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [manifestMsg, setManifestMsg] = useState<string>("");
  const autoRan = useRef(false);

  useEffect(() => {
    if (!timelineComplete) {
      autoRan.current = false;
      setManifestState("idle");
      setManifestMsg("");
      return;
    }
    if (!subjectId || !timelineDir) return;
    if (autoRan.current) return;

    autoRan.current = true;
    setManifestState("generating");
    setManifestMsg("Generating manifest...");

    (async () => {
      try {
        const raw = await window.runPython?.("python/generate_subject_manifest.py", [
          "--subject",
          subjectId,
          "--timelineDir",
          timelineDir,
        ]);
        setManifestState("ready");
        setManifestMsg(raw ? "Manifest ready." : "Manifest ready.");
      } catch (e: any) {
        setManifestState("error");
        setManifestMsg(String(e));
      }
    })();
  }, [timelineComplete, subjectId, timelineDir]);

  const [exportState, setExportState] = useState<"idle" | "exporting" | "done" | "error">("idle");

  async function exportSubject() {
    if (!subjectId || !timelineDir) return;

    setExportState("exporting");
    setManifestMsg("Exporting subject zip...");

    try {
      const out = await window.runPython?.("python/export_subject.py", [
        "--subject",
        subjectId,
        "--timeline",
        timelineDir,
      ]);

      let zipPath: string | null = null;
      try {
        const parsed = JSON.parse(out ?? "{}");
        zipPath = parsed.zip_path ?? parsed.zipPath ?? null;
      } catch {
        // ignore
      }

      setExportState("done");
      setManifestMsg(zipPath ? `Exported: ${zipPath}` : "Export complete.");

      if (zipPath) {
        window.shellAPI?.openPath?.(zipPath);
      }
    } catch (e: any) {
      setExportState("error");
      setManifestMsg(String(e));
    }
  }

  const exportEnabled = timelineComplete && manifestState !== "generating";

  return (
    <div className="space-y-3 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          ComfyUI Aging Timeline
        </h3>

        <div className="flex items-center gap-2">
          {timelineComplete && (
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              Timeline Complete
            </span>
          )}

          <button
            className={[
              "text-[11px] px-3 py-1 rounded-full border transition",
              exportEnabled ? "bg-white/10 hover:bg-white/15 border-white/15 text-white" : "bg-white/5 border-white/10 text-white/40 cursor-not-allowed",
            ].join(" ")}
            disabled={!exportEnabled}
            onClick={exportSubject}
            title={exportEnabled ? "Create subject export zip" : "Export enabled after timeline is complete"}
          >
            {exportState === "exporting" ? "Exporting..." : "Export Subject"}
          </button>
        </div>
      </div>

      {(manifestState !== "idle" || exportState !== "idle") && manifestMsg && (
        <div className="text-xs text-white/60">
          {manifestMsg}
        </div>
      )}

      <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-11 gap-2">
        {AGES.map((age) => (
          <ImageTile
            key={age}
            label={age}
            image={tiles[age]}
          />
        ))}
      </div>
    </div>
  );
}
