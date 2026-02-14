import { useState } from "react";

export default function SubjectCreate({
  onCreated,
}: {
  onCreated: (data: any) => void;
}) {
  const [sex, setSex] = useState("Male");
  const [ethnicity, setEthnicity] = useState("");
  const [fitz, setFitz] = useState("III");
  const [features, setFeatures] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const createSubject = async () => {
    setError("");
    setOutput("Creating subject…");

    try {
      // your existing subject creation logic here
      const result = {
        subjectId: "SXXX",
        sex,
        ethnicity,
        rawOutput: "",
      };

      onCreated(result);
    } catch (err: any) {
      setError(err.toString());
      setOutput("");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Subject</h1>
      <p>This confirms the app is rendering.</p>

      {/* ✅ Sex selector */}
      <label style={{ display: "block", marginBottom: 12 }}>
        Sex
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </label>

      {/* ✅ Ethnicity input */}
      <label style={{ display: "block", marginBottom: 12 }}>
        Ethnicity
        <input
          type="text"
          value={ethnicity}
          onChange={(e) => setEthnicity(e.target.value)}
          placeholder="e.g. Afro-Caribbean, East Asian"
          style={{ marginLeft: 8, width: 300 }}
        />
      </label>

      <button onClick={createSubject}>Create Subject</button>

      {output && <pre style={{ marginTop: 20 }}>{output}</pre>}
      {error && (
        <pre style={{ marginTop: 20, color: "red" }}>{error}</pre>
      )}
    </div>
  );
}
