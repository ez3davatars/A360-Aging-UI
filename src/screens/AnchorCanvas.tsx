import { useEffect, useMemo, useState } from "react";
import AnchorPromptBuilder from "../components/AnchorPromptBuilder";

type Props = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  timelineFolderAbs: string; // .../Aging/<Sex>/<Group>/subject###/TimelineA
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

  const [a20Base64, setA20Base64] = useState<string | null>(null);
  const [a70Base64, setA70Base64] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Load anchors from disk (if they exist)
  useEffect(() => {
    let active = true;

    async function load() {
      setError("");
      setStatus("Loading anchors from disk…");

      const a20 = await window.imageAPI?.loadImageBase64?.(a20Abs);
      const a70 = await window.imageAPI?.loadImageBase64?.(a70Abs);

      if (!active) return;

      setA20Preview(a20);
      setA70Preview(a70);
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
      setStatus("Saving anchors to TimelineA…");

      // Ensure folder exists
      window.promptAPI?.ensureDir?.(timelineFolderAbs);

      // Save only if user uploaded new images in this session
      let a20Hash: string | null = null;
      let a70Hash: string | null = null;

      if (a20Base64) {
        a20Hash = window.savePng(a20Abs, a20Base64);
      }
      if (a70Base64) {
        a70Hash = window.savePng(a70Abs, a70Base64);
      }

      // Persist hashes (optional but good for ML traceability)
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

      // Reload from disk so UI reflects what actually exists
      const a20 = await window.imageAPI?.loadImageBase64?.(a20Abs);
      const a70 = await window.imageAPI?.loadImageBase64?.(a70Abs);

      setA20Preview(a20);
      setA70Preview(a70);

      setA20Base64(null);
      setA70Base64(null);

      setStatus("Anchors saved.");
      window.setTimeout(() => setStatus(""), 1500);
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
    <div style={{ padding: 40, maxWidth: 1100 }}>
      <h1>Anchor Canvas</h1>

      <p>
        <strong>Subject:</strong> {subjectId} <br />
        <strong>Sex:</strong> {sex} <br />
        <strong>Ethnicity:</strong> {ethnicity}
      </p>

      <div style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd" }}>
        <div>
          <strong>TimelineA folder:</strong> {timelineFolderAbs}
        </div>
        <button onClick={openTimelineFolder} style={{ marginTop: 8 }}>
          Open TimelineA Folder
        </button>
      </div>

      <AnchorPromptBuilder subjectId={subjectId} sex={sex} ethnicity={ethnicity} />

      <h2>Anchors</h2>
      <div style={{ display: "flex", gap: 40, marginBottom: 20 }}>
        <div>
          <h3>A20</h3>
          <div style={{ marginBottom: 6, fontFamily: "monospace" }}>{a20Abs}</div>
          {a20Preview ? <img src={a20Preview} width={250} /> : <div>(missing)</div>}
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, (v) => setA20Preview(v), (v) => setA20Base64(v));
              }}
            />
          </div>
        </div>

        <div>
          <h3>A70</h3>
          <div style={{ marginBottom: 6, fontFamily: "monospace" }}>{a70Abs}</div>
          {a70Preview ? <img src={a70Preview} width={250} /> : <div>(missing)</div>}
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, (v) => setA70Preview(v), (v) => setA70Base64(v));
              }}
            />
          </div>
        </div>
      </div>

      <button onClick={saveAnchors}>Save Anchors to TimelineA</button>

      {status && <div style={{ marginTop: 10 }}>{status}</div>}
      {error && (
        <pre style={{ marginTop: 10, color: "red", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      <div style={{ marginTop: 24, padding: 12, border: "1px solid #eee" }}>
        <h3>Manual ComfyUI (required)</h3>
        <ol>
          <li>Open ComfyUI and load your aging workflow.</li>
          <li>Point the workflow’s image inputs to the saved anchors above (A20 and/or A70).</li>
          <li>
            Ensure ComfyUI output filenames include the subject + age, e.g.
            <code style={{ marginLeft: 6 }}>{`${subjectId}_A45_00001_.png`}</code> or
            <code style={{ marginLeft: 6 }}>{`subject${subjectId.slice(1)}_age045_00001_.png`}</code>.
          </li>
          <li>
            Run generation. The Python watcher will automatically ingest outputs into
            this subject’s TimelineA folder and update the Excel workbook.
          </li>
        </ol>
      </div>
    </div>
  );
}
