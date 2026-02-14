import { useMemo, useState } from "react";
import {
  buildA20AnchorPrompt,
  buildA70AnchorPrompt,
  A20_PROMPT_VERSION,
  A70_PROMPT_VERSION,
} from "../prompts/anchorPrompts";

type Props = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  locked?: boolean; // pass true after anchors saved
};

export default function AnchorPromptBuilder({
  subjectId,
  sex,
  ethnicity,
  locked = false,
}: Props) {
  const [fitzpatrick, setFitzpatrick] = useState("V");
  const [faceShape, setFaceShape] = useState("");
  const [facialFeatures, setFacialFeatures] = useState("");
  const [hair, setHair] = useState("");
  const [markers, setMarkers] = useState("");

  const [scarIntensity, setScarIntensity] = useState(2);
  const [imperfectionIntensity, setImperfectionIntensity] = useState(2);

  /* ===========================
     INTENSITY LABELING SYSTEM
     =========================== */

  function intensityLabel(level: number) {
    const labels = [
      "None",
      "Very Subtle",
      "Subtle",
      "Moderate",
      "Prominent",
      "Very Prominent",
    ];
    return labels[level] || "";
  }

  function mapScarIntensity(level: number) {
    switch (level) {
      case 0:
        return "No visible scar.";
      case 1:
        return "A very faint, barely noticeable scar.";
      case 2:
        return "A small, subtle scar that is lightly visible.";
      case 3:
        return "A clearly visible but not dominant scar.";
      case 4:
        return "A prominent scar that is immediately noticeable.";
      case 5:
        return "A highly pronounced scar that is visually dominant.";
      default:
        return "";
    }
  }

  function mapImperfectionIntensity(level: number) {
    switch (level) {
      case 0:
        return "No freckles or visible imperfections.";
      case 1:
        return "Very sparse, barely visible freckles.";
      case 2:
        return "Light distribution of freckles, subtly noticeable.";
      case 3:
        return "Moderate density of freckles clearly visible.";
      case 4:
        return "Dense freckles and visible skin imperfections.";
      case 5:
        return "Heavy, prominent freckles and strong visible skin imperfections.";
      default:
        return "";
    }
  }

  /* ===========================
     PROMPT BUILDERS
     =========================== */

  const promptA20 = useMemo(() => {
    return buildA20AnchorPrompt({
      sex,
      ethnicity,
      fitzpatrick,
      faceShape,
      facialFeatures,
      hair,
      markers,
      scarIntensity: mapScarIntensity(scarIntensity),
      imperfectionIntensity: mapImperfectionIntensity(imperfectionIntensity),
    });
  }, [
    sex,
    ethnicity,
    fitzpatrick,
    faceShape,
    facialFeatures,
    hair,
    markers,
    scarIntensity,
    imperfectionIntensity,
  ]);

  const promptA70 = useMemo(() => {
    return buildA70AnchorPrompt({
      fitzpatrick,
    });
  }, [fitzpatrick]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <h2>Anchor Prompt Builder (Gemini)</h2>

      <p>
        <strong>Subject:</strong> {subjectId} <br />
        <strong>Sex:</strong> {sex} (locked) <br />
        <strong>Ethnicity:</strong> {ethnicity} (locked)
      </p>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        A20 Template: {A20_PROMPT_VERSION} <br />
        A70 Template: {A70_PROMPT_VERSION}
      </p>

      {/* ======================
          BASIC IDENTITY INPUTS
         ====================== */}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label>
          Fitzpatrick Scale
          <select
            value={fitzpatrick}
            disabled={locked}
            onChange={(e) => setFitzpatrick(e.target.value)}
          >
            {["I", "II", "III", "IV", "V", "VI"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label>
          Face Shape
          <input
            value={faceShape}
            disabled={locked}
            onChange={(e) => setFaceShape(e.target.value)}
            placeholder="e.g. oval, square, heart"
          />
        </label>

        <label>
          Hair
          <input
            value={hair}
            disabled={locked}
            onChange={(e) => setHair(e.target.value)}
            placeholder="e.g. black, straight, dense hairline"
          />
        </label>

        <label>
          Distinguishing Marks
          <input
            value={markers}
            disabled={locked}
            onChange={(e) => setMarkers(e.target.value)}
            placeholder="scar description"
          />
        </label>
      </div>

      <label style={{ display: "block", marginTop: 12 }}>
        Facial Features
        <textarea
          rows={3}
          value={facialFeatures}
          disabled={locked}
          onChange={(e) => setFacialFeatures(e.target.value)}
          placeholder="eyes, nose, lips, jaw, cheekbones"
        />
      </label>

      {/* ======================
          INTENSITY CONTROLS
         ====================== */}

      <div style={{ marginTop: 20 }}>
        <label>
          Scar Intensity (0–5)
          <input
            type="range"
            min="0"
            max="5"
            value={scarIntensity}
            disabled={locked}
            onChange={(e) => setScarIntensity(Number(e.target.value))}
          />
          <strong style={{ marginLeft: 10 }}>
            {intensityLabel(scarIntensity)}
          </strong>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Freckle / Imperfection Intensity (0–5)
          <input
            type="range"
            min="0"
            max="5"
            value={imperfectionIntensity}
            disabled={locked}
            onChange={(e) =>
              setImperfectionIntensity(Number(e.target.value))
            }
          />
          <strong style={{ marginLeft: 10 }}>
            {intensityLabel(imperfectionIntensity)}
          </strong>
        </label>
      </div>

      {/* ======================
          PROMPT OUTPUTS
         ====================== */}

      <h3 style={{ marginTop: 24 }}>A20 Anchor Prompt</h3>
      <textarea readOnly rows={16} value={promptA20} />
      <button onClick={() => copy(promptA20)}>Copy A20 Prompt</button>

      <h3 style={{ marginTop: 24 }}>A70 Anchor Prompt</h3>
      <textarea readOnly rows={14} value={promptA70} />
      <button onClick={() => copy(promptA70)}>Copy A70 Prompt</button>
    </div>
  );
}
