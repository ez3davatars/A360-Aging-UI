import { useMemo, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Sparkles, AlertCircle, CheckCircle2, FileJson, FolderOpen } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);

  const createSubject = async () => {
    setError("");
    setOutput("");
    setIsLoading(true);

    if (!cfg) {
      setError(
        `Missing config. Fix a360.config.json first. Expected at: ${cfgPath}`
      );
      setIsLoading(false);
      return;
    }

    const eth = ethnicity.trim();
    if (!eth) {
      setError("Ethnicity_Group is required.");
      setIsLoading(false);
      return;
    }

    setOutput("Creating subject...");

    try {
      const sexNorm =
        sex.trim().toLowerCase().startsWith("m")
          ? "Male"
          : sex.trim().toLowerCase().startsWith("f")
            ? "Female"
            : sex;

      if (!window.runPython) throw new Error("runPython API missing");
      if (!cfg.subjectRoot) {
        throw new Error("Config missing subjectRoot");
      }

      const args: string[] = [
        "create-subject",
        "--sex",
        sexNorm,
        "--ethnicity",
        eth,
        "--fitz",
        fitz,
        "--notes",
        notes || "",
        "--subjectRoot",
        String(cfg.subjectRoot),
      ];

            if (cfg.excelPath) args.push("--excel", String(cfg.excelPath));
      if (cfg.timelineFolderName)
        args.push("--timelineFolderName", String(cfg.timelineFolderName));

      const stdout = await window.runPython("python/update_subject_notes.py", args);

      const data = JSON.parse(stdout) as SubjectCreateResult;

      setOutput(`Created ${data.subjectId}\n${data.timelineFolderAbs}`);

      // Brief delay to show success state
      setTimeout(() => {
        onCreated(data);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(String(err).replace(/^Error:\s*/i, "").trim());
      setOutput("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-2xl relative overflow-hidden backdrop-blur-xl border-white/10">
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            New Subject
          </h1>
          <p className="text-muted-foreground">
            Initialize a new subject in the A360 Aging Dataset.
          </p>
        </div>

        {/* Config Status Panel */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <FileJson className="w-3 h-3" /> Config Path
            </div>
            <div className="font-mono text-white/80 truncate" title={cfgPath}>
              {cfgPath}
            </div>
          </div>
          <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-1">
            <div className="text-muted-foreground flex items-center gap-1">
              <FolderOpen className="w-3 h-3" /> Subject Root
            </div>
            <div
              className="font-mono text-white/80 truncate"
              title={cfg?.subjectRoot ?? ""}
            >
              {cfg?.subjectRoot ?? "(not loaded)"}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Fitzpatrick Tone
              </label>
              <select
                value={fitz}
                onChange={(e) => setFitz(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Ethnicity Group
            </label>
            <Input
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder="e.g., Polynesian"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Notes
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes (face shape, hair, marks...)"
            />
          </div>
        </div>

        <Button
          onClick={createSubject}
          disabled={isLoading}
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? "Creating..." : "Create Subject"}
        </Button>

        {output ? (
          <div className="flex items-center gap-2 text-sm text-emerald-300 whitespace-pre-line">
            <CheckCircle2 className="w-4 h-4" /> {output}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-300 whitespace-pre-line">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
