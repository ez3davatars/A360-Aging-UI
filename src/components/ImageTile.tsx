import { useEffect, useState } from "react";

type Props = {
  label: string;
  image?: {
    status: string;
    path?: string;
  };
};

export default function ImageTile({ label, image }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (image?.path && window.imageAPI) {
      window.imageAPI.loadImageBase64(image.path).then((data: string | null) => {

        if (active) setSrc(data);
      });
    } else {
      setSrc(null);
    }

    return () => {
      active = false;
    };
  }, [image?.path]);

  return (
    <div style={{ marginBottom: 8 }}>
      <div>
        <strong>{label}</strong>: {image?.status ?? "WAITING"}
      </div>

      {src && (
        <img
          src={src}
          style={{
            width: 120,
            borderRadius: 4,
            marginTop: 4,
            border: "1px solid #ccc",
          }}
        />
      )}
    </div>
  );
}
