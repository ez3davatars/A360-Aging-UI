import { useState, useEffect } from "react";
import AnchorPromptBuilder from "../components/AnchorPromptBuilder";

type Props = {
  subjectId: string;
  sex: string;
  ethnicity: string;
};

export default function AnchorCanvas({
  subjectId,
  sex,
  ethnicity,
}: Props) {
  const [selectedAnchorVersion, setSelectedAnchorVersion] =
    useState<number | null>(null);
  const [currentAnchorVersion, setCurrentAnchorVersion] =
    useState<number | null>(null);

  const [currentTimelineVersion, setCurrentTimelineVersion] =
    useState<number | null>(null);

  const [a20Preview, setA20Preview] = useState<string | undefined>(undefined);
  const [a70Preview, setA70Preview] = useState<string | undefined>(undefined);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");

  // -----------------------------
  // VERSION HELPERS
  // -----------------------------

  const getLatestVersion = (basePath: string): number | null => {
    if (!window.promptAPI?.pathExists) return null;

    let version = 1;
    let lastFound: number | null = null;

    while (true) {
      const versionPath = `${basePath}/v${version}`;
      const exists = window.promptAPI.pathExists(versionPath);
      if (!exists) break;
      lastFound = version;
      version++;
    }

    return lastFound;
  };

  const getNextVersion = (basePath: string): number => {
    const latest = getLatestVersion(basePath);
    return latest ? latest + 1 : 1;
  };

  // -----------------------------
  // AUTO LOAD LATEST VERSIONS
  // -----------------------------

  useEffect(() => {
    const anchorBase = `D:/A360/A360_AgingDataset/Subjects/${subjectId}/anchors`;
    const latest = getLatestVersion(anchorBase);

    if (latest) {
      setCurrentAnchorVersion(latest);
      setSelectedAnchorVersion(latest);

      const versionPath = `${anchorBase}/v${latest}`;
      const a20Path = `${versionPath}/A20.png`;
      const a70Path = `${versionPath}/A70.png`;

      if (window.imageAPI?.loadImageBase64) {
        window.imageAPI.loadImageBase64(a20Path).then((data) => {
          if (data) setA20Preview(data);
        });

        window.imageAPI.loadImageBase64(a70Path).then((data) => {
          if (data) setA70Preview(data);
        });
      }
    }

    const timelineBase = `D:/A360/A360_AgingDataset/Subjects/${subjectId}/timeline`;
    const latestTimeline = getLatestVersion(timelineBase);

    if (latestTimeline) {
      setCurrentTimelineVersion(latestTimeline);
    }

  }, [subjectId]);

  const generateTimeline = async () => {
    if (!selectedAnchorVersion) {
      alert("Select an anchor version.");
      return;
    }

    try {
      setGenerating(true);
      setProgress("Preparing timeline folder...");

      const subjectBase = `D:/A360/A360_AgingDataset/Subjects/${subjectId}`;
      const timelineBase = `${subjectBase}/timeline`;

      window.promptAPI.ensureDir(timelineBase);

      const newTimelineVersion = getNextVersion(timelineBase);
      const timelinePath = `${timelineBase}/v${newTimelineVersion}`;

      window.promptAPI.ensureDir(timelinePath);

      const metadata = {
        subjectId,
        anchorVersion: selectedAnchorVersion,
        timelineVersion: newTimelineVersion,
        timestamp: new Date().toISOString(),
        mode: "manual_comfy",
      };

      await window.promptAPI.savePromptFile(
        `${timelinePath}/metadata.json`,
        JSON.stringify(metadata, null, 2)
      );

      setCurrentTimelineVersion(newTimelineVersion);
      setProgress("Timeline folder created. Run Comfy manually.");
      alert(`Timeline v${newTimelineVersion} initialized.`);
    } catch (err) {
      console.error(err);
      alert("Timeline initialization failed.");
    } finally {
      setGenerating(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div style={{ padding: 40 }}>
      <h1>Anchor Canvas</h1>

      <p>
        <strong>Subject:</strong> {subjectId} <br />
        <strong>Sex:</strong> {sex} <br />
        <strong>Ethnicity:</strong> {ethnicity}
      </p>

      <AnchorPromptBuilder
        subjectId={subjectId}
        sex={sex}
        ethnicity={ethnicity}
      />

      {currentAnchorVersion && (
        <div style={{ marginBottom: 20 }}>
          Latest Anchor Version: <strong>v{currentAnchorVersion}</strong>
        </div>
      )}

      {a20Preview && (
        <div style={{ display: "flex", gap: 40, marginBottom: 20 }}>
          <div>
            <h3>A20</h3>
            <img src={a20Preview} width={250} />
          </div>
          <div>
            <h3>A70</h3>
            <img src={a70Preview} width={250} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Replace Anchors (Optional)</h3>

        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <label>A20 Upload:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = () => {
                    setA20Preview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>

          <div>
            <label>A70 Upload:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = () => {
                    setA70Preview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        </div>
      </div>


      {currentAnchorVersion && (
        <select
          value={selectedAnchorVersion ?? ""}
          onChange={(e) =>
            setSelectedAnchorVersion(Number(e.target.value))
          }
        >
          {Array.from(
            { length: currentAnchorVersion },
            (_, i) => i + 1
          ).map((v) => (
            <option key={v} value={v}>
              Anchor v{v}
            </option>
          ))}
        </select>
      )}

      <div style={{ marginTop: 30 }}>
        <button disabled={generating} onClick={generateTimeline}>
          {generating ? "Generating..." : "Generate New Timeline"}
        </button>
      </div>

      {currentTimelineVersion && (
        <div style={{ marginTop: 20 }}>
          Latest Timeline Version: v{currentTimelineVersion}
        </div>
      )}

      {progress && (
        <div style={{ marginTop: 10 }}>{progress}</div>
      )}
    </div>
  );
}
