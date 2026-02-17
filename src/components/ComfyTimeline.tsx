import ImageTile from "./ImageTile";

type Props = {
  subjectId: string;
  timelineFolderAbs: string;
  outputs: Record<string, any>;
};

const ages = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

export default function ComfyTimeline({
  subjectId,
  timelineFolderAbs,
  outputs,
}: Props) {

  const cleanBase = timelineFolderAbs.replace(/[\\/]+$/, "");

  const allExist = ages.every(age =>
    window.imageAPI?.loadImageBase64?.(
      cleanBase + "\\" + subjectId + "_A" + age + ".png"
    )
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60 tracking-wide">
          COMFYUI AGING TIMELINE
        </div>

        {allExist && (
          <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Timeline Complete
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {ages.map((age) => {
          const key = `A${age}`;
          const canonicalPath =
            cleanBase + "\\" + subjectId + "_A" + age + ".png";

          return (
            <ImageTile
              key={key}
              label={key}
              path={canonicalPath}
              status={outputs?.[key]?.status ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
