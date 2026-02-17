import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Props = {
  label: string;
  path?: string;
  status?: string | null;
};

export default function ImageTile({ label, path, status }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadImage() {
      if (!path) {
        setPreview(null);
        return;
      }

      const b64 = await window.imageAPI?.loadImageBase64?.(path);
      if (!active) return;

      if (b64) setPreview(b64);
      else setPreview(null);
    }

    loadImage();

    return () => {
      active = false;
    };
  }, [path]);

  const fileExists = !!preview;

  return (
    <div className="w-[100px]">
      <div className="relative bg-black/40 rounded-lg overflow-hidden border border-white/10">
        <div className="absolute top-1 left-1 bg-black/60 text-[10px] px-2 py-0.5 rounded">
          {label}
        </div>

        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-[90px] flex items-center justify-center text-xs text-white/40">
            No Image
          </div>
        )}

        {fileExists && (
          <div className="absolute top-1 right-1 text-emerald-400">
            <CheckCircle2 size={16} />
          </div>
        )}
      </div>
    </div>
  );
}
