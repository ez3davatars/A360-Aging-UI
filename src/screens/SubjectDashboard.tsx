import { AppState } from "../state/subjectReducer";
import ComfyTimeline from "../components/ComfyTimeline";
import { GlassCard } from "../components/ui/GlassCard";
import { Activity } from "lucide-react";

type Props = {
  state: AppState;
  activeSubjectId: string;
  timelineFolderAbs: string;
};

export default function SubjectDashboard({
  state,
  activeSubjectId,
  timelineFolderAbs,
}: Props) {
  const subject = state.subjects?.[activeSubjectId];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-white">Live Subject Monitor</h2>
      </div>

      <GlassCard className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {activeSubjectId}
          </h3>
          <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded font-medium">
            Active
          </span>
        </div>

        {/* Single source-of-truth confirmation: governed TimelineA */}
        <ComfyTimeline
          key={activeSubjectId}
          subjectId={activeSubjectId}
          timelineFolderAbs={timelineFolderAbs}
          outputs={subject?.comfyOutputs ?? {}}
        />
      </GlassCard>
    </div>
  );
}
