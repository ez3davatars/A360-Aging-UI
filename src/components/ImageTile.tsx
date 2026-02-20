import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "../lib/utils";

type Props = {
  label: string;
  image?: {
    status?: string;
    path?: string;
  };
};

function isSuccessStatus(status?: string) {
  const s = (status ?? "").toUpperCase();
  return s === "DONE" || s === "INGESTED" || s === "STORED";
}

export default function ImageTile({ label, image }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retriesLeft = useRef(10);

  // Re-probe when path OR status changes (status often updates after file lands)
  useEffect(() => {
    let active = true;

    async function load() {
      if (!image?.path || !window.imageAPI?.loadImageBase64) {
        setSrc(null);
        return;
      }
      const data = await window.imageAPI.loadImageBase64(image.path);
      if (!active) return;

      if (data) {
        setSrc(data);
      }

      // If the file wasn't there yet, retry a few times (covers FS delay)
      if (!data && retriesLeft.current > 0) {
        retriesLeft.current -= 1;
        window.setTimeout(() => setAttempt((a) => a + 1), 500);
      }
    }

    load();

    return () => {
      active = false;
    };
    // attempt is used for controlled retries
  }, [image?.path, image?.status, attempt]);

  const getStatusIcon = (status?: string) => {
    const s = (status ?? "").toUpperCase();
    switch (s) {
      case "DONE":
      case "INGESTED":
      case "STORED":
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case "ERROR":
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      case "WAITING":
      case "INGESTING":
      case "DETECTED":
      default:
        return <Clock className="w-3 h-3 text-blue-400" />;
    }
  };

  const status = image?.status;
  const showCheck = !!src || isSuccessStatus(status);

  return (
    <div className="group relative rounded-lg overflow-hidden bg-black/40 border border-white/5 hover:border-white/20 transition-all duration-300">

      {/* Header / Label */}
      <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {label}
        </span>

        {/* Status / Check */}
        {(showCheck || status) && (
          <div
            className={cn(
              "flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm",
              showCheck ? "ring-1 ring-emerald-500/30" : ""
            )}
            title={status ?? (src ? "FILE PRESENT" : "")}
          >
            {showCheck ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              getStatusIcon(status)
            )}
          </div>
        )}
      </div>

      {/* Image Area */}
      <div className="aspect-square w-full relative">
        {src ? (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            {status?.toUpperCase() === "WAITING" || status?.toUpperCase() === "INGESTING" ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin opacity-50" />
            ) : (
              <div className="text-xs text-muted-foreground">No Image</div>
            )}
          </div>
        )}
      </div>

      {/* Status text overlay (if no image) */}
      {!src && status && (
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-[10px] text-white/50 bg-black/60 px-2 py-1 rounded-full">
            {status}
          </span>
        </div>
      )}
    </div>
  );
}
