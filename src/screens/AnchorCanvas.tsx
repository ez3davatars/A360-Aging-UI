import { useEffect, useMemo, useState, useRef } from "react";
import AnchorPromptBuilder from "../components/AnchorPromptBuilder";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Upload, Save, FolderOpen, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";

type Props = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  timelineFolderAbs: string;
};

function joinPath(a: string, b: string) {
  return a.replace(/[\\/]+$/, "") + "/" + b;
}

export default function AnchorCanvas({
  subjectId,
  sex,
  ethnicity,
  timelineFolderAbs,
}: Props) {
  const a20Abs = useMemo(
    () => joinPath(timelineFolderAbs, `${subjectId}_A20.png`),
    [timelineFolderAbs, subjectId]
  );
  const a70Abs = useMemo(
    () => joinPath(timelineFolderAbs, `${subjectId}_A70.png`),
    [timelineFolderAbs, subjectId]
  );

  const [a20Preview, setA20Preview] = useState<string | null>(null);
  const [a70Preview, setA70Preview] = useState<string | null>(null);

  const [a20Stored, setA20Stored] = useState(false);
  const [a70Stored, setA70Stored] = useState(false);


  const [a20Base64, setA20Base64] = useState<string | null>(null);
  const [a70Base64, setA70Base64] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const a20InputRef = useRef<HTMLInputElement>(null);
  const a70InputRef = useRef<HTMLInputElement>(null);

  // Load anchors from disk (if they exist)
  useEffect(() => {
    let active = true;

    async function load() {
      setError("");
      setStatus("Loading anchors...");

      const a20 = await window.imageAPI?.loadImageBase64?.(a20Abs);
      const a70 = await window.imageAPI?.loadImageBase64?.(a70Abs);

      if (!active) return;

      setA20Preview(a20 ?? null);
      setA70Preview(a70 ?? null);
      setA20Stored(Boolean(a20));
      setA70Stored(Boolean(a70));
      setStatus("");
    }

    load().catch((e) => {
      if (!active) return;
      setError(String(e));
      setStatus("");
    });

    return () => {
      active = false;
    };
  }, [a20Abs, a70Abs]);

  const handleUpload = (
    file: File,
    setPreview: (v: string) => void,
    setB64: (v: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      const parts = dataUrl.split(",");
      setB64(parts.length > 1 ? parts[1] : "");
    };
    reader.readAsDataURL(file);
  };

  const saveAnchors = async () => {
    setError("");

    if (!a20Base64 && !a20Preview) {
      setError("A20 is missing. Upload A20 (or place it in the TimelineA folder). ");
      return;
    }

    if (!a70Base64 && !a70Preview) {
      setError("A70 is missing. Upload A70 (or place it in the TimelineA folder). ");
      return;
    }

    try {
      setStatus("Saving anchors to TimelineA...");

      // Ensure folder exists
      window.promptAPI?.ensureDir?.(timelineFolderAbs);

      const savePng = window.savePng;
      if (!savePng) {
        throw new Error("savePng bridge is not available. Check Electron preload wiring.");
      }

      // Save only if user uploaded new images in this session
      let a20Hash: string | null = null;
      let a70Hash: string | null = null;

      if (a20Base64) {
        a20Hash = savePng(a20Abs, a20Base64);
      }
      if (a70Base64) {
        a70Hash = savePng(a70Abs, a70Base64);
      }

      // Persist hashes
      const hashRecord = {
        subjectId,
        timestamp: new Date().toISOString(),
        A20: a20Hash,
        A70: a70Hash,
      };
      await window.promptAPI?.savePromptFile?.(
        joinPath(timelineFolderAbs, `${subjectId}_anchor_hashes.json`),
        JSON.stringify(hashRecord, null, 2)
      );

      // Reload from disk
      const a20 = await window.imageAPI?.loadImageBase64?.(a20Abs);
      const a70 = await window.imageAPI?.loadImageBase64?.(a70Abs);

      setA20Preview(a20 ?? null);
      setA70Preview(a70 ?? null);
      setA20Stored(Boolean(a20));
      setA70Stored(Boolean(a70));

      setA20Base64(null);
      setA70Base64(null);

      setStatus("Anchors saved successfully.");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      setError(String(e));
      setStatus("");
    }
  };

  const openTimelineFolder = async () => {
    try {
      await window.shellAPI?.openPath?.(timelineFolderAbs);
    } catch (e: any) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Anchor Canvas</h1>
          <p className="text-muted-foreground mt-1">
            Manage reference anchors for {subjectId}
          </p>
        </div>
        <Button variant="outline" onClick={openTimelineFolder} className="gap-2">
          <FolderOpen className="w-4 h-4" />
          Open Folder
        </Button>
      </div>

      {/* Info Panel */}
      <GlassCard variant="panel" className="p-4 flex items-center justify-between text-sm">
        <div className="space-y-1">
          <div className="text-muted-foreground">Subject Details</div>
          <div className="flex gap-4">
            <span className="text-white font-medium">{sex}</span>
            <span className="text-white/20">|</span>
            <span className="text-white font-medium">{ethnicity}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">Path</div>
          <div className="font-mono text-xs text-white/70 max-w-md truncate" title={timelineFolderAbs}>
            {timelineFolderAbs}
          </div>
        </div>
      </GlassCard>

      <AnchorPromptBuilder subjectId={subjectId} sex={sex} ethnicity={ethnicity} />

      <div className="flex flex-wrap gap-8 justify-center">
        {/* A20 Output */}
        <GlassCard className="space-y-4 flex-1 min-w-[300px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold text-white">A20</h3>
              <span className="text-xs font-mono text-muted-foreground">Young Anchor</span>
            </div>
            <label className="cursor-pointer">
              <div
                className="h-8 px-3 text-xs flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                role="button"
              >
                <Upload className="w-3 h-3 mr-2" />
                Upload
              </div>
              <input
                type="file"
                accept="image/*.png,image/*.jpg,image/*.jpeg,image/*.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setA20Stored(false);
                    handleUpload(f, setA20Preview, setA20Base64);
                  }
                }}
              />
            </label>
          </div>


          <div className="bg-black/40 rounded-lg overflow-hidden border border-white/5 relative group" style={{ aspectRatio: "1/1" }}>
            {a20Stored && !a20Base64 && (
              <div className="absolute top-2 right-2 z-20 bg-black/50 rounded-full p-1" title="Saved to TimelineA">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
            )}
            {a20Base64 && (
              <div className="absolute top-2 right-2 z-20 bg-black/50 rounded-full p-1" title="Uploaded — not saved yet">
                <AlertCircle className="w-5 h-5 text-amber-300" />
              </div>
            )}

            {a20Preview ? (
              <img src={a20Preview} alt="A20" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-xs">Missing Image</span>
              </div>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate">{a20Abs}</div>
        </GlassCard>

        {/* A70 Output */}
        <GlassCard className="space-y-4 flex-1 min-w-[300px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold text-white">A70</h3>
              <span className="text-xs font-mono text-muted-foreground">Old Anchor</span>
            </div>
            <label className="cursor-pointer">
              <div
                className="h-8 px-3 text-xs flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                role="button"
              >
                <Upload className="w-3 h-3 mr-2" />
                Upload
              </div>
              <input
                type="file"
                accept="image/*.png,image/*.jpg,image/*.jpeg,image/*.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setA70Stored(false);
                    handleUpload(f, setA70Preview, setA70Base64);
                  }
                }}
              />
            </label>
          </div>


          <div className="bg-black/40 rounded-lg overflow-hidden border border-white/5 relative group" style={{ aspectRatio: "1/1" }}>
            {a70Stored && !a70Base64 && (
              <div className="absolute top-2 right-2 z-20 bg-black/50 rounded-full p-1" title="Saved to TimelineA">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
            )}
            {a70Base64 && (
              <div className="absolute top-2 right-2 z-20 bg-black/50 rounded-full p-1" title="Uploaded — not saved yet">
                <AlertCircle className="w-5 h-5 text-amber-300" />
              </div>
            )}

            {a70Preview ? (
              <img src={a70Preview} alt="A70" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-xs">Missing Image</span>
              </div>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate">{a70Abs}</div>
        </GlassCard >
      </div >

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          {status && (
            <div className="flex items-center gap-2 text-sm text-green-400 animate-in fade-in slide-in-from-left-2">
              <CheckCircle2 className="w-4 h-4" />
              {status}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive animate-in fade-in slide-in-from-left-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
        <Button onClick={saveAnchors} size="lg" className="shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" />
          Save Anchors
        </Button>
      </div>

      <GlassCard variant="panel" className="mt-8 p-6 bg-black/20">
        <h3 className="font-semibold text-white mb-2">ComfyUI Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Open ComfyUI and load your aging workflow.</li>
          <li>Point the workflow’s image inputs to the saved anchors above (A20 and/or A70).</li>
          <li>
            Preferred: ensure ComfyUI output filenames include the subject + age, e.g.
            <code className="mx-1 px-1 py-0.5 bg-white/10 rounded font-mono text-white">{`${subjectId}_A45_00001_.png`}</code>
            . If your workflow saves age-only filenames (e.g. <code className="mx-1 px-1 py-0.5 bg-white/10 rounded font-mono text-white">age045_00001_.png</code>), keep this subject open/active in A360 so the watcher can route outputs correctly.
          </li>
          <li>
            Run generation. The Python watcher will automatically ingest outputs.
          </li>
        </ol>
      </GlassCard>
    </div >
  );
}
