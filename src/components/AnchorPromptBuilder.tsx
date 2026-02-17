import { useMemo, useState } from "react";
import {
  buildA20AnchorPrompt,
  buildA70AnchorPrompt,
  A20_PROMPT_VERSION,
  A70_PROMPT_VERSION,
} from "../prompts/anchorPrompts";
import { GlassCard } from "./ui/GlassCard";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Copy, Sliders, Wand2 } from "lucide-react";

type Props = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  locked?: boolean;
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

  const [notesSaveStatus, setNotesSaveStatus] = useState<string>("");
  const [notesSaveError, setNotesSaveError] = useState<string>("");


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
      case 0: return "No visible scar.";
      case 1: return "A very faint, barely noticeable scar.";
      case 2: return "A small, subtle scar that is lightly visible.";
      case 3: return "A clearly visible but not dominant scar.";
      case 4: return "A prominent scar that is immediately noticeable.";
      case 5: return "A highly pronounced scar that is visually dominant.";
      default: return "";
    }
  }

  function mapImperfectionIntensity(level: number) {
    switch (level) {
      case 0: return "No freckles or visible imperfections.";
      case 1: return "Very sparse, barely visible freckles.";
      case 2: return "Light distribution of freckles, subtly noticeable.";
      case 3: return "Moderate density of freckles clearly visible.";
      case 4: return "Dense freckles and visible skin imperfections.";
      case 5: return "Heavy, prominent freckles and strong visible skin imperfections.";
      default: return "";
    }
  }


  function buildNotesText() {
    const parts: string[] = [];
    if (faceShape.trim()) parts.push(`Face shape: ${faceShape.trim()}`);
    if (hair.trim()) parts.push(`Hair: ${hair.trim()}`);
    if (markers.trim()) parts.push(`Marks: ${markers.trim()}`);
    if (facialFeatures.trim()) parts.push(`Facial features: ${facialFeatures.trim()}`);
    // Include intensity labels for ML provenance
    parts.push(`Scar intensity: ${intensityLabel(scarIntensity)}`);
    parts.push(`Freckles/imperfections: ${intensityLabel(imperfectionIntensity)}`);
    return parts.join(" | ");
  }

  async function saveNotesToExcel() {
    setNotesSaveError("");
    setNotesSaveStatus("Saving Notes to Excel...");

    const cfg = window.configAPI?.getConfig?.();
    const excelPath = cfg?.excelPath as string | undefined;

    if (!excelPath) {
      setNotesSaveStatus("");
      setNotesSaveError("Missing excelPath in a360.config.json");
      return;
    }

    const notes = buildNotesText();
    if (!notes.trim()) {
      setNotesSaveStatus("");
      setNotesSaveError("Notes are empty. Add at least one field (Face shape, Hair, Marks, or Facial features).");
      return;
    }

    try {
      // Writes Subjects.Notes and (optionally) Fitzpatrick tone
      if (!window.runPython) throw new Error("python bridge missing");
      await window.runPython("python/update_subject_notes.py", [
        "--excel",
        excelPath,
        "--subject",
        subjectId,
        "--notes",
        notes,
        "--fitz",
        fitzpatrick,
      ]);
      setNotesSaveStatus("Notes saved to Excel.");
      window.setTimeout(() => setNotesSaveStatus(""), 2000);
    } catch (e: any) {
      setNotesSaveStatus("");
      setNotesSaveError(String(e));
    }
  }

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
  }, [sex, ethnicity, fitzpatrick, faceShape, facialFeatures, hair, markers, scarIntensity, imperfectionIntensity]);

  const promptA70 = useMemo(() => {
    return buildA70AnchorPrompt({
      fitzpatrick,
    });
  }, [fitzpatrick]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center gap-2 mb-6">
        <Wand2 className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-bold text-white">Anchor Prompt Builder</h2>
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          Templates: {A20_PROMPT_VERSION} / {A70_PROMPT_VERSION}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={locked}
          onClick={saveNotesToExcel}
          className="h-7 text-xs ml-3"
          title="Writes Subjects.Notes and Fitzpatrick tone to Excel"
        >
          Save Notes
        </Button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2">Physical Attributes</h3>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Fitzpatrick Scale</label>
            <select
              value={fitzpatrick}
              disabled={locked}
              onChange={(e) => setFitzpatrick(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              {["I", "II", "III", "IV", "V", "VI"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <Input
            label="Face Shape"
            value={faceShape}
            disabled={locked}
            onChange={(e) => setFaceShape(e.target.value)}
            placeholder="e.g. oval, square, heart"
          />

          <Input
            label="Hair"
            value={hair}
            disabled={locked}
            onChange={(e) => setHair(e.target.value)}
            placeholder="e.g. black, straight, dense"
          />

          <Input
            label="Distinguishing Marks"
            value={markers}
            disabled={locked}
            onChange={(e) => setMarkers(e.target.value)}
            placeholder="scar description"
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Facial Features</label>
            <textarea
              rows={3}
              value={facialFeatures}
              disabled={locked}
              onChange={(e) => setFacialFeatures(e.target.value)}
              placeholder="eyes, nose, lips, jaw, cheekbones"
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Intensity Sliders */}
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-white/80 border-b border-white/10 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4" /> Intensity Controls
          </h3>

          <div className="space-y-4 pt-2">
            <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-muted-foreground">Scar Intensity</label>
                <span className="text-accent font-bold">{intensityLabel(scarIntensity)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={scarIntensity}
                disabled={locked}
                onChange={(e) => setScarIntensity(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-muted-foreground">Imperfections / Freckles</label>
                <span className="text-accent font-bold">{intensityLabel(imperfectionIntensity)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={imperfectionIntensity}
                disabled={locked}
                onChange={(e) => setImperfectionIntensity(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Generated Prompts */}
      <div className="grid grid-cols-1 gap-6 mt-8 pt-6 border-t border-white/10">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">A20 Prompt</h3>
            <Button size="sm" variant="ghost" onClick={() => copy(promptA20)} className="h-7 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <div className="relative">
            <textarea
              readOnly
              rows={6}
              value={promptA20}
              className="w-full rounded-md border border-input bg-black/40 px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">A70 Prompt</h3>
            <Button size="sm" variant="ghost" onClick={() => copy(promptA70)} className="h-7 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <textarea
            readOnly
            rows={4}
            value={promptA70}
            className="w-full rounded-md border border-input bg-black/40 px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>

      {(notesSaveStatus || notesSaveError) && (
        <div className="mt-6 pt-4 border-t border-white/10 text-xs">
          {notesSaveStatus && (
            <div className="text-emerald-300">{notesSaveStatus}</div>
          )}
          {notesSaveError && (
            <div className="text-red-300 whitespace-pre-line">{notesSaveError}</div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
