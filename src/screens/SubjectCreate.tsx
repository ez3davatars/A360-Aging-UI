import { useMemo, useState } from "react";

type SubjectCreateResult = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  fitzpatrickTone: string;
  notes: string;
  basePathRel: string;
  subjectFolderAbs: string;
  timelineFolderAbs: string;
  timelineFolderRel: string;
};

export default function SubjectCreate({
  onCreated,
}: {
  onCreated: (data: SubjectCreateResult) => void;
}) {
  const cfg = useMemo(() => window.configAPI?.getConfig?.() ?? null, []);
  const cfgPath = useMemo(
    () => window.configAPI?.getConfigPath?.() ?? "(configAPI unavailable)",
    []
  );

  const [sex, setSex] = useState("Male");
  const [ethnicity, setEthnicity] = useState("");
  const [fitz, setFitz] = useState("III");
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const createSubject = async () => {
    setError("");
    setOutput("");

    if (!cfg) {
      setError(
        `Missing config. Fix a360.config.json first. Expected at: ${cfgPath}`
      );
      return;
    }

    const eth = ethnicity.trim();
    if (!eth) {
      setError("Ethnicity_Group is required (matches the Excel schema). ");
      return;
    }

    setOutput("Creating subject (Excel + folders)…");

    try {
      const stdout = await window.runPython("python/a360_subject_cli.py", [
        "create-subject",
        "--sex",
        sex,
        "--ethnicity",
        eth,
        "--fitz",
        fitz,
        "--notes",
        notes,
      ]);

      // The CLI prints ONLY JSON to stdout.
      const data = JSON.parse(stdout) as SubjectCreateResult;

      setOutput(
        `Created ${data.subjectId}\n${data.timelineFolderAbs}\nExcel updated: ${cfg.excelPath}`
      );

      onCreated(data);
    } catch (err: any) {
      console.error(err);
      setError(
        String(err)
          .replace(/^Error:\s*/i, "")
          .trim()
      );
      setOutput("");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Create Subject</h1>

      <div style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd" }}>
        <div>
          <strong>Config path:</strong> {cfgPath}
        </div>
        <div>
          <strong>Project root:</strong> {cfg?.projectRoot ?? "(not loaded)"}
        </div>
        <div>
          <strong>Excel:</strong> {cfg?.excelPath ?? "(not loaded)"}
        </div>
        <div>
          <strong>Comfy output:</strong> {cfg?.comfyOutputDir ?? "(not loaded)"}
        </div>
      </div>

      <label style={{ display: "block", marginBottom: 12 }}>
        Sex
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        Ethnicity_Group
        <input
          type="text"
          value={ethnicity}
          onChange={(e) => setEthnicity(e.target.value)}
          placeholder='e.g. "Black Afro-Caribbean"'
          style={{ marginLeft: 8, width: 420 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        Fitzpatrick_Tone
        <select
          value={fitz}
          onChange={(e) => setFitz(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          {[
            "I",
            "II",
            "III",
            "IV",
            "V",
            "VI",
            "I–II",
            "III–IV",
            "V–VI",
          ].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        Notes
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional (e.g. square face, tight curls)"
          style={{ marginLeft: 8, width: 620 }}
        />
      </label>

      <button onClick={createSubject}>Create Subject</button>

      {output && (
        <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>{output}</pre>
      )}
      {error && (
        <pre style={{ marginTop: 20, color: "red", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      <div style={{ marginTop: 24, padding: 12, border: "1px solid #eee" }}>
        <strong>Important:</strong> close the Excel workbook before creating subjects
        or running the watcher. If Excel has the file open, Python cannot write
        updates.
      </div>
    </div>
  );
}
