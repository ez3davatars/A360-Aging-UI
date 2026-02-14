import { useState, useEffect } from "react";

export default function ApiKeyInput({
  onChange,
}: {
  onChange: (key: string) => void;
}) {
  const [key, setKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("GEMINI_API_KEY");
    if (stored) {
      setKey(stored);
      onChange(stored);
    }
  }, []);

  const update = (v: string) => {
    setKey(v);
    localStorage.setItem("GEMINI_API_KEY", v);
    onChange(v);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label>Gemini API Key</label>
      <input
        type="password"
        value={key}
        onChange={(e) => update(e.target.value)}
        placeholder="Paste your Gemini API key"
        style={{ width: "100%" }}
      />
    </div>
  );
}
